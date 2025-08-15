import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Get user with support group
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        supportGroup: true,
        branch: true
      }
    });

    return NextResponse.json({
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          branchId: session.user.branchId,
          branchName: session.user.branchName,
          supportGroupId: session.user.supportGroupId,
          supportGroupCode: session.user.supportGroupCode
        }
      },
      database: {
        user: {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          role: user?.role,
          branchId: user?.branchId,
          branchName: user?.branch?.name,
          supportGroupId: user?.supportGroupId,
          supportGroup: user?.supportGroup ? {
            id: user.supportGroup.id,
            code: user.supportGroup.code,
            name: user.supportGroup.name
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json({ error: 'Failed to get session debug info' }, { status: 500 });
  }
}