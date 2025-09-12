import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'quarter';
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfMonth(subMonths(now, 2));
        break;
      case 'year':
        startDate = startOfMonth(subMonths(now, 11));
        break;
      default:
        startDate = startOfMonth(subMonths(now, 2));
    }

    // Build where clause based on user role
    let whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: now
      }
    };

    // Role-based filtering
    if (session.user.role === 'USER') {
      whereClause.createdById = session.user.id;
    } else if (session.user.role === 'TECHNICIAN') {
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
      const manager = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      
      if (manager?.branchId) {
        whereClause.createdBy = {
          branchId: manager.branchId
        };
      }
    }

    // Get all tickets with service and category relationships
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        priority: true,
        serviceId: true,
        categoryId: true,
        subcategoryId: true,
        itemId: true,
        createdAt: true,
        resolvedAt: true,
        actualHours: true,
        service: {
          select: {
            name: true,
            category: {
              select: { id: true, name: true }
            },
            tier1Category: {
              select: { id: true, name: true }
            },
            tier2Subcategory: {
              select: { id: true, name: true, category: { select: { name: true } } }
            },
            tier3Item: {
              select: { id: true, name: true, subcategory: { select: { name: true, category: { select: { name: true } } } } }
            }
          }
        },
        // Direct category relationships (fallback)
        category: {
          select: { id: true, name: true }
        },
        subcategory: {
          select: { id: true, name: true }
        },
        item: {
          select: { id: true, name: true }
        }
      }
    });

    // Get satisfaction scores (simulated for now)
    const satisfactionData = await prisma.ticket.groupBy({
      by: ['categoryId'],
      where: {
        ...whereClause,
        resolvedAt: { not: null }
      },
      _count: true
    });

    // Build category hierarchy with statistics
    const categoryMap = new Map<string, any>();
    
    for (const ticket of tickets) {
      // Prioritize service categories, fall back to direct category relationships
      let categoryId: string;
      let categoryName: string;
      let subcategoryName: string;
      let itemName: string;

      if (ticket.service?.category) {
        // Use ServiceCategory system
        categoryId = ticket.service.category.id;
        categoryName = ticket.service.category.name;
        subcategoryName = 'Service: ' + ticket.service.name;
        itemName = 'N/A';
      } else if (ticket.service?.tier1Category) {
        // Use 3-tier system through service
        categoryId = ticket.service.tier1Category.id;
        categoryName = ticket.service.tier1Category.name;
        subcategoryName = ticket.service.tier2Subcategory?.name || 'No Subcategory';
        itemName = ticket.service.tier3Item?.name || 'No Item';
      } else if (ticket.category) {
        // Fall back to direct category relationships  
        categoryId = ticket.categoryId || 'direct';
        categoryName = ticket.category.name;
        subcategoryName = ticket.subcategory?.name || 'No Subcategory';
        itemName = ticket.item?.name || 'No Item';
      } else {
        // Default fallback
        categoryId = 'uncategorized';
        categoryName = 'Uncategorized';
        subcategoryName = ticket.service?.name || 'Unknown Service';
        itemName = 'N/A';
      }
      
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          category: categoryName,
          categoryId: categoryId,
          subcategories: new Map(),
          totalCount: 0,
          openCount: 0,
          resolvedCount: 0,
          totalResolutionTime: 0,
          priorities: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0, CRITICAL: 0, EMERGENCY: 0 }
        });
      }
      
      const categoryData = categoryMap.get(categoryId);
      categoryData.totalCount++;
      
      if (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') {
        categoryData.openCount++;
      } else if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        categoryData.resolvedCount++;
        if (ticket.resolvedAt) {
          const resolutionTime = (new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
          categoryData.totalResolutionTime += resolutionTime;
        }
      }
      
      // Track priorities
      if (ticket.priority) {
        categoryData.priorities[ticket.priority]++;
      }
      
      // Track subcategories using dynamic IDs
      const subcategoryId = ticket.service?.name || subcategoryName || 'none';
      if (!categoryData.subcategories.has(subcategoryId)) {
        categoryData.subcategories.set(subcategoryId, {
          name: subcategoryName,
          items: new Map(),
          count: 0,
          avgResolutionTime: 0,
          totalResolutionTime: 0,
          resolvedCount: 0
        });
      }
      
      const subcategoryData = categoryData.subcategories.get(subcategoryId);
      subcategoryData.count++;
      
      if (ticket.resolvedAt) {
        const resolutionTime = (new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
        subcategoryData.totalResolutionTime += resolutionTime;
        subcategoryData.resolvedCount++;
      }
      
      // Track items using service name or item name
      const itemId = ticket.service?.name || itemName || 'none';
      if (!subcategoryData.items.has(itemId)) {
        subcategoryData.items.set(itemId, {
          name: itemName,
          count: 0
        });
      }
      subcategoryData.items.get(itemId).count++;
    }

    // Calculate previous period for trends
    const prevStartDate = subMonths(startDate, 3);
    const prevEndDate = startDate;
    
    // Get previous period tickets with proper service category grouping
    const prevPeriodTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: prevStartDate,
          lt: prevEndDate
        }
      },
      select: {
        id: true,
        categoryId: true,
        service: {
          select: {
            category: { select: { id: true } },
            tier1Category: { select: { id: true } }
          }
        },
        category: { select: { id: true } }
      }
    });

    // Build previous counts using same logic as current tickets
    const prevCounts = new Map<string, number>();
    for (const ticket of prevPeriodTickets) {
      let categoryId: string;
      if (ticket.service?.category) {
        categoryId = ticket.service.category.id;
      } else if (ticket.service?.tier1Category) {
        categoryId = ticket.service.tier1Category.id;
      } else if (ticket.category) {
        categoryId = ticket.categoryId || 'direct';
      } else {
        categoryId = 'uncategorized';
      }
      
      prevCounts.set(categoryId, (prevCounts.get(categoryId) || 0) + 1);
    }

    // Format response data
    const categoryColors = [
      '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', 
      '#06b6d4', '#ec4899', '#6366f1', '#84cc16', '#f97316'
    ];
    
    const categoryData = Array.from(categoryMap.entries()).map(([categoryId, data], index) => {
      const prevCount = prevCounts.get(categoryId) || 0;
      const trend = prevCount > 0 ? ((data.totalCount - prevCount) / prevCount) * 100 : 0;
      
      // Calculate average resolution time
      const avgResolutionTime = data.resolvedCount > 0 ? 
        data.totalResolutionTime / data.resolvedCount : 0;
      
      // Format subcategories
      const subcategories = Array.from(data.subcategories.values()).map((subcat: any) => ({
        name: subcat.name,
        count: subcat.count,
        avgResolutionTime: subcat.resolvedCount > 0 ? 
          Math.round(subcat.totalResolutionTime / subcat.resolvedCount * 10) / 10 : 0,
        items: Array.from(subcat.items.values())
      }));
      
      // Calculate average satisfaction (simulated)
      const satisfactionScore = 3.5 + Math.random() * 1.5; // Between 3.5 and 5
      
      return {
        category: data.category,
        categoryId: categoryId,
        subcategories,
        totalCount: data.totalCount,
        openCount: data.openCount,
        resolvedCount: data.resolvedCount,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        avgSatisfaction: Math.round(satisfactionScore * 10) / 10,
        trend: Math.round(trend * 10) / 10,
        color: categoryColors[index % categoryColors.length],
        priorities: data.priorities
      };
    }).sort((a, b) => b.totalCount - a.totalCount);

    // Generate trend data for the last 6 months
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthName = monthStart.toLocaleDateString('en', { month: 'short' });
      
      const monthTickets = await prisma.ticket.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        select: {
          id: true,
          categoryId: true,
          service: {
            select: {
              category: { select: { id: true } },
              tier1Category: { select: { id: true } }
            }
          },
          category: { select: { id: true } }
        }
      });
      
      const monthData: any = { month: monthName };
      
      // Initialize all categories with 0
      categoryData.forEach(cat => {
        monthData[cat.category] = 0;
      });
      
      // Count tickets by category using same logic
      const monthCounts = new Map<string, number>();
      for (const ticket of monthTickets) {
        let categoryId: string;
        if (ticket.service?.category) {
          categoryId = ticket.service.category.id;
        } else if (ticket.service?.tier1Category) {
          categoryId = ticket.service.tier1Category.id;
        } else if (ticket.category) {
          categoryId = ticket.categoryId || 'direct';
        } else {
          categoryId = 'uncategorized';
        }
        
        monthCounts.set(categoryId, (monthCounts.get(categoryId) || 0) + 1);
      }
      
      // Fill in actual counts
      monthCounts.forEach((count, catId) => {
        const category = categoryMap.get(catId);
        if (category) {
          monthData[category.category] = count;
        }
      });
      
      trendData.push(monthData);
    }

    // Calculate distribution for treemap
    const treemapData = categoryData.map(cat => ({
      name: cat.category,
      value: cat.totalCount,
      color: cat.color,
      children: cat.subcategories.map((subcat: any) => ({
        name: subcat.name,
        value: subcat.count,
        color: cat.color
      }))
    }));

    // Summary statistics
    const totalTickets = categoryData.reduce((sum, cat) => sum + cat.totalCount, 0);
    const totalOpen = categoryData.reduce((sum, cat) => sum + cat.openCount, 0);
    const totalResolved = categoryData.reduce((sum, cat) => sum + cat.resolvedCount, 0);
    const avgResolutionTime = totalResolved > 0 ?
      categoryData.reduce((sum, cat) => sum + (cat.avgResolutionTime * cat.resolvedCount), 0) / totalResolved : 0;

    return NextResponse.json({
      categoryData,
      trendData,
      treemapData,
      summary: {
        totalTickets,
        totalOpen,
        totalResolved,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        resolutionRate: totalTickets > 0 ? Math.round((totalResolved / totalTickets) * 1000) / 10 : 0,
        topCategory: categoryData[0]?.category || 'N/A',
        categoriesCount: categoryData.length
      }
    });

  } catch (error) {
    console.error('Error fetching category analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category analytics' },
      { status: 500 }
    );
  }
}