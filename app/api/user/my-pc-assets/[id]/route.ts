import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/user/my-pc-assets/[id] - Get specific PC asset details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const pcAsset = await prisma.pCAsset.findFirst({
      where: {
        id,
        assignedToId: session.user.id, // Ensure user owns this asset
        isActive: true
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        operatingSystem: {
          select: {
            id: true,
            name: true,
            version: true,
            type: true,
            architecture: true
          }
        },
        officeProduct: {
          select: {
            id: true,
            name: true,
            version: true,
            type: true
          }
        },
        osLicenses: {
          select: {
            id: true,
            licenseKey: true,
            licenseType: true,
            purchaseDate: true,
            expiryDate: true,
            isActive: true
          },
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        officeLicenses: {
          select: {
            id: true,
            licenseKey: true,
            licenseType: true,
            purchaseDate: true,
            expiryDate: true,
            status: true
          },
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        antivirusLicenses: {
          select: {
            id: true,
            productName: true,
            licenseKey: true,
            expiryDate: true,
            isActive: true
          },
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        serviceLogs: {
          select: {
            id: true,
            serviceType: true,
            description: true,
            findings: true,
            recommendations: true,
            performedAt: true,
            performedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true
              }
            }
          },
          orderBy: {
            performedAt: 'desc'
          }
        },
        hardeningChecklists: {
          select: {
            id: true,
            status: true,
            completedAt: true,
            complianceScore: true,
            notes: true,
            template: {
              select: {
                id: true,
                name: true,
                description: true
              }
            },
            performedBy: {
              select: {
                id: true,
                name: true
              }
            },
            checklistResults: {
              select: {
                id: true,
                isCompliant: true,
                notes: true,
                checklistItem: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    category: true,
                    isRequired: true
                  }
                }
              }
            }
          },
          orderBy: {
            startedAt: 'desc'
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!pcAsset) {
      return NextResponse.json(
        { error: 'PC asset not found or not assigned to you' },
        { status: 404 }
      );
    }

    return NextResponse.json(pcAsset);
  } catch (error) {
    console.error('Error fetching PC asset details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PC asset details' },
      { status: 500 }
    );
  }
}
