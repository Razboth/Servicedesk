import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 401 }
      );
    }

    const { id: userId } = await params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, loginAttempts: true, lockedAt: true }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Unlock the user account by resetting login attempts and clearing lockout timestamp
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        loginAttempts: true,
        lockedAt: true,
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        entity: 'User',
        entityId: userId,
        action: 'UNLOCK_USER',
        newValues: {
          description: `Unlocked user account: ${existingUser.name} (${existingUser.email})`
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    });

    return NextResponse.json({
      message: 'User account unlocked successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Failed to unlock user:', error);
    
    // Check if it's a database connection error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('P1001') || errorMessage.includes('connect')) {
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please ensure PostgreSQL is running on localhost:5432',
          details: errorMessage
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to unlock user account',
        details: errorMessage
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}