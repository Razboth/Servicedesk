import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    const isBranchRole = ['MANAGER'].includes(session.user.role);
    const branchId = user?.branchId;

    // Build where clause for filtering based on role
    let ticketFilter: any = {
      OR: [
        {
          service: {
            category: {
              name: {
                contains: 'ATM',
                mode: 'insensitive'
              }
            }
          }
        },
        {
          title: {
            contains: 'ATM',
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: 'ATM',
            mode: 'insensitive'
          }
        }
      ]
    };

    if (isBranchRole && branchId) {
      ticketFilter.branchId = branchId;
    }

    // Get ATM-related tickets
    const atmTickets = await prisma.ticket.findMany({
      where: ticketFilter,
      include: {
        service: {
          select: {
            name: true,
            category: { 
              select: { name: true }
            }
          }
        },
        assignedTo: {
          select: { 
            name: true, 
            email: true,
            supportGroups: {
              include: {
                group: { select: { name: true } }
              }
            }
          }
        },
        createdBy: {
          select: { 
            name: true, 
            email: true,
            role: true
          }
        },
        branch: {
          select: { 
            name: true, 
            code: true 
          }
        },
        comments: {
          select: {
            id: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Get ATM entities from monitoring system
    const atms = await prisma.aTM.findMany({
      include: {
        branch: {
          select: { name: true, code: true }
        },
        incidents: {
          select: {
            id: true,
            status: true,
            severity: true,
            createdAt: true,
            resolvedAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        pingResults: {
          select: {
            isOnline: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Categorize ATM issues
    const issueCategories = {
      'Hardware Failure': ['hardware', 'malfunction', 'broken', 'fault', 'defect'],
      'Network Connectivity': ['network', 'connection', 'offline', 'connectivity', 'communication'],
      'Cash Management': ['cash', 'money', 'dispenser', 'cassette', 'denomination'],
      'Card Reader': ['card', 'reader', 'magnetic', 'chip', 'swipe'],
      'Display Issues': ['screen', 'display', 'monitor', 'lcd', 'blank'],
      'Printer Problems': ['printer', 'receipt', 'paper', 'print', 'journal'],
      'Software Issues': ['software', 'application', 'system', 'error', 'crash'],
      'Security Issues': ['security', 'alarm', 'tamper', 'vandalism', 'breach'],
      'Environmental': ['temperature', 'humidity', 'power', 'ups', 'cooling'],
      'Maintenance': ['maintenance', 'cleaning', 'service', 'preventive', 'scheduled']
    };

    // Analyze tickets by category
    const ticketsByCategory = atmTickets.map(ticket => {
      const text = `${ticket.title} ${ticket.description || ''}`.toLowerCase();
      
      let detectedCategory = 'Other';
      for (const [category, keywords] of Object.entries(issueCategories)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          detectedCategory = category;
          break;
        }
      }

      const createdDate = new Date(ticket.createdAt);
      const daysOpen = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED' ? 
        (ticket.resolvedAt ? 
          Math.floor((new Date(ticket.resolvedAt).getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : 
          Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        ) :
        Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...ticket,
        issueCategory: detectedCategory,
        daysOpen,
        isRecent: createdDate >= thirtyDaysAgo,
        isWeekly: createdDate >= sevenDaysAgo,
        isDaily: createdDate >= twentyFourHoursAgo
      };
    });

    // Category analysis
    const categoryAnalysis = Object.keys(issueCategories).concat(['Other']).map(category => {
      const categoryTickets = ticketsByCategory.filter(t => t.issueCategory === category);
      const resolvedTickets = categoryTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
      const openTickets = categoryTickets.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status));
      
      const totalResolutionTime = resolvedTickets.reduce((sum, ticket) => {
        if (ticket.resolvedAt) {
          return sum + (new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime());
        }
        return sum;
      }, 0);

      const avgResolutionHours = resolvedTickets.length > 0 ? 
        Math.round((totalResolutionTime / resolvedTickets.length) / (1000 * 60 * 60) * 10) / 10 : 0;

      return {
        category,
        totalTickets: categoryTickets.length,
        openTickets: openTickets.length,
        resolvedTickets: resolvedTickets.length,
        recentTickets: categoryTickets.filter(t => t.isRecent).length,
        resolutionRate: categoryTickets.length > 0 ? 
          Math.round((resolvedTickets.length / categoryTickets.length) * 100 * 10) / 10 : 0,
        avgResolutionHours,
        priorityDistribution: categoryTickets.reduce((acc: any, ticket) => {
          acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
          return acc;
        }, {})
      };
    }).filter(cat => cat.totalTickets > 0);

    // ATM status analysis
    const atmAnalysis = atms.map(atm => {
      const recentIncidents = atm.incidents.filter(inc => 
        new Date(inc.createdAt) >= thirtyDaysAgo
      );
      const openIncidents = atm.incidents.filter(inc => inc.status === 'OPEN');
      const lastPing = atm.pingResults[0];
      
      // Find related tickets
      const relatedTickets = atmTickets.filter(ticket => 
        ticket.title.toLowerCase().includes(atm.id.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(atm.id.toLowerCase()) ||
        (ticket.branch?.code === atm.branch?.code && 
         ticket.title.toLowerCase().includes('atm'))
      );

      return {
        id: atm.id,
        name: atm.name,
        location: atm.location,
        branch: atm.branch?.name || 'Unknown',
        branchCode: atm.branch?.code || '',
        type: atm.type,
        isOnline: lastPing?.isOnline ?? false,
        lastPingTime: lastPing?.createdAt?.toISOString(),
        totalIncidents: atm.incidents.length,
        recentIncidents: recentIncidents.length,
        openIncidents: openIncidents.length,
        relatedTickets: relatedTickets.length,
        openTickets: relatedTickets.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status)).length,
        uptime: lastPing?.isOnline ? 100 : 0, // Simplified uptime calculation
        status: lastPing?.isOnline ? 'Online' : 'Offline',
        lastIncidentDate: recentIncidents[0]?.createdAt?.toISOString(),
        maintenanceStatus: openIncidents.length > 0 ? 'Under Maintenance' : 'Operational'
      };
    });

    // Branch performance analysis
    const branchAnalysis = atmTickets.reduce((acc: any, ticket) => {
      const branchName = ticket.branch?.name || 'Unknown';
      const branchCode = ticket.branch?.code || '';
      
      if (!acc[branchName]) {
        acc[branchName] = {
          branchName,
          branchCode,
          totalTickets: 0,
          openTickets: 0,
          resolvedTickets: 0,
          recentTickets: 0,
          atmCount: 0,
          onlineAtms: 0,
          avgResolutionDays: 0,
          totalResolutionDays: 0,
          categoryDistribution: {}
        };
      }
      
      const branch = acc[branchName];
      branch.totalTickets++;
      
      if (['OPEN', 'IN_PROGRESS'].includes(ticket.status)) branch.openTickets++;
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        branch.resolvedTickets++;
        const resolutionDays = Math.floor((ticket.resolvedAt ? 
          new Date(ticket.resolvedAt).getTime() : now.getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        branch.totalResolutionDays += resolutionDays;
      }
      
      if (new Date(ticket.createdAt) >= thirtyDaysAgo) branch.recentTickets++;
      
      const category = ticketsByCategory.find(t => t.id === ticket.id)?.issueCategory || 'Other';
      branch.categoryDistribution[category] = (branch.categoryDistribution[category] || 0) + 1;
      
      return acc;
    }, {});

    // Add ATM counts to branch analysis
    atms.forEach(atm => {
      const branchName = atm.branch?.name || 'Unknown';
      if (branchAnalysis[branchName]) {
        branchAnalysis[branchName].atmCount++;
        if (atm.pingResults[0]?.isOnline) {
          branchAnalysis[branchName].onlineAtms++;
        }
      }
    });

    // Calculate averages for branches
    Object.values(branchAnalysis).forEach((branch: any) => {
      branch.avgResolutionDays = branch.resolvedTickets > 0 ? 
        Math.round((branch.totalResolutionDays / branch.resolvedTickets) * 10) / 10 : 0;
      branch.resolutionRate = branch.totalTickets > 0 ? 
        Math.round((branch.resolvedTickets / branch.totalTickets) * 100 * 10) / 10 : 0;
      branch.availabilityRate = branch.atmCount > 0 ? 
        Math.round((branch.onlineAtms / branch.atmCount) * 100 * 10) / 10 : 100;
      delete branch.totalResolutionDays;
    });

    // Time-based trend analysis
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      const monthTickets = atmTickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= monthStart && ticketDate <= monthEnd;
      });

      const monthResolved = monthTickets.filter(t => 
        t.resolvedAt && new Date(t.resolvedAt) >= monthStart && new Date(t.resolvedAt) <= monthEnd
      );

      const categoryBreakdown = categoryAnalysis.reduce((acc: any, cat) => {
        acc[cat.category] = monthTickets.filter(t => 
          ticketsByCategory.find(tc => tc.id === t.id)?.issueCategory === cat.category
        ).length;
        return acc;
      }, {});

      return {
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        totalTickets: monthTickets.length,
        resolvedTickets: monthResolved.length,
        resolutionRate: monthTickets.length > 0 ? 
          Math.round((monthResolved.length / monthTickets.length) * 100 * 10) / 10 : 0,
        ...categoryBreakdown
      };
    });

    // Overall statistics
    const stats = {
      totalAtms: atms.length,
      onlineAtms: atms.filter(atm => atm.pingResults[0]?.isOnline).length,
      offlineAtms: atms.filter(atm => !atm.pingResults[0]?.isOnline).length,
      totalTickets: atmTickets.length,
      openTickets: atmTickets.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status)).length,
      resolvedTickets: atmTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
      recentTickets: atmTickets.filter(t => new Date(t.createdAt) >= thirtyDaysAgo).length,
      criticalTickets: atmTickets.filter(t => t.priority === 'CRITICAL').length,
      unassignedTickets: atmTickets.filter(t => !t.assignedToId).length,
      avgResolutionDays: atmTickets.length > 0 ? 
        Math.round(atmTickets.reduce((sum, ticket) => {
          const days = ticketsByCategory.find(t => t.id === ticket.id)?.daysOpen || 0;
          return sum + days;
        }, 0) / atmTickets.length * 10) / 10 : 0,
      availabilityRate: atms.length > 0 ? 
        Math.round((atms.filter(atm => atm.pingResults[0]?.isOnline).length / atms.length) * 100 * 10) / 10 : 100,
      resolutionRate: atmTickets.length > 0 ? 
        Math.round((atmTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length / atmTickets.length) * 100 * 10) / 10 : 0
    };

    return NextResponse.json({
      summary: stats,
      categoryAnalysis: categoryAnalysis.sort((a, b) => b.totalTickets - a.totalTickets),
      atmStatus: atmAnalysis.sort((a, b) => b.openTickets - a.openTickets),
      branchAnalysis: Object.values(branchAnalysis).sort((a: any, b: any) => b.totalTickets - a.totalTickets),
      monthlyTrend,
      recentTickets: ticketsByCategory
        .filter(t => t.isRecent)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20)
    });

  } catch (error) {
    console.error('Error fetching ATM issues data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}