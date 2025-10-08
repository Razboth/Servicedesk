import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getClientIp } from '@/lib/utils/ip-utils';
import { authenticateApiKey, checkApiPermission, createApiErrorResponse } from '@/lib/auth-api';

// Validation schema for creating ATM incidents
const createIncidentSchema = z.object({
  atmCode: z.string().min(1, 'ATM code is required'),
  type: z.enum(['NETWORK_DOWN', 'HARDWARE_FAILURE', 'SOFTWARE_ERROR', 'MAINTENANCE', 'SECURITY_BREACH']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(1, 'Description is required'),
  externalReferenceId: z.string().optional(),
  metrics: z.record(z.any()).optional(), // JSON object for additional metrics
  autoCreateTicket: z.boolean().default(true), // Whether to auto-create a ticket
});

// ATM incident to 3-tier category mapping
const ATM_INCIDENT_MAPPING = {
  NETWORK_DOWN: {
    category: 'Infrastructure',
    subcategory: 'Network',
    item: 'ATM Network Connectivity'
  },
  HARDWARE_FAILURE: {
    category: 'Hardware',
    subcategory: 'ATM Hardware',
    item: 'Hardware Malfunction'
  },
  SOFTWARE_ERROR: {
    category: 'Software',
    subcategory: 'ATM Software',
    item: 'System Error'
  },
  MAINTENANCE: {
    category: 'Service Request',
    subcategory: 'Maintenance',
    item: 'ATM Maintenance'
  },
  SECURITY_BREACH: {
    category: 'Security',
    subcategory: 'Cyber Security',
    item: 'Security Incident'
  }
};

export async function GET(request: NextRequest) {
  try {
    // Check for API key first
    const apiAuth = await authenticateApiKey(request);
    let userId: string | null = null;
    let hasAccess = false;
    
    if (apiAuth.authenticated && apiAuth.apiKey) {
      // Check if API key has required permissions for monitoring
      if (checkApiPermission(apiAuth.apiKey, 'monitoring:read') || checkApiPermission(apiAuth.apiKey, 'atm:read')) {
        hasAccess = true;
        userId = apiAuth.apiKey.linkedUserId || apiAuth.apiKey.createdById;
      }
    } else {
      // Fall back to session authentication if no valid API key
      const session = await auth();
      
      if (session && ['MANAGER', 'ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
        hasAccess = true;
        userId = session.user.id;
      }
    }
    
    if (!hasAccess) {
      // Log unauthorized access attempt
      const clientIp = getClientIp(request);
      console.log(`[ATM Incidents] Unauthorized access attempt from IP: ${clientIp}`);
      
      return createApiErrorResponse('Unauthorized - requires valid API key with monitoring:read permission or session with appropriate role', 401);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const atmCode = searchParams.get('atmCode');

    // Get user's branch if not admin (for API keys, show all data)
    let branchId: string | undefined;
    if (userId && !apiAuth.authenticated) {
      // Only filter by branch for session-based access (not API key access)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { branchId: true, role: true }
      });
      
      // Admins, Super Admins, and Managers can see all branches
      if (user && !['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role)) {
        branchId = user.branchId || undefined;
      }
    }

    // Build where clause
    const where: any = {};
    if (branchId) {
      where.atm = { branchId };
    }
    if (atmCode) {
      where.atm = { ...where.atm, code: atmCode };
    }

    // Fetch recent incidents
    const incidents = await prisma.aTMIncident.findMany({
      where,
      include: {
        atm: {
          select: {
            code: true,
            location: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Find related tickets for each incident
    const incidentCodes = [...new Set(incidents.map(i => i.atm.code))];
    const relatedTickets = await prisma.ticket.findMany({
      where: {
        OR: incidentCodes.map(code => ({
          OR: [
            { description: { contains: code, mode: 'insensitive' } },
            { title: { contains: code, mode: 'insensitive' } }
          ]
        }))
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true
      }
    });

    // Transform incident data
    const transformedIncidents = incidents.map(incident => {
      // Try to find a related ticket
      const relatedTicket = relatedTickets.find(ticket => {
        const incidentTime = new Date(incident.createdAt).getTime();
        const ticketTime = new Date(ticket.createdAt).getTime();
        const timeDiff = Math.abs(incidentTime - ticketTime);
        
        // Check if ticket was created within 1 hour of incident and mentions the ATM
        return timeDiff < 60 * 60 * 1000 && (
          ticket.title.toLowerCase().includes(incident.atm.code.toLowerCase()) ||
          ticket.description.toLowerCase().includes(incident.atm.code.toLowerCase())
        );
      });

      return {
        id: incident.id,
        atmCode: incident.atm.code,
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
        createdAt: incident.createdAt,
        resolvedAt: incident.resolvedAt,
        ticketId: relatedTicket?.id
      };
    });

    return NextResponse.json({ incidents: transformedIncidents });
  } catch (error) {
    console.error('Error fetching ATM incidents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATM incidents' },
      { status: 500 }
    );
  }
}

// POST /api/monitoring/atms/incidents - Create new ATM incident (requires API key)
export async function POST(request: NextRequest) {
  try {
    // Check for API key first (required for POST)
    const apiAuth = await authenticateApiKey(request);
    let userId: string | null = null;
    let hasAccess = false;
    
    if (apiAuth.authenticated && apiAuth.apiKey) {
      // Check if API key has required permissions for creating incidents
      if (checkApiPermission(apiAuth.apiKey, 'monitoring:write') || checkApiPermission(apiAuth.apiKey, 'atm:write')) {
        hasAccess = true;
        userId = apiAuth.apiKey.linkedUserId || apiAuth.apiKey.createdById;
      }
    }
    
    if (!hasAccess) {
      // Log unauthorized access attempt
      const clientIp = getClientIp(request);
      console.log(`[ATM Incidents] Unauthorized POST attempt from IP: ${clientIp}`);
      
      return createApiErrorResponse('Unauthorized - requires valid API key with monitoring:write or atm:write permission', 401);
    }

    const body = await request.json();
    const validatedData = createIncidentSchema.parse(body);

    // Find the ATM by code
    const atm = await prisma.aTM.findUnique({
      where: { code: validatedData.atmCode },
      include: { branch: true }
    });

    if (!atm) {
      return NextResponse.json(
        { error: `ATM with code ${validatedData.atmCode} not found` },
        { status: 404 }
      );
    }

    let ticketId = null;
    let systemUser = null;
    let service = null;
    
    if (validatedData.autoCreateTicket) {
      try {
        // Find or create a system user for API key calls or use linked user
        if (!userId) {
          systemUser = await prisma.user.findFirst({
            where: { 
              email: 'system@banksulutgo.co.id',
              role: 'ADMIN'
            }
          });

          if (!systemUser) {
            // Create system user if it doesn't exist
            const hashedPassword = await require('bcryptjs').hash('system123', 10);
            systemUser = await prisma.user.create({
              data: {
                username: 'system',
                name: 'System User',
                email: 'system@banksulutgo.co.id',
                password: hashedPassword,
                role: 'ADMIN',
                branchId: atm.branchId // Same branch as the ATM
              }
            });
          }
        }
        
        // Get the 3-tier category mapping for this incident type
        const mapping = ATM_INCIDENT_MAPPING[validatedData.type];
        
        // Find the ATM Monitoring Alert service specifically
        service = await prisma.service.findFirst({
          where: {
            name: 'ATM Monitoring Alert',
            isActive: true
          }
        });

        // If the specific service doesn't exist, try to find any ATM-related service
        if (!service) {
          service = await prisma.service.findFirst({
            where: {
              name: { contains: 'ATM', mode: 'insensitive' },
              isActive: true
            }
          });
        }

        // If still no service found, log error and return
        if (!service) {
          console.error('❌ ATM Monitoring Alert service not found. Please run: node prisma/seeds/seed-atm-monitoring.js');
          return NextResponse.json(
            { error: 'ATM Monitoring Alert service not configured. Please contact administrator.' },
            { status: 500 }
          );
        }

        // Generate ticket number using standard format
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

        // Determine priority based on severity (use service default if available)
        const priority = validatedData.severity === 'CRITICAL' ? 'CRITICAL' : 
                        validatedData.severity === 'HIGH' ? 'HIGH' : 
                        validatedData.severity === 'MEDIUM' ? 'MEDIUM' : 
                        validatedData.severity === 'LOW' ? 'LOW' :
                        service.priority || 'MEDIUM';

        // Create the ticket with proper support group assignment
        const ticket = await prisma.ticket.create({
          data: {
            ticketNumber,
            title: `ATM ${validatedData.type.replace('_', ' ')} - ${atm.code}`,
            description: `Automated incident from ATM monitoring system:\n\n${validatedData.description}\n\nATM: ${atm.name} (${atm.code})\nLocation: ${atm.location || 'Unknown'}\nBranch: ${atm.branch?.name || 'Unknown'}\nSeverity: ${validatedData.severity}\n\nExternal Reference: ${validatedData.externalReferenceId || 'N/A'}`,
            category: validatedData.type === 'MAINTENANCE' ? 'SERVICE_REQUEST' : 
                     validatedData.type === 'SECURITY_BREACH' ? 'INCIDENT' : 'INCIDENT',
            serviceId: service.id,
            supportGroupId: service.supportGroupId, // Assign to service's support group
            priority,
            status: 'OPEN',
            createdById: userId || systemUser!.id, // Use API key user or system user
            branchId: atm.branchId,
            isConfidential: validatedData.type === 'SECURITY_BREACH', // Security incidents are confidential
            issueClassification: validatedData.type === 'HARDWARE_FAILURE' ? 'HARDWARE_FAILURE' :
                                validatedData.type === 'NETWORK_DOWN' ? 'NETWORK_ISSUE' :
                                validatedData.type === 'SECURITY_BREACH' ? 'SECURITY_INCIDENT' :
                                validatedData.type === 'SOFTWARE_ERROR' ? 'SYSTEM_ERROR' : 'EXTERNAL_FACTOR',
            // Add security fields for security incidents
            securityClassification: validatedData.type === 'SECURITY_BREACH' ? validatedData.severity : undefined,
            securityFindings: validatedData.type === 'SECURITY_BREACH' && validatedData.metrics ? 
              validatedData.metrics : undefined
          }
        });

        ticketId = ticket.id;
        console.log(`✅ Auto-created ticket ${ticket.ticketNumber} for ATM incident`);
      } catch (ticketError: any) {
        console.error('❌ Failed to create ticket for ATM incident:', ticketError);
        console.error('Ticket creation error details:', {
          errorMessage: ticketError?.message,
          errorCode: ticketError?.code,
          atmCode: validatedData.atmCode,
          hasSession: !!session?.user?.id,
          hasSystemUser: !!systemUser?.id,
          serviceFound: !!service
        });
        // Continue with incident creation even if ticket creation fails
      }
    }

    // Create the ATM incident
    const incident = await prisma.aTMIncident.create({
      data: {
        atmId: atm.id,
        ticketId,
        type: validatedData.type,
        severity: validatedData.severity,
        description: validatedData.description,
        externalReferenceId: validatedData.externalReferenceId,
        metrics: validatedData.metrics,
        status: 'OPEN'
      },
      include: {
        atm: {
          select: {
            code: true,
            name: true,
            location: true,
            branch: {
              select: { name: true }
            }
          }
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true
          }
        }
      }
    });

    // Get client IP address
    const clientIp = getClientIp(request);
    
    // Create audit log for incident creation
    const auditUserId = userId || systemUser?.id || (await prisma.user.findFirst({
      where: { email: 'system@banksulutgo.co.id' },
      select: { id: true }
    }))?.id;
    
    if (auditUserId) {
      await prisma.auditLog.create({
        data: {
          userId: auditUserId,
          ticketId,
          action: apiAuth.authenticated ? 'CREATE_ATM_INCIDENT_API' : 'CREATE_ATM_INCIDENT',
          entity: 'ATMIncident',
          entityId: incident.id,
          newValues: {
            atmCode: validatedData.atmCode,
            type: validatedData.type,
            severity: validatedData.severity,
            autoTicketCreated: !!ticketId,
            sourceIp: clientIp,
            userAgent: request.headers.get('user-agent') || 'Unknown',
            externalReferenceId: validatedData.externalReferenceId,
            apiKeyName: apiAuth.apiKey?.name || null,
            note: apiAuth.authenticated ? 'Created via API key' : 'Created via session'
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      incident: {
        id: incident.id,
        atmCode: incident.atm.code,
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
        status: incident.status,
        createdAt: incident.createdAt,
        externalReferenceId: incident.externalReferenceId,
        ticket: incident.ticket
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating ATM incident:', error);
    return NextResponse.json(
      { error: 'Failed to create ATM incident' },
      { status: 500 }
    );
  }
}