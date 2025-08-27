import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/reports/templates - Get all report templates
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get report templates grouped by service
    const templates = await prisma.reportTemplate.findMany({
      where: {
        isActive: true
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            categoryId: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Group templates by service category
    const groupedTemplates = templates.reduce((acc, template) => {
      const category = template.category || 'General'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(template)
      return acc
    }, {} as Record<string, typeof templates>)

    return NextResponse.json(groupedTemplates)
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST /api/reports/templates - Create a new report template
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, category, serviceId, baseQuery, availableFields, defaultFilters } = body

    const template = await prisma.reportTemplate.create({
      data: {
        name,
        description,
        category,
        serviceId,
        baseQuery,
        availableFields,
        defaultFilters,
        isActive: true
      },
      include: {
        service: true
      }
    })

    // Log the template creation
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'ReportTemplate',
        entityId: template.id,
        newValues: {
          description: `Created report template: ${template.name}`,
          name: template.name
        }
      }
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Failed to create template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}