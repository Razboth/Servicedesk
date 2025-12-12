import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shifts/pending-issues
 * Get unresolved issues from previous shift reports (not from current user's report)
 * These are issues that the previous technician didn't resolve
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get today's date range
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const today = new Date(todayStr + 'T00:00:00.000Z');

    // Get yesterday for fetching previous day's issues
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    // Find the current user's shift report for today (if exists)
    const currentUserReport = await prisma.shiftReport.findFirst({
      where: {
        shiftAssignment: {
          date: {
            gte: today,
          },
          staffProfile: {
            userId: userId,
          },
        },
      },
      select: { id: true },
    });

    // Find all ONGOING issues from:
    // 1. Previous day's shift reports (any status)
    // 2. Today's shift reports from OTHER technicians
    // Exclude issues from current user's report
    const pendingIssues = await prisma.shiftIssue.findMany({
      where: {
        status: 'ONGOING',
        shiftReportId: currentUserReport ? { not: currentUserReport.id } : undefined,
        shiftReport: {
          shiftAssignment: {
            OR: [
              // Yesterday's shifts
              {
                date: {
                  gte: yesterday,
                  lt: today,
                },
              },
              // Today's shifts from other technicians
              {
                date: {
                  gte: today,
                },
                staffProfile: {
                  userId: { not: userId },
                },
              },
            ],
          },
        },
      },
      include: {
        shiftReport: {
          include: {
            shiftAssignment: {
              include: {
                staffProfile: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Transform the data
    const issues = pendingIssues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      ticketNumber: issue.ticketNumber,
      ticketId: issue.ticketId,
      ticket: issue.ticket,
      createdAt: issue.createdAt,
      reportedBy: {
        id: issue.shiftReport.shiftAssignment.staffProfile.user.id,
        name: issue.shiftReport.shiftAssignment.staffProfile.user.name,
      },
      shiftDate: issue.shiftReport.shiftAssignment.date,
      shiftType: issue.shiftReport.shiftAssignment.shiftType,
    }));

    return NextResponse.json({
      success: true,
      data: {
        issues,
        count: issues.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching pending issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending issues' },
      { status: 500 }
    );
  }
}
