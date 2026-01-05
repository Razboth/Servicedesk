import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export type AuditReportType =
  | 'LOGIN_ACTIVITY'
  | 'FAILED_LOGINS'
  | 'PASSWORD_CHANGES'
  | 'USER_ACTIVITY'
  | 'SECURITY_EVENTS'
  | 'PROFILE_CHANGES'
  | 'SESSION_HISTORY';

export interface AuditReportConfig {
  type: AuditReportType;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters?: {
    userId?: string;
    actions?: string[];
    ipAddress?: string;
    email?: string;
  };
  format: 'json' | 'csv' | 'xlsx';
}

export interface AuditReportResult {
  type: AuditReportType;
  generatedAt: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  totalRecords: number;
  data: any[];
  summary?: Record<string, any>;
}

// Report type configurations
const reportConfigs: Record<AuditReportType, {
  title: string;
  description: string;
  columns: string[];
  columnLabels: Record<string, string>;
}> = {
  LOGIN_ACTIVITY: {
    title: 'Laporan Aktivitas Login',
    description: 'Ringkasan semua aktivitas login termasuk berhasil dan gagal',
    columns: ['email', 'success', 'failureReason', 'ipAddress', 'userAgent', 'attemptedAt', 'lockTriggered'],
    columnLabels: {
      email: 'Email',
      success: 'Status',
      failureReason: 'Alasan Gagal',
      ipAddress: 'Alamat IP',
      userAgent: 'Browser',
      attemptedAt: 'Waktu',
      lockTriggered: 'Akun Terkunci'
    }
  },
  FAILED_LOGINS: {
    title: 'Laporan Login Gagal',
    description: 'Detail semua percobaan login yang gagal',
    columns: ['email', 'failureReason', 'ipAddress', 'userAgent', 'attemptedAt', 'lockTriggered'],
    columnLabels: {
      email: 'Email',
      failureReason: 'Alasan',
      ipAddress: 'Alamat IP',
      userAgent: 'Browser',
      attemptedAt: 'Waktu',
      lockTriggered: 'Akun Terkunci'
    }
  },
  PASSWORD_CHANGES: {
    title: 'Laporan Perubahan Password',
    description: 'Semua aktivitas perubahan dan reset password',
    columns: ['userName', 'userEmail', 'action', 'ipAddress', 'createdAt'],
    columnLabels: {
      userName: 'Nama User',
      userEmail: 'Email',
      action: 'Aksi',
      ipAddress: 'Alamat IP',
      createdAt: 'Waktu'
    }
  },
  USER_ACTIVITY: {
    title: 'Laporan Aktivitas User',
    description: 'Ringkasan aktivitas user dalam sistem',
    columns: ['userName', 'userEmail', 'role', 'totalActions', 'lastActivity', 'loginCount', 'failedLoginCount'],
    columnLabels: {
      userName: 'Nama',
      userEmail: 'Email',
      role: 'Role',
      totalActions: 'Total Aksi',
      lastActivity: 'Aktivitas Terakhir',
      loginCount: 'Jumlah Login',
      failedLoginCount: 'Login Gagal'
    }
  },
  SECURITY_EVENTS: {
    title: 'Laporan Kejadian Keamanan',
    description: 'Semua kejadian terkait keamanan sistem',
    columns: ['action', 'userName', 'userEmail', 'ipAddress', 'details', 'createdAt'],
    columnLabels: {
      action: 'Aksi',
      userName: 'Nama User',
      userEmail: 'Email',
      ipAddress: 'Alamat IP',
      details: 'Detail',
      createdAt: 'Waktu'
    }
  },
  PROFILE_CHANGES: {
    title: 'Laporan Perubahan Profil',
    description: 'Semua perubahan data profil user',
    columns: ['userName', 'userEmail', 'fieldName', 'oldValue', 'newValue', 'changedByName', 'createdAt'],
    columnLabels: {
      userName: 'User',
      userEmail: 'Email',
      fieldName: 'Field',
      oldValue: 'Nilai Lama',
      newValue: 'Nilai Baru',
      changedByName: 'Diubah Oleh',
      createdAt: 'Waktu'
    }
  },
  SESSION_HISTORY: {
    title: 'Laporan Riwayat Sesi',
    description: 'Riwayat sesi login user',
    columns: ['userName', 'userEmail', 'ipAddress', 'deviceType', 'browser', 'loginAt', 'logoutAt', 'duration', 'logoutReason'],
    columnLabels: {
      userName: 'Nama',
      userEmail: 'Email',
      ipAddress: 'Alamat IP',
      deviceType: 'Perangkat',
      browser: 'Browser',
      loginAt: 'Login',
      logoutAt: 'Logout',
      duration: 'Durasi',
      logoutReason: 'Alasan Logout'
    }
  }
};

