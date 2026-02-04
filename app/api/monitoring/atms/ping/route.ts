import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { monitorATM } from '@/lib/network-monitoring';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { atmId } = await request.json();

    if (!atmId) {
      return NextResponse.json(
        { error: 'ATM ID is required' },
        { status: 400 }
      );
    }

    // Check if ATM exists
    const atm = await prisma.aTM.findUnique({
      where: { id: atmId },
      select: { 
        id: true, 
        code: true,
        name: true,
        isActive: true,
        ipAddress: true
      }
    });

    if (!atm) {
      return NextResponse.json(
        { error: 'ATM not found' },
        { status: 404 }
      );
    }

    if (!atm.isActive) {
      return NextResponse.json(
        { error: 'ATM is not active' },
        { status: 400 }
      );
    }

    if (!atm.ipAddress) {
      return NextResponse.json(
        { error: 'No IP address configured for this ATM' },
        { status: 400 }
      );
    }

    // Perform ping monitoring
    const result = await monitorATM(atmId);

    return NextResponse.json({
      success: true,
      atm: {
        id: atm.id,
        code: atm.code,
        name: atm.name
      },
      result
    });

  } catch (error) {
    console.error('ATM ping error:', error);
    return NextResponse.json(
      { error: 'Failed to ping ATM' },
      { status: 500 }
    );
  }
}

// GET endpoint to get ping history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const atmId = searchParams.get('atmId');
    const hours = parseInt(searchParams.get('hours') || '24');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!atmId) {
      return NextResponse.json(
        { error: 'ATM ID is required' },
        { status: 400 }
      );
    }

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const results = await prisma.networkPingResult.findMany({
      where: {
        atmId,
        checkedAt: { gte: since }
      },
      orderBy: { checkedAt: 'desc' },
      take: limit
    });

    return NextResponse.json({
      atmId,
      hours,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('ATM ping history error:', error);
    return NextResponse.json(
      { error: 'Failed to get ping history' },
      { status: 500 }
    );
  }
}