import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DeviceServiceStatus } from '@prisma/client';

interface ServiceData {
  title: string;
  group: string;
  status: string;
  raw_value: number;
}

interface IngestPayload {
  metadata: {
    dashboard: string | null;
    source: string | null;
    fetched_at: string;
    fetched_at_local: string | null;
    time_range: string | null;
  };
  summary: {
    total_services: number;
    ok_count: number;
    down_count: number;
    inactive_count: number;
  };
  services: ServiceData[];
}

function mapStatus(status: string): DeviceServiceStatus {
  switch (status.toUpperCase()) {
    case 'OK':
      return 'OK';
    case 'DOWN':
      return 'DOWN';
    case 'INACTIVE':
      return 'INACTIVE';
    case 'NUMERIC':
      return 'NUMERIC';
    default:
      return 'INACTIVE';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: IngestPayload = await request.json();

    // Validate required fields
    if (!body.metadata || !body.services || !Array.isArray(body.services)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload structure' },
        { status: 400 }
      );
    }

    // Parse the fetched_at date
    let fetchedAt: Date;
    try {
      fetchedAt = new Date(body.metadata.fetched_at);
      if (isNaN(fetchedAt.getTime())) {
        fetchedAt = new Date();
      }
    } catch {
      fetchedAt = new Date();
    }

    // Create the collection with snapshots
    const collection = await prisma.deviceStatusCollection.create({
      data: {
        dashboard: body.metadata.dashboard,
        source: body.metadata.source,
        fetchedAt,
        fetchedAtLocal: body.metadata.fetched_at_local,
        timeRange: body.metadata.time_range,
        totalServices: body.summary.total_services,
        okCount: body.summary.ok_count,
        downCount: body.summary.down_count,
        inactiveCount: body.summary.inactive_count,
        snapshots: {
          create: body.services.map((service) => ({
            serviceName: service.title,
            groupName: service.group,
            status: mapStatus(service.status),
          })),
        },
      },
      include: {
        snapshots: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: collection.id,
        totalServices: collection.totalServices,
        snapshotCount: collection.snapshots.length,
        createdAt: collection.createdAt,
      },
    });
  } catch (error) {
    console.error('Device status ingest error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to ingest device status data' },
      { status: 500 }
    );
  }
}
