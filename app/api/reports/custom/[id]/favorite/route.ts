import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/reports/custom/[id]/favorite - Add report to favorites
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if report exists
    const report = await prisma.customReport.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        isPublic: true,
        createdBy: true
      }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Check access
    if (!report.isPublic && report.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if already favorited
    const existing = await prisma.reportFavorite.findUnique({
      where: {
        reportId_userId: {
          reportId: params.id,
          userId: session.user.id
        }
      }
    })

    if (existing) {
      return NextResponse.json({ message: 'Already in favorites' }, { status: 200 })
    }

    // Add to favorites
    const favorite = await prisma.reportFavorite.create({
      data: {
        reportId: params.id,
        userId: session.user.id
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'ReportFavorite',
        entityId: favorite.id,
        details: `Added report ${report.title} to favorites`
      }
    })

    return NextResponse.json(favorite, { status: 201 })
  } catch (error) {
    console.error('Failed to add favorite:', error)
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    )
  }
}

// DELETE /api/reports/custom/[id]/favorite - Remove report from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find and delete favorite
    const favorite = await prisma.reportFavorite.findUnique({
      where: {
        reportId_userId: {
          reportId: params.id,
          userId: session.user.id
        }
      }
    })

    if (!favorite) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 })
    }

    await prisma.reportFavorite.delete({
      where: {
        id: favorite.id
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'ReportFavorite',
        entityId: favorite.id,
        details: `Removed report from favorites`
      }
    })

    return NextResponse.json({ message: 'Removed from favorites' })
  } catch (error) {
    console.error('Failed to remove favorite:', error)
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    )
  }
}