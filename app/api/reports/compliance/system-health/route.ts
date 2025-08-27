import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/compliance/system-health - Get system health and data quality metrics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can access this report
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    // Get system performance related tickets
    const systemKeywords = ['system', 'performance', 'slow', 'timeout', 'database', 'server', 'memory', 'cpu', 'disk', 'network'];
    
    const systemTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        OR: [
          ...systemKeywords.map(keyword => ({
            title: {
              contains: keyword,
              mode: 'insensitive' as const
            }
          })),
          ...systemKeywords.map(keyword => ({
            description: {
              contains: keyword,
              mode: 'insensitive' as const
            }
          })),
          {
            service: {
              tier1Category: {
                name: {
                  in: ['IT Infrastructure', 'System Administration', 'Database Management']
                }
              }
            }
          }
        ]
      },
      include: {
        service: {
          select: {
            name: true,
            tier1Category: {
              select: { name: true }
            }
          }
        },
        branch: {
          select: {
            name: true,
            city: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Data quality analysis
    const dataQualityMetrics = {
      // Check for tickets with missing required fields
      ticketsWithoutDescription: await prisma.ticket.count({
        where: {
          description: ''
        }
      }),
      
      // Check for tickets without assigned technicians
      unassignedTickets: await prisma.ticket.count({
        where: {
          assignedToId: null,
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        }
      }),
      
      // Check for tickets without proper categorization
      uncategorizedTickets: await prisma.ticket.count({
        where: {
          categoryId: null
        }
      }),
      
      // Check for users without proper branch assignment
      usersWithoutBranch: await prisma.user.count({
        where: {
          branchId: null
        }
      })
    };

    // System reliability metrics
    const reliabilityMetrics = {
      totalSystemIssues: systemTickets.length,
      criticalSystemIssues: systemTickets.filter(t => ['HIGH', 'CRITICAL'].includes(t.priority)).length,
      resolvedSystemIssues: systemTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
      openSystemIssues: systemTickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length
    };

    // Calculate system uptime indicators
    const systemUptimeIndicators = {
      incidentFrequency: systemTickets.length,
      avgResolutionTime: 0,
      mttr: 0, // Mean Time To Resolution
      systemAvailability: 0
    };

    // Calculate resolution times for system issues
    const systemResolutionTimes = systemTickets
      .filter(t => t.resolvedAt)
      .map(t => {
        const created = new Date(t.createdAt).getTime();
        const resolved = new Date(t.resolvedAt!).getTime();
        return (resolved - created) / (1000 * 60 * 60); // hours
      });

    if (systemResolutionTimes.length > 0) {
      systemUptimeIndicators.avgResolutionTime = systemResolutionTimes.reduce((a, b) => a + b, 0) / systemResolutionTimes.length;
      systemUptimeIndicators.mttr = systemUptimeIndicators.avgResolutionTime;
    }

    // Estimate system availability (simplified calculation)
    const totalHours = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60);
    const downtime = systemResolutionTimes.reduce((sum, time) => sum + time, 0);
    systemUptimeIndicators.systemAvailability = totalHours > 0 ? Math.max(0, ((totalHours - downtime) / totalHours) * 100) : 100;

    // Database health indicators
    const databaseHealth = {
      totalRecords: {
        tickets: await prisma.ticket.count(),
        users: await prisma.user.count(),
        services: await prisma.service.count(),
        branches: await prisma.branch.count()
      },
      dataIntegrity: {
        orphanedTickets: await prisma.ticket.count({
          where: {
            createdById: {
              not: {
                in: (await prisma.user.findMany({ select: { id: true } })).map(u => u.id)
              }
            }
          }
        }),
        invalidServiceReferences: await prisma.ticket.count({
          where: {
            serviceId: {
              not: {
                in: (await prisma.service.findMany({ select: { id: true } })).map(s => s.id)
              }
            }
          }
        })
      }
    };

    // Performance trends analysis
    const performanceTrends = systemTickets.reduce((acc, ticket) => {
      const date = new Date(ticket.createdAt).toISOString().split('T')[0];
      const keyword = systemKeywords.find(k => 
        ticket.title.toLowerCase().includes(k) || 
        ticket.description?.toLowerCase().includes(k)
      ) || 'general';
      
      if (!acc[date]) {
        acc[date] = {};
      }
      acc[date][keyword] = (acc[date][keyword] || 0) + 1;
      acc[date].total = (acc[date].total || 0) + 1;
      
      return acc;
    }, {} as Record<string, any>);

    // System component analysis
    const componentAnalysis = systemTickets.reduce((acc, ticket) => {
      const title = ticket.title.toLowerCase();
      const description = ticket.description?.toLowerCase() || '';
      
      const components = {
        database: ['database', 'db', 'sql', 'query'],
        server: ['server', 'host', 'machine'],
        network: ['network', 'connection', 'internet', 'wifi'],
        application: ['application', 'app', 'software', 'program'],
        hardware: ['hardware', 'disk', 'memory', 'cpu', 'ram']
      };
      
      Object.entries(components).forEach(([component, keywords]) => {
        if (keywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
          acc[component] = (acc[component] || 0) + 1;
        }
      });
      
      return acc;
    }, {} as Record<string, number>);

    // Regional system health
    const regionalSystemHealth = systemTickets.reduce((acc, ticket) => {
      const region = ticket.branch?.city || 'Unknown';
      if (!acc[region]) {
        acc[region] = {
          issues: 0,
          critical: 0,
          resolved: 0,
          avgResolutionTime: 0,
          resolutionTimes: []
        };
      }
      
      acc[region].issues++;
      if (['HIGH', 'CRITICAL'].includes(ticket.priority)) {
        acc[region].critical++;
      }
      if (['RESOLVED', 'CLOSED'].includes(ticket.status) && ticket.resolvedAt) {
        acc[region].resolved++;
        const resTime = (new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
        acc[region].resolutionTimes.push(resTime);
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate regional averages
    Object.keys(regionalSystemHealth).forEach(region => {
      const data = regionalSystemHealth[region];
      data.resolutionRate = data.issues > 0 ? (data.resolved / data.issues) * 100 : 0;
      data.avgResolutionTime = data.resolutionTimes.length > 0
        ? data.resolutionTimes.reduce((a: number, b: number) => a + b, 0) / data.resolutionTimes.length
        : 0;
      delete data.resolutionTimes;
    });

    // Calculate overall health score
    const healthScore = {
      dataQuality: Math.max(0, 100 - (
        (dataQualityMetrics.ticketsWithoutDescription + 
         dataQualityMetrics.unassignedTickets + 
         dataQualityMetrics.uncategorizedTickets) / 10
      )),
      systemReliability: Math.min(100, Math.max(0, 100 - (reliabilityMetrics.criticalSystemIssues * 5))),
      performance: Math.round(systemUptimeIndicators.systemAvailability),
      dataIntegrity: Math.max(0, 100 - (
        (databaseHealth.dataIntegrity.orphanedTickets + 
         databaseHealth.dataIntegrity.invalidServiceReferences) * 2
      ))
    };

    const overallHealthScore = Math.round(
      (healthScore.dataQuality + 
       healthScore.systemReliability + 
       healthScore.performance + 
       healthScore.dataIntegrity) / 4
    );

    const response = {
      summary: {
        overallHealthScore,
        systemAvailability: Math.round(systemUptimeIndicators.systemAvailability),
        totalSystemIssues: reliabilityMetrics.totalSystemIssues,
        criticalIssues: reliabilityMetrics.criticalSystemIssues,
        avgResolutionHours: Math.round(systemUptimeIndicators.avgResolutionTime),
        dataQualityScore: Math.round(healthScore.dataQuality)
      },
      systemHealth: {
        reliability: reliabilityMetrics,
        uptime: systemUptimeIndicators,
        componentHealth: componentAnalysis,
        regionalHealth: regionalSystemHealth
      },
      dataQuality: {
        metrics: dataQualityMetrics,
        integrity: databaseHealth.dataIntegrity,
        recordCounts: databaseHealth.totalRecords,
        qualityScore: Math.round(healthScore.dataQuality)
      },
      performance: {
        trends: performanceTrends,
        resolutionTimes: systemResolutionTimes.slice(-20), // Last 20 resolution times
        healthScores: healthScore
      },
      insights: {
        topSystemIssues: Object.entries(componentAnalysis)
          .sort(([_, a], [__, b]) => b - a)
          .slice(0, 5)
          .map(([component, count]) => ({ component, count })),
        mostAffectedRegions: Object.entries(regionalSystemHealth)
          .sort(([_, a], [__, b]) => (b as any).issues - (a as any).issues)
          .slice(0, 5)
          .map(([region, data]) => ({ region, ...(data as any) }))
      },
      recentIssues: systemTickets.slice(0, 10).map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status,
        branch: ticket.branch?.name,
        region: ticket.branch?.city,
        createdAt: ticket.createdAt,
        resolvedAt: ticket.resolvedAt,
        category: ticket.service?.tier1Category?.name
      })),
      recommendations: [
        overallHealthScore < 80 ? 'Implement comprehensive system health monitoring' : null,
        reliabilityMetrics.criticalSystemIssues > 5 ? 'Address critical system issues immediately' : null,
        dataQualityMetrics.unassignedTickets > 10 ? 'Improve ticket assignment processes' : null,
        systemUptimeIndicators.systemAvailability < 95 ? 'Enhance system reliability and redundancy' : null,
        dataQualityMetrics.ticketsWithoutDescription > 20 ? 'Enforce data quality standards for ticket creation' : null
      ].filter(Boolean)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching system health report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system health report' },
      { status: 500 }
    );
  }
}