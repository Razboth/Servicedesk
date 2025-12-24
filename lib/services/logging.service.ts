/**
 * Structured Logging Service for Grafana/Loki Integration
 *
 * Outputs JSON-formatted logs to stdout for Loki collection.
 * Supports multiple log levels and categories for easy filtering.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type LogCategory = 'TICKET' | 'AUTH' | 'USER' | 'SYSTEM' | 'API' | 'AUDIT' | 'OMNI';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  action: string;
  category: LogCategory;
  userId?: string;
  userEmail?: string;
  ticketId?: string;
  ticketNumber?: string;
  duration?: number;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

// Log level priority for filtering
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Get configured log level from environment
function getConfiguredLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toUpperCase() as LogLevel;
  return LOG_LEVEL_PRIORITY[level] !== undefined ? level : 'INFO';
}

// Check if logging should use JSON format
function useJsonFormat(): boolean {
  return process.env.LOG_FORMAT?.toLowerCase() === 'json' || process.env.NODE_ENV === 'production';
}

// Check if monitoring is enabled
function isMonitoringEnabled(): boolean {
  return process.env.MONITORING_ENABLED !== 'false';
}

/**
 * Main logging class for structured logging
 */
class Logger {
  private serviceName: string;
  private minLevel: LogLevel;
  private jsonFormat: boolean;

  constructor() {
    this.serviceName = process.env.SERVICE_NAME || 'servicedesk';
    this.minLevel = getConfiguredLogLevel();
    this.jsonFormat = useJsonFormat();
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    if (!isMonitoringEnabled()) return false;
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  /**
   * Format and output a log entry
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const fullEntry: LogEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      service: this.serviceName,
    };

    // Remove undefined values for cleaner output
    const cleanEntry = Object.fromEntries(
      Object.entries(fullEntry).filter(([, v]) => v !== undefined)
    );

    if (this.jsonFormat) {
      // JSON format for Loki
      console.log(JSON.stringify(cleanEntry));
    } else {
      // Human-readable format for development
      const { timestamp, level, category, action, userId, ticketId, metadata, error } = cleanEntry;
      let message = `[${timestamp}] ${level} [${category}] ${action}`;
      if (userId) message += ` user=${userId}`;
      if (ticketId) message += ` ticket=${ticketId}`;
      if (metadata) message += ` ${JSON.stringify(metadata)}`;
      if (error) message += ` ERROR: ${error.message}`;
      console.log(message);
    }
  }

  /**
   * Log a debug message
   */
  debug(action: string, category: LogCategory, options: Partial<LogEntry> = {}): void {
    this.output({ ...options, level: 'DEBUG', action, category, timestamp: new Date().toISOString() });
  }

  /**
   * Log an info message
   */
  info(action: string, category: LogCategory, options: Partial<LogEntry> = {}): void {
    this.output({ ...options, level: 'INFO', action, category, timestamp: new Date().toISOString() });
  }

  /**
   * Log a warning message
   */
  warn(action: string, category: LogCategory, options: Partial<LogEntry> = {}): void {
    this.output({ ...options, level: 'WARN', action, category, timestamp: new Date().toISOString() });
  }

  /**
   * Log an error message
   */
  error(action: string, category: LogCategory, error: Error | string, options: Partial<LogEntry> = {}): void {
    const errorInfo = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: error };

    this.output({
      ...options,
      level: 'ERROR',
      action,
      category,
      timestamp: new Date().toISOString(),
      error: errorInfo,
    });
  }

  // ==================== Ticket Logging ====================

  ticketCreated(ticketId: string, ticketNumber: string, userId: string, metadata?: Record<string, unknown>): void {
    this.info('TICKET_CREATED', 'TICKET', {
      ticketId,
      ticketNumber,
      userId,
      metadata,
    });
  }

  ticketUpdated(ticketId: string, ticketNumber: string, userId: string, changes: Record<string, unknown>): void {
    this.info('TICKET_UPDATED', 'TICKET', {
      ticketId,
      ticketNumber,
      userId,
      metadata: { changes },
    });
  }

  ticketStatusChanged(ticketId: string, ticketNumber: string, userId: string, fromStatus: string, toStatus: string): void {
    this.info('TICKET_STATUS_CHANGED', 'TICKET', {
      ticketId,
      ticketNumber,
      userId,
      metadata: { fromStatus, toStatus },
    });
  }

  ticketAssigned(ticketId: string, ticketNumber: string, assignedBy: string, assignedTo: string): void {
    this.info('TICKET_ASSIGNED', 'TICKET', {
      ticketId,
      ticketNumber,
      userId: assignedBy,
      metadata: { assignedTo },
    });
  }

  ticketResolved(ticketId: string, ticketNumber: string, userId: string, resolutionTime?: number): void {
    this.info('TICKET_RESOLVED', 'TICKET', {
      ticketId,
      ticketNumber,
      userId,
      duration: resolutionTime,
    });
  }

  ticketClosed(ticketId: string, ticketNumber: string, userId: string): void {
    this.info('TICKET_CLOSED', 'TICKET', {
      ticketId,
      ticketNumber,
      userId,
    });
  }

