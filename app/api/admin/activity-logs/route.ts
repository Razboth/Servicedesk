import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const exportFormat = searchParams.get('export'); // csv or xlsx
    const page = parseInt(searchParams.get('page') || '1');
    const limit = exportFormat ? 10000 : parseInt(searchParams.get('limit') || '50'); // Higher limit for export
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');
    const days = parseInt(searchParams.get('days') || '7');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause
    const where: any = {
      createdAt: { gte: startDate }
    };

    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entity) where.entity = entity;

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Get total count for pagination
    const total = await prisma.auditLog.count({ where });

    // Get audit logs with user details
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            branch: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // Handle export if requested
    if (exportFormat) {
      const exportData = logs.map(log => ({
        'Waktu': new Date(log.createdAt).toLocaleString('id-ID'),
        'User': log.user?.name || '-',
        'Email': log.user?.email || '-',
        'Role': log.user?.role || '-',
        'Cabang': log.user?.branch?.name || '-',
        'Aksi': log.action,
        'Entitas': log.entity,
        'ID Entitas': log.entityId || '-',
        'Alamat IP': log.ipAddress || '-',
        'Browser': log.userAgent?.substring(0, 50) || '-'
      }));

      if (exportFormat === 'csv') {
        const headers = Object.keys(exportData[0] || {});
        const csvRows = [
          headers.join(','),
          ...exportData.map(row =>
            headers.map(h => {
              const value = row[h as keyof typeof row];
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }).join(',')
          )
        ];
        const csvContent = csvRows.join('\n');

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
      }

      if (exportFormat === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Logs');

        // Set column widths
        worksheet['!cols'] = [
          { wch: 20 }, // Waktu
          { wch: 25 }, // User
          { wch: 30 }, // Email
          { wch: 15 }, // Role
          { wch: 20 }, // Cabang
          { wch: 25 }, // Aksi
          { wch: 15 }, // Entitas
          { wch: 25 }, // ID Entitas
          { wch: 15 }, // Alamat IP
          { wch: 30 }, // Browser
        ];

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString().split('T')[0]}.xlsx"`
          }
        });
      }
    }

    // Get action statistics
    const actionStats = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: {
        action: true
      },
      orderBy: {
        _count: {
          action: 'desc'
        }
      },
      take: 10
    });

    // Get entity statistics
    const entityStats = await prisma.auditLog.groupBy({
      by: ['entity'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: {
        entity: true
      },
      orderBy: {
        _count: {
          entity: 'desc'
        }
      },
      take: 10
    });

    // Get most active users
    const activeUsers = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: startDate },
        userId: { not: null }
      },
      _count: {
        userId: true
      },
      orderBy: {
        _count: {
          userId: 'desc'
        }
      },
      take: 10
    });

    // Fetch user details for active users
    const userIds = activeUsers.map(u => u.userId).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    const activeUsersWithDetails = activeUsers.map(stat => ({
      user: userMap.get(stat.userId!),
      count: stat._count.userId
    })).filter(item => item.user);

    return NextResponse.json({
      logs,
      stats: {
        total,
        actionStats: actionStats.map(s => ({
          action: s.action,
          count: s._count.action
        })),
        entityStats: entityStats.map(s => ({
          entity: s.entity,
          count: s._count.entity
        })),
        activeUsers: activeUsersWithDetails
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}