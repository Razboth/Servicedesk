import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, checkApiPermission, createApiErrorResponse, createApiSuccessResponse } from '@/lib/auth-api'

export async function GET(request: NextRequest) {
  try {
    // Check API key authentication
    const authResult = await authenticateApiKey(request)
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401)
    }

    // Check permission for reading tickets
    if (!checkApiPermission(authResult.apiKey!, 'tickets:read')) {
      return createApiErrorResponse('Insufficient permissions to read ticket status', 403)
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const ticketNumber = searchParams.get('ticketNumber')
    const ticketId = searchParams.get('ticketId')
    const includeDetails = searchParams.get('includeDetails') === 'true'
    const includeComments = searchParams.get('includeComments') === 'true'
    const includeAttachments = searchParams.get('includeAttachments') === 'true'
    const includeFieldValues = searchParams.get('includeFieldValues') === 'true'

    // Validate that at least one identifier is provided
    if (!ticketNumber && !ticketId) {
      return createApiErrorResponse('Either ticketNumber or ticketId must be provided', 400)
    }

    // Build where clause
    const where = ticketNumber 
      ? { ticketNumber: ticketNumber }
      : { id: ticketId! }

    // Build include clause based on query params
    const include: any = {
      service: {
        select: {
          name: true,
          slaHours: true,
          responseHours: true,
          resolutionHours: true
        }
      },
      createdBy: {
        select: {
          name: true,
          email: true
        }
      },
      assignedTo: {
        select: {
          name: true,
          email: true
        }
      },
      branch: {
        select: {
          name: true,
          code: true
        }
      },
      supportGroup: {
        select: {
          name: true,
          code: true
        }
      }
    }

    // Add optional includes
    if (includeComments) {
      include.comments = {
        orderBy: { createdAt: 'desc' },
        take: 10, // Limit to last 10 comments
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }
    }

    if (includeAttachments) {
      include.attachments = {
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          createdAt: true
        }
      }
    }

    if (includeFieldValues) {
      include.fieldValues = {
        include: {
          field: {
            select: {
              name: true,
              label: true,
              type: true
            }
          }
        }
      }
    }

    // Fetch ticket
    const ticket = await prisma.ticket.findUnique({
      where,
      include
    })

    if (!ticket) {
      return createApiErrorResponse('Ticket not found', 404)
    }

    // Calculate SLA status
    const now = new Date()
    const createdAt = new Date(ticket.createdAt)
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    
    const serviceData = ticket.service as any
    const slaStatus = {
      hoursElapsed: Math.round(hoursElapsed * 100) / 100,
      responseDeadline: serviceData?.responseHours ? 
        new Date(createdAt.getTime() + (serviceData.responseHours * 60 * 60 * 1000)) : null,
      resolutionDeadline: serviceData?.resolutionHours ? 
        new Date(createdAt.getTime() + (serviceData.resolutionHours * 60 * 60 * 1000)) : null,
      isResponseBreached: serviceData?.responseHours ? 
        hoursElapsed > serviceData.responseHours : false,
      isResolutionBreached: serviceData?.resolutionHours ? 
        hoursElapsed > serviceData.resolutionHours && !ticket.resolvedAt : false
    }

    // Build response based on detail level
    if (!includeDetails) {
      // Simple status response
      return createApiSuccessResponse({
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        priority: ticket.priority,
        title: ticket.title,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
        assignedTo: ticket.assignedTo ? {
          name: (ticket.assignedTo as any).name,
          email: (ticket.assignedTo as any).email
        } : null,
        branch: {
          name: (ticket.branch as any).name,
          code: (ticket.branch as any).code
        },
        slaStatus
      })
    }

    // Full details response
    return createApiSuccessResponse({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        priority: ticket.priority,
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        issueClassification: ticket.issueClassification,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
        resolutionNotes: ticket.resolutionNotes,
        service: ticket.service,
        createdBy: ticket.createdBy,
        assignedTo: ticket.assignedTo,
        branch: ticket.branch,
        supportGroup: ticket.supportGroup,
        fieldValues: includeFieldValues ? ticket.fieldValues : undefined,
        comments: includeComments ? ticket.comments : undefined,
        attachments: includeAttachments ? ticket.attachments : undefined
      },
      slaStatus
    })

  } catch (error) {
    console.error('Error fetching ticket status:', error)
    return createApiErrorResponse(
      error instanceof Error ? error.message : 'Failed to fetch ticket status',
      500
    )
  }
}

// GET endpoint to fetch multiple tickets status
export async function POST(request: NextRequest) {
  try {
    // Check API key authentication
    const authResult = await authenticateApiKey(request)
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401)
    }

    // Check permission for reading tickets
    if (!checkApiPermission(authResult.apiKey!, 'tickets:read')) {
      return createApiErrorResponse('Insufficient permissions to read ticket status', 403)
    }

    const body = await request.json()
    const { ticketNumbers, ticketIds, statuses, branchCode, dateFrom, dateTo, limit = 50 } = body

    // Build where clause
    const where: any = {}
    
    if (ticketNumbers && Array.isArray(ticketNumbers)) {
      where.ticketNumber = { in: ticketNumbers }
    }
    
    if (ticketIds && Array.isArray(ticketIds)) {
      where.id = { in: ticketIds }
    }
    
    if (statuses && Array.isArray(statuses)) {
      where.status = { in: statuses }
    }
    
    if (branchCode) {
      where.branch = { code: branchCode }
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    // Fetch tickets
    const tickets = await prisma.ticket.findMany({
      where,
      take: Math.min(limit, 100), // Max 100 tickets
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        closedAt: true,
        service: {
          select: {
            name: true,
            responseHours: true,
            resolutionHours: true
          }
        },
        assignedTo: {
          select: {
            name: true,
            email: true
          }
        },
        branch: {
          select: {
            name: true,
            code: true
          }
        }
      }
    })

    // Calculate SLA status for each ticket
    const ticketsWithSla = tickets.map(ticket => {
      const now = new Date()
      const createdAt = new Date(ticket.createdAt)
      const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      
      const serviceInfo = ticket.service as any
      return {
        ...ticket,
        slaStatus: {
          hoursElapsed: Math.round(hoursElapsed * 100) / 100,
          isResponseBreached: serviceInfo?.responseHours ? 
            hoursElapsed > serviceInfo.responseHours : false,
          isResolutionBreached: serviceInfo?.resolutionHours ? 
            hoursElapsed > serviceInfo.resolutionHours && !ticket.resolvedAt : false
        }
      }
    })

    // Summary statistics
    const summary = {
      total: ticketsWithSla.length,
      byStatus: tickets.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byPriority: tickets.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      slaBreached: ticketsWithSla.filter(t => 
        t.slaStatus.isResponseBreached || t.slaStatus.isResolutionBreached
      ).length
    }

    return createApiSuccessResponse({
      tickets: ticketsWithSla,
      summary
    })

  } catch (error) {
    console.error('Error fetching tickets status:', error)
    return createApiErrorResponse(
      error instanceof Error ? error.message : 'Failed to fetch tickets status',
      500
    )
  }
}