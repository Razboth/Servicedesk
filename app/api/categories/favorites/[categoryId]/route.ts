import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/categories/favorites/[categoryId] - Remove category from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId } = params;

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if favorited by this user
    const favorite = await prisma.userFavoriteCategory.findUnique({
      where: {
        userId_categoryId: {
          userId: session.user.id,
          categoryId: categoryId
        }
      }
    });

    if (!favorite) {
      return NextResponse.json(
        { error: 'Category not in favorites' },
        { status: 404 }
      );
    }

    // Remove from favorites
    await prisma.userFavoriteCategory.delete({
      where: {
        userId_categoryId: {
          userId: session.user.id,
          categoryId: categoryId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing favorite category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}