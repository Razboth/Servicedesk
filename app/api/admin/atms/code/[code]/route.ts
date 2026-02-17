import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for updating ATMs
const updateATMSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  branchId: z.string().min(1).optional(),
  ipAddress: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  networkMedia: z.enum(['VSAT', 'M2M', 'FO']).optional().nullable(),
  networkVendor: z.string().optional().nullable(),
  atmBrand: z.string().optional().nullable(),
  atmType: z.string().optional().nullable(),
  atmCategory: z.enum(['ATM', 'CRM']).optional(),
  serialNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

// GET /api/admin/atms/code/[code] - Get single ATM details by code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const atm = await prisma.aTM.findUnique({
      where: { code },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true
          }
        },
        incidents: {
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            type: true,
            severity: true,
            description: true,
            createdAt: true
          }
        },
        monitoringLogs: {
          orderBy: { checkedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            responseTime: true,
            errorMessage: true,
            checkedAt: true
          }
        }
      }
    });

    if (!atm) {
      return NextResponse.json(
        { error: 'ATM not found' },
        { status: 404 }
      );
    }

    // Check access for non-admin users
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.branchId !== atm.branchId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get latest network status
    const networkStatus = await prisma.networkMonitoringLog.findFirst({
      where: {
        entityType: 'ATM',
        entityId: atm.id
      },
      orderBy: { checkedAt: 'desc' }
    });

    // Get ALL atm_code fields from BOTH FieldTemplate AND ServiceField tables
    const [fieldTemplates, serviceFields] = await Promise.all([
      prisma.fieldTemplate.findMany({
        where: {
          OR: [
            { name: 'atm_code' },
            { name: 'kode_atm' },
            { name: 'atmCode' },
            { label: { contains: 'Kode ATM', mode: 'insensitive' } },
            { label: { contains: 'Terminal ID', mode: 'insensitive' } }
          ]
        },
        select: { id: true }
      }),
      prisma.serviceField.findMany({
        where: {
          OR: [
            { name: 'atm_code' },
            { name: 'kode_atm' },
            { name: 'atmCode' },
            { label: { contains: 'Kode ATM', mode: 'insensitive' } },
            { label: { contains: 'Terminal ID', mode: 'insensitive' } }
          ]
        },
        select: { id: true }
      })
    ]);
    const atmCodeFieldIds = [
      ...fieldTemplates.map(f => f.id),
      ...serviceFields.map(f => f.id)
    ];

    let technicalIssueCount = 0;
    let claimCount = 0;

    // Get services for technical issues
    const techIssueServices = await prisma.service.findMany({
      where: {
        OR: [
          { name: { startsWith: 'ATM - Permasalahan Teknis' } },
          { name: { contains: 'ATM Technical Issue', mode: 'insensitive' } },
          { name: { contains: 'Permasalahan Teknis ATM', mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    });
    const techIssueServiceIds = techIssueServices.map(s => s.id);

    // Get services for claims
    const claimServices = await prisma.service.findMany({
      where: {
        OR: [
          { name: { contains: 'ATM Claim', mode: 'insensitive' } },
          { name: { contains: 'ATM Klaim', mode: 'insensitive' } },
          { name: { contains: 'Selisih ATM', mode: 'insensitive' } },
          { name: { contains: 'Penarikan Tunai Internal', mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    });
    const claimServiceIds = claimServices.map(s => s.id);

    // Build ATM code match conditions for ALL field IDs
    const atmCodeMatchConditions: any[] = [];
    atmCodeFieldIds.forEach(fieldId => {
      atmCodeMatchConditions.push(
        { fieldId, value: atm.code },
        { fieldId, value: { startsWith: atm.code + ' ' } },
        { fieldId, value: { startsWith: atm.code + '-' } },
        { fieldId, value: { contains: atm.code } }
      );
    });

    // Count technical issues
    if (techIssueServiceIds.length > 0) {
      technicalIssueCount = await prisma.ticket.count({
        where: {
          serviceId: { in: techIssueServiceIds },
          OR: [
            ...(atmCodeMatchConditions.length > 0 ? [{
              fieldValues: { some: { OR: atmCodeMatchConditions } }
            }] : []),
            { title: { contains: atm.code } },
            { description: { contains: atm.code } }
          ]
        }
      });
    }

    // Count claims - match by atmClaimVerification, claim services, or any service with "Claim"/"Selisih" in name
    const claimCountConditions: any[] = [];

    // Match by atmClaimVerification with ATM code in field values
    if (atmCodeMatchConditions.length > 0) {
      claimCountConditions.push({
        atmClaimVerification: { isNot: null },
        fieldValues: { some: { OR: atmCodeMatchConditions } }
      });
    }

    // Match by atmClaimVerification with ATM code in title/description
    claimCountConditions.push({
      atmClaimVerification: { isNot: null },
      OR: [
        { title: { contains: atm.code } },
        { description: { contains: atm.code } }
      ]
    });

    // Match by claim service with ATM code
    if (claimServiceIds.length > 0 && atmCodeMatchConditions.length > 0) {
      claimCountConditions.push({
        serviceId: { in: claimServiceIds },
        fieldValues: { some: { OR: atmCodeMatchConditions } }
      });
    }

    // Match by claim service with ATM code in title/description
    if (claimServiceIds.length > 0) {
      claimCountConditions.push({
        serviceId: { in: claimServiceIds },
        OR: [
          { title: { contains: atm.code } },
          { description: { contains: atm.code } }
        ]
      });
    }

    // Match any ticket with ATM code field AND service name containing "Claim" or "Selisih"
    if (atmCodeMatchConditions.length > 0) {
      claimCountConditions.push({
        fieldValues: { some: { OR: atmCodeMatchConditions } },
        service: { name: { contains: 'Claim', mode: 'insensitive' } }
      });
      claimCountConditions.push({
        fieldValues: { some: { OR: atmCodeMatchConditions } },
        service: { name: { contains: 'Selisih', mode: 'insensitive' } }
      });
      claimCountConditions.push({
        fieldValues: { some: { OR: atmCodeMatchConditions } },
        service: { name: { contains: 'Penarikan Tunai', mode: 'insensitive' } }
      });
    }

    if (claimCountConditions.length > 0) {
      claimCount = await prisma.ticket.count({
        where: {
          OR: claimCountConditions.filter(c => Object.keys(c).length > 0)
        }
      });
    }

    return NextResponse.json({
      ...atm,
      networkStatus: networkStatus ? {
        status: networkStatus.status,
        responseTimeMs: networkStatus.responseTimeMs,
        packetLoss: networkStatus.packetLoss,
        errorMessage: networkStatus.errorMessage,
        checkedAt: networkStatus.checkedAt,
        statusChangedAt: networkStatus.statusChangedAt,
        downSince: networkStatus.downSince
      } : null,
      _count: {
        incidents: atm.incidents.length,
        technicalIssueTickets: technicalIssueCount,
        claimTickets: claimCount
      }
    });
  } catch (error) {
    console.error('Error fetching ATM:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATM' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/atms/code/[code] - Update ATM by code
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const session = await auth();

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find ATM by code first
    const existingATM = await prisma.aTM.findUnique({
      where: { code }
    });

    if (!existingATM) {
      return NextResponse.json(
        { error: 'ATM not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateATMSchema.parse(body);

    // If updating code, check if the new code already exists
    if (validatedData.code && validatedData.code !== code) {
      const duplicateATM = await prisma.aTM.findFirst({
        where: {
          code: validatedData.code,
          NOT: { id: existingATM.id }
        }
      });

      if (duplicateATM) {
        return NextResponse.json(
          { error: 'ATM code already exists' },
          { status: 400 }
        );
      }
    }

    // If updating branch, verify it exists
    if (validatedData.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: validatedData.branchId }
      });

      if (!branch) {
        return NextResponse.json(
          { error: 'Branch not found' },
          { status: 400 }
        );
      }
    }

    const atm = await prisma.aTM.update({
      where: { code },
      data: validatedData,
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
        action: 'UPDATE',
        entity: 'ATM',
        entityId: atm.id,
        newValues: validatedData
      }
    });

    return NextResponse.json(atm);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating ATM:', error);
    return NextResponse.json(
      { error: 'Failed to update ATM' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/atms/code/[code] - Hard delete ATM by code
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    console.log('DELETE ATM Request - Code:', code);

    if (!code || code === 'undefined' || code === 'null') {
      console.log('Invalid code provided:', code);
      return NextResponse.json(
        { error: 'Invalid ATM code provided' },
        { status: 400 }
      );
    }

    const session = await auth();

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if ATM exists and has active incidents
    const atm = await prisma.aTM.findUnique({
      where: { code },
      include: {
        _count: {
          select: {
            incidents: { where: { status: 'OPEN' } }
          }
        }
      }
    });

    if (!atm) {
      return NextResponse.json(
        { error: 'ATM not found' },
        { status: 404 }
      );
    }

    if (atm._count.incidents > 0) {
      return NextResponse.json(
        { error: 'Cannot delete ATM with open incidents' },
        { status: 400 }
      );
    }

    // Store ATM details for audit log before deletion
    const atmDetails = `${atm.name} (${atm.code})`;

    // Create audit log BEFORE deletion
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'ATM',
        entityId: atm.id,
        oldValues: {
          name: atm.name,
          code: atm.code,
          branchId: atm.branchId,
          isActive: atm.isActive
        }
      }
    });

    // Hard delete the ATM
    await prisma.aTM.delete({
      where: { code }
    });

    console.log('ATM permanently deleted:', code);

    return NextResponse.json({
      success: true,
      message: 'ATM permanently deleted from database',
      deletedCode: code,
      deletedName: atmDetails
    });
  } catch (error: any) {
    console.error('Error deleting ATM:', error);

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete ATM: It has related records that must be removed first' },
        { status: 400 }
      );
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'ATM not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete ATM',
        details: error.message || 'Unknown error occurred',
        code: error.code
      },
      { status: 500 }
    );
  }
}
