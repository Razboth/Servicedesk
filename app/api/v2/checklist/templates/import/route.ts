import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChecklistUnit, ChecklistShiftType } from '@prisma/client';

interface TemplateImportItem {
  unit: ChecklistUnit;
  shiftType: ChecklistShiftType;
  section: string;
  sectionTitle: string;
  itemNumber: number;
  title: string;
  description?: string;
  toolSystem?: string;
  timeSlot?: string;
  isRequired?: boolean;
  order: number;
}

/**
 * POST /api/v2/checklist/templates/import
 * Bulk import checklist templates
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only managers can import templates' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { templates, mode = 'CREATE_OR_UPDATE' } = body as {
      templates: TemplateImportItem[];
      mode?: 'CREATE_ONLY' | 'UPDATE_ONLY' | 'CREATE_OR_UPDATE' | 'REPLACE_ALL';
    };

    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty templates array' },
        { status: 400 }
      );
    }

    // Validate all templates
    const errors: { index: number; error: string }[] = [];
    const validUnits = ['IT_OPERATIONS', 'MONITORING'];
    const validShiftTypes = ['HARIAN_KANTOR', 'STANDBY_LEMBUR', 'SHIFT_MALAM', 'SHIFT_SIANG_WEEKEND'];

    templates.forEach((t, index) => {
      if (!t.unit || !validUnits.includes(t.unit)) {
        errors.push({ index, error: `Invalid unit: ${t.unit}` });
      }
      if (!t.shiftType || !validShiftTypes.includes(t.shiftType)) {
        errors.push({ index, error: `Invalid shiftType: ${t.shiftType}` });
      }
      if (!t.section) {
        errors.push({ index, error: 'Missing section' });
      }
      if (!t.sectionTitle) {
        errors.push({ index, error: 'Missing sectionTitle' });
      }
      if (!t.title) {
        errors.push({ index, error: 'Missing title' });
      }
      if (t.itemNumber === undefined) {
        errors.push({ index, error: 'Missing itemNumber' });
      }
      if (t.order === undefined) {
        errors.push({ index, error: 'Missing order' });
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Process import based on mode
    let created = 0;
    let updated = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      if (mode === 'REPLACE_ALL') {
        // Delete all existing templates for the units/shift types being imported
        const unitShiftCombos = [...new Set(templates.map(t => `${t.unit}-${t.shiftType}`))];
        for (const combo of unitShiftCombos) {
          const [unit, shiftType] = combo.split('-');
          await tx.checklistTemplateV2.deleteMany({
            where: {
              unit: unit as ChecklistUnit,
              shiftType: shiftType as ChecklistShiftType,
            },
          });
        }
      }

      for (const template of templates) {
        // Check if template exists (by unit + shiftType + section + itemNumber)
        const existing = await tx.checklistTemplateV2.findFirst({
          where: {
            unit: template.unit,
            shiftType: template.shiftType,
            section: template.section,
            itemNumber: template.itemNumber,
          },
        });

        if (existing) {
          if (mode === 'CREATE_ONLY') {
            skipped++;
            continue;
          }

          // Update existing
          await tx.checklistTemplateV2.update({
            where: { id: existing.id },
            data: {
              sectionTitle: template.sectionTitle,
              title: template.title,
              description: template.description,
              toolSystem: template.toolSystem,
              timeSlot: template.timeSlot,
              isRequired: template.isRequired ?? true,
              order: template.order,
              isActive: true,
            },
          });
          updated++;
        } else {
          if (mode === 'UPDATE_ONLY') {
            skipped++;
            continue;
          }

          // Create new
          await tx.checklistTemplateV2.create({
            data: {
              unit: template.unit,
              shiftType: template.shiftType,
              section: template.section,
              sectionTitle: template.sectionTitle,
              itemNumber: template.itemNumber,
              title: template.title,
              description: template.description,
              toolSystem: template.toolSystem,
              timeSlot: template.timeSlot,
              isRequired: template.isRequired ?? true,
              order: template.order,
              isActive: true,
            },
          });
          created++;
        }
      }
    });

    return NextResponse.json({
      message: 'Import completed',
      stats: {
        total: templates.length,
        created,
        updated,
        skipped,
      },
    });
  } catch (error) {
    console.error('[Checklist V2] Templates import error:', error);
    return NextResponse.json(
      { error: 'Failed to import templates' },
      { status: 500 }
    );
  }
}
