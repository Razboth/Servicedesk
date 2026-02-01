import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/pc-assets/[id]/verify - Public verification endpoint for QR codes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pcAsset = await prisma.pCAsset.findUnique({
      where: { id },
      select: {
        id: true,
        pcName: true,
        assetTag: true,
        serialNumber: true,
        brand: true,
        model: true,
        status: true,
        isActive: true,
        purchaseDate: true,
        warrantyExpiry: true,
        branch: {
          select: {
            name: true,
            code: true,
            address: true
          }
        },
        assignedTo: {
          select: {
            name: true,
            email: true
          }
        },
        operatingSystem: {
          select: {
            name: true,
            version: true
          }
        },
        hardeningChecklists: {
          select: {
            status: true,
            complianceScore: true,
            completedAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        _count: {
          select: {
            serviceLogs: true,
            hardeningChecklists: true
          }
        }
      }
    });

    if (!pcAsset) {
      return NextResponse.json(
        { error: 'PC asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(pcAsset);
  } catch (error) {
    console.error('Error verifying PC asset:', error);
    return NextResponse.json(
      { error: 'Failed to verify PC asset' },
      { status: 500 }
    );
  }
}
