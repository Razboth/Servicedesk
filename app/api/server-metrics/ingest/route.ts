import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey, checkApiPermission } from '@/lib/auth-api';

interface StorageItem {
  partition: string;
  usage: string;
}

interface MetricData {
  ip_address: string;
  timestamp: string;
  cpu: string;
  memory: string | null;
  storage: StorageItem[];
}

interface IngestPayload {
  fetched_at: string;
  report_timestamp: string;
  total_ips: number;
  metrics: Record<string, MetricData>;
}

// Parse percentage string to float (e.g., "6.40%" -> 6.40)
function parsePercentage(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/^([\d.]+)%?$/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

// Parse storage array and convert usage percentages to floats
function parseStorage(storage: StorageItem[]): { partition: string; usagePercent: number }[] {
  return storage.map((item) => ({
    partition: item.partition,
    usagePercent: parsePercentage(item.usage) ?? 0,
  }));
}

// POST /api/server-metrics/ingest - Receive bulk server metrics from external system
export async function POST(request: NextRequest) {
  try {
    // Authenticate via API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error || 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Check for server-metrics:write permission
    if (!checkApiPermission(authResult.apiKey!, 'server-metrics:write')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'API key does not have server-metrics:write permission' },
        { status: 403 }
      );
    }

    const body: IngestPayload = await request.json();

    // Validate required fields
    if (!body.metrics || typeof body.metrics !== 'object') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing or invalid metrics data' },
        { status: 400 }
      );
    }

    const fetchedAt = body.fetched_at ? new Date(body.fetched_at) : new Date();
    const reportTimestamp = body.report_timestamp ? new Date(body.report_timestamp) : new Date();
    const metricsEntries = Object.values(body.metrics);

    if (metricsEntries.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No metrics data provided' },
        { status: 400 }
      );
    }

    // Create metric collection
    const collection = await prisma.metricCollection.create({
      data: {
        fetchedAt,
        reportTimestamp,
        totalIps: body.total_ips || metricsEntries.length,
      },
    });

    // Process each server's metrics
    let processedCount = 0;
    let newServersCount = 0;
    let skippedDuplicates = 0;

    // Calculate 1 hour ago for duplicate check
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    for (const metric of metricsEntries) {
      const ipAddress = metric.ip_address;
      if (!ipAddress) continue;

      // Find or create the monitored server
      let server = await prisma.monitoredServer.findUnique({
        where: { ipAddress },
      });

      if (!server) {
        server = await prisma.monitoredServer.create({
          data: {
            ipAddress,
            isActive: true,
          },
        });
        newServersCount++;
      }

      // Check for existing metric within the last hour
      const existingMetric = await prisma.serverMetricSnapshot.findFirst({
        where: {
          serverId: server.id,
          collectedAt: { gte: oneHourAgo },
        },
        orderBy: { collectedAt: 'desc' },
      });

      if (existingMetric) {
        // Skip this server - already has a metric within the last hour
        skippedDuplicates++;
        continue;
      }

      // Create metric snapshot
      const timestamp = metric.timestamp ? new Date(metric.timestamp) : reportTimestamp;
      const cpuPercent = parsePercentage(metric.cpu);
      const memoryPercent = parsePercentage(metric.memory);
      const storage = metric.storage ? parseStorage(metric.storage) : null;

      await prisma.serverMetricSnapshot.create({
        data: {
          serverId: server.id,
          collectionId: collection.id,
          cpuPercent,
          memoryPercent,
          storage,
          timestamp,
        },
      });

      processedCount++;
    }

    return NextResponse.json({
      success: true,
      message: 'Server metrics ingested successfully',
      data: {
        collectionId: collection.id,
        fetchedAt: collection.fetchedAt,
        reportTimestamp: collection.reportTimestamp,
        totalServers: processedCount,
        newServers: newServersCount,
        skippedDuplicates,
      },
    });
  } catch (error) {
    console.error('Error ingesting server metrics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to ingest server metrics' },
      { status: 500 }
    );
  }
}
