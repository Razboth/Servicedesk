#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const NetworkChecker = require('./lib/network-checker');
const IncidentManager = require('./lib/incident-manager');
const logger = require('./lib/logger');
const config = require('./config');

class NetworkMonitorService {
  constructor() {
    this.prisma = new PrismaClient({
      log: config.logging.level === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty'
    });
    
    this.networkChecker = new NetworkChecker(logger);
    this.incidentManager = new IncidentManager(this.prisma, logger);
    
    this.isRunning = false;
    this.intervals = new Map();
    this.entities = new Map(); // Cache of entities to monitor
    
    // Graceful shutdown handling
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
  }

  /**
   * Initialize the monitoring service
   */
  async initialize() {
    try {
      logger.info('Initializing Network Monitor Service...');
      
      // Test database connection
      await this.prisma.$connect();
      logger.info('Database connection established');
      
      // Load entities to monitor
      await this.loadMonitoringEntities();
      
      logger.info('Network Monitor Service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize monitoring service:', error);
      throw error;
    }
  }

  /**
   * Load entities (branches and ATMs) that need monitoring
   */
  async loadMonitoringEntities() {
    try {
      // Load branches with monitoring enabled
      const branches = await this.prisma.branch.findMany({
        where: {
          monitoringEnabled: true,
          isActive: true,
          ipAddress: { not: null }
        },
        select: {
          id: true,
          name: true,
          code: true,
          ipAddress: true,
          backupIpAddress: true
        }
      });

      // Load ATMs with IP addresses
      const atms = await this.prisma.aTM.findMany({
        where: {
          isActive: true,
          ipAddress: { not: null }
        },
        select: {
          id: true,
          name: true,
          code: true,
          ipAddress: true,
          branchId: true
        }
      });

      // Store in cache
      this.entities.set('branches', branches);
      this.entities.set('atms', atms);

      logger.info(`Loaded ${branches.length} branches and ${atms.length} ATMs for monitoring`);
      
    } catch (error) {
      logger.error('Error loading monitoring entities:', error);
      throw error;
    }
  }

  /**
   * Start the monitoring service
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Monitoring service is already running');
      return;
    }

    if (!config.service.enabled) {
      logger.warn('Network monitoring is disabled in configuration');
      return;
    }

    try {
      logger.info('Starting Network Monitor Service...');
      this.isRunning = true;

      // Start monitoring loops
      await this.startBranchMonitoring();
      await this.startATMMonitoring();
      
      // Start periodic tasks
      this.startPeriodicTasks();
      
      logger.info('Network Monitor Service started successfully');
      
    } catch (error) {
      logger.error('Failed to start monitoring service:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Start monitoring branches
   */
  async startBranchMonitoring() {
    const branches = this.entities.get('branches') || [];
    
    if (branches.length === 0) {
      logger.info('No branches configured for monitoring');
      return;
    }

    logger.info(`Starting monitoring for ${branches.length} branches`);
    
    const monitorBranches = async () => {
      if (!this.isRunning) return;
      
      for (const branch of branches) {
        try {
          await this.monitorEntity(branch, 'BRANCH');
        } catch (error) {
          logger.error(`Error monitoring branch ${branch.name}:`, error);
        }
      }
    };

    // Initial monitoring
    setTimeout(monitorBranches, 5000); // Start after 5 seconds
    
    // Set up interval
    const intervalId = setInterval(monitorBranches, config.intervals.branch);
    this.intervals.set('branches', intervalId);
  }

  /**
   * Start monitoring ATMs
   */
  async startATMMonitoring() {
    const atms = this.entities.get('atms') || [];
    
    if (atms.length === 0) {
      logger.info('No ATMs configured for monitoring');
      return;
    }

    logger.info(`Starting monitoring for ${atms.length} ATMs`);
    
    const monitorATMs = async () => {
      if (!this.isRunning) return;
      
      for (const atm of atms) {
        try {
          await this.monitorEntity(atm, 'ATM');
        } catch (error) {
          logger.error(`Error monitoring ATM ${atm.name}:`, error);
        }
      }
    };

    // Initial monitoring
    setTimeout(monitorATMs, 10000); // Start after 10 seconds
    
    // Set up interval
    const intervalId = setInterval(monitorATMs, config.intervals.atm);
    this.intervals.set('atms', intervalId);
  }

  /**
   * Monitor a single entity (branch or ATM)
   */
  async monitorEntity(entity, entityType) {
    const startTime = Date.now();
    
    try {
      logger.network(entity.ipAddress, 'CHECKING', null, { 
        entity: entity.name, 
        type: entityType 
      });

      // Perform network check
      const result = await this.networkChecker.comprehensiveTest(entity.ipAddress, {
        pingCount: 3
      });

      // Process the result through incident manager
      const processingResult = await this.incidentManager.processMonitoringResult(
        result,
        entityType,
        entity.id
      );

      const duration = Date.now() - startTime;
      
      logger.network(entity.ipAddress, result.ping.status, result.ping.responseTime, {
        entity: entity.name,
        type: entityType,
        action: processingResult.action,
        duration: `${duration}ms`
      });

      // Log performance metrics
      if (result.ping.responseTime) {
        logger.performance('response_time', result.ping.responseTime, {
          entity: entity.name,
          type: entityType
        });
      }

      // Check backup IP if primary fails and backup exists
      if (result.ping.status === 'OFFLINE' && entity.backupIpAddress) {
        logger.info(`Primary IP failed for ${entity.name}, checking backup IP`);
        
        const backupResult = await this.networkChecker.comprehensiveTest(entity.backupIpAddress, {
          pingCount: 2
        });
        
        if (backupResult.ping.status === 'ONLINE') {
          logger.info(`Backup IP is online for ${entity.name}`);
          // Store backup monitoring result
          await this.incidentManager.processMonitoringResult(
            backupResult,
            entityType,
            entity.id
          );
        }
      }

    } catch (error) {
      logger.error(`Error monitoring ${entityType} ${entity.name}:`, error);
    }
  }

