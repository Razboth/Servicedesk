import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Try to connect to database
    const serviceCount = await prisma.service.count();
    const categoryCount = await prisma.serviceCategory.count();
    const branchCount = await prisma.branch.count();
    const atmCount = await prisma.aTM.count();
    
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      services: serviceCount,
      categories: categoryCount,
      branches: branchCount,
      atms: atmCount
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      status: 'error',
      database: 'not connected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}