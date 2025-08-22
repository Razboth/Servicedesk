// Network Monitoring Service Configuration
module.exports = {
  // Test mode configuration
  testMode: {
    enabled: true,  // Enable test mode
    useRealIPs: true,  // Use real internet IPs for testing
    
    // Test entities with various network conditions
    testEntities: {
      branches: [
        {
          name: 'Google DNS Test Branch',
          code: 'TEST-GOOGLE',
          ipAddress: '8.8.8.8',
          backupIpAddress: '8.8.4.4',
          networkMedia: 'FO',
          expectedStatus: 'ONLINE'
        },
        {
          name: 'Cloudflare Test Branch',
          code: 'TEST-CF',
          ipAddress: '1.1.1.1',
          backupIpAddress: '1.0.0.1',
          networkMedia: 'FO',
          expectedStatus: 'ONLINE'
        },
        {
          name: 'Quad9 Test Branch',
          code: 'TEST-QUAD9',
          ipAddress: '9.9.9.9',
          networkMedia: 'M2M',
          expectedStatus: 'ONLINE'
        },
        {
          name: 'OpenDNS Test Branch',
          code: 'TEST-OPENDNS',
          ipAddress: '208.67.222.222',
          networkMedia: 'VSAT',
          expectedStatus: 'SLOW'
        },
        {
          name: 'Unreachable Test Branch',
          code: 'TEST-OFFLINE',
          ipAddress: '192.0.2.1',
          backupIpAddress: '198.51.100.1',
          networkMedia: 'VSAT',
          expectedStatus: 'OFFLINE'
        }
      ],
      atms: [
        {
          name: 'Test ATM - Google DNS',
          code: 'ATM-GOOGLE',
          ipAddress: '8.8.8.8',
          networkMedia: 'FO',
          expectedStatus: 'ONLINE'
        },
        {
          name: 'Test ATM - Cloudflare',
          code: 'ATM-CF',
          ipAddress: '1.1.1.1',
          networkMedia: 'FO',
          expectedStatus: 'ONLINE'
        },
        {
          name: 'Test ATM - Quad9',
          code: 'ATM-QUAD9',
          ipAddress: '9.9.9.9',
          networkMedia: 'M2M',
          expectedStatus: 'ONLINE'
        },
        {
          name: 'Test ATM - Unreachable',
          code: 'ATM-OFFLINE',
          ipAddress: '10.255.255.1',
          networkMedia: 'VSAT',
          expectedStatus: 'OFFLINE'
        }
      ]
    }
  },

  // Monitoring intervals (in milliseconds)
  intervals: {
    atm: 60000,        // ATM monitoring every 1 minute
    branch: 300000,    // Branch monitoring every 5 minutes
    health: 180000,    // Health check every 3 minutes
    test: 30000        // Test entities every 30 seconds
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
  
  // Incident management with auto-resolution for ALL issues
  incidents: {
    autoCreateTickets: true,
    autoResolveTickets: true,    // Enable auto-resolution for ALL tickets
    autoCloseTickets: true,      // Enable auto-closure after resolution
    
    // Time before auto-resolution (must be stable)
    stableTimeBeforeResolve: 300000,  // 5 minutes stable connection
    
    // Time before auto-closure after resolution
    autoCloseDelay: {
      OFFLINE: 600000,        // 10 minutes for offline tickets
      CONGESTION: 300000,     // 5 minutes for congestion
      SLOW_RESPONSE: 300000,  // 5 minutes for slow response
      ERROR: 600000           // 10 minutes for error tickets
    },
    
    // Test mode uses shorter times for faster testing
    testMode: {
      stableTimeBeforeResolve: 60000,   // 1 minute for testing
      autoCloseDelay: {
        OFFLINE: 120000,        // 2 minutes
        CONGESTION: 60000,      // 1 minute
        SLOW_RESPONSE: 60000,   // 1 minute
        ERROR: 120000           // 2 minutes
      }
    },
    
    // Ticket creation thresholds (consecutive failures)
    ticketThresholds: {
      OFFLINE: 3,        // 3 consecutive failures
      CONGESTION: 5,     // 5 consecutive failures
      SLOW: 10,          // 10 consecutive failures
      ERROR: 3           // 3 consecutive errors
    },
    
    // Test mode uses lower thresholds for faster testing
    testModeThresholds: {
      OFFLINE: 2,        // 2 failures for faster testing
      CONGESTION: 3,     // 3 failures
      SLOW: 5,           // 5 failures
      ERROR: 2           // 2 errors
    },
    
    // Deduplication settings
    deduplication: {
      enabled: true,
      window: 3600000,      // 1 hour - don't create duplicate tickets
      reopenInstead: true   // Reopen recent tickets instead of creating new
    },
    
    // Ticket priorities by issue type
    priorities: {
      OFFLINE: 'HIGH',           // Not CRITICAL since it auto-resolves
      CONGESTION: 'MEDIUM',      // Network congestion
      SLOW_RESPONSE: 'LOW',      // Slow but working
      ERROR: 'MEDIUM'            // Network errors
    },
    
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