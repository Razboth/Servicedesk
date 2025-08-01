import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Delete all services first (due to foreign key constraints)
      const deletedServices = await tx.service.deleteMany({});
      
      // Delete all service categories
      const deletedCategories = await tx.serviceCategory.deleteMany({});
      
      // Delete all SLA templates
      const deletedSLATemplates = await tx.sLATemplate.deleteMany({});
      
      return {
        deletedServices: deletedServices.count,
        deletedCategories: deletedCategories.count,
        deletedSLATemplates: deletedSLATemplates.count
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Import data successfully cleared',
      result
    });

  } catch (error) {
    console.error('Error undoing import:', error);
    return NextResponse.json(
      { error: 'Failed to undo import' },
      { status: 500 }
    );
  }
}