import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/admin/atms/[id]/alarm-visibility - Toggle ATM visibility in alarm reports
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'IT_OPS', 'IT_OPS_LEAD'];
    if (!allowedRoles.includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { showInAlarmReport } = body;

    if (typeof showInAlarmReport !== 'boolean') {
      return NextResponse.json(
        { error: 'showInAlarmReport must be a boolean' },
        { status: 400 }
      );
    }

    // Find ATM by id or code
    const atm = await prisma.aTM.findFirst({
      where: {
        OR: [
          { id: id },
          { code: id }
        ]
      }
    });

    if (!atm) {
      return NextResponse.json({ error: 'ATM not found' }, { status: 404 });
    }

    // Update the ATM
    const updatedATM = await prisma.aTM.update({
      where: { id: atm.id },
      data: { showInAlarmReport },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: showInAlarmReport
        ? 'ATM will now appear in alarm reports'
        : 'ATM hidden from alarm reports',
      data: updatedATM
    });
  } catch (error) {
    console.error('Error updating ATM alarm visibility:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/atms/[id]/alarm-visibility - Get ATM alarm visibility status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const atm = await prisma.aTM.findFirst({
      where: {
        OR: [
          { id: id },
          { code: id }
        ]
      },
      select: {
        id: true,
        code: true,
        name: true,
        showInAlarmReport: true
      }
    });

    if (!atm) {
      return NextResponse.json({ error: 'ATM not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: atm
    });
  } catch (error) {
    console.error('Error fetching ATM alarm visibility:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
