import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint auto-closes ATM Monitoring Alert tickets that are older than 3 days
// Can be called via cron job or scheduled task
// GET /api/tasks/auto-close-monitoring-tickets

export async function GET(request: NextRequest) {
  try {
    // Optional: Add a secret key check for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, validate it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the services to auto-close
    const services = await prisma.service.findMany({
      where: {
        name: {
          in: ['ATM Monitoring Alert', 'ATM - Automatic Report']
        }
      },
      select: { id: true, name: true }
    });

    if (services.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No auto-close services found',
        closedCount: 0
      });
    }

    const serviceIds = services.map(s => s.id);

    // Calculate the cutoff date (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Find all open/in-progress tickets for these services older than 3 days
    const ticketsToClose = await prisma.ticket.findMany({
      where: {
        serviceId: { in: serviceIds },
        status: {
          notIn: ['CLOSED', 'CANCELLED']
        },
        createdAt: {
          lt: threeDaysAgo
        }
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        createdAt: true
      }
    });

    if (ticketsToClose.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tickets to close',
        closedCount: 0
      });
    }

    // Get or create a system user for the comment
    let systemUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'system@banksulutgo.co.id' },
          { name: 'System' }
        ]
      }
    });

    // If no system user exists, use the first admin
    if (!systemUser) {
      systemUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });
    }

    const closedTickets: string[] = [];
    const errors: string[] = [];
    const now = new Date();

    // Claim and close each ticket with a comment
    for (const ticket of ticketsToClose) {
      try {
        await prisma.$transaction(async (tx) => {
          // Update ticket - claim (assign) and close
          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              status: 'CLOSED',
              assignedToId: systemUser?.id, // Claim the ticket
              closedAt: now,
              resolvedAt: ticket.status !== 'RESOLVED' ? now : undefined
            }
          });

          // Add a system comment
          if (systemUser) {
            await tx.ticketComment.create({
              data: {
                ticketId: ticket.id,
                userId: systemUser.id,
                content: 'Claimed and Closed By System - Auto-closed after 3 days as per ATM Monitoring/Automatic Report policy.',
                isInternal: false
              }
            });
          }
        });

        closedTickets.push(ticket.ticketNumber);
      } catch (err) {
        console.error(`Failed to close ticket ${ticket.ticketNumber}:`, err);
        errors.push(ticket.ticketNumber);
      }
    }

    console.log(`[Auto-Close] Closed ${closedTickets.length} ATM Monitoring Alert tickets`);

    return NextResponse.json({
      success: true,
      message: `Successfully closed ${closedTickets.length} tickets`,
      closedCount: closedTickets.length,
      closedTickets,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error in auto-close monitoring tickets task:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run auto-close task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
