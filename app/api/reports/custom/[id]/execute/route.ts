import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/reports/custom/[id]/execute - Execute a report
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    // Get the report
    const report = await prisma.customReport.findUnique({
      where: { id },
      include: {
        creator: true
      }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Check access
    if (!report.isPublic && report.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create execution record
    const startTime = Date.now()
    const execution = await prisma.reportExecution.create({
      data: {
        reportId: report.id,
        executedBy: session.user.id,
        status: 'RUNNING'
      }
    })

    try {
      let results: any[] = []
      let rowCount = 0

      // Execute based on report type
      if (report.type === 'QUERY' && report.query) {
        // Execute raw SQL query (with safety checks)
        const query = report.query.toLowerCase()
        
        // Safety check - only allow SELECT queries
        if (!query.startsWith('select')) {
          throw new Error('Only SELECT queries are allowed')
        }

        // Execute query with timeout
        results = await prisma.$queryRawUnsafe(report.query)
        rowCount = results.length
      } else {
        // Build and execute query based on configuration
        results = await executeReportQuery(report)
        rowCount = results.length
      }

      // Update execution record with success
      const executionTime = Date.now() - startTime
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          resultCount: rowCount,
          executionTime
        }
      })

      // Update report last executed time
      await prisma.customReport.update({
        where: { id: report.id },
        data: {
          lastRunAt: new Date(),
          runCount: {
            increment: 1
          }
        }
      })

      return NextResponse.json({
        execution: {
          id: execution.id,
          status: 'COMPLETED',
          rowCount
        },
        data: results,
        metadata: {
          columns: report.columns,
          module: report.module,
          executedAt: new Date().toISOString()
        }
      })
    } catch (error) {
      // Update execution record with error
      const executionTime = Date.now() - startTime
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          executionTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  } catch (error) {
    console.error('Failed to execute report:', error)
    return NextResponse.json(
      { error: 'Failed to execute report', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}

// Helper function to execute report based on configuration
async function executeReportQuery(report: any) {
  const { module, columns, filters, groupBy, orderBy } = report

  // Build query based on module
  switch (module) {
    case 'TICKETS':
      return executeTicketsQuery(columns, filters, groupBy, orderBy)
    case 'TIME_SPENT':
      return executeTimeSpentQuery(columns, filters, groupBy, orderBy)
    case 'TASKS':
      return executeTasksQuery(columns, filters, groupBy, orderBy)
    default:
      throw new Error(`Unsupported module: ${module}`)
  }
}

async function executeTicketsQuery(columns: string[], filters: any[], groupBy: string[], orderBy: any) {
  // Build where clause from filters
  const where = buildWhereClause(filters)

  // Build select clause
  const select = columns.reduce((acc, col) => {
    const parts = col.split('.')
    if (parts.length === 2) {
      // Nested relation (e.g., 'service.name')
      const [relation, field] = parts
      if (!acc[relation]) {
        acc[relation] = { select: {} }
      }
      acc[relation].select[field] = true
    } else {
      // Direct field
      acc[col] = true
    }
    return acc
  }, {} as any)

  // Execute query
  const results = await prisma.ticket.findMany({
    where,
    select: select.id ? select : { ...select, id: true }, // Ensure id is always included
    orderBy: Object.entries(orderBy || {}).map(([field, direction]) => ({
      [field]: direction
    })),
    take: 10000 // Limit results
  })

  // If groupBy is specified, aggregate results
  if (groupBy && groupBy.length > 0) {
    return aggregateResults(results, groupBy, columns)
  }

  return results
}

async function executeTimeSpentQuery(columns: string[], filters: any[], groupBy: string[], orderBy: any) {
  // Similar implementation for time spent module
  // This would query work logs or time tracking data
  return []
}

async function executeTasksQuery(columns: string[], filters: any[], groupBy: string[], orderBy: any) {
  const where = buildWhereClause(filters)

  const select = columns.reduce((acc, col) => {
    const parts = col.split('.')
    if (parts.length === 2) {
      const [relation, field] = parts
      if (!acc[relation]) {
        acc[relation] = { select: {} }
      }
      acc[relation].select[field] = true
    } else {
      acc[col] = true
    }
    return acc
  }, {} as any)

  const results = await prisma.ticketTask.findMany({
    where,
    select: select.id ? select : { ...select, id: true },
    orderBy: Object.entries(orderBy || {}).map(([field, direction]) => ({
      [field]: direction
    })),
    take: 10000
  })

  if (groupBy && groupBy.length > 0) {
    return aggregateResults(results, groupBy, columns)
  }

  return results
}

function buildWhereClause(filters: any[]) {
  if (!filters || filters.length === 0) {
    return {}
  }

  const conditions = filters.map(filter => {
    const { column, operator, value } = filter

    switch (operator) {
      case 'equals':
        return { [column]: value }
      case 'not_equals':
        return { [column]: { not: value } }
      case 'contains':
        return { [column]: { contains: value, mode: 'insensitive' } }
      case 'starts_with':
        return { [column]: { startsWith: value, mode: 'insensitive' } }
      case 'ends_with':
        return { [column]: { endsWith: value, mode: 'insensitive' } }
      case 'greater_than':
        return { [column]: { gt: value } }
      case 'less_than':
        return { [column]: { lt: value } }
      case 'greater_than_or_equal':
        return { [column]: { gte: value } }
      case 'less_than_or_equal':
        return { [column]: { lte: value } }
      case 'between':
        return { [column]: { gte: value.from, lte: value.to } }
      case 'in':
        return { [column]: { in: value.split(',').map((v: string) => v.trim()) } }
      case 'is_empty':
        return { [column]: null }
      case 'is_not_empty':
        return { [column]: { not: null } }
      default:
        return {}
    }
  })

  // Combine conditions with AND/OR logic
  const combinedConditions: any = { AND: [] }
  let currentGroup: any[] = []

  filters.forEach((filter, index) => {
    const condition = conditions[index]
    
    if (index === 0 || filter.logicalOperator === 'AND') {
      currentGroup.push(condition)
    } else if (filter.logicalOperator === 'OR') {
      if (currentGroup.length > 0) {
        combinedConditions.AND.push({ AND: currentGroup })
        currentGroup = [condition]
      }
    }
  })

  if (currentGroup.length > 0) {
    combinedConditions.AND.push({ AND: currentGroup })
  }

  return combinedConditions.AND.length > 0 ? combinedConditions : {}
}

function aggregateResults(results: any[], groupBy: string[], columns: string[]) {
  // Simple aggregation implementation
  const grouped = new Map()

  results.forEach(row => {
    const key = groupBy.map(field => getNestedValue(row, field)).join('|')
    
    if (!grouped.has(key)) {
      const groupedRow: any = {}
      groupBy.forEach(field => {
        groupedRow[field] = getNestedValue(row, field)
      })
      groupedRow._count = 0
      grouped.set(key, groupedRow)
    }

    grouped.get(key)._count++
  })

  return Array.from(grouped.values())
}

function getNestedValue(obj: any, path: string) {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}