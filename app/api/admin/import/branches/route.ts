import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

// Validation for branch data
function validateBranchData(data: any): string[] {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!data.code || data.code.trim() === '') {
    errors.push('Code is required');
  }
  
  if (data.networkMedia && !['VSAT', 'M2M', 'FO'].includes(data.networkMedia)) {
    errors.push('networkMedia must be one of: VSAT, M2M, FO');
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
        const validationErrors = validateBranchData(row);
        if (validationErrors.length > 0) {
          results.errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
          continue;
        }

        // Convert string booleans to actual booleans
        const branchData = {
          name: row.name?.trim(),
          code: row.code?.trim(),
          address: row.address?.trim() || null,
          city: row.city?.trim() || null,
          province: row.province?.trim() || null,
          ipAddress: row.ipAddress?.trim() || null,
          backupIpAddress: row.backupIpAddress?.trim() || null,
          monitoringEnabled: row.monitoringEnabled === 'true',
          networkMedia: row.networkMedia?.trim() || null,
          networkVendor: row.networkVendor?.trim() || null,
          isActive: row.isActive === 'false' ? false : true
        };

        // Check if branch exists by code
        const existingBranch = await prisma.branch.findFirst({
          where: { code: branchData.code }
        });

        if (existingBranch) {
          // Update existing branch
          await prisma.branch.update({
            where: { id: existingBranch.id },
            data: branchData
          });
          results.updated++;
        } else {
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

    return NextResponse.json({
      success: true,
      message: `Import completed. ${results.created} created, ${results.updated} updated.`,
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
      select: {
        name: true,
        code: true,
        address: true,
        city: true,
        province: true,
        ipAddress: true,
        backupIpAddress: true,
        monitoringEnabled: true,
        networkMedia: true,
        networkVendor: true,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(branches);
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
      const csv = Papa.unparse(branches, { delimiter: ';' });
      
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