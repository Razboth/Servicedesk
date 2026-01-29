import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey, checkApiPermission, createApiErrorResponse, createApiSuccessResponse } from '@/lib/auth-api';
import { updateDeviceState } from '@/lib/monitoring/device-state-machine';
import { createOrUpdateIncident, resolveIncident } from '@/lib/monitoring/incident-correlation';
import { NetworkStatus } from '@prisma/client';
import { z } from 'zod';

const pingResultSchema = z.object({
  entity_type: z.enum(['BRANCH', 'ATM']),
  entity_id: z.string(),
  ip_address: z.string(),
  status: z.enum(['ONLINE', 'OFFLINE', 'SLOW', 'TIMEOUT', 'ERROR']),
  response_time_ms: z.number().nullable().optional(),
  packet_loss: z.number().nullable().optional(),
  min_rtt: z.number().nullable().optional(),
  max_rtt: z.number().nullable().optional(),
  avg_rtt: z.number().nullable().optional(),
  timestamp: z.string().optional(),
});

const requestSchema = z.object({
  agent_id: z.string(),
  results: z.array(pingResultSchema),
});

/**
 * POST /api/monitoring/agent/results
 * Receive ping results from remote monitoring agent
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated || !authResult.apiKey) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
    }

    // Check permission
    if (!checkApiPermission(authResult.apiKey, 'monitoring:write')) {
      return createApiErrorResponse('Insufficient permissions. Required: monitoring:write', 403);
    }

    // Parse request body
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return createApiErrorResponse('Invalid request format', 400, parsed.error.errors);
    }

    const { agent_id, results } = parsed.data;

    // Process each ping result
    const processedResults = [];
    const errors = [];

    for (const result of results) {
      try {
        // Validate entity exists
        let entity = null;
        let entityName = 'Unknown';

        if (result.entity_type === 'BRANCH') {
          entity = await prisma.branch.findUnique({
            where: { id: result.entity_id },
            select: { id: true, name: true }
          });
          entityName = entity?.name || 'Unknown Branch';
        } else if (result.entity_type === 'ATM') {
          entity = await prisma.aTM.findUnique({
            where: { id: result.entity_id },
            select: { id: true, name: true, branchId: true }
          });
          entityName = entity?.name || 'Unknown ATM';
        }

        if (!entity) {
          errors.push({ entity_id: result.entity_id, error: 'Entity not found' });
          continue;
        }

        const status = result.status as NetworkStatus;

        // Get previous log
        const previousLog = await prisma.networkMonitoringLog.findUnique({
          where: {
            entityType_entityId: {
              entityType: result.entity_type,
              entityId: result.entity_id
            }
          }
        });

        // Calculate uptime/downtime
        let uptimeSeconds = previousLog?.uptimeSeconds || 0;
        let downtimeSeconds = previousLog?.downtimeSeconds || 0;
        const timeSinceLastCheck = previousLog
          ? Math.floor((Date.now() - previousLog.checkedAt.getTime()) / 1000)
          : 0;

        if (status === 'ONLINE' || status === 'SLOW') {
          uptimeSeconds += timeSinceLastCheck;
        } else {
          downtimeSeconds += timeSinceLastCheck;
        }

        // Update or create monitoring log
        await prisma.networkMonitoringLog.upsert({
          where: {
            entityType_entityId: {
              entityType: result.entity_type,
              entityId: result.entity_id
            }
          },
          create: {
            entityType: result.entity_type,
            entityId: result.entity_id,
            ipAddress: result.ip_address,
            status,
            responseTimeMs: result.response_time_ms || null,
            packetLoss: result.packet_loss || null,
            uptimeSeconds,
            downtimeSeconds,
            previousStatus: null,
            statusChangedAt: status !== previousLog?.status ? new Date() : previousLog?.statusChangedAt || null,
            downSince: status === 'OFFLINE' && previousLog?.status !== 'OFFLINE' ? new Date() : previousLog?.downSince || null
          },
          update: {
            status,
            responseTimeMs: result.response_time_ms || null,
            packetLoss: result.packet_loss || null,
            checkedAt: new Date(),
            uptimeSeconds,
            downtimeSeconds,
            previousStatus: previousLog?.status || null,
            statusChangedAt: status !== previousLog?.status ? new Date() : previousLog?.statusChangedAt || null,
            downSince: status === 'OFFLINE' && previousLog?.status !== 'OFFLINE' ? new Date() :
                      status !== 'OFFLINE' ? null : previousLog?.downSince || null
          }
        });

        // Store detailed ping result
        await prisma.networkPingResult.create({
          data: {
            entityType: result.entity_type,
            entityId: result.entity_id,
            branchId: result.entity_type === 'BRANCH' ? result.entity_id : (entity as any).branchId,
            atmId: result.entity_type === 'ATM' ? result.entity_id : null,
            ipAddress: result.ip_address,
            status,
            responseTimeMs: result.response_time_ms || null,
            packetLoss: result.packet_loss || 0,
            minRtt: result.min_rtt || null,
            maxRtt: result.max_rtt || null,
            avgRtt: result.avg_rtt || null,
            checkedAt: result.timestamp ? new Date(result.timestamp) : new Date()
          }
        });

        // Process state machine (hysteresis)
        const stateResult = await updateDeviceState(
          result.entity_type as 'BRANCH' | 'ATM',
          result.entity_id,
          status
        );

        // Handle incident creation/resolution based on state machine
        if (stateResult.shouldCreateIncident) {
          const incidentResult = await createOrUpdateIncident({
            entityType: result.entity_type as 'BRANCH' | 'ATM',
            entityId: result.entity_id,
            entityName
          });

          processedResults.push({
            entity_id: result.entity_id,
            status: result.status,
            state: stateResult.newState,
            incident: incidentResult.created ? 'created' : (incidentResult.suppressed ? 'suppressed' : 'deduplicated'),
            incident_id: incidentResult.incidentId
          });
        } else if (stateResult.shouldResolveIncident) {
          await resolveIncident(result.entity_type as 'BRANCH' | 'ATM', result.entity_id);

          processedResults.push({
            entity_id: result.entity_id,
            status: result.status,
            state: stateResult.newState,
            incident: 'resolved'
          });
        } else {
          processedResults.push({
            entity_id: result.entity_id,
            status: result.status,
            state: stateResult.newState
          });
        }

      } catch (err) {
        console.error(`Error processing result for ${result.entity_id}:`, err);
        errors.push({
          entity_id: result.entity_id,
          error: err instanceof Error ? err.message : 'Processing error'
        });
      }
    }

    return createApiSuccessResponse({
      agent_id,
      processed: processedResults.length,
      errors: errors.length,
      results: processedResults,
      error_details: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Monitoring agent results error:', error);
    return createApiErrorResponse('Failed to process monitoring results', 500);
  }
}
