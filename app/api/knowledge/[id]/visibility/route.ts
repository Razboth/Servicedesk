import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { KnowledgeVisibility } from '@prisma/client';

// Schema for updating visibility settings
const updateVisibilitySchema = z.object({
  visibility: z.enum(['EVERYONE', 'BY_ROLE', 'BY_BRANCH', 'PRIVATE']),
  visibleToRoles: z.array(z.string()).default([]),
  visibleToBranches: z.array(z.string()).default([])
});

// GET: Get current visibility settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: {
        id: true,
        visibility: true,
        visibleToRoles: true,
        authorId: true,
        visibleBranches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Artikel tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check permissions - only author, collaborators, and admins can view visibility settings
    const canView = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role) ||
                    article.authorId === session.user.id ||
                    article.collaborators.some(c => c.userId === session.user.id);

    if (!canView) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki izin untuk melihat pengaturan visibilitas' },
        { status: 403 }
      );
    }

    // Generate summary of who can see the article
    let accessSummary: string;
    switch (article.visibility) {
      case 'EVERYONE':
        accessSummary = 'Semua pengguna dapat melihat artikel ini';
        break;
      case 'BY_ROLE':
        const roleNames = article.visibleToRoles.map(role => {
          const roleLabels: Record<string, string> = {
            'USER': 'Pengguna',
            'TECHNICIAN': 'Teknisi',
            'MANAGER': 'Manager',
            'MANAGER_IT': 'Manager IT',
            'ADMIN': 'Admin',
            'SECURITY_ANALYST': 'Security Analyst'
          };
          return roleLabels[role] || role;
        });
        accessSummary = `Hanya pengguna dengan role: ${roleNames.join(', ')}`;
        break;
      case 'BY_BRANCH':
        const branchNames = article.visibleBranches.map(vb => vb.branch.name);
        accessSummary = `Hanya pengguna dari cabang: ${branchNames.join(', ') || 'Tidak ada cabang dipilih'}`;
        break;
      case 'PRIVATE':
        accessSummary = 'Hanya penulis dan kolaborator yang dapat melihat';
        break;
      default:
        accessSummary = 'Pengaturan visibilitas tidak diketahui';
    }

    return NextResponse.json({
      visibility: article.visibility,
      visibleToRoles: article.visibleToRoles,
      visibleBranches: article.visibleBranches.map(vb => ({
        id: vb.branch.id,
        name: vb.branch.name,
        code: vb.branch.code
      })),
      collaborators: article.collaborators.map(c => ({
        id: c.user.id,
        name: c.user.name,
        email: c.user.email
      })),
      accessSummary
    });

  } catch (error) {
    console.error('Error fetching visibility settings:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil pengaturan visibilitas' },
      { status: 500 }
    );
  }
}

// PUT: Update visibility settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = updateVisibilitySchema.parse(body);

    // Get current article
    const currentArticle = await prisma.knowledgeArticle.findUnique({
      where: { id },
      include: {
        visibleBranches: true,
        collaborators: true
      }
    });

    if (!currentArticle) {
      return NextResponse.json(
        { error: 'Artikel tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check permissions - only author, owner collaborators, and admins can update visibility
    const canEdit = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role) ||
                    currentArticle.authorId === session.user.id ||
                    currentArticle.collaborators.some(c => c.userId === session.user.id && c.role === 'OWNER');

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki izin untuk mengubah pengaturan visibilitas' },
        { status: 403 }
      );
    }

    // Track changes for activity log
    const visibilityChanged = data.visibility !== currentArticle.visibility;
    const currentBranchIds = currentArticle.visibleBranches.map(vb => vb.branchId).sort();
    const newBranchIds = [...data.visibleToBranches].sort();
    const branchesChanged = JSON.stringify(currentBranchIds) !== JSON.stringify(newBranchIds);
    const rolesChanged = JSON.stringify([...data.visibleToRoles].sort()) !==
                         JSON.stringify([...currentArticle.visibleToRoles].sort());

    // Update article visibility
    await prisma.knowledgeArticle.update({
      where: { id },
      data: {
        visibility: data.visibility as KnowledgeVisibility,
        visibleToRoles: data.visibleToRoles
      }
    });

    // Handle visible branches update
    if (branchesChanged) {
      // Delete old visible branches
      await prisma.knowledgeVisibleBranch.deleteMany({
        where: { articleId: id }
      });

      // Create new visible branches
      if (data.visibleToBranches.length > 0) {
        await prisma.knowledgeVisibleBranch.createMany({
          data: data.visibleToBranches.map(branchId => ({
            articleId: id,
            branchId
          }))
        });
      }

      // Log branch access changes
      const addedBranches = data.visibleToBranches.filter(b => !currentBranchIds.includes(b));
      const removedBranches = currentBranchIds.filter(b => !data.visibleToBranches.includes(b));

      if (addedBranches.length > 0) {
        await prisma.knowledgeActivity.create({
          data: {
            articleId: id,
            userId: session.user.id,
            action: 'BRANCH_ACCESS_ADDED',
            details: {
              branchIds: addedBranches
            }
          }
        });
      }

      if (removedBranches.length > 0) {
        await prisma.knowledgeActivity.create({
          data: {
            articleId: id,
            userId: session.user.id,
            action: 'BRANCH_ACCESS_REMOVED',
            details: {
              branchIds: removedBranches
            }
          }
        });
      }
    }

    // Log visibility changes
    if (visibilityChanged) {
      await prisma.knowledgeActivity.create({
        data: {
          articleId: id,
          userId: session.user.id,
          action: 'VISIBILITY_CHANGED',
          details: {
            oldVisibility: currentArticle.visibility,
            newVisibility: data.visibility
          }
        }
      });
    }

    // Log role access changes
    if (rolesChanged) {
      const addedRoles = data.visibleToRoles.filter(r => !currentArticle.visibleToRoles.includes(r));
      const removedRoles = currentArticle.visibleToRoles.filter(r => !data.visibleToRoles.includes(r));

      if (addedRoles.length > 0) {
        await prisma.knowledgeActivity.create({
          data: {
            articleId: id,
            userId: session.user.id,
            action: 'ROLE_ACCESS_ADDED',
            details: {
              roles: addedRoles
            }
          }
        });
      }

      if (removedRoles.length > 0) {
        await prisma.knowledgeActivity.create({
          data: {
            articleId: id,
            userId: session.user.id,
            action: 'ROLE_ACCESS_REMOVED',
            details: {
              roles: removedRoles
            }
          }
        });
      }
    }

    // Fetch updated visibility settings
    const updatedArticle = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: {
        visibility: true,
        visibleToRoles: true,
        visibleBranches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Pengaturan visibilitas berhasil diperbarui',
      visibility: updatedArticle?.visibility,
      visibleToRoles: updatedArticle?.visibleToRoles,
      visibleBranches: updatedArticle?.visibleBranches.map(vb => ({
        id: vb.branch.id,
        name: vb.branch.name,
        code: vb.branch.code
      }))
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating visibility settings:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui pengaturan visibilitas' },
      { status: 500 }
    );
  }
}
