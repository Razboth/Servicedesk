import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Simple ping simulation function (replace with actual ping implementation)
async function simulatePing(ipAddress: string): Promise<{
  success: boolean;
  responseTime?: number;
  packetLoss?: number;
  errorMessage?: string;
}> {
  // Simulate network delay
  const delay = Math.random() * 1000 + 50; // 50-1050ms
  await new Promise(resolve => setTimeout(resolve, Math.min(delay, 200))); // Max 200ms actual delay for demo
  
  // Simulate different outcomes based on IP patterns for demo
  const lastOctet = parseInt(ipAddress.split('.').pop() || '1');
  
  // Simulate some realistic outcomes
  if (lastOctet % 10 === 0) {
    // Every 10th IP is offline
    return {
      success: false,
      errorMessage: 'Host unreachable'
    };
  } else if (lastOctet % 7 === 0) {
    // Every 7th IP has packet loss
    return {
      success: true,
      responseTime: Math.round(delay),
      packetLoss: Math.random() * 15 // 0-15% packet loss
    };
  } else if (lastOctet % 5 === 0) {
    // Every 5th IP is slow
    return {
      success: true,
      responseTime: Math.round(delay * 2 + 500), // Slow response
      packetLoss: 0
    };
  } else {
    // Normal response
    return {
      success: true,
      responseTime: Math.round(delay),
      packetLoss: 0
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { endpointId, type } = await request.json();

    if (!endpointId || !type) {
      return NextResponse.json(
        { error: 'Endpoint ID and type are required' },
        { status: 400 }
      );
    }

    let endpoint: any = null;
    let ipAddress: string | null = null;
    let entityName = '';

    // Get endpoint details based on type
    if (type === 'BRANCH') {
      endpoint = await prisma.branch.findUnique({
        where: { id: endpointId },
        select: { 
          id: true, 
          name: true, 
          code: true,
          ipAddress: true,
          backupIpAddress: true,
          monitoringEnabled: true,
          networkMedia: true,
          networkVendor: true
        }
      });
      
      if (endpoint) {
        ipAddress = endpoint.ipAddress;
        entityName = endpoint.name;
      }
    } else if (type === 'ATM') {
      endpoint = await prisma.aTM.findUnique({
        where: { id: endpointId },
        select: { 
          id: true, 
          code: true,
          location: true,
          ipAddress: true,
          networkMedia: true,
          networkVendor: true,
          isActive: true
        }
      });
      
      if (endpoint) {
        ipAddress = endpoint.ipAddress;
        entityName = `${endpoint.code} - ${endpoint.location}`;
      }
    }

    if (!endpoint) {
      return NextResponse.json(
        { error: `${type.toLowerCase()} not found` },
        { status: 404 }
      );
    }

    if (!ipAddress) {
      return NextResponse.json(
        { error: `No IP address configured for this ${type.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Perform ping
    const pingResult = await simulatePing(ipAddress);
    
    // Determine status based on result
    let status: 'ONLINE' | 'OFFLINE' | 'SLOW' | 'TIMEOUT' | 'ERROR';
    
    if (!pingResult.success) {
      status = 'OFFLINE';
    } else if (pingResult.responseTime && pingResult.responseTime > 1000) {
      status = 'SLOW';
    } else if (pingResult.packetLoss && pingResult.packetLoss > 10) {
      status = 'SLOW';
    } else {
      status = 'ONLINE';
    }

    // Create ping result record
    const result = await prisma.networkPingResult.create({
      data: {
        entityType: type,
        entityId: endpointId,
        ...(type === 'BRANCH' && { 
          branch: { connect: { id: endpointId } } 
        }),
        ...(type === 'ATM' && { 
          atm: { connect: { id: endpointId } } 
        }),
        ipAddress,
        ipType: 'PRIMARY',
        networkMedia: endpoint.networkMedia || null,
        networkVendor: endpoint.networkVendor || null,
        status,
        responseTimeMs: pingResult.responseTime || null,
        packetLoss: pingResult.packetLoss || 0,
        packetsTransmitted: pingResult.success ? 4 : 4,
        packetsReceived: pingResult.success ? (pingResult.packetLoss ? Math.round(4 * (100 - pingResult.packetLoss) / 100) : 4) : 0,
        errorMessage: pingResult.errorMessage || null,
        checkedAt: new Date()
      }
    });

    // Get existing monitoring log to track status changes
    const existingLog = await prisma.networkMonitoringLog.findUnique({
      where: {
        entityType_entityId: {
          entityType: type,
          entityId: endpointId
        }
      }
    });

    const now = new Date();
    const previousStatus = existingLog?.status;
    const statusChanged = !existingLog || previousStatus !== status;
    
    // Calculate downtime/uptime durations
    let downSince = existingLog?.downSince;
    let uptimeSeconds = existingLog?.uptimeSeconds || 0;
    let downtimeSeconds = existingLog?.downtimeSeconds || 0;
    
    if (statusChanged && existingLog) {
      const timeSinceLastCheck = Math.floor((now.getTime() - existingLog.checkedAt.getTime()) / 1000);
      
      if (previousStatus === 'OFFLINE' || previousStatus === 'TIMEOUT' || previousStatus === 'ERROR') {
        // Was offline, add to downtime
        downtimeSeconds += timeSinceLastCheck;
      } else if (previousStatus === 'ONLINE' || previousStatus === 'SLOW') {
        // Was online, add to uptime
        uptimeSeconds += timeSinceLastCheck;
      }
    }
    
    // Set downSince for new offline states
    if (status === 'OFFLINE' || status === 'TIMEOUT' || status === 'ERROR') {
      if (!downSince || statusChanged) {
        downSince = now;
      }
    } else {
      // Clear downSince for online states
      downSince = null;
    }

    // Create or update monitoring log with enhanced tracking
    const updatedLog = await prisma.networkMonitoringLog.upsert({
      where: {
        entityType_entityId: {
          entityType: type,
          entityId: endpointId
        }
      },
      create: {
        entityType: type,
        entityId: endpointId,
        ipAddress,
        status,
        responseTimeMs: pingResult.responseTime || null,
        packetLoss: pingResult.packetLoss || 0,
        errorMessage: pingResult.errorMessage || null,
        checkedAt: now,
        statusChangedAt: now,
        downSince: downSince,
        uptimeSeconds: 0,
        downtimeSeconds: 0
      },
      update: {
        previousStatus: existingLog?.status,
        status,
        responseTimeMs: pingResult.responseTime || null,
        packetLoss: pingResult.packetLoss || 0,
        errorMessage: pingResult.errorMessage || null,
        checkedAt: now,
        ...(statusChanged && { 
          statusChangedAt: now,
          downSince: downSince
        }),
        uptimeSeconds,
        downtimeSeconds
      }
    });

    // Create status history entry if status changed
    if (statusChanged && existingLog) {
      // End the previous status period
      await prisma.networkStatusHistory.updateMany({
        where: {
          entityType: type,
          entityId: endpointId,
          endedAt: null // Current/active status
        },
        data: {
          endedAt: now,
          duration: Math.floor((now.getTime() - (existingLog.statusChangedAt || existingLog.checkedAt).getTime()) / 1000)
        }
      });
    }
    
    // Create new status history entry
    if (!existingLog || statusChanged) {
      await prisma.networkStatusHistory.create({
        data: {
          entityType: type,
          entityId: endpointId,
          ipAddress,
          status,
          previousStatus: previousStatus || null,
          responseTimeMs: pingResult.responseTime || null,
          packetLoss: pingResult.packetLoss || 0,
          errorMessage: pingResult.errorMessage || null,
          startedAt: now
        }
      });
    }

    return NextResponse.json({
      success: true,
      endpoint: {
        id: endpointId,
        type,
        name: entityName,
        ipAddress
      },
      result: {
        id: endpointId,
        status,
        responseTimeMs: pingResult.responseTime,
        packetLoss: pingResult.packetLoss,
        errorMessage: pingResult.errorMessage,
        checkedAt: result.checkedAt.toISOString(),
        ipAddress,
        ipType: 'PRIMARY'
      }
    });

  } catch (error) {
    console.error('Ping endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to ping endpoint' },
      { status: 500 }
    );
  }
}