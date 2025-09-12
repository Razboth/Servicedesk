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

    // No additional filtering parameters needed for service categories

    // All users can see all service categories - no role-based filtering
    // Branch users (USER role) can now see and create tickets for any category
    const categories = await prisma.serviceCategory.findMany({
      where: {
        isActive: true
      },
      include: {
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            services: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Filter out categories with no active services for the ticket wizard
    const categoriesWithServices = categories.filter(cat => cat._count.services > 0);

    return NextResponse.json({ categories: categoriesWithServices });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}