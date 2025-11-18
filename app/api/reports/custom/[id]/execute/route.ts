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
    const body = await request.json()
    const { page = 1, pageSize = 1000, exportMode = false } = body

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

    // Debug logging
    console.log('Report configuration:', {
      columns: report.columns,
      filters: report.filters,
      groupBy: report.groupBy,
      orderBy: report.orderBy
    })

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
        results = await executeReportQuery(report, { page, pageSize, exportMode })
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
async function executeReportQuery(report: any, options: { page: number; pageSize: number; exportMode: boolean }) {
  const { module, columns, filters, groupBy, orderBy } = report

  // Build query based on module
  switch (module) {
    case 'TICKETS':
      return executeTicketsQuery(columns, filters, groupBy, orderBy, options)
    case 'TIME_SPENT':
      return executeTimeSpentQuery(columns, filters, groupBy, orderBy, options)
    case 'TASKS':
      return executeTasksQuery(columns, filters, groupBy, orderBy, options)
    default:
      throw new Error(`Unsupported module: ${module}`)
  }
}

async function executeTicketsQuery(
  columns: string[],
  filters: any[],
  groupBy: string[],
  orderBy: any,
  options: { page: number; pageSize: number; exportMode: boolean }
) {
  const { page, pageSize, exportMode } = options

  // Build where clause from filters
  const where = buildWhereClause(filters)

  // Check if custom fields are requested
  const customFieldColumns = columns.filter(col => col.startsWith('customField_'))
  const hasCustomFields = customFieldColumns.length > 0

  // Build select clause
  const select = columns.reduce((acc, col) => {
    // Skip custom field columns in select - we'll handle them separately
    if (col.startsWith('customField_')) {
      return acc
    }

    const parts = col.split('.')
    if (parts.length === 2) {
      // Nested relation (e.g., 'service.name', 'service.tier1Category.name')
      const [relation, field] = parts
      if (!acc[relation]) {
        acc[relation] = { select: {} }
      }
      acc[relation].select[field] = true
    } else if (parts.length === 3) {
      // Double nested (e.g., 'service.tier1Category.name')
      const [relation1, relation2, field] = parts
      if (!acc[relation1]) {
        acc[relation1] = { select: {} }
      }
      if (!acc[relation1].select[relation2]) {
        acc[relation1].select[relation2] = { select: {} }
      }
      acc[relation1].select[relation2].select[field] = true
    } else {
      // Direct field
      acc[col] = true
    }
    return acc
  }, {} as any)

  // Always include service relations if service hierarchy is requested
  if (columns.some(col => col.startsWith('service.tier') || col.startsWith('service.supportGroup'))) {
    if (!select.service) {
      select.service = { select: {} }
    }
    if (columns.some(col => col.includes('tier1Category'))) {
      select.service.select.tier1Category = { select: { id: true, name: true, code: true } }
    }
    if (columns.some(col => col.includes('tier2Subcategory'))) {
      select.service.select.tier2Subcategory = { select: { id: true, name: true, code: true } }
    }
    if (columns.some(col => col.includes('tier3Item'))) {
      select.service.select.tier3Item = { select: { id: true, name: true, code: true } }
    }
    if (columns.some(col => col.includes('supportGroup'))) {
      select.service.select.supportGroup = { select: { id: true, name: true, code: true } }
    }
  }

  // Calculate pagination
  const skip = exportMode ? 0 : (page - 1) * pageSize
  const take = exportMode ? undefined : pageSize

  // Build query - use include if custom fields are needed, otherwise use select
  let results: any[]

  if (hasCustomFields) {
    // When custom fields are needed, include fieldValues
    // Build the include object by converting select to include format
    const include: any = {
      fieldValues: {
        include: {
          field: true
        }
      }
    }

    // Add selected relations to include
    Object.keys(select).forEach(key => {
      if (typeof select[key] === 'object' && !['id', 'title', 'status', 'createdAt'].includes(key)) {
        // This is a relation, include it fully
        include[key] = true
      }
    })

    results = await prisma.ticket.findMany({
      where,
      include,
      orderBy: Object.entries(orderBy || {}).map(([field, direction]) => ({
        [field]: direction
      })),
      skip,
      take
    })
  } else {
    // When no custom fields, use select only
    results = await prisma.ticket.findMany({
      where,
      select: select.id ? select : { ...select, id: true },
      orderBy: Object.entries(orderBy || {}).map(([field, direction]) => ({
        [field]: direction
      })),
      skip,
      take
    })
  }

  // Flatten custom field values into results
  if (hasCustomFields) {
    return results.map(ticket => {
      const flattenedTicket: any = { ...ticket }

      // Add custom field values as top-level properties
      customFieldColumns.forEach(colName => {
        const fieldId = colName.replace('customField_', '')
        const fieldValue = ticket.fieldValues?.find((fv: any) => fv.fieldId === fieldId)

        if (fieldValue) {
          // Format value based on field type
          const value = formatCustomFieldValue(fieldValue.value, fieldValue.field.type)
          flattenedTicket[colName] = value
        } else {
          flattenedTicket[colName] = null
        }
      })

      // Remove fieldValues array from result
      delete flattenedTicket.fieldValues

      return flattenedTicket
    })
  }

  // If groupBy is specified, aggregate results
  if (groupBy && groupBy.length > 0) {
    return aggregateResults(results, groupBy, columns)
  }

  return results
}