/**
 * Generate audit report based on type
 */
export async function generateAuditReport(config: AuditReportConfig): Promise<AuditReportResult> {
  const { type, dateRange, filters } = config;

  switch (type) {
    case 'LOGIN_ACTIVITY':
      return generateLoginActivityReport(dateRange, filters);
    case 'FAILED_LOGINS':
      return generateFailedLoginsReport(dateRange, filters);
    case 'PASSWORD_CHANGES':
      return generatePasswordChangesReport(dateRange, filters);
    case 'USER_ACTIVITY':
      return generateUserActivityReport(dateRange, filters);
    case 'SECURITY_EVENTS':
      return generateSecurityEventsReport(dateRange, filters);
    case 'PROFILE_CHANGES':
      return generateProfileChangesReport(dateRange, filters);
    case 'SESSION_HISTORY':
      return generateSessionHistoryReport(dateRange, filters);
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

/**
 * Login Activity Report
 */
async function generateLoginActivityReport(
  dateRange: { start: Date; end: Date },
  filters?: AuditReportConfig['filters']
): Promise<AuditReportResult> {
  const where: any = {
    attemptedAt: {
      gte: dateRange.start,
      lte: dateRange.end
    }
  };

  if (filters?.email) {
    where.email = { contains: filters.email, mode: 'insensitive' };
  }
  if (filters?.ipAddress) {
    where.ipAddress = filters.ipAddress;
  }

  const loginAttempts = await prisma.loginAttempt.findMany({
    where,
    orderBy: { attemptedAt: 'desc' }
  });

  const data = loginAttempts.map(attempt => ({
    email: attempt.email,
    success: attempt.success ? 'Berhasil' : 'Gagal',
    failureReason: attempt.failureReason || '-',
    ipAddress: attempt.ipAddress || '-',
    userAgent: parseUserAgentShort(attempt.userAgent),
    attemptedAt: formatDateTime(attempt.attemptedAt),
    lockTriggered: attempt.lockTriggered ? 'Ya' : 'Tidak'
  }));

  // Summary statistics
  const successCount = loginAttempts.filter(a => a.success).length;
  const failedCount = loginAttempts.filter(a => !a.success).length;
  const lockoutCount = loginAttempts.filter(a => a.lockTriggered).length;

  return {
    type: 'LOGIN_ACTIVITY',
    generatedAt: new Date(),
    dateRange,
    totalRecords: loginAttempts.length,
    data,
    summary: {
      total: loginAttempts.length,
      successful: successCount,
      failed: failedCount,
      lockouts: lockoutCount,
      successRate: loginAttempts.length > 0 ? ((successCount / loginAttempts.length) * 100).toFixed(1) + '%' : '0%'
    }
  };
}

/**
 * Failed Logins Report
 */
async function generateFailedLoginsReport(
  dateRange: { start: Date; end: Date },
  filters?: AuditReportConfig['filters']
): Promise<AuditReportResult> {
  const where: any = {
    attemptedAt: {
      gte: dateRange.start,
      lte: dateRange.end
    },
    success: false
  };

  if (filters?.email) {
    where.email = { contains: filters.email, mode: 'insensitive' };
  }
  if (filters?.ipAddress) {
    where.ipAddress = filters.ipAddress;
  }

  const failedAttempts = await prisma.loginAttempt.findMany({
    where,
    orderBy: { attemptedAt: 'desc' }
  });

  const data = failedAttempts.map(attempt => ({
    email: attempt.email,
    failureReason: formatFailureReason(attempt.failureReason),
    ipAddress: attempt.ipAddress || '-',
    userAgent: parseUserAgentShort(attempt.userAgent),
    attemptedAt: formatDateTime(attempt.attemptedAt),
    lockTriggered: attempt.lockTriggered ? 'Ya' : 'Tidak'
  }));

  // Group by reason
  const reasonCounts = failedAttempts.reduce((acc, a) => {
    const reason = a.failureReason || 'UNKNOWN';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    type: 'FAILED_LOGINS',
    generatedAt: new Date(),
    dateRange,
    totalRecords: failedAttempts.length,
    data,
    summary: {
      total: failedAttempts.length,
      byReason: reasonCounts,
      lockoutTriggered: failedAttempts.filter(a => a.lockTriggered).length
    }
  };
}

/**
 * Password Changes Report
 */
async function generatePasswordChangesReport(
  dateRange: { start: Date; end: Date },
  filters?: AuditReportConfig['filters']
): Promise<AuditReportResult> {
  const passwordActions = [
    'PASSWORD_CHANGED',
    'PASSWORD_RESET_COMPLETED',
    'PASSWORD_RESET_REQUESTED',
    'RESET_PASSWORD'
  ];

  const where: any = {
    createdAt: {
      gte: dateRange.start,
      lte: dateRange.end
    },
    action: { in: passwordActions }
  };

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const data = auditLogs.map(log => ({
    userName: log.user?.name || '-',
    userEmail: log.user?.email || '-',
    action: formatAction(log.action),
    ipAddress: log.ipAddress || '-',
    createdAt: formatDateTime(log.createdAt)
  }));

  return {
    type: 'PASSWORD_CHANGES',
    generatedAt: new Date(),
    dateRange,
    totalRecords: auditLogs.length,
    data,
    summary: {
      total: auditLogs.length,
      passwordChanged: auditLogs.filter(l => l.action === 'PASSWORD_CHANGED').length,
      passwordReset: auditLogs.filter(l => l.action.includes('RESET')).length
    }
  };
}

/**
 * User Activity Summary Report
 */
async function generateUserActivityReport(
  dateRange: { start: Date; end: Date },
  filters?: AuditReportConfig['filters']
): Promise<AuditReportResult> {
  // Get all users with activity stats
  const users = await prisma.user.findMany({
    where: filters?.userId ? { id: filters.userId } : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      lastActivity: true,
      _count: {
        select: {
          auditLogs: {
            where: {
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end
              }
            }
          }
        }
      }
    }
  });

  // Get login stats per user
  const loginStats = await prisma.loginAttempt.groupBy({
    by: ['email'],
    where: {
      attemptedAt: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    },
    _count: {
      email: true
    },
    _sum: {
      // Can't sum boolean, so we'll get this separately
    }
  });

  const failedLogins = await prisma.loginAttempt.groupBy({
    by: ['email'],
    where: {
      attemptedAt: {
        gte: dateRange.start,
        lte: dateRange.end
      },
      success: false
    },
    _count: {
      email: true
    }
  });

  const loginStatsMap = new Map(loginStats.map(s => [s.email, s._count.email]));
  const failedLoginsMap = new Map(failedLogins.map(s => [s.email, s._count.email]));

  const data = users.map(user => ({
    userName: user.name,
    userEmail: user.email,
    role: user.role,
    totalActions: user._count.auditLogs,
    lastActivity: user.lastActivity ? formatDateTime(user.lastActivity) : '-',
    loginCount: loginStatsMap.get(user.email) || 0,
    failedLoginCount: failedLoginsMap.get(user.email) || 0
  }));

  // Sort by total actions descending
  data.sort((a, b) => b.totalActions - a.totalActions);

  return {
    type: 'USER_ACTIVITY',
    generatedAt: new Date(),
    dateRange,
    totalRecords: data.length,
    data,
    summary: {
      totalUsers: users.length,
      activeUsers: data.filter(u => u.totalActions > 0).length,
      totalActions: data.reduce((sum, u) => sum + u.totalActions, 0)
    }
  };
}

/**
 * Security Events Report
 */
async function generateSecurityEventsReport(
  dateRange: { start: Date; end: Date },
  filters?: AuditReportConfig['filters']
): Promise<AuditReportResult> {
  const securityActions = [
    'UNLOCK_USER',
    'LOGOUT_FORCED',
    'LOGIN_FAILED_ACCOUNT_LOCKED',
    'NEW_DEVICE_LOGIN',
    'PERMISSION_DENIED',
    'SECURITY_ALERT',
    'LOGIN_FAILED_WRONG_PASSWORD',
    'LOGIN_FAILED_ACCOUNT_INACTIVE'
  ];

  const where: any = {
    createdAt: {
      gte: dateRange.start,
      lte: dateRange.end
    },
    action: { in: securityActions }
  };

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const data = auditLogs.map(log => ({
    action: formatAction(log.action),
    userName: log.user?.name || '-',
    userEmail: log.user?.email || '-',
    ipAddress: log.ipAddress || '-',
    details: log.newValues ? JSON.stringify(log.newValues).substring(0, 100) : '-',
    createdAt: formatDateTime(log.createdAt)
  }));

  // Group by action type
  const actionCounts = auditLogs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    type: 'SECURITY_EVENTS',
    generatedAt: new Date(),
    dateRange,
    totalRecords: auditLogs.length,
    data,
    summary: {
      total: auditLogs.length,
      byAction: actionCounts
    }
  };
}

