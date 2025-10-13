import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    console.log('[UPLOAD] Upload request received for ticket:', id);

    if (!session?.user?.id) {
      console.log('[UPLOAD] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[UPLOAD] User:', { id: session.user.id, role: session.user.role });

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { branch: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if user has permission
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true, role: true }
    });

    const hasAssignment = await prisma.branchAssignment.findFirst({
      where: {
        ticketId: id,
        assignedToId: session.user.id,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
      }
    });

    // Check if user is the ticket creator or from the same branch
    const isCreator = ticket.createdById === session.user.id;
    const isSameBranch = user?.branchId === ticket.branchId;

    const canUpload =
      session.user.role === 'ADMIN' ||
      session.user.role === 'MANAGER_IT' ||
      (session.user.role === 'MANAGER' && isSameBranch) ||
      hasAssignment ||
      isCreator ||
      isSameBranch; // Allow anyone from the same branch to upload (for collaborative verification)

    console.log('[UPLOAD] Permission check:', {
      userRole: session.user.role,
      userBranchId: user?.branchId,
      ticketBranchId: ticket.branchId,
      hasAssignment: !!hasAssignment,
      isCreator,
      isSameBranch,
      canUpload
    });

    if (!canUpload) {
      console.log('[UPLOAD] Permission denied');
      return NextResponse.json(
        { error: 'You do not have permission to upload files for this claim' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadType = formData.get('type') as string || 'document';

    console.log('[UPLOAD] File info:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      uploadType
    });

    if (!file) {
      console.log('[UPLOAD] No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (10MB for documents, 50MB for videos)
    const maxSize = uploadType === 'cctv_evidence' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'atm-claims', id);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const filename = `${uploadType}_${timestamp}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Save file reference to database
    const attachment = await prisma.ticketAttachment.create({
      data: {
        ticketId: id,
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        path: `/uploads/atm-claims/${id}/${filename}`
      }
    });

    // Update verification record if journal type
    if (uploadType === 'journal') {
      const verification = await prisma.aTMClaimVerification.findUnique({
        where: { ticketId: id }
      });

      if (!verification) {
        // Create verification record if it doesn't exist
        await prisma.aTMClaimVerification.create({
          data: {
            ticketId: id,
            journalAttachments: {
              attachmentId: attachment.id,
              filename: attachment.filename,
              uploadedAt: new Date()
            }
          }
        });
      } else {
        // Update existing verification
        const currentAttachments = (verification.journalAttachments as any) || [];
        await prisma.aTMClaimVerification.update({
          where: { ticketId: id },
          data: {
            journalAttachments: [
              ...currentAttachments,
              {
                attachmentId: attachment.id,
                filename: attachment.filename,
                uploadedAt: new Date()
              }
            ]
          }
        });
      }
    }

    // Add comment about file upload
    await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        content: `Uploaded ${uploadType === 'journal' ? 'journal' : uploadType === 'cctv_evidence' ? 'CCTV evidence' : 'document'}: ${file.name}`,
        isInternal: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPLOAD_FILE',
        entity: 'TICKET_ATTACHMENT',
        entityId: attachment.id,
        oldValues: {},
        newValues: {
          filename: attachment.filename,
          type: uploadType,
          ticketId: id
        } as any
      }
    });

    return NextResponse.json({
      success: true,
      file: {
        id: attachment.id,
        filename: attachment.filename,
        originalName: attachment.originalName,
        url: attachment.path,
        size: attachment.size,
        type: attachment.mimeType
      },
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('[UPLOAD] Error uploading file:', error);
    console.error('[UPLOAD] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to upload file', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}