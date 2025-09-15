import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/utils/ip-utils';

// Create singleton Prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type AuditAction =
  // User Management
  | 'CREATE_USER' | 'UPDATE_USER' | 'DELETE_USER' | 'ENABLE_USER' | 'DISABLE_USER' | 'UNLOCK_USER' | 'RESET_PASSWORD'
  | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET_COMPLETED' | 'PASSWORD_RESET_FAILED' | 'PASSWORD_RESET_RATE_LIMITED'
  // Ticket Actions
  | 'CREATE_TICKET' | 'UPDATE_TICKET' | 'DELETE_TICKET' | 'STATUS_UPDATE' | 'ASSIGN_TICKET' | 'CLAIM_TICKET' | 'RESOLVE_TICKET' | 'CLOSE_TICKET'
  // Comments
  | 'ADD_COMMENT' | 'UPDATE_COMMENT' | 'DELETE_COMMENT'
  // Service Management
  | 'CREATE_SERVICE' | 'UPDATE_SERVICE' | 'DELETE_SERVICE' | 'ENABLE_SERVICE' | 'DISABLE_SERVICE'
  // Category Management
  | 'CREATE_CATEGORY' | 'UPDATE_CATEGORY' | 'DELETE_CATEGORY'
  // Vendor Management
  | 'CREATE_VENDOR' | 'UPDATE_VENDOR' | 'DELETE_VENDOR' | 'ENABLE_VENDOR' | 'DISABLE_VENDOR'
  // Support Groups
  | 'CREATE_SUPPORT_GROUP' | 'UPDATE_SUPPORT_GROUP' | 'DELETE_SUPPORT_GROUP'
  // Branch Management
  | 'CREATE_BRANCH' | 'UPDATE_BRANCH' | 'DELETE_BRANCH'
  // ATM Management
  | 'CREATE_ATM' | 'UPDATE_ATM' | 'DELETE_ATM' | 'CREATE_ATM_INCIDENT'
  // Field Templates
  | 'CREATE_FIELD_TEMPLATE' | 'UPDATE_FIELD_TEMPLATE' | 'DELETE_FIELD_TEMPLATE'
  // Task Templates
  | 'CREATE_TASK_TEMPLATE' | 'UPDATE_TASK_TEMPLATE' | 'DELETE_TASK_TEMPLATE'
  // File Operations
  | 'UPLOAD_FILE' | 'DOWNLOAD_FILE' | 'DELETE_FILE'
  // Authentication
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'SESSION_EXPIRED'
  // Reports
  | 'GENERATE_REPORT' | 'EXPORT_REPORT' | 'SAVE_REPORT' | 'DELETE_REPORT'
  // API Access
  | 'API_ACCESS' | 'API_KEY_CREATED' | 'API_KEY_REVOKED'
  // Import/Export
  | 'IMPORT_DATA' | 'EXPORT_DATA' | 'ROLLBACK_IMPORT'
  // System
  | 'SYSTEM_CONFIG_UPDATE' | 'SECURITY_ALERT' | 'PERMISSION_DENIED';

export type AuditEntity =
  | 'USER' | 'TICKET' | 'COMMENT' | 'SERVICE' | 'CATEGORY' | 'VENDOR'
  | 'SUPPORT_GROUP' | 'BRANCH' | 'ATM' | 'FIELD_TEMPLATE' | 'TASK_TEMPLATE'
  | 'FILE' | 'REPORT' | 'API_KEY' | 'SYSTEM' | 'SESSION' | 'IMPORT';

interface AuditLogOptions {
  userId?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  ticketId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  request?: NextRequest;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(options: AuditLogOptions) {
  try {
    const {
      userId,
      action,
      entity,
      entityId,
      ticketId,
      oldValues,
      newValues,
      metadata,
      request
    } = options;

    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (request) {
      ipAddress = getClientIp(request);
      userAgent = request.headers.get('user-agent');
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId || '',
        ticketId,
        oldValues,
        newValues: {
          ...newValues,
          ...metadata,
          timestamp: new Date().toISOString()
        },
        ipAddress,
        userAgent
      }
    });

    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent disrupting the main operation
    return null;
  }
}

/**
 * Helper function to log user activity
 */
export async function logUserActivity(
  userId: string,
  action: AuditAction,
  entity: AuditEntity,
  details?: {
    entityId?: string;
    ticketId?: string;
    oldValues?: any;
    newValues?: any;
    metadata?: any;
    request?: NextRequest;
  }
) {
  return createAuditLog({
    userId,
    action,
    entity,
    ...details
  });
}

/**
 * Log a failed operation (e.g., permission denied)
 */
export async function logFailedOperation(
  userId: string | undefined,
  action: AuditAction,
  entity: AuditEntity,
  reason: string,
  request?: NextRequest
) {
  return createAuditLog({
    userId,
    action: 'PERMISSION_DENIED',
    entity,
    metadata: {
      attemptedAction: action,
      reason
    },
    request
  });
}

/**
 * Batch create audit logs for bulk operations
 */
export async function createBulkAuditLogs(logs: AuditLogOptions[]) {
  try {
    const auditLogs = await Promise.all(
      logs.map(log => createAuditLog(log))
    );
    return auditLogs.filter(Boolean);
  } catch (error) {
    console.error('Failed to create bulk audit logs:', error);
    return [];
  }
}