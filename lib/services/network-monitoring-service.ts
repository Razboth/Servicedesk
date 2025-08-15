import { prisma } from '@/lib/prisma';
import { monitorBranch, monitorATM } from '@/lib/network-monitoring';
import { NetworkStatus } from '@prisma/client';

// Service configuration
const MONITORING_CONFIG = {
  intervalMinutes: 5, // Check every 5 minutes
  batchSize: 10, // Process 10 entities at a time
  createIncidentThreshold: {
    OFFLINE: 3, // Create incident after 3 consecutive offline checks
    SLOW: 5, // Create incident after 5 consecutive slow checks
    ERROR: 3 // Create incident after 3 consecutive error checks
  }
};

export class NetworkMonitoringService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  async start() {
    if (this.isRunning) {
      console.log('Network monitoring service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting network monitoring service...');

    // Initial run
    await this.monitorAll();

    // Schedule periodic monitoring
    this.intervalId = setInterval(async () => {
      await this.monitorAll();
    }, MONITORING_CONFIG.intervalMinutes * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Network monitoring service stopped');
  }

  private async monitorAll() {
    try {
      console.log('Running network monitoring check...');
      
      // Monitor branches
      await this.monitorBranches();
      
      // Monitor ATMs
      await this.monitorATMs();
      
      console.log('Network monitoring check completed');
    } catch (error) {
      console.error('Error in network monitoring:', error);
    }
  }

  private async monitorBranches() {
    try {
      // Get active branches with monitoring enabled
      const branches = await prisma.branch.findMany({
        where: {
          isActive: true,
          monitoringEnabled: true,
          OR: [
            { ipAddress: { not: null } },
            { backupIpAddress: { not: null } }
          ]
        },
        select: {
          id: true,
          name: true,
          code: true
        }
      });

      console.log(`Monitoring ${branches.length} branches...`);

      // Process in batches
      for (let i = 0; i < branches.length; i += MONITORING_CONFIG.batchSize) {
        const batch = branches.slice(i, i + MONITORING_CONFIG.batchSize);
        
        await Promise.all(
          batch.map(async (branch) => {
            try {
              const results = await monitorBranch(branch.id);
              
              // Check if we need to create an incident
              if (results && results.length > 0) {
                for (const result of results) {
                  await this.checkAndCreateIncident('BRANCH', branch.id, branch.name, result.status, result.ipType || 'PRIMARY');
                }
              }
            } catch (error) {
              console.error(`Error monitoring branch ${branch.code}:`, error);
            }
          })
        );
      }
    } catch (error) {
      console.error('Error monitoring branches:', error);
    }
  }

  private async monitorATMs() {
    try {
      // Get active ATMs
      const atms = await prisma.aTM.findMany({
        where: {
          isActive: true,
          ipAddress: { not: null }
        },
        select: {
          id: true,
          code: true,
          name: true
        }
      });

      console.log(`Monitoring ${atms.length} ATMs...`);

      // Process in batches
      for (let i = 0; i < atms.length; i += MONITORING_CONFIG.batchSize) {
        const batch = atms.slice(i, i + MONITORING_CONFIG.batchSize);
        
        await Promise.all(
          batch.map(async (atm) => {
            try {
              const result = await monitorATM(atm.id);
              
              // Check if we need to create an incident
              if (result) {
                await this.checkAndCreateIncident('ATM', atm.id, `${atm.code} - ${atm.name}`, result.status, 'PRIMARY');
              }
            } catch (error) {
              console.error(`Error monitoring ATM ${atm.code}:`, error);
            }
          })
        );
      }
    } catch (error) {
      console.error('Error monitoring ATMs:', error);
    }
  }

  private async checkAndCreateIncident(
    entityType: 'BRANCH' | 'ATM',
    entityId: string,
    entityName: string,
    currentStatus: NetworkStatus,
    ipType: string
  ) {
    try {
      // Skip if status is ONLINE
      if (currentStatus === 'ONLINE') {
        // Check if there's an open incident that should be resolved
        await this.resolveExistingIncidents(entityType, entityId);
        return;
      }

      // Get recent ping results to check for consecutive failures
      const recentResults = await prisma.networkPingResult.findMany({
        where: {
          entityType,
          entityId,
          ipType
        },
        orderBy: { checkedAt: 'desc' },
        take: MONITORING_CONFIG.createIncidentThreshold[currentStatus] || 3
      });

      // Check if all recent results have the same problematic status
      const threshold = MONITORING_CONFIG.createIncidentThreshold[currentStatus] || 3;
      if (recentResults.length < threshold) {
        return; // Not enough data yet
      }

      const allSameStatus = recentResults.every(r => r.status === currentStatus);
      if (!allSameStatus) {
        return; // Not consecutive failures
      }

      // Check if there's already an open incident
      const existingIncident = await prisma.networkIncident.findFirst({
        where: {
          ...(entityType === 'BRANCH' ? { branchId: entityId } : { atmId: entityId }),
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      });

      if (existingIncident) {
        return; // Incident already exists
      }

      // Create a new network incident
      const incident = await prisma.networkIncident.create({
        data: {
          ...(entityType === 'BRANCH' ? { branchId: entityId } : { atmId: entityId }),
          type: currentStatus === 'OFFLINE' ? 'COMMUNICATION_OFFLINE' : 
                currentStatus === 'SLOW' ? 'SLOW_CONNECTION' : 'NETWORK_CONGESTION',
          severity: currentStatus === 'OFFLINE' ? 'CRITICAL' : 
                   currentStatus === 'ERROR' ? 'HIGH' : 'MEDIUM',
          description: `${entityName} ${ipType.toLowerCase()} connection is ${currentStatus.toLowerCase()}. Detected after ${threshold} consecutive checks.`,
          status: 'OPEN',
          metrics: {
            consecutiveFailures: threshold,
            ipType,
            lastStatus: currentStatus,
            avgResponseTime: recentResults[0].responseTimeMs || null,
            avgPacketLoss: recentResults[0].packetLoss || null
          }
        }
      });

      console.log(`Created network incident for ${entityType} ${entityName}: ${incident.id}`);

      // Create a ticket if severity is CRITICAL
      if (incident.severity === 'CRITICAL') {
        await this.createIncidentTicket(incident, entityType, entityId, entityName);
      }
    } catch (error) {
      console.error('Error checking/creating incident:', error);
    }
  }

  private async resolveExistingIncidents(entityType: 'BRANCH' | 'ATM', entityId: string) {
    try {
      const openIncidents = await prisma.networkIncident.findMany({
        where: {
          ...(entityType === 'BRANCH' ? { branchId: entityId } : { atmId: entityId }),
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      });

      for (const incident of openIncidents) {
        await prisma.networkIncident.update({
          where: { id: incident.id },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date()
          }
        });

        console.log(`Resolved network incident ${incident.id} for ${entityType} ${entityId}`);
      }
    } catch (error) {
      console.error('Error resolving incidents:', error);
    }
  }

  private async createIncidentTicket(
    incident: any,
    entityType: 'BRANCH' | 'ATM',
    entityId: string,
    entityName: string
  ) {
    try {
      // Get network service
      const service = await prisma.service.findFirst({
        where: {
          name: { contains: 'Network' },
          isActive: true
        }
      });

      if (!service) {
        console.error('Network service not found for ticket creation');
        return;
      }

      // Get system user for ticket creation
      const systemUser = await prisma.user.findFirst({
        where: {
          email: { contains: 'system' },
          isActive: true
        }
      });

      if (!systemUser) {
        console.error('System user not found for ticket creation');
        return;
      }

      // Generate ticket number
      const ticketCount = await prisma.ticket.count();
      const ticketNumber = `NET${new Date().getFullYear()}${String(ticketCount + 1).padStart(6, '0')}`;

      // Create ticket
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          title: `Network Down: ${entityName}`,
          description: `Automated ticket created for network incident.\n\n${incident.description}\n\nEntity Type: ${entityType}\nEntity: ${entityName}`,
          category: 'INCIDENT',
          serviceId: service.id,
          priority: 'CRITICAL',
          status: 'OPEN',
          createdById: systemUser.id,
          issueClassification: 'NETWORK_ISSUE',
          supportGroupId: service.supportGroupId
        }
      });

      // Update incident with ticket reference
      await prisma.networkIncident.update({
        where: { id: incident.id },
        data: { ticketId: ticket.id }
      });

      console.log(`Created ticket ${ticket.ticketNumber} for network incident ${incident.id}`);
    } catch (error) {
      console.error('Error creating incident ticket:', error);
    }
  }
}

// Export singleton instance
export const networkMonitoringService = new NetworkMonitoringService();