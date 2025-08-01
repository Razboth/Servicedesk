import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  parentId: z.string().optional(),
  level: z.number().min(1).max(3)
});

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  level: z.number().min(1).max(3).optional(),
  isActive: z.boolean().optional()
});

// GET /api/admin/categories - Get all categories with admin details
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const categories = await prisma.serviceCategory.findMany({
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            level: true,
            isActive: true
          },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            services: true,
            children: true
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    // Check if category name already exists at the same level
    const existingCategory = await prisma.serviceCategory.findFirst({
      where: {
        name: validatedData.name,
        level: validatedData.level,
        parentId: validatedData.parentId || null
      }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists at this level' },
        { status: 400 }
      );
    }

    // If parentId is provided, verify parent exists and level is correct
    if (validatedData.parentId) {
      const parent = await prisma.serviceCategory.findUnique({
        where: { id: validatedData.parentId }
      });

      if (!parent) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        );
      }

      if (parent.level !== validatedData.level - 1) {
        return NextResponse.json(
          { error: 'Invalid parent-child level relationship' },
          { status: 400 }
        );
      }
    } else if (validatedData.level !== 1) {
      return NextResponse.json(
        { error: 'Only level 1 categories can have no parent' },
        { status: 400 }
      );
    }

    const category = await prisma.serviceCategory.create({
      data: {
        ...validatedData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            level: true,
            isActive: true
          },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            services: true,
            children: true
          }
        }
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}