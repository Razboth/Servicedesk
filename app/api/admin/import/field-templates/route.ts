import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

// Validation for field template data
function validateFieldTemplateData(data: any): string[] {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!data.label || data.label.trim() === '') {
    errors.push('Label is required');
  }
  
  if (!data.type || data.type.trim() === '') {
    errors.push('Type is required');
  }
  
  const validTypes = ['TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'NUMBER', 'DATE', 'DATETIME', 'SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX', 'FILE', 'URL'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`Type must be one of: ${validTypes.join(', ')}`);
  }
  
  return errors;
}

// POST /api/admin/import/field-templates - Import field templates
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
        const validationErrors = validateFieldTemplateData(row);
        if (validationErrors.length > 0) {
          results.errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
          continue;
        }

        // Parse JSON fields safely
        let options = null;
        let validation = null;
        
        if (row.options && row.options.trim() !== '') {
          try {
            options = JSON.parse(row.options);
          } catch {
            results.errors.push(`Row ${i + 1}: Invalid JSON in options field`);
            continue;
          }
        }
        
        if (row.validation && row.validation.trim() !== '') {
          try {
            validation = JSON.parse(row.validation);
          } catch {
            results.errors.push(`Row ${i + 1}: Invalid JSON in validation field`);
            continue;
          }
        }

        const fieldTemplateData = {
          name: row.name?.trim(),
          label: row.label?.trim(),
          description: row.description?.trim() || null,
          type: row.type?.trim(),
          isRequired: row.isRequired === 'true',
          placeholder: row.placeholder?.trim() || null,
          helpText: row.helpText?.trim() || null,
          defaultValue: row.defaultValue?.trim() || null,
          options: options,
          validation: validation,
          category: row.category?.trim() || null,
          isActive: row.isActive === 'false' ? false : true
        };

        // Check if field template exists by name
        const existingTemplate = await prisma.fieldTemplate.findFirst({
          where: { name: fieldTemplateData.name }
        });

        if (existingTemplate) {
          // Update existing field template
          await prisma.fieldTemplate.update({
            where: { id: existingTemplate.id },
            data: fieldTemplateData
          });
          results.updated++;
        } else {
          // Create new field template
          await prisma.fieldTemplate.create({
            data: fieldTemplateData
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
    console.error('Field templates import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/import/field-templates - Export field templates
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

    const fieldTemplates = await prisma.fieldTemplate.findMany({
      select: {
        name: true,
        label: true,
        description: true,
        type: true,
        isRequired: true,
        placeholder: true,
        helpText: true,
        defaultValue: true,
        options: true,
        validation: true,
        category: true,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    // Convert JSON fields to strings for export
    const exportData = fieldTemplates.map(template => ({
      ...template,
      options: template.options ? JSON.stringify(template.options) : '',
      validation: template.validation ? JSON.stringify(template.validation) : ''
    }));

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'FieldTemplates');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=field_templates_export.xlsx'
        }
      });
    } else {
      const csv = Papa.unparse(exportData, { delimiter: ';' });
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=field_templates_export.csv'
        }
      });
    }

  } catch (error) {
    console.error('Field templates export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/import/field-templates - Clear all field templates
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.fieldTemplate.count();
    await prisma.fieldTemplate.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `${count} field templates deleted successfully`
    });

  } catch (error) {
    console.error('Field templates delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}