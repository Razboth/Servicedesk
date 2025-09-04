import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/technician/technical-issues - Get technical issue intelligence for technician
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only technicians can access this report
    if (session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    const userId = session.user.id;

    // Get technical issue classifications breakdown
    const issueClassifications = await prisma.ticket.groupBy({
      by: ['issueClassification'],
      where: {
        assignedToId: userId,
        issueClassification: {
          in: ['SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE', 'SECURITY_INCIDENT']
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      _count: {
        id: true
      }
    });

    const technicalIssuesBreakdown = issueClassifications.map(group => ({
      label: group.issueClassification?.replace('_', ' ') || 'Unknown',
      value: group._count.id
    }));

    // Get error patterns by root cause
    const rootCauseAnalysis = await prisma.ticket.findMany({
      where: {
        assignedToId: userId,
        issueClassification: {
          in: ['SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE']
        },
        rootCause: {
          not: null
        },
        status: {
          in: ['RESOLVED', 'CLOSED']
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        rootCause: true,
        issueClassification: true,
        service: {
          select: {
            name: true,
            category: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Analyze common root causes
    const rootCauseStats = rootCauseAnalysis.reduce((acc, ticket) => {
      const cause = ticket.rootCause || 'Unknown';
      if (!acc[cause]) {
        acc[cause] = {
          count: 0,
          classification: ticket.issueClassification,
          categories: new Set<string>()
        };
      }
      acc[cause].count++;
      acc[cause].categories.add(ticket.category?.name || 'Other');
      return acc;
    }, {} as Record<string, { count: number; classification: string | null; categories: Set<string> }>);

    const commonRootCauses = Object.entries(rootCauseStats)
      .map(([cause, data]) => ({
        rootCause: cause,
        count: data.count,
        classification: data.classification,
        affectedCategories: Array.from(data.categories)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get resolution patterns and effective solutions
    const resolutionPatterns = await prisma.ticket.findMany({
      where: {
        assignedToId: userId,
        issueClassification: {
          in: ['SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE']
        },
        resolutionNotes: {
          not: null
        },
        status: {
          in: ['RESOLVED', 'CLOSED']
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        issueClassification: true,
        rootCause: true,
        resolutionNotes: true,
        actualHours: true,
        service: {
          select: {
            name: true
          }
        }
      }
    });

    // Analyze resolution effectiveness (tickets resolved quickly vs slowly)
    const quickResolutions = resolutionPatterns.filter(t => (t.actualHours || 0) <= 2);
    const slowResolutions = resolutionPatterns.filter(t => (t.actualHours || 0) > 4);

    const resolutionEffectiveness = {
      quick: quickResolutions.length,
      normal: resolutionPatterns.length - quickResolutions.length - slowResolutions.length,
      slow: slowResolutions.length,
      avgResolutionTime: resolutionPatterns.length > 0 ? 
        resolutionPatterns.reduce((sum, t) => sum + (t.actualHours || 0), 0) / resolutionPatterns.length : 0
    };

    // Get recurring issues (similar tickets)
    const recurringIssues = await prisma.ticket.findMany({
      where: {
        assignedToId: userId,
        issueClassification: {
          in: ['SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE']
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        title: true,
        description: true,
        issueClassification: true,
        service: {
          select: {
            name: true,
            category: {
              select: { name: true }
            }
          }
        },
        status: true,
        createdAt: true
      }
    });

    // Simple pattern matching for recurring issues
    const issuePatterns = recurringIssues.reduce((acc, ticket) => {
      const key = `${ticket.service.name}-${ticket.issueClassification}`;
      if (!acc[key]) {
        acc[key] = {
          service: ticket.service.name,
          category: ticket.category?.name || 'Other',
          classification: ticket.issueClassification,
          count: 0,
          lastOccurrence: ticket.createdAt
        };
      }
      acc[key].count++;
      if (ticket.createdAt > acc[key].lastOccurrence) {
        acc[key].lastOccurrence = ticket.createdAt;
      }
      return acc;
    }, {} as Record<string, any>);

    const recurringPatterns = Object.values(issuePatterns)
      .filter((pattern: any) => pattern.count > 1)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    // Get ATM-related technical issues (if applicable)
    const atmTechnicalIssues = await prisma.ticket.findMany({
      where: {
        assignedToId: userId,
        issueClassification: {
          in: ['HARDWARE_FAILURE', 'NETWORK_ISSUE']
        },
        service: {
          name: {
            contains: 'ATM',
            mode: 'insensitive'
          }
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        issueClassification: true,
        rootCause: true,
        status: true,
        createdAt: true
      }
    });

    const atmIssuesTrend = atmTechnicalIssues.reduce((acc, ticket) => {
      const month = ticket.createdAt.toISOString().substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get knowledge base opportunities (unresolved or slow-resolution patterns)
    const knowledgeOpportunities = commonRootCauses
      .filter(cause => cause.count >= 3) // Issues that occur 3+ times
      .map(cause => ({
        topic: cause.rootCause,
        frequency: cause.count,
        classification: cause.classification,
        categories: cause.affectedCategories,
        priority: cause.count >= 5 ? 'HIGH' : 'MEDIUM'
      }));

    // Calculate learning metrics
    const totalTechnicalTickets = issueClassifications.reduce((sum, group) => sum + group._count.id, 0);
    const resolvedTechnicalTickets = resolutionPatterns.length;
    const technicalResolutionRate = totalTechnicalTickets > 0 ? 
      Math.round((resolvedTechnicalTickets / totalTechnicalTickets) * 100) : 0;

    // Monthly trend of technical issues
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return date.toISOString().substring(0, 7);
    });

    const monthlyTrend = await Promise.all(
      last6Months.map(async (month) => {
        const monthStart = new Date(`${month}-01`);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const count = await prisma.ticket.count({
          where: {
            assignedToId: userId,
            issueClassification: {
              in: ['SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE', 'SECURITY_INCIDENT']
            },
            createdAt: {
              gte: monthStart,
              lt: monthEnd
            }
          }
        });

        return {
          date: month,
          value: count,
          label: `${count} technical issues`
        };
      })
    );

    return NextResponse.json({
      summary: {
        totalTechnicalIssues: totalTechnicalTickets,
        resolvedTechnicalIssues: resolvedTechnicalTickets,
        technicalResolutionRate,
        avgResolutionTime: Math.round(resolutionEffectiveness.avgResolutionTime * 10) / 10,
        recurringIssuesCount: recurringPatterns.length
      },
      breakdown: {
        byClassification: technicalIssuesBreakdown,
        byResolutionSpeed: [
          { label: 'Quick (≤2h)', value: resolutionEffectiveness.quick },
          { label: 'Normal (2-4h)', value: resolutionEffectiveness.normal },
          { label: 'Slow (>4h)', value: resolutionEffectiveness.slow }
        ]
      },
      patterns: {
        rootCauses: commonRootCauses,
        recurring: recurringPatterns,
        atmTrend: Object.entries(atmIssuesTrend).map(([month, count]) => ({
          month,
          count
        }))
      },
      learning: {
        knowledgeOpportunities,
        monthlyTrend
      },
      period: {
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error fetching technical issues data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}