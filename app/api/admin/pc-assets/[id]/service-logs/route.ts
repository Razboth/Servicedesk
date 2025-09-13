import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/admin/pc-assets/[id]/service-logs - Get service logs for a PC asset
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceLogs = await prisma.pCServiceLog.findMany({
      where: { pcAssetId: params.id },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true
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
        },
        hardeningChecklist: {
          select: {
            id: true,
            complianceScore: true,
            status: true,
            template: {
              select: {
                name: true,
                osType: true
              }
            }
          }
        }
      },
      orderBy: { performedAt: 'desc' }
    });

    return NextResponse.json(serviceLogs);
  } catch (error) {
    console.error('Error fetching service logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service logs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/pc-assets/[id]/service-logs - Create a service log with optional ticket creation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow admin roles, technicians, and TECH_SUPPORT group members
    const isAuthorized = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role) || 
                         session.user.supportGroupCode === 'TECH_SUPPORT';
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.serviceType || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: serviceType and description' },
        { status: 400 }
      );
    }

    // Check if PC asset exists
    const pcAsset = await prisma.PCAsset.findUnique({
      where: { id: params.id },
      include: {
        branch: true,
        assignedTo: true
      }
    });

    if (!pcAsset) {
      return NextResponse.json({ error: 'PC asset not found' }, { status: 404 });
    }

    // Start a transaction to create service log and optionally a ticket
    const result = await prisma.$transaction(async (tx) => {
      let ticketId = body.ticketId;

      // Create a ticket if requested and no ticketId provided
      if (body.createTicket && !ticketId) {
        // Find the appropriate service based on service type
        const serviceMapping: { [key: string]: string } = {
          'HARDENING': 'PC Hardening Service',
          'MAINTENANCE': 'PC Maintenance Log',
          'REPAIR': 'PC Maintenance Log',
          'UPGRADE': 'PC Maintenance Log',
          'INSTALLATION': 'Software License Management',
          'AUDIT': 'PC Asset Registration',
          'DECOMMISSION': 'PC Asset Registration'
        };

        const serviceName = serviceMapping[body.serviceType] || 'PC Maintenance Log';
        
        const service = await tx.service.findFirst({
          where: { name: serviceName }
        });

        if (!service) {
          throw new Error(`Service not found: ${serviceName}`);
        }

        // Generate ticket number
        const lastTicket = await tx.ticket.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { ticketNumber: true }
        });

        const ticketNumber = lastTicket 
          ? `TKT${(parseInt(lastTicket.ticketNumber.replace('TKT', '')) + 1).toString().padStart(6, '0')}`
          : 'TKT000001';

        // Create the ticket
        const ticket = await tx.ticket.create({
          data: {
            ticketNumber,
            title: body.ticketTitle || `${body.serviceType} for ${pcAsset.pcName}`,
            description: body.ticketDescription || body.description,
            serviceId: service.id,
            categoryId: service.categoryId,
            subcategoryId: service.subcategoryId,
            priority: body.priority || 'MEDIUM',
            status: 'OPEN',
            createdById: session.user.id,
            branchId: pcAsset.branchId,
            supportGroupId: service.supportGroupId,
            assignedToId: body.assignToSelf ? session.user.id : null,
            customFields: {
              pcAssetId: pcAsset.id,
              pcAssetName: pcAsset.pcName,
              serviceType: body.serviceType
            }
          }
        });

        ticketId = ticket.id;

        // Create audit log for ticket creation
        await tx.auditLog.create({
          data: {
            action: 'CREATE',
            entityType: 'TICKET',
            entityId: ticket.id,
            details: `Created ticket ${ticket.ticketNumber} for PC service`,
            userId: session.user.id,
            metadata: {
              pcAssetId: pcAsset.id,
              serviceType: body.serviceType
            }
          }
        });
      }

      // Create the service log
      const serviceLog = await tx.pCServiceLog.create({
        data: {
          pcAssetId: params.id,
          ticketId,
          serviceType: body.serviceType,
          performedById: session.user.id,
          description: body.description,
          findings: body.findings,
          recommendations: body.recommendations,
          beforeStatus: body.beforeStatus,
          afterStatus: body.afterStatus,
          attachments: body.attachments,
          performedAt: body.performedAt ? new Date(body.performedAt) : new Date()
        },
        include: {
          pcAsset: true,
          performedBy: true,
          ticket: true
        }
      });

      // Update PC asset's last audit date if this is an audit
      if (body.serviceType === 'AUDIT') {
        await tx.pCAsset.update({
          where: { id: params.id },
          data: { lastAuditDate: new Date() }
        });
      }

      // Update hardening compliance if this is a hardening service
      if (body.serviceType === 'HARDENING' && body.hardeningCompliant !== undefined) {
        await tx.pCAsset.update({
          where: { id: params.id },
          data: {
            lastHardeningDate: new Date(),
            hardeningCompliant: body.hardeningCompliant
          }
        });
      }

      // Create audit log for service log
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'PC_SERVICE_LOG',
          entityId: serviceLog.id,
          details: `Created ${body.serviceType} service log for ${pcAsset.pcName}`,
          userId: session.user.id,
          metadata: {
            pcAssetId: pcAsset.id,
            serviceType: body.serviceType,
            ticketId
          }
        }
      });

      return serviceLog;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating service log:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create service log' },
      { status: 500 }
    );
  }
}