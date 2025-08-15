const winston = require('winston');
const path = require('path');
const config = require('../config');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Try to import winston-daily-rotate-file, fallback if not available
let DailyRotateFile = null;
try {
  DailyRotateFile = require('winston-daily-rotate-file');
} catch (error) {
  console.log('winston-daily-rotate-file not available, using regular file transport');
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ' ' + JSON.stringify(meta, null, 2);
    }
    
    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: fileFormat,
  defaultMeta: { service: 'network-monitor' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: config.logging.maxLogFiles,
      tailable: true
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: config.logging.maxLogFiles,
      tailable: true
    }),
    
    // Daily rotating file for monitoring activities (if available)
    ...(DailyRotateFile ? [new DailyRotateFile({
      filename: path.join(logsDir, 'monitoring-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.maxLogSize,
      maxFiles: config.logging.maxLogFiles,
      level: 'info'
    })] : [
      // Fallback to regular file transport
      new winston.transports.File({
        filename: path.join(logsDir, 'monitoring.log'),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: config.logging.maxLogFiles,
        level: 'info'
      })
    ])
  ],
  
  // Exception handling
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  
  // Rejection handling
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Helper methods for structured logging
logger.monitoring = (action, details) => {
  logger.info(`MONITORING: ${action}`, details);
};

logger.incident = (action, incidentId, details) => {
  logger.info(`INCIDENT: ${action}`, { incidentId, ...details });
};

logger.performance = (metric, value, entity) => {
  logger.info(`PERFORMANCE: ${metric}`, { value, entity, timestamp: new Date() });
};

logger.network = (host, status, responseTime, details = {}) => {
  logger.debug(`NETWORK: ${host}`, { status, responseTime, ...details });
};

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Network monitor shutting down gracefully...');
  logger.end();
});

process.on('SIGTERM', () => {
  logger.info('Network monitor received SIGTERM, shutting down...');
  logger.end();
});

module.exports = logger;