import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getClientIp } from '@/lib/utils/ip-utils';

// Validation schema for creating network incidents
const createIncidentSchema = z.object({
  entityType: z.enum(['BRANCH', 'ATM']),
  entityId: z.string().min(1, 'Entity ID is required'),
  type: z.enum(['COMMUNICATION_OFFLINE', 'SLOW_CONNECTION', 'PACKET_LOSS', 'HIGH_LATENCY', 'DNS_ISSUE', 'NETWORK_CONGESTION']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(1, 'Description is required'),
  externalReferenceId: z.string().optional(),
  metrics: z.record(z.any()).optional(),
  autoCreateTicket: z.boolean().default(true)
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['MANAGER', 'ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      // Log unauthorized access attempt
      const clientIp = getClientIp(request);
      console.log(`[Network Incidents] Unauthorized access attempt from IP: ${clientIp}`);
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's branch if not admin
    let branchId: string | undefined;
    if (session.user.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });
      branchId = user?.branchId || undefined;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // Filter by status
    const entityType = searchParams.get('entityType'); // Filter by entity type
    const severity = searchParams.get('severity'); // Filter by severity

    // Build where clause
    const where: any = {};
    
    // Add branch filtering for non-admin users
    if (branchId) {
      where.OR = [
        { branchId: branchId },
        { atm: { branchId: branchId } }
      ];
    }

    // Add optional filters
    if (status) where.status = status;
    if (severity) where.severity = severity;
    
    // Filter by entity type
    if (entityType === 'BRANCH') {
      where.branchId = { not: null };
      where.atmId = null;
    } else if (entityType === 'ATM') {
      where.atmId = { not: null };
      where.branchId = null;
    }

    // Fetch network incidents
    const incidents = await prisma.networkIncident.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true
          }
        },
        atm: {
          select: {
            id: true,
            name: true,
            code: true,
            location: true,
            branch: {
              select: { name: true, code: true }
            }
          }
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Transform incident data
    const transformedIncidents = incidents.map(incident => {
      const entityType = incident.branchId ? 'BRANCH' : 'ATM';
      const entity = incident.branchId ? incident.branch : incident.atm;
      
      return {
        id: incident.id,
        entityType,
        entityId: incident.branchId || incident.atmId,
        entity: {
          id: entity?.id,
          name: entity?.name,
          code: entity?.code,
          location: entityType === 'BRANCH' ? (entity as any)?.city : (entity as any)?.location,
          branch: entityType === 'ATM' ? (entity as any)?.branch : null
        },
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
        status: incident.status,
        detectedAt: incident.detectedAt,
        resolvedAt: incident.resolvedAt,
        createdAt: incident.createdAt,
        updatedAt: incident.updatedAt,
        externalReferenceId: incident.externalReferenceId,
        metrics: incident.metrics,
        ticket: incident.ticket
      };
    });

    // Calculate summary statistics
    const summary = {
      total: incidents.length,
      open: incidents.filter(i => i.status === 'OPEN').length,
      inProgress: incidents.filter(i => i.status === 'IN_PROGRESS').length,
      resolved: incidents.filter(i => i.status === 'RESOLVED').length,
      critical: incidents.filter(i => i.severity === 'CRITICAL').length,
      high: incidents.filter(i => i.severity === 'HIGH').length,
      withTickets: incidents.filter(i => i.ticketId !== null).length
    };

    return NextResponse.json({
      summary,
      incidents: transformedIncidents,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching network incidents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network incidents' },
      { status: 500 }
    );
  }
}

// POST /api/monitoring/network/incidents - Create new network incident
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // Allow external monitoring systems or internal users with proper roles
    if (session && !['MANAGER', 'ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createIncidentSchema.parse(body);

    // Verify entity exists
    let entity = null;
    if (validatedData.entityType === 'BRANCH') {
      entity = await prisma.branch.findUnique({
        where: { id: validatedData.entityId },
        include: { users: { where: { role: 'MANAGER' }, take: 1 } }
      });
    } else if (validatedData.entityType === 'ATM') {
      entity = await prisma.aTM.findUnique({
        where: { id: validatedData.entityId },
        include: { branch: true }
      });
    }

    if (!entity) {
      return NextResponse.json(
        { error: `${validatedData.entityType} with ID ${validatedData.entityId} not found` },
        { status: 404 }
      );
    }

    // Check for existing open incident of same type
    const existingIncident = await prisma.networkIncident.findFirst({
      where: {
        [validatedData.entityType.toLowerCase() + 'Id']: validatedData.entityId,
        type: validatedData.type,
        status: 'OPEN'
      }
    });

    if (existingIncident) {
      return NextResponse.json({
        warning: 'Similar incident already exists',
        existingIncident: existingIncident.id,
        incident: existingIncident
      }, { status: 200 });
    }

    let ticketId = null;
    
    if (validatedData.autoCreateTicket) {
      try {
        // Find or create system user
        let systemUser = await prisma.user.findFirst({
          where: { 
            email: 'system@banksulutgo.co.id',
            role: 'ADMIN'
          }
        });

        if (!systemUser) {
          const bcrypt = require('bcryptjs');
          const hashedPassword = await bcrypt.hash('system123', 10);
          systemUser = await prisma.user.create({
            data: {
              username: 'network-monitor',
              name: 'Network Monitor System',
              email: 'system@banksulutgo.co.id',
              password: hashedPassword,
              role: 'ADMIN',
              branchId: validatedData.entityType === 'BRANCH' ? entity.id : (entity as any).branchId
            }
          });
        }

        // Find appropriate service for network incidents
        let service = await prisma.service.findFirst({
          where: {
            name: { contains: 'Network', mode: 'insensitive' },
            isActive: true
          }
        });

        if (!service) {
          // Create basic network service
          let category = await prisma.serviceCategory.findFirst({
            where: { name: { contains: 'Infrastructure', mode: 'insensitive' } }
          });
          
          // Create default category if none exists
          if (!category) {
            category = await prisma.serviceCategory.create({
              data: {
                name: 'Infrastructure',
                description: 'Infrastructure and network services',
                level: 1
              }
            });
          }
          
          const supportGroup = await prisma.supportGroup.findFirst({
            where: { name: { contains: 'IT Helpdesk', mode: 'insensitive' } }
          });

          service = await prisma.service.create({
            data: {
              name: 'Network Infrastructure',
              description: 'Network connectivity and infrastructure issues',
              categoryId: category.id,
              supportGroupId: supportGroup?.id || undefined,
              priority: validatedData.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
              slaHours: validatedData.severity === 'CRITICAL' ? 2 : 4,
              requiresApproval: false
            }
          });
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
        
        const ticketNumber = String(yearTicketCount + 1);

        // Create the ticket
        const ticket = await prisma.ticket.create({
          data: {
            ticketNumber,
            title: `${validatedData.type.replace('_', ' ')} - ${entity.name}`,
            description: `Network incident detected:\n\n${validatedData.description}\n\n${validatedData.entityType}: ${entity.name}\nLocation: ${validatedData.entityType === 'BRANCH' ? (entity as any).city : (entity as any).location}\nSeverity: ${validatedData.severity}\n\nExternal Reference: ${validatedData.externalReferenceId || 'N/A'}`,
            category: 'INCIDENT',
            serviceId: service.id,
            priority: validatedData.severity === 'CRITICAL' ? 'CRITICAL' : 
                     validatedData.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
            status: 'OPEN',
            createdById: session?.user?.id || systemUser.id,
            branchId: validatedData.entityType === 'BRANCH' ? entity.id : (entity as any).branchId,
            issueClassification: validatedData.type === 'COMMUNICATION_OFFLINE' ? 'NETWORK_ISSUE' : 'SYSTEM_ERROR'
          }
        });

        ticketId = ticket.id;
      } catch (ticketError) {
        console.error('Failed to create ticket for network incident:', ticketError);
      }
    }

    // Get client IP address for audit logging
    const clientIp = getClientIp(request);
    
    // Log the network incident creation with IP
    if (session?.user?.id) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          ticketId,
          action: 'CREATE_NETWORK_INCIDENT',
          entity: 'NetworkIncident',
          entityId: validatedData.entityId,
          newValues: {
            entityType: validatedData.entityType,
            type: validatedData.type,
            severity: validatedData.severity,
            autoTicketCreated: !!ticketId,
            sourceIp: clientIp,
            userAgent: request.headers.get('user-agent') || 'Unknown'
          },
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });
    } else {
      // For external API calls without session
      const systemUserId = (await prisma.user.findFirst({
        where: { email: 'system@banksulutgo.co.id' },
        select: { id: true }
      }))?.id;
      
      if (systemUserId) {
        await prisma.auditLog.create({
          data: {
            userId: systemUserId,
            ticketId,
            action: 'CREATE_NETWORK_INCIDENT_EXTERNAL',
            entity: 'NetworkIncident',
            entityId: validatedData.entityId,
            newValues: {
              entityType: validatedData.entityType,
              type: validatedData.type,
              severity: validatedData.severity,
              autoTicketCreated: !!ticketId,
              sourceIp: clientIp,
              userAgent: request.headers.get('user-agent') || 'Unknown',
              externalReferenceId: validatedData.externalReferenceId,
              note: 'Created via external API'
            },
            ipAddress: clientIp,
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        });
      }
    }

    // Create the network incident
    const incident = await prisma.networkIncident.create({
      data: {
        [validatedData.entityType.toLowerCase() + 'Id']: validatedData.entityId,
        ticketId,
        type: validatedData.type,
        severity: validatedData.severity,
        description: validatedData.description,
        externalReferenceId: validatedData.externalReferenceId,
        metrics: validatedData.metrics,
        status: 'OPEN'
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        atm: {
          select: {
            id: true,
            name: true,
            code: true,
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

    return NextResponse.json({
      success: true,
      incident: {
        id: incident.id,
        entityType: validatedData.entityType,
        entity: incident.branch || incident.atm,
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
    
    console.error('Error creating network incident:', error);
    return NextResponse.json(
      { error: 'Failed to create network incident' },
      { status: 500 }
    );
  }
}