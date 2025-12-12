/**
 * Dashboard Database Queries
 *
 * This module provides isolated database query functions for the dashboard API.
 * Each function is explicitly named to prevent webpack minification collisions.
 *
 * IMPORTANT: Do NOT destructure results from these functions in Promise.all arrays.
 * Always access properties directly from the returned object to avoid webpack name collisions.
 */

import prisma from '@/lib/prisma';

/**
 * Query wrapper that returns results in a named object to prevent destructuring collisions
 */
interface QueryResult<T> {
  data: T;
}

export async function countTotalTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countOpenTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countInProgressTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countResolvedTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countClosedTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countUrgentTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countHighPriorityTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countThisMonthTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countLastMonthTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countThisWeekTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countLastWeekTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countResolvedThisMonth(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countMyOpenTickets(userId: string): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({
    where: {
      assignedToId: userId,
      status: { in: ['OPEN', 'IN_PROGRESS'] }
    }
  });
  return { data };
}

export async function countMyAssignedTickets(userId: string): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({
    where: { assignedToId: userId }
  });
  return { data };
}

export async function countPendingApprovals(userId: string): Promise<QueryResult<number>> {
  const data = await prisma.approval.count({
    where: {
      approverId: userId,
      status: 'PENDING'
    }
  });
  return { data };
}

export async function findRecentTickets(filter: any, limit: number): Promise<QueryResult<any[]>> {
  const data = await prisma.ticket.findMany({
    where: Object.keys(filter).length > 0 ? filter : undefined,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      service: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      assignedTo: { select: { name: true, email: true } },
      branch: { select: { name: true, code: true } }
    }
  });
  return { data };
}

export async function countBranchUsers(branchId: string): Promise<QueryResult<number>> {
  const data = await prisma.user.count({
    where: { branchId: branchId, isActive: true }
  });
  return { data };
}

export async function countBranchATMs(branchId: string): Promise<QueryResult<number>> {
  const data = await prisma.aTM.count({
    where: { branchId: branchId }
  });
  return { data };
}

export async function countATMAlerts(branchId: string): Promise<QueryResult<number>> {
  const data = await prisma.aTMAlert.count({
    where: {
      atm: { branchId: branchId },
      resolvedAt: null
    }
  });
  return { data };
}

export async function countTotalUsers(): Promise<QueryResult<number>> {
  const data = await prisma.user.count({ where: { isActive: true } });
  return { data };
}

export async function countTotalBranches(): Promise<QueryResult<number>> {
  const data = await prisma.branch.count({ where: { isActive: true } });
  return { data };
}

export async function countNetworkIncidents(): Promise<QueryResult<number>> {
  const data = await prisma.networkIncident.count({
    where: { resolvedAt: null }
  });
  return { data };
}

export async function countATMDowntime(): Promise<QueryResult<number>> {
  const data = await prisma.aTM.count({
    where: { status: { in: ['DOWN', 'CRITICAL'] } }
  });
  return { data };
}

export async function countInfrastructureAlerts(): Promise<QueryResult<number>> {
  const data = await prisma.aTMAlert.count({
    where: { resolvedAt: null }
  });
  return { data };
}

export async function countMySubmittedTickets(userId: string): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({
    where: { createdById: userId }
  });
  return { data };
}

export async function countMyPendingTickets(userId: string): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({
    where: {
      createdById: userId,
      status: { in: ['OPEN', 'IN_PROGRESS'] }
    }
  });
  return { data };
}

export async function countMyResolvedTickets(userId: string): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({
    where: {
      createdById: userId,
      status: { in: ['RESOLVED', 'CLOSED'] }
    }
  });
  return { data };
}

export async function findResolvedTicketsWithTime(filter: any, limit: number): Promise<QueryResult<any[]>> {
  const data = await prisma.ticket.findMany({
    where: filter,
    select: {
      createdAt: true,
      resolvedAt: true
    },
    take: limit
  });
  return { data };
}

export async function countBreachedTickets(filter: any): Promise<QueryResult<number>> {
  const data = await prisma.ticket.count({ where: filter });
  return { data };
}

export async function countActiveUsers(thirtyDaysAgo: Date): Promise<QueryResult<number>> {
  const data = await prisma.user.count({
    where: {
      createdTickets: {
        some: { createdAt: { gte: thirtyDaysAgo } }
      }
    }
  });
  return { data };
}
