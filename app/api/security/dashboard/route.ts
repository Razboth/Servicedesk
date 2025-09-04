import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 401 }
      );
    }

    // Get date range parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Parallel queries for dashboard data
    const [
      // Login attempts and account lockouts
      totalLoginAttempts,
      failedLoginAttempts,
      accountLockouts,
      
      // Security events from audit logs
      securityEvents,
      
      // API access logs
      apiAccessLogs,
      
      // User account statistics
      userStats,
      
      // Recent failed login attempts
      recentFailedLogins,
      
      // Top IPs with failed attempts
      ipFailureCounts,
      
      // Session activity
      activeUsers
    ] = await Promise.all([
      // Total login attempts in period
      prisma.loginAttempt.count({
        where: {
          attemptedAt: { gte: startDate }
        }
      }),
      
      // Failed login attempts
      prisma.loginAttempt.count({
        where: {
          success: false,
          attemptedAt: { gte: startDate }
        }
      }),
      
      // Account lockouts triggered
      prisma.loginAttempt.count({
        where: {
          lockTriggered: true,
          attemptedAt: { gte: startDate }
        }
      }),
      
      // Security-related audit events
      prisma.auditLog.count({
        where: {
          OR: [
            { action: 'UNLOCK_USER' },
            { action: 'CREATE_USER' },
            { action: 'UPDATE_USER' },
            { action: 'DOWNLOAD_FILE' },
            { action: 'CREATE_ATM_INCIDENT' },
            { action: 'CREATE_ATM_INCIDENT_EXTERNAL' }
          ],
          createdAt: { gte: startDate }
        }
      }),
      
      // API access logs with IP addresses
      prisma.auditLog.findMany({
        where: {
          OR: [
            { action: 'CREATE_ATM_INCIDENT' },
            { action: 'CREATE_ATM_INCIDENT_EXTERNAL' },
            { action: 'API_ACCESS' }
          ],
          createdAt: { gte: startDate }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20,
        select: {
          id: true,
          action: true,
          entityId: true,
          createdAt: true,
          newValues: true,
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      }),
      
      // User account statistics
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true
        },
        where: {
          isActive: true
        }
      }),
      
      // Recent failed login attempts with details
      prisma.loginAttempt.findMany({
        where: {
          success: false,
          attemptedAt: { gte: startDate }
        },
        orderBy: {
          attemptedAt: 'desc'
        },
        take: 10,
        select: {
          email: true,
          ipAddress: true,
          userAgent: true,
          attemptedAt: true,
          lockTriggered: true
        }
      }),
      
      // Group failed attempts by IP address
      prisma.loginAttempt.groupBy({
        by: ['ipAddress'],
        _count: {
          id: true
        },
        where: {
          success: false,
          attemptedAt: { gte: startDate }
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      }),
      
      // Active users (logged in within last hour)
      prisma.user.count({
        where: {
          lastActivity: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          },
          isActive: true
        }
      })
    ]);

    // Calculate security metrics
    const failureRate = totalLoginAttempts > 0 
      ? ((failedLoginAttempts / totalLoginAttempts) * 100).toFixed(1)
      : '0';

    // Get locked accounts
    const lockedAccounts = await prisma.user.count({
      where: {
        AND: [
          { lockedAt: { not: null } },
          { lockedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } }
        ]
      }
    });

    // Get daily login attempt trends
    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_attempts,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_attempts,
        SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_attempts
      FROM "LoginAttempt"
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `;

    // Extract IP addresses from API access logs
    const apiAccessDetails = apiAccessLogs.map(log => ({
      id: log.id,
      action: log.action,
      timestamp: log.createdAt,
      user: log.user?.email || 'External API',
      ipAddress: (log.newValues as any)?.sourceIp || (log.newValues as any)?.ipAddress || 'Unknown',
      userAgent: (log.newValues as any)?.userAgent || 'Unknown',
      details: {
        atmCode: (log.newValues as any)?.atmCode,
        type: (log.newValues as any)?.type,
        severity: (log.newValues as any)?.severity,
        externalRef: (log.newValues as any)?.externalReferenceId
      }
    }));

    // Prepare dashboard response
    const dashboardData = {
      summary: {
        totalLoginAttempts,
        failedLoginAttempts,
        failureRate: parseFloat(failureRate),
        accountLockouts,
        lockedAccounts,
        securityEvents,
        activeUsers,
        apiAccessCount: apiAccessLogs.length
      },
      userStats: userStats.reduce((acc, stat) => {
        acc[stat.role] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
      recentFailedLogins: recentFailedLogins.map(attempt => ({
        ...attempt,
        userAgent: attempt.userAgent ? 
          attempt.userAgent.substring(0, 100) + '...' : 'Unknown'
      })),
      ipFailureCounts: ipFailureCounts.map(ip => ({
        ipAddress: ip.ipAddress || 'Unknown',
        failureCount: ip._count.id
      })),
      dailyTrends: dailyStats,
      apiAccessLogs: apiAccessDetails,
      alertLevel: calculateAlertLevel({
        failureRate: parseFloat(failureRate),
        accountLockouts,
        lockedAccounts
      })
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Security dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security dashboard data' },
      { status: 500 }
    );
  }
}

// Helper function to calculate alert level
function calculateAlertLevel(metrics: {
  failureRate: number;
  accountLockouts: number;
  lockedAccounts: number;
}) {
  if (metrics.failureRate > 50 || metrics.accountLockouts > 10 || metrics.lockedAccounts > 5) {
    return 'HIGH';
  } else if (metrics.failureRate > 25 || metrics.accountLockouts > 3 || metrics.lockedAccounts > 0) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

// Get security recommendations
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'unlock_all_accounts':
        // Unlock all currently locked accounts
        const unlockResult = await prisma.user.updateMany({
          where: {
            lockedAt: { not: null }
          },
          data: {
            lockedAt: null,
            loginAttempts: 0
          }
        });

        // Log the action
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'BULK_UNLOCK_ACCOUNTS',
            entity: 'User',
            entityId: 'bulk',
            newValues: {
              description: `Unlocked ${unlockResult.count} user accounts`,
              count: unlockResult.count
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        });

        return NextResponse.json({
          success: true,
          message: `Successfully unlocked ${unlockResult.count} accounts`
        });

      case 'clear_old_login_attempts':
        // Clear login attempts older than 7 days
        const clearDate = new Date();
        clearDate.setDate(clearDate.getDate() - 7);

        const deleteResult = await prisma.loginAttempt.deleteMany({
          where: {
            attemptedAt: { lt: clearDate }
          }
        });

        return NextResponse.json({
          success: true,
          message: `Cleared ${deleteResult.count} old login attempt records`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Security action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform security action' },
      { status: 500 }
    );
  }
}