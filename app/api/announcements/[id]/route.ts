import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get single announcement
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updater: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        _count: {
          select: {
            views: true
          }
        }
      }
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Check if user has viewed it
    const view = await prisma.announcementView.findUnique({
      where: {
        announcementId_userId: {
          announcementId: params.id,
          userId: session.user.id
        }
      }
    });

    return NextResponse.json({
      ...announcement,
      isViewed: !!view
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcement' },
      { status: 500 }
    );
  }
}

// Update announcement (Admin/Super Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string)) {
      return NextResponse.json(
        { error: 'Only administrators can update announcements' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { title, content, type, priority, startDate, endDate, isActive, isGlobal, branchIds, images } = data;

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Update announcement
    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data: {
        title,
        content,
        type,
        priority,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isActive,
        isGlobal: isGlobal !== undefined ? isGlobal : undefined,
        updatedBy: session.user.id
      },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updater: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      }
    });

    // Handle branch assignments if provided
    if (branchIds !== undefined) {
      // Delete existing branch assignments
      await prisma.announcementBranch.deleteMany({
        where: { announcementId: params.id }
      });

      // Create new branch assignments
      if (branchIds.length > 0 && !isGlobal) {
        await prisma.announcementBranch.createMany({
          data: branchIds.map((branchId: string) => ({
            announcementId: params.id,
            branchId
          }))
        });
      }
    }

    // Handle images if provided
    if (images !== undefined) {
      // Delete existing images
      await prisma.announcementImage.deleteMany({
        where: { announcementId: params.id }
      });

      // Create new images
      if (images.length > 0) {
        await prisma.announcementImage.createMany({
          data: images.map((img: any, index: number) => ({
            announcementId: params.id,
            filename: img.filename,
            originalName: img.originalName,
            mimeType: img.mimeType,
            size: img.size,
            path: img.path,
            caption: img.caption,
            order: index
          }))
        });
      }
    }

    return NextResponse.json(announcement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 }
    );
  }
}

// Delete announcement (Admin/Super Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string)) {
      return NextResponse.json(
        { error: 'Only administrators can delete announcements' },
        { status: 403 }
      );
    }

    await prisma.announcement.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 }
    );
  }
}