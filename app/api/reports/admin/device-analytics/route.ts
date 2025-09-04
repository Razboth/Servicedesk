import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDeviceCategory, isBot } from '@/lib/utils/device-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // Only ADMIN and SUPER_ADMIN can view device analytics
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Get date range parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch audit logs with device information
    const [
      // All audit logs with user agents
      allLogs,
      
      // Failed ticket creation attempts
      failedTicketCreations,
      
      // Unsupported browser attempts
      unsupportedBrowsers,
      
      // Login attempts
      loginAttempts
    ] = await Promise.all([
      // Get all audit logs with user agents for analysis
      prisma.auditLog.findMany({
        where: {
          createdAt: { gte: startDate },
          userAgent: { not: null }
        },
        select: {
          id: true,
          action: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
          newValues: true,
          user: {
            select: {
              email: true,
              name: true,
              branch: {
                select: { name: true, code: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 1000 // Limit to last 1000 entries for performance
      }),
      
      // Failed ticket creations
      prisma.auditLog.count({
        where: {
          action: 'CREATE_TICKET_FAILED',
          createdAt: { gte: startDate }
        }
      }),
      
      // Unsupported browser attempts
      prisma.auditLog.findMany({
        where: {
          action: 'UNSUPPORTED_BROWSER_TICKET_ATTEMPT',
          createdAt: { gte: startDate }
        },
        select: {
          id: true,
          createdAt: true,
          newValues: true,
          user: {
            select: {
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      
      // Login attempts for browser analysis
      prisma.loginAttempt.findMany({
        where: {
          attemptedAt: { gte: startDate }
        },
        select: {
          id: true,
          email: true,
          success: true,
          userAgent: true,
          ipAddress: true,
          attemptedAt: true
        },
        take: 500
      })
    ]);

    // Analyze device information from audit logs
    const deviceStats = {
      browsers: {} as Record<string, number>,
      operatingSystems: {} as Record<string, number>,
      deviceTypes: {} as Record<string, number>,
      browserVersions: {} as Record<string, { count: number; versions: Set<string> }>,
      unsupportedDevices: [] as any[],
      botAttempts: 0,
      uniqueUsers: new Set<string>()
    };

    // Process all logs for device analysis
    allLogs.forEach(log => {
      if (!log.userAgent || isBot(log.userAgent)) {
        deviceStats.botAttempts++;
        return;
      }

      // Extract device info from newValues if available
      const deviceInfo = (log.newValues as any)?.device;
      if (deviceInfo) {
        // Browser analysis
        const browser = deviceInfo.browser?.split(' ')[0] || 'Unknown';
        deviceStats.browsers[browser] = (deviceStats.browsers[browser] || 0) + 1;
        
        // OS analysis
        const os = deviceInfo.os?.split(' ')[0] || 'Unknown';
        deviceStats.operatingSystems[os] = (deviceStats.operatingSystems[os] || 0) + 1;
        
        // Device type analysis
        const deviceType = deviceInfo.deviceType || 'desktop';
        deviceStats.deviceTypes[deviceType] = (deviceStats.deviceTypes[deviceType] || 0) + 1;
        
        // Track unsupported browsers
        if (deviceInfo.isSupported === false) {
          deviceStats.unsupportedDevices.push({
            user: log.user?.email,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            warnings: deviceInfo.warnings,
            timestamp: log.createdAt
          });
        }
      }

      // Track unique users
      if (log.user?.email) {
        deviceStats.uniqueUsers.add(log.user.email);
      }
    });

    // Analyze login attempts for browser patterns
    const loginDeviceStats = {
      successByBrowser: {} as Record<string, { success: number; failed: number }>,
      failurePatterns: [] as any[]
    };

    loginAttempts.forEach(attempt => {
      if (!attempt.userAgent || isBot(attempt.userAgent)) return;
      
      // Simple browser extraction from user agent
      let browser = 'Unknown';
      if (attempt.userAgent.includes('Chrome')) browser = 'Chrome';
      else if (attempt.userAgent.includes('Firefox')) browser = 'Firefox';
      else if (attempt.userAgent.includes('Safari') && !attempt.userAgent.includes('Chrome')) browser = 'Safari';
      else if (attempt.userAgent.includes('Edge')) browser = 'Edge';
      
      if (!loginDeviceStats.successByBrowser[browser]) {
        loginDeviceStats.successByBrowser[browser] = { success: 0, failed: 0 };
      }
      
      if (attempt.success) {
        loginDeviceStats.successByBrowser[browser].success++;
      } else {
        loginDeviceStats.successByBrowser[browser].failed++;
        
        // Track failure patterns
        if (loginDeviceStats.failurePatterns.length < 10) {
          loginDeviceStats.failurePatterns.push({
            email: attempt.email,
            browser,
            ipAddress: attempt.ipAddress,
            timestamp: attempt.attemptedAt
          });
        }
      }
    });

    // Calculate compatibility issues
    const compatibilityIssues = {
      unsupportedBrowserCount: unsupportedBrowsers.length,
      failedTicketCreations: failedTicketCreations,
      mostProblematicBrowsers: Object.entries(loginDeviceStats.successByBrowser)
        .filter(([_, stats]) => stats.failed > 0)
        .sort((a, b) => {
          const aFailRate = a[1].failed / (a[1].success + a[1].failed);
          const bFailRate = b[1].failed / (b[1].success + b[1].failed);
          return bFailRate - aFailRate;
        })
        .slice(0, 5)
        .map(([browser, stats]) => ({
          browser,
          failureRate: ((stats.failed / (stats.success + stats.failed)) * 100).toFixed(1),
          totalAttempts: stats.success + stats.failed
        }))
    };

    // Recent issues for quick troubleshooting
    const recentIssues = unsupportedBrowsers.slice(0, 10).map(log => ({
      user: log.user?.email,
      timestamp: log.createdAt,
      device: (log.newValues as any)?.device,
      warnings: (log.newValues as any)?.warnings
    }));

    // Prepare response
    const response = {
      summary: {
        totalUsers: deviceStats.uniqueUsers.size,
        totalEvents: allLogs.length,
        botAttempts: deviceStats.botAttempts,
        dateRange: {
          from: startDate,
          to: new Date(),
          days
        }
      },
      browsers: Object.entries(deviceStats.browsers)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count, percentage: ((count / allLogs.length) * 100).toFixed(1) })),
      operatingSystems: Object.entries(deviceStats.operatingSystems)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count, percentage: ((count / allLogs.length) * 100).toFixed(1) })),
      deviceTypes: Object.entries(deviceStats.deviceTypes)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count, percentage: ((count / allLogs.length) * 100).toFixed(1) })),
      compatibilityIssues,
      recentIssues,
      loginAnalysis: {
        browserSuccess: Object.entries(loginDeviceStats.successByBrowser).map(([browser, stats]) => ({
          browser,
          successRate: ((stats.success / (stats.success + stats.failed)) * 100).toFixed(1),
          totalAttempts: stats.success + stats.failed,
          failures: stats.failed
        })),
        recentFailures: loginDeviceStats.failurePatterns
      },
      recommendations: generateRecommendations({
        unsupportedCount: unsupportedBrowsers.length,
        failedCreations: failedTicketCreations,
        browsers: deviceStats.browsers,
        deviceTypes: deviceStats.deviceTypes
      })
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Device analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device analytics' },
      { status: 500 }
    );
  }
}

