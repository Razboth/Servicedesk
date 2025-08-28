import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/services - List all active services
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    console.log('Services API - Session:', session);
    
    if (!session?.user?.id) {
      console.log('Services API - No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {
      isActive: true
    };

    if (categoryId && search) {
      // When both categoryId and search are provided, combine the filters
      where.AND = [
        {
          OR: [
            { categoryId: categoryId },
            { tier1CategoryId: categoryId }
          ]
        },
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    } else if (categoryId) {
      // Check if this is a tier1CategoryId (for the 3-tier system)
      // Services can be filtered by either categoryId (old system) or tier1CategoryId (new system)
      where.OR = [
        { categoryId: categoryId },
        { tier1CategoryId: categoryId }
      ];
    } else if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    let services;
    
    try {
      // Try to fetch with field templates
      services = await prisma.service.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          helpText: true,
          supportGroup: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true
            }
          },
          priority: true,
          estimatedHours: true,
          slaHours: true,
          requiresApproval: true,
          isConfidential: true,
          defaultTitle: true,
          defaultItilCategory: true,
          defaultIssueClassification: true,
          tier1CategoryId: true,
          tier2SubcategoryId: true,
          tier3ItemId: true,
          category: {
            select: {
              id: true,
              name: true,
              level: true
            }
          },
          fields: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              name: true,
              label: true,
              type: true,
              isRequired: true,
              isUserVisible: true,
              placeholder: true,
              helpText: true,
              defaultValue: true,
              options: true,
              validation: true,
              order: true
            }
          },
          fieldTemplates: {
            orderBy: { order: 'asc' },
            where: {
              isUserVisible: true
            },
            select: {
              id: true,
              order: true,
              isRequired: true,
              isUserVisible: true,
              helpText: true,
              defaultValue: true,
              fieldTemplate: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                  type: true,
                  placeholder: true,
                  options: true,
                  validation: true,
                  category: true
                }
              }
            }
          },
          _count: {
            select: {
              tickets: true
            }
          }
        },
        orderBy: [
          { category: { name: 'asc' } },
          { name: 'asc' }
        ]
      });
    } catch (error: any) {
      // If fieldTemplates relation doesn't exist, fetch without it
      console.log('Field templates not available, fetching without them');
      services = await prisma.service.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          helpText: true,
          supportGroup: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true
            }
          },
          priority: true,
          estimatedHours: true,
          slaHours: true,
          requiresApproval: true,
          isConfidential: true,
          defaultTitle: true,
          defaultItilCategory: true,
          defaultIssueClassification: true,
          tier1CategoryId: true,
          tier2SubcategoryId: true,
          tier3ItemId: true,
          category: {
            select: {
              id: true,
              name: true,
              level: true
            }
          },
          fields: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              name: true,
              label: true,
              type: true,
              isRequired: true,
              isUserVisible: true,
              placeholder: true,
              helpText: true,
              defaultValue: true,
              options: true,
              validation: true,
              order: true
            }
          },
          _count: {
            select: {
              tickets: true
            }
          }
        },
        orderBy: [
          { category: { name: 'asc' } },
          { name: 'asc' }
        ]
      });
    }

    console.log(`Services API - Returning ${services.length} services`);
    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}