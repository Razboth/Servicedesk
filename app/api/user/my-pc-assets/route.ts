import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/user/my-pc-assets - Get PC assets assigned to current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pcAssets = await prisma.pCAsset.findMany({
      where: {
        assignedToId: session.user.id,
        isActive: true
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        operatingSystem: {
          select: {
            id: true,
            name: true,
            version: true,
            type: true
          }
        },
        officeProduct: {
          select: {
            id: true,
            name: true,
            version: true
          }
        },
        osLicense: {
          select: {
            id: true,
            licenseKey: true,
            licenseType: true,
            expiryDate: true
          }
        },
        officeLicense: {
          select: {
            id: true,
            licenseKey: true,
            licenseType: true,
            expiryDate: true
          }
        },
        serviceLogs: {
          select: {
            id: true,
            serviceType: true,
            description: true,
            performedAt: true,
            performedBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            performedAt: 'desc'
          },
          take: 5
        },
        hardeningChecklists: {
          select: {
            id: true,
            status: true,
            completedAt: true,
            complianceScore: true,
            template: {
              select: {
                id: true,
                name: true
              }
            }
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
      },
      orderBy: {
        pcName: 'asc'
      }
    });

    // Calculate summary statistics
    const summary = {
      totalAssets: pcAssets.length,
      hardeningCompliant: pcAssets.filter(pc => {
        const latestHardening = pc.hardeningChecklists[0];
        return latestHardening?.status === 'COMPLETED' && (latestHardening.complianceScore || 0) >= 80;
      }).length,
      warrantyExpiringSoon: pcAssets.filter(pc => {
        if (!pc.warrantyExpiry) return false;
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return pc.warrantyExpiry <= thirtyDaysFromNow && pc.warrantyExpiry > new Date();
      }).length,
      recentServiceCount: pcAssets.reduce((sum, pc) => sum + pc._count.serviceLogs, 0)
    };

    return NextResponse.json({
      assets: pcAssets,
      summary
    });
  } catch (error) {
    console.error('Error fetching user PC assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PC assets' },
      { status: 500 }
    );
  }
}
