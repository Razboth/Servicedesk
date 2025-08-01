import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/services - List all active services
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {
      isActive: true
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const services = await prisma.service.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        helpText: true,
        supportGroup: true,
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

    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}