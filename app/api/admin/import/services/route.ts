import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ImportMode } from '@prisma/client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

// Validation for service data with tier category validation
async function validateServiceData(data: any): Promise<string[]> {
  const errors: string[] = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }

  if (!data.description || data.description.trim() === '') {
    errors.push('Description is required');
  }

  if (data.priority && !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY'].includes(data.priority)) {
    errors.push('Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL, EMERGENCY');
  }

  if (data.defaultItilCategory && !['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST'].includes(data.defaultItilCategory)) {
    errors.push('defaultItilCategory must be one of: INCIDENT, SERVICE_REQUEST, CHANGE_REQUEST, EVENT_REQUEST');
  }

  if (data.defaultIssueClassification && !['HUMAN_ERROR', 'SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE', 'SECURITY_INCIDENT', 'DATA_ISSUE', 'PROCESS_GAP', 'EXTERNAL_FACTOR'].includes(data.defaultIssueClassification)) {
    errors.push('defaultIssueClassification must be valid classification');
  }

  // Validate tier category IDs if provided
  if (data.tier1CategoryId && data.tier1CategoryId.trim()) {
    const category = await prisma.category.findUnique({
      where: { id: data.tier1CategoryId.trim() }
    });
    if (!category) {
      errors.push(`Invalid tier1CategoryId: ${data.tier1CategoryId} does not exist in categories table`);
    }
  }

  if (data.tier2SubcategoryId && data.tier2SubcategoryId.trim()) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: data.tier2SubcategoryId.trim() }
    });
    if (!subcategory) {
      errors.push(`Invalid tier2SubcategoryId: ${data.tier2SubcategoryId} does not exist in subcategories table`);
    }
  }

  if (data.tier3ItemId && data.tier3ItemId.trim()) {
    const item = await prisma.item.findUnique({
      where: { id: data.tier3ItemId.trim() }
    });
    if (!item) {
      errors.push(`Invalid tier3ItemId: ${data.tier3ItemId} does not exist in items table`);
    }
  }

  return errors;
}

