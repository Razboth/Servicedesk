import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

// GET /api/admin/import/history - Get import history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filter
    const where: any = {};
    if (entityType) {
      where.entityType = entityType;
    }
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.importLog.count({ where });

    // Get import logs with pagination
    const logs = await prisma.importLog.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Transform for response
    const importLogs = logs.map(log => ({
      id: log.id,
      entityType: log.entityType,
      importMode: log.importMode,
      fileName: log.fileName,
      fileSize: log.fileSize,
      totalRows: log.totalRows,
      processedRows: log.processedRows,
      createdRows: log.createdRows,
      updatedRows: log.updatedRows,
      skippedRows: log.skippedRows,
      errorRows: log.errorRows,
      status: log.status,
      errors: log.errors,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      createdAt: log.createdAt,
      createdBy: log.createdBy
    }));

    return NextResponse.json({
      success: true,
      logs: importLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Import history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/import/history - Clear old import logs
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysOld = parseInt(searchParams.get('daysOld') || '30');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await prisma.importLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.count} import logs older than ${daysOld} days`
    });

  } catch (error) {
    console.error('Clear import history error:', error);
    return NextResponse.json(
      { error: 'Failed to clear import history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
