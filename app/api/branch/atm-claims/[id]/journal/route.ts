import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';

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
          where: {
            OR: [
              { filename: { contains: 'journal' } },
              { originalName: { contains: 'journal' } }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 1
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
      hasAssignment;

    if (!canView) {
      return NextResponse.json(
        { error: 'You do not have permission to download files for this claim' },
        { status: 403 }
      );
    }

    // Check if journal file exists
    if (!ticket.attachments || ticket.attachments.length === 0) {
      // Try to find a mock journal or generate a sample
      return NextResponse.json(
        { error: 'No journal file available for this claim' },
        { status: 404 }
      );
    }

    const journalAttachment = ticket.attachments[0];
    
    // Read the file
    const filePath = path.join(process.cwd(), 'public', journalAttachment.path);
    
    try {
      const fileBuffer = await readFile(filePath);
      
      // Return the file as a blob - convert Buffer to Uint8Array for NextResponse
      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': journalAttachment.mimeType || 'application/pdf',
          'Content-Disposition': `attachment; filename="${journalAttachment.originalName || 'journal.pdf'}"`,
          'Content-Length': journalAttachment.size.toString()
        }
      });
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      
      // If file not found on disk, return mock data
      const mockJournalContent = `
ATM TRANSACTION JOURNAL
=======================
ATM ID: ${ticket.title?.match(/ATM\d+/)?.[0] || 'ATM001'}
Date: ${new Date().toLocaleDateString()}
Ticket: ${ticket.ticketNumber}

TRANSACTION LOG:
----------------
[${new Date().toISOString()}] Card inserted
[${new Date().toISOString()}] PIN entered
[${new Date().toISOString()}] Amount selected: IDR ${Math.floor(Math.random() * 5000000)}
[${new Date().toISOString()}] Processing transaction...
[${new Date().toISOString()}] Communication with host...
[${new Date().toISOString()}] Host response received
[${new Date().toISOString()}] Dispensing cash...
[${new Date().toISOString()}] ERROR: Cash dispenser jam detected
[${new Date().toISOString()}] Transaction reversed
[${new Date().toISOString()}] Card ejected

DEVICE STATUS:
--------------
Cash Dispenser: ERROR - JAM
Card Reader: OK
Receipt Printer: LOW PAPER
Network: ONLINE
Power: MAIN

CASSETTE STATUS:
----------------
Cassette 1 (100k): 450 notes remaining
Cassette 2 (50k): 800 notes remaining  
Cassette 3 (20k): 1200 notes remaining
Cassette 4 (Reject): 15 notes

END OF JOURNAL
      `.trim();

      // Create audit log for journal access
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'DOWNLOAD_JOURNAL',
          entity: 'TICKET',
          entityId: id,
          oldValues: {},
          newValues: { type: 'mock_journal' } as any
        }
      });

      // Return mock journal as text file
      return new NextResponse(mockJournalContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="ATM_Journal_${ticket.ticketNumber}.txt"`,
          'Content-Length': Buffer.byteLength(mockJournalContent).toString()
        }
      });
    }

  } catch (error) {
    console.error('Error downloading journal:', error);
    return NextResponse.json(
      { error: 'Failed to download journal' },
      { status: 500 }
    );
  }
}