/**
 * Profile Changes Report
 */
async function generateProfileChangesReport(
  dateRange: { start: Date; end: Date },
  filters?: AuditReportConfig['filters']
): Promise<AuditReportResult> {
  const where: any = {
    createdAt: {
      gte: dateRange.start,
      lte: dateRange.end
    }
  };

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  const profileChanges = await prisma.profileChangeLog.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      },
      changedByUser: {
        select: {
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const data = profileChanges.map(change => ({
    userName: change.user.name,
    userEmail: change.user.email,
    fieldName: formatFieldName(change.fieldName),
    oldValue: change.oldValue || '-',
    newValue: change.newValue || '-',
    changedByName: change.changedByUser.name,
    createdAt: formatDateTime(change.createdAt)
  }));

  // Group by field
  const fieldCounts = profileChanges.reduce((acc, c) => {
    acc[c.fieldName] = (acc[c.fieldName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    type: 'PROFILE_CHANGES',
    generatedAt: new Date(),
    dateRange,
    totalRecords: profileChanges.length,
    data,
    summary: {
      total: profileChanges.length,
      byField: fieldCounts
    }
  };
}

/**
 * Session History Report
 */
async function generateSessionHistoryReport(
  dateRange: { start: Date; end: Date },
  filters?: AuditReportConfig['filters']
): Promise<AuditReportResult> {
  const where: any = {
    loginAt: {
      gte: dateRange.start,
      lte: dateRange.end
    }
  };

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  const sessions = await prisma.userAuditSession.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: { loginAt: 'desc' }
  });

  const data = sessions.map(session => {
    const deviceInfo = session.deviceInfo as any;
    const duration = session.logoutAt
      ? Math.round((session.logoutAt.getTime() - session.loginAt.getTime()) / 60000)
      : null;

    return {
      userName: session.user.name,
      userEmail: session.user.email,
      ipAddress: session.ipAddress || '-',
      deviceType: deviceInfo?.deviceType || '-',
      browser: deviceInfo?.browser || '-',
      loginAt: formatDateTime(session.loginAt),
      logoutAt: session.logoutAt ? formatDateTime(session.logoutAt) : 'Aktif',
      duration: duration ? formatDuration(duration) : '-',
      logoutReason: formatLogoutReason(session.logoutReason)
    };
  });

  return {
    type: 'SESSION_HISTORY',
    generatedAt: new Date(),
    dateRange,
    totalRecords: sessions.length,
    data,
    summary: {
      total: sessions.length,
      activeSessions: sessions.filter(s => s.isActive).length,
      newDeviceLogins: sessions.filter(s => s.isNewDevice).length
    }
  };
}

// Helper functions

function formatDateTime(date: Date): string {
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatAction(action: string): string {
  const actionLabels: Record<string, string> = {
    'PASSWORD_CHANGED': 'Password Diubah',
    'PASSWORD_RESET_COMPLETED': 'Password Direset',
    'PASSWORD_RESET_REQUESTED': 'Permintaan Reset Password',
    'RESET_PASSWORD': 'Reset Password',
    'UNLOCK_USER': 'Buka Kunci Akun',
    'LOGOUT_FORCED': 'Logout Paksa',
    'LOGIN_FAILED_ACCOUNT_LOCKED': 'Login Gagal - Akun Terkunci',
    'NEW_DEVICE_LOGIN': 'Login Perangkat Baru',
    'PERMISSION_DENIED': 'Akses Ditolak',
    'SECURITY_ALERT': 'Peringatan Keamanan',
    'LOGIN_FAILED_WRONG_PASSWORD': 'Login Gagal - Password Salah',
    'LOGIN_FAILED_ACCOUNT_INACTIVE': 'Login Gagal - Akun Nonaktif'
  };
  return actionLabels[action] || action;
}

function formatFailureReason(reason: string | null): string {
  if (!reason) return '-';
  const reasonLabels: Record<string, string> = {
    'WRONG_PASSWORD': 'Password Salah',
    'USER_NOT_FOUND': 'User Tidak Ditemukan',
    'ACCOUNT_INACTIVE': 'Akun Nonaktif',
    'ACCOUNT_LOCKED': 'Akun Terkunci',
    'RATE_LIMITED': 'Terlalu Banyak Percobaan',
    'SESSION_EXPIRED': 'Sesi Kadaluarsa',
    'INVALID_TOKEN': 'Token Tidak Valid'
  };
  return reasonLabels[reason] || reason;
}

function formatFieldName(fieldName: string): string {
  const fieldLabels: Record<string, string> = {
    'email': 'Email',
    'phone': 'Telepon',
    'name': 'Nama',
    'avatar': 'Avatar',
    'role': 'Role',
    'branchId': 'Cabang',
    'supportGroupId': 'Support Group'
  };
  return fieldLabels[fieldName] || fieldName;
}

function formatLogoutReason(reason: string | null): string {
  if (!reason) return '-';
  const reasonLabels: Record<string, string> = {
    'manual': 'Manual',
    'timeout': 'Timeout',
    'forced': 'Paksa',
    'session_expired': 'Sesi Kadaluarsa'
  };
  return reasonLabels[reason] || reason;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} jam ${mins} menit`;
}

function parseUserAgentShort(userAgent: string | null): string {
  if (!userAgent) return '-';

  const ua = userAgent.toLowerCase();
  let browser = 'Unknown';

  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';

  return browser;
}

/**
 * Export report to CSV string
 */
export function exportReportToCSV(report: AuditReportResult): string {
  const config = reportConfigs[report.type];
  const headers = config.columns.map(col => config.columnLabels[col] || col);

  const rows = report.data.map(row =>
    config.columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export report to Excel buffer
 */
export function exportReportToExcel(report: AuditReportResult): Buffer {
  const config = reportConfigs[report.type];
  const headers = config.columns.map(col => config.columnLabels[col] || col);

  const worksheetData = [
    [config.title],
    [`Periode: ${formatDateTime(report.dateRange.start)} - ${formatDateTime(report.dateRange.end)}`],
    [`Dibuat: ${formatDateTime(report.generatedAt)}`],
    [],
    headers,
    ...report.data.map(row => config.columns.map(col => row[col] ?? ''))
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = headers.map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Get report configuration
 */
export function getReportConfig(type: AuditReportType) {
  return reportConfigs[type];
}

/**
 * Get all available report types
 */
export function getAvailableReportTypes() {
  return Object.entries(reportConfigs).map(([type, config]) => ({
    type,
    title: config.title,
    description: config.description
  }));
}
