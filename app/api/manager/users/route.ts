import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['MANAGER', 'MANAGER_IT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's branch
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    if (!user?.branch) {
      return NextResponse.json(
        { error: 'No branch assigned' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const shiftEligible = searchParams.get('shiftEligible');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build where clause - exclude high-privilege roles for managers
    const where: any = {
      branchId: user.branch.id,
    };

    // Handle shift-eligible filter (TECHNICIAN, MANAGER, MANAGER_IT from same branch)
    if (shiftEligible === 'true') {
      where.role = {
        in: ['TECHNICIAN', 'MANAGER', 'MANAGER_IT']
      };
    } else {
      // Regular managers cannot see high-privilege roles (managed by admin only)
      // IT managers can see technicians for shift scheduling
      where.role = session.user.role === 'MANAGER' ? {
        notIn: ['TECHNICIAN', 'ADMIN', 'SECURITY_ANALYST']
      } : session.user.role === 'MANAGER_IT' ? {
        notIn: ['ADMIN', 'SECURITY_ANALYST']
      } : undefined;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role && role !== 'all') {
      // Prevent managers from filtering for high-privilege roles
      // IT managers can filter for technicians
      const restrictedForManager = ['TECHNICIAN', 'ADMIN', 'SECURITY_ANALYST'];
      const restrictedForITManager = ['ADMIN', 'SECURITY_ANALYST'];

      if (session.user.role === 'MANAGER' && restrictedForManager.includes(role)) {
        return NextResponse.json(
          { error: 'This role can only be managed by administrators' },
          { status: 403 }
        );
      }

      if (session.user.role === 'MANAGER_IT' && restrictedForITManager.includes(role)) {
        return NextResponse.json(
          { error: 'This role can only be managed by administrators' },
          { status: 403 }
        );
      }

      where.role = role;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Fetch users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              createdTickets: true,
              assignedTickets: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      branch: {
        name: user.branch.name,
        code: user.branch.code
      }
    });
  } catch (error) {
    console.error('Error fetching manager users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}