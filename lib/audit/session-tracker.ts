import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit-logger';
import { v4 as uuidv4 } from 'uuid';

export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  isMobile: boolean;
}

export interface SessionTrackingOptions {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: DeviceInfo;
  location?: string;
}

/**
 * Parse user agent string to extract device info
 */
export function parseUserAgent(userAgent: string | null): DeviceInfo {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      browserVersion: '',
      os: 'Unknown',
      osVersion: '',
      deviceType: 'unknown',
      isMobile: false
    };
  }

  const ua = userAgent.toLowerCase();

  // Detect browser
  let browser = 'Unknown';
  let browserVersion = '';
  if (ua.includes('edg/')) {
    browser = 'Edge';
    browserVersion = ua.match(/edg\/(\d+)/)?.[1] || '';
  } else if (ua.includes('chrome')) {
    browser = 'Chrome';
    browserVersion = ua.match(/chrome\/(\d+)/)?.[1] || '';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
    browserVersion = ua.match(/firefox\/(\d+)/)?.[1] || '';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
    browserVersion = ua.match(/version\/(\d+)/)?.[1] || '';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
    browserVersion = ua.match(/(?:opera|opr)\/(\d+)/)?.[1] || '';
  }

  // Detect OS
  let os = 'Unknown';
  let osVersion = '';
  if (ua.includes('windows')) {
    os = 'Windows';
    if (ua.includes('windows nt 10')) osVersion = '10';
    else if (ua.includes('windows nt 11')) osVersion = '11';
    else if (ua.includes('windows nt 6.3')) osVersion = '8.1';
    else if (ua.includes('windows nt 6.2')) osVersion = '8';
    else if (ua.includes('windows nt 6.1')) osVersion = '7';
  } else if (ua.includes('mac os')) {
    os = 'macOS';
    osVersion = ua.match(/mac os x (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
    osVersion = ua.match(/android (\d+)/)?.[1] || '';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
    osVersion = ua.match(/os (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
  }

  // Detect device type
  let deviceType: DeviceInfo['deviceType'] = 'desktop';
  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTablet = /tablet|ipad|playbook|silk/i.test(ua);

  if (isTablet) {
    deviceType = 'tablet';
  } else if (isMobile) {
    deviceType = 'mobile';
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    isMobile: isMobile || isTablet
  };
}

/**
 * Create a new session tracking record
 */
export async function createSession(options: SessionTrackingOptions) {
  const { userId, ipAddress, userAgent, location } = options;

  const deviceInfo = options.deviceInfo || parseUserAgent(userAgent || null);
  const sessionToken = uuidv4();

  // Check if this is a new device
  const isNew = await isNewDevice(userId, deviceInfo);

  try {
    const session = await prisma.userAuditSession.create({
      data: {
        userId,
        sessionToken,
        ipAddress,
        userAgent,
        deviceInfo: deviceInfo as any,
        location,
        isNewDevice: isNew,
        isActive: true
      }
    });

    // Log session creation
    await createAuditLog({
      userId,
      action: 'SESSION_CREATED',
      entity: 'SESSION',
      entityId: session.id,
      newValues: {
        ipAddress,
        deviceInfo,
        isNewDevice: isNew
      }
    });

    // Log new device alert if applicable
    if (isNew) {
      await createAuditLog({
        userId,
        action: 'NEW_DEVICE_LOGIN',
        entity: 'SESSION',
        entityId: session.id,
        newValues: {
          ipAddress,
          deviceInfo,
          message: 'Login dari perangkat baru terdeteksi'
        }
      });
    }

    return session;
  } catch (error) {
    console.error('Failed to create session:', error);
    return null;
  }
}

/**
 * End a session
 */
export async function endSession(
  sessionId: string,
  reason: 'manual' | 'timeout' | 'forced' | 'session_expired' = 'manual'
) {
  try {
    const session = await prisma.userAuditSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        logoutAt: new Date(),
        logoutReason: reason
      }
    });

    // Map reason to audit action
    const actionMap: Record<string, 'LOGOUT' | 'LOGOUT_TIMEOUT' | 'LOGOUT_FORCED' | 'SESSION_EXPIRED'> = {
      manual: 'LOGOUT',
      timeout: 'LOGOUT_TIMEOUT',
      forced: 'LOGOUT_FORCED',
      session_expired: 'SESSION_EXPIRED'
    };

    await createAuditLog({
      userId: session.userId,
      action: actionMap[reason],
      entity: 'SESSION',
      entityId: session.id,
      newValues: {
        logoutReason: reason,
        duration: session.loginAt ? Math.round((Date.now() - session.loginAt.getTime()) / 1000) : null
      }
    });

    return session;
  } catch (error) {
    console.error('Failed to end session:', error);
    return null;
  }
}

/**
 * End session by token
 */
export async function endSessionByToken(sessionToken: string, reason: 'manual' | 'timeout' | 'forced' | 'session_expired' = 'manual') {
  try {
    const session = await prisma.userAuditSession.findUnique({
      where: { sessionToken }
    });

    if (!session) return null;

    return endSession(session.id, reason);
  } catch (error) {
    console.error('Failed to end session by token:', error);
    return null;
  }
}

/**
 * Check if this is a new device for the user
 */
export async function isNewDevice(userId: string, deviceInfo: DeviceInfo): Promise<boolean> {
  try {
    // Check if user has logged in from this device before
    const existingSession = await prisma.userAuditSession.findFirst({
      where: {
        userId,
        deviceInfo: {
          path: ['browser'],
          equals: deviceInfo.browser
        }
      }
    });

    // If no existing session with same browser/os combo, it's a new device
    if (!existingSession) {
      // Double check with a more thorough query
      const sessions = await prisma.userAuditSession.findMany({
        where: { userId },
        orderBy: { loginAt: 'desc' },
        take: 50
      });

      // Check if any session matches the device
      const hasMatch = sessions.some(s => {
        const info = s.deviceInfo as DeviceInfo | null;
        if (!info) return false;
        return info.browser === deviceInfo.browser && info.os === deviceInfo.os;
      });

      return !hasMatch;
    }

    return false;
  } catch (error) {
    console.error('Failed to check new device:', error);
    return false; // Default to not new to avoid false alerts
  }
}

/**
 * Get all active sessions for a user
 */
export async function getActiveSessions(userId: string) {
  try {
    return await prisma.userAuditSession.findMany({
      where: {
        userId,
        isActive: true
      },
      orderBy: { loginAt: 'desc' }
    });
  } catch (error) {
    console.error('Failed to get active sessions:', error);
    return [];
  }
}

/**
 * Force end all sessions for a user (except current one)
 */
export async function forceEndAllSessions(userId: string, exceptSessionId?: string) {
  try {
    const sessions = await prisma.userAuditSession.findMany({
      where: {
        userId,
        isActive: true,
        ...(exceptSessionId && { id: { not: exceptSessionId } })
      }
    });

    const endedCount = await Promise.all(
      sessions.map(s => endSession(s.id, 'forced'))
    );

    return endedCount.filter(Boolean).length;
  } catch (error) {
    console.error('Failed to force end sessions:', error);
    return 0;
  }
}

/**
 * Get session history for a user
 */
export async function getSessionHistory(userId: string, options?: { limit?: number; offset?: number }) {
  const { limit = 50, offset = 0 } = options || {};

  try {
    return await prisma.userAuditSession.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: limit,
      skip: offset
    });
  } catch (error) {
    console.error('Failed to get session history:', error);
    return [];
  }
}
