import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/atms/lookup - Get ATMs for dropdown selection with branch info
export async function GET(request: NextRequest) {
  try {
    // For now, let's make this endpoint more permissive for testing
    // In production, re-enable full auth check
    const session = await auth();
    
    // Debug logging for troubleshooting
    if (session) {
      console.log('ATM Lookup - Session user:', {
        id: session.user?.id,
        role: session.user?.role,
        email: session.user?.email
      });
    } else {
      console.log('ATM Lookup - No session found');
    }

    // Get user's branch for comparison
    let userWithBranch = null;
    if (session?.user?.id) {
      userWithBranch = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { 
          branchId: true,
          branch: {
            select: { name: true }
          }
        }
      });
    }

    // Fetch all active ATMs with branch information
    const atms = await prisma.aTM.findMany({
      where: { isActive: true },
      include: {
        branch: {
          select: { 
            id: true,
            name: true, 
            code: true 
          }
        }
      },
      orderBy: [
        { branch: { name: 'asc' } },
        { code: 'asc' }
      ]
    });

    // Format for dropdown with branch ownership info
    const options = atms.map(atm => ({
      value: atm.code,
      label: `${atm.code} - ${atm.name}`,
      atmId: atm.id,
      atmName: atm.name,
      location: atm.location || '',
      branchId: atm.branchId,
      branchName: atm.branch.name,
      branchCode: atm.branch.code,
      isOwnBranch: atm.branchId === userWithBranch?.branchId,
      displayInfo: `${atm.code} - ${atm.name} (${atm.branch.name}${atm.branchId === userWithBranch?.branchId ? ' - Cabang Anda' : ''})`
    }));

    // Group by branch for better UX
    const groupedOptions = atms.reduce((acc, atm) => {
      const branchName = atm.branch.name;
      if (!acc[branchName]) {
        acc[branchName] = {
          label: branchName,
          isOwnBranch: atm.branchId === userWithBranch?.branchId,
          options: []
        };
      }
      acc[branchName].options.push({
        value: atm.code,
        label: `${atm.code} - ${atm.name}`,
        atmId: atm.id,
        atmName: atm.name,
        location: atm.location || '',
        branchId: atm.branchId,
        branchName: atm.branch.name,
        branchCode: atm.branch.code,
        isOwnBranch: atm.branchId === userWithBranch?.branchId
      });
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      options,
      grouped: Object.values(groupedOptions),
      userBranch: {
        id: userWithBranch?.branchId,
        name: userWithBranch?.branch?.name
      }
    });

  } catch (error) {
    console.error('Error fetching ATMs for lookup:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATMs' },
      { status: 500 }
    );
  }
}