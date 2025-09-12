import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow ADMIN, SUPER_ADMIN, MANAGER to view approval reports
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    const isBranchRole = ['MANAGER'].includes(session.user.role);
    const branchId = user?.branchId;

    // Build where clause for filtering based on role
    let approvalFilter: any = {};

    if (isBranchRole && branchId) {
      // Managers see approvals for tickets from their branch
      approvalFilter.ticket = {
        branchId: branchId
      };
    }
    // Admins see all approvals (no additional filter)

    // Get all ticket approvals with related data
    const approvals = await prisma.ticketApproval.findMany({
      where: approvalFilter,
      include: {
        ticket: {
          include: {
            service: {
              select: { 
                name: true, 
                category: { select: { name: true } },
                requiresApproval: true,
                estimatedHours: true
              }
            },
            createdBy: {
              select: { name: true, email: true, role: true }
            },
            branch: {
              select: { name: true, code: true }
            }
          }
        },
        approver: {
          select: { 
            name: true, 
            email: true, 
            role: true,
            branch: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Date ranges for analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter approvals by date ranges
    const recentApprovals = approvals.filter(a => a.createdAt >= thirtyDaysAgo);
    const weeklyApprovals = approvals.filter(a => a.createdAt >= sevenDaysAgo);
    const dailyApprovals = approvals.filter(a => a.createdAt >= twentyFourHoursAgo);

    // Status analysis
    const statusStats = {
      pending: approvals.filter(a => a.status === 'PENDING').length,
      approved: approvals.filter(a => a.status === 'APPROVED').length,
      rejected: approvals.filter(a => a.status === 'REJECTED').length,
      total: approvals.length
    };

    // Recent status stats
    const recentStatusStats = {
      pending: recentApprovals.filter(a => a.status === 'PENDING').length,
      approved: recentApprovals.filter(a => a.status === 'APPROVED').length,
      rejected: recentApprovals.filter(a => a.status === 'REJECTED').length,
      total: recentApprovals.length
    };

    // Calculate approval TAT (Turnaround Time)
    const processedApprovals = approvals.filter(a => a.status !== 'PENDING' && a.processedAt);
    let avgProcessingHours = 0;
    let avgProcessingMinutes = 0;

    if (processedApprovals.length > 0) {
      const totalProcessingTime = processedApprovals.reduce((sum, approval) => {
        if (approval.processedAt) {
          return sum + (approval.processedAt.getTime() - approval.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgProcessingHours = totalProcessingTime / (processedApprovals.length * 1000 * 60 * 60);
      avgProcessingMinutes = avgProcessingHours * 60;
    }

    // Approver performance analysis
    const approverStats = approvals.reduce((acc: any, approval) => {
      if (approval.approver) {
        const approverId = approval.approver.email;
        if (!acc[approverId]) {
          acc[approverId] = {
            name: approval.approver.name,
            email: approval.approver.email,
            role: approval.approver.role,
            branch: approval.approver.branch?.name || 'Unknown',
            totalApprovals: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
            avgProcessingHours: 0,
            processedCount: 0,
            recentApprovals: 0
          };
        }

        acc[approverId].totalApprovals++;
        
        if (approval.status === 'APPROVED') acc[approverId].approved++;
        else if (approval.status === 'REJECTED') acc[approverId].rejected++;
        else if (approval.status === 'PENDING') acc[approverId].pending++;

        if (approval.createdAt >= thirtyDaysAgo) {
          acc[approverId].recentApprovals++;
        }

        // Calculate processing time for this approver
        if (approval.processedAt && approval.status !== 'PENDING') {
          const processingHours = (approval.processedAt.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60);
          acc[approverId].avgProcessingHours += processingHours;
          acc[approverId].processedCount++;
        }
      }
      return acc;
    }, {});

    // Calculate average processing time per approver
    Object.keys(approverStats).forEach(approverId => {
      const approver = approverStats[approverId];
      if (approver.processedCount > 0) {
        approver.avgProcessingHours = approver.avgProcessingHours / approver.processedCount;
      }
      approver.approvalRate = approver.totalApprovals > 0 ? 
        (approver.approved / approver.totalApprovals) * 100 : 0;
    });

    // Convert to array and sort
    const approverList = Object.values(approverStats).sort((a: any, b: any) => b.totalApprovals - a.totalApprovals);

    // Service-wise approval analysis
    const serviceStats = approvals.reduce((acc: any, approval) => {
      const serviceName = approval.ticket?.service?.name || 'Unknown';
      const categoryName = approval.ticket?.service?.category?.name || 'Unknown';
      
      if (!acc[serviceName]) {
        acc[serviceName] = {
          serviceName,
          categoryName,
          totalApprovals: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          avgProcessingHours: 0,
          processedCount: 0,
          requiresApproval: approval.ticket?.service?.requiresApproval || false
        };
      }

      acc[serviceName].totalApprovals++;
      
      if (approval.status === 'APPROVED') acc[serviceName].approved++;
      else if (approval.status === 'REJECTED') acc[serviceName].rejected++;
      else if (approval.status === 'PENDING') acc[serviceName].pending++;

      // Processing time for this service
      if (approval.processedAt && approval.status !== 'PENDING') {
        const processingHours = (approval.processedAt.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60);
        acc[serviceName].avgProcessingHours += processingHours;
        acc[serviceName].processedCount++;
      }

      return acc;
    }, {});

    // Calculate service averages
    Object.keys(serviceStats).forEach(serviceName => {
      const service = serviceStats[serviceName];
      if (service.processedCount > 0) {
        service.avgProcessingHours = service.avgProcessingHours / service.processedCount;
      }
      service.approvalRate = service.totalApprovals > 0 ? 
        (service.approved / service.totalApprovals) * 100 : 0;
    });

    const serviceList = Object.values(serviceStats).sort((a: any, b: any) => b.totalApprovals - a.totalApprovals);

    // Branch-wise analysis
    const branchStats = approvals.reduce((acc: any, approval) => {
      const branchName = approval.ticket?.branch?.name || 'Unknown';
      const branchCode = approval.ticket?.branch?.code || '';
      
      if (!acc[branchName]) {
        acc[branchName] = {
          branchName,
          branchCode,
          totalApprovals: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          avgProcessingHours: 0,
          processedCount: 0
        };
      }

      acc[branchName].totalApprovals++;
      
      if (approval.status === 'APPROVED') acc[branchName].approved++;
      else if (approval.status === 'REJECTED') acc[branchName].rejected++;
      else if (approval.status === 'PENDING') acc[branchName].pending++;

      if (approval.processedAt && approval.status !== 'PENDING') {
        const processingHours = (approval.processedAt.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60);
        acc[branchName].avgProcessingHours += processingHours;
        acc[branchName].processedCount++;
      }

      return acc;
    }, {});

    Object.keys(branchStats).forEach(branchName => {
      const branch = branchStats[branchName];
      if (branch.processedCount > 0) {
        branch.avgProcessingHours = branch.avgProcessingHours / branch.processedCount;
      }
      branch.approvalRate = branch.totalApprovals > 0 ? 
        (branch.approved / branch.totalApprovals) * 100 : 0;
    });

    const branchList = Object.values(branchStats).sort((a: any, b: any) => b.totalApprovals - a.totalApprovals);

    // Priority distribution
    const priorityDistribution = approvals.reduce((acc: any, approval) => {
      const priority = approval.ticket?.priority || 'Unknown';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    // Daily trend for last 30 days
    const dailyTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayApprovals = approvals.filter(approval => {
        const approvalDate = new Date(approval.createdAt);
        return approvalDate >= dayStart && approvalDate < dayEnd;
      });

      const dayProcessed = dayApprovals.filter(a => a.processedAt && a.processedAt >= dayStart && a.processedAt < dayEnd);

      return {
        date: dayStart.toISOString().split('T')[0],
        created: dayApprovals.length,
        processed: dayProcessed.length,
        approved: dayProcessed.filter(a => a.status === 'APPROVED').length,
        rejected: dayProcessed.filter(a => a.status === 'REJECTED').length
      };
    });

    // Pending approvals details (for alerts)
    const pendingApprovals = approvals
      .filter(a => a.status === 'PENDING')
      .map(approval => ({
        id: approval.id,
        ticketId: approval.ticket.id,
        ticketNumber: approval.ticket.ticketNumber,
        ticketTitle: approval.ticket.title,
        serviceName: approval.ticket.service?.name || 'Unknown',
        requesterName: approval.ticket.createdBy.name,
        requesterEmail: approval.ticket.createdBy.email,
        branchName: approval.ticket.branch?.name || 'Unknown',
        approverName: approval.approver?.name || 'Unassigned',
        approverEmail: approval.approver?.email || '',
        createdAt: approval.createdAt,
        daysPending: Math.floor((now.getTime() - approval.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
        priority: approval.ticket.priority,
        comments: approval.comments
      }))
      .sort((a, b) => b.daysPending - a.daysPending);

    const summary = {
      totalApprovals: approvals.length,
      recentApprovals: recentApprovals.length,
      pendingApprovals: statusStats.pending,
      approvedApprovals: statusStats.approved,
      rejectedApprovals: statusStats.rejected,
      avgProcessingHours: Math.round(avgProcessingHours * 10) / 10,
      avgProcessingMinutes: Math.round(avgProcessingMinutes * 10) / 10,
      approvalRate: statusStats.total > 0 ? Math.round((statusStats.approved / statusStats.total) * 100 * 10) / 10 : 0,
      activeApprovers: approverList.filter((a: any) => a.recentApprovals > 0).length
    };

    return NextResponse.json({
      summary,
      statusStats,
      recentStatusStats,
      approvers: approverList,
      services: serviceList,
      branches: branchList,
      priorityDistribution,
      dailyTrend,
      pendingApprovals: pendingApprovals.slice(0, 20) // Limit for performance
    });

  } catch (error) {
    console.error('Error fetching approval status data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}