import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

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
  
  if (data.networkMedia && !['VSAT', 'M2M', 'FO'].includes(data.networkMedia)) {
    errors.push('networkMedia must be one of: VSAT, M2M, FO');
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
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

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

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

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

        const atmData = {
          code: row.code?.trim(),
          name: row.name?.trim(),
          branchId: branchExists.id, // Use the found branch's ID
          ipAddress: row.ipAddress?.trim() || null,
          location: row.location?.trim() || null,
          latitude: row.latitude ? parseFloat(row.latitude) : null,
          longitude: row.longitude ? parseFloat(row.longitude) : null,
          networkMedia: row.networkMedia?.trim() || null,
          networkVendor: row.networkVendor?.trim() || null,
          isActive: row.isActive === 'false' ? false : true
        };

        // Check if ATM exists by code
        const existingATM = await prisma.aTM.findFirst({
          where: { code: atmData.code }
        });

        if (existingATM) {
          // Update existing ATM
          await prisma.aTM.update({
            where: { id: existingATM.id },
            data: atmData
          });
          results.updated++;
        } else {
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

    return NextResponse.json({
      success: true,
      message: `Import completed. ${results.created} created, ${results.updated} updated.`,
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
      orderBy: { name: 'asc' }
    });

    // Transform data to include branchCode instead of branchId
    const exportData = atms.map(atm => ({
      code: atm.code,
      name: atm.name,
      branchCode: atm.branch.code,
      ipAddress: atm.ipAddress,
      location: atm.location,
      latitude: atm.latitude,
      longitude: atm.longitude,
      networkMedia: atm.networkMedia,
      networkVendor: atm.networkVendor,
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