const config = require('../config');

class IncidentManager {
  constructor(prisma, logger) {
    this.prisma = prisma;
    this.logger = logger;
    this.config = config.incidents;
    this.activeIncidents = new Map(); // Track active incidents
    this.graceTimeouts = new Map();   // Track grace period timeouts
  }

  /**
   * Process a network monitoring result and handle incidents
   * @param {Object} monitoringResult - Result from NetworkChecker
   * @param {string} entityType - 'BRANCH' or 'ATM'
   * @param {string} entityId - ID of the entity being monitored
   * @returns {Promise<Object>} Processing result
   */
  async processMonitoringResult(monitoringResult, entityType, entityId) {
    try {
      // Store monitoring log
      await this.storeMonitoringLog(monitoringResult, entityType, entityId);
      
      const { host, status, responseTime, packetLoss, errorMessage } = monitoringResult.ping || monitoringResult;
      
      // Check for existing active incident
      const incidentKey = `${entityType}-${entityId}`;
      const existingIncident = this.activeIncidents.get(incidentKey);
      
      if (status === 'OFFLINE' || status === 'ERROR') {
        return await this.handleProblemDetected(
          existingIncident, 
          monitoringResult, 
          entityType, 
          entityId
        );
      } else if (status === 'SLOW') {
        return await this.handlePerformanceIssue(
          existingIncident,
          monitoringResult,
          entityType,
          entityId
        );
      } else if (status === 'ONLINE') {
        return await this.handleRecovery(
          existingIncident,
          monitoringResult,
          entityType,
          entityId
        );
      }

      return {
        action: 'monitored',
        status,
        incident: existingIncident?.id || null
      };

    } catch (error) {
      this.logger.error('Error processing monitoring result:', error);
      return {
        action: 'error',
        error: error.message
      };
    }
  }

  /**
   * Handle when a problem is detected (offline/error)
   */
  async handleProblemDetected(existingIncident, monitoringResult, entityType, entityId) {
    const incidentKey = `${entityType}-${entityId}`;
    
    if (existingIncident && existingIncident.type === 'COMMUNICATION_OFFLINE') {
      // Problem persists, update existing incident
      this.logger.info(`Communication problem persists for ${entityType} ${entityId}`);
      return {
        action: 'problem_persists',
        incident: existingIncident.id
      };
    }

    // New problem detected - start grace period
    if (!this.graceTimeouts.has(incidentKey)) {
      this.logger.info(`Starting grace period for ${entityType} ${entityId} - problem detected`);
      
      const timeout = setTimeout(async () => {
        await this.createNetworkIncident({
          entityType,
          entityId,
          type: 'COMMUNICATION_OFFLINE',
          severity: 'HIGH',
          description: `Network communication lost - ${monitoringResult.errorMessage || 'No response from host'}`,
          monitoringResult
        });
        this.graceTimeouts.delete(incidentKey);
      }, this.config.graceTime);
      
      this.graceTimeouts.set(incidentKey, timeout);
      
      return {
        action: 'grace_period_started',
        gracePeriod: this.config.graceTime
      };
    }

    return {
      action: 'grace_period_active'
    };
  }

  /**
   * Handle when performance issue is detected (slow)
   */
  async handlePerformanceIssue(existingIncident, monitoringResult, entityType, entityId) {
    const incidentKey = `${entityType}-${entityId}`;
    
    if (existingIncident && existingIncident.type === 'SLOW_CONNECTION') {
      // Performance issue persists
      return {
        action: 'performance_issue_persists',
        incident: existingIncident.id
      };
    }

    // New performance issue - start grace period
    if (!this.graceTimeouts.has(incidentKey)) {
      this.logger.info(`Starting grace period for ${entityType} ${entityId} - slow connection`);
      
      const timeout = setTimeout(async () => {
        await this.createNetworkIncident({
          entityType,
          entityId,
          type: 'SLOW_CONNECTION',
          severity: 'MEDIUM',
          description: `Slow network connection detected - Response time: ${monitoringResult.ping.responseTime}ms, Packet loss: ${monitoringResult.ping.packetLoss}%`,
          monitoringResult
        });
        this.graceTimeouts.delete(incidentKey);
      }, this.config.graceTime);
      
      this.graceTimeouts.set(incidentKey, timeout);
      
      return {
        action: 'performance_grace_started',
        gracePeriod: this.config.graceTime
      };
    }

    return {
      action: 'performance_grace_active'
    };
  }

