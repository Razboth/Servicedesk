import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUnlockTime } from '@/lib/time-lock';

// GET - List all templates
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and manager can view templates
    if (!['ADMIN', 'MANAGER_IT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const templates = await prisma.serverAccessChecklistTemplate.findMany({
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil templates' },
      { status: 500 }
    );
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create templates
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, category, order, isRequired, unlockTime } = body;

    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title dan category wajib diisi' },
        { status: 400 }
      );
    }

    // Validate unlock time format if provided
    if (unlockTime && !isValidUnlockTime(unlockTime)) {
      return NextResponse.json(
        { error: 'Format unlockTime tidak valid. Gunakan format HH:mm' },
        { status: 400 }
      );
    }

    const template = await prisma.serverAccessChecklistTemplate.create({
      data: {
        title,
        description,
        category,
        order: order ?? 0,
        isRequired: isRequired ?? true,
        unlockTime,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Gagal membuat template' },
      { status: 500 }
    );
  }
}

// PUT - Update a template
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can update templates
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, description, category, order, isRequired, isActive, unlockTime } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID wajib diisi' },
        { status: 400 }
      );
    }

    // Validate unlock time format if provided
    if (unlockTime && !isValidUnlockTime(unlockTime)) {
      return NextResponse.json(
        { error: 'Format unlockTime tidak valid. Gunakan format HH:mm' },
        { status: 400 }
      );
    }

    const template = await prisma.serverAccessChecklistTemplate.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(order !== undefined && { order }),
        ...(isRequired !== undefined && { isRequired }),
        ...(isActive !== undefined && { isActive }),
        ...(unlockTime !== undefined && { unlockTime }),
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui template' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate a template (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete templates
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID wajib diisi' },
        { status: 400 }
      );
    }

    // Soft delete - set isActive to false
    const template = await prisma.serverAccessChecklistTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ template, message: 'Template dinonaktifkan' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus template' },
      { status: 500 }
    );
  }
}
