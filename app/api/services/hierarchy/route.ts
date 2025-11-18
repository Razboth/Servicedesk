import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/services/hierarchy - Get full service category hierarchy with counts
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all tier 1 categories with their relationships
    const tier1Categories = await prisma.serviceCategory.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        subcategories: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            items: {
              where: {
                isActive: true
              },
              select: {
                id: true,
                name: true,
                code: true,
                description: true
              },
              orderBy: { name: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Get service counts for each level
    const services = await prisma.service.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        tier1CategoryId: true,
        tier2SubcategoryId: true,
        tier3ItemId: true
      }
    })

    // Build hierarchical structure with counts
    const hierarchy = tier1Categories.map(category => {
      // Count services in this tier 1 category
      const categoryServiceCount = services.filter(
        s => s.tier1CategoryId === category.id
      ).length

      return {
        id: category.id,
        name: category.name,
        code: category.code,
        description: category.description,
        level: 1,
        serviceCount: categoryServiceCount,
        subcategories: category.subcategories.map(subcategory => {
          // Count services in this tier 2 subcategory
          const subcategoryServiceCount = services.filter(
            s => s.tier2SubcategoryId === subcategory.id
          ).length

          return {
            id: subcategory.id,
            name: subcategory.name,
            code: subcategory.code,
            description: subcategory.description,
            level: 2,
            serviceCount: subcategoryServiceCount,
            items: subcategory.items.map(item => {
              // Count services in this tier 3 item
              const itemServiceCount = services.filter(
                s => s.tier3ItemId === item.id
              ).length

              return {
                id: item.id,
                name: item.name,
                code: item.code,
                description: item.description,
                level: 3,
                serviceCount: itemServiceCount
              }
            })
          }
        })
      }
    })

    // Calculate total counts
    const totalCategories = tier1Categories.length
    const totalSubcategories = tier1Categories.reduce(
      (sum, cat) => sum + cat.subcategories.length,
      0
    )
    const totalItems = tier1Categories.reduce(
      (sum, cat) =>
        sum +
        cat.subcategories.reduce((subSum, sub) => subSum + sub.items.length, 0),
      0
    )

    return NextResponse.json({
      hierarchy,
      metadata: {
        totalCategories,
        totalSubcategories,
        totalItems,
        totalServices: services.length
      }
    })
  } catch (error) {
    console.error('Failed to fetch service hierarchy:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch service hierarchy',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
