import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateBusinessHours } from '@/lib/sla-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // Filters
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const tier1CategoryId = searchParams.get('tier1CategoryId');
    const tier2SubcategoryId = searchParams.get('tier2SubcategoryId');
    const tier3ItemId = searchParams.get('tier3ItemId');
    const technicianId = searchParams.get('technicianId');
    const branchId = searchParams.get('branchId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchTerm = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause based on user role
    const whereClause: any = {};

    // Track if user has special category access (to skip category filter later)
    const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
    const ATM_SERVICES_CATEGORY_ID = 'cmekrqi3t001ghlusklheksqz';
    let skipCategoryFilter = false;

    // Fetch user with support group ONCE (used for role checks and ATM exclusion)
    const userWithGroup = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { supportGroup: true, branch: true }
    });

    // Role-based filtering - use AND to ensure search is scoped within user access
    if (session.user.role === 'USER') {

      // Check if this is a Call Center user
      const isCallCenterUser = userWithGroup?.supportGroup?.code === 'CALL_CENTER';

      if (isCallCenterUser) {
        // Call Center users can see:
        // 1. Their own created tickets (all types)
        // 2. ALL tickets in Transaction Claims category
        whereClause.OR = [
          // Their own tickets
          { createdById: session.user.id },
          // All tickets in Transaction Claims category
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          // Also check service's tier1CategoryId
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
        ];
        // Skip category filter if filtering by Transaction Claims
        if (tier1CategoryId === TRANSACTION_CLAIMS_CATEGORY_ID) {
          skipCategoryFilter = true;
        }
      } else {
        // Regular users see only their own tickets
        whereClause.createdById = session.user.id;
      }
    } else if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      // Check if this is a Call Center technician
      const isCallCenterTech = userWithGroup?.supportGroup?.code === 'CALL_CENTER';

      // Check if this is a Transaction Claims Support technician
      const isTransactionClaimsSupport = userWithGroup?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';

      if (isCallCenterTech) {
        // Call Center technicians can see:
        // 1. Their own created tickets (all types)
        // 2. ALL tickets in Transaction Claims category
        whereClause.OR = [
          // Their own tickets
          { createdById: session.user.id },
          // All tickets in Transaction Claims category
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          // Also check service's tier1CategoryId
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
        ];
        // Skip category filter if filtering by Transaction Claims
        if (tier1CategoryId === TRANSACTION_CLAIMS_CATEGORY_ID) {
          skipCategoryFilter = true;
        }
      } else if (isTransactionClaimsSupport) {
        // Transaction Claims Support group can see ALL transaction-related claims and disputes
        // Including ATM Claims
        whereClause.OR = [
          // All tickets in Transaction Claims category
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          // Also check service's tier1CategoryId
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } },
          // Include ATM Services category
          { categoryId: ATM_SERVICES_CATEGORY_ID },
          { service: { tier1CategoryId: ATM_SERVICES_CATEGORY_ID } }
        ];
        // Skip category filter if filtering by their authorized categories
        if (tier1CategoryId === TRANSACTION_CLAIMS_CATEGORY_ID || tier1CategoryId === ATM_SERVICES_CATEGORY_ID) {
          skipCategoryFilter = true;
        }
      } else {
        // Check if this is an IT Helpdesk technician - they have no support group restrictions on reports
        const isITHelpdeskTech = userWithGroup?.supportGroup?.code === 'IT_HELPDESK';

        if (isITHelpdeskTech) {
          // IT Helpdesk technicians can see ALL tickets on the reports page (no support group restrictions)
          // No additional filtering needed - they have full visibility for reporting purposes
        } else {
          // Regular technicians see tickets they created, are assigned to, or in their support group
        const technicianScope = {
          OR: [
            { createdById: session.user.id },
            { assignedToId: session.user.id }
          ]
        };

        if (userWithGroup?.supportGroupId) {
          technicianScope.OR.push({
            service: {
              supportGroupId: userWithGroup.supportGroupId
            }
          });
        }

        whereClause.AND = [technicianScope];
        }
      }
    } else if (session.user.role === 'MANAGER') {
      // Managers see tickets from their branch
      if (userWithGroup?.branchId) {
        whereClause.createdBy = {
          branchId: userWithGroup.branchId
        };
      }
    }
    // Admins see all tickets - no additional filtering

    // Apply filters
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (priority && priority !== 'ALL') {
      whereClause.priority = priority;
    }
    // 3-tier category filtering via service fields
    if (tier1CategoryId && tier1CategoryId !== 'ALL' && !skipCategoryFilter) {
      const categoryFilter = { service: { tier1CategoryId: tier1CategoryId } };
      if (whereClause.AND) {
        whereClause.AND.push(categoryFilter);
      } else {
        whereClause.AND = [categoryFilter];
      }
    }
    if (tier2SubcategoryId && tier2SubcategoryId !== 'ALL') {
      const subcategoryFilter = { service: { tier2SubcategoryId: tier2SubcategoryId } };
      if (whereClause.AND) {
        whereClause.AND.push(subcategoryFilter);
      } else {
        whereClause.AND = [subcategoryFilter];
      }
    }
    if (tier3ItemId && tier3ItemId !== 'ALL') {
      const itemFilter = { service: { tier3ItemId: tier3ItemId } };
      if (whereClause.AND) {
        whereClause.AND.push(itemFilter);
      } else {
        whereClause.AND = [itemFilter];
      }
    }
    if (technicianId && technicianId !== 'ALL') {
      whereClause.assignedToId = technicianId;
    }
    if (branchId && branchId !== 'ALL') {
      whereClause.createdBy = {
        ...whereClause.createdBy,
        branchId: branchId
      };
    }
    
    // Date range filter - based on createdAt
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        // Parse the start date and set to beginning of day (00:00:00)
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);
        whereClause.createdAt.gte = startDateObj;
      }
      if (endDate) {
        // Parse the end date and set to end of day (23:59:59.999)
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDateObj;
      }

      // Debug logging
      console.log('All Tickets Report - Date Filter:', {
        startDate: whereClause.createdAt.gte?.toISOString(),
        endDate: whereClause.createdAt.lte?.toISOString(),
        rawStartDate: startDate,
        rawEndDate: endDate
      });
    }
    
    // Search filter - properly scoped within role access
    if (searchTerm) {
      const searchConditions = {
        OR: [
          { ticketNumber: { contains: searchTerm, mode: 'insensitive' } },
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      };

      if (whereClause.AND) {
        whereClause.AND.push(searchConditions);
      } else {
        whereClause.AND = [searchConditions];
      }
    }

    // IMPORTANT: Exclude ATM Claim tickets (they should only be accessed through /branch/atm-claims)
    // Exception: Transaction Claims Support and Call Center users CAN see ATM Claims
    const isTransactionClaimsSupportUser = userWithGroup?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';
    const isCallCenterUserForATM = userWithGroup?.supportGroup?.code === 'CALL_CENTER';

    // Exclude ATM Claims for everyone except Transaction Claims Support and Call Center
    if (!isTransactionClaimsSupportUser && !isCallCenterUserForATM) {
      // Ensure AND array exists
      if (!whereClause.AND) {
        whereClause.AND = [];
      } else if (!Array.isArray(whereClause.AND)) {
        whereClause.AND = [whereClause.AND];
      }

      whereClause.AND.push({
        NOT: {
          service: {
            name: {
              contains: 'ATM Claim'
            }
          }
        }
      });
    }

    // Exclude rejected tickets by default when no specific status is requested
    // This matches the behavior of the main tickets API
    if (!status || status === 'ALL') {
      whereClause.status = { not: 'REJECTED' };
    }

    // Get total count
    const totalCount = await prisma.ticket.count({ where: whereClause });

    // Get tickets with full details
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            branch: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            supportGroup: {
              select: {
                id: true,
                name: true,
                code: true
              }
            },
            tier1Category: {
              select: {
                id: true,
                name: true
              }
            },
            tier2Subcategory: {
              select: {
                id: true,
                name: true
              }
            },
            tier3Item: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            createdAt: true,
            approver: {
              select: {
                name: true
              }
            }
          }
        },
        comments: {
          where: {
            OR: [
              { content: { contains: 'Ticket claimed by', mode: 'insensitive' } },
              { content: { contains: 'Ticket assigned to', mode: 'insensitive' } }
            ]
          },
          select: {
            createdAt: true
          },
          orderBy: { createdAt: 'asc' },
          take: 1
        },
        _count: {
          select: {
            comments: true,
            attachments: true
          }
        },
        vendorTickets: {
          select: {
            vendorTicketNumber: true,
            vendor: {
              select: {
                name: true
              }
            },
            status: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Calculate statistics in parallel
    const [openCount, inProgressCount, resolvedCount, closedCount, pendingCount] = await Promise.all([
      prisma.ticket.count({ where: { ...whereClause, status: 'OPEN' } }),
      prisma.ticket.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { ...whereClause, status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { ...whereClause, status: 'CLOSED' } }),
      prisma.ticket.count({ where: { ...whereClause, status: { in: ['PENDING', 'PENDING_APPROVAL', 'PENDING_VENDOR'] } } })
    ]);
    const stats = {
      total: totalCount,
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
      closed: closedCount,
      pending: pendingCount
    };

    // Get unique values for filters including 3-tier categories
    const filters = {
      categories: await prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      }),
      subcategories: tier1CategoryId && tier1CategoryId !== 'ALL' ?
        await prisma.subcategory.findMany({
          where: {
            isActive: true,
            categoryId: tier1CategoryId
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }) : [],
      items: tier2SubcategoryId && tier2SubcategoryId !== 'ALL' ?
        await prisma.item.findMany({
          where: {
            isActive: true,
            subcategoryId: tier2SubcategoryId
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }) : [],
      branches: await prisma.branch.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      }),
      technicians: await prisma.user.findMany({
        where: { 
          role: { in: ['TECHNICIAN', 'SECURITY_ANALYST'] },
          isActive: true
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' }
      })
    };

    // Collect unique category/subcategory/item IDs to fetch names
    const categoryIds = [...new Set(tickets.map(t => t.categoryId).filter(Boolean))];
    const subcategoryIds = [...new Set(tickets.map(t => t.subcategoryId).filter(Boolean))];
    const itemIds = [...new Set(tickets.map(t => t.itemId).filter(Boolean))];

    // Fetch category/subcategory/item names in bulk
    const [categories, subcategories, items] = await Promise.all([
      categoryIds.length > 0 ? prisma.category.findMany({
        where: { id: { in: categoryIds as string[] } },
        select: { id: true, name: true }
      }) : [],
      subcategoryIds.length > 0 ? prisma.subcategory.findMany({
        where: { id: { in: subcategoryIds as string[] } },
        select: { id: true, name: true }
      }) : [],
      itemIds.length > 0 ? prisma.item.findMany({
        where: { id: { in: itemIds as string[] } },
        select: { id: true, name: true }
      }) : []
    ]);

    // Create lookup maps for quick access
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const subcategoryMap = new Map(subcategories.map(s => [s.id, s.name]));
    const itemMap = new Map(items.map(i => [i.id, i.name]));

    // Format response
    // Note: Removed old category/subcategory/item fields - only using Service 3-tier system
    // Resolution time is calculated from slaStartAt (approval date) instead of createdAt
    const formattedTickets = tickets.map(ticket => {
      // Calculate resolution time from SLA start (approval date or creation date for non-approval tickets)
      const slaStart = (ticket as any).slaStartAt ? new Date((ticket as any).slaStartAt) : new Date(ticket.createdAt);
      const resolutionTime = ticket.resolvedAt
        ? Math.round(calculateBusinessHours(slaStart, new Date(ticket.resolvedAt)))
        : null;

      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        type: ticket.category || 'INCIDENT',
        issueClassification: ticket.issueClassification || null,
        service: ticket.service?.name || 'N/A',
        serviceCategory: ticket.service?.tier1Category?.name || '-',
        serviceSubcategory: ticket.service?.tier2Subcategory?.name || '-',
        serviceItem: ticket.service?.tier3Item?.name || '-',
        supportGroup: ticket.service?.supportGroup?.name || 'N/A',
        createdBy: ticket.createdBy.name,
        createdByEmail: ticket.createdBy.email,
        branch: ticket.createdBy.branch?.name || 'N/A',
        branchCode: ticket.createdBy.branch?.code || 'N/A',
        assignedTo: ticket.assignedTo?.name || 'Unassigned',
        assignedToEmail: ticket.assignedTo?.email || '',
        createdAt: ticket.createdAt,
        slaStartAt: (ticket as any).slaStartAt || null,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
        claimedAt: ticket.comments[0]?.createdAt || null,
        responseTime: null, // Field removed as firstResponseAt doesn't exist
        resolutionTime: resolutionTime,
        approvalStatus: ticket.approvals[0]?.status || null,
        approvedBy: ticket.approvals[0]?.approver?.name || null,
        commentCount: ticket._count.comments,
        attachmentCount: ticket._count.attachments,
        vendorTicketNumber: ticket.vendorTickets[0]?.vendorTicketNumber || null,
        vendorName: ticket.vendorTickets[0]?.vendor?.name || null,
        vendorStatus: ticket.vendorTickets[0]?.status || null
      };
    });

    return NextResponse.json({
      tickets: formattedTickets,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats,
      filters
    });

  } catch (error) {
    console.error('Error fetching all tickets report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets report' },
      { status: 500 }
    );
  }
}

