import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/services/favorites - Get user's favorite services
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const favorites = await prisma.userFavoriteService.findMany({
      where: { userId: session.user.id },
      include: {
        service: {
          include: {
            category: {
              select: { id: true, name: true, level: true }
            },
            _count: {
              select: {
                usage: {
                  where: { userId: session.user.id }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { order: 'asc' },
        { lastUsedAt: 'desc' }
      ]
    });

    const transformedFavorites = favorites.map(favorite => ({
      id: favorite.id,
      service: {
        ...favorite.service,
        usageCount: favorite.service._count.usage
      },
      lastUsedAt: favorite.lastUsedAt,
      isPinned: favorite.isPinned,
      order: favorite.order,
      createdAt: favorite.createdAt
    }));

    return NextResponse.json(transformedFavorites);
  } catch (error) {
    console.error('Error fetching favorite services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/services/favorites - Add service to favorites
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serviceId, isPinned = false } = await request.json();

    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    // Check if service exists and is active
    const service = await prisma.service.findFirst({
      where: { id: serviceId, isActive: true }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Check if already favorited
    const existingFavorite = await prisma.userFavoriteService.findFirst({
      where: {
        userId: session.user.id,
        serviceId: serviceId
      }
    });

    if (existingFavorite) {
      return NextResponse.json({ error: 'Service already in favorites' }, { status: 409 });
    }

    // Get next order number
    const maxOrder = await prisma.userFavoriteService.aggregate({
      where: { userId: session.user.id },
      _max: { order: true }
    });

    const newOrder = (maxOrder._max.order || 0) + 1;

    // Create favorite
    const favorite = await prisma.userFavoriteService.create({
      data: {
        userId: session.user.id,
        serviceId: serviceId,
        isPinned: isPinned,
        order: newOrder
      },
      include: {
        service: {
          include: {
            category: {
              select: { id: true, name: true, level: true }
            }
          }
        }
      }
    });

    return NextResponse.json(favorite, { status: 201 });
  } catch (error) {
    console.error('Error adding favorite service:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/services/favorites - Update favorite (pin/unpin, reorder)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { favoriteId, isPinned, order, serviceId } = await request.json();

    if (!favoriteId && !serviceId) {
      return NextResponse.json({ error: 'Favorite ID or Service ID is required' }, { status: 400 });
    }

    // Find favorite by ID or by serviceId
    const where = favoriteId 
      ? { id: favoriteId, userId: session.user.id }
      : { userId: session.user.id, serviceId: serviceId };

    const existingFavorite = await prisma.userFavoriteService.findFirst({ where });

    if (!existingFavorite) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    // Update favorite
    const updateData: any = { lastUsedAt: new Date() };
    
    if (typeof isPinned === 'boolean') {
      updateData.isPinned = isPinned;
    }
    
    if (typeof order === 'number') {
      updateData.order = order;
    }

    const updatedFavorite = await prisma.userFavoriteService.update({
      where: { id: existingFavorite.id },
      data: updateData,
      include: {
        service: {
          include: {
            category: {
              select: { id: true, name: true, level: true }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedFavorite);
  } catch (error) {
    console.error('Error updating favorite service:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/services/favorites - Remove service from favorites
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const favoriteId = searchParams.get('favoriteId');
    const serviceId = searchParams.get('serviceId');

    if (!favoriteId && !serviceId) {
      return NextResponse.json({ error: 'Favorite ID or Service ID is required' }, { status: 400 });
    }

    // Find and delete favorite
    const where = favoriteId 
      ? { id: favoriteId, userId: session.user.id }
      : { userId: session.user.id, serviceId: serviceId! };

    const existingFavorite = await prisma.userFavoriteService.findFirst({ where });

    if (!existingFavorite) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    await prisma.userFavoriteService.delete({
      where: { id: existingFavorite.id }
    });

    return NextResponse.json({ message: 'Favorite removed successfully' });
  } catch (error) {
    console.error('Error removing favorite service:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}