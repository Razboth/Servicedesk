import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's branch if not admin (for filtering)
    let userBranchId: string | undefined;
    if (session.user.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });
      userBranchId = user?.branchId || undefined;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeOffline = searchParams.get('includeOffline') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build where clauses
    const branchWhere: any = {
      isActive: true,
      ipAddress: { not: null }
    };
    
    const atmWhere: any = {
      isActive: true,
      ipAddress: { not: null }
    };

    // Apply branch filtering for non-admin users
    if (userBranchId) {
      branchWhere.id = userBranchId;
      atmWhere.branchId = userBranchId;
    }

    // Fetch branches
    const branches = await prisma.branch.findMany({
      where: branchWhere,
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        address: true,
        ipAddress: true,
        backupIpAddress: true,
        networkMedia: true,
        networkVendor: true,
        monitoringEnabled: true
      },
      orderBy: [
        { code: 'asc' },
        { name: 'asc' }
      ],
      take: Math.floor(limit / 2) // Split limit between branches and ATMs
    });

    // Fetch ATMs
    const atms = await prisma.aTM.findMany({
      where: atmWhere,
      select: {
        id: true,
        code: true,
        location: true,
        ipAddress: true,
        networkMedia: true,
        networkVendor: true,
        isActive: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: [
        { code: 'asc' }
      ],
      take: Math.floor(limit / 2)
    });

    // Transform data into unified endpoint format
    const endpoints: any[] = [];

    // Add branches as endpoints
    branches.forEach(branch => {
      if (branch.monitoringEnabled && branch.ipAddress) {
        endpoints.push({
          id: branch.id,
          type: 'BRANCH',
          name: branch.name,
          code: branch.code,
          location: `${branch.city || ''} ${branch.address || ''}`.trim() || branch.name,
          ipAddress: branch.ipAddress,
          backupIpAddress: branch.backupIpAddress,
          networkMedia: branch.networkMedia,
          networkVendor: branch.networkVendor
        });
      }
    });

    // Add ATMs as endpoints
    atms.forEach(atm => {
      if (atm.ipAddress) {
        endpoints.push({
          id: atm.id,
          type: 'ATM',
          name: atm.location || atm.code,
          code: atm.code,
          location: atm.location,
          ipAddress: atm.ipAddress,
          networkMedia: atm.networkMedia,
          networkVendor: atm.networkVendor,
          branchId: atm.branch.id,
          branchName: atm.branch.name
        });
      }
    });

    // Get latest monitoring status for all endpoints if requested
    const endpointIds = endpoints.map(e => e.id);
    const latestStatuses = new Map();

    if (endpointIds.length > 0) {
      // Get latest monitoring logs with enhanced tracking
      const monitoringLogs = await prisma.networkMonitoringLog.findMany({
        where: {
          entityId: { in: endpointIds }
        },
        orderBy: { checkedAt: 'desc' }
      });

      // Create a map of latest status for each endpoint
      monitoringLogs.forEach(log => {
        if (!latestStatuses.has(log.entityId)) {
          // Calculate current downtime if offline
          let currentDowntimeSeconds = 0;
          if (log.downSince && ['OFFLINE', 'TIMEOUT', 'ERROR'].includes(log.status)) {
            currentDowntimeSeconds = Math.floor((Date.now() - log.downSince.getTime()) / 1000);
          }

          // Calculate uptime percentage (last 24 hours)
          const totalTimeSeconds = log.uptimeSeconds + log.downtimeSeconds + currentDowntimeSeconds;
          const uptimePercentage = totalTimeSeconds > 0 
            ? Math.round((log.uptimeSeconds / totalTimeSeconds) * 100)
            : 100;

          latestStatuses.set(log.entityId, {
            status: log.status,
            previousStatus: log.previousStatus,
            responseTimeMs: log.responseTimeMs,
            packetLoss: log.packetLoss,
            checkedAt: log.checkedAt,
            statusChangedAt: log.statusChangedAt,
            errorMessage: log.errorMessage,
            downSince: log.downSince,
            currentDowntimeSeconds,
            uptimeSeconds: log.uptimeSeconds || 0,
            downtimeSeconds: (log.downtimeSeconds || 0) + currentDowntimeSeconds,
            uptimePercentage
          });
        }
      });
    }

    // Enhance endpoints with status information
    const enhancedEndpoints = endpoints.map(endpoint => ({
      ...endpoint,
      lastStatus: latestStatuses.get(endpoint.id) || null
    }));

    // Sort endpoints: online first, then by type, then by code
    enhancedEndpoints.sort((a, b) => {
      // Primary sort by status (online first)
      const aStatus = a.lastStatus?.status || 'UNKNOWN';
      const bStatus = b.lastStatus?.status || 'UNKNOWN';
      const statusOrder = { 'ONLINE': 0, 'SLOW': 1, 'OFFLINE': 2, 'ERROR': 3, 'UNKNOWN': 4 };
      
      if (statusOrder[aStatus as keyof typeof statusOrder] !== statusOrder[bStatus as keyof typeof statusOrder]) {
        return (statusOrder[aStatus as keyof typeof statusOrder] || 4) - (statusOrder[bStatus as keyof typeof statusOrder] || 4);
      }
      
      // Secondary sort by type (branches first)
      if (a.type !== b.type) {
        return a.type === 'BRANCH' ? -1 : 1;
      }
      
      // Tertiary sort by code
      return a.code.localeCompare(b.code);
    });

    // Statistics
    const stats = {
      total: enhancedEndpoints.length,
      branches: branches.length,
      atms: atms.length,
      online: enhancedEndpoints.filter(e => e.lastStatus?.status === 'ONLINE').length,
      offline: enhancedEndpoints.filter(e => e.lastStatus?.status === 'OFFLINE').length,
      slow: enhancedEndpoints.filter(e => e.lastStatus?.status === 'SLOW').length,
      error: enhancedEndpoints.filter(e => e.lastStatus?.status === 'ERROR').length,
      unknown: enhancedEndpoints.filter(e => !e.lastStatus || e.lastStatus.status === 'UNKNOWN').length
    };

    return NextResponse.json({
      success: true,
      endpoints: enhancedEndpoints,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get endpoints error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network endpoints' },
      { status: 500 }
    );
  }
}