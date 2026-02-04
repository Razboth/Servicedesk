import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUnlockTime } from '@/lib/time-lock';
import { DailyChecklistType, ServerChecklistCategory } from '@prisma/client';

// Valid values for validation
const VALID_CATEGORIES: ServerChecklistCategory[] = [
  'BACKUP_VERIFICATION',
  'SERVER_HEALTH',
  'SECURITY_CHECK',
  'MAINTENANCE',
];

const VALID_CHECKLIST_TYPES: DailyChecklistType[] = [
  'HARIAN',
  'SERVER_SIANG',
  'SERVER_MALAM',
  'AKHIR_HARI',
];

// GET - List/Export templates
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and manager can view templates
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER_IT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const checklistType = searchParams.get('type') as DailyChecklistType | null;
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    // Build where clause
    const whereClause: {
      checklistType?: DailyChecklistType;
      isActive?: boolean;
    } = {};

    if (checklistType && VALID_CHECKLIST_TYPES.includes(checklistType)) {
      whereClause.checklistType = checklistType;
    }

    if (activeOnly) {
      whereClause.isActive = true;
    }

    const templates = await prisma.serverAccessChecklistTemplate.findMany({
      where: whereClause,
      orderBy: [{ checklistType: 'asc' }, { order: 'asc' }],
    });

    // Export format for Excel
    if (format === 'xlsx') {
      const excelData = templates.map((t) => ({
        title: t.title,
        description: t.description || '',
        category: t.category,
        checklistType: t.checklistType,
        order: t.order,
        isRequired: t.isRequired ? 'Ya' : 'Tidak',
        unlockTime: t.unlockTime || '',
        isActive: t.isActive ? 'Ya' : 'Tidak',
      }));

      return NextResponse.json({
        format: 'xlsx',
        headers: [
          'Title',
          'Description',
          'Category',
          'Checklist Type',
          'Order',
          'Required',
          'Unlock Time',
          'Active',
        ],
        data: excelData,
        filename: `checklist_templates_${new Date().toISOString().split('T')[0]}.xlsx`,
      });
    }

    // Export format for JSON (importable)
    if (format === 'export') {
      return NextResponse.json({
        format: 'json',
        exportedAt: new Date().toISOString(),
        count: templates.length,
        templates: templates.map((t) => ({
          title: t.title,
          description: t.description,
          category: t.category,
          checklistType: t.checklistType,
          order: t.order,
          isRequired: t.isRequired,
          unlockTime: t.unlockTime,
          isActive: t.isActive,
        })),
      });
    }

    // Default: return templates with all fields
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil templates' },
      { status: 500 }
    );
  }
}

