import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fieldTemplate = await prisma.fieldTemplate.findUnique({
      where: { id: params.id },
      include: {
        serviceFieldTemplates: {
          include: {
            service: true
          }
        },
        _count: {
          select: {
            serviceFieldTemplates: true
          }
        }
      }
    });

    if (!fieldTemplate) {
      return NextResponse.json({ error: 'Field template not found' }, { status: 404 });
    }

    return NextResponse.json(fieldTemplate);
  } catch (error) {
    console.error('Error fetching field template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, label, type } = body;

    if (!name || !label || !type) {
      return NextResponse.json(
        { error: 'Name, label, and type are required' },
        { status: 400 }
      );
    }

    // Check if template exists
    const existing = await prisma.fieldTemplate.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Field template not found' }, { status: 404 });
    }

    // Check if name is being changed and already exists
    if (name !== existing.name) {
      const nameExists = await prisma.fieldTemplate.findFirst({
        where: {
          name,
          NOT: { id: params.id }
        }
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'Field template with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const data: any = {
      name,
      label,
      type,
      description: body.description,
      isRequired: body.isRequired || false,
      placeholder: body.placeholder,
      helpText: body.helpText,
      defaultValue: body.defaultValue,
      category: body.category,
      updatedAt: new Date()
    };

    // Handle options for select/radio/checkbox fields
    if (['SELECT', 'MULTISELECT', 'RADIO'].includes(type)) {
      if (body.options) {
        if (typeof body.options === 'string') {
          data.options = body.options.split('\n').filter((opt: string) => opt.trim());
        } else if (Array.isArray(body.options)) {
          data.options = body.options;
        } else {
          data.options = body.options;
        }
      }
    }

    // Handle validation rules
    if (body.validation) {
      data.validation = body.validation;
    }

    const fieldTemplate = await prisma.fieldTemplate.update({
      where: { id: params.id },
      data,
      include: {
        _count: {
          select: {
            serviceFieldTemplates: true
          }
        }
      }
    });

    return NextResponse.json(fieldTemplate);
  } catch (error) {
    console.error('Error updating field template:', error);
    return NextResponse.json(
      { error: 'Failed to update field template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if template is being used
    const usage = await prisma.serviceFieldTemplate.count({
      where: { fieldTemplateId: params.id }
    });

    if (usage > 0) {
      return NextResponse.json(
        { error: 'Cannot delete field template that is in use by services' },
        { status: 400 }
      );
    }

    await prisma.fieldTemplate.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Field template deleted successfully' });
  } catch (error) {
    console.error('Error deleting field template:', error);
    return NextResponse.json(
      { error: 'Failed to delete field template' },
      { status: 500 }
    );
  }
}