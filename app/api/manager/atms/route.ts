import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's branch
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    if (!user?.branch) {
      return NextResponse.json(
        { error: 'No branch assigned' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {
      branchId: user.branch.id
    };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch ATMs with incident counts
    const atms = await prisma.aTM.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        location: true,
        ipAddress: true,
        isActive: true,
        _count: {
          select: {
            incidents: true
          }
        },
        incidents: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] }
          },
          select: { id: true }
        }
      },
      orderBy: { code: 'asc' }
    });

    // Transform data to include active incident count
    const transformedATMs = atms.map(atm => ({
      ...atm,
      activeIncidents: atm.incidents.length,
      incidents: undefined // Remove the raw incidents array
    }));

    // Filter by status if specified
    let filteredATMs = transformedATMs;
    if (status === 'operational') {
      filteredATMs = transformedATMs.filter(a => a.isActive && a.activeIncidents === 0);
    } else if (status === 'issues') {
      filteredATMs = transformedATMs.filter(a => a.activeIncidents > 0);
    } else if (status === 'inactive') {
      filteredATMs = transformedATMs.filter(a => !a.isActive);
    }

    // Get branch statistics
    const [totalATMs, activeATMs] = await Promise.all([
      prisma.aTM.count({ where: { branchId: user.branch.id } }),
      prisma.aTM.count({ where: { branchId: user.branch.id, isActive: true } })
    ]);

    return NextResponse.json({
      atms: filteredATMs,
      branchInfo: {
        name: user.branch.name,
        code: user.branch.code,
        atmCount: totalATMs,
        activeATMs
      }
    });
  } catch (error) {
    console.error('Error fetching manager ATMs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATMs' },
      { status: 500 }
    );
  }
}