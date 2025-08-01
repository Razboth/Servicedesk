import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  'SERVICE CATALOG': string;
  'SERVICE NAME': string;
  'SLA': string;
  'RESPONSE TIME': string;
  'RESOLUTION TIME': string;
}

function parseSLATime(timeStr: string): number {
  if (!timeStr || timeStr.trim() === '') return 24; // Default 24 hours
  
  const str = timeStr.toLowerCase().trim();
  
  // Handle different time formats
  if (str.includes('day') || str.includes('hk')) {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0]) * 24 : 24; // Convert days to hours
  } else if (str.includes('hr') || str.includes('hour')) {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0]) : 24;
  } else if (str.includes('min')) {
    const match = str.match(/\d+/);
    return match ? Math.max(1, Math.ceil(parseInt(match[0]) / 60)) : 1; // Convert minutes to hours, minimum 1
  }
  
  // Try to extract number and assume hours
  const match = str.match(/\d+/);
  return match ? parseInt(match[0]) : 24;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();
    
    // Parse CSV
    const records: CSVRow[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';' // Based on the CSV format shown
    });

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    // Process each row
    for (const [index, row] of records.entries()) {
      try {
        results.processed++;
        
        const serviceCatalog = row['SERVICE CATALOG']?.trim();
        let serviceName = row['SERVICE NAME']?.trim();
        const slaStr = row['SLA']?.trim();
        const responseTimeStr = row['RESPONSE TIME']?.trim();
        const resolutionTimeStr = row['RESOLUTION TIME']?.trim();

        if (!serviceCatalog) {
          results.errors.push(`Row ${index + 2}: Missing service catalog`);
          continue;
        }

        // If service name is empty, generate a default name or skip
        if (!serviceName) {
          // Skip rows with empty service names as they appear to be incomplete data
          results.errors.push(`Row ${index + 2}: Skipped - Empty service name for category '${serviceCatalog}'`);
          continue;
        }

        // Parse SLA times
        const responseHours = parseSLATime(responseTimeStr);
        const resolutionHours = parseSLATime(resolutionTimeStr);
        const slaHours = parseSLATime(slaStr);

        // Find or create category
        let category = await prisma.serviceCategory.findFirst({
          where: {
            name: serviceCatalog,
            level: 1
          }
        });

        if (!category) {
          category = await prisma.serviceCategory.create({
            data: {
              name: serviceCatalog,
              description: `Imported category: ${serviceCatalog}`,
              level: 1,
              isActive: true
            }
          });
        }

        // Check if service already exists
        const existingService = await prisma.service.findFirst({
          where: {
            name: serviceName,
            categoryId: category.id
          }
        });

        if (existingService) {
          // Update existing service
          await prisma.service.update({
            where: { id: existingService.id },
            data: {
              responseHours,
              resolutionHours,
              slaHours,
              updatedAt: new Date()
            }
          });
          
          // Update SLA template if exists
          await prisma.sLATemplate.upsert({
            where: { serviceId: existingService.id },
            update: {
              responseHours,
              resolutionHours,
              updatedAt: new Date()
            },
            create: {
              serviceId: existingService.id,
              responseHours,
              resolutionHours,
              escalationHours: resolutionHours * 2, // Default escalation time
              businessHoursOnly: true
            }
          });
          
          results.updated++;
        } else {
          // Create new service
          const newService = await prisma.service.create({
            data: {
              name: serviceName,
              description: `Imported service: ${serviceName}`,
              categoryId: category.id,
              supportGroup: 'IT_HELPDESK',
              priority: 'MEDIUM',
              estimatedHours: Math.ceil(resolutionHours / 8) || 1, // Convert to work days
              slaHours,
              responseHours,
              resolutionHours,
              isActive: true,
              requiresApproval: false,
              defaultItilCategory: 'SERVICE_REQUEST'
            }
          });

          // Create SLA template
          await prisma.sLATemplate.create({
            data: {
              serviceId: newService.id,
              responseHours,
              resolutionHours,
              escalationHours: resolutionHours * 2, // Default escalation time
              businessHoursOnly: true
            }
          });
          
          results.created++;
        }
      } catch (error) {
        console.error(`Error processing row ${index + 2}:`, error);
        results.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. Processed: ${results.processed}, Created: ${results.created}, Updated: ${results.updated}`,
      results
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import service catalog',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}