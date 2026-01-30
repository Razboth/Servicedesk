import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/atms/code/[code]/tickets
 * Fetch tickets related to a specific ATM by code (technical issues and claims)
 */
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

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all'; // 'technical', 'claim', 'all'
    const status = searchParams.get('status'); // filter by ticket status
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get ATM to verify it exists and get branchId
    const atm = await prisma.aTM.findUnique({
      where: { code },
      select: { id: true, code: true, branchId: true, name: true }
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

    // Get the atm_code field template - try multiple possible names
    const atmCodeField = await prisma.fieldTemplate.findFirst({
      where: {
        OR: [
          { name: 'atm_code' },
          { name: 'kode_atm' },
          { name: 'atmCode' },
          { label: { contains: 'ATM', mode: 'insensitive' } }
        ]
      }
    });

    console.log('[ATM Tickets] ATM Code Field:', atmCodeField?.id, atmCodeField?.name);

    let technicalIssues: any[] = [];
    let claims: any[] = [];
    let total = 0;

    // Build base where clause for tickets
    const baseWhere: any = {};
    if (status) {
      baseWhere.status = status;
    }

    // Get services for technical issues - more flexible matching
    const techIssueServices = await prisma.service.findMany({
      where: {
        OR: [
          { name: { startsWith: 'ATM - Permasalahan Teknis' } },
          { name: { contains: 'ATM Technical Issue', mode: 'insensitive' } },
          { name: { contains: 'Permasalahan Teknis ATM', mode: 'insensitive' } },
          { name: { contains: 'ATM Issue', mode: 'insensitive' } }
        ]
      },
      select: { id: true, name: true }
    });
    const techIssueServiceIds = techIssueServices.map(s => s.id);
    console.log('[ATM Tickets] Technical Issue Services:', techIssueServices.map(s => s.name));

    // Get services for claims - more flexible matching
    const claimServices = await prisma.service.findMany({
      where: {
        OR: [
          { name: { contains: 'ATM Claim', mode: 'insensitive' } },
          { name: { contains: 'ATM Klaim', mode: 'insensitive' } },
          { name: { contains: 'Selisih ATM', mode: 'insensitive' } },
          { name: { contains: 'Penarikan Tunai Internal', mode: 'insensitive' } },
          { name: { contains: 'Transaction Claim', mode: 'insensitive' } }
        ]
      },
      select: { id: true, name: true }
    });
    const claimServiceIds = claimServices.map(s => s.id);
    console.log('[ATM Tickets] Claim Services:', claimServices.map(s => s.name));

    // Build the ATM code matching condition
    // The field value might be just the code or include additional info like "2005 - ATM Name"
    const atmCodeMatchCondition = atmCodeField ? {
      fieldValues: {
        some: {
          fieldId: atmCodeField.id,
          OR: [
            { value: atm.code },
            { value: { startsWith: atm.code + ' ' } },
            { value: { startsWith: atm.code + '-' } },
            { value: { contains: atm.code } }
          ]
        }
      }
    } : {};

    // Also check title for ATM code reference
    const titleMatchCondition = {
      OR: [
        { title: { contains: atm.code } },
        { title: { contains: `ATM ${atm.code}` } },
        { description: { contains: atm.code } }
      ]
    };

    if (type === 'technical' || type === 'all') {
      // Get technical issue tickets - match by field value OR title/description
      const techWhere = {
        ...baseWhere,
        serviceId: { in: techIssueServiceIds },
        OR: [
          atmCodeMatchCondition.fieldValues ? { fieldValues: atmCodeMatchCondition.fieldValues } : {},
          ...titleMatchCondition.OR
        ].filter(c => Object.keys(c).length > 0)
      };

      // If no matching conditions, use field values only
      if (!techWhere.OR || techWhere.OR.length === 0) {
        delete techWhere.OR;
        if (atmCodeMatchCondition.fieldValues) {
          Object.assign(techWhere, { fieldValues: atmCodeMatchCondition.fieldValues });
        }
      }

      console.log('[ATM Tickets] Technical Issues Query:', JSON.stringify(techWhere, null, 2));

      const techCount = techIssueServiceIds.length > 0 ? await prisma.ticket.count({ where: techWhere }) : 0;

      const techTickets = techIssueServiceIds.length > 0 ? await prisma.ticket.findMany({
        where: techWhere,
        skip: type === 'technical' ? skip : 0,
        take: type === 'technical' ? limit : 50,
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
            include: {
              field: { select: { name: true, label: true } }
            }
          }
        }
      }) : [];

      console.log('[ATM Tickets] Found technical tickets:', techTickets.length);

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
          fv.field.name === 'daftar_error_atm' ||
          fv.field.name === 'error_type' ||
          fv.field.label.toLowerCase().includes('error')
        )?.value || null
      }));

      if (type === 'technical') {
        total = techCount;
      }
    }

    if (type === 'claim' || type === 'all') {
      // Get ATM claim tickets - match by service name OR atmClaimVerification OR field values
      const claimWhere = {
        ...baseWhere,
        OR: [
          // Match by claim service
          claimServiceIds.length > 0 ? {
            serviceId: { in: claimServiceIds },
            ...(atmCodeMatchCondition.fieldValues ? { fieldValues: atmCodeMatchCondition.fieldValues } : {})
          } : null,
          // Match by atmClaimVerification existing
          {
            atmClaimVerification: { isNot: null },
            ...(atmCodeMatchCondition.fieldValues ? { fieldValues: atmCodeMatchCondition.fieldValues } : {})
          },
          // Match by title/description containing ATM code for claims
          claimServiceIds.length > 0 ? {
            serviceId: { in: claimServiceIds },
            OR: titleMatchCondition.OR
          } : null
        ].filter(Boolean)
      };

      console.log('[ATM Tickets] Claims Query:', JSON.stringify(claimWhere, null, 2));

      const claimCount = claimWhere.OR && claimWhere.OR.length > 0
        ? await prisma.ticket.count({ where: claimWhere })
        : 0;

      const claimTickets = claimWhere.OR && claimWhere.OR.length > 0
        ? await prisma.ticket.findMany({
            where: claimWhere,
            skip: type === 'claim' ? skip : 0,
            take: type === 'claim' ? limit : 50,
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
                include: {
                  field: { select: { name: true, label: true } }
                }
              }
            }
          })
        : [];

      console.log('[ATM Tickets] Found claim tickets:', claimTickets.length);

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
        customerName: ticket.fieldValues.find(fv =>
          fv.field.name === 'customer_name' ||
          fv.field.name === 'nama_nasabah' ||
          fv.field.label.toLowerCase().includes('nasabah') ||
          fv.field.label.toLowerCase().includes('customer')
        )?.value || null,
        transactionAmount: ticket.fieldValues.find(fv =>
          fv.field.name === 'transaction_amount' ||
          fv.field.name === 'nominal' ||
          fv.field.label.toLowerCase().includes('nominal') ||
          fv.field.label.toLowerCase().includes('amount')
        )?.value || null,
        transactionDate: ticket.fieldValues.find(fv =>
          fv.field.name === 'transaction_date' ||
          fv.field.name === 'tanggal_transaksi' ||
          fv.field.label.toLowerCase().includes('tanggal transaksi')
        )?.value || null
      }));

      if (type === 'claim') {
        total = claimCount;
      }
    }

    // Calculate total for 'all' type
    if (type === 'all') {
      total = technicalIssues.length + claims.length;
    }

    console.log('[ATM Tickets] Response:', {
      atmCode: atm.code,
      technicalIssuesCount: technicalIssues.length,
      claimsCount: claims.length
    });

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
