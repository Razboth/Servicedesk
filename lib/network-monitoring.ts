import { spawn } from 'child_process';
import { prisma } from '@/lib/prisma';
import { NetworkStatus, NetworkMedia } from '@prisma/client';

interface PingResult {
  success: boolean;
  responseTimeMs?: number;
  packetLoss?: number;
  minRtt?: number;
  maxRtt?: number;
  avgRtt?: number;
  mdev?: number;
  packetsTransmitted?: number;
  packetsReceived?: number;
  errorMessage?: string;
}

// Ping configuration based on network media type
const PING_CONFIG = {
  VSAT: {
    timeout: 5000, // 5 seconds timeout
    count: 4,
    expectedLatency: 600, // Expected 600ms for VSAT
    warningThreshold: 800,
    criticalThreshold: 1000
  },
  M2M: {
    timeout: 3000, // 3 seconds timeout
    count: 4,
    expectedLatency: 200, // Expected 200ms for M2M
    warningThreshold: 400,
    criticalThreshold: 600
  },
  FO: {
    timeout: 2000, // 2 seconds timeout
    count: 4,
    expectedLatency: 50, // Expected 50ms for Fiber Optic
    warningThreshold: 100,
    criticalThreshold: 200
  },
  DEFAULT: {
    timeout: 3000,
    count: 4,
    expectedLatency: 300,
    warningThreshold: 500,
    criticalThreshold: 800
  }
};

export async function pingHost(ipAddress: string, networkMedia?: NetworkMedia | null): Promise<PingResult> {
  try {
    const config = networkMedia ? PING_CONFIG[networkMedia] : PING_CONFIG.DEFAULT;
    
    // Use platform-specific ping command
    const isWindows = process.platform === 'win32';
    
    const pingArgs = isWindows
      ? ['-n', config.count.toString(), '-w', config.timeout.toString(), ipAddress]
      : ['-c', config.count.toString(), '-W', Math.floor(config.timeout / 1000).toString(), ipAddress];

    const pingCommand = isWindows ? 'ping' : 'ping';

    // Use spawn with windowsHide to prevent CMD windows from appearing
    const spawnOptions = isWindows ? { windowsHide: true } : {};
    
    const { stdout, stderr } = await spawnAsync(pingCommand, pingArgs, spawnOptions);
    
    if (stderr && !stdout) {
      throw new Error(stderr);
    }

    // Parse ping output
    const result = parsePingOutput(stdout, isWindows);
    
    return result;
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Helper function to promisify spawn
function spawnAsync(command: string, args: string[], options: any = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0 || stdout.length > 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

function parsePingOutput(output: string, isWindows: boolean): PingResult {
  try {
    if (isWindows) {
      // Windows ping output parsing
      const packetLossMatch = output.match(/\((\d+)% loss\)/);
      const avgTimeMatch = output.match(/Average = (\d+)ms/);
      const minTimeMatch = output.match(/Minimum = (\d+)ms/);
      const maxTimeMatch = output.match(/Maximum = (\d+)ms/);
      
      const packetLoss = packetLossMatch ? parseInt(packetLossMatch[1]) : 100;
      
      if (packetLoss === 100) {
        return {
          success: false,
          packetLoss: 100,
          errorMessage: 'Host unreachable'
        };
      }

      return {
        success: true,
        packetLoss,
        avgRtt: avgTimeMatch ? parseFloat(avgTimeMatch[1]) : undefined,
        minRtt: minTimeMatch ? parseFloat(minTimeMatch[1]) : undefined,
        maxRtt: maxTimeMatch ? parseFloat(maxTimeMatch[1]) : undefined,
        responseTimeMs: avgTimeMatch ? parseInt(avgTimeMatch[1]) : undefined
      };
    } else {
      // Linux/Mac ping output parsing
      const statsMatch = output.match(/(\d+) packets transmitted, (\d+) received, (\d+)% packet loss/);
      const rttMatch = output.match(/min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
      
      if (!statsMatch) {
        return {
          success: false,
          errorMessage: 'Failed to parse ping output'
        };
      }

      const packetsTransmitted = parseInt(statsMatch[1]);
      const packetsReceived = parseInt(statsMatch[2]);
      const packetLoss = parseInt(statsMatch[3]);

      if (packetLoss === 100) {
        return {
          success: false,
          packetsTransmitted,
          packetsReceived,
          packetLoss,
          errorMessage: 'Host unreachable'
        };
      }

      const result: PingResult = {
        success: true,
        packetsTransmitted,
        packetsReceived,
        packetLoss
      };

      if (rttMatch) {
        result.minRtt = parseFloat(rttMatch[1]);
        result.avgRtt = parseFloat(rttMatch[2]);
        result.maxRtt = parseFloat(rttMatch[3]);
        result.mdev = parseFloat(rttMatch[4]);
        result.responseTimeMs = Math.round(result.avgRtt);
      }

      return result;
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: 'Failed to parse ping output'
    };
  }
}

export function determineNetworkStatus(
  pingResult: PingResult,
  networkMedia?: NetworkMedia | null
): NetworkStatus {
  if (!pingResult.success || pingResult.packetLoss === 100) {
    return 'OFFLINE';
  }

  const config = networkMedia ? PING_CONFIG[networkMedia] : PING_CONFIG.DEFAULT;
  const responseTime = pingResult.responseTimeMs || 0;

  if (pingResult.packetLoss && pingResult.packetLoss > 25) {
    return 'ERROR';
  }

  if (responseTime > config.criticalThreshold) {
    return 'SLOW';
  }

  if (responseTime > config.warningThreshold || (pingResult.packetLoss && pingResult.packetLoss > 5)) {
    return 'SLOW';
  }

  return 'ONLINE';
}

export async function monitorBranch(branchId: string) {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        ipAddress: true,
        backupIpAddress: true,
        networkMedia: true,
        networkVendor: true,
        monitoringEnabled: true
      }
    });

    if (!branch || !branch.monitoringEnabled) {
      return null;
    }

    const results = [];

    // Monitor primary IP
    if (branch.ipAddress) {
      const pingResult = await pingHost(branch.ipAddress, branch.networkMedia);
      const status = determineNetworkStatus(pingResult, branch.networkMedia);

      const result = await prisma.networkPingResult.create({
        data: {
          entityType: 'BRANCH',
          entityId: branch.id,
          branchId: branch.id,
          ipAddress: branch.ipAddress,
          ipType: 'PRIMARY',
          networkMedia: branch.networkMedia,
          networkVendor: branch.networkVendor,
          status,
          responseTimeMs: pingResult.responseTimeMs,
          packetLoss: pingResult.packetLoss,
          minRtt: pingResult.minRtt,
          maxRtt: pingResult.maxRtt,
          avgRtt: pingResult.avgRtt,
          mdev: pingResult.mdev,
          packetsTransmitted: pingResult.packetsTransmitted,
          packetsReceived: pingResult.packetsReceived,
          errorMessage: pingResult.errorMessage
        }
      });

      results.push(result);
    }

    // Monitor backup IP if available
    if (branch.backupIpAddress) {
      const pingResult = await pingHost(branch.backupIpAddress, branch.networkMedia);
      const status = determineNetworkStatus(pingResult, branch.networkMedia);

      const result = await prisma.networkPingResult.create({
        data: {
          entityType: 'BRANCH',
          entityId: branch.id,
          branchId: branch.id,
          ipAddress: branch.backupIpAddress,
          ipType: 'BACKUP',
          networkMedia: branch.networkMedia,
          networkVendor: branch.networkVendor,
          status,
          responseTimeMs: pingResult.responseTimeMs,
          packetLoss: pingResult.packetLoss,
          minRtt: pingResult.minRtt,
          maxRtt: pingResult.maxRtt,
          avgRtt: pingResult.avgRtt,
          mdev: pingResult.mdev,
          packetsTransmitted: pingResult.packetsTransmitted,
          packetsReceived: pingResult.packetsReceived,
          errorMessage: pingResult.errorMessage
        }
      });

      results.push(result);
    }

    return results;
  } catch (error) {
    console.error(`Error monitoring branch ${branchId}:`, error);
    throw error;
  }
}

