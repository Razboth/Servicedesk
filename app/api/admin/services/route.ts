import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createServiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  helpText: z.string().optional(),
  categoryId: z.string().optional(), // Made optional since we use 3-tier categories
  subcategoryId: z.string().optional(),
  itemId: z.string().optional(),
  tier1CategoryId: z.string().min(1, 'Tier 1 Category is required'), // Made required
  tier2SubcategoryId: z.string().optional(),
  tier3ItemId: z.string().optional(),
  supportGroupId: z.string().min(1, 'Support group is required'), // Changed to supportGroupId
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY']),
  estimatedHours: z.number().min(1).optional(),
  slaHours: z.number().min(1),
  requiresApproval: z.boolean().default(true),
  isConfidential: z.boolean().default(false),
  defaultTitle: z.string().optional(),
  defaultItilCategory: z.enum(['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST']).optional(),
  defaultIssueClassification: z.enum([
    'HUMAN_ERROR',
    'SYSTEM_ERROR',
    'HARDWARE_FAILURE',
    'NETWORK_ISSUE',
    'SECURITY_INCIDENT',
    'DATA_ISSUE',
    'PROCESS_GAP',
    'EXTERNAL_FACTOR'
  ]).optional()
});

// GET /api/admin/services - Get all services with admin details
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      // First, check for services without support groups
      const servicesWithoutGroup = await prisma.service.count({
        where: {
          supportGroupId: null
        }
      });

      if (servicesWithoutGroup > 0) {
        console.log(`Found ${servicesWithoutGroup} services without support group, assigning default...`);
        
        // Find default support group
        const defaultGroup = await prisma.supportGroup.findFirst({
          where: {
            code: 'IT_HELPDESK'
          }
        });

        if (defaultGroup) {
          // Update services without support group
          await prisma.service.updateMany({
            where: {
              supportGroupId: null
            },
            data: {
              supportGroupId: defaultGroup.id
            }
          });
          console.log('Updated services with default support group');
        }
      }
    } catch (updateError) {
      console.error('Error updating services with support group:', updateError);
      // Continue even if update fails
    }

    // Try simpler query first
    let services;
    try {
      services = await prisma.service.findMany({
        include: {
          category: true,
          supportGroup: true,
          fields: {
            orderBy: {
              order: 'asc'
            }
          },
          _count: {
            select: {
              tickets: true,
              fieldTemplates: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });
    } catch (queryError: any) {
      console.error('Error with full query, trying simpler query:', queryError);
      // Fallback to simpler query without serviceFieldTemplates count
      services = await prisma.service.findMany({
        include: {
          category: true,
          supportGroup: true,
          _count: {
            select: {
              tickets: true,
              fieldTemplates: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });
    }

    return NextResponse.json(services);
  } catch (error: any) {
    console.error('Error fetching services:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message || 'Unknown error',
        type: error.constructor.name
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/services - Create new service
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
    const validatedData = createServiceSchema.parse(body);

    // Check if service name already exists
    const existingService = await prisma.service.findFirst({
      where: {
        name: validatedData.name
      }
    });

    if (existingService) {
      return NextResponse.json(
        { error: 'Service with this name already exists' },
        { status: 400 }
      );
    }

    // Verify tier1Category exists if provided
    if (validatedData.tier1CategoryId) {
      const tier1Category = await prisma.category.findUnique({
        where: { id: validatedData.tier1CategoryId }
      });

      if (!tier1Category) {
        return NextResponse.json(
          { error: 'Invalid Tier 1 category' },
          { status: 400 }
        );
      }
    }

    // Verify tier2Subcategory exists if provided
    if (validatedData.tier2SubcategoryId) {
      const tier2Subcategory = await prisma.subcategory.findUnique({
        where: { id: validatedData.tier2SubcategoryId }
      });

      if (!tier2Subcategory) {
        return NextResponse.json(
          { error: 'Invalid Tier 2 subcategory' },
          { status: 400 }
        );
      }
    }

    // Verify tier3Item exists if provided
    if (validatedData.tier3ItemId) {
      const tier3Item = await prisma.item.findUnique({
        where: { id: validatedData.tier3ItemId }
      });

      if (!tier3Item) {
        return NextResponse.json(
          { error: 'Invalid Tier 3 item' },
          { status: 400 }
        );
      }
    }

    // Find or create a default service category if categoryId is not provided
    let finalCategoryId = validatedData.categoryId;
    
    if (!finalCategoryId) {
      // Try to find a default category
      const defaultCategory = await prisma.serviceCategory.findFirst({
        where: {
          isActive: true,
          level: 1
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      if (defaultCategory) {
        finalCategoryId = defaultCategory.id;
      } else {
        // Create a default category if none exists
        const newDefaultCategory = await prisma.serviceCategory.create({
          data: {
            name: 'General',
            description: 'General service category',
            level: 1,
            isActive: true
          }
        });
        finalCategoryId = newDefaultCategory.id;
      }
    }

    // Create the service
    const service = await prisma.service.create({
      data: {
        ...validatedData,
        categoryId: finalCategoryId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        category: true,
        supportGroup: true,
        fields: {
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: {
            tickets: true
          }
        }
      }
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    
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