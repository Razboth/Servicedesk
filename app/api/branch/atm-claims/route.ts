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

    // Check if user is a branch manager or staff
    if (!['MANAGER', 'ADMIN', 'USER', 'AGENT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user's branch
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true, role: true }
    });

    if (!user?.branchId && session.user.role !== 'ADMIN') {
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

    // For non-admin users, filter by branch
    if (user?.branchId) {
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

    // Get summary statistics
    const stats = await prisma.ticket.groupBy({
      by: ['status'],
      where: user?.branchId ? { branchId: user.branchId } : {},
      _count: true
    });

    const pendingVerifications = await prisma.ticket.count({
      where: {
        ...where,
        atmClaimVerification: {
          verifiedAt: null
        }
      }
    });

    return NextResponse.json({
      claims,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      statistics: {
        total,
        byStatus: stats,
        pendingVerifications,
        fromOtherBranches: user?.branchId ? await prisma.ticket.count({
          where: {
            branchId: user.branchId,
            createdBy: { branchId: { not: user.branchId } }
          }
        }) : 0
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

    // Generate ticket number
    const today = new Date();
    const ticketCount = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0))
        }
      }
    });
    const ticketNumber = `CLM-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${String(ticketCount + 1).padStart(4, '0')}`;

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