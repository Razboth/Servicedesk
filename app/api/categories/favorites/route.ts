import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/categories/favorites - Get user's favorite categories
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const favoriteCategories = await prisma.userFavoriteCategory.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            level: true,
            _count: {
              select: {
                services: {
                  where: { isActive: true }
                }
              }
            }
          }
        }
      }
    });

    // Transform the response to include the category data directly
    const result = favoriteCategories.map(fav => ({
      id: fav.id,
      order: fav.order,
      createdAt: fav.createdAt,
      category: fav.category
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching favorite categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/categories/favorites - Add category to favorites
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId } = await request.json();

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const category = await prisma.serviceCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if already favorited
    const existing = await prisma.userFavoriteCategory.findUnique({
      where: {
        userId_categoryId: {
          userId: session.user.id,
          categoryId: categoryId
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Category already in favorites' },
        { status: 409 }
      );
    }

    // Get the highest order for user's favorites to append at the end
    const maxOrder = await prisma.userFavoriteCategory.aggregate({
      where: { userId: session.user.id },
      _max: { order: true }
    });

    const newOrder = (maxOrder._max.order || 0) + 1;

    // Add to favorites
    const favoriteCategory = await prisma.userFavoriteCategory.create({
      data: {
        userId: session.user.id,
        categoryId: categoryId,
        order: newOrder
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            level: true,
            _count: {
              select: {
                services: {
                  where: { isActive: true }
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      id: favoriteCategory.id,
      order: favoriteCategory.order,
      createdAt: favoriteCategory.createdAt,
      category: favoriteCategory.category
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding favorite category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}