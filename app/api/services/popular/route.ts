import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/services/popular - Get popular and frequently used services
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'all'; // 'all', 'user', 'branch', 'global'

    // Base where clause for active services
    const serviceWhere = { isActive: true };

    // Reusable include object for complete service data
    const serviceInclude = {
      category: {
        select: { id: true, name: true, level: true }
      },
      fields: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          label: true,
          type: true,
          isRequired: true,
          isUserVisible: true,
          placeholder: true,
          helpText: true,
          defaultValue: true,
          options: true,
          validation: true,
          order: true
        }
      },
      fieldTemplates: {
        orderBy: { order: 'asc' },
        where: {
          isUserVisible: true
        },
        select: {
          id: true,
          order: true,
          isRequired: true,
          isUserVisible: true,
          helpText: true,
          defaultValue: true,
          fieldTemplate: {
            select: {
              id: true,
              name: true,
              label: true,
              type: true,
              placeholder: true,
              helpText: true,
              defaultValue: true,
              options: true,
              validation: true,
              category: true
            }
          }
        }
      }
    };

    // Base select for services with all necessary fields for autofill
    const serviceSelect = {
      id: true,
      name: true,
      description: true,
      helpText: true,
      priority: true,
      estimatedHours: true,
      slaHours: true,
      requiresApproval: true,
      isConfidential: true,
      defaultTitle: true,
      defaultItilCategory: true,
      defaultIssueClassification: true,
      tier1CategoryId: true,
      tier2SubcategoryId: true,
      tier3ItemId: true,
      isActive: true,
      categoryId: true
    };

    let popularServices = [];

    switch (type) {
      case 'user':
        // Most used services by current user
        popularServices = await prisma.service.findMany({
          where: serviceWhere,
          select: {
            ...serviceSelect,
            ...serviceInclude,
            usage: {
              where: { userId: session.user.id },
              select: { usedAt: true },
              orderBy: { usedAt: 'desc' },
              take: 1
            },
            _count: {
              select: {
                usage: {
                  where: { userId: session.user.id }
                }
              }
            }
          },
          orderBy: {
            usage: {
              _count: 'desc'
            }
          },
          take: limit
        });
        break;

      case 'branch':
        // Most used services in user's branch
        if (session.user.branchId) {
          popularServices = await prisma.service.findMany({
            where: serviceWhere,
            select: {
              ...serviceSelect,
              ...serviceInclude,
              usage: {
                where: { branchId: session.user.branchId },
                select: { usedAt: true },
                orderBy: { usedAt: 'desc' },
                take: 1
              },
              _count: {
                select: {
                  usage: {
                    where: { branchId: session.user.branchId }
                  }
                }
              }
            },
            orderBy: {
              usage: {
                _count: 'desc'
              }
            },
            take: limit
          });
        }
        break;

      case 'global':
        // Most used services globally
        popularServices = await prisma.service.findMany({
          where: serviceWhere,
          select: {
            ...serviceSelect,
            ...serviceInclude,
            usage: {
              select: { usedAt: true },
              orderBy: { usedAt: 'desc' },
              take: 1
            },
            _count: {
              select: {
                usage: true
              }
            }
          },
          orderBy: {
            usage: {
              _count: 'desc'
            }
          },
          take: limit
        });
        break;

      default:
        // Combined view with different categories
        const [userServices, branchServices, globalServices] = await Promise.all([
          // User's most used (top 3)
          prisma.service.findMany({
            where: serviceWhere,
            select: {
              ...serviceSelect,
              ...serviceInclude,
              usage: {
                where: { userId: session.user.id },
                select: { usedAt: true },
                orderBy: { usedAt: 'desc' },
                take: 1
              },
              _count: {
                select: { usage: { where: { userId: session.user.id } } }
              }
            },
            orderBy: { usage: { _count: 'desc' } },
            take: 3
          }),

          // Branch popular (top 5)
          session.user.branchId ? prisma.service.findMany({
            where: serviceWhere,
            select: {
              ...serviceSelect,
              ...serviceInclude,
              usage: {
                where: { branchId: session.user.branchId },
                select: { usedAt: true },
                orderBy: { usedAt: 'desc' },
                take: 1
              },
              _count: {
                select: { usage: { where: { branchId: session.user.branchId } } }
              }
            },
            orderBy: { usage: { _count: 'desc' } },
            take: 5
          }) : [],

          // Global trending (top 5)
          prisma.service.findMany({
            where: serviceWhere,
            select: {
              ...serviceSelect,
              ...serviceInclude,
              usage: {
                where: {
                  usedAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                  }
                },
                select: { usedAt: true },
                orderBy: { usedAt: 'desc' },
                take: 1
              },
              _count: {
                select: {
                  usage: {
                    where: {
                      usedAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                      }
                    }
                  }
                }
              }
            },
            orderBy: { usage: { _count: 'desc' } },
            take: 5
          })
        ]);

        return NextResponse.json({
          user: userServices.map(service => ({
            ...service,
            usageCount: service._count.usage,
            lastUsed: service.usage[0]?.usedAt || null,
            category: 'your-recent'
          })),
          branch: branchServices.map(service => ({
            ...service,
            usageCount: service._count.usage,
            lastUsed: service.usage[0]?.usedAt || null,
            category: 'branch-popular'
          })),
          trending: globalServices.map(service => ({
            ...service,
            usageCount: service._count.usage,
            lastUsed: service.usage[0]?.usedAt || null,
            category: 'trending'
          }))
        });
    }

    // Transform the results for single type queries
    const transformedServices = popularServices.map(service => ({
      ...service,
      usageCount: service._count.usage,
      lastUsed: service.usage[0]?.usedAt || null
    }));

    return NextResponse.json(transformedServices);
  } catch (error) {
    console.error('Error fetching popular services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}