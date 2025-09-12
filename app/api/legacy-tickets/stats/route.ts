import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['TECHNICIAN', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get various statistics
    const [
      totalLegacyTickets,
      convertedTickets,
      ticketsByStatus,
      ticketsByPriority,
      ticketsBySystem,
      recentImports,
      migrationBatches
    ] = await Promise.all([
      // Total legacy tickets
      prisma.legacyTicket.count(),
      
      // Converted tickets
      prisma.legacyTicket.count({
        where: { isConverted: true }
      }),
      
      // Tickets by status
      prisma.legacyTicket.groupBy({
        by: ['status'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      
      // Tickets by priority
      prisma.legacyTicket.groupBy({
        by: ['priority'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      
      // Tickets by original system
      prisma.legacyTicket.groupBy({
        by: ['originalSystem'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      
      // Recent imports (last 7 days)
      prisma.legacyTicket.count({
        where: {
          importedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Migration batches summary
      prisma.migrationBatch.findMany({
        where: {
          source: { in: ['MANAGEENGINE', 'SERVICENOW'] }
        },
        select: {
          id: true,
          source: true,
          status: true,
          totalCount: true,
          importedCount: true,
          errorCount: true,
          createdAt: true,
          completedAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const stats = {
      summary: {
        totalLegacyTickets,
        convertedTickets,
        unconvertedTickets: totalLegacyTickets - convertedTickets,
        conversionRate: totalLegacyTickets > 0 
          ? Math.round((convertedTickets / totalLegacyTickets) * 100) 
          : 0,
        recentImports
      },
      breakdowns: {
        byStatus: ticketsByStatus.map(item => ({
          status: item.status,
          count: item._count.id
        })),
        byPriority: ticketsByPriority.map(item => ({
          priority: item.priority,
          count: item._count.id
        })),
        bySystem: ticketsBySystem.map(item => ({
          system: item.originalSystem,
          count: item._count.id
        }))
      },
      migrationHistory: migrationBatches
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching legacy ticket stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch legacy ticket statistics' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}