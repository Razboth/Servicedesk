import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/server-metrics/[id] - Get server details with metric history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const server = await prisma.monitoredServer.findUnique({
      where: { id },
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Server not found' },
        { status: 404 }
      );
    }

    // Get metric history for the specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metricHistory = await prisma.serverMetricSnapshot.findMany({
      where: {
        serverId: id,
        collectedAt: { gte: startDate },
      },
      orderBy: { collectedAt: 'asc' },
      include: {
        collection: {
          select: {
            fetchedAt: true,
            reportTimestamp: true,
          },
        },
      },
    });

    // Calculate averages
    let totalCpu = 0;
    let totalMemory = 0;
    let cpuCount = 0;
    let memoryCount = 0;

    for (const metric of metricHistory) {
      if (metric.cpuPercent !== null) {
        totalCpu += metric.cpuPercent;
        cpuCount++;
      }
      if (metric.memoryPercent !== null) {
        totalMemory += metric.memoryPercent;
        memoryCount++;
      }
    }

    const averages = {
      cpuPercent: cpuCount > 0 ? totalCpu / cpuCount : null,
      memoryPercent: memoryCount > 0 ? totalMemory / memoryCount : null,
    };

    // Get peak values
    const peakCpu = Math.max(...metricHistory.filter(m => m.cpuPercent !== null).map(m => m.cpuPercent!), 0);
    const peakMemory = Math.max(...metricHistory.filter(m => m.memoryPercent !== null).map(m => m.memoryPercent!), 0);

    return NextResponse.json({
      success: true,
      data: {
        server: {
          id: server.id,
          ipAddress: server.ipAddress,
          serverName: server.serverName,
          description: server.description,
          category: server.category,
          isActive: server.isActive,
          createdAt: server.createdAt,
          updatedAt: server.updatedAt,
        },
        metrics: {
          history: metricHistory.map((m) => ({
            id: m.id,
            cpuPercent: m.cpuPercent,
            memoryPercent: m.memoryPercent,
            storage: m.storage,
            timestamp: m.timestamp,
            collectedAt: m.collectedAt,
            fetchedAt: m.collection.fetchedAt,
          })),
          averages,
          peaks: {
            cpuPercent: peakCpu,
            memoryPercent: peakMemory,
          },
          periodDays: days,
          totalSnapshots: metricHistory.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching server details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch server details' },
      { status: 500 }
    );
  }
}

// PUT /api/server-metrics/[id] - Update server name, description, category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for allowed roles (admin, manager, or technician can update server info)
    const userRole = session.user.role;
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const server = await prisma.monitoredServer.findUnique({
      where: { id },
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Server not found' },
        { status: 404 }
      );
    }

    // Update server
    const updatedServer = await prisma.monitoredServer.update({
      where: { id },
      data: {
        serverName: body.serverName !== undefined ? body.serverName : server.serverName,
        description: body.description !== undefined ? body.description : server.description,
        category: body.category !== undefined ? body.category : server.category,
        isActive: body.isActive !== undefined ? body.isActive : server.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Server updated successfully',
      data: updatedServer,
    });
  } catch (error) {
    console.error('Error updating server:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update server' },
      { status: 500 }
    );
  }
}

// DELETE /api/server-metrics/[id] - Soft delete server (set isActive to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for admin role
    const userRole = session.user.role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const server = await prisma.monitoredServer.findUnique({
      where: { id },
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Server not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.monitoredServer.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Server deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting server:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete server' },
      { status: 500 }
    );
  }
}
