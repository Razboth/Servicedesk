import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SECURITY_ANALYST and ADMIN roles can access this report
    if (!['SECURITY_ANALYST', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Access denied. This report is only available to Security Analysts.' },
        { status: 403 }
      );
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
    const branchId = searchParams.get('branchId');
    const createdById = searchParams.get('createdById');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchTerm = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause - filter for tickets accessible to current Security Analyst
    const whereClause: any = {};

    // Get user's support group for filtering
    const userWithGroup = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { supportGroup: true }
    });

    // Security Analysts see tickets they created, are assigned to, or in their support group
    const securityAnalystScope = {
      OR: [
        { createdById: session.user.id },
        { assignedToId: session.user.id }
      ]
    };

    if (userWithGroup?.supportGroupId) {
      securityAnalystScope.OR.push({
        service: {
          supportGroupId: userWithGroup.supportGroupId
        }
      });
    }

    whereClause.AND = [securityAnalystScope];

    // Apply filters
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (priority && priority !== 'ALL') {
      whereClause.priority = priority;
    }

    // Category filter with dual-table lookup
    if (categoryId && categoryId !== 'ALL') {
      const selectedCategory = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { name: true }
      });

      const matchingServiceCategory = selectedCategory
        ? await prisma.serviceCategory.findFirst({
            where: {
              name: selectedCategory.name,
              isActive: true
            },
            select: { id: true }
          })
        : null;

      const categoryFilter = {
        OR: [
          { categoryId: categoryId },
          { service: { tier1CategoryId: categoryId } },
          { service: { categoryId: categoryId } },
          ...(matchingServiceCategory
            ? [{ service: { categoryId: matchingServiceCategory.id } }]
            : [])
        ]
      };

      if (whereClause.AND) {
        whereClause.AND.push(categoryFilter);
      } else {
        whereClause.AND = [categoryFilter];
      }
    }

    if (subcategoryId && subcategoryId !== 'ALL') {
      if (whereClause.AND) {
        whereClause.AND.push({ subcategoryId: subcategoryId });
      } else {
        whereClause.AND = [{ subcategoryId: subcategoryId }];
      }
    }
    if (itemId && itemId !== 'ALL') {
      if (whereClause.AND) {
        whereClause.AND.push({ itemId: itemId });
      } else {
        whereClause.AND = [{ itemId: itemId }];
      }
    }
    if (serviceId && serviceId !== 'ALL') {
      if (whereClause.AND) {
        whereClause.AND.push({ serviceId: serviceId });
      } else {
        whereClause.AND = [{ serviceId: serviceId }];
      }
    }
    if (branchId && branchId !== 'ALL') {
      if (whereClause.AND) {
        whereClause.AND.push({
          createdBy: {
            branchId: branchId
          }
        });
      } else {
        whereClause.AND = [{
          createdBy: {
            branchId: branchId
          }
        }];
      }
    }
    if (createdById && createdById !== 'ALL') {
      if (whereClause.AND) {
        whereClause.AND.push({ createdById: createdById });
      } else {
        whereClause.AND = [{ createdById: createdById }];
      }
    }

    // Date range filter - based on createdAt
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);
        dateFilter.gte = startDateObj;
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        dateFilter.lte = endDateObj;
      }

      if (whereClause.AND) {
        whereClause.AND.push({ createdAt: dateFilter });
      } else {
        whereClause.AND = [{ createdAt: dateFilter }];
      }
    }

    // Search filter
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

    // Exclude rejected tickets by default
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
            role: true,
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
            email: true,
            role: true
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
          select: {
            id: true
          }
        },
        attachments: {
          select: {
            id: true
          }
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

    // Get unique values for filters
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
      securityAnalysts: await prisma.user.findMany({
        where: {
          role: 'SECURITY_ANALYST',
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

    // Create lookup maps
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
        serviceCategory: ticket.service?.tier1Category?.name || '-',
        serviceSubcategory: ticket.service?.tier2Subcategory?.name || '-',
        serviceItem: ticket.service?.tier3Item?.name || '-',
        supportGroup: ticket.service?.supportGroup?.name || 'N/A',
        createdBy: ticket.createdBy.name,
        createdByEmail: ticket.createdBy.email,
        createdByRole: ticket.createdBy.role,
        branch: ticket.createdBy.branch?.name || 'N/A',
        branchCode: ticket.createdBy.branch?.code || 'N/A',
        assignedTo: ticket.assignedTo?.name || 'Unassigned',
        assignedToEmail: ticket.assignedTo?.email || '',
        assignedToRole: ticket.assignedTo?.role || '',
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
        resolutionTime: ticket.resolvedAt ?
          Math.round((new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60)) : null,
        approvalStatus: ticket.approvals[0]?.status || null,
        approvedBy: ticket.approvals[0]?.approver?.name || null,
        commentCount: ticket.comments.length,
        attachmentCount: ticket.attachments.length
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
    console.error('Error fetching security analyst report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security analyst report' },
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

    // Only SECURITY_ANALYST and ADMIN roles can access this report
    if (!['SECURITY_ANALYST', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Access denied. This report is only available to Security Analysts.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { format = 'csv', filters = {} } = body;

    // Build where clause - filter for tickets accessible to current Security Analyst
    const whereClause: any = {};

    // Get user's support group for filtering
    const userWithGroup = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { supportGroup: true }
    });

    // Security Analysts see tickets they created, are assigned to, or in their support group
    const securityAnalystScope = {
      OR: [
        { createdById: session.user.id },
        { assignedToId: session.user.id }
      ]
    };

    if (userWithGroup?.supportGroupId) {
      securityAnalystScope.OR.push({
        service: {
          supportGroupId: userWithGroup.supportGroupId
        }
      });
    }

    whereClause.AND = [securityAnalystScope];

    // Apply filters from request body
    if (filters.status && filters.status !== 'ALL') {
      whereClause.status = filters.status;
    }
    if (filters.priority && filters.priority !== 'ALL') {
      whereClause.priority = filters.priority;
    }

    // Category filter with dual-table lookup
    if (filters.categoryId && filters.categoryId !== 'ALL') {
      const selectedCategoryExport = await prisma.category.findUnique({
        where: { id: filters.categoryId },
        select: { name: true }
      });

      const matchingServiceCategoryExport = selectedCategoryExport
        ? await prisma.serviceCategory.findFirst({
            where: {
              name: selectedCategoryExport.name,
              isActive: true
            },
            select: { id: true }
          })
        : null;

      const categoryFilter = {
        OR: [
          { categoryId: filters.categoryId },
          { service: { tier1CategoryId: filters.categoryId } },
          { service: { categoryId: filters.categoryId } },
          ...(matchingServiceCategoryExport
            ? [{ service: { categoryId: matchingServiceCategoryExport.id } }]
            : [])
        ]
      };

      if (whereClause.AND) {
        whereClause.AND.push(categoryFilter);
      } else {
        whereClause.AND = [categoryFilter];
      }
    }

    if (filters.subcategoryId && filters.subcategoryId !== 'ALL') {
      if (whereClause.AND) {
        whereClause.AND.push({ subcategoryId: filters.subcategoryId });
      } else {
        whereClause.AND = [{ subcategoryId: filters.subcategoryId }];
      }
    }
    if (filters.itemId && filters.itemId !== 'ALL') {
      if (whereClause.AND) {
        whereClause.AND.push({ itemId: filters.itemId });
      } else {
        whereClause.AND = [{ itemId: filters.itemId }];
      }
    }
    if (filters.serviceId && filters.serviceId !== 'ALL') {
      if (whereClause.AND) {
        whereClause.AND.push({ serviceId: filters.serviceId });
      } else {
        whereClause.AND = [{ serviceId: filters.serviceId }];
      }
    }
    if (filters.branchId && filters.branchId !== 'ALL') {
      if (whereClause.AND) {
        whereClause.AND.push({
          createdBy: {
            branchId: filters.branchId
          }
        });
      } else {
        whereClause.AND = [{
          createdBy: {
            branchId: filters.branchId
          }
        }];
      }
    }
    if (filters.createdById && filters.createdById !== 'ALL') {
      if (whereClause.AND) {
        whereClause.AND.push({ createdById: filters.createdById });
      } else {
        whereClause.AND = [{ createdById: filters.createdById }];
      }
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      const dateFilter: any = {};
      if (filters.startDate) {
        const startDateObj = new Date(filters.startDate);
        startDateObj.setHours(0, 0, 0, 0);
        dateFilter.gte = startDateObj;
      }
      if (filters.endDate) {
        const endDateObj = new Date(filters.endDate);
        endDateObj.setHours(23, 59, 59, 999);
        dateFilter.lte = endDateObj;
      }

      if (whereClause.AND) {
        whereClause.AND.push({ createdAt: dateFilter });
      } else {
        whereClause.AND = [{ createdAt: dateFilter }];
      }
    }

    // Search filter
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

    // Exclude rejected tickets by default
    if (!filters.status || filters.status === 'ALL') {
      whereClause.status = { not: 'REJECTED' };
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
            role: true,
            branch: { select: { name: true, code: true } }
          }
        },
        assignedTo: {
          select: { name: true, email: true, role: true }
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

    // Create lookup maps
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
        'Service Category': t.service?.tier1Category?.name || '-',
        'Service Subcategory': t.service?.tier2Subcategory?.name || '-',
        'Service Item': t.service?.tier3Item?.name || '-',
        'Support Group': t.service?.supportGroup?.name || 'N/A',
        'Created By': t.createdBy.name,
        'Created By Email': t.createdBy.email,
        'Created By Role': t.createdBy.role,
        'Branch': t.createdBy.branch?.name || 'N/A',
        'Branch Code': t.createdBy.branch?.code || 'N/A',
        'Assigned To': t.assignedTo?.name || 'Unassigned',
        'Assigned To Email': t.assignedTo?.email || '',
        'Assigned To Role': t.assignedTo?.role || '',
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Security Analyst Tickets');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="security-analyst-report-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    } else if (format === 'csv') {
      const headers = Object.keys(formattedData[0] || {});
      const csv = [
        headers.join(','),
        ...formattedData.map(row =>
          headers.map(header => {
            const value = String(row[header as keyof typeof row] || '');
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
          'Content-Disposition': `attachment; filename="security-analyst-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({ tickets: formattedData });

  } catch (error) {
    console.error('Error exporting security analyst report:', error);
    return NextResponse.json(
      { error: 'Failed to export security analyst report' },
      { status: 500 }
    );
  }
}
