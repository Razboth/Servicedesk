import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/user/profile - Get current user's profile with branch info
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        branchId: true,
        createdAt: true,
        lastActivity: true,
        emailNotifyOnTicketCreated: true,
        emailNotifyOnTicketAssigned: true,
        emailNotifyOnTicketUpdated: true,
        emailNotifyOnTicketResolved: true,
        emailNotifyOnComment: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        supportGroupId: true,
        supportGroup: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      avatar,
      emailNotifyOnTicketCreated,
      emailNotifyOnTicketAssigned,
      emailNotifyOnTicketUpdated,
      emailNotifyOnTicketResolved,
      emailNotifyOnComment
    } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    if (email !== session.user.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email,
          id: { not: session.user.id }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email is already taken' },
          { status: 400 }
        );
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        avatar: avatar || null,
        emailNotifyOnTicketCreated: emailNotifyOnTicketCreated !== undefined ? emailNotifyOnTicketCreated : undefined,
        emailNotifyOnTicketAssigned: emailNotifyOnTicketAssigned !== undefined ? emailNotifyOnTicketAssigned : undefined,
        emailNotifyOnTicketUpdated: emailNotifyOnTicketUpdated !== undefined ? emailNotifyOnTicketUpdated : undefined,
        emailNotifyOnTicketResolved: emailNotifyOnTicketResolved !== undefined ? emailNotifyOnTicketResolved : undefined,
        emailNotifyOnComment: emailNotifyOnComment !== undefined ? emailNotifyOnComment : undefined
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        supportGroupId: true,
        supportGroup: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}