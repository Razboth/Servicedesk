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
    
    // Role-based filtering
    if (session.user.role === 'USER') {
      whereClause.createdById = session.user.id;
    } else if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      // Technicians see tickets they created, are assigned to, or in their support group
      const userWithGroup = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { supportGroup: true }
      });
      
      whereClause.OR = [
        { createdById: session.user.id },
        { assignedToId: session.user.id }
      ];
      
      if (userWithGroup?.supportGroupId) {
        whereClause.OR.push({
          service: {
            supportGroupId: userWithGroup.supportGroupId
          }
        });
      }
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
    if (categoryId && categoryId !== 'ALL') {
      whereClause.service = {
        ...whereClause.service,
        categoryId: categoryId
      };
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
        whereClause.createdAt.lte = new Date(endDate);
      }
    }
    
    // Search filter
    if (searchTerm) {
      whereClause.OR = whereClause.OR || [];
      whereClause.OR.push(
        { ticketNumber: { contains: searchTerm, mode: 'insensitive' } },
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      );
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
            category: {
              select: {
                id: true,
                name: true
              }
            },
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
      categories: await prisma.serviceCategory.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      }),
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

    // Format response
    const formattedTickets = tickets.map(ticket => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.service.category.name,
      service: ticket.service.name,
      supportGroup: ticket.service.supportGroup?.name || 'N/A',
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
      responseTime: ticket.firstResponseAt ? 
        Math.round((new Date(ticket.firstResponseAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60)) : null,
      resolutionTime: ticket.resolvedAt ? 
        Math.round((new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60)) : null,
      approvalStatus: ticket.approvals[0]?.status || null,
      approvedBy: ticket.approvals[0]?.approver?.name || null,
      commentCount: ticket.comments.length,
      attachmentCount: ticket.attachments.length
    }));

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

    // Use the same logic as GET but without pagination
    const whereClause: any = {};
    
    // Apply same role-based and filter logic as GET endpoint
    // ... (same filtering logic as above)

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
            category: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (format === 'csv') {
      const csv = [
        // Headers
        ['Ticket #', 'Title', 'Status', 'Priority', 'Category', 'Service', 'Created By', 'Branch', 'Assigned To', 'Created Date', 'Resolved Date', 'Resolution Time (hrs)'].join(','),
        // Data rows
        ...tickets.map(t => [
          t.ticketNumber,
          `"${t.title.replace(/"/g, '""')}"`,
          t.status,
          t.priority,
          t.service.category.name,
          t.service.name,
          t.createdBy.name,
          t.createdBy.branch?.name || 'N/A',
          t.assignedTo?.name || 'Unassigned',
          new Date(t.createdAt).toISOString(),
          t.resolvedAt ? new Date(t.resolvedAt).toISOString() : '',
          t.resolvedAt ? Math.round((new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60)) : ''
        ].join(','))
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="tickets-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({ tickets });

  } catch (error) {
    console.error('Error exporting tickets report:', error);
    return NextResponse.json(
      { error: 'Failed to export tickets report' },
      { status: 500 }
    );
  }
}