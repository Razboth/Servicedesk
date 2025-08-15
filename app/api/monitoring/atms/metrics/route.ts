import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['MANAGER', 'ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's branch if not admin
    let branchId: string | undefined;
    if (session.user.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });
      branchId = user?.branchId || undefined;
    }

    // Get total ATM count
    const totalATMs = await prisma.aTM.count({
      where: branchId ? { branchId } : {}
    });

    // Get incidents for today and this week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const [incidentsToday, incidentsWeek] = await Promise.all([
      prisma.aTMIncident.count({
        where: {
          createdAt: { gte: today },
          ...(branchId ? { atm: { branchId } } : {})
        }
      }),
      prisma.aTMIncident.count({
        where: {
          createdAt: { gte: weekAgo },
          ...(branchId ? { atm: { branchId } } : {})
        }
      })
    ]);

    // Get ATMs with recent incidents to calculate status
    const atmsWithIncidents = await prisma.aTM.findMany({
      where: branchId ? { branchId } : {},
      include: {
        incidents: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        }
      }
    });

    // Calculate status metrics
    let operational = 0;
    let warning = 0;
    let down = 0;
    let maintenance = 0;

    atmsWithIncidents.forEach(atm => {
      // Check maintenance status
      if (atm.lastMaintenanceDate && 
          new Date(atm.lastMaintenanceDate) > new Date(Date.now() - 2 * 60 * 60 * 1000)) {
        maintenance++;
        return;
      }

      // Check incident severity
      const criticalIncidents = atm.incidents.filter(i => 
        i.severity === 'CRITICAL' || i.severity === 'HIGH'
      );
      
      if (criticalIncidents.length > 0) {
        down++;
      } else if (atm.incidents.length >= 2) {
        warning++;
      } else {
        operational++;
      }
    });

    // Calculate average uptime (simulated)
    const avgUptime = 95 + Math.random() * 4; // 95-99%

    return NextResponse.json({
      total: totalATMs,
      operational,
      warning,
      down,
      maintenance,
      avgUptime: parseFloat(avgUptime.toFixed(2)),
      totalIncidentsToday: incidentsToday,
      totalIncidentsWeek: incidentsWeek
    });
  } catch (error) {
    console.error('Error fetching ATM metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATM metrics' },
      { status: 500 }
    );
  }
}