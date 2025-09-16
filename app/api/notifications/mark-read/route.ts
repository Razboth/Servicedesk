import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      // Mark all notifications as read for the user
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'All notifications marked as read' 
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `${notificationIds.length} notifications marked as read` 
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid request: provide notificationIds array or markAll flag' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}