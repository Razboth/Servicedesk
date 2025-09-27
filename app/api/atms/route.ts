import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey, checkApiPermission, createApiErrorResponse, createApiSuccessResponse } from '@/lib/auth-api';

/**
 * GET /api/atms
 * Fetch all ATMs with basic information (code, name, branch)
 * Requires API key with 'atms:read' permission
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
    }

    // Check permissions
    if (!checkApiPermission(authResult.apiKey!, 'atms:read')) {
      return createApiErrorResponse('Insufficient permissions to read ATM data', 403);
    }

    // Fetch all ATMs with essential fields only
    const atms = await prisma.aTM.findMany({
      select: {
        code: true,
        name: true,
        branch: {
          select: {
            code: true,
            name: true
          }
        }
      },
      orderBy: [
        { branch: { code: 'asc' } },
        { code: 'asc' }
      ]
    });

    // Transform data to a clean format
    const atmList = atms.map(atm => ({
      code: atm.code,
      name: atm.name,
      branchCode: atm.branch?.code || null,
      branchName: atm.branch?.name || null
    }));

    return createApiSuccessResponse({
      atms: atmList,
      total: atmList.length,
      message: 'ATMs retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching ATMs:', error);
    return createApiErrorResponse('Failed to fetch ATM data', 500);
  }
}