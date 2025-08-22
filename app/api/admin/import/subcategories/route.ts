import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

// Validation for subcategory data
function validateSubcategoryData(data: any): string[] {
  const errors: string[] = [];
  
  if (!data.categoryId || data.categoryId.trim() === '') {
    errors.push('Category ID is required');
  }
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (data.order && isNaN(parseInt(data.order))) {
    errors.push('Order must be a valid number');
  }
  
  return errors;
}

// POST /api/admin/import/subcategories - Import subcategories (Tier 2)
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
        const validationErrors = validateSubcategoryData(row);
        if (validationErrors.length > 0) {
          results.errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
          continue;
        }

        // Validate category exists
        const categoryExists = await prisma.category.findUnique({
          where: { id: row.categoryId.trim() }
        });
        if (!categoryExists) {
          results.errors.push(`Row ${i + 1}: Category ID ${row.categoryId} not found`);
          continue;
        }

        const subcategoryData = {
          categoryId: row.categoryId?.trim(),
          name: row.name?.trim(),
          description: row.description?.trim() || null,
          isActive: row.isActive === 'false' ? false : true,
          order: row.order ? parseInt(row.order) : 0
        };

        // Check if subcategory exists by name and categoryId
        const existingSubcategory = await prisma.subcategory.findFirst({
          where: { 
            name: subcategoryData.name,
            categoryId: subcategoryData.categoryId
          }
        });

        if (existingSubcategory) {
          // Update existing subcategory
          await prisma.subcategory.update({
            where: { id: existingSubcategory.id },
            data: subcategoryData
          });
          results.updated++;
        } else {
          // Create new subcategory
          await prisma.subcategory.create({
            data: subcategoryData
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
    console.error('Subcategories import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/import/subcategories - Export subcategories
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

    const subcategories = await prisma.subcategory.findMany({
      select: {
        categoryId: true,
        name: true,
        description: true,
        isActive: true,
        order: true
      },
      orderBy: [
        { categoryId: 'asc' },
        { order: 'asc' }
      ]
    });

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(subcategories);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Subcategories');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=subcategories_export.xlsx'
        }
      });
    } else {
      const csv = Papa.unparse(subcategories, { delimiter: ';' });
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=subcategories_export.csv'
        }
      });
    }

  } catch (error) {
    console.error('Subcategories export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/import/subcategories - Clear all subcategories
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.subcategory.count();
    await prisma.subcategory.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `${count} subcategories deleted successfully`
    });

  } catch (error) {
    console.error('Subcategories delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}