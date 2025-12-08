import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Admin, Manager, Tech Support, or PC Auditor
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(session.user.role);
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { supportGroup: true }
    });

    const isTechSupport = user?.supportGroup?.code === 'TECH_SUPPORT';
    const isPCAuditor = user?.supportGroup?.code === 'PC_AUDITOR';

    if (!isAdmin && !isTechSupport && !isPCAuditor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date thresholds
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch all stats in parallel
    const [
      totalAssets,
      statusCounts,
      warrantyExpiringSoon,
      warrantyExpired,
      avOutdated,
      avInactive,
      recentServiceLogs,
      assetsByBranch,
      assetsByFormFactor,
      openServiceLogs
    ] = await Promise.all([
      // Total assets
      prisma.pCAsset.count({ where: { isActive: true } }),

      // Assets by status
      prisma.pCAsset.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { id: true }
      }),

      // Warranty expiring in 30 days
      prisma.pCAsset.count({
        where: {
          isActive: true,
          warrantyExpiry: {
            gte: today,
            lte: thirtyDaysFromNow
          }
        }
      }),

      // Warranty already expired
      prisma.pCAsset.count({
        where: {
          isActive: true,
          warrantyExpiry: {
            lt: today
          }
        }
      }),

      // Antivirus definition outdated (> 7 days)
      prisma.pCAsset.count({
        where: {
          isActive: true,
          antivirusName: { not: null },
          avDefinitionDate: {
            lt: sevenDaysAgo
          }
        }
      }),

      // Antivirus real-time protection disabled
      prisma.pCAsset.count({
        where: {
          isActive: true,
          antivirusName: { not: null },
          avRealTimeProtection: false
        }
      }),

      // Recent service logs (last 10)
      prisma.pCServiceLog.findMany({
        where: {},
        orderBy: { performedAt: 'desc' },
        take: 10,
        include: {
          pcAsset: {
            select: {
              pcName: true,
              assetTag: true,
              branch: { select: { name: true, code: true } }
            }
          },
          performedBy: { select: { name: true } }
        }
      }),

      // Assets by branch (top 10)
      prisma.pCAsset.groupBy({
        by: ['branchId'],
        where: { isActive: true },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),

      // Assets by form factor
      prisma.pCAsset.groupBy({
        by: ['formFactor'],
        where: { isActive: true, formFactor: { not: null } },
        _count: { id: true }
      }),

      // Open service logs count
      prisma.pCServiceLog.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_PARTS'] }
        }
      })
    ]);

    // Get branch names for the groupBy results
    const branchIds = assetsByBranch.map(b => b.branchId);
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true, code: true }
    });

    const branchMap = new Map(branches.map(b => [b.id, b]));
    const assetsByBranchWithNames = assetsByBranch.map(item => ({
      branchId: item.branchId,
      branchName: branchMap.get(item.branchId)?.name || 'Unknown',
      branchCode: branchMap.get(item.branchId)?.code || 'N/A',
      count: item._count.id
    }));

    // Format status counts
    const statusCountsFormatted: Record<string, number> = {
      IN_USE: 0,
      STOCK: 0,
      BROKEN: 0,
      DISPOSED: 0,
      MAINTENANCE: 0,
      RESERVED: 0
    };

    statusCounts.forEach(item => {
      if (item.status) {
        statusCountsFormatted[item.status] = item._count.id;
      }
    });

    // Format form factor counts
    const formFactorCounts = assetsByFormFactor.map(item => ({
      formFactor: item.formFactor,
      count: item._count.id
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalAssets,
          statusCounts: statusCountsFormatted,
          warrantyExpiringSoon,
          warrantyExpired,
          avOutdated,
          avInactive,
          openServiceLogs
        },
        recentServiceLogs: recentServiceLogs.map(log => ({
          id: log.id,
          pcName: log.pcAsset.pcName,
          assetTag: log.pcAsset.assetTag,
          branchName: log.pcAsset.branch?.name,
          serviceType: log.serviceType,
          status: log.status,
          description: log.description,
          performedBy: log.performedBy.name,
          performedAt: log.performedAt,
          cost: log.cost
        })),
        assetsByBranch: assetsByBranchWithNames,
        assetsByFormFactor: formFactorCounts
      }
    });

  } catch (error) {
    console.error('PC Management Dashboard Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
