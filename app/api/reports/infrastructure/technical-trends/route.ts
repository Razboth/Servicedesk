import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/infrastructure/technical-trends - Get technical problem trends and patterns
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow TECHNICIAN, MANAGER, and ADMIN roles
    if (!['TECHNICIAN', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const category = searchParams.get('category');

    // Get technical tickets (hardware, software, network issues)
    const technicalKeywords = ['hardware', 'software', 'network', 'system', 'server', 'database', 'connection', 'error', 'failure', 'crash', 'bug'];
    
    const technicalTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        ...(category && {
          service: {
            tier1Category: {
              name: {
                contains: category,
                mode: 'insensitive'
              }
            }
          }
        }),
        OR: [
          {
            title: {
              in: technicalKeywords.map(keyword => ({ contains: keyword, mode: 'insensitive' as const }))
            }
          },
          {
            description: {
              in: technicalKeywords.map(keyword => ({ contains: keyword, mode: 'insensitive' as const }))
            }
          },
          {
            service: {
              tier1Category: {
                name: {
                  in: ['IT Infrastructure', 'Hardware Support', 'Software Support', 'Network Services']
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
            },
            tier2Category: {
              select: { name: true }
            }
          }
        },
        branch: {
          select: {
            name: true,
            region: true
          }
        },
        assignedTo: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Analyze error patterns
    const errorPatterns = technicalTickets.reduce((acc, ticket) => {
      const title = ticket.title.toLowerCase();
      const description = ticket.description?.toLowerCase() || '';
      
      technicalKeywords.forEach(keyword => {
        if (title.includes(keyword) || description.includes(keyword)) {
          acc[keyword] = (acc[keyword] || 0) + 1;
        }
      });
      
      return acc;
    }, {} as Record<string, number>);

    // Group by technical category
    const issuesByCategory = technicalTickets.reduce((acc, ticket) => {
      const category = ticket.service?.tier1Category?.name || 'General Technical';
      const subCategory = ticket.service?.tier2Category?.name || 'Other';
      
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          subCategories: {}
        };
      }
      
      acc[category].total++;
      acc[category].subCategories[subCategory] = (acc[category].subCategories[subCategory] || 0) + 1;
      
      return acc;
    }, {} as Record<string, any>);

    // Severity analysis
    const severityTrends = {
      LOW: technicalTickets.filter(t => t.priority === 'LOW').length,
      MEDIUM: technicalTickets.filter(t => t.priority === 'MEDIUM').length,
      HIGH: technicalTickets.filter(t => t.priority === 'HIGH').length,
      URGENT: technicalTickets.filter(t => t.priority === 'URGENT').length
    };

    // Resolution analysis
    const resolvedTickets = technicalTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status) && t.resolvedAt);
    const resolutionTimes = resolvedTickets.map(ticket => {
      const created = new Date(ticket.createdAt).getTime();
      const resolved = new Date(ticket.resolvedAt!).getTime();
      return {
        hours: (resolved - created) / (1000 * 60 * 60),
        category: ticket.service?.tier1Category?.name || 'General',
        priority: ticket.priority
      };
    });

    // Average resolution time by category
    const avgResolutionByCategory = resolutionTimes.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = { total: 0, count: 0 };
      }
      acc[item.category].total += item.hours;
      acc[item.category].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    Object.keys(avgResolutionByCategory).forEach(category => {
      const data = avgResolutionByCategory[category];
      avgResolutionByCategory[category] = {
        avgHours: Math.round(data.total / data.count),
        count: data.count,
        total: data.total
      };
    });

    // Daily trend analysis
    const dailyTrends = technicalTickets.reduce((acc, ticket) => {
      const date = new Date(ticket.createdAt).toISOString().split('T')[0];
      const category = ticket.service?.tier1Category?.name || 'General';
      
      if (!acc[date]) {
        acc[date] = {};
      }
      acc[date][category] = (acc[date][category] || 0) + 1;
      acc[date].total = (acc[date].total || 0) + 1;
      
      return acc;
    }, {} as Record<string, any>);

    // Regional impact analysis
    const regionalImpact = technicalTickets.reduce((acc, ticket) => {
      const region = ticket.branch?.region || 'Unknown';
      if (!acc[region]) {
        acc[region] = {
          total: 0,
          critical: 0,
          categories: {}
        };
      }
      
      acc[region].total++;
      if (['HIGH', 'URGENT'].includes(ticket.priority)) {
        acc[region].critical++;
      }
      
      const category = ticket.service?.tier1Category?.name || 'General';
      acc[region].categories[category] = (acc[region].categories[category] || 0) + 1;
      
      return acc;
    }, {} as Record<string, any>);

    // Recurring issues analysis
    const recurringIssues = technicalTickets.reduce((acc, ticket) => {
      const key = ticket.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      if (key.length > 10) { // Only consider meaningful titles
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Filter recurring issues (appearing more than once)
    const significantRecurringIssues = Object.entries(recurringIssues)
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10);

    const response = {
      summary: {
        totalTechnicalIssues: technicalTickets.length,
        openIssues: technicalTickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length,
        criticalIssues: technicalTickets.filter(t => ['HIGH', 'URGENT'].includes(t.priority)).length,
        avgResolutionHours: resolutionTimes.length > 0 
          ? Math.round(resolutionTimes.reduce((sum, item) => sum + item.hours, 0) / resolutionTimes.length)
          : 0,
        resolutionRate: technicalTickets.length > 0 
          ? Math.round((resolvedTickets.length / technicalTickets.length) * 100)
          : 0
      },
      patterns: {
        errorKeywords: Object.entries(errorPatterns)
          .sort(([_, a], [__, b]) => b - a)
          .slice(0, 10),
        recurringIssues: significantRecurringIssues
      },
      distributions: {
        byCategory: issuesByCategory,
        bySeverity: severityTrends,
        byRegion: regionalImpact
      },
      trends: {
        daily: dailyTrends,
        resolutionTimes: avgResolutionByCategory
      },
      recentIssues: technicalTickets.slice(0, 15).map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        category: ticket.service?.tier1Category?.name,
        subCategory: ticket.service?.tier2Category?.name,
        priority: ticket.priority,
        status: ticket.status,
        branch: ticket.branch?.name,
        region: ticket.branch?.region,
        assignedTo: ticket.assignedTo?.name,
        createdAt: ticket.createdAt,
        resolvedAt: ticket.resolvedAt
      })),
      insights: {
        topErrorTypes: Object.entries(errorPatterns)
          .sort(([_, a], [__, b]) => b - a)
          .slice(0, 5)
          .map(([keyword, count]) => ({ keyword, count })),
        mostAffectedRegions: Object.entries(regionalImpact)
          .sort(([_, a], [__, b]) => b.total - a.total)
          .slice(0, 5)
          .map(([region, data]) => ({ region, ...data }))
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching technical trends report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technical trends report' },
      { status: 500 }
    );
  }
}