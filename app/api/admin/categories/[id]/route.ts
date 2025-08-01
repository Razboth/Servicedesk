import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  level: z.number().min(1).max(3).optional(),
  isActive: z.boolean().optional()
});

// GET /api/admin/categories/[id] - Get specific category
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const category = await prisma.serviceCategory.findUnique({
      where: { id: params.id },
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

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateCategorySchema.parse(body);

    // Check if category exists
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { id: params.id }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // If updating name, check for duplicates
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      const duplicateCategory = await prisma.serviceCategory.findFirst({
        where: {
          name: validatedData.name,
          level: validatedData.level || existingCategory.level,
          parentId: validatedData.parentId !== undefined ? validatedData.parentId : existingCategory.parentId,
          id: { not: params.id }
        }
      });

      if (duplicateCategory) {
        return NextResponse.json(
          { error: 'Category with this name already exists at this level' },
          { status: 400 }
        );
      }
    }

    // If updating parent, verify parent exists and level relationship is correct
    if (validatedData.parentId !== undefined) {
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

        const newLevel = validatedData.level || existingCategory.level;
        if (parent.level !== newLevel - 1) {
          return NextResponse.json(
            { error: 'Invalid parent-child level relationship' },
            { status: 400 }
          );
        }
      } else {
        // Setting parent to null - only allowed for level 1
        const newLevel = validatedData.level || existingCategory.level;
        if (newLevel !== 1) {
          return NextResponse.json(
            { error: 'Only level 1 categories can have no parent' },
            { status: 400 }
          );
        }
      }
    }

    const updatedCategory = await prisma.serviceCategory.update({
      where: { id: params.id },
      data: {
        ...validatedData,
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

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    
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

// DELETE /api/admin/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if category exists
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            services: true,
            children: true
          }
        }
      }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category has associated services
    if (existingCategory._count.services > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete category with ${existingCategory._count.services} associated services. Please deactivate instead.` 
        },
        { status: 400 }
      );
    }

    // Check if category has child categories
    if (existingCategory._count.children > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete category with ${existingCategory._count.children} child categories. Please delete child categories first.` 
        },
        { status: 400 }
      );
    }

    // Delete the category
    await prisma.serviceCategory.delete({
      where: { id: params.id }
    });

    return NextResponse.json(
      { message: 'Category deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}