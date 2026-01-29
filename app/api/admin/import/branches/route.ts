import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ImportMode } from '@prisma/client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

// Valid values for NetworkMedia enum
const VALID_NETWORK_MEDIA = ['VSAT', 'M2M', 'FO'];

// Validation for branch data
function validateBranchData(data: any): string[] {
  const errors: string[] = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }

  if (!data.code || data.code.trim() === '') {
    errors.push('Code is required');
  }

  if (data.networkMedia && !VALID_NETWORK_MEDIA.includes(data.networkMedia.toUpperCase())) {
    errors.push(`networkMedia must be one of: ${VALID_NETWORK_MEDIA.join(', ')}`);
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

// POST /api/admin/import/branches - Import branches
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
        entityType: 'BRANCH',
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
      // Handle REPLACE_ALL mode - delete all branches first
      if (importMode === 'REPLACE_ALL') {
        const deleteCount = await prisma.branch.count();
        await prisma.branch.deleteMany({});
        results.errors.push(`Cleared ${deleteCount} existing branches before import`);
      }

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        results.processed++;

        try {
          // Validate row data
          const validationErrors = validateBranchData(row);
          if (validationErrors.length > 0) {
            results.errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
            continue;
          }

          // Parse network media
          let networkMedia: 'VSAT' | 'M2M' | 'FO' | null = null;
          if (row.networkMedia) {
            const mediaUpper = row.networkMedia.toString().toUpperCase();
            if (VALID_NETWORK_MEDIA.includes(mediaUpper)) {
              networkMedia = mediaUpper as 'VSAT' | 'M2M' | 'FO';
            }
          }

          // Convert string booleans to actual booleans
          const branchData = {
            name: row.name?.toString().trim(),
            code: row.code?.toString().trim(),
            address: row.address?.toString().trim() || null,
            city: row.city?.toString().trim() || null,
            province: row.province?.toString().trim() || null,
            ipAddress: row.ipAddress?.toString().trim() || null,
            backupIpAddress: row.backupIpAddress?.toString().trim() || null,
            latitude: row.latitude ? parseFloat(row.latitude) : null,
            longitude: row.longitude ? parseFloat(row.longitude) : null,
            monitoringEnabled: row.monitoringEnabled === 'true' || row.monitoringEnabled === true,
            networkMedia,
            networkVendor: row.networkVendor?.toString().trim() || null,
            isActive: row.isActive === 'false' || row.isActive === false ? false : true
          };

          // Check if branch exists by code
          const existingBranch = await prisma.branch.findFirst({
            where: { code: branchData.code }
          });

          if (existingBranch) {
            // Handle based on import mode
            if (importMode === 'ADD_ONLY') {
              results.skipped++;
              continue;
            }

            // Update existing branch
            await prisma.branch.update({
              where: { id: existingBranch.id },
              data: branchData
            });
            results.updated++;
          } else {
            // Handle based on import mode
            if (importMode === 'UPDATE_ONLY') {
              results.skipped++;
              continue;
            }

            // Create new branch
            await prisma.branch.create({
              data: branchData
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
    console.error('Branches import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/import/branches - Export branches
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

    const branches = await prisma.branch.findMany({
      orderBy: { code: 'asc' }
    });

    // Transform data for export including all fields
    const exportData = branches.map(branch => ({
      code: branch.code,
      name: branch.name,
      address: branch.address || '',
      city: branch.city || '',
      province: branch.province || '',
      ipAddress: branch.ipAddress || '',
      backupIpAddress: branch.backupIpAddress || '',
      latitude: branch.latitude || '',
      longitude: branch.longitude || '',
      monitoringEnabled: branch.monitoringEnabled,
      networkMedia: branch.networkMedia || '',
      networkVendor: branch.networkVendor || '',
      isActive: branch.isActive
    }));

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Branches');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=branches_export.xlsx'
        }
      });
    } else {
      const csv = Papa.unparse(exportData, { delimiter: ';' });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=branches_export.csv'
        }
      });
    }

  } catch (error) {
    console.error('Branches export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/import/branches - Clear all branches
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.branch.count();
    await prisma.branch.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `${count} branches deleted successfully`
    });

  } catch (error) {
    console.error('Branches delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