async function executeTimeSpentQuery(
  columns: string[],
  filters: any[],
  groupBy: string[],
  orderBy: any,
  options: { page: number; pageSize: number; exportMode: boolean }
) {
  // Similar implementation for time spent module
  // This would query work logs or time tracking data
  return []
}

async function executeTasksQuery(
  columns: string[],
  filters: any[],
  groupBy: string[],
  orderBy: any,
  options: { page: number; pageSize: number; exportMode: boolean }
) {
  const { page, pageSize, exportMode } = options
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

  // Calculate pagination
  const skip = exportMode ? 0 : (page - 1) * pageSize
  const take = exportMode ? undefined : pageSize

  const results = await prisma.ticketTask.findMany({
    where,
    select: select.id ? select : { ...select, id: true },
    orderBy: Object.entries(orderBy || {}).map(([field, direction]) => ({
      [field]: direction
    })),
    skip,
    take
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

    // Handle service hierarchy filters
    if (column === 'serviceId') {
      return { serviceId: operator === 'in' ? { in: value } : value }
    }
    if (column === 'service.tier1CategoryId') {
      return { service: { tier1CategoryId: operator === 'in' ? { in: value } : value } }
    }
    if (column === 'service.tier2SubcategoryId') {
      return { service: { tier2SubcategoryId: operator === 'in' ? { in: value } : value } }
    }
    if (column === 'service.tier3ItemId') {
      return { service: { tier3ItemId: operator === 'in' ? { in: value } : value } }
    }
    if (column === 'service.supportGroupId') {
      return { service: { supportGroupId: operator === 'in' ? { in: value } : value } }
    }

    // Handle custom field filters
    if (column.startsWith('customField_')) {
      const fieldId = column.replace('customField_', '')
      return buildCustomFieldFilter(fieldId, operator, value)
    }

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

// Build custom field filter condition
function buildCustomFieldFilter(fieldId: string, operator: string, value: any) {
  switch (operator) {
    case 'equals':
      return {
        fieldValues: {
          some: {
            fieldId,
            value
          }
        }
      }
    case 'not_equals':
      return {
        fieldValues: {
          some: {
            fieldId,
            value: { not: value }
          }
        }
      }
    case 'contains':
      return {
        fieldValues: {
          some: {
            fieldId,
            value: { contains: value, mode: 'insensitive' }
          }
        }
      }
    case 'greater_than':
      return {
        fieldValues: {
          some: {
            fieldId,
            value: { gt: value }
          }
        }
      }
    case 'less_than':
      return {
        fieldValues: {
          some: {
            fieldId,
            value: { lt: value }
          }
        }
      }
    case 'in':
      return {
        fieldValues: {
          some: {
            fieldId,
            value: { in: Array.isArray(value) ? value : value.split(',').map((v: string) => v.trim()) }
          }
        }
      }
    case 'is_empty':
      return {
        NOT: {
          fieldValues: {
            some: { fieldId }
          }
        }
      }
    case 'is_not_empty':
      return {
        fieldValues: {
          some: { fieldId }
        }
      }
    default:
      return {}
  }
}

// Format custom field value based on type
function formatCustomFieldValue(value: string, fieldType: string): any {
  if (!value) return null

  try {
    switch (fieldType) {
      case 'NUMBER':
        return parseFloat(value)
      case 'DATE':
      case 'DATETIME':
        return new Date(value).toISOString()
      case 'CHECKBOX':
      case 'TOGGLE':
        return value === 'true' || value === '1'
      case 'MULTISELECT':
        return JSON.parse(value)
      default:
        return value
    }
  } catch {
    return value
  }
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