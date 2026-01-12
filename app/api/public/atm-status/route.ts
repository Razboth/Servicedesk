import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  authenticateApiKey,
  checkApiPermission,
  createApiErrorResponse,
  createApiSuccessResponse
} from '@/lib/auth-api';
import { ATMStatus, NetworkStatus } from '@prisma/client';

// Validation schema for ATM status update
const atmStatusSchema = z.object({
  atmCode: z.string().min(1, 'ATM code is required'),
  status: z.enum(['ONLINE', 'OFFLINE', 'WARNING', 'ERROR', 'MAINTENANCE']),
  ipAddress: z.string().optional(),
  responseTimeMs: z.number().optional(),
  packetLoss: z.number().min(0).max(100).optional(),
  networkStatus: z.enum(['ONLINE', 'OFFLINE', 'SLOW', 'TIMEOUT', 'ERROR']).optional(),
  errorMessage: z.string().nullable().optional(),
  metrics: z.record(z.any()).optional()
});

/**
 * POST /api/public/atm-status
 *
 * Endpoint for external monitoring servers to submit ATM status updates.
 * Requires API key authentication with 'atm:status' or 'atm:*' permission.
 *
 * Request body:
 * {
 *   "atmCode": "ATM001",           // Required - ATM code
 *   "status": "ONLINE",            // Required - ATMStatus enum
 *   "ipAddress": "192.168.1.100",  // Optional
 *   "responseTimeMs": 45,          // Optional
 *   "packetLoss": 0,               // Optional (0-100)
 *   "networkStatus": "ONLINE",     // Optional - NetworkStatus enum
 *   "errorMessage": null,          // Optional
 *   "metrics": { ... }             // Optional - Additional metrics
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
    }

    // Check permission
    if (!checkApiPermission(authResult.apiKey!, 'atm:status')) {
      return createApiErrorResponse('Insufficient permissions. Required: atm:status', 403);
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return createApiErrorResponse('Invalid JSON body', 400);
    }

    const validation = atmStatusSchema.safeParse(body);
    if (!validation.success) {
      return createApiErrorResponse('Validation failed', 400, validation.error.flatten().fieldErrors);
    }

    const data = validation.data;

    // Find ATM by code
    const atm = await prisma.aTM.findUnique({
      where: { code: data.atmCode },
      select: {
        id: true,
        code: true,
        name: true,
        ipAddress: true,
        networkMedia: true,
        branchId: true
      }
    });

    if (!atm) {
      return createApiErrorResponse(`ATM with code '${data.atmCode}' not found`, 404);
    }

    // Create ATM monitoring log
    const monitoringLog = await prisma.aTMMonitoringLog.create({
      data: {
        atmId: atm.id,
        status: data.status as ATMStatus,
        responseTime: data.responseTimeMs ? data.responseTimeMs : null,
        errorMessage: data.errorMessage || null,
        checkedAt: new Date()
      }
    });

    // If ping data is provided, also create a NetworkPingResult
    let pingResult = null;
    if (data.ipAddress || data.networkStatus || data.responseTimeMs !== undefined) {
      pingResult = await prisma.networkPingResult.create({
        data: {
          entityType: 'ATM',
          entityId: atm.id,
          atmId: atm.id,
          branchId: atm.branchId,
          ipAddress: data.ipAddress || atm.ipAddress || 'unknown',
          ipType: 'PRIMARY',
          networkMedia: atm.networkMedia,
          status: (data.networkStatus as NetworkStatus) ||
                  (data.status === 'ONLINE' ? 'ONLINE' :
                   data.status === 'OFFLINE' ? 'OFFLINE' :
                   data.status === 'WARNING' ? 'SLOW' :
                   data.status === 'ERROR' ? 'ERROR' : 'OFFLINE'),
          responseTimeMs: data.responseTimeMs || null,
          packetLoss: data.packetLoss || 0,
          minRtt: data.metrics?.minRtt || null,
          maxRtt: data.metrics?.maxRtt || null,
          avgRtt: data.metrics?.avgRtt || data.responseTimeMs || null,
          mdev: data.metrics?.mdev || null,
          packetsTransmitted: data.metrics?.packetsTransmitted || null,
          packetsReceived: data.metrics?.packetsReceived || null,
          errorMessage: data.errorMessage || null,
          checkedAt: new Date()
        }
      });
    }

    return createApiSuccessResponse({
      success: true,
      atmId: atm.id,
      atmCode: atm.code,
      atmName: atm.name,
      status: data.status,
      logId: monitoringLog.id,
      pingResultId: pingResult?.id || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('ATM status update error:', error);
    return createApiErrorResponse('Internal server error', 500);
  }
}

/**
 * GET /api/public/atm-status
 *
 * Get current status of an ATM by code.
 * Requires API key authentication with 'atm:status' or 'atm:*' permission.
 *
 * Query params:
 * - atmCode: ATM code to query
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
    }

    // Check permission
    if (!checkApiPermission(authResult.apiKey!, 'atm:status')) {
      return createApiErrorResponse('Insufficient permissions. Required: atm:status', 403);
    }

    const { searchParams } = new URL(request.url);
    const atmCode = searchParams.get('atmCode');

    if (!atmCode) {
      return createApiErrorResponse('atmCode query parameter is required', 400);
    }

    // Find ATM with latest monitoring data
    const atm = await prisma.aTM.findUnique({
      where: { code: atmCode },
      include: {
        branch: {
          select: { name: true, code: true }
        },
        monitoringLogs: {
          orderBy: { checkedAt: 'desc' },
          take: 1
        },
        pingResults: {
          orderBy: { checkedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!atm) {
      return createApiErrorResponse(`ATM with code '${atmCode}' not found`, 404);
    }

    const latestLog = atm.monitoringLogs[0];
    const latestPing = atm.pingResults[0];

    return createApiSuccessResponse({
      success: true,
      atm: {
        id: atm.id,
        code: atm.code,
        name: atm.name,
        ipAddress: atm.ipAddress,
        networkMedia: atm.networkMedia,
        networkVendor: atm.networkVendor,
        location: atm.location,
        isActive: atm.isActive,
        branch: atm.branch
      },
      currentStatus: latestLog ? {
        status: latestLog.status,
        responseTime: latestLog.responseTime,
        errorMessage: latestLog.errorMessage,
        checkedAt: latestLog.checkedAt
      } : null,
      latestPing: latestPing ? {
        status: latestPing.status,
        responseTimeMs: latestPing.responseTimeMs,
        packetLoss: latestPing.packetLoss,
        avgRtt: latestPing.avgRtt,
        checkedAt: latestPing.checkedAt
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('ATM status query error:', error);
    return createApiErrorResponse('Internal server error', 500);
  }
}
