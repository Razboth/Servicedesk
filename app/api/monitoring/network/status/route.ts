import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('type'); // 'BRANCH', 'ATM', or null for both
    const defaultLimit = '500'; // All monitoring roles get high limit
    const limit = parseInt(searchParams.get('limit') || defaultLimit);

    // Get branchId from query params or user's branch for MANAGER
    let branchId: string | undefined = searchParams.get('branchId') || undefined;

    // MANAGER can only see their own branch data
    if (session.user.role === 'MANAGER') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });
      branchId = user?.branchId || undefined;
    }

    // Build where clause for branches
    // For map display, show all active branches (monitoring not required)
    // For actual monitoring, only those with monitoring enabled will have status data
    const branchWhere: any = {
      isActive: true
    };
    if (branchId) branchWhere.id = branchId;

    // Build where clause for ATMs
    const atmWhere: any = {
      isActive: true,
      ipAddress: { not: null }
    };
    if (branchId) atmWhere.branchId = branchId;

    const results: any = { branches: [], atms: [] };

    // Fetch branches if requested
    if (!entityType || entityType === 'BRANCH') {
      const branches = await prisma.branch.findMany({
        where: branchWhere,
        include: {
          networkIncidents: {
            where: { status: 'OPEN' },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        take: limit
      });

      // Get latest monitoring logs for each branch
      for (const branch of branches) {
        const latestLog = await prisma.networkMonitoringLog.findFirst({
          where: {
            entityType: 'BRANCH',
            entityId: branch.id
          },
          orderBy: { checkedAt: 'desc' }
        });

        // Determine overall status
        let status = 'UNKNOWN';
        let lastChecked = null;
        let responseTime = null;
        let packetLoss = null;

        if (latestLog) {
          status = latestLog.status;
          lastChecked = latestLog.checkedAt;
          responseTime = latestLog.responseTimeMs;
          packetLoss = latestLog.packetLoss;

          // Check if data is stale (older than 10 minutes)
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          if (latestLog.checkedAt < tenMinutesAgo) {
            status = 'STALE';
          }
        }

        results.branches.push({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          city: branch.city,
          address: branch.address,
          province: branch.province,
          latitude: branch.latitude,
          longitude: branch.longitude,
          ipAddress: branch.ipAddress,
          backupIpAddress: branch.backupIpAddress,
          networkMedia: branch.networkMedia,
          networkVendor: branch.networkVendor,
          status,
          lastChecked,
          responseTime,
          packetLoss,
          hasActiveIncident: branch.networkIncidents.length > 0,
          activeIncident: branch.networkIncidents[0] || null
        });
      }
    }

    // Fetch ATMs if requested
    if (!entityType || entityType === 'ATM') {
      const atms = await prisma.aTM.findMany({
        where: atmWhere,
        include: {
          branch: { select: { name: true, code: true } },
          networkIncidents: {
            where: { status: 'OPEN' },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        take: limit
      });

      // Get latest monitoring logs for each ATM
      for (const atm of atms) {
        const latestLog = await prisma.networkMonitoringLog.findFirst({
          where: {
            entityType: 'ATM',
            entityId: atm.id
          },
          orderBy: { checkedAt: 'desc' }
        });

        // Determine overall status
        let status = 'UNKNOWN';
        let lastChecked = null;
        let responseTime = null;
        let packetLoss = null;

        if (latestLog) {
          status = latestLog.status;
          lastChecked = latestLog.checkedAt;
          responseTime = latestLog.responseTimeMs;
          packetLoss = latestLog.packetLoss;

          // Check if data is stale (older than 5 minutes for ATMs)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          if (latestLog.checkedAt < fiveMinutesAgo) {
            status = 'STALE';
          }
        }

        results.atms.push({
          id: atm.id,
          name: atm.name,
          code: atm.code,
          location: atm.location,
          ipAddress: atm.ipAddress,
          latitude: atm.latitude,
          longitude: atm.longitude,
          networkMedia: atm.networkMedia,
          networkVendor: atm.networkVendor,
          branch: atm.branch,
          status,
          lastChecked,
          responseTime,
          packetLoss,
          hasActiveIncident: atm.networkIncidents.length > 0,
          activeIncident: atm.networkIncidents[0] || null
        });
      }
    }

    // Calculate summary statistics
    const allEntities = [...results.branches, ...results.atms];
    const summary = {
      total: allEntities.length,
      online: allEntities.filter(e => e.status === 'ONLINE').length,
      slow: allEntities.filter(e => e.status === 'SLOW').length,
      offline: allEntities.filter(e => e.status === 'OFFLINE').length,
      error: allEntities.filter(e => e.status === 'ERROR').length,
      stale: allEntities.filter(e => e.status === 'STALE').length,
      unknown: allEntities.filter(e => e.status === 'UNKNOWN').length,
      activeIncidents: allEntities.filter(e => e.hasActiveIncident).length
    };

    return NextResponse.json({
      summary,
      ...results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching network status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network status' },
      { status: 500 }
    );
  }
}