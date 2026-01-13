import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for creating/updating ATMs
const atmSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  branchId: z.string().min(1), // Changed from uuid() to allow CUID format
  ipAddress: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  networkMedia: z.enum(['VSAT', 'M2M', 'FO']).optional(),
  networkVendor: z.string().optional(),
  isActive: z.boolean().optional()
});

// GET /api/admin/atms - List all ATMs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status'); // 'active', 'inactive', or null for all
    const sortBy = searchParams.get('sortBy') || 'code';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const problemsOnly = searchParams.get('problemsOnly') === 'true';
    const includeNetworkStatus = searchParams.get('includeNetworkStatus') === 'true';

    const skip = (page - 1) * limit;

    // Problem statuses for filtering
    const problemStatuses = ['OFFLINE', 'SLOW', 'TIMEOUT', 'ERROR', 'WARNING', 'MAINTENANCE'];

    // If problemsOnly, first get ATM IDs that have problems
    let problemAtmIds: string[] = [];
    if (problemsOnly) {
      // Get latest status for each ATM from NetworkMonitoringLog
      const latestLogs = await prisma.$queryRaw<Array<{ entityId: string; status: string }>>`
        SELECT DISTINCT ON ("entityId") "entityId", "status"
        FROM "network_monitoring_logs"
        WHERE "entityType" = 'ATM'
        ORDER BY "entityId", "checkedAt" DESC
      `;

      problemAtmIds = latestLogs
        .filter(log => problemStatuses.includes(log.status))
        .map(log => log.entityId);

      // If no ATMs have problems, return empty result
      if (problemAtmIds.length === 0) {
        return NextResponse.json({
          atms: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        });
      }
    }

    // Build where clause
    const where: any = {};

    // Filter by branch for non-admin users
    if (session.user.role !== 'ADMIN' && session.user.branchId) {
      where.branchId = session.user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Filter by problem ATMs if problemsOnly
    if (problemsOnly && problemAtmIds.length > 0) {
      where.id = { in: problemAtmIds };
    }

    // Get total count
    const total = await prisma.aTM.count({ where });

    // Get ATMs with related data
    const atms = await prisma.aTM.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            incidents: true
          }
        }
      }
    });

    // If includeNetworkStatus, fetch latest network status for each ATM
    let atmsWithStatus = atms;
    if (includeNetworkStatus || problemsOnly) {
      const atmIds = atms.map(atm => atm.id);

      if (atmIds.length > 0) {
        const networkLogs = await prisma.networkMonitoringLog.findMany({
          where: {
            entityType: 'ATM',
            entityId: { in: atmIds }
          },
          orderBy: { checkedAt: 'desc' }
        });

        // Create a map of latest status for each ATM
        const statusMap = new Map();
        networkLogs.forEach(log => {
          if (!statusMap.has(log.entityId)) {
            statusMap.set(log.entityId, {
              networkStatus: log.status,
              responseTimeMs: log.responseTimeMs,
              packetLoss: log.packetLoss,
              errorMessage: log.errorMessage,
              checkedAt: log.checkedAt,
              statusChangedAt: log.statusChangedAt,
              downSince: log.downSince
            });
          }
        });

        atmsWithStatus = atms.map(atm => ({
          ...atm,
          networkStatus: statusMap.get(atm.id) || null
        }));
      }
    }

    return NextResponse.json({
      atms: atmsWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching ATMs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch ATMs',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error as any).stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/atms - Create new ATM
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = atmSchema.parse(body);

    // Check if ATM code already exists
    const existingATM = await prisma.aTM.findUnique({
      where: { code: validatedData.code }
    });

    if (existingATM) {
      return NextResponse.json(
        { error: 'ATM code already exists' },
        { status: 400 }
      );
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: validatedData.branchId }
    });

    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 400 }
      );
    }

    // Create ATM
    const atm = await prisma.aTM.create({
      data: {
        ...validatedData,
        isActive: validatedData.isActive !== false
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'ATM',
        entityId: atm.id,
        newValues: {
          name: atm.name,
          code: atm.code,
          branchId: atm.branchId,
          location: atm.location,
          ipAddress: atm.ipAddress,
          isActive: atm.isActive
        }
      }
    });

    return NextResponse.json(atm, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating ATM:', error);
    return NextResponse.json(
      { error: 'Failed to create ATM' },
      { status: 500 }
    );
  }
}