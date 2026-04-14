import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get the latest collection
    const collection = await prisma.deviceStatusCollection.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        snapshots: {
          orderBy: [
            { groupName: 'asc' },
            { serviceName: 'asc' },
          ],
        },
      },
    });

    if (!collection) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Group services by group name
    const groups: Record<string, typeof collection.snapshots> = {};
    for (const snapshot of collection.snapshots) {
      if (!groups[snapshot.groupName]) {
        groups[snapshot.groupName] = [];
      }
      groups[snapshot.groupName].push(snapshot);
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
          inactiveCount: collection.inactiveCount,
        },
        groups,
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
