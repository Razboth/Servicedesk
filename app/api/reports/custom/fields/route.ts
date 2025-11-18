import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/reports/custom/fields - Get custom fields for selected services
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const serviceIdsParam = searchParams.get('serviceIds')

    if (!serviceIdsParam) {
      return NextResponse.json({ error: 'serviceIds parameter is required' }, { status: 400 })
    }

    const serviceIds = serviceIdsParam.split(',').filter(Boolean)

    if (serviceIds.length === 0) {
      return NextResponse.json({ fields: [] })
    }

    // Fetch services with their field templates and direct fields
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        // Direct ServiceField fields
        fields: {
          where: {
            isActive: true,
            isUserVisible: true
          },
          select: {
            id: true,
            name: true,
            label: true,
            type: true,
            isRequired: true,
            placeholder: true,
            helpText: true,
            options: true
          },
          orderBy: { order: 'asc' }
        },
        // Template-based fields via ServiceFieldTemplate
        fieldTemplates: {
          where: {
            isUserVisible: true
          },
          select: {
            id: true,
            order: true,
            isRequired: true,
            fieldTemplate: {
              select: {
                id: true,
                name: true,
                label: true,
                type: true,
                placeholder: true,
                helpText: true,
                options: true
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    // Combine all fields from all services
    const allFields: any[] = []
    const seenFieldIds = new Set<string>()

    services.forEach(service => {
      // Add direct ServiceField fields
      service.fields.forEach(field => {
        if (!seenFieldIds.has(field.id)) {
          allFields.push({
            id: field.id,
            name: field.name,
            label: field.label,
            type: field.type,
            isRequired: field.isRequired,
            placeholder: field.placeholder,
            helpText: field.helpText,
            options: field.options,
            serviceName: service.name,
            serviceId: service.id,
            source: 'direct'
          })
          seenFieldIds.add(field.id)
        }
      })

      // Add template-based fields
      service.fieldTemplates.forEach(sft => {
        const templateField = sft.fieldTemplate
        if (!seenFieldIds.has(templateField.id)) {
          allFields.push({
            id: templateField.id,
            name: templateField.name,
            label: templateField.label,
            type: templateField.type,
            isRequired: sft.isRequired ?? templateField.isRequired,
            placeholder: templateField.placeholder,
            helpText: templateField.helpText,
            options: templateField.options,
            serviceName: service.name,
            serviceId: service.id,
            source: 'template'
          })
          seenFieldIds.add(templateField.id)
        }
      })
    })

    // Sort fields by service name then label
    allFields.sort((a, b) => {
      const serviceCompare = a.serviceName.localeCompare(b.serviceName)
      if (serviceCompare !== 0) return serviceCompare
      return a.label.localeCompare(b.label)
    })

    return NextResponse.json({
      fields: allFields,
      count: allFields.length,
      serviceCount: services.length
    })
  } catch (error) {
    console.error('Failed to fetch custom fields:', error)
    return NextResponse.json(
      { error: 'Failed to fetch custom fields', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}
