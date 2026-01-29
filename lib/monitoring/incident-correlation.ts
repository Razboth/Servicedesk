/**
 * Incident Correlation and Deduplication
 * Prevents alert fatigue by correlating related incidents
 */

import { prisma } from '@/lib/prisma';
import { isBranchDown } from './device-state-machine';

// Deduplication window in minutes
export const DEDUP_WINDOW_MINUTES = 30;

export interface IncidentParams {
  entityType: 'BRANCH' | 'ATM';
  entityId: string;
  entityName: string;
  type?: string;
  severity?: string;
}

/**
 * Check if alert should be suppressed due to parent-child correlation
 * If an ATM's parent branch is down, suppress the ATM alert
 */
export async function shouldSuppressAlert(
  entityType: 'BRANCH' | 'ATM',
  entityId: string
): Promise<{ suppress: boolean; reason?: string; parentIncidentId?: string }> {
  // Branches don't have parents, never suppress
  if (entityType === 'BRANCH') {
    return { suppress: false };
  }

  // For ATMs, check if parent branch is down
  const atm = await prisma.aTM.findUnique({
    where: { id: entityId },
    select: {
      branchId: true,
      branch: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!atm?.branchId) {
    return { suppress: false };
  }

  // Check if branch is down
  const branchIsDown = await isBranchDown(atm.branchId);

  if (branchIsDown) {
    // Find the existing branch incident to reference
    const branchIncident = await prisma.networkIncident.findFirst({
      where: {
        branchId: atm.branchId,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      },
      select: { id: true }
    });

    return {
      suppress: true,
      reason: `Parent branch ${atm.branch?.name} is down`,
      parentIncidentId: branchIncident?.id
    };
  }

  return { suppress: false };
}

/**
 * Check if entity is in a maintenance window
 */
export async function isInMaintenanceWindow(
  entityType: 'BRANCH' | 'ATM',
  entityId: string
): Promise<boolean> {
  const now = new Date();

  const window = await prisma.maintenanceWindow.findFirst({
    where: {
      startTime: { lte: now },
      endTime: { gte: now },
      isActive: true,
      OR: [
        // Global maintenance
        { entityType: null, entityId: null },
        // Type-wide maintenance (all branches or all ATMs)
        { entityType, entityId: null },
        // Specific entity maintenance
        { entityType, entityId }
      ]
    }
  });

  return !!window;
}

/**
 * Find existing open incident for deduplication
 */
export async function findExistingIncident(
  entityType: 'BRANCH' | 'ATM',
  entityId: string,
  type: string = 'COMMUNICATION_OFFLINE'
): Promise<{ id: string; occurrenceCount: number } | null> {
  const dedupCutoff = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000);

  const existing = await prisma.networkIncident.findFirst({
    where: {
      branchId: entityType === 'BRANCH' ? entityId : undefined,
      atmId: entityType === 'ATM' ? entityId : undefined,
      type: type as any,
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      createdAt: { gte: dedupCutoff }
    },
    select: {
      id: true,
      occurrenceCount: true
    }
  });

  return existing ? { id: existing.id, occurrenceCount: existing.occurrenceCount || 1 } : null;
}

/**
 * Increment occurrence count on existing incident
 */
export async function incrementIncidentOccurrence(incidentId: string): Promise<void> {
  await prisma.networkIncident.update({
    where: { id: incidentId },
    data: {
      occurrenceCount: { increment: 1 },
      lastOccurrence: new Date()
    }
  });
}

/**
 * Create or update a network incident with deduplication
 */
export async function createOrUpdateIncident(params: IncidentParams): Promise<{
  created: boolean;
  incidentId: string | null;
  suppressed: boolean;
  reason?: string;
}> {
  const { entityType, entityId, entityName, type = 'COMMUNICATION_OFFLINE', severity = 'HIGH' } = params;

  // Check maintenance window first
  const inMaintenance = await isInMaintenanceWindow(entityType, entityId);
  if (inMaintenance) {
    return {
      created: false,
      incidentId: null,
      suppressed: true,
      reason: 'Entity is in maintenance window'
    };
  }

  // Check parent-child correlation
  const suppressResult = await shouldSuppressAlert(entityType, entityId);
  if (suppressResult.suppress) {
    // Optionally track this in the parent incident
    if (suppressResult.parentIncidentId) {
      await trackAffectedChild(suppressResult.parentIncidentId, entityType, entityId, entityName);
    }
    return {
      created: false,
      incidentId: suppressResult.parentIncidentId || null,
      suppressed: true,
      reason: suppressResult.reason
    };
  }

  // Check for existing incident (deduplication)
  const existing = await findExistingIncident(entityType, entityId, type);
  if (existing) {
    await incrementIncidentOccurrence(existing.id);
    return {
      created: false,
      incidentId: existing.id,
      suppressed: false,
      reason: `Deduplicated with existing incident (occurrence #${existing.occurrenceCount + 1})`
    };
  }

  // Create new incident
  const incident = await prisma.networkIncident.create({
    data: {
      branchId: entityType === 'BRANCH' ? entityId : undefined,
      atmId: entityType === 'ATM' ? entityId : undefined,
      type: type as any,
      severity: severity as any,
      description: `Network connectivity lost for ${entityType.toLowerCase()} ${entityName}`,
      status: 'OPEN',
      detectedAt: new Date(),
      occurrenceCount: 1,
      lastOccurrence: new Date()
    }
  });

  return {
    created: true,
    incidentId: incident.id,
    suppressed: false
  };
}

/**
 * Track affected children in parent incident (for dashboard display)
 */
async function trackAffectedChild(
  parentIncidentId: string,
  childType: string,
  childId: string,
  childName: string
): Promise<void> {
  // Get current affected children from metrics JSON
  const incident = await prisma.networkIncident.findUnique({
    where: { id: parentIncidentId },
    select: { metrics: true }
  });

  const metrics = (incident?.metrics as any) || {};
  const affectedChildren = metrics.affectedChildren || [];

  // Add child if not already tracked
  const existingChild = affectedChildren.find((c: any) => c.id === childId);
  if (!existingChild) {
    affectedChildren.push({
      type: childType,
      id: childId,
      name: childName,
      detectedAt: new Date().toISOString()
    });

    await prisma.networkIncident.update({
      where: { id: parentIncidentId },
      data: {
        metrics: {
          ...metrics,
          affectedChildren,
          affectedChildrenCount: affectedChildren.length
        }
      }
    });
  }
}

/**
 * Resolve incident and check affected children
 */
export async function resolveIncident(
  entityType: 'BRANCH' | 'ATM',
  entityId: string
): Promise<void> {
  // Find open incident
  const incident = await prisma.networkIncident.findFirst({
    where: {
      branchId: entityType === 'BRANCH' ? entityId : undefined,
      atmId: entityType === 'ATM' ? entityId : undefined,
      status: { in: ['OPEN', 'IN_PROGRESS'] }
    }
  });

  if (!incident) return;

  // Resolve the incident
  await prisma.networkIncident.update({
    where: { id: incident.id },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date()
    }
  });

  // If this was a branch incident, re-check ATMs
  if (entityType === 'BRANCH') {
    await recheckChildATMs(entityId);
  }
}

/**
 * Re-check ATMs when branch recovers
 * Any ATM still down should get its own incident now
 */
async function recheckChildATMs(branchId: string): Promise<void> {
  // Get ATMs at this branch that are currently marked as offline
  const offlineATMs = await prisma.networkMonitoringLog.findMany({
    where: {
      entityType: 'ATM',
      deviceState: { in: ['DOWN', 'DEGRADED'] }
    },
    select: {
      entityId: true
    }
  });

  // Get ATM details for those at this branch
  const atmIds = offlineATMs.map(a => a.entityId);
  const atms = await prisma.aTM.findMany({
    where: {
      id: { in: atmIds },
      branchId
    },
    select: {
      id: true,
      name: true
    }
  });

  // Create individual incidents for ATMs still down
  for (const atm of atms) {
    await createOrUpdateIncident({
      entityType: 'ATM',
      entityId: atm.id,
      entityName: atm.name || 'Unknown ATM'
    });
    console.log(`🚨 Created individual incident for ATM ${atm.name} after branch recovery`);
  }
}
