import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Monthly Ticket Report - Merges OLD and NEW Category Systems
 *
 * This endpoint handles the dual categorization system:
 *
 * OLD System (ServiceCategory table):
 *   - ticket.categoryId → ServiceCategory
 *   - service.categoryId → ServiceCategory
 *
 * NEW System (3-tier Category table):
 *   - ticket.categoryId → Category (tier 1)
 *   - service.tier1CategoryId → Category
 *
 * MERGE STRATEGY:
 *   Categories are merged by NAME, so if "Hardware" exists in both
 *   old and new systems, they appear as ONE row with combined counts.
 *
 * Example:
 *   - 5 tickets using OLD "Hardware" ServiceCategory
 *   - 10 tickets using NEW "Hardware" Category
 *   → Report shows: Hardware = 15 total tickets
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only TECHNICIAN, MANAGER, and ADMIN roles can access this report
    if (!['TECHNICIAN', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Access denied. This report is only available to Technicians, Managers, and Admins.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Date filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format');

    let startDateObj: Date;
    let endDateObj: Date;

    if (startDate) {
      startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
    } else {
      // Default to previous month (more likely to have data)
      startDateObj = new Date();
      startDateObj.setMonth(startDateObj.getMonth() - 1);
      startDateObj.setDate(1);
      startDateObj.setHours(0, 0, 0, 0);
    }

    if (endDate) {
      endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
    } else {
      // Default to end of previous month
      endDateObj = new Date();
      endDateObj.setDate(0); // Last day of previous month
      endDateObj.setHours(23, 59, 59, 999);
    }

    // Build where clause for technician access
    const whereClause: any = {
      createdAt: {
        gte: startDateObj,
        lte: endDateObj
      }
    };

    // Technicians see only tickets they're assigned to or in their support group
    if (session.user.role === 'TECHNICIAN') {
      const userWithGroup = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { supportGroup: true }
      });

      const technicianScope = {
        OR: [
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

    // Get all tickets with categories
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        createdAt: true,
        categoryId: true,
        service: {
          select: {
            id: true,
            name: true,
            tier1Category: {
              select: {
                id: true,
                name: true
              }
            },
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get all unique category IDs from tickets
    const categoryIds = [...new Set(tickets.map(t => t.categoryId).filter(Boolean))];

    // Fetch category names in bulk
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds as string[] } },
      select: { id: true, name: true }
    });

    // Create category lookup map
    const categoryLookup = new Map(categories.map(c => [c.id, c.name]));

    // Also check ServiceCategory table for old categories
    const serviceCategories = await prisma.serviceCategory.findMany({
      where: { id: { in: categoryIds as string[] } },
      select: { id: true, name: true }
    });

    // Add service categories to lookup
    serviceCategories.forEach(sc => categoryLookup.set(sc.id, sc.name));

    // Build category map with counts
    // This map merges both old and new category systems by name
    const categoryMap = new Map<string, {
      name: string;
      open: number;
      inProgress: number;
      pending: number;
      resolved: number;
      closed: number;
      cancelled: number;
      total: number;
      sources: Set<string>; // Track which system(s) this category comes from
    }>();

    // Process each ticket - merge both old and new categorization systems
    tickets.forEach(ticket => {
      let categoryName = 'Uncategorized';
      let source = 'unknown';

      // Check all possible category sources and merge by name
      // Priority 1: Direct ticket categoryId (could be OLD ServiceCategory or NEW Category)
      if (ticket.categoryId) {
        categoryName = categoryLookup.get(ticket.categoryId) || 'Uncategorized';
        source = 'ticket-direct';
      }
      // Priority 2: Service 3-tier category (NEW system)
      else if (ticket.service?.tier1Category) {
        categoryName = ticket.service.tier1Category.name;
        source = 'service-3tier';
      }
      // Priority 3: Service old category (OLD ServiceCategory system)
      else if (ticket.service?.category) {
        categoryName = ticket.service.category.name;
        source = 'service-old';
      }

      // Initialize category if doesn't exist
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          open: 0,
          inProgress: 0,
          pending: 0,
          resolved: 0,
          closed: 0,
          cancelled: 0,
          total: 0,
          sources: new Set<string>()
        });
      }

      const category = categoryMap.get(categoryName)!;

      // Track which system(s) this category data comes from
      category.sources.add(source);

      // Count by status
      switch (ticket.status) {
        case 'OPEN':
          category.open++;
          break;
        case 'IN_PROGRESS':
          category.inProgress++;
          break;
        case 'PENDING':
        case 'PENDING_APPROVAL':
        case 'PENDING_VENDOR':
          category.pending++;
          break;
        case 'RESOLVED':
          category.resolved++;
          break;
        case 'CLOSED':
          category.closed++;
          break;
        case 'CANCELLED':
        case 'REJECTED':
          category.cancelled++;
          break;
      }

      category.total++;
    });

    // Convert map to array and sort by total (descending)
    // Remove 'sources' Set before sending to frontend (not JSON serializable)
    const categoryData = Array.from(categoryMap.values())
      .map(({ sources, ...rest }) => ({
        ...rest,
        // Convert sources Set to array for debugging (optional)
        sourceSystems: Array.from(sources)
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate totals
    const totals = {
      open: categoryData.reduce((sum, cat) => sum + cat.open, 0),
      inProgress: categoryData.reduce((sum, cat) => sum + cat.inProgress, 0),
      pending: categoryData.reduce((sum, cat) => sum + cat.pending, 0),
      resolved: categoryData.reduce((sum, cat) => sum + cat.resolved, 0),
      closed: categoryData.reduce((sum, cat) => sum + cat.closed, 0),
      cancelled: categoryData.reduce((sum, cat) => sum + cat.cancelled, 0),
      total: tickets.length
    };

    // Handle export formats
    if (format === 'xlsx') {
      const XLSX = require('xlsx');

      const worksheetData = [
        ['Category', 'Open', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Cancelled', 'Total'],
        ...categoryData.map(cat => [
          cat.name,
          cat.open,
          cat.inProgress,
          cat.pending,
          cat.resolved,
          cat.closed,
          cat.cancelled,
          cat.total
        ]),
        ['TOTAL', totals.open, totals.inProgress, totals.pending, totals.resolved, totals.closed, totals.cancelled, totals.total]
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Report');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="monthly-report-${startDateObj.toISOString().split('T')[0]}-to-${endDateObj.toISOString().split('T')[0]}.xlsx"`
        }
      });
    } else if (format === 'csv') {
      const headers = ['Category', 'Open', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Cancelled', 'Total'];
      const rows = categoryData.map(cat => [
        cat.name,
        cat.open.toString(),
        cat.inProgress.toString(),
        cat.pending.toString(),
        cat.resolved.toString(),
        cat.closed.toString(),
        cat.cancelled.toString(),
        cat.total.toString()
      ]);
      rows.push([
        'TOTAL',
        totals.open.toString(),
        totals.inProgress.toString(),
        totals.pending.toString(),
        totals.resolved.toString(),
        totals.closed.toString(),
        totals.cancelled.toString(),
        totals.total.toString()
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row =>
          row.map(cell => {
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          }).join(',')
        )
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="monthly-report-${startDateObj.toISOString().split('T')[0]}-to-${endDateObj.toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Calculate merge statistics for transparency
    const mergeStats = {
      totalCategories: categoryData.length,
      fromOldSystem: categoryData.filter(c => c.sourceSystems.includes('service-old')).length,
      fromNewSystem: categoryData.filter(c => c.sourceSystems.includes('service-3tier')).length,
      fromBothSystems: categoryData.filter(c =>
        c.sourceSystems.includes('service-old') &&
        (c.sourceSystems.includes('service-3tier') || c.sourceSystems.includes('ticket-direct'))
      ).length,
      mergedSuccessfully: categoryData.filter(c => c.sourceSystems.length > 1).length
    };

    // Return JSON response
    return NextResponse.json({
      dateRange: {
        start: startDateObj.toISOString(),
        end: endDateObj.toISOString()
      },
      categories: categoryData,
      totals,
      ticketCount: tickets.length,
      mergeInfo: {
        message: 'Categories from OLD (ServiceCategory) and NEW (3-tier Category) systems are merged by name',
        stats: mergeStats
      }
    });

  } catch (error) {
    console.error('Error generating monthly report:', error);
    return NextResponse.json(
      { error: 'Failed to generate monthly report' },
      { status: 500 }
    );
  }
}