  // ==================== Auth Logging ====================

  loginSuccess(userId: string, email: string, ipAddress?: string, userAgent?: string): void {
    this.info('LOGIN_SUCCESS', 'AUTH', {
      userId,
      userEmail: email,
      ipAddress,
      userAgent,
    });
  }

  loginFailed(email: string, reason: string, ipAddress?: string, userAgent?: string): void {
    this.warn('LOGIN_FAILED', 'AUTH', {
      userEmail: email,
      ipAddress,
      userAgent,
      metadata: { reason },
    });
  }

  logout(userId: string, email: string): void {
    this.info('LOGOUT', 'AUTH', {
      userId,
      userEmail: email,
    });
  }

  sessionExpired(userId: string, email: string): void {
    this.info('SESSION_EXPIRED', 'AUTH', {
      userId,
      userEmail: email,
    });
  }

  accountLocked(email: string, reason: string, ipAddress?: string): void {
    this.warn('ACCOUNT_LOCKED', 'AUTH', {
      userEmail: email,
      ipAddress,
      metadata: { reason },
    });
  }

  passwordChanged(userId: string, email: string): void {
    this.info('PASSWORD_CHANGED', 'AUTH', {
      userId,
      userEmail: email,
    });
  }

  // ==================== User Logging ====================

  userCreated(userId: string, createdBy: string, metadata?: Record<string, unknown>): void {
    this.info('USER_CREATED', 'USER', {
      userId,
      metadata: { ...metadata, createdBy },
    });
  }

  userUpdated(userId: string, updatedBy: string, changes: Record<string, unknown>): void {
    this.info('USER_UPDATED', 'USER', {
      userId,
      metadata: { updatedBy, changes },
    });
  }

  userDeleted(userId: string, deletedBy: string): void {
    this.info('USER_DELETED', 'USER', {
      userId,
      metadata: { deletedBy },
    });
  }

  userRoleChanged(userId: string, changedBy: string, fromRole: string, toRole: string): void {
    this.info('USER_ROLE_CHANGED', 'USER', {
      userId,
      metadata: { changedBy, fromRole, toRole },
    });
  }

  // ==================== API Logging ====================

  apiRequest(method: string, path: string, userId?: string, duration?: number, statusCode?: number): void {
    this.debug('API_REQUEST', 'API', {
      userId,
      duration,
      metadata: { method, path, statusCode },
    });
  }

  apiError(method: string, path: string, error: Error | string, statusCode?: number): void {
    const errorInfo = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: error };

    this.error('API_ERROR', 'API', errorInfo.message, {
      metadata: { method, path, statusCode },
      error: errorInfo,
    });
  }

  // ==================== Omni Integration Logging ====================

  omniTicketCreated(ticketId: string, ticketNumber: string, omniTicketId: string, omniTicketNumber: string): void {
    this.info('OMNI_TICKET_CREATED', 'OMNI', {
      ticketId,
      ticketNumber,
      metadata: { omniTicketId, omniTicketNumber },
    });
  }

  omniTicketFailed(ticketId: string, ticketNumber: string, error: string, code?: number): void {
    this.error('OMNI_TICKET_FAILED', 'OMNI', error, {
      ticketId,
      ticketNumber,
      error: { message: error, code: code?.toString() },
    });
  }

  omniStatusUpdated(ticketId: string, ticketNumber: string, status: string): void {
    this.info('OMNI_STATUS_UPDATED', 'OMNI', {
      ticketId,
      ticketNumber,
      metadata: { status },
    });
  }

  omniStatusUpdateFailed(ticketId: string, ticketNumber: string, error: string): void {
    this.error('OMNI_STATUS_UPDATE_FAILED', 'OMNI', error, {
      ticketId,
      ticketNumber,
    });
  }

  // ==================== System Logging ====================

  systemStartup(): void {
    this.info('SYSTEM_STARTUP', 'SYSTEM', {
      metadata: {
        nodeVersion: process.version,
        env: process.env.NODE_ENV,
      },
    });
  }

  systemShutdown(): void {
    this.info('SYSTEM_SHUTDOWN', 'SYSTEM');
  }

  systemHealthCheck(healthy: boolean, details?: Record<string, unknown>): void {
    if (healthy) {
      this.debug('HEALTH_CHECK_PASSED', 'SYSTEM', { metadata: details });
    } else {
      this.warn('HEALTH_CHECK_FAILED', 'SYSTEM', { metadata: details });
    }
  }

  // ==================== Audit Logging ====================

  auditAction(action: string, userId: string, entity: string, entityId: string, details?: Record<string, unknown>): void {
    this.info(`AUDIT_${action}`, 'AUDIT', {
      userId,
      metadata: { entity, entityId, ...details },
    });
  }

  securityEvent(event: string, userId?: string, details?: Record<string, unknown>): void {
    this.warn(`SECURITY_${event}`, 'AUDIT', {
      userId,
      metadata: details,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing or custom instances
export { Logger };
