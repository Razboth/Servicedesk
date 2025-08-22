import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, subWeeks, subQuarters, subYears } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month'
    const department = searchParams.get('department') || 'all'

    // Calculate date range based on period
    let startDate: Date
    let endDate = new Date()
    
    switch (period) {
      case 'week':
        startDate = subWeeks(endDate, 1)
        break
      case 'quarter':
        startDate = subQuarters(endDate, 1)
        break
      case 'year':
        startDate = subYears(endDate, 1)
        break
      default: // month
        startDate = subMonths(endDate, 1)
    }

    // Build where clause
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }

    // Add department filter if specified
    if (department !== 'all') {
      const users = await prisma.user.findMany({
        where: { 
          branch: {
            name: {
              contains: department,
              mode: 'insensitive'
            }
          }
        },
        select: { id: true }
      })
      whereClause.createdById = {
        in: users.map(u => u.id)
      }
    }

    // Get status distribution
    const statusCounts = await prisma.ticket.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        status: true
      }
    })

    // Get total count
    const totalCount = await prisma.ticket.count({
      where: whereClause
    })

    // Calculate trends (compare with previous period)
    const prevStartDate = subMonths(startDate, 1)
    const prevEndDate = startDate

    const prevStatusCounts = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        ...whereClause,
        createdAt: {
          gte: prevStartDate,
          lt: prevEndDate
        }
      },
      _count: {
        status: true
      }
    })

    // Map status colors
    const statusColors: Record<string, string> = {
      OPEN: '#eab308',
      IN_PROGRESS: '#3b82f6',
      RESOLVED: '#10b981',
      CLOSED: '#22c55e',
      ON_HOLD: '#f97316',
      CANCELLED: '#ef4444'
    }

    // Format status data
    const statusData = statusCounts.map(item => {
      const prevCount = prevStatusCounts.find(p => p.status === item.status)?._count?.status || 0
      const currentCount = item._count.status
      const trend = prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : 0
      
      return {
        status: item.status,
        count: currentCount,
        percentage: (currentCount / totalCount) * 100,
        color: statusColors[item.status] || '#6b7280',
        trend: Number(trend.toFixed(1))
      }
    })

    // Get trend data for the last 6 months
    const trendData = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i))
      const monthEnd = endOfMonth(subMonths(new Date(), i))
      
      const monthCounts = await prisma.ticket.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        _count: {
          status: true
        }
      })

      const monthData: any = {
        date: monthStart.toISOString().slice(0, 7) // YYYY-MM format
      }

      // Initialize all statuses with 0
      Object.keys(statusColors).forEach(status => {
        monthData[status] = 0
      })

      // Fill in actual counts
      monthCounts.forEach(item => {
        monthData[item.status] = item._count.status
      })

      trendData.push(monthData)
    }

    return NextResponse.json({
      statusData,
      trendData,
      summary: {
        total: totalCount,
        period,
        department
      }
    })
  } catch (error) {
    console.error('Failed to fetch status report data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report data' },
      { status: 500 }
    )
  }
}