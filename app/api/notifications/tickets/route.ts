import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const since = searchParams.get('since')
    
    if (!since) {
      return NextResponse.json({ error: 'Missing since parameter' }, { status: 400 })
    }

    const sinceDate = new Date(since)
    const events: any[] = []

    // Get user details for filtering
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        branchId: true, 
        role: true,
        supportGroupId: true
      }
    })

    // Check for new tickets (for managers in their branch)
    if (session.user.role === 'MANAGER' && userWithDetails?.branchId) {
      const newTickets = await prisma.ticket.findMany({
        where: {
          createdAt: { gt: sinceDate },
          branchId: userWithDetails.branchId,
          service: { requiresApproval: true },
          NOT: { createdById: session.user.id } // Don't notify about own tickets
        },
        include: {
          branch: { select: { name: true } },
          service: { select: { name: true } },
          approvals: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      // Only show tickets pending approval
      newTickets
        .filter(ticket => !ticket.approvals[0] || ticket.approvals[0].status === 'PENDING')
        .forEach(ticket => {
          events.push({
            id: `new-${ticket.id}`,
            type: 'NEW_TICKET',
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            branchName: ticket.branch?.name || 'Unknown',
            catalogName: ticket.service.name,
            timestamp: ticket.createdAt
          })
        })
    }

    // Check for approved tickets (for technicians)
    if (['TECHNICIAN', 'SECURITY_ANALYST', 'ADMIN'].includes(session.user.role || '')) {
      const approvedTickets = await prisma.ticketApproval.findMany({
        where: {
          createdAt: { gt: sinceDate },
          status: 'APPROVED'
        },
        include: {
          ticket: {
            include: {
              branch: { select: { name: true } },
              service: { select: { name: true } }
            }
          }
        }
      })

      approvedTickets.forEach(approval => {
        events.push({
          id: `approved-${approval.id}`,
          type: 'TICKET_APPROVED',
          ticketId: approval.ticketId,
          ticketNumber: approval.ticket.ticketNumber,
          branchName: approval.ticket.branch?.name,
          catalogName: approval.ticket.service.name,
          timestamp: approval.createdAt
        })
      })
    }

    // Check for claimed tickets (tickets that just got assigned)
    if (['MANAGER', 'ADMIN'].includes(session.user.role || '')) {
      const claimedTickets = await prisma.ticket.findMany({
        where: {
          updatedAt: { gt: sinceDate },
          assignedToId: { not: null },
          // Check if it was recently assigned (within last minute of update)
          AND: [
            { assignedToId: { not: null } },
            userWithDetails?.branchId ? { branchId: userWithDetails.branchId } : {}
          ]
        },
        include: {
          assignedTo: { select: { name: true } }
        }
      })

      // Filter to only recently claimed (rough check)
      claimedTickets.forEach(ticket => {
        // Check if assignment was recent by looking at audit logs or comments
        events.push({
          id: `claimed-${ticket.id}-${ticket.updatedAt.getTime()}`,
          type: 'TICKET_CLAIMED',
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          technicianName: ticket.assignedTo?.name,
          timestamp: ticket.updatedAt
        })
      })
    }

    // Check for status updates on tickets user is involved with
    const involvedTickets = await prisma.ticket.findMany({
      where: {
        updatedAt: { gt: sinceDate },
        OR: [
          { createdById: session.user.id },
          { assignedToId: session.user.id },
          userWithDetails?.branchId && session.user.role === 'MANAGER' 
            ? { branchId: userWithDetails.branchId } 
            : {}
        ].filter(Boolean)
      },
      include: {
        assignedTo: { select: { name: true } }
      }
    })

    // Look for status changes in audit logs
    for (const ticket of involvedTickets) {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entity: 'TICKET',
          entityId: ticket.id,
          action: { in: ['UPDATE', 'STATUS_UPDATE', 'CLAIMED', 'UNCLAIMED'] },
          createdAt: { gt: sinceDate }
        }
      })

      auditLogs.forEach(log => {
        // Check for status changes in newValues
        const newValues = log.newValues as any
        const oldValues = log.oldValues as any
        
        if (log.action === 'STATUS_UPDATE' || (newValues?.status && newValues.status !== oldValues?.status)) {
          events.push({
            id: `status-${log.id}`,
            type: 'STATUS_UPDATE',
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            status: newValues?.status || ticket.status,
            technicianName: newValues?.updatedBy || ticket.assignedTo?.name,
            timestamp: log.createdAt
          })
        }
      })
    }

    // Check for new comments on tickets user is involved with
    const newComments = await prisma.ticketComment.findMany({
      where: {
        createdAt: { gt: sinceDate },
        ticket: {
          OR: [
            { createdById: session.user.id },
            { assignedToId: session.user.id },
            userWithDetails?.branchId && session.user.role === 'MANAGER'
              ? { branchId: userWithDetails.branchId }
              : {}
          ].filter(Boolean)
        },
        NOT: { userId: session.user.id } // Don't notify about own comments
      },
      include: {
        user: { select: { name: true } },
        ticket: { select: { ticketNumber: true } }
      }
    })

    newComments.forEach(comment => {
      events.push({
        id: `comment-${comment.id}`,
        type: 'NEW_COMMENT',
        ticketId: comment.ticketId,
        ticketNumber: comment.ticket.ticketNumber,
        commentBy: comment.user.name,
        timestamp: comment.createdAt
      })
    })

    // Sort events by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}