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

    // Check if user is a Call Center agent (USER or TECHNICIAN role with CALL_CENTER support group)
    const isCallCenterAgent = (session.user.role === 'USER' || session.user.role === 'TECHNICIAN') && user?.supportGroup?.code === 'CALL_CENTER';
    
    // Check if user is a Transaction Claims Support technician
    const isTransactionClaimsSupport = session.user.role === 'TECHNICIAN' && user?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';
    
    // Debug logging
    console.log('[ATM-CLAIMS API] User access check:', {
      userId: session.user.id,
      role: session.user.role,
      supportGroupCode: user?.supportGroup?.code,
      isCallCenterAgent,
      isTransactionClaimsSupport,
      hasBranch: !!user?.branchId
    });

    // Check if user has access
    if (!['MANAGER', 'ADMIN', 'USER', 'AGENT', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // For non-Call Center and non-Transaction Claims Support users, they must have a branch assigned
    if (!isCallCenterAgent && !isTransactionClaimsSupport && !user?.branchId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No branch assigned' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const source = searchParams.get('source'); // 'internal' or 'external'
    const claimType = searchParams.get('claimType'); // 'atm', 'payment', 'purchase'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query based on user's role and branch
    const where: any = {};
    
    // Call Center and Transaction Claims Support see all transaction-related claims
    if (isCallCenterAgent || isTransactionClaimsSupport) {
      // Use category-based filtering instead of name-based
      const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
      const ATM_SERVICES_CATEGORY_ID = 'cmekrqi3t001ghlusklheksqz';
      
      // Filter based on claim type
      if (claimType === 'payment') {
        // Show only payment-related claims from Transaction Claims category
        where.AND = [
          {
            OR: [
              { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
              { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
            ]
          },
          {
            OR: [
              { service: { name: { contains: 'Payment', mode: 'insensitive' } } },
              { service: { name: { contains: 'Pembayaran', mode: 'insensitive' } } },
              { title: { contains: 'payment', mode: 'insensitive' } },
              { title: { contains: 'pembayaran', mode: 'insensitive' } }
            ]
          }
        ];
      } else if (claimType === 'purchase') {
        // Show only purchase-related claims from Transaction Claims category
        where.AND = [
          {
            OR: [
              { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
              { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
            ]
          },
          {
            OR: [
              { service: { name: { contains: 'Purchase', mode: 'insensitive' } } },
              { service: { name: { contains: 'Pembelian', mode: 'insensitive' } } },
              { title: { contains: 'purchase', mode: 'insensitive' } },
              { title: { contains: 'pembelian', mode: 'insensitive' } }
            ]
          }
        ];
      } else {
        // Default: show all transaction claims
        where.OR = [
          // All tickets in Transaction Claims category
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          // Also check service's tier1CategoryId
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } },
          // Include ATM Services category
          { categoryId: ATM_SERVICES_CATEGORY_ID },
          { service: { tier1CategoryId: ATM_SERVICES_CATEGORY_ID } }
        ];
      }
      console.log('[ATM-CLAIMS API] Call Center/Transaction Claims Support - showing', claimType || 'all', 'claims');
    } else {
      // Regular users filter by claim type
      if (claimType === 'payment') {
        // Show payment-related claims for the branch
        const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
        where.AND = [
          {
            OR: [
              { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
              { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
            ]
          },
          {
            OR: [
              { service: { name: { contains: 'Payment', mode: 'insensitive' } } },
              { service: { name: { contains: 'Pembayaran', mode: 'insensitive' } } },
              { title: { contains: 'payment', mode: 'insensitive' } },
              { title: { contains: 'pembayaran', mode: 'insensitive' } }
            ]
          }
        ];
      } else if (claimType === 'purchase') {
        // Show purchase-related claims for the branch
        const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
        where.AND = [
          {
            OR: [
              { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
              { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
            ]
          },
          {
            OR: [
              { service: { name: { contains: 'Purchase', mode: 'insensitive' } } },
              { service: { name: { contains: 'Pembelian', mode: 'insensitive' } } },
              { title: { contains: 'purchase', mode: 'insensitive' } },
              { title: { contains: 'pembelian', mode: 'insensitive' } }
            ]
          }
        ];
      } else {
        // Default: show ATM Claims only - support both English and Indonesian spelling
        where.OR = [
          { service: { name: { contains: 'ATM Claim', mode: 'insensitive' } } },
          { service: { name: { contains: 'ATM Klaim', mode: 'insensitive' } } },
          { service: { name: { contains: 'Penarikan Tunai Internal', mode: 'insensitive' } } }
        ];
      }
    }

    // For non-admin, non-Call Center, and non-Transaction Claims Support users, filter by branch
    if (!isCallCenterAgent && !isTransactionClaimsSupport && user?.branchId) {
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
    // Call Center and Transaction Claims Support agents see all ATM claims regardless of branch

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
          service: { 
            select: { 
              name: true, 
              requiresApproval: true,
              tier1CategoryId: true,
              tier1Category: {
                select: { name: true }
              },
              category: {
                select: { name: true }
              }
            } 
          },
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
    const baseWhereForStats: any = {};
    
    // Apply same service filter as main query for statistics
    if (isCallCenterAgent || isTransactionClaimsSupport) {
      // Use category-based filtering for statistics too
      const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
      const ATM_SERVICES_CATEGORY_ID = 'cmekrqi3t001ghlusklheksqz';
      
      // Apply same claim type filter for stats
      if (claimType === 'payment') {
        baseWhereForStats.AND = [
          {
            OR: [
              { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
              { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
            ]
          },
          {
            OR: [
              { service: { name: { contains: 'Payment', mode: 'insensitive' } } },
              { service: { name: { contains: 'Pembayaran', mode: 'insensitive' } } },
              { title: { contains: 'payment', mode: 'insensitive' } },
              { title: { contains: 'pembayaran', mode: 'insensitive' } }
            ]
          }
        ];
      } else if (claimType === 'purchase') {
        baseWhereForStats.AND = [
          {
            OR: [
              { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
              { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
            ]
          },
          {
            OR: [
              { service: { name: { contains: 'Purchase', mode: 'insensitive' } } },
              { service: { name: { contains: 'Pembelian', mode: 'insensitive' } } },
              { title: { contains: 'purchase', mode: 'insensitive' } },
              { title: { contains: 'pembelian', mode: 'insensitive' } }
            ]
          }
        ];
      } else {
        baseWhereForStats.OR = [
          // All tickets in Transaction Claims category
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          // Also check service's tier1CategoryId
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } },
          // Include ATM Services category
          { categoryId: ATM_SERVICES_CATEGORY_ID },
          { service: { tier1CategoryId: ATM_SERVICES_CATEGORY_ID } }
        ];
      }
    } else {
      // Regular users stats filter by claim type
      if (claimType === 'payment') {
        const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
        baseWhereForStats.AND = [
          {
            OR: [
              { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
              { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
            ]
          },
          {
            OR: [
              { service: { name: { contains: 'Payment', mode: 'insensitive' } } },
              { service: { name: { contains: 'Pembayaran', mode: 'insensitive' } } },
              { title: { contains: 'payment', mode: 'insensitive' } },
              { title: { contains: 'pembayaran', mode: 'insensitive' } }
            ]
          }
        ];
      } else if (claimType === 'purchase') {
        const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
        baseWhereForStats.AND = [
          {
            OR: [
              { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
              { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
            ]
          },
          {
            OR: [
              { service: { name: { contains: 'Purchase', mode: 'insensitive' } } },
              { service: { name: { contains: 'Pembelian', mode: 'insensitive' } } },
              { title: { contains: 'purchase', mode: 'insensitive' } },
              { title: { contains: 'pembelian', mode: 'insensitive' } }
            ]
          }
        ];
      } else {
        // Default stats: show ATM Claims only - support both English and Indonesian spelling
        baseWhereForStats.OR = [
          { service: { name: { contains: 'ATM Claim', mode: 'insensitive' } } },
          { service: { name: { contains: 'ATM Klaim', mode: 'insensitive' } } },
          { service: { name: { contains: 'Penarikan Tunai Internal', mode: 'insensitive' } } }
        ];
      }
    }
    
    // Only apply branch filter for non-Call Center and non-Transaction Claims Support agents
    if (!isCallCenterAgent && !isTransactionClaimsSupport && user?.branchId) {
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
      !isCallCenterAgent && !isTransactionClaimsSupport && user?.branchId ? prisma.ticket.count({
        where: {
          ...baseWhereForStats,
          createdBy: { branchId: user.branchId }
        }
      }) : (isCallCenterAgent || isTransactionClaimsSupport) ? prisma.ticket.count({
        where: baseWhereForStats
      }) : 0,
      
      // External claims (from other branches)
      !isCallCenterAgent && !isTransactionClaimsSupport && user?.branchId ? prisma.ticket.count({
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
      customerEmail,
      transactionAmount,
      transactionDate,
      transactionRef,
      cardLast4,
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

    // Get ATM Claim service - support both English and Indonesian spelling
    const service = await prisma.service.findFirst({
      where: {
        OR: [
          { name: { contains: 'ATM Claim', mode: 'insensitive' } },
          { name: { contains: 'ATM Klaim', mode: 'insensitive' } },
          { name: { contains: 'Penarikan Tunai Internal', mode: 'insensitive' } }
        ],
        isActive: true
      },
      include: {
        fields: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!service) {
      return NextResponse.json({
        error: 'ATM Claim service not configured. Please ensure "Penarikan Tunai Internal - ATM Klaim" service exists and is active.'
      }, { status: 400 });
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

    // Get user's branch for reporting branch field
    const userBranch = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branch: { select: { name: true, code: true } } }
    });

    // Map form data to service field values
    const fieldValueMappings: Record<string, any> = {
      'atm_code': atmCode,
      'transaction_ref': transactionRef || '',
      'card_last_4': cardLast4,
      'customer_account': customerAccount,
      'customer_phone': customerPhone,
      'customer_email': customerEmail || '',
      'claim_type': claimType,
      'claim_description': claimDescription,
      'reporting_branch': userBranch?.branch ? `${userBranch.branch.code} - ${userBranch.branch.name}` : '',
      'owner_branch': `${atm.branch.code} - ${atm.branch.name}`,
      'reporting_channel': 'BRANCH_STAFF' // Default channel for branch-created claims
    };

    // Create field values for the ticket
    const fieldValues: any[] = [];
    for (const field of service.fields) {
      if (fieldValueMappings[field.name] !== undefined) {
        fieldValues.push({
          fieldId: field.id,
          value: String(fieldValueMappings[field.name])
        });
      }
    }

    // Create ticket with field values
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: `ATM Claim - ${claimType} - ${atmCode}`,
        description: `
**Customer Information:**
- Name: ${customerName}
- Account: ${customerAccount}
- Phone: ${customerPhone}
${customerEmail ? `- Email: ${customerEmail}` : ''}
${cardLast4 ? `- Card (Last 4): ${cardLast4}` : ''}

**Transaction Details:**
- Amount: Rp ${Number(transactionAmount).toLocaleString('id-ID')}
- Date: ${new Date(transactionDate).toLocaleString('id-ID')}
${transactionRef ? `- Reference: ${transactionRef}` : ''}
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
        category: 'SERVICE_REQUEST',
        fieldValues: fieldValues.length > 0 ? {
          create: fieldValues
        } : undefined
      },
      include: {
        service: true,
        branch: true,
        fieldValues: {
          include: {
            field: true
          }
        }
      }
    });

    // Create initial verification record
    await prisma.aTMClaimVerification.create({
      data: {
        ticketId: ticket.id
      }
    });

    // Create comment for inter-branch visibility
    if (userBranch?.branch && userBranch.branch.name && atm.branchId !== session.user.branchId) {
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