// POST - Create or Import templates
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create/import templates
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Check if this is a bulk import
    if (body.templates && Array.isArray(body.templates)) {
      return handleBulkImport(body);
    }

    // Single template creation
    const { title, description, category, checklistType, order, isRequired, unlockTime } = body;

    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title dan category wajib diisi' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Category tidak valid. Gunakan: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (checklistType && !VALID_CHECKLIST_TYPES.includes(checklistType)) {
      return NextResponse.json(
        { error: `Checklist type tidak valid. Gunakan: ${VALID_CHECKLIST_TYPES.join(', ')}` },
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
        checklistType: checklistType || 'SERVER_SIANG',
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

// Handle bulk import
async function handleBulkImport(body: {
  templates: Array<{
    title: string;
    description?: string;
    category: string;
    checklistType?: string;
    order?: number;
    isRequired?: boolean | string;
    unlockTime?: string | null;
    isActive?: boolean | string;
  }>;
  clearExisting?: boolean;
  clearType?: DailyChecklistType;
}) {
  const { templates, clearExisting = false, clearType } = body;

  const errors: string[] = [];
  const validTemplates: typeof templates = [];

  // Validate all templates
  templates.forEach((t, index) => {
    const rowNum = index + 1;

    if (!t.title || t.title.trim() === '') {
      errors.push(`Row ${rowNum}: Title is required`);
      return;
    }

    if (!t.category || !VALID_CATEGORIES.includes(t.category as ServerChecklistCategory)) {
      errors.push(
        `Row ${rowNum}: Invalid category "${t.category}". Valid: ${VALID_CATEGORIES.join(', ')}`
      );
      return;
    }

    const checklistType = t.checklistType || 'SERVER_SIANG';
    if (!VALID_CHECKLIST_TYPES.includes(checklistType as DailyChecklistType)) {
      errors.push(
        `Row ${rowNum}: Invalid checklistType "${checklistType}". Valid: ${VALID_CHECKLIST_TYPES.join(', ')}`
      );
      return;
    }

    if (t.unlockTime && !isValidUnlockTime(t.unlockTime)) {
      errors.push(`Row ${rowNum}: Invalid unlockTime "${t.unlockTime}". Use HH:mm format.`);
      return;
    }

    validTemplates.push(t);
  });

  if (errors.length > 0 && validTemplates.length === 0) {
    return NextResponse.json(
      { error: 'Semua data tidak valid', details: errors },
      { status: 400 }
    );
  }

  // Clear existing templates if requested
  if (clearExisting) {
    if (clearType && VALID_CHECKLIST_TYPES.includes(clearType)) {
      await prisma.serverAccessChecklistTemplate.deleteMany({
        where: { checklistType: clearType },
      });
    } else {
      await prisma.serverAccessChecklistTemplate.deleteMany({});
    }
  }

  let created = 0;
  let updated = 0;

  for (const template of validTemplates) {
    const checklistType = (template.checklistType || 'SERVER_SIANG') as DailyChecklistType;

    // Convert string boolean values
    const isRequired =
      typeof template.isRequired === 'string'
        ? template.isRequired.toLowerCase() === 'ya' || template.isRequired === 'true'
        : template.isRequired ?? true;

    const isActive =
      typeof template.isActive === 'string'
        ? template.isActive.toLowerCase() === 'ya' || template.isActive === 'true'
        : template.isActive ?? true;

    // Check if template exists (by title + checklistType)
    const existing = await prisma.serverAccessChecklistTemplate.findFirst({
      where: {
        title: template.title.trim(),
        checklistType,
      },
    });

    if (existing) {
      await prisma.serverAccessChecklistTemplate.update({
        where: { id: existing.id },
        data: {
          description: template.description || null,
          category: template.category as ServerChecklistCategory,
          order: template.order || 0,
          isRequired,
          unlockTime: template.unlockTime || null,
          isActive,
        },
      });
      updated++;
    } else {
      await prisma.serverAccessChecklistTemplate.create({
        data: {
          title: template.title.trim(),
          description: template.description || null,
          category: template.category as ServerChecklistCategory,
          checklistType,
          order: template.order || 0,
          isRequired,
          unlockTime: template.unlockTime || null,
          isActive,
        },
      });
      created++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Import selesai. Created: ${created}, Updated: ${updated}`,
    stats: { created, updated, errors: errors.length, total: validTemplates.length },
    errors: errors.length > 0 ? errors : undefined,
  });
}

// PUT - Update a template
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can update templates
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, description, category, checklistType, order, isRequired, isActive, unlockTime } =
      body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID wajib diisi' }, { status: 400 });
    }

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Category tidak valid. Gunakan: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate checklist type if provided
    if (checklistType && !VALID_CHECKLIST_TYPES.includes(checklistType)) {
      return NextResponse.json(
        { error: `Checklist type tidak valid. Gunakan: ${VALID_CHECKLIST_TYPES.join(', ')}` },
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
        ...(checklistType !== undefined && { checklistType }),
        ...(order !== undefined && { order }),
        ...(isRequired !== undefined && { isRequired }),
        ...(isActive !== undefined && { isActive }),
        ...(unlockTime !== undefined && { unlockTime }),
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Gagal memperbarui template' }, { status: 500 });
  }
}

// DELETE - Delete templates
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete templates
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const checklistType = searchParams.get('type') as DailyChecklistType | null;
    const hardDelete = searchParams.get('hard') === 'true';

    if (id) {
      // Delete single template
      if (hardDelete) {
        await prisma.serverAccessChecklistTemplate.delete({ where: { id } });
        return NextResponse.json({ success: true, message: 'Template dihapus permanen' });
      } else {
        await prisma.serverAccessChecklistTemplate.update({
          where: { id },
          data: { isActive: false },
        });
        return NextResponse.json({ success: true, message: 'Template dinonaktifkan' });
      }
    }

    if (checklistType && VALID_CHECKLIST_TYPES.includes(checklistType)) {
      // Delete all templates of a specific type
      if (hardDelete) {
        const result = await prisma.serverAccessChecklistTemplate.deleteMany({
          where: { checklistType },
        });
        return NextResponse.json({
          success: true,
          message: `Deleted ${result.count} templates of type ${checklistType}`,
        });
      } else {
        const result = await prisma.serverAccessChecklistTemplate.updateMany({
          where: { checklistType },
          data: { isActive: false },
        });
        return NextResponse.json({
          success: true,
          message: `Deactivated ${result.count} templates of type ${checklistType}`,
        });
      }
    }

    // Delete all templates (requires explicit hard=true for safety)
    if (hardDelete) {
      const result = await prisma.serverAccessChecklistTemplate.deleteMany({});
      return NextResponse.json({
        success: true,
        message: `Deleted all ${result.count} templates`,
      });
    }

    return NextResponse.json(
      { error: 'Specify id, type, or hard=true to delete templates' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting templates:', error);
    return NextResponse.json({ error: 'Gagal menghapus template' }, { status: 500 });
  }
}
