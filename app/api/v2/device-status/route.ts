import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get the latest collection
    const collection = await prisma.deviceStatusCollection.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        snapshots: {
          orderBy: { serviceName: 'asc' },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: collection.id,
        metadata: {
          dashboard: collection.dashboard,
          source: collection.source,
          fetchedAt: collection.fetchedAt.toISOString(),
          fetchedAtLocal: collection.fetchedAtLocal,
          timeRange: collection.timeRange,
        },
        summary: {
          totalServices: collection.totalServices,
          okCount: collection.okCount,
          downCount: collection.downCount,
          idleCount: collection.idleCount,
        },
        services: collection.snapshots.map((s) => ({
          id: s.id,
          serviceName: s.serviceName,
          groupName: s.groupName,
          status: s.status,
        })),
        createdAt: collection.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Device status fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch device status data' },
      { status: 500 }
    );
  }
}
