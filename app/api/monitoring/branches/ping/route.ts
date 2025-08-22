import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { monitorBranch } from '@/lib/network-monitoring';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { branchId } = await request.json();

    if (!branchId) {
      return NextResponse.json(
        { error: 'Branch ID is required' },
        { status: 400 }
      );
    }

    // Check if branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { 
        id: true, 
        name: true, 
        monitoringEnabled: true,
        ipAddress: true,
        backupIpAddress: true
      }
    });

    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }

    if (!branch.monitoringEnabled) {
      return NextResponse.json(
        { error: 'Monitoring is not enabled for this branch' },
        { status: 400 }
      );
    }

    if (!branch.ipAddress && !branch.backupIpAddress) {
      return NextResponse.json(
        { error: 'No IP addresses configured for this branch' },
        { status: 400 }
      );
    }

    // Perform ping monitoring
    const results = await monitorBranch(branchId);

    return NextResponse.json({
      success: true,
      branch: {
        id: branch.id,
        name: branch.name
      },
      results
    });

  } catch (error) {
    console.error('Branch ping error:', error);
    return NextResponse.json(
      { error: 'Failed to ping branch' },
      { status: 500 }
    );
  }
}

// GET endpoint to get ping history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['MANAGER', 'ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const hours = parseInt(searchParams.get('hours') || '24');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!branchId) {
      return NextResponse.json(
        { error: 'Branch ID is required' },
        { status: 400 }
      );
    }

    // Get user's branch if not admin
    let userBranchId: string | undefined;
    if (session.user.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });
      userBranchId = user?.branchId || undefined;
    }

    // Check if user can access this branch data
    if (userBranchId && branchId !== userBranchId) {
      return NextResponse.json(
        { error: 'Access denied - can only view data for your assigned branch' },
        { status: 403 }
      );
    }

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const results = await prisma.networkPingResult.findMany({
      where: {
        branchId,
        checkedAt: { gte: since }
      },
      orderBy: { checkedAt: 'desc' },
      take: limit
    });

    return NextResponse.json({
      branchId,
      hours,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('Branch ping history error:', error);
    return NextResponse.json(
      { error: 'Failed to get ping history' },
      { status: 500 }
    );
  }
}