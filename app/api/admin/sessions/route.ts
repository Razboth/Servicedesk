import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { endSession, forceEndAllSessions } from '@/lib/audit/session-tracker';
import { createAuditLog } from '@/lib/audit-logger';

// GET: List sessions (active or all)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const [sessions, total] = await Promise.all([
      prisma.userAuditSession.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              branch: {
                select: {
                  name: true,
                  code: true
                }
              }
            }
          }
        },
        orderBy: { loginAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.userAuditSession.count({ where })
    ]);

    // Get session statistics
    const stats = await prisma.userAuditSession.groupBy({
      by: ['isActive'],
      _count: {
        isActive: true
      }
    });

    const activeCount = stats.find(s => s.isActive)?._count.isActive || 0;
    const inactiveCount = stats.find(s => !s.isActive)?._count.isActive || 0;

    // Get new device login count (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newDeviceCount = await prisma.userAuditSession.count({
      where: {
        isNewDevice: true,
        loginAt: { gte: oneDayAgo }
      }
    });

    // Format sessions for response
    const formattedSessions = sessions.map(s => {
      const deviceInfo = s.deviceInfo as any;
      const duration = s.logoutAt
        ? Math.round((s.logoutAt.getTime() - s.loginAt.getTime()) / 60000)
        : Math.round((Date.now() - s.loginAt.getTime()) / 60000);

      return {
        id: s.id,
        user: s.user,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        deviceInfo: {
          browser: deviceInfo?.browser || 'Unknown',
          os: deviceInfo?.os || 'Unknown',
          deviceType: deviceInfo?.deviceType || 'unknown'
        },
        location: s.location,
        loginAt: s.loginAt,
        logoutAt: s.logoutAt,
        isActive: s.isActive,
        isNewDevice: s.isNewDevice,
        logoutReason: s.logoutReason,
        duration // in minutes
      };
    });

    return NextResponse.json({
      sessions: formattedSessions,
      stats: {
        total,
        active: activeCount,
        inactive: inactiveCount,
        newDeviceLogins24h: newDeviceCount
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// DELETE: Force end session(s)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const endAll = searchParams.get('endAll') === 'true';

    if (!sessionId && !userId && !endAll) {
      return NextResponse.json(
        { error: 'Either sessionId, userId, or endAll must be provided' },
        { status: 400 }
      );
    }

    let endedCount = 0;

    if (sessionId) {
      // End specific session
      const result = await endSession(sessionId, 'forced');
      if (result) {
        endedCount = 1;

        await createAuditLog({
          userId: session.user.id,
          action: 'LOGOUT_FORCED',
          entity: 'SESSION',
          entityId: sessionId,
          newValues: {
            forcedBy: session.user.name,
            targetSessionId: sessionId
          },
          request
        });
      }
    } else if (userId) {
      // End all sessions for a specific user
      endedCount = await forceEndAllSessions(userId);

      await createAuditLog({
        userId: session.user.id,
        action: 'LOGOUT_FORCED',
        entity: 'SESSION',
        newValues: {
          forcedBy: session.user.name,
          targetUserId: userId,
          sessionsEnded: endedCount
        },
        request
      });
    }

    return NextResponse.json({
      success: true,
      message: `${endedCount} session(s) ended`,
      endedCount
    });

  } catch (error) {
    console.error('Failed to end session(s):', error);
    return NextResponse.json(
      { error: 'Failed to end session(s)' },
      { status: 500 }
    );
  }
}
