import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface ServiceStatusCount {
  serviceId: string;
  serviceName: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  statusCounts: {
    OPEN: number;
    IN_PROGRESS: number;
    PENDING_APPROVAL: number;
    RESOLVED: number;
    CLOSED: number;
    CANCELLED: number;
  };
  totalCount: number;
}

interface CategorySummary {
  categoryId: string;
  categoryName: string;
  services: ServiceStatusCount[];
  totals: {
    OPEN: number;
    IN_PROGRESS: number;
    PENDING_APPROVAL: number;
    RESOLVED: number;
    CLOSED: number;
    CANCELLED: number;
    TOTAL: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchId = searchParams.get('branchId');

    // Build where clause for filtering
    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (branchId) {
      whereClause.branchId = branchId;
    }

    // No role-based filtering - show all tickets for all users
    // This report shows system-wide statistics

    // Fetch all tickets with their services and categories
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        service: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            tier2Subcategory: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Process data to create the report structure
    const categoryMap = new Map<string, CategorySummary>();

    tickets.forEach((ticket) => {
      if (!ticket.service || !ticket.service.category) return;

      const categoryId = ticket.service.category.id;
      const categoryName = ticket.service.category.name;
      const serviceId = ticket.service.id;
      const serviceName = ticket.service.name;

      // Get or create category summary
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          categoryId,
          categoryName,
          services: [],
          totals: {
            OPEN: 0,
            IN_PROGRESS: 0,
            PENDING_APPROVAL: 0,
            RESOLVED: 0,
            CLOSED: 0,
            CANCELLED: 0,
            TOTAL: 0,
          },
        });
      }

      const categorySummary = categoryMap.get(categoryId)!;

      // Find or create service within category
      let serviceStatus = categorySummary.services.find(s => s.serviceId === serviceId);

      if (!serviceStatus) {
        serviceStatus = {
          serviceId,
          serviceName,
          categoryId,
          categoryName,
          subcategoryId: ticket.service.tier2Subcategory?.id,
          subcategoryName: ticket.service.tier2Subcategory?.name,
          statusCounts: {
            OPEN: 0,
            IN_PROGRESS: 0,
            PENDING_APPROVAL: 0,
            RESOLVED: 0,
            CLOSED: 0,
            CANCELLED: 0,
          },
          totalCount: 0,
        };
        categorySummary.services.push(serviceStatus);
      }

      // Update counts
      const status = ticket.status as keyof typeof serviceStatus.statusCounts;
      if (serviceStatus.statusCounts.hasOwnProperty(status)) {
        serviceStatus.statusCounts[status]++;
        serviceStatus.totalCount++;

        // Update category totals
        categorySummary.totals[status]++;
        categorySummary.totals.TOTAL++;
      }
    });

    // Convert map to array and sort
    const report = Array.from(categoryMap.values()).sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName)
    );

    // Sort services within each category
    report.forEach(category => {
      category.services.sort((a, b) => a.serviceName.localeCompare(b.serviceName));
    });

    // Calculate grand totals
    const grandTotals = {
      OPEN: 0,
      IN_PROGRESS: 0,
      PENDING_APPROVAL: 0,
      RESOLVED: 0,
      CLOSED: 0,
      CANCELLED: 0,
      TOTAL: 0,
    };

    report.forEach(category => {
      Object.keys(grandTotals).forEach(key => {
        grandTotals[key as keyof typeof grandTotals] += category.totals[key as keyof typeof category.totals];
      });
    });

    return NextResponse.json({
      report,
      grandTotals,
      metadata: {
        generatedAt: new Date().toISOString(),
        filters: {
          startDate,
          endDate,
          branchId,
        },
        totalCategories: report.length,
        totalServices: report.reduce((acc, cat) => acc + cat.services.length, 0),
      },
    });

  } catch (error) {
    console.error('Error generating service status report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}