export async function monitorATM(atmId: string) {
  try {
    const atm = await prisma.aTM.findUnique({
      where: { id: atmId },
      select: {
        id: true,
        name: true,
        code: true,
        ipAddress: true,
        networkMedia: true,
        networkVendor: true,
        isActive: true
      }
    });

    if (!atm || !atm.isActive || !atm.ipAddress) {
      return null;
    }

    const pingResult = await pingHost(atm.ipAddress, atm.networkMedia);
    const status = determineNetworkStatus(pingResult, atm.networkMedia);

    const result = await prisma.networkPingResult.create({
      data: {
        entityType: 'ATM',
        entityId: atm.id,
        atmId: atm.id,
        ipAddress: atm.ipAddress,
        ipType: 'PRIMARY',
        networkMedia: atm.networkMedia,
        networkVendor: atm.networkVendor,
        status,
        responseTimeMs: pingResult.responseTimeMs,
        packetLoss: pingResult.packetLoss,
        minRtt: pingResult.minRtt,
        maxRtt: pingResult.maxRtt,
        avgRtt: pingResult.avgRtt,
        mdev: pingResult.mdev,
        packetsTransmitted: pingResult.packetsTransmitted,
        packetsReceived: pingResult.packetsReceived,
        errorMessage: pingResult.errorMessage
      }
    });

    return result;
  } catch (error) {
    console.error(`Error monitoring ATM ${atmId}:`, error);
    throw error;
  }
}

export async function getNetworkHealth(entityType: 'BRANCH' | 'ATM', entityId: string, hours: number = 24) {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const results = await prisma.networkPingResult.findMany({
    where: {
      entityType,
      entityId,
      checkedAt: { gte: since }
    },
    orderBy: { checkedAt: 'desc' }
  });

  if (results.length === 0) {
    return {
      status: 'NO_DATA',
      uptime: 0,
      avgResponseTime: 0,
      avgPacketLoss: 0,
      lastCheck: null
    };
  }

  const onlineCount = results.filter(r => r.status === 'ONLINE').length;
  const totalResponseTime = results.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0);
  const totalPacketLoss = results.reduce((sum, r) => sum + (r.packetLoss || 0), 0);

  return {
    status: results[0].status,
    uptime: (onlineCount / results.length) * 100,
    avgResponseTime: Math.round(totalResponseTime / results.length),
    avgPacketLoss: totalPacketLoss / results.length,
    lastCheck: results[0].checkedAt,
    totalChecks: results.length,
    networkMedia: results[0].networkMedia,
    networkVendor: results[0].networkVendor
  };
}