import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/sla-check
 *
 * SLA breach notification cron job.
 * Called every 15 minutes by PM2 cron or external scheduler.
 * Protected by SLA_CRON_SECRET environment variable.
 *
 * Checks for:
 * 1. "At risk" tickets (< 25% time remaining before breach)
 * 2. "Breached" tickets (past deadline)
 *
 * Creates notifications for assignees and managers.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const secret = request.nextUrl.searchParams.get('key');
    const expectedSecret = process.env.SLA_CRON_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    let atRiskCount = 0;
    let breachedCount = 0;
    let notificationsCreated = 0;

    // Find all open tickets with SLA tracking
    const slaRecords: any[] = await prisma.sLATracking.findMany({
      where: {
        ticket: {
          status: {
            in: ['OPEN', 'IN_PROGRESS', 'PENDING_VENDOR']
          }
        }
      },
      include: {
        ticket: {
          include: {
            supportGroup: {
              include: {
                users: {
                  where: { role: 'MANAGER' },
                  select: { id: true },
                  take: 1
                }
              }
            }
          }
        },
        slaTemplate: true
      }
    });

    for (const sla of slaRecords) {
      const ticket = sla.ticket;
      if (!ticket) continue;

      // Skip paused tickets
      if (ticket.slaPausedAt) continue;

      // Calculate effective time remaining
      const slaStart = ticket.slaStartAt ? new Date(ticket.slaStartAt) : new Date(sla.createdAt);
      const elapsedMs = now.getTime() - slaStart.getTime() - (ticket.slaPausedTotal || 0);
      const resolutionDeadlineMs = sla.slaTemplate.resolutionHours * 60 * 60 * 1000;
      const remainingMs = resolutionDeadlineMs - elapsedMs;
      const percentRemaining = remainingMs / resolutionDeadlineMs;

      // Check if resolution is breached
      if (remainingMs <= 0 && !sla.isResolutionBreached) {
        breachedCount++;

        // Update breach flag
        await prisma.sLATracking.update({
          where: { id: sla.id },
          data: { isResolutionBreached: true }
        });

        // Notify assigned technician
        if (ticket.assignedToId) {
          await createNotificationIfNotExists(
            ticket.assignedToId,
            'TICKET_ESCALATED',
            `SLA Breached: ${ticket.ticketNumber}`,
            `Ticket "${ticket.title}" has exceeded its SLA resolution deadline.`,
            { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, type: 'sla_breach' }
          );
          notificationsCreated++;
        }

        // Notify support group manager
        const managerId = ticket.supportGroup?.users?.[0]?.id;
        if (managerId && managerId !== ticket.assignedToId) {
          await createNotificationIfNotExists(
            managerId,
            'TICKET_ESCALATED',
            `SLA Breached: ${ticket.ticketNumber}`,
            `Ticket "${ticket.title}" has exceeded its SLA resolution deadline and requires attention.`,
            { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, type: 'sla_breach_manager' }
          );
          notificationsCreated++;
        }

        // Check escalation
        const escalationDeadlineMs = sla.slaTemplate.escalationHours * 60 * 60 * 1000;
        if (elapsedMs > escalationDeadlineMs && !sla.isEscalated) {
          await prisma.sLATracking.update({
            where: { id: sla.id },
            data: { isEscalated: true }
          });
        }
      }
      // Check if at risk (< 25% time remaining, not yet breached)
      else if (percentRemaining <= 0.25 && percentRemaining > 0) {
        atRiskCount++;

        // Notify assigned technician
        if (ticket.assignedToId) {
          await createNotificationIfNotExists(
            ticket.assignedToId,
            'SYSTEM_ALERT',
            `SLA At Risk: ${ticket.ticketNumber}`,
            `Ticket "${ticket.title}" has less than 25% of its SLA time remaining. Please prioritize resolution.`,
            { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, type: 'sla_at_risk' }
          );
          notificationsCreated++;
        }
      }

      // Check response breach for unresponded tickets
      if (!sla.responseTime) {
        const responseDeadlineMs = sla.slaTemplate.responseHours * 60 * 60 * 1000;
        if (elapsedMs > responseDeadlineMs && !sla.isResponseBreached) {
          await prisma.sLATracking.update({
            where: { id: sla.id },
            data: { isResponseBreached: true }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      totalChecked: slaRecords.length,
      atRisk: atRiskCount,
      breached: breachedCount,
      notificationsCreated
    });

  } catch (error) {
    console.error('SLA check cron error:', error);
    return NextResponse.json(
      { error: 'SLA check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Create a notification if one with the same type hasn't been sent
 * in the last 4 hours for the same ticket.
 */
async function createNotificationIfNotExists(
  userId: string,
  type: 'TICKET_ESCALATED' | 'SYSTEM_ALERT',
  title: string,
  message: string,
  data: Record<string, any>
) {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  // Check if a similar notification was already sent recently
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type,
      data: {
        path: ['ticketId'],
        equals: data.ticketId
      },
      createdAt: { gte: fourHoursAgo }
    }
  });

  if (!existing) {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data
      }
    });
  }
}
