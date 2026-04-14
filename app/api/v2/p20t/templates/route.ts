import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { P20TCategory } from '@prisma/client';

// GET /api/v2/p20t/templates - List all templates (optionally by category)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as P20TCategory | null;

    const where = category ? { category } : {};

    const templates = await prisma.p20TChecklistTemplate.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { section: 'asc' },
        { orderIndex: 'asc' },
      ],
    });

    // Group by category and section
    const grouped = templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = {};
      }
      if (!acc[template.category][template.section]) {
        acc[template.category][template.section] = [];
      }
      acc[template.category][template.section].push(template);
      return acc;
    }, {} as Record<string, Record<string, typeof templates>>);

    return NextResponse.json({
      success: true,
      data: {
        templates,
        grouped,
      },
    });
  } catch (error) {
    console.error('Error fetching P20T templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v2/p20t/templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { category, section, title, description, inputType } = body;

    if (!category || !section || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get max orderIndex for this category/section
    const maxOrder = await prisma.p20TChecklistTemplate.aggregate({
      where: { category, section },
      _max: { orderIndex: true },
    });

    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    const template = await prisma.p20TChecklistTemplate.create({
      data: {
        category,
        section,
        orderIndex,
        title,
        description: description || null,
        inputType: inputType || 'CHECKBOX',
      },
    });

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error creating P20T template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
