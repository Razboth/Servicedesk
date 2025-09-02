import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { 
        branch: true,
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            path: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if user has permission to view
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true, role: true }
    });

    const hasAssignment = await prisma.branchAssignment.findFirst({
      where: {
        ticketId: id,
        assignedToId: session.user.id
      }
    });

    const canView = 
      session.user.role === 'ADMIN' ||
      (session.user.role === 'MANAGER' && user?.branchId === ticket.branchId) ||
      (session.user.role === 'USER' && user?.branchId === ticket.branchId) ||
      (session.user.role === 'AGENT' && user?.branchId === ticket.branchId) ||
      hasAssignment;

    if (!canView) {
      return NextResponse.json(
        { error: 'You do not have permission to view attachments for this claim' },
        { status: 403 }
      );
    }

    // Categorize attachments
    const journalAttachments = ticket.attachments.filter(att => 
      att.filename?.toLowerCase().includes('journal') || 
      att.originalName?.toLowerCase().includes('journal')
    );

    const evidenceAttachments = ticket.attachments.filter(att => 
      att.filename?.toLowerCase().includes('evidence') || 
      att.filename?.toLowerCase().includes('cctv') ||
      att.originalName?.toLowerCase().includes('evidence') ||
      att.originalName?.toLowerCase().includes('cctv')
    );

    const otherAttachments = ticket.attachments.filter(att => 
      !journalAttachments.includes(att) && !evidenceAttachments.includes(att)
    );

    return NextResponse.json({
      attachments: ticket.attachments,
      categorized: {
        journal: journalAttachments,
        evidence: evidenceAttachments,
        other: otherAttachments
      },
      total: ticket.attachments.length,
      hasJournal: journalAttachments.length > 0,
      hasEvidence: evidenceAttachments.length > 0
    });

  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}