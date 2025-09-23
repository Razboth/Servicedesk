import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * POST /api/omnichannel/webhooks
 * Process webhook events (internal use)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal request (could add secret token verification)
    const authHeader = request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.WEBHOOK_INTERNAL_SECRET || 'internal-webhook-secret';

    if (authHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Process pending webhooks
    const pendingWebhooks = await prisma.webhookQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: new Date()
        },
        retryCount: {
          lt: 3 // Max retries
        }
      },
      take: 10 // Process batch of 10
    });

    const results = [];

    for (const webhook of pendingWebhooks) {
      try {
        // Update status to processing
        await prisma.webhookQueue.update({
          where: { id: webhook.id },
          data: {
            status: 'PROCESSING',
            lastAttemptAt: new Date()
          }
        });

        // Prepare headers
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'User-Agent': 'BankSulutGo-ServiceDesk/1.0'
        };

        // Add custom headers if specified
        if (webhook.headers) {
          Object.assign(headers, webhook.headers);
        }

        // Add signature for security
        const signature = generateWebhookSignature(webhook.payload);
        headers['X-Webhook-Signature'] = signature;

        // Send webhook
        const response = await fetch(webhook.url, {
          method: webhook.method,
          headers,
          body: JSON.stringify(webhook.payload),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        const responseText = await response.text();

        if (response.ok) {
          // Success
          await prisma.webhookQueue.update({
            where: { id: webhook.id },
            data: {
              status: 'SUCCESS',
              responseStatus: response.status,
              responseBody: responseText.substring(0, 1000), // Limit stored response
              processedAt: new Date()
            }
          });

          results.push({
            id: webhook.id,
            status: 'success',
            responseStatus: response.status
          });
        } else {
          // Failed but got response
          throw new Error(`HTTP ${response.status}: ${responseText}`);
        }
      } catch (error) {
        // Failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const newRetryCount = webhook.retryCount + 1;
        const isLastRetry = newRetryCount >= webhook.maxRetries;

        await prisma.webhookQueue.update({
          where: { id: webhook.id },
          data: {
            status: isLastRetry ? 'FAILED' : 'PENDING',
            retryCount: newRetryCount,
            error: errorMessage,
            nextRetryAt: isLastRetry ? null : calculateNextRetry(newRetryCount)
          }
        });

        results.push({
          id: webhook.id,
          status: isLastRetry ? 'failed' : 'retry_scheduled',
          error: errorMessage,
          retryCount: newRetryCount
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhooks' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/omnichannel/webhooks
 * Check webhook status (for monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const stats = await prisma.webhookQueue.groupBy({
      by: ['status'],
      _count: true,
      where: status ? { status } : undefined
    });

    const pending = await prisma.webhookQueue.count({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: new Date()
        }
      }
    });

    const failed = await prisma.webhookQueue.findMany({
      where: {
        status: 'FAILED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        url: true,
        error: true,
        retryCount: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      stats,
      pendingForProcessing: pending,
      recentFailures: failed
    });

  } catch (error) {
    console.error('Webhook status error:', error);
    return NextResponse.json(
      { error: 'Failed to get webhook status' },
      { status: 500 }
    );
  }
}

/**
 * Generate webhook signature for verification
 */
function generateWebhookSignature(payload: any): string {
  const secret = process.env.WEBHOOK_SIGNING_SECRET || 'default-webhook-secret';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

/**
 * Calculate next retry time with exponential backoff
 */
function calculateNextRetry(retryCount: number): Date {
  const delayMinutes = Math.pow(2, retryCount) * 5; // 5, 10, 20 minutes
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}