  /**
   * Handle when service recovers (online)
   */
  async handleRecovery(existingIncident, monitoringResult, entityType, entityId) {
    const incidentKey = `${entityType}-${entityId}`;
    
    // Cancel any pending grace period
    if (this.graceTimeouts.has(incidentKey)) {
      clearTimeout(this.graceTimeouts.get(incidentKey));
      this.graceTimeouts.delete(incidentKey);
      this.logger.info(`Cancelled grace period for ${entityType} ${entityId} - service recovered`);
      return {
        action: 'grace_period_cancelled'
      };
    }

    // Auto-resolve existing incident after grace time
    if (existingIncident && existingIncident.status === 'OPEN') {
      this.logger.info(`Service recovered for ${entityType} ${entityId} - scheduling auto-resolve`);
      
      setTimeout(async () => {
        await this.autoResolveIncident(existingIncident.id, monitoringResult);
      }, this.config.autoResolveTime);
      
      return {
        action: 'recovery_detected',
        incident: existingIncident.id,
        autoResolveIn: this.config.autoResolveTime
      };
    }

    return {
      action: 'service_healthy'
    };
  }

  /**
   * Create a new network incident
   */
  async createNetworkIncident({ entityType, entityId, type, severity, description, monitoringResult }) {
    try {
      const incidentKey = `${entityType}-${entityId}`;
      
      // Get entity details for ticket creation
      let entityData = null;
      if (entityType === 'BRANCH') {
        entityData = await this.prisma.branch.findUnique({
          where: { id: entityId },
          include: { users: { where: { role: 'MANAGER' }, take: 1 } }
        });
      } else if (entityType === 'ATM') {
        entityData = await this.prisma.aTM.findUnique({
          where: { id: entityId },
          include: { branch: true }
        });
      }

      if (!entityData) {
        throw new Error(`${entityType} with ID ${entityId} not found`);
      }

      // Create the network incident
      const incident = await this.prisma.networkIncident.create({
        data: {
          [entityType.toLowerCase() + 'Id']: entityId,
          type,
          severity,
          description,
          status: 'OPEN',
          metrics: {
            responseTime: monitoringResult.ping?.responseTime,
            packetLoss: monitoringResult.ping?.packetLoss,
            timestamp: monitoringResult.timestamp,
            host: monitoringResult.host
          }
        }
      });

      // Store in active incidents map
      this.activeIncidents.set(incidentKey, incident);

      // Create ticket if enabled
      let ticketId = null;
      if (this.config.autoCreateTickets) {
        ticketId = await this.createTicketForIncident(incident, entityData, entityType);
        
        if (ticketId) {
          await this.prisma.networkIncident.update({
            where: { id: incident.id },
            data: { ticketId }
          });
        }
      }

      this.logger.info(`Created network incident ${incident.id} for ${entityType} ${entityId}`);
      
      return {
        action: 'incident_created',
        incident: incident.id,
        ticket: ticketId,
        type,
        severity
      };

    } catch (error) {
      this.logger.error(`Error creating network incident:`, error);
      throw error;
    }
  }

  /**
   * Create a ticket for a network incident
   */
  async createTicketForIncident(incident, entityData, entityType) {
    try {
      // Find system user
      let systemUser = await this.prisma.user.findFirst({
        where: { 
          email: 'system@banksulutgo.co.id',
          role: 'ADMIN'
        }
      });

      if (!systemUser) {
        // Create system user if it doesn't exist
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('system123', 10);
        
        systemUser = await this.prisma.user.create({
          data: {
            name: 'Network Monitor System',
            email: 'system@banksulutgo.co.id',
            password: hashedPassword,
            role: 'ADMIN',
            branchId: entityType === 'BRANCH' ? entityData.id : entityData.branchId
          }
        });
      }

      // Find appropriate service for network incidents
      let service = await this.prisma.service.findFirst({
        where: {
          name: { contains: 'Network', mode: 'insensitive' },
          isActive: true
        }
      });

      if (!service) {
        service = await this.prisma.service.findFirst({
          where: {
            name: { contains: 'Infrastructure', mode: 'insensitive' },
            isActive: true
          }
        });
      }

      if (!service) {
        // Create basic network service
        const category = await this.prisma.serviceCategory.findFirst({
          where: { name: { contains: 'Infrastructure', mode: 'insensitive' } }
        });
        
        const supportGroup = await this.prisma.supportGroup.findFirst({
          where: { name: { contains: 'IT Helpdesk', mode: 'insensitive' } }
        });

        service = await this.prisma.service.create({
          data: {
            name: 'Network Infrastructure',
            description: 'Network connectivity and infrastructure issues',
            categoryId: category?.id || null,
            supportGroupId: supportGroup?.id || null,
            priority: incident.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            slaHours: incident.severity === 'CRITICAL' ? 2 : 4,
            requiresApproval: false
          }
        });
      }

      // Generate ticket number
      const ticketCount = await this.prisma.ticket.count();
      const ticketNumber = `NET-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(4, '0')}`;

      // Create the ticket
      const ticket = await this.prisma.ticket.create({
        data: {
          ticketNumber,
          title: `${incident.type.replace('_', ' ')} - ${entityType === 'BRANCH' ? entityData.name : entityData.name}`,
          description: `Automated network monitoring alert:\n\n${incident.description}\n\nEntity: ${entityType === 'BRANCH' ? entityData.name : entityData.name}\nLocation: ${entityType === 'BRANCH' ? entityData.city : entityData.location}\nSeverity: ${incident.severity}\n\nMonitoring Details:\n- Response Time: ${incident.metrics?.responseTime || 'N/A'}ms\n- Packet Loss: ${incident.metrics?.packetLoss || 'N/A'}%\n- Detection Time: ${incident.detectedAt}`,
          category: 'INCIDENT',
          serviceId: service.id,
          priority: incident.severity === 'CRITICAL' ? 'CRITICAL' : 
                   incident.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
          status: 'OPEN',
          createdById: systemUser.id,
          branchId: entityType === 'BRANCH' ? entityData.id : entityData.branchId,
          issueClassification: incident.type === 'COMMUNICATION_OFFLINE' ? 'NETWORK_ISSUE' : 'PERFORMANCE_ISSUE'
        }
      });

      this.logger.info(`Created ticket ${ticket.ticketNumber} for network incident ${incident.id}`);
      return ticket.id;

    } catch (error) {
      this.logger.error(`Error creating ticket for incident:`, error);
      return null;
    }
  }

