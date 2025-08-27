import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supportGroup = await prisma.supportGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            services: true,
            tickets: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          },
          take: 10
        }
      }
    });

    if (!supportGroup) {
      return NextResponse.json(
        { error: 'Support group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(supportGroup);
  } catch (error) {
    console.error('Error fetching support group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support group' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    // Get current support group
    const currentGroup = await prisma.supportGroup.findUnique({
      where: { id }
    });

    if (!currentGroup) {
      return NextResponse.json(
        { error: 'Support group not found' },
        { status: 404 }
      );
    }

    // Update support group
    const supportGroup = await prisma.supportGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive })
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'SupportGroup',
        entityId: supportGroup.id,
        oldValues: currentGroup,
        newValues: supportGroup,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    });

    return NextResponse.json(supportGroup);
  } catch (error) {
    console.error('Error updating support group:', error);
    return NextResponse.json(
      { error: 'Failed to update support group' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if support group has any active assignments
    const group = await prisma.supportGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            services: true,
            tickets: true
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Support group not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if there are active assignments
    if (group._count.users > 0 || group._count.services > 0 || group._count.tickets > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete support group with active assignments',
          details: {
            users: group._count.users,
            services: group._count.services,
            tickets: group._count.tickets
          }
        },
        { status: 400 }
      );
    }

    // Soft delete by marking as inactive
    const supportGroup = await prisma.supportGroup.update({
      where: { id },
      data: { isActive: false }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'SupportGroup',
        entityId: supportGroup.id,
        oldValues: group,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting support group:', error);
    return NextResponse.json(
      { error: 'Failed to delete support group' },
      { status: 500 }
    );
  }
}