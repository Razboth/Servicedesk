import { prisma } from '@/lib/prisma';

/**
 * Track service usage when a ticket is created
 */
export async function trackServiceUsage(
  serviceId: string, 
  userId: string, 
  ticketId: string, 
  branchId?: string
) {
  try {
    await prisma.serviceUsage.create({
      data: {
        serviceId,
        userId,
        ticketId,
        branchId,
        usedAt: new Date()
      }
    });

    console.log(`📊 Service usage tracked: serviceId=${serviceId}, userId=${userId}, ticketId=${ticketId}`);
  } catch (error) {
    console.error('Error tracking service usage:', error);
    // Don't throw error to avoid breaking ticket creation
  }
}

/**
 * Update user's favorite service last used timestamp
 */
export async function updateFavoriteServiceUsage(serviceId: string, userId: string) {
  try {
    const favorite = await prisma.userFavoriteService.findUnique({
      where: {
        userId_serviceId: {
          userId,
          serviceId
        }
      }
    });

    if (favorite) {
      await prisma.userFavoriteService.update({
        where: { id: favorite.id },
        data: { lastUsedAt: new Date() }
      });

      console.log(`⭐ Favorite service usage updated: serviceId=${serviceId}, userId=${userId}`);
    }
  } catch (error) {
    console.error('Error updating favorite service usage:', error);
    // Don't throw error to avoid breaking ticket creation
  }
}

/**
 * Get service usage statistics for analytics
 */
export async function getServiceUsageStats(timeframe: 'day' | 'week' | 'month' = 'week') {
  try {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const stats = await prisma.serviceUsage.groupBy({
      by: ['serviceId'],
      where: {
        usedAt: {
          gte: startDate
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    return stats;
  } catch (error) {
    console.error('Error getting service usage stats:', error);
    return [];
  }
}

/**
 * Get user's service usage patterns
 */
export async function getUserServiceUsagePatterns(userId: string) {
  try {
    const usage = await prisma.serviceUsage.findMany({
      where: { userId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            category: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { usedAt: 'desc' },
      take: 50
    });

    // Group by service to get usage counts
    const serviceUsage = usage.reduce((acc, item) => {
      const serviceId = item.serviceId;
      if (!acc[serviceId]) {
        acc[serviceId] = {
          service: item.service,
          count: 0,
          lastUsed: item.usedAt
        };
      }
      acc[serviceId].count++;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(serviceUsage);
  } catch (error) {
    console.error('Error getting user service usage patterns:', error);
    return [];
  }
}