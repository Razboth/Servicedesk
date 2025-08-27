import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

// Validation for service field template data
function validateServiceFieldTemplateData(data: any): string[] {
  const errors: string[] = [];
  
  if (!data.serviceName || data.serviceName.trim() === '') {
    errors.push('Service name is required');
  }
  
  if (!data.fieldTemplateName || data.fieldTemplateName.trim() === '') {
    errors.push('Field template name is required');
  }
  
  return errors;
}

// POST /api/admin/import/service-field-templates - Import service-field template relationships
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
      skipped: 0,
      errors: [] as string[]
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      results.processed++;
      
      try {
        // Validate row data
        const validationErrors = validateServiceFieldTemplateData(row);
        if (validationErrors.length > 0) {
          results.errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
          continue;
        }

        // Find the service
        const service = await prisma.service.findFirst({
          where: { name: row.serviceName.trim() }
        });

        if (!service) {
          results.errors.push(`Row ${i + 1}: Service '${row.serviceName}' not found`);
          continue;
        }

        // Find the field template
        const fieldTemplate = await prisma.fieldTemplate.findFirst({
          where: { name: row.fieldTemplateName.trim() }
        });

        if (!fieldTemplate) {
          results.errors.push(`Row ${i + 1}: Field template '${row.fieldTemplateName}' not found`);
          continue;
        }

        // Parse order (default to 0)
        const order = row.order ? parseInt(row.order) : 0;
        
        // Parse booleans
        const isRequired = row.isRequired === undefined ? 
          null : // Use template's default if not specified
          (row.isRequired === 'true' || row.isRequired === '1');
        
        const isUserVisible = row.isUserVisible === undefined || row.isUserVisible === '' ? 
          true : // Default to visible
          (row.isUserVisible === 'true' || row.isUserVisible === '1');

        // Check if the relationship already exists
        const existing = await prisma.serviceFieldTemplate.findUnique({
          where: {
            serviceId_fieldTemplateId: {
              serviceId: service.id,
              fieldTemplateId: fieldTemplate.id
            }
          }
        });

        const linkData = {
          order,
          isRequired,
          isUserVisible,
          helpText: row.helpText?.trim() || null,
          defaultValue: row.defaultValue?.trim() || null
        };

        if (existing) {
          // Update existing relationship
          await prisma.serviceFieldTemplate.update({
            where: { id: existing.id },
            data: linkData
          });
          results.updated++;
        } else {
          // Create new relationship
          await prisma.serviceFieldTemplate.create({
            data: {
              serviceId: service.id,
              fieldTemplateId: fieldTemplate.id,
              ...linkData
            }
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
    console.error('Service field templates import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/import/service-field-templates - Export service-field template relationships
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

    // Get all service-field template relationships
    const relationships = await prisma.serviceFieldTemplate.findMany({
      include: {
        service: {
          select: { name: true }
        },
        fieldTemplate: {
          select: { name: true }
        }
      },
      orderBy: [
        { service: { name: 'asc' } },
        { order: 'asc' }
      ]
    });

    // Transform to export format
    const exportData = relationships.map(rel => ({
      serviceName: rel.service.name,
      fieldTemplateName: rel.fieldTemplate.name,
      order: rel.order,
      isRequired: rel.isRequired === null ? '' : rel.isRequired.toString(),
      isUserVisible: rel.isUserVisible,
      helpText: rel.helpText || '',
      defaultValue: rel.defaultValue || ''
    }));

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ServiceFieldTemplates');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=service_field_templates_export.xlsx'
        }
      });
    } else {
      const csv = Papa.unparse(exportData, { delimiter: ';' });
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=service_field_templates_export.csv'
        }
      });
    }

  } catch (error) {
    console.error('Service field templates export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/import/service-field-templates - Clear all relationships
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.serviceFieldTemplate.count();
    await prisma.serviceFieldTemplate.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `${count} service-field template relationships deleted successfully`
    });

  } catch (error) {
    console.error('Service field templates delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}