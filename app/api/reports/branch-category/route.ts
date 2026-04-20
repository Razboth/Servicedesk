import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

// GET /api/reports/branch-category - Get ticket counts by branch and category
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Default to current month if no dates provided
    const now = new Date();
    const dateStart = startDate ? new Date(startDate) : startOfMonth(now);
    const dateEnd = endDate ? new Date(endDate) : endOfMonth(now);

    // Build where clause based on user role
    const userRole = session.user.role;
    const userBranchId = session.user.branchId;

    let branchFilter: any = { isActive: true };
    let ticketBranchFilter: any = {};

    if (userRole === 'MANAGER' && userBranchId) {
      branchFilter = { id: userBranchId, isActive: true };
      ticketBranchFilter = { branchId: userBranchId };
    }

    // Get all active branches
    const branches = await prisma.branch.findMany({
      where: branchFilter,
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    // Get all categories (from service tier1)
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { order: 'asc' },
    });

    // Get ticket counts grouped by branch and category
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: dateStart, lte: dateEnd },
        ...ticketBranchFilter,
      },
      select: {
        id: true,
        branchId: true,
        service: {
          select: {
            tier1Category: { select: { id: true, name: true } },
            serviceCategory: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Build branch-category matrix
    const matrix: Record<string, Record<string, number>> = {};
    const branchTotals: Record<string, number> = {};
    const categoryTotals: Record<string, number> = {};

    // Initialize matrix
    for (const branch of branches) {
      matrix[branch.id] = {};
      branchTotals[branch.id] = 0;
      for (const cat of categories) {
        matrix[branch.id][cat.id] = 0;
      }
    }

    for (const cat of categories) {
      categoryTotals[cat.id] = 0;
    }

    // Count tickets - handle tickets without branch (assign to "No Branch")
    const noBranchId = '__NO_BRANCH__';
    matrix[noBranchId] = {};
    branchTotals[noBranchId] = 0;
    for (const cat of categories) {
      matrix[noBranchId][cat.id] = 0;
    }

    // Also handle uncategorized
    const uncategorizedId = '__UNCATEGORIZED__';
    categoryTotals[uncategorizedId] = 0;
    for (const branchId of [...branches.map((b) => b.id), noBranchId]) {
      matrix[branchId][uncategorizedId] = 0;
    }

    for (const ticket of tickets) {
      const branchId = ticket.branchId || noBranchId;
      const categoryId = ticket.service?.tier1Category?.id ||
                         ticket.service?.serviceCategory?.id ||
                         uncategorizedId;

      if (!matrix[branchId]) {
        matrix[branchId] = {};
        branchTotals[branchId] = 0;
      }
      if (!matrix[branchId][categoryId]) {
        matrix[branchId][categoryId] = 0;
      }

      matrix[branchId][categoryId]++;
      branchTotals[branchId] = (branchTotals[branchId] || 0) + 1;
      categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + 1;
    }

    // Build response data
    const branchData = branches.map((branch) => {
      const categoryBreakdown = categories
        .map((cat) => ({
          categoryId: cat.id,
          categoryName: cat.name,
          count: matrix[branch.id]?.[cat.id] || 0,
        }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count);

      // Add uncategorized if any
      const uncatCount = matrix[branch.id]?.[uncategorizedId] || 0;
      if (uncatCount > 0) {
        categoryBreakdown.push({
          categoryId: uncategorizedId,
          categoryName: 'Uncategorized',
          count: uncatCount,
        });
      }

      return {
        branchId: branch.id,
        branchName: branch.name,
        branchCode: branch.code,
        totalTickets: branchTotals[branch.id] || 0,
        categories: categoryBreakdown,
      };
    }).filter((b) => b.totalTickets > 0);

    // Add "No Branch" if any
    const noBranchTotal = branchTotals[noBranchId] || 0;
    if (noBranchTotal > 0) {
      const noBranchCategories = categories
        .map((cat) => ({
          categoryId: cat.id,
          categoryName: cat.name,
          count: matrix[noBranchId]?.[cat.id] || 0,
        }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count);

      const uncatCount = matrix[noBranchId]?.[uncategorizedId] || 0;
      if (uncatCount > 0) {
        noBranchCategories.push({
          categoryId: uncategorizedId,
          categoryName: 'Uncategorized',
          count: uncatCount,
        });
      }

      branchData.push({
        branchId: noBranchId,
        branchName: 'No Branch Assigned',
        branchCode: '-',
        totalTickets: noBranchTotal,
        categories: noBranchCategories,
      });
    }

    // Sort by total tickets descending
    branchData.sort((a, b) => b.totalTickets - a.totalTickets);

    // Category summary
    const categorySummary = categories
      .map((cat) => ({
        categoryId: cat.id,
        categoryName: cat.name,
        count: categoryTotals[cat.id] || 0,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

    // Add uncategorized to summary
    if (categoryTotals[uncategorizedId] > 0) {
      categorySummary.push({
        categoryId: uncategorizedId,
        categoryName: 'Uncategorized',
        count: categoryTotals[uncategorizedId],
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        dateRange: {
          start: dateStart.toISOString(),
          end: dateEnd.toISOString(),
        },
        totalTickets: tickets.length,
        branchData,
        categorySummary,
        allCategories: categories,
      },
    });
  } catch (error) {
    console.error('Error fetching branch-category report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
