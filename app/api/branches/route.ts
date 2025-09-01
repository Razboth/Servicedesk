import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const branches = await prisma.branch.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        city: true,
        province: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            atms: true
          }
        }
      }
    });

    return NextResponse.json({ branches });

  } catch (error) {
    console.error('Failed to fetch branches:', error);
    
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
        error: 'Failed to fetch branches',
        details: errorMessage 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}