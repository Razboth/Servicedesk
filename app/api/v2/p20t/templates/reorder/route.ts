import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v2/p20t/templates/reorder - Reorder templates
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
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items must be an array' }, { status: 400 });
    }

    // Update orderIndex for each template
    await prisma.$transaction(
      items.map((item: { id: string; orderIndex: number }) =>
        prisma.p20TChecklistTemplate.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Templates reordered',
    });
  } catch (error) {
    console.error('Error reordering P20T templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
