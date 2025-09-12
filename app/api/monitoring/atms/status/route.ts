import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getNetworkHealth } from '@/lib/network-monitoring';

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

    // Fetch ATMs with their status
    const atms = await prisma.aTM.findMany({
      where: branchId ? { branchId } : {},
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        incidents: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        },
        networkIncidents: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] }
          }
        }
      }
    });

    // Fetch active tickets for each ATM
    const atmCodes = atms.map(atm => atm.code);
    const activeTickets = await prisma.ticket.findMany({
      where: {
        OR: atmCodes.map(code => ({
          OR: [
            { description: { contains: code, mode: 'insensitive' } },
            { title: { contains: code, mode: 'insensitive' } }
          ]
        })),
        status: {
          in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL']
        }
      },
      select: {
        id: true,
        title: true,
        description: true
      }
    });

    // Get network health for all ATMs in parallel
    const atmStatusPromises = atms.map(async (atm) => {
      // Count active tickets for this ATM
      const atmActiveTickets = activeTickets.filter(ticket => 
        ticket.title.toLowerCase().includes(atm.code.toLowerCase()) ||
        ticket.description.toLowerCase().includes(atm.code.toLowerCase())
      ).length;

      // Get network health data
      let networkHealth = null;
      if (atm.ipAddress) {
        try {
          networkHealth = await getNetworkHealth('ATM', atm.id, 24);
        } catch (error) {
          console.error(`Failed to get network health for ATM ${atm.code}:`, error);
        }
      }

      // Determine status based on network health and incidents
      let status: 'OPERATIONAL' | 'WARNING' | 'DOWN' | 'MAINTENANCE' = 'OPERATIONAL';
      let uptime = 99.5;
      let lastPing = new Date().toISOString();
      let networkStatus = networkHealth?.status || 'NO_DATA';
      let responseTime = networkHealth?.avgResponseTime;

      // Use network health data if available
      if (networkHealth && networkHealth.status !== 'NO_DATA') {
        uptime = networkHealth.uptime;
        lastPing = networkHealth.lastCheck ? new Date(networkHealth.lastCheck).toISOString() : lastPing;
        
        // Map network status to ATM status
        if (networkStatus === 'OFFLINE') {
          status = 'DOWN';
        } else if (networkStatus === 'SLOW' || networkStatus === 'ERROR') {
          status = 'WARNING';
        }
      }

      // Check for network incidents
      if (atm.networkIncidents && atm.networkIncidents.length > 0) {
        const criticalIncidents = atm.networkIncidents.filter(i => 
          i.severity === 'CRITICAL'
        );
        
        if (criticalIncidents.length > 0) {
          status = 'DOWN';
        } else {
          status = 'WARNING';
        }
      }

      // Determine status based on other incidents
      if (atm.incidents.length > 0) {
        const criticalIncidents = atm.incidents.filter(i => 
          i.severity === 'CRITICAL' || i.severity === 'HIGH'
        );
        
        if (criticalIncidents.length > 0) {
          status = 'DOWN';
        } else if (atm.incidents.length >= 2 && status === 'OPERATIONAL') {
          status = 'WARNING';
        }
      }

      // Simulate cash and paper levels (in real system, this would come from ATM monitoring)
      // Use ATM ID as seed to generate consistent values that don't change on refresh
      const atmSeed = atm.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const cashSeed = (atmSeed * 31 + 17) % 80; // Deterministic value 0-79
      const paperSeed = (atmSeed * 37 + 23) % 80; // Different deterministic value 0-79
      let cashLevel = cashSeed + 20; // Range 20-99
      let paperLevel = paperSeed + 20; // Range 20-99

      // Simulate low resource warnings
      if (cashLevel < 30 || paperLevel < 30) {
        if (status === 'OPERATIONAL') {
          status = 'WARNING';
        }
      }

      return {
        id: atm.id,
        code: atm.code,
        location: atm.location || '',
        status,
        lastPing,
        uptime: parseFloat(uptime.toFixed(2)),
        cashLevel,
        paperLevel,
        branch: atm.branch,
        recentIncidents: atm.incidents.length,
        activeTickets: atmActiveTickets,
        networkMedia: atm.networkMedia,
        networkVendor: atm.networkVendor,
        networkStatus,
        responseTime,
        packetLoss: networkHealth?.avgPacketLoss
      };
    });

    const atmStatus = await Promise.all(atmStatusPromises);

    return NextResponse.json({ atms: atmStatus });
  } catch (error) {
    console.error('Error fetching ATM status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATM status' },
      { status: 500 }
    );
  }
}