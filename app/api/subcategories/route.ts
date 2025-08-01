import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSubcategorySchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  order: z.number().default(0),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = includeInactive ? {} : { isActive: true };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const subcategories = await prisma.subcategory.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            services: true,
            items: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createSubcategorySchema.parse(body);

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: validatedData.categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const subcategory = await prisma.subcategory.create({
      data: validatedData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
        _count: {
          select: {
            services: true,
            items: true,
          },
        },
      },
    });

    return NextResponse.json(subcategory, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating subcategory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}