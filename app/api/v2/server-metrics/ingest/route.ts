import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { authenticateApiKey, checkApiPermission } from '@/lib/auth-api';
import { ServerMetricStatus } from '@prisma/client';

interface ServerData {
  server_name: string;
  instance: string;
  cpu_percent: number | null;
  memory_percent: number | null;
  storage_percent_max: number | null;
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
    // Try API key auth first
    const authResult = await authenticateApiKey(request);

    // Debug logging
    console.log('[Server Metrics V2] API Key auth result:', {
      authenticated: authResult.authenticated,
      error: authResult.error,
    });

    let isAuthorized = false;

    if (authResult.authenticated) {
      // Check for server-metrics:write permission
      const hasPermission = checkApiPermission(authResult.apiKey!, 'server-metrics:write');
      console.log('[Server Metrics V2] Permission check:', { hasPermission });

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'API key does not have server-metrics:write permission. Required: server-metrics:write or *' },
          { status: 403 }
        );
      }
      isAuthorized = true;
    } else {
      // Fallback: Try session auth (for admin users testing from app)
      const session = await auth();
      console.log('[Server Metrics V2] Session auth:', { hasSession: !!session, role: session?.user?.role });

      if (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error || 'Invalid API key or insufficient permissions' },
        { status: 401 }
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

      // Create all server snapshots (handle null values by defaulting to 0)
      await tx.serverMetricSnapshotV2.createMany({
        data: body.servers.map((server) => ({
          collectionId: newCollection.id,
          serverName: server.server_name,
          instance: server.instance,
          cpuPercent: server.cpu_percent ?? 0,
          memoryPercent: server.memory_percent ?? 0,
          storagePercent: server.storage_percent_max ?? 0,
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
