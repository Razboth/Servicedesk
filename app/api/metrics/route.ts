import { NextResponse } from 'next/server';
import { metrics } from '@/lib/services/metrics.service';

/**
 * GET /api/metrics
 * Prometheus metrics endpoint
 *
 * Returns metrics in Prometheus text format for scraping.
 * This endpoint is intentionally public for Prometheus access.
 */
export async function GET() {
  try {
    const metricsOutput = await metrics.export();

    return new NextResponse(metricsOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error exporting metrics:', error);
    return new NextResponse('# Error exporting metrics\n', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  }
}
