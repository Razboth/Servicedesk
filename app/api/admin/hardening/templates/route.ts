import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// GET /api/admin/hardening/templates - Get all hardening templates
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const osType = searchParams.get('osType');

    const where: any = {};
    if (isActive !== null) where.isActive = isActive === 'true';
    if (osType) where.osType = { contains: osType, mode: 'insensitive' };

    const templates = await prisma.hardeningTemplate.findMany({
      where,
      include: {
        checklistItems: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            hardeningChecklists: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching hardening templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hardening templates' },
      { status: 500 }
    );
  }
}

// POST /api/admin/hardening/templates - Create a new hardening template
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || !body.osType) {
      return NextResponse.json(
        { error: 'Missing required fields: name and osType' },
        { status: 400 }
      );
    }

    // Check for duplicate template name
    const existing = await prisma.hardeningTemplate.findUnique({
      where: { name: body.name }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Template with this name already exists' },
        { status: 400 }
      );
    }

    // Create template with checklist items
    const template = await prisma.hardeningTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        osType: body.osType,
        version: body.version || '1.0',
        isActive: true,
        checklistItems: {
          create: body.checklistItems?.map((item: any, index: number) => ({
            category: item.category,
            itemCode: item.itemCode,
            title: item.title,
            description: item.description,
            isRequired: item.isRequired !== false,
            order: item.order || index,
            verificationSteps: item.verificationSteps,
            remediationSteps: item.remediationSteps
          })) || []
        }
      },
      include: {
        checklistItems: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'HARDENING_TEMPLATE',
        entityId: template.id,
        details: `Created hardening template: ${template.name}`,
        userId: session.user.id,
        metadata: {
          osType: template.osType,
          itemCount: template.checklistItems.length
        }
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating hardening template:', error);
    return NextResponse.json(
      { error: 'Failed to create hardening template' },
      { status: 500 }
    );
  }
}