import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const collections = await prisma.deviceStatusCollection.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: {
        id: true,
        fetchedAt: true,
        fetchedAtLocal: true,
        totalServices: true,
        okCount: true,
        downCount: true,
        idleCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        collections: collections.map((c) => ({
          id: c.id,
          fetchedAt: c.fetchedAt.toISOString(),
          fetchedAtLocal: c.fetchedAtLocal,
          totalServices: c.totalServices,
          summary: {
            ok: c.okCount,
            down: c.downCount,
            idle: c.idleCount,
          },
        })),
      },
    });
  } catch (error) {
    console.error('Device status history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch device status history' },
      { status: 500 }
    );
  }
}
