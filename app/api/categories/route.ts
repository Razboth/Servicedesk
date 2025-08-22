import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/categories - List service categories
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const parentId = searchParams.get('parentId');
    const includeChildren = searchParams.get('includeChildren') === 'true';

    // Build where clause
    const where: any = {
      isActive: true
    };

    if (level) {
      where.level = parseInt(level);
    }

    if (parentId) {
      where.parentId = parentId;
    } else if (parentId === null) {
      where.parentId = null;
    }

    // For Knowledge Base, return the 3-tier Category structure
    const categories = await prisma.category.findMany({
      where: {
        isActive: true
      },
      include: {
        subcategories: {
          where: { isActive: true },
          include: {
            items: {
              where: { isActive: true },
              orderBy: { name: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}