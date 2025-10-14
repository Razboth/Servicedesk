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
      // Handle network recovery (auto-resolution)
      if (currentStatus === 'ONLINE') {
        await this.handleNetworkRecovery(entityType, entityId, entityName);
        return;
      }

      // Get configuration based on test mode
      const config = require('../../network-monitor/config');
      const isTestMode = config.testMode?.enabled || false;
      const thresholds = isTestMode ? config.incidents.testModeThresholds : config.incidents.ticketThresholds;

      // Get recent ping results to check for consecutive failures
      const recentResults = await prisma.networkPingResult.findMany({
        where: {
          entityType,
          entityId,
          ipType
        },
        orderBy: { checkedAt: 'desc' },
        take: thresholds[currentStatus] || thresholds.ERROR || 3
      });

      // Check if all recent results have the same problematic status
      const threshold = thresholds[currentStatus] || thresholds.ERROR || 3;
      if (recentResults.length < threshold) {
        return; // Not enough data yet
      }

      const allSameStatus = recentResults.every(r => r.status === currentStatus);
      if (!allSameStatus) {
        return; // Not consecutive failures
      }

      // Check for existing ticket (with deduplication)
      const existingTicket = await this.findExistingNetworkTicket(entityType, entityId, currentStatus);
      
      if (existingTicket) {
        // Update existing ticket instead of creating new one
        await this.updateExistingTicket(existingTicket, currentStatus, recentResults);
        return;
      }

      // Create a new network ticket with auto-resolution enabled
      await this.createNetworkTicket(entityType, entityId, entityName, currentStatus, threshold, recentResults, ipType);

    } catch (error) {
      console.error('Error checking/creating incident:', error);
    }
  }

  /**
   * Handle network recovery - auto-resolve ALL open network tickets
   */
  private async handleNetworkRecovery(
    entityType: 'BRANCH' | 'ATM',
    entityId: string,
    entityName: string
  ) {
    try {
      // Check if connection has been stable
      const isStable = await this.isConnectionStable(entityType, entityId);
      if (!isStable) {
        return; // Wait for stable connection
      }

      // Find ALL open network tickets for this entity
      // Note: Since we don't have customFields, we'll match by title pattern
      const openTickets = await prisma.ticket.findMany({
        where: {
          category: 'INCIDENT',
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          title: {
            contains: `Network Issue - ${entityName}`
          }
        }
      });

      console.log(`Found ${openTickets.length} open network tickets for ${entityType} ${entityName}`);

      // Auto-resolve all open network tickets
      for (const ticket of openTickets) {
        await this.autoResolveTicket(ticket, entityType, entityName);
      }

      // Also resolve any open network incidents
      await this.resolveExistingIncidents(entityType, entityId);

    } catch (error) {
      console.error('Error handling network recovery:', error);
    }
  }

  /**
   * Check if network connection has been stable for required time
   */
  private async isConnectionStable(entityType: 'BRANCH' | 'ATM', entityId: string): Promise<boolean> {
    try {
      const config = require('../../network-monitor/config');
      const isTestMode = config.testMode?.enabled || false;
      
      const requiredStableTime = isTestMode ? 
        config.incidents.testMode.stableTimeBeforeResolve : 
        config.incidents.stableTimeBeforeResolve;

      const stableThreshold = new Date(Date.now() - requiredStableTime);

      // Check recent ping results
      const recentResults = await prisma.networkPingResult.findMany({
        where: {
          entityType,
          entityId,
          checkedAt: { gte: stableThreshold }
        },
        orderBy: { checkedAt: 'desc' }
      });

      // Must have at least 2 checks and all must be ONLINE
      if (recentResults.length < 2) {
        return false;
      }

      return recentResults.every(result => result.status === 'ONLINE');
    } catch (error) {
      console.error('Error checking connection stability:', error);
      return false;
    }
  }

  /**
   * Auto-resolve a network ticket
   */
  private async autoResolveTicket(ticket: any, entityType: string, entityName: string) {
    try {
      const config = require('../../network-monitor/config');
      const isTestMode = config.testMode?.enabled || false;
      
      const downtime = this.calculateDowntime(ticket.createdAt);
      const currentTime = new Date();

      // Resolve the ticket
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: currentTime,
          resolutionNotes: `[AUTO-RESOLVED] Network connectivity restored for ${entityName}.\n\nDowntime: ${this.formatDowntime(downtime)}\nAuto-resolved by network monitoring system.\nConnection is now stable.`
        }
      });

      console.log(`✅ Auto-resolved ticket ${ticket.ticketNumber} for ${entityType} ${entityName}`);

      // Schedule auto-closure
      const categoryType = ticket.category?.replace('NETWORK_', '') || 'ERROR';
      const closeDelay = isTestMode ? 
        config.incidents.testMode.autoCloseDelay[categoryType] || 120000 :
        config.incidents.autoCloseDelay[categoryType] || 600000;

      setTimeout(async () => {
        await this.autoCloseTicket(ticket.id, entityName);
      }, closeDelay);

    } catch (error) {
      console.error('Error auto-resolving ticket:', error);
    }
  }

  /**
   * Auto-close a resolved ticket
   */
  private async autoCloseTicket(ticketId: string, entityName: string) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket || ticket.status !== 'RESOLVED') {
        return; // Ticket not found or not in resolved status
      }

      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          resolutionNotes: `[AUTO-CLOSED] Network issue resolved and connection stable.\n\nTicket automatically closed by monitoring system.`
        }
      });

      console.log(`🔒 Auto-closed ticket ${ticket.ticketNumber} for ${entityName}`);
    } catch (error) {
      console.error('Error auto-closing ticket:', error);
    }
  }

  /**
   * Find existing network ticket with deduplication
   */
  private async findExistingNetworkTicket(
    entityType: 'BRANCH' | 'ATM',
    entityId: string,
    currentStatus: NetworkStatus
  ) {
    try {
      const config = require('../../network-monitor/config');
      const deduplicationWindow = config.incidents.deduplication.window || 3600000; // 1 hour
      const windowStart = new Date(Date.now() - deduplicationWindow);

      // Map status to ticket category
      const categoryMap: Record<string, string> = {
        'OFFLINE': 'NETWORK_OFFLINE',
        'SLOW': 'NETWORK_SLOW',
        'ERROR': 'NETWORK_ERROR',
        'TIMEOUT': 'NETWORK_ERROR',
        'ONLINE': 'NETWORK_ONLINE'
      };

      const category = categoryMap[currentStatus] || 'NETWORK_ERROR';

      // Look for existing open ticket or recently closed ticket
      const existingTicket = await prisma.ticket.findFirst({
        where: {
          category: 'INCIDENT',
          title: {
            contains: `Network Issue`
          },
          OR: [
            { status: { in: ['OPEN', 'IN_PROGRESS'] } },
            { 
              status: 'CLOSED',
              closedAt: { gte: windowStart }
            }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      return existingTicket;
    } catch (error) {
      console.error('Error finding existing ticket:', error);
      return null;
    }
  }

  /**
   * Update existing ticket instead of creating new one
   */
  private async updateExistingTicket(ticket: any, currentStatus: NetworkStatus, recentResults: any[]) {
    try {
      const updateData: any = {
        updatedAt: new Date(),
        customFields: {
          ...ticket.customFields,
          lastOccurrence: new Date().toISOString(),
          occurrenceCount: (ticket.customFields?.occurrenceCount || 0) + 1,
          currentStatus,
          lastResponseTime: recentResults[0]?.responseTimeMs || null,
          lastPacketLoss: recentResults[0]?.packetLoss || null
        }
      };

      // If ticket was closed, reopen it
      if (ticket.status === 'CLOSED') {
        updateData.status = 'OPEN';
        updateData.closedAt = null;
        updateData.reopenedAt = new Date();
        console.log(`🔄 Reopened ticket ${ticket.ticketNumber} due to recurring issue`);
      }

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: updateData
      });

      console.log(`📝 Updated existing ticket ${ticket.ticketNumber} with new occurrence`);
    } catch (error) {
      console.error('Error updating existing ticket:', error);
    }
  }

  /**
   * Create a new network ticket with auto-resolution enabled
   */
  private async createNetworkTicket(
    entityType: 'BRANCH' | 'ATM',
    entityId: string,
    entityName: string,
    currentStatus: NetworkStatus,
    threshold: number,
    recentResults: any[],
    ipType: string
  ) {
    try {
      const config = require('../../network-monitor/config');
      
      // Map status to ticket details
      const ticketTypeMap: Record<string, any> = {
        'OFFLINE': {
          category: 'NETWORK_OFFLINE',
          title: 'Network Connection Lost',
          priority: config.incidents.priorities.OFFLINE || 'HIGH'
        },
        'SLOW': {
          category: 'NETWORK_SLOW',
          title: 'Slow Network Response',
          priority: config.incidents.priorities.SLOW_RESPONSE || 'LOW'
        },
        'ERROR': {
          category: 'NETWORK_ERROR',
          title: 'Network Error Detected',
          priority: config.incidents.priorities.ERROR || 'MEDIUM'
        },
        'TIMEOUT': {
          category: 'NETWORK_ERROR',
          title: 'Network Timeout',
          priority: config.incidents.priorities.ERROR || 'MEDIUM'
        },
        'ONLINE': {
          category: 'NETWORK_ONLINE',
          title: 'Network Online',
          priority: 'LOW'
        }
      };

      const ticketType = ticketTypeMap[currentStatus] || ticketTypeMap['ERROR'];
      const latestResult = recentResults[0];

      // Get entity details for ticket
      const entity = entityType === 'BRANCH' ? 
        await prisma.branch.findUnique({ where: { id: entityId } }) :
        await prisma.aTM.findUnique({ 
          where: { id: entityId },
          include: { branch: true }
        });

      if (!entity) {
        console.error(`Entity not found: ${entityType} ${entityId}`);
        return;
      }

      // Get monitoring system user
      const systemUser = await prisma.user.findFirst({
        where: { email: 'network-monitoring@banksulutgo.co.id' }
      });

      if (!systemUser) {
        console.error('Network monitoring system user not found');
        return;
      }

      // Generate ticket number - use new simplified sequential format
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear + 1, 0, 1);

      const yearTicketCount = await prisma.ticket.count({
        where: {
          createdAt: {
            gte: yearStart,
            lt: yearEnd
          }
        }
      });

      // New simplified ticket numbering - just sequential numbers
      const ticketNumber = String(yearTicketCount + 1);

      // Find a default service for network issues
      const service = await prisma.service.findFirst({
        where: {
          name: { contains: 'Network' },
          isActive: true
        }
      });

      if (!service) {
        console.error('No network service found for ticket creation');
        return;
      }

      // Create the ticket
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          title: `[AUTO] ${entityName}: ${ticketType.title}`,
          description: this.generateTicketDescription(entity, currentStatus, threshold, latestResult, ipType),
          category: 'INCIDENT',
          priority: ticketType.priority,
          status: 'OPEN',
          serviceId: service.id,
          createdById: systemUser.id,
          branchId: entityType === 'BRANCH' ? entityId : (entity as any).branchId,
        }
      });

      console.log(`🎫 Created network ticket ${ticket.ticketNumber} for ${entityType} ${entityName} (${currentStatus})`);

      // Also create a network incident for tracking
      await this.createNetworkIncident(entityType, entityId, entityName, currentStatus, threshold, ticket.id);

    } catch (error) {
      console.error('Error creating network ticket:', error);
    }
  }

  /**
   * Generate detailed ticket description
   */
  private generateTicketDescription(
    entity: any,
    status: string,
    threshold: number,
    latestResult: any,
    ipType: string
  ): string {
    return `
Automated Network Monitoring Alert
=====================================
Location: ${entity.name} (${entity.code || 'N/A'})
Issue Type: ${status}
Detected: ${new Date().toISOString()}
IP Type: ${ipType}

Current Metrics:
- Status: ${status}
- Response Time: ${latestResult?.responseTimeMs || 'N/A'}ms
- Packet Loss: ${latestResult?.packetLoss || 'N/A'}%
- Consecutive Failures: ${threshold}

Network Configuration:
- IP Address: ${entity.ipAddress || 'N/A'}
- Backup IP: ${entity.backupIpAddress || 'N/A'}
- Network Type: ${entity.networkMedia || 'Unknown'}
- Vendor: ${entity.networkVendor || 'Unknown'}

This ticket will automatically resolve when connectivity is restored and the connection is stable for the required duration.

For immediate assistance, contact the network operations team.
    `.trim();
  }

  /**
   * Create network incident for tracking
   */
  private async createNetworkIncident(
    entityType: 'BRANCH' | 'ATM',
    entityId: string,
    entityName: string,
    currentStatus: NetworkStatus,
    threshold: number,
    ticketId: string
  ) {
    try {
      const incident = await prisma.networkIncident.create({
        data: {
          ...(entityType === 'BRANCH' ? { branchId: entityId } : { atmId: entityId }),
          type: currentStatus === 'OFFLINE' ? 'COMMUNICATION_OFFLINE' : 
                currentStatus === 'SLOW' ? 'SLOW_CONNECTION' : 'NETWORK_CONGESTION',
          severity: currentStatus === 'OFFLINE' ? 'HIGH' : 
                   currentStatus === 'ERROR' ? 'MEDIUM' : 'LOW',
          description: `${entityName} network ${currentStatus.toLowerCase()} detected after ${threshold} consecutive checks.`,
          status: 'OPEN',
          ticketId,
          metrics: {
            consecutiveFailures: threshold,
            entityType,
            entityId,
            autoGenerated: true
          }
        }
      });

      console.log(`📊 Created network incident ${incident.id} for ticket ${ticketId}`);
    } catch (error) {
      console.error('Error creating network incident:', error);
    }
  }

  /**
   * Calculate downtime in minutes
   */
  private calculateDowntime(startTime: Date): number {
    const now = new Date();
    return Math.round((now.getTime() - startTime.getTime()) / (1000 * 60));
  }

  /**
   * Format downtime for display
   */
  private formatDowntime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
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