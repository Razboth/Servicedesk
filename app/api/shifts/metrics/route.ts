import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey } from '@/lib/auth-api';

// POST /api/shifts/metrics - Receive server metrics from external server
export async function POST(request: NextRequest) {
  try {
    // Authenticate via API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.cpu && !body.ram && !body.disk && !body.uptime) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'At least one metric category is required' },
        { status: 400 }
      );
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const sourceIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    // Create server metrics record
    const serverMetrics = await prisma.serverMetrics.create({
      data: {
        serverId: body.serverId || null,
        serverName: body.serverName || null,

        // CPU metrics
        cpuUsagePercent: body.cpu?.usagePercent ?? null,
        cpuCores: body.cpu?.cores ?? null,
        cpuLoadAvg1m: body.cpu?.loadAvg?.[0] ?? null,
        cpuLoadAvg5m: body.cpu?.loadAvg?.[1] ?? null,
        cpuLoadAvg15m: body.cpu?.loadAvg?.[2] ?? null,

        // RAM metrics
        ramTotalGB: body.ram?.totalGB ?? null,
        ramUsedGB: body.ram?.usedGB ?? null,
        ramUsagePercent: body.ram?.usagePercent ?? null,

        // Disk metrics
        diskTotalGB: body.disk?.totalGB ?? null,
        diskUsedGB: body.disk?.usedGB ?? null,
        diskUsagePercent: body.disk?.usagePercent ?? null,

        // Network metrics
        networkInBytesPerSec: body.network?.inBytesPerSec ?? null,
        networkOutBytesPerSec: body.network?.outBytesPerSec ?? null,

        // Uptime metrics
        uptimeSeconds: body.uptime?.seconds ?? null,
        lastBootTime: body.uptime?.lastBootTime ? new Date(body.uptime.lastBootTime) : null,

        // Additional flexible metrics
        additionalMetrics: body.additionalMetrics ?? null,

        // Timestamp
        collectedAt: body.collectedAt ? new Date(body.collectedAt) : new Date(),
        sourceIp,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Server metrics recorded successfully',
      data: {
        id: serverMetrics.id,
        collectedAt: serverMetrics.collectedAt,
      },
    });
  } catch (error) {
    console.error('Error recording server metrics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to record server metrics' },
      { status: 500 }
    );
  }
}

// GET /api/shifts/metrics - Get latest server metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1');
    const serverId = searchParams.get('serverId');

    const where = serverId ? { serverId } : {};

    const metrics = await prisma.serverMetrics.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      take: limit,
    });

    // Check if data is stale (more than 24 hours old)
    const latestMetric = metrics[0];
    const isStale = latestMetric
      ? new Date().getTime() - new Date(latestMetric.collectedAt).getTime() > 24 * 60 * 60 * 1000
      : true;

    return NextResponse.json({
      success: true,
      data: {
        metrics: limit === 1 ? (metrics[0] || null) : metrics,
        available: metrics.length > 0 && !isStale,
        isStale,
        message: !metrics.length
          ? 'Laporan metrik tidak tersedia'
          : isStale
          ? 'Data metrik sudah tidak aktual (lebih dari 24 jam)'
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching server metrics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch server metrics' },
      { status: 500 }
    );
  }
}
