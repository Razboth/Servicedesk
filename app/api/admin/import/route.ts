import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  'Original_Service_Catalog': string;
  'Original_Service_Name': string;
  'Tier_1_Category': string;
  'Tier_2_SubCategory': string;
  'Tier_3_Service_Type': string;
  'SLA_Days': string;
  'First_Response': string;
  'Resolution_Time': string;
  'ITIL_Category': string;
  'Issue_Classification': string;
  'Priority': string;
  'Title': string;
  // Field columns
  'Field 1'?: string;
  'Field 2'?: string;
  'Field 3'?: string;
  'Field 4'?: string;
  'Field 5'?: string;
  'Field 6'?: string;
  'Field 7'?: string;
  // Legacy support for old format
  'SERVICE CATALOG'?: string;
  'SERVICE NAME'?: string;
  'SLA'?: string;
  'RESPONSE TIME'?: string;
  'RESOLUTION TIME'?: string;
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

function mapPriority(priorityStr: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY' {
  if (!priorityStr) return 'MEDIUM';
  const priority = priorityStr.toUpperCase().trim();
  if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY'].includes(priority)) {
    return priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  }
  return 'MEDIUM';
}

function mapITILCategory(categoryStr: string): 'INCIDENT' | 'SERVICE_REQUEST' | 'CHANGE_REQUEST' | 'EVENT_REQUEST' {
  if (!categoryStr) return 'SERVICE_REQUEST';
  const category = categoryStr.toUpperCase().trim();
  if (category.includes('INCIDENT')) return 'INCIDENT';
  if (category.includes('CHANGE')) return 'CHANGE_REQUEST';
  if (category.includes('EVENT')) return 'EVENT_REQUEST';
  return 'SERVICE_REQUEST';
}

function mapIssueClassification(classificationStr: string): 'HUMAN_ERROR' | 'SYSTEM_ERROR' | 'HARDWARE_FAILURE' | 'NETWORK_ISSUE' | 'SECURITY_INCIDENT' | 'DATA_ISSUE' | 'PROCESS_GAP' | 'EXTERNAL_FACTOR' | null {
  if (!classificationStr) return null;
  const classification = classificationStr.toUpperCase().trim();
  if (classification.includes('HUMAN')) return 'HUMAN_ERROR';
  if (classification.includes('SYSTEM')) return 'SYSTEM_ERROR';
  if (classification.includes('HARDWARE')) return 'HARDWARE_FAILURE';
  if (classification.includes('NETWORK')) return 'NETWORK_ISSUE';
  if (classification.includes('SECURITY')) return 'SECURITY_INCIDENT';
  if (classification.includes('DATA')) return 'DATA_ISSUE';
  if (classification.includes('PROCESS')) return 'PROCESS_GAP';
  if (classification.includes('EXTERNAL')) return 'EXTERNAL_FACTOR';
  return null;
}

function guessFieldType(fieldLabel: string): 'TEXT' | 'TEXTAREA' | 'EMAIL' | 'PHONE' | 'NUMBER' | 'DATE' | 'DATETIME' | 'SELECT' | 'MULTISELECT' | 'RADIO' | 'CHECKBOX' | 'FILE' | 'URL' {
  const label = fieldLabel.toLowerCase();
  
  if (label.includes('email')) return 'EMAIL';
  if (label.includes('phone') || label.includes('hp') || label.includes('telp')) return 'PHONE';
  if (label.includes('tanggal') || label.includes('date')) return 'DATE';
  if (label.includes('nominal') || label.includes('amount')) return 'NUMBER';
  if (label.includes('keterangan') || label.includes('kronologi') || label.includes('daftar')) return 'TEXTAREA';
  if (label.includes('file')) return 'FILE';
  if (label.includes('url') || label.includes('link')) return 'URL';
  
  return 'TEXT';
}

