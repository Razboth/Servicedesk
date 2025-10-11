import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/technicians
 *
 * Fetches all active technicians for filter dropdowns
 * Returns: Array of technicians with id, name, email, and supportGroupCode
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active users with TECHNICIAN or SECURITY_ANALYST role
    // SECURITY_ANALYST is included because they function like technicians
    const technicians = await prisma.user.findMany({
      where: {
        role: {
          in: ['TECHNICIAN', 'SECURITY_ANALYST']
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        supportGroupCode: true,
        supportGroup: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(technicians);
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technicians' },
      { status: 500 }
    );
  }
}
