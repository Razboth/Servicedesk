/**
 * Network Monitoring Service
 * Performs scheduled network health checks for branches and ATMs
 */

import { prisma } from '@/lib/prisma';
import { pingHost } from '@/lib/network-monitoring';
import { NetworkStatus, NetworkMedia } from '@prisma/client';

interface MonitoringConfig {
  branchInterval: number; // milliseconds
  atmInterval: number; // milliseconds
  maxConcurrent: number; // max concurrent pings
}

const DEFAULT_CONFIG: MonitoringConfig = {
  branchInterval: 120000, // 2 minutes
  atmInterval: 60000, // 1 minute
  maxConcurrent: 10
};

class NetworkMonitor {
  private isRunning: boolean = false;
  private branchTimer: NodeJS.Timeout | null = null;
  private atmTimer: NodeJS.Timeout | null = null;
  private config: MonitoringConfig;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the monitoring service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Network monitoring is already running');
      return;
    }

    console.log('🚀 Starting network monitoring service...');
    this.isRunning = true;

    // Initial check
    await this.checkAllNetworks();

    // Schedule periodic checks
    this.scheduleBranchChecks();
    this.scheduleATMChecks();

    console.log('✅ Network monitoring service started');
  }

  /**
   * Stop the monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Network monitoring is not running');
      return;
    }

    console.log('🛑 Stopping network monitoring service...');
    
    if (this.branchTimer) {
      clearInterval(this.branchTimer);
      this.branchTimer = null;
    }
    
    if (this.atmTimer) {
      clearInterval(this.atmTimer);
      this.atmTimer = null;
    }

    this.isRunning = false;
    console.log('✅ Network monitoring service stopped');
  }

  /**
   * Schedule branch network checks
   */
  private scheduleBranchChecks(): void {
    this.branchTimer = setInterval(async () => {
      await this.checkBranchNetworks();
    }, this.config.branchInterval);
  }

  /**
   * Schedule ATM network checks
   */
  private scheduleATMChecks(): void {
    this.atmTimer = setInterval(async () => {
      await this.checkATMNetworks();
    }, this.config.atmInterval);
  }

  /**
   * Check all networks (branches and ATMs)
   */
  async checkAllNetworks(): Promise<void> {
    await Promise.all([
      this.checkBranchNetworks(),
      this.checkATMNetworks()
    ]);
  }

  /**
   * Check branch networks
   */
  async checkBranchNetworks(): Promise<void> {
    try {
      console.log('🏢 Checking branch networks...');
      
      const branches = await prisma.branch.findMany({
        where: {
          isActive: true,
          monitoringEnabled: true,
          ipAddress: { not: null }
        }
      });

      console.log(`Found ${branches.length} branches to monitor`);

      // Process in batches to avoid overwhelming the network
      for (let i = 0; i < branches.length; i += this.config.maxConcurrent) {
        const batch = branches.slice(i, i + this.config.maxConcurrent);
        await Promise.all(
          batch.map(branch => this.checkBranchNetwork(branch))
        );
      }

      console.log('✅ Branch network check completed');
    } catch (error) {
      console.error('❌ Error checking branch networks:', error);
    }
  }

  /**
   * Check ATM networks
   */
  async checkATMNetworks(): Promise<void> {
    try {
      console.log('🏧 Checking ATM networks...');
      
      const atms = await prisma.aTM.findMany({
        where: {
          isActive: true,
          ipAddress: { not: null }
        }
      });

      console.log(`Found ${atms.length} ATMs to monitor`);

      // Process in batches
      for (let i = 0; i < atms.length; i += this.config.maxConcurrent) {
        const batch = atms.slice(i, i + this.config.maxConcurrent);
        await Promise.all(
          batch.map(atm => this.checkATMNetwork(atm))
        );
      }

      console.log('✅ ATM network check completed');
    } catch (error) {
      console.error('❌ Error checking ATM networks:', error);
    }
  }

  /**
   * Check individual branch network
   */
  private async checkBranchNetwork(branch: any): Promise<void> {
    try {
      const pingResult = await pingHost(branch.ipAddress, branch.networkMedia as NetworkMedia);
      
      // Determine status based on ping result
      let status: NetworkStatus = 'UNKNOWN';
      if (pingResult.success) {
        if (pingResult.responseTimeMs! > 1000) {
          status = 'SLOW';
        } else {
          status = 'ONLINE';
        }
      } else {
        status = 'OFFLINE';
      }

      // Get previous log
      const previousLog = await prisma.networkMonitoringLog.findUnique({
        where: {
          entityType_entityId: {
            entityType: 'BRANCH',
            entityId: branch.id
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

      // Update or create log
      await prisma.networkMonitoringLog.upsert({
        where: {
          entityType_entityId: {
            entityType: 'BRANCH',
            entityId: branch.id
          }
        },
        create: {
          entityType: 'BRANCH',
          entityId: branch.id,
          ipAddress: branch.ipAddress,
          status,
          responseTimeMs: pingResult.responseTimeMs || null,
          packetLoss: pingResult.packetLoss || null,
          errorMessage: pingResult.errorMessage || null,
          uptimeSeconds,
          downtimeSeconds,
          previousStatus: null,
          statusChangedAt: status !== previousLog?.status ? new Date() : previousLog?.statusChangedAt || null,
          downSince: status === 'OFFLINE' && previousLog?.status !== 'OFFLINE' ? new Date() : previousLog?.downSince || null
        },
        update: {
          status,
          responseTimeMs: pingResult.responseTimeMs || null,
          packetLoss: pingResult.packetLoss || null,
          errorMessage: pingResult.errorMessage || null,
          checkedAt: new Date(),
          uptimeSeconds,
          downtimeSeconds,
          previousStatus: previousLog?.status || null,
          statusChangedAt: status !== previousLog?.status ? new Date() : previousLog?.statusChangedAt || null,
          downSince: status === 'OFFLINE' && previousLog?.status !== 'OFFLINE' ? new Date() : 
                    status !== 'OFFLINE' ? null : previousLog?.downSince || null
        }
      });

      // Create incident if status changed to OFFLINE
      if (status === 'OFFLINE' && previousLog?.status !== 'OFFLINE') {
        await this.createNetworkIncident('BRANCH', branch.id, branch.name);
      }

      console.log(`✓ ${branch.name}: ${status} (${pingResult.responseTimeMs || 0}ms)`);
    } catch (error) {
      console.error(`✗ Error checking branch ${branch.name}:`, error);
    }
  }

  /**
   * Check individual ATM network
   */
  private async checkATMNetwork(atm: any): Promise<void> {
    try {
      const pingResult = await pingHost(atm.ipAddress, atm.networkMedia as NetworkMedia);
      
      // Determine status
      let status: NetworkStatus = 'UNKNOWN';
      if (pingResult.success) {
        if (pingResult.responseTimeMs! > 800) {
          status = 'SLOW';
        } else {
          status = 'ONLINE';
        }
      } else {
        status = 'OFFLINE';
      }

      // Get previous log
      const previousLog = await prisma.networkMonitoringLog.findUnique({
        where: {
          entityType_entityId: {
            entityType: 'ATM',
            entityId: atm.id
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

      // Update or create log
      await prisma.networkMonitoringLog.upsert({
        where: {
          entityType_entityId: {
            entityType: 'ATM',
            entityId: atm.id
          }
        },
        create: {
          entityType: 'ATM',
          entityId: atm.id,
          ipAddress: atm.ipAddress,
          status,
          responseTimeMs: pingResult.responseTimeMs || null,
          packetLoss: pingResult.packetLoss || null,
          errorMessage: pingResult.errorMessage || null,
          uptimeSeconds,
          downtimeSeconds,
          previousStatus: null,
          statusChangedAt: status !== previousLog?.status ? new Date() : previousLog?.statusChangedAt || null,
          downSince: status === 'OFFLINE' && previousLog?.status !== 'OFFLINE' ? new Date() : previousLog?.downSince || null
        },
        update: {
          status,
          responseTimeMs: pingResult.responseTimeMs || null,
          packetLoss: pingResult.packetLoss || null,
          errorMessage: pingResult.errorMessage || null,
          checkedAt: new Date(),
          uptimeSeconds,
          downtimeSeconds,
          previousStatus: previousLog?.status || null,
          statusChangedAt: status !== previousLog?.status ? new Date() : previousLog?.statusChangedAt || null,
          downSince: status === 'OFFLINE' && previousLog?.status !== 'OFFLINE' ? new Date() : 
                    status !== 'OFFLINE' ? null : previousLog?.downSince || null
        }
      });

      // Create incident if status changed to OFFLINE
      if (status === 'OFFLINE' && previousLog?.status !== 'OFFLINE') {
        await this.createNetworkIncident('ATM', atm.id, atm.name);
      }

      console.log(`✓ ${atm.name}: ${status} (${pingResult.responseTimeMs || 0}ms)`);
    } catch (error) {
      console.error(`✗ Error checking ATM ${atm.name}:`, error);
    }
  }

  /**
   * Create network incident
   */
  private async createNetworkIncident(entityType: string, entityId: string, entityName: string): Promise<void> {
    try {
      await prisma.networkIncident.create({
        data: {
          entityType,
          entityId,
          branchId: entityType === 'BRANCH' ? entityId : undefined,
          atmId: entityType === 'ATM' ? entityId : undefined,
          type: 'CONNECTIVITY',
          severity: 'HIGH',
          description: `Network connectivity lost for ${entityType.toLowerCase()} ${entityName}`,
          status: 'OPEN',
          detectedAt: new Date()
        }
      });
      console.log(`🚨 Network incident created for ${entityName}`);
    } catch (error) {
      console.error('Failed to create network incident:', error);
    }
  }
}

// Export singleton instance
export const networkMonitor = new NetworkMonitor();

// Export class for testing
export { NetworkMonitor };