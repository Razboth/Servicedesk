import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reportSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['TABULAR', 'MATRIX', 'METRICS', 'QUERY']),
  module: z.string(),
  columns: z.array(z.string()),
  filters: z.array(z.any()),
  groupBy: z.array(z.string()).optional(),
  orderBy: z.record(z.string()).optional(),
  chartConfig: z.any().nullable(),
  query: z.string().optional(),
  schedule: z.any().nullable()
})

// GET /api/reports/custom - Get all custom reports for the user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reports = await prisma.customReport.findMany({
      where: {
        OR: [
          { createdBy: session.user.id },
          { isPublic: true }
        ]
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        schedules: {
          where: {
            isActive: true
          }
        },
        favorites: {
          where: {
            userId: session.user.id
          }
        },
        _count: {
          select: {
            executions: true,
            favorites: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Add isFavorite flag
    const reportsWithFavorites = reports.map(report => ({
      ...report,
      isFavorite: report.favorites.length > 0,
      favorites: undefined // Remove the favorites array from response
    }))

    return NextResponse.json(reportsWithFavorites)
  } catch (error) {
    console.error('Failed to fetch reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

// POST /api/reports/custom - Create a new custom report
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = reportSchema.parse(body)

    // Create the report
    const report = await prisma.customReport.create({
      data: {
        title: validatedData.title,
        type: validatedData.type as any,
        module: validatedData.module,
        configuration: {
          columns: validatedData.columns,
          filters: validatedData.filters,
          groupBy: validatedData.groupBy,
          orderBy: validatedData.orderBy,
          chartConfig: validatedData.chartConfig
        },
        columns: validatedData.columns,
        filters: validatedData.filters,
        groupBy: validatedData.groupBy || [],
        orderBy: validatedData.orderBy || {},
        chartConfig: validatedData.chartConfig,
        query: validatedData.query,
        createdBy: session.user.id,
        isPublic: false
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Create schedule if provided
    if (validatedData.schedule && validatedData.schedule.enabled) {
      const nextRunAt = validatedData.schedule.startDate 
        ? new Date(validatedData.schedule.startDate) 
        : new Date()
      
      await prisma.reportSchedule.create({
        data: {
          reportId: report.id,
          frequency: validatedData.schedule.frequency as any,
          scheduleTime: generateCronExpression(validatedData.schedule),
          nextRunAt: nextRunAt,
          format: (validatedData.schedule.format || 'PDF') as any,
          recipients: validatedData.schedule.recipients || [],
          emailSubject: validatedData.schedule.subject,
          emailBody: validatedData.schedule.message,
          isActive: true
        }
      })
    }

    // Log the report creation
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'CustomReport',
        entityId: report.id,
        newValues: {
          title: report.title,
          type: report.type,
          module: report.module
        }
      }
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to create report:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    )
  }
}

// Helper function to generate cron expression from schedule config
function generateCronExpression(schedule: any): string {
  const { frequency, time, daysOfWeek, dayOfMonth } = schedule
  const minutes = time?.minutes || 0
  const hours = time?.hours || 9

  switch (frequency) {
    case 'DAILY':
      return `${minutes} ${hours} * * *`
    case 'WEEKLY':
      const days = (daysOfWeek || []).sort().join(',') || '1'
      return `${minutes} ${hours} * * ${days}`
    case 'MONTHLY':
      return `${minutes} ${hours} ${dayOfMonth || 1} * *`
    case 'ONCE':
    default:
      return `${minutes} ${hours} * * *` // Default to daily
  }
}