// Export endpoint for downloading data
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { format = 'csv', filters = {}, columns = [] as string[] } = body;

    // Build where clause with SAME logic as GET endpoint
    const whereClause: any = {};

    // Track if user has special category access (to skip category filter later)
    const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
    const ATM_SERVICES_CATEGORY_ID = 'cmekrqi3t001ghlusklheksqz';
    let skipCategoryFilter = false;

    // Fetch user with support group ONCE (used for role checks and ATM exclusion)
    const userWithGroup = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { supportGroup: true }
    });

    // Role-based filtering - use AND to ensure search is scoped within user access
    if (session.user.role === 'USER') {

      // Check if this is a Call Center user
      const isCallCenterUser = userWithGroup?.supportGroup?.code === 'CALL_CENTER';

      if (isCallCenterUser) {
        // Call Center users can see:
        // 1. Their own created tickets (all types)
        // 2. ALL tickets in Transaction Claims category
        whereClause.OR = [
          // Their own tickets
          { createdById: session.user.id },
          // All tickets in Transaction Claims category
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          // Also check service's tier1CategoryId
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
        ];
        // Skip category filter if filtering by Transaction Claims
        if (filters.tier1CategoryId === TRANSACTION_CLAIMS_CATEGORY_ID) {
          skipCategoryFilter = true;
        }
      } else {
        // Regular users see only their own tickets
        whereClause.createdById = session.user.id;
      }
    } else if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      const isCallCenterTech = userWithGroup?.supportGroup?.code === 'CALL_CENTER';
      const isTransactionClaimsSupport = userWithGroup?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';

      if (isCallCenterTech) {
        whereClause.OR = [
          { createdById: session.user.id },
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
        ];
        if (filters.tier1CategoryId === TRANSACTION_CLAIMS_CATEGORY_ID) {
          skipCategoryFilter = true;
        }
      } else if (isTransactionClaimsSupport) {
        whereClause.OR = [
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } },
          { categoryId: ATM_SERVICES_CATEGORY_ID },
          { service: { tier1CategoryId: ATM_SERVICES_CATEGORY_ID } }
        ];
        if (filters.tier1CategoryId === TRANSACTION_CLAIMS_CATEGORY_ID || filters.tier1CategoryId === ATM_SERVICES_CATEGORY_ID) {
          skipCategoryFilter = true;
        }
      } else {
        const isITHelpdeskTech = userWithGroup?.supportGroup?.code === 'IT_HELPDESK';

        if (isITHelpdeskTech) {
          // IT Helpdesk technicians can see ALL tickets
        } else {
          const technicianScope = {
            OR: [
              { createdById: session.user.id },
              { assignedToId: session.user.id }
            ]
          };

          if (userWithGroup?.supportGroupId) {
            technicianScope.OR.push({
              service: {
                supportGroupId: userWithGroup.supportGroupId
              }
            });
          }

          whereClause.AND = [technicianScope];
        }
      }
    }
    else if (session.user.role === 'MANAGER') {
      if (userWithGroup?.branchId) {
        whereClause.createdBy = {
          branchId: userWithGroup.branchId
        };
      }
    }
    // Admins see all tickets - no additional filtering

    // Apply filters from request body
    if (filters.status && filters.status !== 'ALL') {
      whereClause.status = filters.status;
    }
    if (filters.priority && filters.priority !== 'ALL') {
      whereClause.priority = filters.priority;
    }
    // 3-tier category filtering via service fields
    if (filters.tier1CategoryId && filters.tier1CategoryId !== 'ALL' && !skipCategoryFilter) {
      const categoryFilter = { service: { tier1CategoryId: filters.tier1CategoryId } };
      if (whereClause.AND) {
        whereClause.AND.push(categoryFilter);
      } else {
        whereClause.AND = [categoryFilter];
      }
    }
    if (filters.tier2SubcategoryId && filters.tier2SubcategoryId !== 'ALL') {
      const subcategoryFilter = { service: { tier2SubcategoryId: filters.tier2SubcategoryId } };
      if (whereClause.AND) {
        whereClause.AND.push(subcategoryFilter);
      } else {
        whereClause.AND = [subcategoryFilter];
      }
    }
    if (filters.tier3ItemId && filters.tier3ItemId !== 'ALL') {
      const itemFilter = { service: { tier3ItemId: filters.tier3ItemId } };
      if (whereClause.AND) {
        whereClause.AND.push(itemFilter);
      } else {
        whereClause.AND = [itemFilter];
      }
    }
    if (filters.technicianId && filters.technicianId !== 'ALL') {
      whereClause.assignedToId = filters.technicianId;
    }
    if (filters.branchId && filters.branchId !== 'ALL') {
      whereClause.createdBy = {
        ...whereClause.createdBy,
        branchId: filters.branchId
      };
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // Include the entire day by setting to end of day
        const endDateObj = new Date(filters.endDate);
        endDateObj.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDateObj;
      }
    }

    // Search filter - properly scoped within role access
    if (filters.searchTerm) {
      const searchConditions = {
        OR: [
          { ticketNumber: { contains: filters.searchTerm, mode: 'insensitive' } },
          { title: { contains: filters.searchTerm, mode: 'insensitive' } },
          { description: { contains: filters.searchTerm, mode: 'insensitive' } }
        ]
      };

      if (whereClause.AND) {
        whereClause.AND.push(searchConditions);
      } else {
        whereClause.AND = [searchConditions];
      }
    }

    // Exclude ATM Claim tickets - Exception: Transaction Claims Support and Call Center users
    const isTransactionClaimsSupportUserExport = userWithGroup?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';
    const isCallCenterUserForATMExport = userWithGroup?.supportGroup?.code === 'CALL_CENTER';

    // Exclude ATM Claims for everyone except Transaction Claims Support and Call Center
    if (!isTransactionClaimsSupportUserExport && !isCallCenterUserForATMExport) {
      // Ensure AND array exists
      if (!whereClause.AND) {
        whereClause.AND = [];
      } else if (!Array.isArray(whereClause.AND)) {
        whereClause.AND = [whereClause.AND];
      }

      whereClause.AND.push({
        NOT: {
          service: {
            name: {
              contains: 'ATM Claim'
            }
          }
        }
      });
    }

    // Exclude rejected tickets by default when no specific status is requested
    // This matches the behavior of the main tickets API
    if (!filters.status || filters.status === 'ALL') {
      whereClause.status = { not: 'REJECTED' };
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      take: 10000, // Safety limit to prevent server hang on large exports
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
            branch: { select: { name: true, code: true } }
          }
        },
        assignedTo: {
          select: { name: true, email: true }
        },
        service: {
          select: {
            name: true,
            supportGroup: {
              select: { name: true }
            },
            tier1Category: {
              select: { name: true }
            },
            tier2Subcategory: {
              select: { name: true }
            },
            tier3Item: {
              select: { name: true }
            }
          }
        },
        comments: {
          where: {
            OR: [
              { content: { contains: 'Ticket claimed by', mode: 'insensitive' } },
              { content: { contains: 'Ticket assigned to', mode: 'insensitive' } }
            ]
          },
          select: {
            createdAt: true
          },
          orderBy: { createdAt: 'asc' },
          take: 1
        },
        vendorTickets: {
          select: {
            vendorTicketNumber: true,
            vendor: {
              select: {
                name: true
              }
            },
            status: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Collect unique category/subcategory/item IDs to fetch names
    const exportCategoryIds = [...new Set(tickets.map(t => t.categoryId).filter(Boolean))];
    const exportSubcategoryIds = [...new Set(tickets.map(t => t.subcategoryId).filter(Boolean))];
    const exportItemIds = [...new Set(tickets.map(t => t.itemId).filter(Boolean))];

    // Fetch category/subcategory/item names in bulk
    const [exportCategories, exportSubcategories, exportItems] = await Promise.all([
      exportCategoryIds.length > 0 ? prisma.category.findMany({
        where: { id: { in: exportCategoryIds as string[] } },
        select: { id: true, name: true }
      }) : [],
      exportSubcategoryIds.length > 0 ? prisma.subcategory.findMany({
        where: { id: { in: exportSubcategoryIds as string[] } },
        select: { id: true, name: true }
      }) : [],
      exportItemIds.length > 0 ? prisma.item.findMany({
        where: { id: { in: exportItemIds as string[] } },
        select: { id: true, name: true }
      }) : []
    ]);

    // Create lookup maps for quick access
    const exportCategoryMap = new Map(exportCategories.map(c => [c.id, c.name]));
    const exportSubcategoryMap = new Map(exportSubcategories.map(s => [s.id, s.name]));
    const exportItemMap = new Map(exportItems.map(i => [i.id, i.name]));

    // Format data for export
    // Note: Removed old Category/Subcategory/Item columns (F,G,H) - only using Service 3-tier system
    // Resolution time is calculated from slaStartAt (approval date) instead of createdAt
    const formattedData = tickets.map(t => {
      // Calculate resolution time from SLA start (approval date or creation date for non-approval tickets)
      const slaStart = (t as any).slaStartAt ? new Date((t as any).slaStartAt) : new Date(t.createdAt);
      const resolutionTimeHrs = t.resolvedAt
        ? Math.round(calculateBusinessHours(slaStart, new Date(t.resolvedAt)))
        : '';

      return {
        'Ticket #': t.ticketNumber,
        'Title': t.title,
        'Description': t.description,
        'Status': t.status,
        'Priority': t.priority,
        'Type': (() => {
          const labels: Record<string, string> = {
            INCIDENT: 'Insiden',
            SERVICE_REQUEST: 'Permintaan Layanan',
            CHANGE_REQUEST: 'Permintaan Perubahan',
            EVENT_REQUEST: 'Permintaan Event'
          };
          return labels[t.category] || t.category || 'Insiden';
        })(),
        'Klasifikasi Masalah': (() => {
          const labels: Record<string, string> = {
            HUMAN_ERROR: 'Human Error',
            SYSTEM_ERROR: 'System Error',
            HARDWARE_FAILURE: 'Hardware Failure',
            NETWORK_ISSUE: 'Network Issue',
            SECURITY_INCIDENT: 'Security Incident',
            DATA_ISSUE: 'Data Issue',
            PROCESS_GAP: 'Process Gap',
            EXTERNAL_FACTOR: 'External Factor'
          };
          return t.issueClassification ? (labels[t.issueClassification] || t.issueClassification) : '-';
        })(),
        'Service': t.service?.name || 'N/A',
        'Service Category': t.service?.tier1Category?.name || '-',
        'Service Subcategory': t.service?.tier2Subcategory?.name || '-',
        'Service Item': t.service?.tier3Item?.name || '-',
        'Support Group': t.service?.supportGroup?.name || 'N/A',
        'Created By': t.createdBy.name,
        'Created By Email': t.createdBy.email,
        'Branch': t.createdBy.branch?.name || 'N/A',
        'Branch Code': t.createdBy.branch?.code || 'N/A',
        'Assigned To': t.assignedTo?.name || 'Unassigned',
        'Assigned To Email': t.assignedTo?.email || '',
        'Vendor Ticket #': t.vendorTickets[0]?.vendorTicketNumber || '',
        'Vendor Name': t.vendorTickets[0]?.vendor?.name || '',
        'Vendor Status': t.vendorTickets[0]?.status || '',
        'Created Date': new Date(t.createdAt).toISOString(),
        'SLA Start Date': (t as any).slaStartAt ? new Date((t as any).slaStartAt).toISOString() : '',
        'Updated Date': new Date(t.updatedAt).toISOString(),
        'Resolved Date': t.resolvedAt ? new Date(t.resolvedAt).toISOString() : '',
        'Closed Date': t.closedAt ? new Date(t.closedAt).toISOString() : '',
        'Claimed Date': t.comments[0]?.createdAt ? new Date(t.comments[0].createdAt).toISOString() : '',
        'Resolution Time (hrs)': resolutionTimeHrs
      };
    });

    // Column filtering for export
    const COLUMN_EXPORT_MAP: Record<string, string[]> = {
      ticketNumber: ['Ticket #'],
      title: ['Title', 'Description'],
      status: ['Status'],
      priority: ['Priority'],
      type: ['Type'],
      serviceCategory: ['Service Category', 'Service Subcategory', 'Service Item'],
      service: ['Service'],
      branch: ['Branch', 'Branch Code'],
      createdBy: ['Created By', 'Created By Email'],
      assignedTo: ['Assigned To', 'Assigned To Email'],
      createdAt: ['Created Date', 'SLA Start Date', 'Updated Date'],
      claimedAt: ['Claimed Date'],
      resolvedAt: ['Resolved Date', 'Closed Date'],
      resolutionTime: ['Resolution Time (hrs)'],
      supportGroup: ['Support Group'],
      vendorTicketNumber: ['Vendor Ticket #', 'Vendor Name', 'Vendor Status'],
    };

    let exportData = formattedData;
    if (columns && columns.length > 0) {
      const allowedHeaders = new Set<string>();
      for (const col of columns) {
        const headers = COLUMN_EXPORT_MAP[col];
        if (headers) {
          headers.forEach(h => allowedHeaders.add(h));
        }
      }
      if (allowedHeaders.size > 0) {
        exportData = formattedData.map(row => {
          const filtered: Record<string, any> = {};
          for (const key of Object.keys(row)) {
            if (allowedHeaders.has(key)) {
              filtered[key] = row[key as keyof typeof row];
            }
          }
          return filtered;
        });
      }
    }

    if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const workbook = XLSX.utils.book_new();

      // Add "All Tickets" sheet first
      const allSheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, allSheet, 'Semua Tiket');

      // Group tickets by support group and create a sheet for each
      const groupedData: Record<string, Record<string, any>[]> = {};
      for (const row of exportData) {
        const groupName = (row as any)['Support Group'] || 'N/A';
        if (!groupedData[groupName]) {
          groupedData[groupName] = [];
        }
        groupedData[groupName].push(row);
      }

      // Sort group names alphabetically, put N/A last
      const sortedGroups = Object.keys(groupedData).sort((a, b) => {
        if (a === 'N/A') return 1;
        if (b === 'N/A') return -1;
        return a.localeCompare(b);
      });

      for (const groupName of sortedGroups) {
        // Excel sheet names max 31 chars, no special chars: \ / ? * [ ]
        const sheetName = groupName
          .replace(/[\\/?*[\]]/g, '')
          .substring(0, 31) || 'Unknown';
        // Avoid duplicate sheet names
        let finalName = sheetName;
        let counter = 1;
        while (workbook.SheetNames.includes(finalName)) {
          finalName = `${sheetName.substring(0, 28)}_${counter++}`;
        }
        const groupSheet = XLSX.utils.json_to_sheet(groupedData[groupName]);
        XLSX.utils.book_append_sheet(workbook, groupSheet, finalName);
      }

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="tickets-report-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    } else if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csv = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(header => {
            const value = String(row[header as keyof typeof row] || '');
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="tickets-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({ tickets: exportData });

  } catch (error) {
    console.error('Error exporting tickets report:', error);
    return NextResponse.json(
      { error: 'Failed to export tickets report' },
      { status: 500 }
    );
  }
}