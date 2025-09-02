import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/branch/atm-claims - List ATM claims for branch
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's details including support group
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        branchId: true, 
        role: true,
        supportGroup: {
          select: { code: true }
        }
      }
    });

    // Check if user is a Call Center technician
    const isCallCenterAgent = session.user.role === 'TECHNICIAN' && user?.supportGroup?.code === 'CALL_CENTER';

    // Check if user has access
    if (!['MANAGER', 'ADMIN', 'USER', 'AGENT', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // For non-Call Center users, they must have a branch assigned
    if (!isCallCenterAgent && !user?.branchId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No branch assigned' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const source = searchParams.get('source'); // 'internal' or 'external'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query based on user's role and branch
    const where: any = {
      service: {
        name: { contains: 'ATM Claim' }
      }
    };

    // For non-admin and non-Call Center users, filter by branch
    if (!isCallCenterAgent && user?.branchId) {
      if (source === 'internal') {
        // Claims from own branch
        where.AND = [
          { branchId: user.branchId },
          { createdBy: { branchId: user.branchId } }
        ];
      } else if (source === 'external') {
        // Claims from other branches for our ATMs
        where.AND = [
          { branchId: user.branchId },
          { createdBy: { branchId: { not: user.branchId } } }
        ];
      } else {
        // All claims for branch's ATMs
        where.branchId = user.branchId;
      }
    }
    // Call Center agents see all ATM claims regardless of branch

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    // Fetch claims with pagination
    const [claims, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          service: { select: { name: true, requiresApproval: true } },
          branch: { select: { name: true, code: true } },
          createdBy: {
            select: {
              name: true,
              email: true,
              branch: { select: { name: true, code: true } }
            }
          },
          assignedTo: { select: { name: true, email: true } },
          atmClaimVerification: true,
          branchAssignments: {
            include: {
              assignedTo: { select: { name: true } },
              assignedBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
          },
          approvals: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: {
              comments: true,
              attachments: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.ticket.count({ where })
    ]);

    // Get overall statistics for the branch (not filtered by tab/source)
    const baseWhereForStats: any = {
      service: {
        name: { contains: 'ATM Claim' }
      }
    };
    
    // Only apply branch filter for non-Call Center agents
    if (!isCallCenterAgent && user?.branchId) {
      baseWhereForStats.branchId = user.branchId;
    }

    // Calculate statistics separately for each context
    const [
      totalClaims,
      internalClaims,
      externalClaims,
      allPendingVerifications,
      internalPendingVerifications,
      externalPendingVerifications
    ] = await Promise.all([
      // Total claims for the branch
      prisma.ticket.count({ where: baseWhereForStats }),
      
      // Internal claims (from same branch)
      !isCallCenterAgent && user?.branchId ? prisma.ticket.count({
        where: {
          ...baseWhereForStats,
          createdBy: { branchId: user.branchId }
        }
      }) : isCallCenterAgent ? prisma.ticket.count({
        where: baseWhereForStats
      }) : 0,
      
      // External claims (from other branches)
      !isCallCenterAgent && user?.branchId ? prisma.ticket.count({
        where: {
          ...baseWhereForStats,
          createdBy: { branchId: { not: user.branchId } }
        }
      }) : 0,
      
      // All pending verifications
      prisma.ticket.count({
        where: {
          ...baseWhereForStats,
          OR: [
            { atmClaimVerification: null },
            { atmClaimVerification: { verifiedAt: null } }
          ]
        }
      }),
      
      // Internal pending verifications
      user?.branchId ? prisma.ticket.count({
        where: {
          ...baseWhereForStats,
          createdBy: { branchId: user.branchId },
          OR: [
            { atmClaimVerification: null },
            { atmClaimVerification: { verifiedAt: null } }
          ]
        }
      }) : 0,
      
      // External pending verifications
      user?.branchId ? prisma.ticket.count({
        where: {
          ...baseWhereForStats,
          createdBy: { branchId: { not: user.branchId } },
          OR: [
            { atmClaimVerification: null },
            { atmClaimVerification: { verifiedAt: null } }
          ]
        }
      }) : 0
    ]);

    // Get status breakdown
    const stats = await prisma.ticket.groupBy({
      by: ['status'],
      where: baseWhereForStats,
      _count: true
    });

    // Determine which pending verification count to return based on current filter
    let pendingVerificationsForTab = allPendingVerifications;
    if (source === 'internal') {
      pendingVerificationsForTab = internalPendingVerifications;
    } else if (source === 'external') {
      pendingVerificationsForTab = externalPendingVerifications;
    }

    return NextResponse.json({
      claims,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      statistics: {
        total: totalClaims,
        byStatus: stats,
        pendingVerifications: pendingVerificationsForTab,
        fromOtherBranches: externalClaims,
        // Additional breakdown for UI
        breakdown: {
          internal: {
            total: internalClaims,
            pendingVerifications: internalPendingVerifications
          },
          external: {
            total: externalClaims,
            pendingVerifications: externalPendingVerifications
          },
          all: {
            total: totalClaims,
            pendingVerifications: allPendingVerifications
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching branch ATM claims:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATM claims' },
      { status: 500 }
    );
  }
}

// POST /api/branch/atm-claims - Create new ATM claim (CS/Teller)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      atmCode, 
      customerName, 
      customerAccount,
      customerPhone,
      transactionAmount,
      transactionDate,
      claimType,
      claimDescription
    } = body;

    // Find ATM and its branch
    const atm = await prisma.aTM.findUnique({
      where: { code: atmCode },
      include: { branch: true }
    });

    if (!atm) {
      return NextResponse.json({ error: 'ATM not found' }, { status: 404 });
    }

    // Get ATM Claim service
    const service = await prisma.service.findFirst({
      where: { name: { contains: 'ATM Claim' } }
    });

    if (!service) {
      return NextResponse.json({ error: 'ATM Claim service not configured' }, { status: 400 });
    }

    // Generate ticket number - use standard format TKT-YYYY-000000
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);
    
    const yearTicketCount = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: yearStart,
          lt: yearEnd
        }
      }
    });
    
    const ticketNumber = `TKT-${currentYear}-${String(yearTicketCount + 1).padStart(6, '0')}`;

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: `ATM Claim - ${claimType} - ${atmCode}`,
        description: `
**Customer Information:**
- Name: ${customerName}
- Account: ${customerAccount}
- Phone: ${customerPhone}

**Transaction Details:**
- Amount: Rp ${Number(transactionAmount).toLocaleString('id-ID')}
- Date: ${new Date(transactionDate).toLocaleString('id-ID')}
- ATM: ${atmCode} - ${atm.location}

**Claim Details:**
${claimDescription}
        `,
        serviceId: service.id,
        categoryId: service.categoryId!,
        priority: transactionAmount > 1000000 ? 'HIGH' : 'MEDIUM',
        status: service.requiresApproval ? 'PENDING_APPROVAL' : 'OPEN',
        createdById: session.user.id,
        branchId: atm.branchId, // Route to ATM owner branch
        category: 'SERVICE_REQUEST'
      }
    });

    // Create initial verification record
    await prisma.aTMClaimVerification.create({
      data: {
        ticketId: ticket.id
      }
    });

    // Create comment for inter-branch visibility
    const userBranch = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branch: true }
    });

    if (userBranch?.branch?.id !== atm.branchId) {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          userId: session.user.id,
          content: `Klaim dibuat oleh Cabang ${userBranch?.branch?.name || 'Unknown'} untuk ATM milik Cabang ${atm.branch.name}`,
          isInternal: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      ticket,
      routing: {
        isInterBranch: userBranch?.branch?.id !== atm.branchId,
        fromBranch: userBranch?.branch?.name,
        toBranch: atm.branch.name
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating ATM claim:', error);
    return NextResponse.json(
      { error: 'Failed to create ATM claim' },
      { status: 500 }
    );
  }
}