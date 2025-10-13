import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for verification data
const verificationSchema = z.object({
  // Journal verification
  journalChecked: z.boolean().optional(),
  journalFindings: z.string().optional(),
  journalAttachments: z.any().optional(),
  
  // Electronic Journal
  ejTransactionFound: z.boolean().nullable().optional(),
  ejReferenceNumber: z.string().optional(),
  amountMatches: z.boolean().nullable().optional(),
  
  // Cash reconciliation
  cashOpening: z.number().nullable().optional(),
  cashDispensed: z.number().nullable().optional(),
  cashRemaining: z.number().nullable().optional(),
  cashVariance: z.number().nullable().optional(),
  
  // CCTV Review
  cctvReviewed: z.boolean().optional(),
  cctvFindings: z.string().optional(),
  cctvEvidenceUrl: z.string().optional(),
  
  // Core banking check
  debitSuccessful: z.boolean().nullable().optional(),
  reversalCompleted: z.boolean().nullable().optional(),
  
  // Recommendation
  recommendation: z.enum(['APPROVE', 'REJECT', 'NEED_MORE_INFO']).optional(),
  recommendationNotes: z.string().optional()
});

// GET /api/branch/atm-claims/[id]/verify - Get verification status
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

    const verification = await prisma.aTMClaimVerification.findUnique({
      where: { ticketId: id },
      include: {
        verifiedBy: { select: { name: true, email: true } },
        ticket: {
          select: {
            ticketNumber: true,
            status: true,
            branch: { select: { name: true, code: true } }
          }
        }
      }
    });

    // If no verification exists yet, return empty verification data
    if (!verification) {
      return NextResponse.json({
        verification: null,
        progress: 0,
        completedSteps: 0,
        totalSteps: 7
      });
    }

    // Calculate verification progress
    const totalSteps = 7;
    let completedSteps = 0;
    
    if (verification.journalChecked) completedSteps++;
    if (verification.ejTransactionFound !== null) completedSteps++;
    if (verification.cashOpening !== null) completedSteps++;
    if (verification.cctvReviewed) completedSteps++;
    if (verification.debitSuccessful !== null) completedSteps++;
    if (verification.recommendation) completedSteps++;
    if (verification.verifiedAt) completedSteps++;

    const progress = Math.round((completedSteps / totalSteps) * 100);

    return NextResponse.json({
      verification,
      progress,
      completedSteps,
      totalSteps
    });

  } catch (error) {
    console.error('Error fetching verification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification' },
      { status: 500 }
    );
  }
}

// POST /api/branch/atm-claims/[id]/verify - Update verification
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = verificationSchema.parse(body);

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { 
        branch: true,
        atmClaimVerification: true
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if user has permission (assigned staff or manager)
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

    const canVerify =
      session.user.role === 'ADMIN' ||
      session.user.role === 'MANAGER_IT' ||
      (session.user.role === 'MANAGER' && user?.branchId === ticket.branchId) ||
      hasAssignment;

    if (!canVerify) {
      return NextResponse.json(
        { error: 'You do not have permission to verify this claim' },
        { status: 403 }
      );
    }

    // Update or create verification record
    let verification = await prisma.aTMClaimVerification.findUnique({
      where: { ticketId: id }
    });

    const updateData: any = { ...validatedData };
    
    // Set verification timestamp if recommendation is provided
    if (validatedData.recommendation) {
      updateData.verifiedById = session.user.id;
      updateData.verifiedAt = new Date();
    }

    if (verification) {
      // Update existing verification
      verification = await prisma.aTMClaimVerification.update({
        where: { ticketId: id },
        data: updateData
      });
    } else {
      // Create new verification
      verification = await prisma.aTMClaimVerification.create({
        data: {
          ticketId: id,
          ...updateData
        }
      });
    }

    // Update assignment status if exists
    if (hasAssignment) {
      await prisma.branchAssignment.update({
        where: { id: hasAssignment.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: hasAssignment.startedAt || new Date()
        }
      });
    }

    // Add comment about verification progress
    const updates = [];
    if (validatedData.journalChecked !== undefined) updates.push('Journal verified');
    if (validatedData.ejTransactionFound !== undefined) updates.push(`EJ transaction: ${validatedData.ejTransactionFound ? 'Found' : 'Not found'}`);
    if (validatedData.cashVariance !== undefined) updates.push(`Cash variance: Rp ${validatedData.cashVariance}`);
    if (validatedData.cctvReviewed) updates.push('CCTV reviewed');
    if (validatedData.recommendation) updates.push(`Recommendation: ${validatedData.recommendation}`);

    if (updates.length > 0) {
      await prisma.ticketComment.create({
        data: {
          ticketId: id,
          userId: session.user.id,
          content: `Verification updated:\n${updates.join('\n')}`,
          isInternal: true
        }
      });
    }

    // If verification is complete with recommendation, update ticket
    if (validatedData.recommendation === 'APPROVE') {
      await prisma.ticket.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolutionNotes: validatedData.recommendationNotes
        }
      });
    } else if (validatedData.recommendation === 'REJECT') {
      await prisma.ticket.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          resolutionNotes: validatedData.recommendationNotes
        }
      });
    } else if (validatedData.recommendation === 'ESCALATE') {
      await prisma.ticket.update({
        where: { id },
        data: {
          status: 'PENDING_VENDOR',
          resolutionNotes: validatedData.recommendationNotes
        }
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VERIFY_CLAIM',
        entity: 'ATM_CLAIM_VERIFICATION',
        entityId: verification.id,
        oldValues: {},
        newValues: validatedData as any
      }
    });

    return NextResponse.json({
      success: true,
      verification,
      message: 'Verification updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid verification data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating verification:', error);
    return NextResponse.json(
      { error: 'Failed to update verification' },
      { status: 500 }
    );
  }
}