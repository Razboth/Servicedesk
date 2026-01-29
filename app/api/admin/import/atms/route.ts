import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ImportMode } from '@prisma/client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

// Valid values for ATMCategory enum
const VALID_ATM_CATEGORIES = ['ATM', 'CRM'];

// Valid values for NetworkMedia enum
const VALID_NETWORK_MEDIA = ['VSAT', 'M2M', 'FO'];

// Validation for ATM data
function validateATMData(data: any): string[] {
  const errors: string[] = [];

  if (!data.code || data.code.trim() === '') {
    errors.push('Code is required');
  }

  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }

  if (!data.branchCode || data.branchCode.trim() === '') {
    errors.push('Branch Code is required');
  }

  if (data.networkMedia && !VALID_NETWORK_MEDIA.includes(data.networkMedia.toUpperCase())) {
    errors.push(`networkMedia must be one of: ${VALID_NETWORK_MEDIA.join(', ')}`);
  }

  if (data.atmCategory && !VALID_ATM_CATEGORIES.includes(data.atmCategory.toUpperCase())) {
    errors.push(`atmCategory must be one of: ${VALID_ATM_CATEGORIES.join(', ')}`);
  }

  // Validate coordinates if provided
  if (data.latitude && (isNaN(parseFloat(data.latitude)) || parseFloat(data.latitude) < -90 || parseFloat(data.latitude) > 90)) {
    errors.push('Latitude must be a valid number between -90 and 90');
  }

  if (data.longitude && (isNaN(parseFloat(data.longitude)) || parseFloat(data.longitude) < -180 || parseFloat(data.longitude) > 180)) {
    errors.push('Longitude must be a valid number between -180 and 180');
  }

  return errors;
}

// POST /api/admin/import/atms - Import ATMs
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
    data = data.filter(row => row.code && row.code.toString().trim() !== '');

    // Create import log
    const importLog = await prisma.importLog.create({
      data: {
        entityType: 'ATM',
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
      // Handle REPLACE_ALL mode - delete all ATMs first
      if (importMode === 'REPLACE_ALL') {
        const deleteCount = await prisma.aTM.count();
        await prisma.aTM.deleteMany({});
        results.errors.push(`Cleared ${deleteCount} existing ATMs before import`);
      }

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        results.processed++;

        try {
          // Validate row data
          const validationErrors = validateATMData(row);
          if (validationErrors.length > 0) {
            results.errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
            continue;
          }

          // Validate branch exists by code
          const branchExists = await prisma.branch.findUnique({
            where: { code: row.branchCode.trim() }
          });
          if (!branchExists) {
            results.errors.push(`Row ${i + 1}: Branch Code ${row.branchCode} not found`);
            continue;
          }

          // Parse ATM category
          let atmCategory: 'ATM' | 'CRM' = 'ATM';
          if (row.atmCategory) {
            const categoryUpper = row.atmCategory.toString().toUpperCase();
            if (categoryUpper === 'CRM') {
              atmCategory = 'CRM';
            }
          }

          // Parse network media
          let networkMedia: 'VSAT' | 'M2M' | 'FO' | null = null;
          if (row.networkMedia) {
            const mediaUpper = row.networkMedia.toString().toUpperCase();
            if (VALID_NETWORK_MEDIA.includes(mediaUpper)) {
              networkMedia = mediaUpper as 'VSAT' | 'M2M' | 'FO';
            }
          }

          const atmData = {
            code: row.code?.toString().trim(),
            name: row.name?.toString().trim(),
            branchId: branchExists.id,
            ipAddress: row.ipAddress?.toString().trim() || null,
            location: row.location?.toString().trim() || null,
            latitude: row.latitude ? parseFloat(row.latitude) : null,
            longitude: row.longitude ? parseFloat(row.longitude) : null,
            networkMedia,
            networkVendor: row.networkVendor?.toString().trim() || null,
            // New fields
            atmBrand: row.atmBrand?.toString().trim() || null,
            atmType: row.atmType?.toString().trim() || null,
            atmCategory,
            serialNumber: row.serialNumber?.toString().trim() || null,
            notes: row.notes?.toString().trim() || null,
            isActive: row.isActive === 'false' || row.isActive === false ? false : true
          };

          // Check if ATM exists by code
          const existingATM = await prisma.aTM.findFirst({
            where: { code: atmData.code }
          });

          if (existingATM) {
            // Handle based on import mode
            if (importMode === 'ADD_ONLY') {
              results.skipped++;
              continue;
            }

            // Update existing ATM
            await prisma.aTM.update({
              where: { id: existingATM.id },
              data: atmData
            });
            results.updated++;
          } else {
            // Handle based on import mode
            if (importMode === 'UPDATE_ONLY') {
              results.skipped++;
              continue;
            }

            // Create new ATM
            await prisma.aTM.create({
              data: atmData
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
    console.error('ATMs import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/import/atms - Export ATMs
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

    const atms = await prisma.aTM.findMany({
      include: {
        branch: {
          select: {
            code: true
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    // Transform data to include branchCode instead of branchId
    // Including all new fields
    const exportData = atms.map(atm => ({
      code: atm.code,
      name: atm.name,
      branchCode: atm.branch.code,
      ipAddress: atm.ipAddress || '',
      location: atm.location || '',
      latitude: atm.latitude || '',
      longitude: atm.longitude || '',
      networkMedia: atm.networkMedia || '',
      networkVendor: atm.networkVendor || '',
      atmBrand: atm.atmBrand || '',
      atmType: atm.atmType || '',
      atmCategory: atm.atmCategory,
      serialNumber: atm.serialNumber || '',
      notes: atm.notes || '',
      isActive: atm.isActive
    }));

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ATMs');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=atms_export.xlsx'
        }
      });
    } else {
      const csv = Papa.unparse(exportData, { delimiter: ';' });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=atms_export.csv'
        }
      });
    }

  } catch (error) {
    console.error('ATMs export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/import/atms - Clear all ATMs
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.aTM.count();
    await prisma.aTM.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `${count} ATMs deleted successfully`
    });

  } catch (error) {
    console.error('ATMs delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
