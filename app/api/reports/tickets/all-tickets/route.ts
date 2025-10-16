import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');
    const itemId = searchParams.get('itemId');
    const serviceId = searchParams.get('serviceId');
    const technicianId = searchParams.get('technicianId');
    const branchId = searchParams.get('branchId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchTerm = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause based on user role
    const whereClause: any = {};
    
    // Role-based filtering - use AND to ensure search is scoped within user access
    if (session.user.role === 'USER') {
      whereClause.createdById = session.user.id;
    } else if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      // Technicians see tickets they created, are assigned to, or in their support group
      const userWithGroup = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { supportGroup: true }
      });

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
    } else if (session.user.role === 'MANAGER') {
      // Managers see tickets from their branch
      const manager = await prisma.user.findUnique({
        where: { id: session.user.id }
      });

      if (manager?.branchId) {
        whereClause.createdBy = {
          branchId: manager.branchId
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
    // Filter by 3-tier categorization through service relation (matches /tickets API)
    if (categoryId && categoryId !== 'ALL') {
      whereClause.service = {
        ...whereClause.service,
        categoryId: categoryId
      };
    }
    if (subcategoryId && subcategoryId !== 'ALL') {
      whereClause.subcategoryId = subcategoryId;
    }
    if (itemId && itemId !== 'ALL') {
      whereClause.itemId = itemId;
    }
    if (serviceId && serviceId !== 'ALL') {
      whereClause.serviceId = serviceId;
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
    
    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire day by setting to end of day
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDateObj;
      }
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
          select: {
            id: true
          }
        },
        attachments: {
          select: {
            id: true
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

    // Calculate statistics
    const stats = {
      total: totalCount,
      open: await prisma.ticket.count({ where: { ...whereClause, status: 'OPEN' } }),
      inProgress: await prisma.ticket.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
      resolved: await prisma.ticket.count({ where: { ...whereClause, status: 'RESOLVED' } }),
      closed: await prisma.ticket.count({ where: { ...whereClause, status: 'CLOSED' } }),
      pending: await prisma.ticket.count({ 
        where: { 
          ...whereClause, 
          status: { in: ['PENDING', 'PENDING_APPROVAL', 'PENDING_VENDOR'] } 
        } 
      })
    };

    // Get unique values for filters including 3-tier categories
    const filters = {
      categories: await prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      }),
      subcategories: categoryId && categoryId !== 'ALL' ? 
        await prisma.subcategory.findMany({
          where: { 
            isActive: true,
            categoryId: categoryId
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }) : [],
      items: subcategoryId && subcategoryId !== 'ALL' ?
        await prisma.item.findMany({
          where: {
            isActive: true,
            subcategoryId: subcategoryId
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
    const formattedTickets = tickets.map(ticket => {
      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.categoryId ? (categoryMap.get(ticket.categoryId) || '-') : '-',
        subcategory: ticket.subcategoryId ? (subcategoryMap.get(ticket.subcategoryId) || '-') : '-',
        item: ticket.itemId ? (itemMap.get(ticket.itemId) || '-') : '-',
        service: ticket.service?.name || 'N/A',
        supportGroup: ticket.service?.supportGroup?.name || 'N/A',
        createdBy: ticket.createdBy.name,
        createdByEmail: ticket.createdBy.email,
        branch: ticket.createdBy.branch?.name || 'N/A',
        branchCode: ticket.createdBy.branch?.code || 'N/A',
        assignedTo: ticket.assignedTo?.name || 'Unassigned',
        assignedToEmail: ticket.assignedTo?.email || '',
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
        responseTime: null, // Field removed as firstResponseAt doesn't exist
        resolutionTime: ticket.resolvedAt ?
          Math.round((new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60)) : null,
        approvalStatus: ticket.approvals[0]?.status || null,
        approvedBy: ticket.approvals[0]?.approver?.name || null,
        commentCount: ticket.comments.length,
        attachmentCount: ticket.attachments.length,
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
    const { format = 'csv', filters = {} } = body;

    // Build where clause with SAME logic as GET endpoint
    const whereClause: any = {};

    // Role-based filtering - use AND to ensure search is scoped within user access
    if (session.user.role === 'USER') {
      whereClause.createdById = session.user.id;
    } else if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      const userWithGroup = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { supportGroup: true }
      });

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
    } else if (session.user.role === 'MANAGER') {
      const manager = await prisma.user.findUnique({
        where: { id: session.user.id }
      });

      if (manager?.branchId) {
        whereClause.createdBy = {
          branchId: manager.branchId
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
    if (filters.categoryId && filters.categoryId !== 'ALL') {
      whereClause.service = {
        ...whereClause.service,
        categoryId: filters.categoryId
      };
    }
    if (filters.subcategoryId && filters.subcategoryId !== 'ALL') {
      whereClause.subcategoryId = filters.subcategoryId;
    }
    if (filters.itemId && filters.itemId !== 'ALL') {
      whereClause.itemId = filters.itemId;
    }
    if (filters.serviceId && filters.serviceId !== 'ALL') {
      whereClause.serviceId = filters.serviceId;
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

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
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
            }
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
    const formattedData = tickets.map(t => {
      return {
        'Ticket #': t.ticketNumber,
        'Title': t.title,
        'Description': t.description,
        'Status': t.status,
        'Priority': t.priority,
        'Category': t.categoryId ? (exportCategoryMap.get(t.categoryId) || '-') : '-',
        'Subcategory': t.subcategoryId ? (exportSubcategoryMap.get(t.subcategoryId) || '-') : '-',
        'Item': t.itemId ? (exportItemMap.get(t.itemId) || '-') : '-',
        'Service': t.service?.name || 'N/A',
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
        'Updated Date': new Date(t.updatedAt).toISOString(),
        'Resolved Date': t.resolvedAt ? new Date(t.resolvedAt).toISOString() : '',
        'Closed Date': t.closedAt ? new Date(t.closedAt).toISOString() : '',
        'Resolution Time (hrs)': t.resolvedAt ?
          Math.round((new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60)) : ''
      };
    });

    if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="tickets-report-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    } else if (format === 'csv') {
      const headers = Object.keys(formattedData[0] || {});
      const csv = [
        headers.join(','),
        ...formattedData.map(row =>
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

    return NextResponse.json({ tickets: formattedData });

  } catch (error) {
    console.error('Error exporting tickets report:', error);
    return NextResponse.json(
      { error: 'Failed to export tickets report' },
      { status: 500 }
    );
  }
}