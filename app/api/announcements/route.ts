import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get announcements - admin gets all, regular users get filtered
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this is an admin request (for admin panel)
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string);
    const url = new URL(request.url);
    const adminView = url.searchParams.get('admin') === 'true';

    const now = new Date();

    // Get user's branch if they're not an admin
    const user = !isAdmin ? await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true }
    }) : null;

    // Build where clause based on user type
    let whereClause: any = {};

    if (adminView && isAdmin) {
      // Admin view - get all announcements
      whereClause = {};
    } else {
      // Regular user view - filter by active, date range, and branch
      whereClause = {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { isGlobal: true },
          user?.branchId ? {
            branches: {
              some: {
                branchId: user.branchId
              }
            }
          } : undefined
        ].filter(Boolean)
      };
    }

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
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
      },
      orderBy: adminView ?
        { createdAt: 'desc' } :
        [{ priority: 'desc' }, { createdAt: 'desc' }]
    });

    // Track views for user
    const viewedIds = await prisma.announcementView.findMany({
      where: {
        userId: session.user.id,
        announcementId: { in: announcements.map(a => a.id) }
      },
      select: { announcementId: true }
    });

    const viewedSet = new Set(viewedIds.map(v => v.announcementId));

    // Track new views
    const unviewedAnnouncements = announcements.filter(a => !viewedSet.has(a.id));
    if (unviewedAnnouncements.length > 0) {
      await prisma.announcementView.createMany({
        data: unviewedAnnouncements.map(a => ({
          announcementId: a.id,
          userId: session.user.id
        })),
        skipDuplicates: true
      });
    }

    const response = announcements.map(a => ({
      ...a,
      isViewed: viewedSet.has(a.id)
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

// Create announcement (Admin/Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string)) {
      return NextResponse.json(
        { error: 'Only administrators can create announcements' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { title, content, type, priority, startDate, endDate, isGlobal, branchIds, images } = data;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Create announcement with images and branch assignments
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type: type || 'GENERAL',
        priority: priority || 'NORMAL',
        startDate: start,
        endDate: end,
        isGlobal: isGlobal ?? true,
        createdBy: session.user.id,
        images: images?.length > 0 ? {
          create: images.map((img: any, index: number) => ({
            filename: img.filename,
            originalName: img.originalName,
            mimeType: img.mimeType,
            size: img.size,
            path: img.path,
            caption: img.caption,
            order: index
          }))
        } : undefined,
        branches: branchIds?.length > 0 ? {
          create: branchIds.map((branchId: string) => ({
            branchId
          }))
        } : undefined
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

    return NextResponse.json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    );
  }
}