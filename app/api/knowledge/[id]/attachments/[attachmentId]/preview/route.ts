import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  convertDocxToHtml,
  parseXlsxToHtml,
  isDocxFile,
  isXlsxFile,
  isPdfFile,
  isImageFile
} from '@/lib/document-converter';

// GET: Preview attachment inline
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get sheet index for XLSX files from query params
    const { searchParams } = new URL(request.url);
    const sheetIndex = parseInt(searchParams.get('sheet') || '0', 10);

    // Support both ID and slug lookup
    const isCuid = /^c[a-z0-9]{24}$/.test(id);

    // Check if article exists and user can access it
    const article = await prisma.knowledgeArticle.findFirst({
      where: isCuid ? { id } : { slug: id },
      select: {
        id: true,
        status: true,
        authorId: true,
        visibility: true,
        visibleToRoles: true,
        visibleBranches: {
          select: {
            branchId: true
          }
        },
        collaborators: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Knowledge article not found' },
        { status: 404 }
      );
    }

    // Check access permissions based on article visibility
    const userId = session.user.id;
    const userRole = session.user.role;
    const userBranchId = session.user.branchId;

    // Admins and managers can access all articles
    const isAdminOrManager = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(userRole);

    // Check if user is author or collaborator
    const isAuthor = article.authorId === userId;
    const isCollaborator = article.collaborators.some(c => c.userId === userId);

    // For non-published articles, only author, collaborators, admins can access
    if (article.status !== 'PUBLISHED' && !isAdminOrManager && !isAuthor && !isCollaborator) {
      return NextResponse.json(
        { error: 'Cannot access attachments for this article' },
        { status: 403 }
      );
    }

    // For published articles, check visibility settings
    if (article.status === 'PUBLISHED' && !isAdminOrManager && !isAuthor && !isCollaborator) {
      switch (article.visibility) {
        case 'PRIVATE':
          return NextResponse.json(
            { error: 'Cannot access attachments for this article' },
            { status: 403 }
          );

        case 'BY_ROLE':
          if (!article.visibleToRoles.includes(userRole)) {
            return NextResponse.json(
              { error: 'Cannot access attachments for this article' },
              { status: 403 }
            );
          }
          break;

        case 'BY_BRANCH':
          const allowedBranchIds = article.visibleBranches.map(vb => vb.branchId);
          if (userBranchId && !allowedBranchIds.includes(userBranchId)) {
            return NextResponse.json(
              { error: 'Cannot access attachments for this article' },
              { status: 403 }
            );
          }
          break;

        case 'EVERYONE':
        default:
          // Access allowed for everyone
          break;
      }
    }

    // Get attachment info (use actual article.id, not the URL parameter)
    const attachment = await prisma.knowledgeAttachment.findUnique({
      where: {
        id: attachmentId,
        articleId: article.id
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Check if file exists
    const filePath = join(process.cwd(), attachment.path);
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await readFile(filePath);
    const mimeType = attachment.mimeType;

    // Handle different file types
    if (isPdfFile(mimeType) || isImageFile(mimeType)) {
      // Return raw file for PDF and images with inline disposition
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.originalName)}"`,
          'Content-Length': attachment.size.toString(),
          'Cache-Control': 'private, max-age=3600'
        }
      });
    }

    if (isDocxFile(mimeType)) {
      // Convert DOCX to HTML
      const html = await convertDocxToHtml(fileBuffer);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'private, max-age=3600'
        }
      });
    }

    if (isXlsxFile(mimeType)) {
      // Convert XLSX to HTML
      const result = await parseXlsxToHtml(fileBuffer, sheetIndex);
      return NextResponse.json({
        html: result.html,
        sheetNames: result.sheetNames,
        currentSheet: sheetIndex
      });
    }

    // For other file types, return as download
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
        'Content-Length': attachment.size.toString()
      }
    });
  } catch (error) {
    console.error('Error previewing attachment:', error);
    return NextResponse.json(
      { error: 'Failed to preview attachment' },
      { status: 500 }
    );
  }
}
