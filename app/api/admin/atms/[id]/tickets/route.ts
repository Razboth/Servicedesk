import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/atms/[id]/tickets
 * Fetch tickets related to a specific ATM (technical issues and claims)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all'; // 'technical', 'claim', 'all'
    const status = searchParams.get('status'); // filter by ticket status
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get ATM to retrieve code
    const atm = await prisma.aTM.findUnique({
      where: { id },
      select: { code: true, branchId: true }
    });

    if (!atm) {
      return NextResponse.json(
        { error: 'ATM not found' },
        { status: 404 }
      );
    }

    // Check access for non-admin users
    if (session.user.role !== 'ADMIN' && session.user.branchId !== atm.branchId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the atm_code field template
    const atmCodeField = await prisma.fieldTemplate.findFirst({
      where: { name: 'atm_code' }
    });

    if (!atmCodeField) {
      return NextResponse.json({
        technicalIssues: [],
        claims: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      });
    }

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

    let technicalIssues: any[] = [];
    let claims: any[] = [];
    let total = 0;

    // Build base where clause for tickets
    const baseWhere: any = {};
    if (status) {
      baseWhere.status = status;
    }

    if (type === 'technical' || type === 'all') {
      // Get technical issue tickets
      const techWhere = {
        ...baseWhere,
        serviceId: { in: techIssueServiceIds },
        fieldValues: {
          some: {
            fieldId: atmCodeField.id,
            value: atm.code
          }
        }
      };

      const techCount = await prisma.ticket.count({ where: techWhere });

      const techTickets = await prisma.ticket.findMany({
        where: techWhere,
        skip: type === 'technical' ? skip : 0,
        take: type === 'technical' ? limit : 5,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, name: true }
          },
          service: {
            select: { id: true, name: true }
          },
          fieldValues: {
            where: {
              field: {
                name: { in: ['daftar_error_atm', 'error_type'] }
              }
            },
            include: {
              field: { select: { name: true, label: true } }
            }
          }
        }
      });

      technicalIssues = techTickets.map(ticket => ({
        id: ticket.id,
        number: ticket.number,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        resolvedAt: ticket.resolvedAt,
        creator: ticket.creator,
        assignee: ticket.assignee,
        service: ticket.service,
        errorType: ticket.fieldValues.find(fv =>
          fv.field.name === 'daftar_error_atm' || fv.field.name === 'error_type'
        )?.value || null
      }));

      if (type === 'technical') {
        total = techCount;
      }
    }

    if (type === 'claim' || type === 'all') {
      // Get ATM claim tickets
      const claimWhere = {
        ...baseWhere,
        atmClaimVerification: { isNot: null },
        fieldValues: {
          some: {
            fieldId: atmCodeField.id,
            value: atm.code
          }
        }
      };

      const claimCount = await prisma.ticket.count({ where: claimWhere });

      const claimTickets = await prisma.ticket.findMany({
        where: claimWhere,
        skip: type === 'claim' ? skip : 0,
        take: type === 'claim' ? limit : 5,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, name: true }
          },
          service: {
            select: { id: true, name: true }
          },
          atmClaimVerification: {
            select: {
              id: true,
              recommendation: true,
              verifiedAt: true,
              cashVariance: true
            }
          },
          fieldValues: {
            where: {
              field: {
                name: { in: ['customer_name', 'transaction_amount', 'transaction_date'] }
              }
            },
            include: {
              field: { select: { name: true, label: true } }
            }
          }
        }
      });

      claims = claimTickets.map(ticket => ({
        id: ticket.id,
        number: ticket.number,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        resolvedAt: ticket.resolvedAt,
        creator: ticket.creator,
        assignee: ticket.assignee,
        service: ticket.service,
        verification: ticket.atmClaimVerification,
        customerName: ticket.fieldValues.find(fv => fv.field.name === 'customer_name')?.value || null,
        transactionAmount: ticket.fieldValues.find(fv => fv.field.name === 'transaction_amount')?.value || null,
        transactionDate: ticket.fieldValues.find(fv => fv.field.name === 'transaction_date')?.value || null
      }));

      if (type === 'claim') {
        total = claimCount;
      }
    }

    // Calculate total for 'all' type
    if (type === 'all') {
      total = technicalIssues.length + claims.length;
    }

    return NextResponse.json({
      technicalIssues,
      claims,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching ATM tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATM tickets' },
      { status: 500 }
    );
  }
}
