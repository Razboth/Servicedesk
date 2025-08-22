import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/services/recent - Get recently used services by the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15');

    // First get the most recent usage records for this user
    const recentUsage = await prisma.serviceUsage.findMany({
      where: { userId: session.user.id },
      orderBy: { usedAt: 'desc' },
      select: {
        serviceId: true,
        usedAt: true,
        ticketId: true
      },
      distinct: ['serviceId'],
      take: limit
    });

    console.log('🕒 Recent usage records found:', recentUsage.length);

    if (recentUsage.length === 0) {
      return NextResponse.json([]);
    }

    // Get the service details for these recently used services
    const serviceIds = recentUsage.map(usage => usage.serviceId);
    
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        helpText: true,
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
        isActive: true,
        categoryId: true,
        category: {
          select: { id: true, name: true, level: true }
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
                helpText: true,
                defaultValue: true,
                options: true,
                validation: true,
                category: true
              }
            }
          }
        },
        _count: {
          select: {
            usage: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    });

    console.log('🕒 Services found:', services.length);

    // Transform the results to include usage information and maintain order
    const transformedServices = recentUsage.map(usage => {
      const service = services.find(s => s.id === usage.serviceId);
      if (!service) return null;
      
      return {
        ...service,
        usageCount: service._count.usage,
        lastUsed: usage.usedAt,
        lastTicketId: usage.ticketId,
        category: 'recently-used'
      };
    }).filter(Boolean);

    console.log('🕒 Transformed services:', transformedServices.length);

    return NextResponse.json(transformedServices);
  } catch (error) {
    console.error('Error fetching recent services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}