// POST /api/admin/import/services - Import services
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const importModeStr = formData.get('importMode') as string || 'CREATE_OR_UPDATE';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate import mode
    const validModes = ['ADD_ONLY', 'UPDATE_ONLY', 'REPLACE_ALL', 'CREATE_OR_UPDATE'];
    if (!validModes.includes(importModeStr)) {
      return NextResponse.json({ error: `Invalid import mode. Must be one of: ${validModes.join(', ')}` }, { status: 400 });
    }
    const importMode = importModeStr as ImportMode;

    const buffer = await file.arrayBuffer();
    let data: any[] = [];

    // Parse based on file type
    if (file.name.endsWith('.csv')) {
      const text = new TextDecoder().decode(buffer);
      const parsed = Papa.parse(text, { header: true, delimiter: ';' });
      data = parsed.data as any[];
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
    }

    // Filter out empty rows
    data = data.filter(row => row.name && row.name.toString().trim() !== '');

    // Create import log
    const importLog = await prisma.importLog.create({
      data: {
        entityType: 'SERVICE',
        importMode,
        fileName: file.name,
        fileSize: file.size,
        totalRows: data.length,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        createdById: session.user.id
      }
    });

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      // Handle REPLACE_ALL mode - delete all services first
      if (importMode === 'REPLACE_ALL') {
        const deleteCount = await prisma.service.count();
        await prisma.service.deleteMany({});
        results.errors.push(`Cleared ${deleteCount} existing services before import`);
      }

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        results.processed++;

        try {
          // Validate row data including tier category IDs
          const validationErrors = await validateServiceData(row);
          if (validationErrors.length > 0) {
            results.errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
            continue;
          }

          // Helper function to parse boolean values from various formats
          const parseBoolean = (value: any): boolean => {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'string') {
              const lowercased = value.toLowerCase().trim();
              return lowercased === 'true' || lowercased === '1' || lowercased === 'yes';
            }
            if (typeof value === 'number') return value === 1;
            return false;
          };

          // Convert string booleans to actual booleans
          const serviceData = {
            name: row.name?.toString().trim(),
            description: row.description?.toString().trim(),
            priority: row.priority || 'MEDIUM',
            slaHours: row.slaHours ? parseInt(row.slaHours) : 24,
            responseHours: row.responseHours ? parseInt(row.responseHours) : 4,
            resolutionHours: row.resolutionHours ? parseInt(row.resolutionHours) : 24,
            requiresApproval: parseBoolean(row.requiresApproval),
            isActive: row.isActive !== undefined ? parseBoolean(row.isActive) : true,
            isConfidential: row.isConfidential !== undefined ? parseBoolean(row.isConfidential) : false,
            isKasdaService: row.isKasdaService !== undefined ? parseBoolean(row.isKasdaService) : false,
            defaultTitle: row.defaultTitle?.toString().trim() || null,
            defaultItilCategory: row.defaultItilCategory || 'INCIDENT',
            defaultIssueClassification: row.defaultIssueClassification || null,
            // Legacy category ID
            categoryId: row.categoryId?.toString().trim(),
            // Only set tier category IDs if they exist and are valid
            tier1CategoryId: row.tier1CategoryId?.toString().trim() || null,
            tier2SubcategoryId: row.tier2SubcategoryId?.toString().trim() || null,
            tier3ItemId: row.tier3ItemId?.toString().trim() || null
          };

          // Check if service exists
          const existingService = await prisma.service.findFirst({
            where: { name: serviceData.name }
          });

          if (existingService) {
            // Handle based on import mode
            if (importMode === 'ADD_ONLY') {
              results.skipped++;
              continue;
            }

            // Update existing service
            await prisma.service.update({
              where: { id: existingService.id },
              data: serviceData
            });
            results.updated++;
          } else {
            // Handle based on import mode
            if (importMode === 'UPDATE_ONLY') {
              results.skipped++;
              continue;
            }

            // Create new service
            await prisma.service.create({
              data: serviceData
            });
            results.created++;
          }
        } catch (error) {
          results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update import log with success
      await prisma.importLog.update({
        where: { id: importLog.id },
        data: {
          status: 'COMPLETED',
          processedRows: results.processed,
          createdRows: results.created,
          updatedRows: results.updated,
          skippedRows: results.skipped,
          errorRows: results.errors.length,
          errors: results.errors.length > 0 ? results.errors : null,
          completedAt: new Date()
        }
      });

    } catch (error) {
      // Update import log with failure
      await prisma.importLog.update({
        where: { id: importLog.id },
        data: {
          status: 'FAILED',
          processedRows: results.processed,
          createdRows: results.created,
          updatedRows: results.updated,
          skippedRows: results.skipped,
          errorRows: results.errors.length + 1,
          errors: [...results.errors, error instanceof Error ? error.message : 'Unknown error'],
          completedAt: new Date()
        }
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${results.created} created, ${results.updated} updated, ${results.skipped} skipped.`,
      importLogId: importLog.id,
      importMode,
      results
    });

  } catch (error) {
    console.error('Services import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/import/services - Export services
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isExport = searchParams.get('export') === 'true';

    if (!isExport) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const format = searchParams.get('format') || 'csv';

    const services = await prisma.service.findMany({
      orderBy: { name: 'asc' }
    });

    const exportData = services.map(s => ({
      name: s.name,
      description: s.description,
      categoryId: s.categoryId || '',
      tier1CategoryId: s.tier1CategoryId || '',
      tier2SubcategoryId: s.tier2SubcategoryId || '',
      tier3ItemId: s.tier3ItemId || '',
      priority: s.priority,
      slaHours: s.slaHours,
      responseHours: s.responseHours,
      resolutionHours: s.resolutionHours,
      requiresApproval: s.requiresApproval,
      defaultTitle: s.defaultTitle || '',
      defaultItilCategory: s.defaultItilCategory,
      defaultIssueClassification: s.defaultIssueClassification || '',
      isActive: s.isActive,
      isConfidential: s.isConfidential,
      isKasdaService: s.isKasdaService
    }));

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Services');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=services_export.xlsx'
        }
      });
    } else {
      const csv = Papa.unparse(exportData, { delimiter: ';' });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=services_export.csv'
        }
      });
    }

  } catch (error) {
    console.error('Services export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/import/services - Clear all services
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.service.count();
    await prisma.service.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `${count} services deleted successfully`
    });

  } catch (error) {
    console.error('Services delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
