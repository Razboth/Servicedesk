import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/compliance/security - Get security and compliance metrics
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

    // Get security-related tickets
    const securityKeywords = ['security', 'breach', 'unauthorized', 'access', 'password', 'login', 'authentication', 'malware', 'virus', 'phishing', 'suspicious'];
    
    const securityTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        OR: [
          {
            title: {
              in: securityKeywords.map(keyword => ({ contains: keyword, mode: 'insensitive' as const }))
            }
          },
          {
            description: {
              in: securityKeywords.map(keyword => ({ contains: keyword, mode: 'insensitive' as const }))
            }
          },
          {
            service: {
              tier1Category: {
                name: {
                  in: ['Security', 'Information Security', 'Access Management']
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
            region: true
          }
        },
        assignedTo: {
          select: {
            name: true
          }
        },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get user access patterns
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true
          }
        }
      }
    });

    // Analyze security incidents by type
    const incidentsByType = securityTickets.reduce((acc, ticket) => {
      const title = ticket.title.toLowerCase();
      const description = ticket.description?.toLowerCase() || '';
      
      securityKeywords.forEach(keyword => {
        if (title.includes(keyword) || description.includes(keyword)) {
          acc[keyword] = (acc[keyword] || 0) + 1;
        }
      });
      
      return acc;
    }, {} as Record<string, number>);

    // Security incident severity analysis
    const severityAnalysis = {
      URGENT: securityTickets.filter(t => t.priority === 'URGENT').length,
      HIGH: securityTickets.filter(t => t.priority === 'HIGH').length,
      MEDIUM: securityTickets.filter(t => t.priority === 'MEDIUM').length,
      LOW: securityTickets.filter(t => t.priority === 'LOW').length
    };

    // Response time analysis for security incidents
    const securityResponseTimes = securityTickets.map(ticket => {
      const firstComment = ticket.comments[0];
      const responseTime = firstComment
        ? (new Date(firstComment.createdAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60) // minutes
        : null;
      
      return {
        ticketId: ticket.id,
        priority: ticket.priority,
        responseTime,
        hasResponse: !!firstComment
      };
    }).filter(item => item.responseTime !== null);

    const avgSecurityResponseTime = securityResponseTimes.length > 0
      ? securityResponseTimes.reduce((sum, item) => sum + item.responseTime!, 0) / securityResponseTimes.length
      : 0;

    // User access compliance
    const accessCompliance = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.lastLoginAt && 
        new Date(u.lastLoginAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length,
      inactiveUsers: users.filter(u => !u.lastLoginAt || 
        new Date(u.lastLoginAt) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length,
      newUsers: users.filter(u => 
        new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length
    };

    // Role distribution for compliance
    const roleDistribution = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Change management tracking (using ticket updates as proxy)
    const changeTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        OR: [
          {
            title: {
              contains: 'change',
              mode: 'insensitive'
            }
          },
          {
            service: {
              name: {
                contains: 'change',
                mode: 'insensitive'
              }
            }
          }
        ]
      },
      include: {
        service: {
          select: {
            name: true
          }
        }
      }
    });

    // Audit trail analysis
    const auditMetrics = {
      totalSecurityIncidents: securityTickets.length,
      resolvedSecurityIncidents: securityTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
      openSecurityIncidents: securityTickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length,
      criticalSecurityIncidents: securityTickets.filter(t => ['HIGH', 'URGENT'].includes(t.priority)).length,
      changeRequests: changeTickets.length,
      approvedChanges: changeTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length
    };

    // Regional security analysis
    const regionalSecurity = securityTickets.reduce((acc, ticket) => {
      const region = ticket.branch?.region || 'Unknown';
      if (!acc[region]) {
        acc[region] = {
          incidents: 0,
          critical: 0,
          resolved: 0
        };
      }
      
      acc[region].incidents++;
      if (['HIGH', 'URGENT'].includes(ticket.priority)) {
        acc[region].critical++;
      }
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        acc[region].resolved++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate regional resolution rates
    Object.keys(regionalSecurity).forEach(region => {
      const data = regionalSecurity[region];
      data.resolutionRate = data.incidents > 0 ? (data.resolved / data.incidents) * 100 : 0;
    });

    // Compliance score calculation
    const complianceScore = {
      securityIncidentResponse: securityTickets.length > 0 
        ? Math.min(100, Math.max(0, 100 - (avgSecurityResponseTime / 60) * 10)) // Penalty for slow response
        : 100,
      accessManagement: (accessCompliance.activeUsers / Math.max(accessCompliance.totalUsers, 1)) * 100,
      changeManagement: changeTickets.length > 0 
        ? (auditMetrics.approvedChanges / changeTickets.length) * 100 
        : 100,
      incidentResolution: securityTickets.length > 0 
        ? (auditMetrics.resolvedSecurityIncidents / securityTickets.length) * 100 
        : 100
    };

    const overallComplianceScore = Math.round(
      (complianceScore.securityIncidentResponse + 
       complianceScore.accessManagement + 
       complianceScore.changeManagement + 
       complianceScore.incidentResolution) / 4
    );

    // Daily security incident trends
    const dailySecurityTrends = securityTickets.reduce((acc, ticket) => {
      const date = new Date(ticket.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const response = {
      summary: {
        totalSecurityIncidents: auditMetrics.totalSecurityIncidents,
        openSecurityIncidents: auditMetrics.openSecurityIncidents,
        criticalSecurityIncidents: auditMetrics.criticalSecurityIncidents,
        avgResponseTimeMinutes: Math.round(avgSecurityResponseTime),
        overallComplianceScore,
        securityResolutionRate: securityTickets.length > 0 
          ? Math.round((auditMetrics.resolvedSecurityIncidents / securityTickets.length) * 100)
          : 0
      },
      compliance: {
        scores: complianceScore,
        accessManagement: accessCompliance,
        roleDistribution,
        changeManagement: {
          totalRequests: changeTickets.length,
          approvedChanges: auditMetrics.approvedChanges,
          approvalRate: changeTickets.length > 0 
            ? Math.round((auditMetrics.approvedChanges / changeTickets.length) * 100)
            : 0
        }
      },
      security: {
        incidentsByType: Object.entries(incidentsByType)
          .sort(([_, a], [__, b]) => b - a)
          .slice(0, 10),
        severityDistribution: severityAnalysis,
        regionalAnalysis: regionalSecurity,
        responseMetrics: {
          avgResponseTime: Math.round(avgSecurityResponseTime),
          responseRate: securityTickets.length > 0 
            ? Math.round((securityResponseTimes.length / securityTickets.length) * 100)
            : 0
        }
      },
      trends: {
        dailyIncidents: dailySecurityTrends,
        userActivity: {
          newUsers: accessCompliance.newUsers,
          activeUsers: accessCompliance.activeUsers,
          inactiveUsers: accessCompliance.inactiveUsers
        }
      },
      recentIncidents: securityTickets.slice(0, 10).map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status,
        branch: ticket.branch?.name,
        region: ticket.branch?.region,
        assignedTo: ticket.assignedTo?.name,
        createdAt: ticket.createdAt,
        category: ticket.service?.tier1Category?.name
      })),
      recommendations: [
        auditMetrics.openSecurityIncidents > 0 ? 'Address open security incidents immediately' : null,
        avgSecurityResponseTime > 60 ? 'Improve security incident response time' : null,
        accessCompliance.inactiveUsers > accessCompliance.totalUsers * 0.2 ? 'Review and clean up inactive user accounts' : null,
        overallComplianceScore < 80 ? 'Implement additional compliance measures' : null
      ].filter(Boolean)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching security compliance report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security compliance report' },
      { status: 500 }
    );
  }
}