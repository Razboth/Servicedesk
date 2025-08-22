import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

// Validation for item data
function validateItemData(data: any): string[] {
  const errors: string[] = [];
  
  if (!data.subcategoryId || data.subcategoryId.trim() === '') {
    errors.push('Subcategory ID is required');
  }
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (data.order && isNaN(parseInt(data.order))) {
    errors.push('Order must be a valid number');
  }
  
  return errors;
}

// POST /api/admin/import/items - Import items (Tier 3)
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
        const validationErrors = validateItemData(row);
        if (validationErrors.length > 0) {
          results.errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
          continue;
        }

        // Validate subcategory exists
        const subcategoryExists = await prisma.subcategory.findUnique({
          where: { id: row.subcategoryId.trim() }
        });
        if (!subcategoryExists) {
          results.errors.push(`Row ${i + 1}: Subcategory ID ${row.subcategoryId} not found`);
          continue;
        }

        const itemData = {
          subcategoryId: row.subcategoryId?.trim(),
          name: row.name?.trim(),
          description: row.description?.trim() || null,
          isActive: row.isActive === 'false' ? false : true,
          order: row.order ? parseInt(row.order) : 0
        };

        // Check if item exists by name and subcategoryId
        const existingItem = await prisma.item.findFirst({
          where: { 
            name: itemData.name,
            subcategoryId: itemData.subcategoryId
          }
        });

        if (existingItem) {
          // Update existing item
          await prisma.item.update({
            where: { id: existingItem.id },
            data: itemData
          });
          results.updated++;
        } else {
          // Create new item
          await prisma.item.create({
            data: itemData
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
    console.error('Items import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/import/items - Export items
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

    const items = await prisma.item.findMany({
      select: {
        subcategoryId: true,
        name: true,
        description: true,
        isActive: true,
        order: true
      },
      orderBy: [
        { subcategoryId: 'asc' },
        { order: 'asc' }
      ]
    });

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(items);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Items');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=items_export.xlsx'
        }
      });
    } else {
      const csv = Papa.unparse(items, { delimiter: ';' });
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=items_export.csv'
        }
      });
    }

  } catch (error) {
    console.error('Items export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/import/items - Clear all items
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.item.count();
    await prisma.item.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `${count} items deleted successfully`
    });

  } catch (error) {
    console.error('Items delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}