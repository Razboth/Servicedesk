import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { networkMonitor } from '@/lib/monitoring/network-monitor';

// Global variable to track monitoring status
let monitoringStatus = {
  isRunning: false,
  startedAt: null as Date | null,
  startedBy: null as string | null
};

/**
 * GET /api/monitoring/control - Get monitoring status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: monitoringStatus.isRunning ? 'running' : 'stopped',
      ...monitoringStatus
    });
  } catch (error) {
    console.error('Error getting monitoring status:', error);
    return NextResponse.json(
      { error: 'Failed to get monitoring status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/control - Start or stop monitoring
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    if (action === 'start') {
      if (monitoringStatus.isRunning) {
        return NextResponse.json({
          message: 'Monitoring is already running',
          status: 'running',
          ...monitoringStatus
        });
      }

      // Start monitoring
      await networkMonitor.start();
      
      monitoringStatus = {
        isRunning: true,
        startedAt: new Date(),
        startedBy: session.user.name || session.user.email
      };

      return NextResponse.json({
        message: 'Network monitoring started successfully',
        status: 'running',
        ...monitoringStatus
      });
    } else if (action === 'stop') {
      if (!monitoringStatus.isRunning) {
        return NextResponse.json({
          message: 'Monitoring is not running',
          status: 'stopped',
          ...monitoringStatus
        });
      }

      // Stop monitoring
      networkMonitor.stop();
      
      monitoringStatus = {
        isRunning: false,
        startedAt: null,
        startedBy: null
      };

      return NextResponse.json({
        message: 'Network monitoring stopped successfully',
        status: 'stopped',
        ...monitoringStatus
      });
    } else if (action === 'check') {
      // Trigger immediate check
      if (!monitoringStatus.isRunning) {
        return NextResponse.json(
          { error: 'Monitoring is not running' },
          { status: 400 }
        );
      }

      // Run check asynchronously
      networkMonitor.checkAllNetworks().catch(error => {
        console.error('Error running network check:', error);
      });

      return NextResponse.json({
        message: 'Network check triggered',
        status: 'checking'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start", "stop", or "check"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error controlling monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to control monitoring' },
      { status: 500 }
    );
  }
}