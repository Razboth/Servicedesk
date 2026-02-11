import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for creating/updating ATMs
const atmSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  branchId: z.string().min(1), // Changed from uuid() to allow CUID format
  ipAddress: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  networkMedia: z.enum(['VSAT', 'M2M', 'FO']).optional().nullable(),
  networkVendor: z.string().optional().nullable(),
  // New fields
  atmBrand: z.string().optional().nullable(),
  atmType: z.string().optional().nullable(),
  atmCategory: z.enum(['ATM', 'CRM']).optional().default('ATM'),
  serialNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
    // New filters
    const atmBrand = searchParams.get('atmBrand');
    const atmCategory = searchParams.get('atmCategory'); // 'ATM', 'CRM', or null for all
    const includeTicketCounts = searchParams.get('includeTicketCounts') === 'true';

    const skip = (page - 1) * limit;

    // Problem statuses for filtering
    const problemStatuses = ['OFFLINE', 'SLOW', 'TIMEOUT', 'ERROR', 'WARNING', 'MAINTENANCE'];

    // If problemsOnly, first get ATM IDs that have problems
    // ATMs without any NetworkMonitoringLog entry are treated as ONLINE (no problem)
    let problemAtmIds: string[] = [];
    if (problemsOnly) {
      // Get latest status for each ATM from NetworkMonitoringLog
      // Only ATMs that have been reported with a problem status will be shown
      const latestLogs = await prisma.$queryRaw<Array<{ entityId: string; status: string }>>`
        SELECT DISTINCT ON ("entityId") "entityId", "status"
        FROM "network_monitoring_logs"
        WHERE "entityType" = 'ATM'
        ORDER BY "entityId", "checkedAt" DESC
      `;

      // Only include ATMs that have explicit problem status
      // ATMs with ONLINE status or no status at all are NOT shown
      problemAtmIds = latestLogs
        .filter(log => problemStatuses.includes(log.status))
        .map(log => log.entityId);

      // If no ATMs have problems, return empty result immediately
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
        { location: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // New filters for brand and category
    if (atmBrand) {
      where.atmBrand = { equals: atmBrand, mode: 'insensitive' };
    }

    if (atmCategory === 'ATM' || atmCategory === 'CRM') {
      where.atmCategory = atmCategory;
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
        },
        // Include active network incidents
        networkIncidents: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] }
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            title: true,
            status: true,
            severity: true,
            createdAt: true,
            acknowledgedAt: true,
            resolvedAt: true
          }
        }
      }
    });

    // Add hasActiveIncident and activeIncident to all ATMs
    let atmsWithStatus = atms.map(atm => ({
      ...atm,
      hasActiveIncident: atm.networkIncidents.length > 0,
      activeIncident: atm.networkIncidents[0] || null
    }));
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
          networkStatus: statusMap.get(atm.id) || null,
          hasActiveIncident: atm.networkIncidents.length > 0,
          activeIncident: atm.networkIncidents[0] || null
        }));
      }
    }

    // If includeTicketCounts, fetch technical issues and claim counts for each ATM
    let atmsWithCounts = atmsWithStatus;
    if (includeTicketCounts) {
      const atmCodes = atms.map(atm => atm.code);

      if (atmCodes.length > 0) {
        // Get the custom field for atm_code
        const atmCodeField = await prisma.fieldTemplate.findFirst({
          where: { name: 'atm_code' }
        });

        // Get services for technical issues
        const techIssueServices = await prisma.service.findMany({
          where: {
            OR: [
              { name: { startsWith: 'ATM - Permasalahan Teknis' } },
              { name: { contains: 'ATM Technical Issue' } }
            ]
          },
          select: { id: true }
        });
        const techIssueServiceIds = techIssueServices.map(s => s.id);

        // Count technical issue tickets per ATM code
        const techIssueCountsMap = new Map<string, number>();
        const claimCountsMap = new Map<string, number>();

        if (atmCodeField) {
          // Get all field values with ATM codes
          const fieldValues = await prisma.ticketFieldValue.findMany({
            where: {
              fieldId: atmCodeField.id,
              value: { in: atmCodes }
            },
            include: {
              ticket: {
                select: {
                  id: true,
                  serviceId: true,
                  atmClaimVerification: { select: { id: true } }
                }
              }
            }
          });

          // Count tickets per ATM code
          fieldValues.forEach(fv => {
            const atmCode = fv.value;
            if (!atmCode) return;

            // Count technical issues
            if (techIssueServiceIds.includes(fv.ticket.serviceId || '')) {
              techIssueCountsMap.set(atmCode, (techIssueCountsMap.get(atmCode) || 0) + 1);
            }

            // Count claims (tickets with ATMClaimVerification)
            if (fv.ticket.atmClaimVerification) {
              claimCountsMap.set(atmCode, (claimCountsMap.get(atmCode) || 0) + 1);
            }
          });
        }

        atmsWithCounts = atmsWithStatus.map(atm => ({
          ...atm,
          _count: {
            ...atm._count,
            technicalIssueTickets: techIssueCountsMap.get(atm.code) || 0,
            claimTickets: claimCountsMap.get(atm.code) || 0
          }
        }));
      }
    }

    // Get distinct ATM brands for filter dropdown
    const distinctBrands = await prisma.aTM.findMany({
      where: { atmBrand: { not: null } },
      select: { atmBrand: true },
      distinct: ['atmBrand']
    });
    const brands = distinctBrands.map(b => b.atmBrand).filter(Boolean);

    return NextResponse.json({
      atms: atmsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        brands: brands as string[]
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
          atmBrand: atm.atmBrand,
          atmType: atm.atmType,
          atmCategory: atm.atmCategory,
          serialNumber: atm.serialNumber,
          notes: atm.notes,
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