async function findOrCreateFieldTemplate(fieldLabel: string, category: string): Promise<string> {
  // Generate field name from label
  const fieldName = fieldLabel.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .trim();
  
  // Check if field template already exists
  let fieldTemplate = await prisma.fieldTemplate.findFirst({
    where: { label: fieldLabel }
  });
  
  if (!fieldTemplate) {
    // Create new field template
    fieldTemplate = await prisma.fieldTemplate.create({
      data: {
        name: fieldName,
        label: fieldLabel,
        type: guessFieldType(fieldLabel),
        category: category,
        isRequired: false,
        helpText: `Enter ${fieldLabel}`
      }
    });
  }
  
  return fieldTemplate.id;
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
        
        // Support both new complete format and legacy format
        const serviceCatalog = row['Original_Service_Catalog']?.trim() || row['SERVICE CATALOG']?.trim();
        let serviceName = row['Original_Service_Name']?.trim() || row['SERVICE NAME']?.trim();
        const slaStr = row['SLA_Days']?.trim() || row['SLA']?.trim();
        const responseTimeStr = row['First_Response']?.trim() || row['RESPONSE TIME']?.trim();
        const resolutionTimeStr = row['Resolution_Time']?.trim() || row['RESOLUTION TIME']?.trim();
        
        // New complete format fields
        const tier1Category = row['Tier_1_Category']?.trim();
        const tier2SubCategory = row['Tier_2_SubCategory']?.trim();
        const tier3ServiceType = row['Tier_3_Service_Type']?.trim();
        const itilCategory = row['ITIL_Category']?.trim();
        const issueClassification = row['Issue_Classification']?.trim();
        const priority = row['Priority']?.trim();
        const defaultTitle = row['Title']?.trim();

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
        
        // Map enum values
        const mappedPriority = mapPriority(priority);
        const mappedITILCategory = mapITILCategory(itilCategory);
        const mappedIssueClassification = mapIssueClassification(issueClassification);

        // Find or create 3-tier categories
        let tier1CategoryRecord = null;
        let tier2SubcategoryRecord = null;
        let tier3ItemRecord = null;
        
        if (tier1Category) {
          tier1CategoryRecord = await prisma.category.findFirst({
            where: { name: tier1Category }
          });
          if (!tier1CategoryRecord) {
            tier1CategoryRecord = await prisma.category.create({
              data: {
                name: tier1Category,
                description: `Imported tier 1 category: ${tier1Category}`,
                isActive: true
              }
            });
          }
          
          if (tier2SubCategory) {
            tier2SubcategoryRecord = await prisma.subcategory.findFirst({
              where: {
                name: tier2SubCategory,
                categoryId: tier1CategoryRecord.id
              }
            });
            if (!tier2SubcategoryRecord) {
              tier2SubcategoryRecord = await prisma.subcategory.create({
                data: {
                  categoryId: tier1CategoryRecord.id,
                  name: tier2SubCategory,
                  description: `Imported tier 2 subcategory: ${tier2SubCategory}`,
                  isActive: true
                }
              });
            }
            
            if (tier3ServiceType) {
              tier3ItemRecord = await prisma.item.findFirst({
                where: {
                  name: tier3ServiceType,
                  subcategoryId: tier2SubcategoryRecord.id
                }
              });
              if (!tier3ItemRecord) {
                tier3ItemRecord = await prisma.item.create({
                  data: {
                    subcategoryId: tier2SubcategoryRecord.id,
                    name: tier3ServiceType,
                    description: `Imported tier 3 item: ${tier3ServiceType}`,
                    isActive: true
                  }
                });
              }
            }
          }
        }

        // Find or create legacy category for backward compatibility
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
              priority: mappedPriority,
              defaultItilCategory: mappedITILCategory,
              defaultIssueClassification: mappedIssueClassification,
              defaultTitle: defaultTitle || undefined,
              tier1CategoryId: tier1CategoryRecord?.id || undefined,
              tier3ItemId: tier3ItemRecord?.id || undefined,
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
              priority: mappedPriority,
              estimatedHours: Math.ceil(resolutionHours / 8) || 1, // Convert to work days
              slaHours,
              responseHours,
              resolutionHours,
              isActive: true,
              requiresApproval: false,
              defaultItilCategory: mappedITILCategory,
              defaultIssueClassification: mappedIssueClassification,
              defaultTitle: defaultTitle || undefined,
              tier1CategoryId: tier1CategoryRecord?.id || undefined,
              tier3ItemId: tier3ItemRecord?.id || undefined
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
        
        // Process Field 1-7 columns
        const serviceRecord = existingService || newService;
        if (serviceRecord) {
          const fieldLabels: string[] = [];
          for (let i = 1; i <= 7; i++) {
            const fieldLabel = row[`Field ${i}` as keyof CSVRow]?.trim();
            if (fieldLabel) {
              fieldLabels.push(fieldLabel);
            }
          }
          
          if (fieldLabels.length > 0) {
            // Determine field category based on service catalog
            const fieldCategory = serviceCatalog.includes('ATM') ? 'ATM Information' :
                               serviceCatalog.includes('User') ? 'User Account' :
                               serviceCatalog.includes('Klaim') ? 'Transaction Information' :
                               serviceCatalog.includes('Error') ? 'Error Information' :
                               serviceCatalog.includes('Network') ? 'Location Information' :
                               'Service Specific';
            
            // Process each field
            let order = 1;
            for (const fieldLabel of fieldLabels) {
              try {
                // Find or create field template
                const fieldTemplateId = await findOrCreateFieldTemplate(fieldLabel, fieldCategory);
                
                // Check if already linked to service
                const existingLink = await prisma.serviceFieldTemplate.findUnique({
                  where: {
                    serviceId_fieldTemplateId: {
                      serviceId: serviceRecord.id,
                      fieldTemplateId: fieldTemplateId
                    }
                  }
                });
                
                if (!existingLink) {
                  // Link field template to service
                  await prisma.serviceFieldTemplate.create({
                    data: {
                      serviceId: serviceRecord.id,
                      fieldTemplateId: fieldTemplateId,
                      order: order++,
                      isRequired: false,
                      isUserVisible: true
                    }
                  });
                }
              } catch (fieldError) {
                console.error(`Error processing field "${fieldLabel}" for service "${serviceName}":`, fieldError);
              }
            }
          }
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