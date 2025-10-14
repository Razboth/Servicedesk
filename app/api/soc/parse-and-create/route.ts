import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseSOCNotification, validateSOCData } from '@/lib/soc-parser';
import { z } from 'zod';

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Schema for the request
const socTicketSchema = z.object({
  text: z.string().min(1, 'SOC notification text is required'),
  apiKey: z.string().optional(), // For external SOC tool authentication
  parsedData: z.object({
    title: z.string(),
    description: z.string(),
    fieldValues: z.array(z.object({
      fieldName: z.string(),
      value: z.string()
    })),
    severity: z.string(),
    securityClassification: z.string()
  }).optional() // Pre-parsed data from UI
});

// Rate limiting check
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const limit = 10; // 10 requests per minute
  const window = 60 * 1000; // 1 minute

  const userLimit = rateLimitMap.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + window
    });
    return true;
  }

  if (userLimit.count >= limit) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication - either session or API key
    const session = await auth();
    const authHeader = request.headers.get('Authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    // Validate access
    if (!session && !apiKey) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // If using session, must be SECURITY_ANALYST or ADMIN
    if (session && !['SECURITY_ANALYST', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Only security analysts can create SOC tickets' },
        { status: 403 }
      );
    }

    // If using API key, validate it
    if (apiKey && !session) {
      // First check environment variable (legacy support)
      if (apiKey === process.env.SOC_API_KEY) {
        // Valid legacy API key
      } else {
        // Check database for API key
        const { verifyApiKey } = await import('@/lib/api-key');
        
        // Find API key by looking for one that matches when hashed
        const apiKeys = await prisma.apiKey.findMany({
          where: {
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        });

        let validKey = false;
        let keyRecord = null;

        for (const key of apiKeys) {
          if (await verifyApiKey(apiKey, key.hashedKey)) {
            validKey = true;
            keyRecord = key;
            break;
          }
        }

        if (!validKey) {
          return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 401 }
          );
        }

        // Check permissions
        if (keyRecord && keyRecord.permissions) {
          const perms = keyRecord.permissions as string[];
          if (!perms.includes('soc') && !perms.includes('*')) {
            return NextResponse.json(
              { error: 'API key does not have permission to create SOC tickets' },
              { status: 403 }
            );
          }
        }

        // Update usage stats
        if (keyRecord) {
          await prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: {
              lastUsedAt: new Date(),
              usageCount: { increment: 1 }
            }
          });
        }
      }
    }

    // Rate limiting
    const rateLimitId = session?.user.id || apiKey || 'anonymous';
    if (!checkRateLimit(rateLimitId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 10 requests per minute.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validation = socTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { text, parsedData: providedParsedData } = validation.data;

    // Use provided parsed data if available, otherwise parse from text
    let parsedData;
    if (providedParsedData) {
      // Use the pre-parsed data from UI
      parsedData = providedParsedData;
    } else {
      // Parse SOC notification from text
      parsedData = parseSOCNotification(text);
      
      // Validate parsed data
      const dataValidation = validateSOCData(parsedData);
      if (!dataValidation.valid) {
        return NextResponse.json(
          { 
            error: 'Failed to parse SOC notification', 
            details: dataValidation.errors,
            parsed: parsedData // Include what was parsed for debugging
          },
          { status: 400 }
        );
      }
    }

    // Get SOC service
    const socService = await prisma.service.findFirst({
      where: { 
        name: 'SOC Security Incident',
        isActive: true
      },
      include: {
        fieldTemplates: {
          include: {
            fieldTemplate: true
          }
        }
      }
    });

    if (!socService) {
      return NextResponse.json(
        { error: 'SOC service not found. Please run the SOC seed script.' },
        { status: 500 }
      );
    }

    // Determine the user creating the ticket
    let userId: string;
    let userBranchId: string | null = null;
    let keyRecord: any = null;

    if (session) {
      userId = session.user.id;
      userBranchId = session.user.branchId || null;
    } else {
      // For API key access, check if key has a linked user
      if (apiKey) {
        // Get the validated key record from earlier
        const apiKeys = await prisma.apiKey.findMany({
          where: {
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          include: {
            linkedUser: true,
            createdBy: true
          }
        });

        for (const key of apiKeys) {
          const { verifyApiKey } = await import('@/lib/api-key');
          if (await verifyApiKey(apiKey, key.hashedKey)) {
            keyRecord = key;
            break;
          }
        }
      }

      if (keyRecord) {
        // Use linked user if available, otherwise use the API key creator
        if (keyRecord.linkedUserId && keyRecord.linkedUser) {
          userId = keyRecord.linkedUserId;
          userBranchId = keyRecord.linkedUser.branchId;
        } else {
          userId = keyRecord.createdById;
          userBranchId = keyRecord.createdBy.branchId;
        }
      } else {
        // Fallback to system user
        const systemUser = await prisma.user.findFirst({
          where: { 
            email: 'soc.analyst@banksulutgo.co.id',
            role: 'SECURITY_ANALYST'
          }
        });

        if (!systemUser) {
          return NextResponse.json(
            { error: 'System SOC user not found. Please run the SOC seed script.' },
            { status: 500 }
          );
        }

        userId = systemUser.id;
        userBranchId = systemUser.branchId;
      }
    }

    // Generate ticket number - use new simplified sequential format
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);

    const yearTicketCount = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: yearStart,
          lt: yearEnd
        }
      }
    });

    // New simplified ticket numbering - just sequential numbers
    const ticketNumber = String(yearTicketCount + 1);

    // Process field values - we need to create or find ServiceField entries
    const processedFieldValues = [];
    
    // Get all service fields for this service
    const serviceWithFields = await prisma.service.findUnique({
      where: { id: socService.id },
      include: {
        fields: true,
        fieldTemplates: {
          include: {
            fieldTemplate: true
          }
        }
      }
    });

    if (!serviceWithFields) {
      throw new Error('Service configuration error');
    }

    for (const { fieldName, value } of parsedData.fieldValues) {
      // Find the field template
      const fieldTemplateLink = serviceWithFields.fieldTemplates.find(
        sft => sft.fieldTemplate.name === fieldName
      );

      if (fieldTemplateLink) {
        // Check if a ServiceField already exists for this template
        let serviceField = serviceWithFields.fields.find(
          f => f.name === fieldTemplateLink.fieldTemplate.name
        );

        // If not, create it
        if (!serviceField) {
          serviceField = await prisma.serviceField.create({
            data: {
              serviceId: socService.id,
              name: fieldTemplateLink.fieldTemplate.name,
              label: fieldTemplateLink.fieldTemplate.label,
              type: fieldTemplateLink.fieldTemplate.type,
              isRequired: fieldTemplateLink.isRequired ?? fieldTemplateLink.fieldTemplate.isRequired,
              placeholder: fieldTemplateLink.fieldTemplate.placeholder,
              helpText: fieldTemplateLink.helpText || fieldTemplateLink.fieldTemplate.helpText,
              defaultValue: fieldTemplateLink.defaultValue || fieldTemplateLink.fieldTemplate.defaultValue,
              options: fieldTemplateLink.fieldTemplate.options || undefined,
              validation: fieldTemplateLink.fieldTemplate.validation || undefined,
              order: fieldTemplateLink.order,
              isActive: true
            }
          });
        }

        // Add to processed field values
        processedFieldValues.push({
          fieldId: serviceField.id,
          value: value
        });
      }
    }

    // Create additional security findings
    const securityFindings = {
      sourceSystem: body.apiKey ? 'External SOC Tool' : 'Manual Entry',
      parsedAt: new Date().toISOString(),
      originalText: text.substring(0, 1000), // Store first 1000 chars
      severity: parsedData.severity,
      ...Object.fromEntries(
        parsedData.fieldValues
          .filter(fv => fv.fieldName.startsWith('soc_'))
          .map(fv => [fv.fieldName, fv.value])
      )
    };

    // Create the ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: parsedData.title,
        description: parsedData.description,
        category: 'INCIDENT',
        serviceId: socService.id,
        priority: parsedData.severity === 'Critical' ? 'CRITICAL' : 
                 parsedData.severity === 'High' ? 'HIGH' :
                 parsedData.severity === 'Medium' ? 'MEDIUM' : 'LOW',
        status: 'OPEN',
        createdById: userId,
        branchId: userBranchId,
        supportGroupId: socService.supportGroupId,
        isConfidential: true,
        issueClassification: 'SECURITY_INCIDENT',
        securityClassification: parsedData.securityClassification,
        securityFindings: securityFindings,
        fieldValues: processedFieldValues.length > 0 ? {
          create: processedFieldValues
        } : undefined
      },
      include: {
        service: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        fieldValues: {
          include: {
            field: true
          }
        }
      }
    });

    // Leave ticket unassigned - creator can assign it themselves or it stays unassigned
    // No auto-assignment to other analysts

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'Ticket',
        entityId: ticket.id,
        newValues: {
          source: 'SOC Parser API',
          ticketNumber: ticket.ticketNumber,
          severity: parsedData.severity
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    });

    // Return success response
    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: null, // Ticket is unassigned
        createdAt: ticket.createdAt,
        url: `/tickets/${ticket.id}`
      },
      parsed: {
        severity: parsedData.severity,
        fieldCount: parsedData.fieldValues.length,
        securityClassification: parsedData.securityClassification
      }
    });

  } catch (error) {
    console.error('SOC ticket creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create SOC ticket', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check service status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['SECURITY_ANALYST', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if SOC service exists
    const socService = await prisma.service.findFirst({
      where: { name: 'SOC Security Incident' },
      include: {
        _count: {
          select: {
            tickets: true,
            fieldTemplates: true
          }
        },
        supportGroup: true
      }
    });

    if (!socService) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'SOC service not found. Please run: npm run db:seed:soc'
      });
    }

    return NextResponse.json({
      status: 'ready',
      service: {
        id: socService.id,
        name: socService.name,
        supportGroup: socService.supportGroup?.name,
        fieldCount: socService._count.fieldTemplates,
        ticketCount: socService._count.tickets,
        isActive: socService.isActive
      },
      endpoint: '/api/soc/parse-and-create',
      methods: ['POST'],
      authentication: ['Session (SECURITY_ANALYST role)', 'API Key (Bearer token)'],
      rateLimit: '10 requests per minute'
    });

  } catch (error) {
    console.error('SOC status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check SOC service status' },
      { status: 500 }
    );
  }
}