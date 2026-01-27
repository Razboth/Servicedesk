import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const incidentId = params.id;
    
    // Get the incident with related data
    const incident = await prisma.networkIncident.findUnique({
      where: { id: incidentId },
      include: {
        atm: {
          include: {
            branch: true
          }
        },
        branch: true,
        ticket: true
      }
    });

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Check if ticket already exists for this incident
    if (incident.ticketId) {
      return NextResponse.json({ 
        error: 'Ticket already exists for this incident',
        ticketId: incident.ticketId,
        ticketNumber: incident.ticket?.ticketNumber
      }, { status: 400 });
    }

    // Determine the appropriate service based on incident type and entity
    let serviceId: string;
    let branchId: string | null = null;
    let title: string;
    let description: string;
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY' = 'HIGH';

    if (incident.atmId && incident.atm) {
      // ATM-related incident
      serviceId = 'cmekrqidp00hthlus1p2za21o'; // ATM - Permasalahan Teknis
      branchId = incident.atm.branchId;
      title = `ATM Network Issue - ${incident.atm.name}`;
      description = `Network incident detected on ATM: ${incident.atm.name} (${incident.atm.code})\n\n` +
                   `IP Address: ${incident.atm.ipAddress}\n` +
                   `Location: ${incident.atm.location || 'Unknown'}\n` +
                   `Branch: ${incident.atm.branch?.name || 'Unknown'}\n\n` +
                   `Incident Details:\n` +
                   `- Type: ${incident.type?.replace(/_/g, ' ') || 'Network Issue'}\n` +
                   `- Severity: ${incident.severity}\n` +
                   `- Detected At: ${incident.detectedAt.toLocaleString()}\n` +
                   `- Description: ${incident.description}\n\n` +
                   `This ticket was automatically created from network monitoring incident ${incident.id}.`;
    } else if (incident.branchId && incident.branch) {
      // Branch-related incident
      serviceId = 'cmekrqijb00odhluszsuiaop4'; // WAN Network Disruption
      branchId = incident.branchId;
      title = `Branch Network Issue - ${incident.branch.name}`;
      description = `Network incident detected on branch: ${incident.branch.name} (${incident.branch.code})\n\n` +
                   `IP Address: ${incident.branch.ipAddress}\n` +
                   `Location: ${incident.branch.city || 'Unknown'}\n\n` +
                   `Incident Details:\n` +
                   `- Type: ${incident.type?.replace(/_/g, ' ') || 'Network Issue'}\n` +
                   `- Severity: ${incident.severity}\n` +
                   `- Detected At: ${incident.detectedAt.toLocaleString()}\n` +
                   `- Description: ${incident.description}\n\n` +
                   `This ticket was automatically created from network monitoring incident ${incident.id}.`;
    } else {
      // General network incident
      serviceId = 'cmew33vz700pm28nsfreduxw2'; // Gangguan Internet (Internet Disruption)
      branchId = session.user.branchId || null;
      title = `Network Incident - ${incident.type?.replace(/_/g, ' ') || 'Network Issue'}`;
      description = `Network incident detected:\n\n` +
                   `Incident Details:\n` +
                   `- Type: ${incident.type?.replace(/_/g, ' ') || 'Network Issue'}\n` +
                   `- Severity: ${incident.severity}\n` +
                   `- Detected At: ${incident.detectedAt.toLocaleString()}\n` +
                   `- Description: ${incident.description}\n\n` +
                   `This ticket was automatically created from network monitoring incident ${incident.id}.`;
    }

    // Set priority based on incident severity
    switch (incident.severity) {
      case 'HIGH':
        priority = 'CRITICAL';
        break;
      case 'MEDIUM':
        priority = 'HIGH';
        break;
      case 'LOW':
        priority = 'MEDIUM';
        break;
      default:
        priority = 'HIGH';
    }

    // Generate ticket number - get max ticket number and increment
    const maxResult = await prisma.$queryRaw<[{ maxNum: bigint | null }]>`
      SELECT MAX(CAST(NULLIF(REGEXP_REPLACE("ticketNumber", '[^0-9]', '', 'g'), '') AS BIGINT)) as "maxNum"
      FROM "tickets"
    `;
    const maxTicketNumber = maxResult[0]?.maxNum ? Number(maxResult[0].maxNum) : 0;
    const ticketNumber = String(maxTicketNumber + 1);

    // Create the ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title,
        description,
        serviceId,
        priority,
        status: 'OPEN',
        createdById: session.user.id,
        branchId,
        category: 'INCIDENT',
        issueClassification: 'NETWORK_ISSUE'
      }
    });

    // Update the incident to link it to the ticket
    await prisma.networkIncident.update({
      where: { id: incidentId },
      data: { 
        ticketId: ticket.id,
        status: 'IN_PROGRESS' // Update incident status to show it's being worked on
      }
    });

    // Create an audit log entry
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          entity: 'Ticket',
          entityId: ticket.id,
          newValues: {
            ticketNumber: ticket.ticketNumber,
            fromIncident: incident.id,
            incidentType: incident.type,
            severity: incident.severity
          }
        }
      });
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError);
      // Don't fail the entire operation if audit logging fails
    }

    // Add initial comment to the ticket explaining the incident context
    await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        userId: session.user.id,
        content: `This ticket was automatically created from network monitoring incident.\n\n` +
                `**Incident ID:** ${incident.id}\n` +
                `**Detection Time:** ${incident.detectedAt.toLocaleString()}\n` +
                `**Monitoring Details:** Network monitoring system detected connectivity issues and automatically escalated this to the support team.\n\n` +
                `Please investigate and resolve the network connectivity issue as soon as possible.`,
        isInternal: false
      }
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority
      },
      incidentId: incident.id
    });

  } catch (error) {
    console.error('❌ Error creating ticket from incident:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json({ 
      error: 'Failed to create ticket from incident',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}