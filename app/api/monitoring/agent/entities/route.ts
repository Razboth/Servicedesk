import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey, checkApiPermission, createApiErrorResponse, createApiSuccessResponse } from '@/lib/auth-api';

/**
 * GET /api/monitoring/agent/entities
 * Return list of entities (branches and ATMs) for monitoring agent to ping
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated || !authResult.apiKey) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
    }

    // Check permission
    if (!checkApiPermission(authResult.apiKey, 'monitoring:read')) {
      return createApiErrorResponse('Insufficient permissions. Required: monitoring:read', 403);
    }

    // Fetch branches with IP address (monitoring enabled OR has IP)
    const branches = await prisma.branch.findMany({
      where: {
        isActive: true,
        ipAddress: { not: null }
      },
      select: {
        id: true,
        code: true,
        name: true,
        ipAddress: true,
        backupIpAddress: true,
        networkMedia: true,
        networkVendor: true
      },
      orderBy: { code: 'asc' }
    });

    // Fetch ATMs with IP address
    const atms = await prisma.aTM.findMany({
      where: {
        isActive: true,
        ipAddress: { not: null }
      },
      select: {
        id: true,
        code: true,
        name: true,
        ipAddress: true,
        networkMedia: true,
        networkVendor: true,
        branchId: true,
        branch: {
          select: {
            code: true,
            name: true
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    // Format entities for agent
    const entities = [
      ...branches.map(b => ({
        type: 'BRANCH' as const,
        id: b.id,
        code: b.code,
        name: b.name,
        ip_address: b.ipAddress!,
        backup_ip_address: b.backupIpAddress,
        network_media: b.networkMedia,
        network_vendor: b.networkVendor
      })),
      ...atms.map(a => ({
        type: 'ATM' as const,
        id: a.id,
        code: a.code,
        name: a.name,
        ip_address: a.ipAddress!,
        network_media: a.networkMedia,
        network_vendor: a.networkVendor,
        branch_id: a.branchId,
        branch_code: a.branch?.code,
        branch_name: a.branch?.name
      }))
    ];

    return createApiSuccessResponse({
      entities,
      total: entities.length,
      branches_count: branches.length,
      atms_count: atms.length,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Monitoring agent entities error:', error);
    return createApiErrorResponse('Failed to fetch entities', 500);
  }
}
