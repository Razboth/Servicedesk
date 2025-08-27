import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/services/[id] - Get specific service by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await prisma.service.findFirst({
      where: { 
        id: id,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        description: true,
        helpText: true,
        category: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        supportGroup: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        priority: true,
        estimatedHours: true,
        slaHours: true,
        requiresApproval: true,
        isActive: true,
        defaultTitle: true,
        defaultItilCategory: true,
        defaultIssueClassification: true,
        tier1CategoryId: true,
        tier2SubcategoryId: true,
        tier3ItemId: true,
        fields: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            label: true,
            type: true,
            placeholder: true,
            helpText: true,
            isRequired: true,
            isUserVisible: true,
            defaultValue: true,
            options: true,
            validation: true,
            order: true
          },
          orderBy: { order: 'asc' }
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
                helpText: true,
                defaultValue: true,
                options: true,
                validation: true,
                category: true
              }
            }
          }
        }
      }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}