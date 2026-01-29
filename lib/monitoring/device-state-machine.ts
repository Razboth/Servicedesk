/**
 * Device State Machine for Network Monitoring
 * Implements hysteresis to prevent alert storms from transient failures
 */

import { prisma } from '@/lib/prisma';
import { NetworkStatus, DeviceState } from '@prisma/client';

// State transition thresholds
export const TRANSITIONS = {
  UP_TO_DEGRADED: 2,      // 2 consecutive slow/fail → DEGRADED
  DEGRADED_TO_DOWN: 3,    // 3 more failures after DEGRADED → DOWN (total 5)
  DOWN_TO_RECOVERING: 1,  // 1 success → RECOVERING
  RECOVERING_TO_UP: 3,    // 3 consecutive successes → UP
} as const;

export interface StateTransitionResult {
  newState: DeviceState;
  stateChanged: boolean;
  shouldCreateIncident: boolean;
  shouldResolveIncident: boolean;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

/**
 * Determine if a ping result is considered a failure
 */
export function isPingFailure(status: NetworkStatus): boolean {
  return status === 'OFFLINE' || status === 'ERROR' || status === 'TIMEOUT';
}

/**
 * Determine if a ping result is considered degraded (slow but not failed)
 */
export function isPingDegraded(status: NetworkStatus): boolean {
  return status === 'SLOW';
}

/**
 * Determine if a ping result is considered healthy
 */
export function isPingHealthy(status: NetworkStatus): boolean {
  return status === 'ONLINE';
}

/**
 * Process a ping result and determine state transitions
 * This is the core logic for hysteresis
 */
export function processStateTransition(
  currentState: DeviceState,
  consecutiveFailures: number,
  consecutiveSuccesses: number,
  pingStatus: NetworkStatus
): StateTransitionResult {
  let newState = currentState;
  let stateChanged = false;
  let shouldCreateIncident = false;
  let shouldResolveIncident = false;
  let newConsecutiveFailures = consecutiveFailures;
  let newConsecutiveSuccesses = consecutiveSuccesses;

  const isFailure = isPingFailure(pingStatus);
  const isDegraded = isPingDegraded(pingStatus);
  const isHealthy = isPingHealthy(pingStatus);

  if (isFailure || isDegraded) {
    // Reset success counter on any failure/degradation
    newConsecutiveSuccesses = 0;
    newConsecutiveFailures++;

    switch (currentState) {
      case 'UP':
        if (newConsecutiveFailures >= TRANSITIONS.UP_TO_DEGRADED) {
          newState = 'DEGRADED';
          stateChanged = true;
          // Don't create incident yet - wait for DOWN state
        }
        break;

      case 'DEGRADED':
        if (newConsecutiveFailures >= TRANSITIONS.UP_TO_DEGRADED + TRANSITIONS.DEGRADED_TO_DOWN) {
          newState = 'DOWN';
          stateChanged = true;
          shouldCreateIncident = true; // Now create incident
        }
        break;

      case 'RECOVERING':
        // Device was recovering but failed again
        newState = 'DOWN';
        stateChanged = true;
        // Incident should still be open, no new one needed
        break;

      case 'DOWN':
        // Already down, stay down
        break;
    }
  } else if (isHealthy) {
    // Reset failure counter on healthy ping
    newConsecutiveFailures = 0;
    newConsecutiveSuccesses++;

    switch (currentState) {
      case 'DOWN':
        // First success after being down
        newState = 'RECOVERING';
        stateChanged = true;
        break;

      case 'RECOVERING':
        if (newConsecutiveSuccesses >= TRANSITIONS.RECOVERING_TO_UP) {
          newState = 'UP';
          stateChanged = true;
          shouldResolveIncident = true; // Now resolve incident
        }
        break;

      case 'DEGRADED':
        // Recovered from degraded state
        newState = 'UP';
        stateChanged = true;
        break;

      case 'UP':
        // Already up, stay up
        break;
    }
  }

  return {
    newState,
    stateChanged,
    shouldCreateIncident,
    shouldResolveIncident,
    consecutiveFailures: newConsecutiveFailures,
    consecutiveSuccesses: newConsecutiveSuccesses,
  };
}

/**
 * Update device state in database and return transition result
 */
export async function updateDeviceState(
  entityType: 'BRANCH' | 'ATM',
  entityId: string,
  pingStatus: NetworkStatus
): Promise<StateTransitionResult> {
  // Get current monitoring log
  const currentLog = await prisma.networkMonitoringLog.findUnique({
    where: {
      entityType_entityId: {
        entityType,
        entityId
      }
    }
  });

  const currentState = (currentLog?.deviceState as DeviceState) || 'UP';
  const consecutiveFailures = currentLog?.consecutiveFailures || 0;
  const consecutiveSuccesses = currentLog?.consecutiveSuccesses || 0;

  // Process state transition
  const result = processStateTransition(
    currentState,
    consecutiveFailures,
    consecutiveSuccesses,
    pingStatus
  );

  // Update the monitoring log with new state
  if (currentLog) {
    await prisma.networkMonitoringLog.update({
      where: {
        entityType_entityId: {
          entityType,
          entityId
        }
      },
      data: {
        deviceState: result.newState,
        consecutiveFailures: result.consecutiveFailures,
        consecutiveSuccesses: result.consecutiveSuccesses,
        lastStateChange: result.stateChanged ? new Date() : currentLog.lastStateChange
      }
    });
  }

  return result;
}

/**
 * Get the current device state for an entity
 */
export async function getDeviceState(
  entityType: 'BRANCH' | 'ATM',
  entityId: string
): Promise<DeviceState> {
  const log = await prisma.networkMonitoringLog.findUnique({
    where: {
      entityType_entityId: {
        entityType,
        entityId
      }
    },
    select: {
      deviceState: true
    }
  });

  return (log?.deviceState as DeviceState) || 'UP';
}

/**
 * Check if a branch is currently down (for parent-child correlation)
 */
export async function isBranchDown(branchId: string): Promise<boolean> {
  const state = await getDeviceState('BRANCH', branchId);
  return state === 'DOWN' || state === 'RECOVERING';
}
