import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeSearchInput } from '@/lib/security';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx'; // xlsx or csv
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const apiSource = searchParams.get('apiSource');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const rawSearch = searchParams.get('search');
    const search = rawSearch ? sanitizeSearchInput(rawSearch) : null;

    // Get user details for role-based filtering
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    if (!userWithDetails) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build where clause for API-created tickets (same as main endpoint)
    const whereClause: any = {
      OR: [
        { sourceChannel: { not: null } },
        {
          metadata: {
            path: ['integration'],
            not: null
          }
        },
        {
          metadata: {
            path: ['originalRequest', 'channel'],
            equals: 'API'
          }
        }
      ]
    };

    // Role-based filtering
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userWithDetails.role)) {
      if (userWithDetails.role === 'MANAGER') {
        whereClause.branchId = userWithDetails.branchId;
      } else {
        whereClause.OR = [
          ...whereClause.OR.map((condition: any) => ({
            ...condition,
            createdById: session.user.id
          })),
          ...whereClause.OR.map((condition: any) => ({
            ...condition,
            assignedToId: session.user.id
          }))
        ];
      }
    }

    // Add additional filters
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;

    if (apiSource) {
      switch (apiSource) {
        case 'omnichannel':
          whereClause.sourceChannel = { not: null };
          break;
        case 'atm-claim':
          whereClause.service = { name: { contains: 'ATM' } };
          break;
        case 'direct-api':
          whereClause.metadata = { path: ['integration'], not: null };
          break;
      }
    }

    // Date filtering
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
    }

    // Search filtering
    if (search) {
      whereClause.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch all matching tickets (no pagination for export)
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        service: {
          include: { supportGroup: true }
        },
        branch: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform data for export
    const exportData = tickets.map(ticket => {
      const apiSource = determineApiSource(ticket);
      const autoResolved = isAutoResolved(ticket);
      const resolutionTime = calculateResolutionTime(ticket);

      return {
        'Ticket Number': ticket.ticketNumber,
        'Title': ticket.title,
        'API Source': apiSource,
        'Status': ticket.status,
        'Priority': ticket.priority,
        'Customer Name': ticket.customerName || 'N/A',
        'Customer Email': ticket.customerEmail || 'N/A',
        'Customer Phone': ticket.customerPhone || 'N/A',
        'Service': ticket.service.name,
        'Support Group': ticket.service.supportGroup?.name || 'N/A',
        'Branch': ticket.branch?.name || 'N/A',
        'Created By': ticket.createdBy.name,
        'Assigned To': ticket.assignedTo?.name || 'Unassigned',
        'Auto-Resolved': autoResolved ? 'Yes' : 'No',
        'Resolution Time (minutes)': resolutionTime || 'N/A',
        'Comments Count': ticket._count.comments,
        'Channel': ticket.sourceChannel || 'API',
        'Channel Reference': ticket.channelReferenceId || 'N/A',
        'Service Type': ticket.metadata?.omnichannelType || 'N/A',
        'Created At': ticket.createdAt.toISOString(),
        'Updated At': ticket.updatedAt.toISOString()
      };
    });

    if (format === 'csv') {
      // Generate CSV
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="api-tickets-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      // Generate Excel file
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();

      // Add metadata sheet
      const metadataSheet = XLSX.utils.json_to_sheet([
        {
          'Export Information': 'API Tickets Export',
          'Generated By': session.user.name || session.user.email,
          'Generated At': new Date().toISOString(),
          'Total Records': exportData.length,
          'Filters Applied': JSON.stringify({
            status,
            priority,
            apiSource,
            dateFrom,
            dateTo,
            search: search ? '[REDACTED]' : null
          })
        }
      ]);

      XLSX.utils.book_append_sheet(workbook, worksheet, 'API Tickets');
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Export Info');

      // Auto-size columns
      const maxWidth = 50;
      const wscols = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.min(maxWidth, Math.max(10, key.length + 2))
      }));
      worksheet['!cols'] = wscols;

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="api-tickets-export-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    }

  } catch (error) {
    console.error('Error exporting API tickets:', error);
    return NextResponse.json(
      { error: 'Failed to export API tickets' },
      { status: 500 }
    );
  }
}

// Helper functions (same as main endpoint)
function determineApiSource(ticket: any): string {
  if (ticket.sourceChannel) {
    return 'omnichannel';
  }

  if (ticket.metadata?.integration) {
    return 'direct-api';
  }

  if (ticket.service?.name?.includes('ATM')) {
    return 'atm-claim';
  }

  return 'unknown';
}

function isAutoResolved(ticket: any): boolean {
  return ticket.metadata?.autoResolved === true ||
         (ticket.status === 'RESOLVED' && ticket.assignedToId === null);
}

function calculateResolutionTime(ticket: any): number | null {
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    const created = new Date(ticket.createdAt);
    const resolved = new Date(ticket.updatedAt);
    return Math.round((resolved.getTime() - created.getTime()) / (1000 * 60));
  }
  return null;
}