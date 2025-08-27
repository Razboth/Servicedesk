import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/reports/custom/[id]/share - Toggle report sharing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { isPublic, sharedWith } = body

    // Get the report
    const report = await prisma.customReport.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        createdBy: true,
        isPublic: true
      }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Only creator can change sharing settings
    if (report.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Only the creator can change sharing settings' }, { status: 403 })
    }

    // Update sharing settings
    const updated = await prisma.customReport.update({
      where: { id },
      data: {
        isPublic: isPublic !== undefined ? isPublic : report.isPublic
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'CustomReport',
        entityId: id,
        newValues: {
          description: `Updated sharing settings for report ${report.title}: isPublic=${isPublic}`,
          title: report.title,
          isPublic: isPublic
        }
      }
    })

    return NextResponse.json({
      id: updated.id,
      isPublic: updated.isPublic
    })
  } catch (error) {
    console.error('Failed to update sharing:', error)
    return NextResponse.json(
      { error: 'Failed to update sharing settings' },
      { status: 500 }
    )
  }
}

// GET /api/reports/custom/[id]/share - Get sharing settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const report = await prisma.customReport.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        isPublic: true,
        createdBy: true,
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Check access
    const hasAccess = report.isPublic || report.createdBy === session.user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      ...report,
      canEdit: report.createdBy === session.user.id
    })
  } catch (error) {
    console.error('Failed to get sharing settings:', error)
    return NextResponse.json(
      { error: 'Failed to get sharing settings' },
      { status: 500 }
    )
  }
}