  /**
   * Auto-resolve an incident when service recovers
   */
  async autoResolveIncident(incidentId, monitoringResult) {
    try {
      const incident = await this.prisma.networkIncident.findUnique({
        where: { id: incidentId },
        include: { ticket: true }
      });

      if (!incident || incident.status !== 'OPEN') {
        return;
      }

      // Update incident status
      await this.prisma.networkIncident.update({
        where: { id: incidentId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          metrics: {
            ...incident.metrics,
            resolvedMetrics: {
              responseTime: monitoringResult.ping?.responseTime,
              packetLoss: monitoringResult.ping?.packetLoss,
              resolvedAt: new Date()
            }
          }
        }
      });

      // Update associated ticket
      if (incident.ticket) {
        await this.prisma.ticket.update({
          where: { id: incident.ticketId },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolutionNotes: `Network service automatically recovered. Response time: ${monitoringResult.ping?.responseTime || 'N/A'}ms, Packet loss: ${monitoringResult.ping?.packetLoss || 0}%`
          }
        });

        // Add resolution comment
        await this.prisma.ticketComment.create({
          data: {
            ticketId: incident.ticketId,
            userId: (await this.prisma.user.findFirst({ where: { email: 'system@banksulutgo.co.id' } })).id,
            comment: `🟢 Network service automatically recovered.\n\nRecovery Details:\n- Response Time: ${monitoringResult.ping?.responseTime || 'N/A'}ms\n- Packet Loss: ${monitoringResult.ping?.packetLoss || 0}%\n- Recovery Time: ${new Date().toISOString()}\n\nThis incident has been automatically resolved by the network monitoring system.`,
            isInternal: false
          }
        });
      }

      // Remove from active incidents
      const entityType = incident.branchId ? 'BRANCH' : 'ATM';
      const entityId = incident.branchId || incident.atmId;
      const incidentKey = `${entityType}-${entityId}`;
      this.activeIncidents.delete(incidentKey);

      this.logger.info(`Auto-resolved network incident ${incidentId}`);

    } catch (error) {
      this.logger.error(`Error auto-resolving incident ${incidentId}:`, error);
    }
  }

  /**
   * Store monitoring log in database
   */
  async storeMonitoringLog(monitoringResult, entityType, entityId) {
    try {
      const pingResult = monitoringResult.ping || monitoringResult;
      
      await this.prisma.networkMonitoringLog.create({
        data: {
          entityType,
          entityId,
          ipAddress: monitoringResult.host,
          status: pingResult.status,
          responseTimeMs: pingResult.responseTime,
          packetLoss: pingResult.packetLoss,
          errorMessage: pingResult.errorMessage,
          checkedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error(`Error storing monitoring log:`, error);
    }
  }

  /**
   * Cleanup old monitoring logs and resolved incidents
   */
  async cleanup() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Delete old monitoring logs (keep 30 days)
      const deletedLogs = await this.prisma.networkMonitoringLog.deleteMany({
        where: {
          checkedAt: { lt: thirtyDaysAgo }
        }
      });

      // Delete old resolved incidents (keep 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const deletedIncidents = await this.prisma.networkIncident.deleteMany({
        where: {
          status: 'RESOLVED',
          resolvedAt: { lt: ninetyDaysAgo }
        }
      });

      this.logger.info(`Cleanup completed: ${deletedLogs.count} old logs, ${deletedIncidents.count} old incidents deleted`);

    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }
}

module.exports = IncidentManager;