// Generate recommendations based on analytics
function generateRecommendations(data: {
  unsupportedCount: number;
  failedCreations: number;
  browsers: Record<string, number>;
  deviceTypes: Record<string, number>;
}): string[] {
  const recommendations = [];

  // Check for high unsupported browser rate
  if (data.unsupportedCount > 10) {
    recommendations.push('High number of unsupported browser attempts detected. Consider displaying browser compatibility warnings.');
  }

  // Check for failed ticket creations
  if (data.failedCreations > 5) {
    recommendations.push(`${data.failedCreations} failed ticket creation attempts. Review error logs for common patterns.`);
  }

  // Check for IE usage
  if (data.browsers['IE'] || data.browsers['Internet Explorer']) {
    recommendations.push('Internet Explorer usage detected. Users should be prompted to upgrade to a modern browser.');
  }

  // Mobile optimization
  const mobileCount = (data.deviceTypes['mobile'] || 0) + (data.deviceTypes['tablet'] || 0);
  const totalCount = Object.values(data.deviceTypes).reduce((a, b) => a + b, 0);
  if (totalCount > 0 && (mobileCount / totalCount) > 0.3) {
    recommendations.push('Significant mobile usage detected. Ensure the application is mobile-optimized.');
  }

  // Browser diversity
  const browserCount = Object.keys(data.browsers).length;
  if (browserCount > 10) {
    recommendations.push('High browser diversity detected. Consider implementing progressive enhancement strategies.');
  }

  if (recommendations.length === 0) {
    recommendations.push('No critical compatibility issues detected.');
  }

  return recommendations;
}