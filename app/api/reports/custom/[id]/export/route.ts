import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/export-utils'

// POST /api/reports/custom/[id]/export - Export report data
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { format, data } = body

    if (!format || !data) {
      return NextResponse.json(
        { error: 'Format and data are required' },
        { status: 400 }
      )
    }

    // Get report details
    const report = await prisma.customReport.findUnique({
      where: { id: params.id },
      select: {
        title: true,
        description: true,
        columns: true,
        createdBy: true,
        isPublic: true
      }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Check access
    if (!report.isPublic && report.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const timestamp = new Date().toISOString().slice(0, 10)
    const baseFileName = `${report.title.replace(/\s+/g, '_')}_${timestamp}`

    // Log the export
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'EXPORT',
        entity: 'CustomReport',
        entityId: params.id,
        details: `Exported report ${report.title} as ${format}`
      }
    })

    switch (format.toUpperCase()) {
      case 'CSV':
        // Use client-side export utility pattern
        return NextResponse.json({
          data,
          columns: report.columns,
          format: 'CSV',
          filename: `${baseFileName}.csv`
        })

      case 'EXCEL':
        // Use client-side export utility pattern
        return NextResponse.json({
          data,
          columns: report.columns,
          format: 'EXCEL',
          filename: `${baseFileName}.xlsx`,
          metadata: {
            title: report.title,
            description: report.description || '',
            generatedBy: session.user.name || session.user.email,
            generatedAt: new Date().toISOString()
          }
        })

      case 'PDF':
        // Use client-side export utility pattern
        return NextResponse.json({
          data,
          columns: report.columns,
          format: 'PDF',
          filename: `${baseFileName}.pdf`,
          metadata: {
            title: report.title,
            description: report.description || '',
            generatedBy: session.user.name || session.user.email,
            generatedAt: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Failed to export report:', error)
    return NextResponse.json(
      { error: 'Failed to export report' },
      { status: 500 }
    )
  }
}