  /**
   * Start periodic maintenance tasks
   */
  startPeriodicTasks() {
    // Health check interval
    const healthCheck = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed:', error);
      }
    }, config.intervals.health);

    this.intervals.set('health', healthCheck);

    // Daily cleanup at 2 AM
    const now = new Date();
    const tomorrow2AM = new Date(now);
    tomorrow2AM.setDate(tomorrow2AM.getDate() + 1);
    tomorrow2AM.setHours(2, 0, 0, 0);
    
    const timeUntil2AM = tomorrow2AM.getTime() - now.getTime();
    
    setTimeout(() => {
      const dailyCleanup = setInterval(async () => {
        if (!this.isRunning) return;
        
        try {
          await this.incidentManager.cleanup();
          await this.reloadEntities();
        } catch (error) {
          logger.error('Daily cleanup failed:', error);
        }
      }, 24 * 60 * 60 * 1000); // Every 24 hours
      
      this.intervals.set('cleanup', dailyCleanup);
      
      // Run initial cleanup
      this.incidentManager.cleanup();
      
    }, timeUntil2AM);
  }

  /**
   * Perform system health check
   */
  async performHealthCheck() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Check memory usage
      const memUsage = process.memoryUsage();
      if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
        logger.warn('High memory usage detected', memUsage);
      }

      // Log active intervals
      logger.debug(`Health check passed. Active intervals: ${this.intervals.size}`);
      
    } catch (error) {
      logger.error('Health check failed:', error);
      
      // Try to reconnect to database
      try {
        await this.prisma.$disconnect();
        await this.prisma.$connect();
        logger.info('Database reconnected successfully');
      } catch (reconnectError) {
        logger.error('Failed to reconnect to database:', reconnectError);
      }
    }
  }

  /**
   * Reload entities from database
   */
  async reloadEntities() {
    logger.info('Reloading monitoring entities...');
    await this.loadMonitoringEntities();
  }

  /**
   * Stop the monitoring service
   */
  async stop() {
    if (!this.isRunning) {
      logger.warn('Monitoring service is not running');
      return;
    }

    logger.info('Stopping Network Monitor Service...');
    this.isRunning = false;

    // Clear all intervals
    for (const [name, intervalId] of this.intervals) {
      clearInterval(intervalId);
      logger.debug(`Cleared interval: ${name}`);
    }
    this.intervals.clear();

    // Disconnect from database
    await this.prisma.$disconnect();
    
    logger.info('Network Monitor Service stopped');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(signal) {
    logger.info(`Received ${signal}, initiating graceful shutdown...`);
    
    try {
      await this.stop();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    const branches = this.entities.get('branches') || [];
    const atms = this.entities.get('atms') || [];
    
    return {
      isRunning: this.isRunning,
      uptime: process.uptime(),
      entities: {
        branches: branches.length,
        atms: atms.length
      },
      intervals: Array.from(this.intervals.keys()),
      memory: process.memoryUsage(),
      config: {
        enabled: config.service.enabled,
        intervals: config.intervals,
        thresholds: config.thresholds
      }
    };
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const monitor = new NetworkMonitorService();

  const commands = {
    async start() {
      await monitor.initialize();
      await monitor.start();
      
      // Keep process alive
      setInterval(() => {
        if (!monitor.isRunning) {
          logger.info('Monitor stopped, exiting...');
          process.exit(0);
        }
      }, 5000);
    },

    async status() {
      await monitor.initialize();
      const status = monitor.getStatus();
      console.log(JSON.stringify(status, null, 2));
      process.exit(0);
    },

    async test() {
      logger.info('Running network monitoring test...');
      await monitor.initialize();
      
      const branches = monitor.entities.get('branches') || [];
      const atms = monitor.entities.get('atms') || [];
      
      if (branches.length > 0) {
        logger.info(`Testing ${branches[0].name} (${branches[0].ipAddress})`);
        await monitor.monitorEntity(branches[0], 'BRANCH');
      }
      
      if (atms.length > 0) {
        logger.info(`Testing ${atms[0].name} (${atms[0].ipAddress})`);
        await monitor.monitorEntity(atms[0], 'ATM');
      }
      
      await monitor.stop();
      process.exit(0);
    },

    help() {
      console.log(`
Network Monitor Service

Usage: node monitor.js <command>

Commands:
  start    - Start the monitoring service
  status   - Show current monitoring status
  test     - Run a single test cycle
  help     - Show this help message

Configuration:
  Edit config.js to customize monitoring settings
  Set service.enabled = true to enable monitoring
      `);
      process.exit(0);
    }
  };

  const run = async () => {
    if (!command || !commands[command]) {
      commands.help();
      return;
    }

    try {
      await commands[command]();
    } catch (error) {
      logger.error(`Command ${command} failed:`, error);
      process.exit(1);
    }
  };

  run();
}

module.exports = NetworkMonitorService;