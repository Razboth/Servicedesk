import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const bulkPermissionsSchema = z.object({
  articleIds: z.array(z.string()).min(1),
  templateId: z.string().optional(),
  permissions: z
    .object({
      visibility: z.enum(['EVERYONE', 'BY_ROLE', 'BY_BRANCH', 'PRIVATE']).optional(),
      visibleToRoles: z.array(z.string()).optional(),
      visibleToBranches: z.array(z.string()).optional(),
    })
    .optional(),
});

// POST /api/knowledge/bulk/permissions - Apply permissions to multiple articles
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = bulkPermissionsSchema.parse(body);

    let permissionsToApply: {
      visibility?: string;
      visibleToRoles?: string[];
      visibleToBranches?: string[];
    } = {};

    // If template ID is provided, fetch the template
    if (data.templateId) {
      const template = await prisma.knowledgePermissionTemplate.findUnique({
        where: { id: data.templateId },
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Permission template not found' },
          { status: 404 }
        );
      }

      const templatePermissions = template.permissions as any;
      permissionsToApply = {
        visibility: templatePermissions.visibility,
        visibleToRoles: templatePermissions.visibleToRoles,
        visibleToBranches: templatePermissions.visibleToBranches,
      };
    } else if (data.permissions) {
      permissionsToApply = data.permissions;
    } else {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Either templateId or permissions must be provided' },
        { status: 400 }
      );
    }

    // Verify all articles exist
    const articles = await prisma.knowledgeArticle.findMany({
      where: { id: { in: data.articleIds } },
      select: { id: true },
    });

    const foundIds = articles.map((a) => a.id);
    const missingIds = data.articleIds.filter((id) => !foundIds.includes(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: 'Not Found', message: `Articles not found: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Start transaction to update all articles
    const results = await prisma.$transaction(async (tx) => {
      const updatePromises = data.articleIds.map(async (articleId) => {
        // Update article visibility
        const updateData: any = {};

        if (permissionsToApply.visibility) {
          updateData.visibility = permissionsToApply.visibility;
        }

        if (permissionsToApply.visibleToRoles) {
          updateData.visibleToRoles = permissionsToApply.visibleToRoles;
        }

        const updatedArticle = await tx.knowledgeArticle.update({
          where: { id: articleId },
          data: updateData,
        });

        // Handle visible branches
        if (permissionsToApply.visibleToBranches) {
          // Delete existing visible branches
          await tx.knowledgeVisibleBranch.deleteMany({
            where: { articleId },
          });

          // Create new visible branches
          if (permissionsToApply.visibleToBranches.length > 0) {
            await tx.knowledgeVisibleBranch.createMany({
              data: permissionsToApply.visibleToBranches.map((branchId) => ({
                articleId,
                branchId,
              })),
            });
          }
        }

        // Log activity
        await tx.knowledgeActivity.create({
          data: {
            articleId,
            userId: session.user.id,
            action: 'BULK_PERMISSIONS_APPLIED',
            details: {
              templateId: data.templateId || null,
              permissions: permissionsToApply,
            },
          },
        });

        return updatedArticle;
      });

      return Promise.all(updatePromises);
    });

    return NextResponse.json({
      success: true,
      message: `Permissions applied to ${results.length} articles`,
      data: {
        updatedCount: results.length,
        articleIds: data.articleIds,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error applying bulk permissions:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to apply bulk permissions' },
      { status: 500 }
    );
  }
}
