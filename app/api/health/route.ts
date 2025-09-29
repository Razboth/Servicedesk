import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: boolean;
    prisma: boolean;
    memory: boolean;
    disk: boolean;
  };
  details: {
    database?: any;
    memory?: any;
    disk?: any;
    errors?: string[];
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const health: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '2.5.0',
    environment: process.env.NODE_ENV || 'production',
    checks: {
      database: false,
      prisma: false,
      memory: false,
      disk: false,
    },
    details: {
      errors: [],
    },
  };

  try {
    // Check 1: Database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = true;
      health.details.database = {
        connected: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      health.checks.database = false;
      health.details.errors?.push(`Database: ${error.message}`);
    }

    // Check 2: Prisma ORM functionality
    try {
      const count = await prisma.user.count();
      health.checks.prisma = true;
      health.details.database = {
        ...health.details.database,
        operational: true,
        userCount: count,
      };
    } catch (error: any) {
      health.checks.prisma = false;
      health.details.errors?.push(`Prisma: ${error.message}`);
    }

    // Check 3: Memory usage
    const memUsage = process.memoryUsage();
    const maxHeap = 1024 * 1024 * 1024; // 1GB threshold
    health.checks.memory = memUsage.heapUsed < maxHeap;
    health.details.memory = {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      available: memUsage.heapUsed < maxHeap,
    };

    // Check 4: Disk space (simplified check)
    health.checks.disk = true; // Assume OK for now
    health.details.disk = {
      available: true,
      path: process.cwd(),
    };

    // Determine overall health status
    const failedChecks = Object.values(health.checks).filter(check => !check).length;

    if (failedChecks === 0) {
      health.status = 'healthy';
    } else if (failedChecks === 1) {
      health.status = 'degraded';
    } else {
      health.status = 'unhealthy';
    }

    // Set appropriate HTTP status code
    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });

  } catch (error: any) {
    health.status = 'unhealthy';
    health.details.errors?.push(`General: ${error.message}`);

    return NextResponse.json(health, { status: 503 });
  }
}

// Metrics endpoint for Prometheus
export async function POST(request: NextRequest) {
  try {
    const metrics = await collectMetrics();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}

async function collectMetrics(): Promise<string> {
  const metrics: string[] = [];

  // Process metrics
  const memUsage = process.memoryUsage();
  metrics.push(`# HELP process_memory_heap_used_bytes Process heap memory used`);
  metrics.push(`# TYPE process_memory_heap_used_bytes gauge`);
  metrics.push(`process_memory_heap_used_bytes ${memUsage.heapUsed}`);

  metrics.push(`# HELP process_memory_rss_bytes Process RSS memory`);
  metrics.push(`# TYPE process_memory_rss_bytes gauge`);
  metrics.push(`process_memory_rss_bytes ${memUsage.rss}`);

  metrics.push(`# HELP process_uptime_seconds Process uptime in seconds`);
  metrics.push(`# TYPE process_uptime_seconds counter`);
  metrics.push(`process_uptime_seconds ${process.uptime()}`);

  // Application metrics
  try {
    const userCount = await prisma.user.count();
    metrics.push(`# HELP app_users_total Total number of users`);
    metrics.push(`# TYPE app_users_total gauge`);
    metrics.push(`app_users_total ${userCount}`);

    const ticketCount = await prisma.ticket.count();
    metrics.push(`# HELP app_tickets_total Total number of tickets`);
    metrics.push(`# TYPE app_tickets_total gauge`);
    metrics.push(`app_tickets_total ${ticketCount}`);

    const openTickets = await prisma.ticket.count({
      where: { status: 'OPEN' }
    });
    metrics.push(`# HELP app_tickets_open Open tickets`);
    metrics.push(`# TYPE app_tickets_open gauge`);
    metrics.push(`app_tickets_open ${openTickets}`);

  } catch (error) {
    // Continue even if some metrics fail
  }

  return metrics.join('\n');
}