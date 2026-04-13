import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey, checkApiPermission } from '@/lib/auth-api';
import { ServerMetricStatus } from '@prisma/client';

interface ServerData {
  server_name: string;
  instance: string;
  cpu_percent: number;
  memory_percent: number;
  storage_percent_max: number;
  status: 'OK' | 'CAUTION' | 'WARNING';
}

interface IngestPayload {
  metadata: {
    dashboard?: string;
    source?: string;
    fetched_at: string;
    fetched_at_local?: string;
    time_range?: string;
  };
  summary: {
    total_servers: number;
    warning_count: number;
    caution_count: number;
    ok_count: number;
  };
  servers: ServerData[];
}

// POST /api/v2/server-metrics/ingest - Receive server metrics from Grafana
export async function POST(request: NextRequest) {
  try {
    // Authenticate via API key
    const authResult = await authenticateApiKey(request);

    // Debug logging
    console.log('[Server Metrics V2] Auth result:', {
      authenticated: authResult.authenticated,
      error: authResult.error,
      hasApiKey: !!authResult.apiKey,
      permissions: authResult.apiKey?.permissions,
    });

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error || 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Check for server-metrics:write permission
    const hasPermission = checkApiPermission(authResult.apiKey!, 'server-metrics:write');
    console.log('[Server Metrics V2] Permission check:', { hasPermission, required: 'server-metrics:write' });

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'API key does not have server-metrics:write permission. Required: server-metrics:write or *' },
        { status: 403 }
      );
    }

    const body: IngestPayload = await request.json();

    // Validate required fields
    if (!body.metadata?.fetched_at) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing metadata.fetched_at' },
        { status: 400 }
      );
    }

    if (!body.servers || !Array.isArray(body.servers) || body.servers.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing or empty servers array' },
        { status: 400 }
      );
    }

    // Create collection with all snapshots in a transaction
    const collection = await prisma.$transaction(async (tx) => {
      // Create the collection
      const newCollection = await tx.serverMetricCollectionV2.create({
        data: {
          dashboard: body.metadata.dashboard,
          source: body.metadata.source,
          fetchedAt: new Date(body.metadata.fetched_at),
          fetchedAtLocal: body.metadata.fetched_at_local,
          timeRange: body.metadata.time_range,
          totalServers: body.summary?.total_servers ?? body.servers.length,
          warningCount: body.summary?.warning_count ?? 0,
          cautionCount: body.summary?.caution_count ?? 0,
          okCount: body.summary?.ok_count ?? 0,
        },
      });

      // Create all server snapshots
      await tx.serverMetricSnapshotV2.createMany({
        data: body.servers.map((server) => ({
          collectionId: newCollection.id,
          serverName: server.server_name,
          instance: server.instance,
          cpuPercent: server.cpu_percent,
          memoryPercent: server.memory_percent,
          storagePercent: server.storage_percent_max,
          status: server.status as ServerMetricStatus,
        })),
      });

      return newCollection;
    });

    return NextResponse.json({
      success: true,
      message: 'Server metrics ingested successfully',
      data: {
        collectionId: collection.id,
        fetchedAt: collection.fetchedAt,
        totalServers: collection.totalServers,
        summary: {
          ok: collection.okCount,
          caution: collection.cautionCount,
          warning: collection.warningCount,
        },
      },
    });
  } catch (error) {
    console.error('[Server Metrics V2] Ingest error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to ingest server metrics' },
      { status: 500 }
    );
  }
}
