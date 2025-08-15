// Network Monitoring Service Configuration
module.exports = {
  // Monitoring intervals (in milliseconds)
  intervals: {
    atm: 60000,        // ATM monitoring every 1 minute
    branch: 300000,    // Branch monitoring every 5 minutes
    health: 180000     // Health check every 3 minutes
  },
  
  // Network thresholds
  thresholds: {
    responseTime: {
      good: 100,       // < 100ms is good
      warning: 500,    // 100-500ms is warning  
      slow: 1000       // 500-1000ms is slow, >1000ms is timeout
    },
    packetLoss: {
      warning: 5,      // 5% packet loss triggers warning
      critical: 20     // 20% packet loss is critical
    },
    uptime: {
      minimum: 95      // Minimum 95% uptime expected
    }
  },
  
  // Ping configuration
  ping: {
    timeout: 5000,     // 5 second timeout
    packetSize: 32,    // 32 byte packets
    count: 4,          // Send 4 pings per check
    interval: 1000     // 1 second between pings
  },
  
  // Incident management
  incidents: {
    autoCreateTickets: true,
    graceTime: 300000,        // 5 minutes grace time before creating incident
    autoResolveTime: 600000,  // 10 minutes of good connectivity before auto-resolve
    retryAttempts: 3,         // Number of retries before marking as down
    escalationTime: 1800000   // 30 minutes before escalating priority
  },
  
  // Database connection
  database: {
    reconnectInterval: 30000,  // Try to reconnect every 30 seconds
    maxRetries: 10,           // Maximum connection retry attempts
    queryTimeout: 10000       // 10 second query timeout
  },
  
  // Logging
  logging: {
    level: 'info',            // log levels: error, warn, info, debug
    maxLogFiles: 7,           // Keep 7 days of logs
    maxLogSize: '10m'         // 10MB per log file
  },
  
  // Service settings
  service: {
    enabled: true,           // Disabled by default for safety
    runOnStartup: false,      // Don't start automatically
    gracefulShutdown: true    // Handle shutdown signals gracefully
  },
  
  // Notification settings (future use)
  notifications: {
    email: {
      enabled: false,
      recipients: ['admin@banksulutgo.co.id']
    },
    slack: {
      enabled: false,
      webhook: null
    }
  }
};