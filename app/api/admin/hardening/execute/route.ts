import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/admin/hardening/execute - Start a hardening checklist for a PC asset
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.pcAssetId || !body.templateId) {
      return NextResponse.json(
        { error: 'Missing required fields: pcAssetId and templateId' },
        { status: 400 }
      );
    }

    // Check if PC asset exists
    const pcAsset = await prisma.pCAsset.findUnique({
      where: { id: body.pcAssetId }
    });

    if (!pcAsset) {
      return NextResponse.json({ error: 'PC asset not found' }, { status: 404 });
    }

    // Check if template exists
    const template = await prisma.hardeningTemplate.findUnique({
      where: { id: body.templateId },
      include: {
        checklistItems: true
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Hardening template not found' }, { status: 404 });
    }

    // Check for existing in-progress checklist
    const existingChecklist = await prisma.hardeningChecklist.findFirst({
      where: {
        pcAssetId: body.pcAssetId,
        status: 'IN_PROGRESS'
      }
    });

    if (existingChecklist) {
      return NextResponse.json(
        { error: 'A hardening checklist is already in progress for this PC' },
        { status: 400 }
      );
    }

    // Start a transaction to create checklist and optionally a service log
    const result = await prisma.$transaction(async (tx) => {
      // Create service log if requested
      let serviceLogId = null;
      if (body.createServiceLog) {
        const serviceLog = await tx.pCServiceLog.create({
          data: {
            pcAssetId: body.pcAssetId,
            serviceType: 'HARDENING',
            performedById: session.user.id,
            description: `Starting hardening process using template: ${template.name}`,
            beforeStatus: {
              hardeningCompliant: pcAsset.hardeningCompliant,
              lastHardeningDate: pcAsset.lastHardeningDate
            }
          }
        });
        serviceLogId = serviceLog.id;
      }

      // Create the hardening checklist
      const checklist = await tx.hardeningChecklist.create({
        data: {
          pcAssetId: body.pcAssetId,
          templateId: body.templateId,
          serviceLogId,
          performedById: session.user.id,
          status: 'IN_PROGRESS',
          notes: body.notes
        },
        include: {
          pcAsset: true,
          template: true,
          performedBy: true
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'HARDENING_CHECKLIST',
          entityId: checklist.id,
          details: `Started hardening checklist for ${pcAsset.pcName} using template ${template.name}`,
          userId: session.user.id,
          metadata: {
            pcAssetId: body.pcAssetId,
            templateId: body.templateId,
            itemCount: template.checklistItems.length
          }
        }
      });

      return checklist;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error starting hardening checklist:', error);
    return NextResponse.json(
      { error: 'Failed to start hardening checklist' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/hardening/execute - Update checklist item results
export async function PUT(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.checklistId || !body.results || !Array.isArray(body.results)) {
      return NextResponse.json(
        { error: 'Missing required fields: checklistId and results array' },
        { status: 400 }
      );
    }

    // Check if checklist exists and is in progress
    const checklist = await prisma.hardeningChecklist.findUnique({
      where: { id: body.checklistId },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        }
      }
    });

    if (!checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }

    if (checklist.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Checklist is not in progress' },
        { status: 400 }
      );
    }

    // Update checklist results
    const result = await prisma.$transaction(async (tx) => {
      // Upsert each result
      for (const result of body.results) {
        await tx.hardeningChecklistResult.upsert({
          where: {
            checklistId_checklistItemId: {
              checklistId: body.checklistId,
              checklistItemId: result.checklistItemId
            }
          },
          create: {
            checklistId: body.checklistId,
            checklistItemId: result.checklistItemId,
            isCompliant: result.isCompliant,
            notes: result.notes,
            evidence: result.evidence
          },
          update: {
            isCompliant: result.isCompliant,
            notes: result.notes,
            evidence: result.evidence,
            checkedAt: new Date()
          }
        });
      }

      // Calculate compliance score if completing
      if (body.complete) {
        const allResults = await tx.hardeningChecklistResult.findMany({
          where: { checklistId: body.checklistId },
          include: {
            checklistItem: true
          }
        });

        const requiredItems = allResults.filter(r => r.checklistItem.isRequired);
        const compliantRequired = requiredItems.filter(r => r.isCompliant).length;
        const complianceScore = requiredItems.length > 0 
          ? (compliantRequired / requiredItems.length) * 100 
          : 100;

        // Update checklist status and score
        const updatedChecklist = await tx.hardeningChecklist.update({
          where: { id: body.checklistId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            complianceScore,
            notes: body.notes
          }
        });

        // Update PC asset hardening status
        await tx.pCAsset.update({
          where: { id: checklist.pcAssetId },
          data: {
            lastHardeningDate: new Date(),
            hardeningCompliant: complianceScore >= 80 // 80% compliance threshold
          }
        });

        // Update service log if exists
        if (checklist.serviceLogId) {
          await tx.pCServiceLog.update({
            where: { id: checklist.serviceLogId },
            data: {
              findings: `Hardening completed with ${complianceScore.toFixed(1)}% compliance`,
              recommendations: complianceScore < 80 
                ? 'Additional hardening required to meet compliance standards'
                : 'System meets hardening compliance standards',
              afterStatus: {
                hardeningCompliant: complianceScore >= 80,
                complianceScore,
                completedAt: new Date()
              }
            }
          });
        }

        return updatedChecklist;
      }

      return checklist;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating hardening checklist:', error);
    return NextResponse.json(
      { error: 'Failed to update hardening checklist' },
      { status: 500 }
    );
  }
}