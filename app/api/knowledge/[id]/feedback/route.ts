import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const feedbackSchema = z.object({
  type: z.enum(['helpful', 'not-helpful'])
})

// POST: Submit feedback for an article
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type } = feedbackSchema.parse(body)

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
        { error: 'Cannot provide feedback for this article' },
        { status: 403 }
      )
    }

    // Check if user has already provided feedback
    const existingFeedback = await prisma.knowledgeFeedback.findUnique({
      where: {
        articleId_userId: {
          articleId: id,
          userId: session.user.id
        }
      }
    })

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'You have already provided feedback for this article' },
        { status: 400 }
      )
    }

    // Create feedback record
    await prisma.knowledgeFeedback.create({
      data: {
        articleId: id,
        userId: session.user.id,
        isHelpful: type === 'helpful'
      }
    })

    // Update article counters
    const updateData = type === 'helpful' 
      ? { helpful: { increment: 1 } }
      : { notHelpful: { increment: 1 } }

    await prisma.knowledgeArticle.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ message: 'Feedback submitted successfully' })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error submitting feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}