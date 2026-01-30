import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * This endpoint auto-sets resolvedAt for CLOSED tickets that were closed without being resolved first.
 * It sets resolvedAt to the closedAt timestamp for tickets closed more than 24 hours ago.
 * Can be called via cron job or scheduled task.
 *
 * GET /api/tasks/auto-resolve-closed-tickets
 */

export async function GET(request: NextRequest) {
  try {
    // Optional: Add a secret key check for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, validate it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate the cutoff date (24 hours ago)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Find all CLOSED tickets without resolvedAt, closed more than 24 hours ago
    const ticketsToResolve = await prisma.ticket.findMany({
      where: {
        status: 'CLOSED',
        resolvedAt: null,
        closedAt: {
          lt: twentyFourHoursAgo
        }
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        closedAt: true
      }
    });

    if (ticketsToResolve.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tickets to auto-resolve',
        resolvedCount: 0
      });
    }

    const resolvedTickets: string[] = [];
    const errors: string[] = [];
    const now = new Date();

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

    // Update each ticket to set resolvedAt
    for (const ticket of ticketsToResolve) {
      try {
        await prisma.$transaction(async (tx) => {
          // Set resolvedAt to closedAt timestamp
          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              resolvedAt: ticket.closedAt
            }
          });

          // Add a system comment
          if (systemUser) {
            await tx.ticketComment.create({
              data: {
                ticketId: ticket.id,
                userId: systemUser.id,
                content: 'Resolved By System - Auto-resolved after 24 hours as per ticket lifecycle policy.',
                isInternal: true
              }
            });
          }
        });

        resolvedTickets.push(ticket.ticketNumber);
      } catch (err) {
        console.error(`Failed to auto-resolve ticket ${ticket.ticketNumber}:`, err);
        errors.push(ticket.ticketNumber);
      }
    }

    console.log(`[Auto-Resolve] Set resolvedAt for ${resolvedTickets.length} closed tickets`);

    return NextResponse.json({
      success: true,
      message: `Successfully auto-resolved ${resolvedTickets.length} tickets`,
      resolvedCount: resolvedTickets.length,
      resolvedTickets,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error in auto-resolve closed tickets task:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run auto-resolve task',
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
