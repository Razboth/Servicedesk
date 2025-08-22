import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

// GET: Download attachment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params
    const session = await auth()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if article exists and user can access it
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: { id: true, status: true, authorId: true }
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Knowledge article not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    if (article.status !== 'PUBLISHED' && 
        session.user.role === 'USER' &&
        article.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Cannot access attachments for this article' },
        { status: 403 }
      )
    }

    // Get attachment info
    const attachment = await prisma.knowledgeAttachment.findUnique({
      where: { 
        id: attachmentId,
        articleId: id
      }
    })

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Check if file exists
    const filePath = join(process.cwd(), attachment.path)
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      )
    }

    // Read file
    const fileBuffer = await readFile(filePath)

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${attachment.originalName}"`,
        'Content-Length': attachment.size.toString()
      }
    })

  } catch (error) {
    console.error('Error downloading attachment:', error)
    return NextResponse.json(
      { error: 'Failed to download attachment' },
      { status: 500 }
    )
  }
}