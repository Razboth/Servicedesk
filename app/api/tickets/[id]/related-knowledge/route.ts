import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch related knowledge articles for a ticket
export async function GET(
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

    // First, fetch the ticket to get its category IDs
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        categoryId: true,
        subcategoryId: true,
        itemId: true,
        serviceId: true,
        service: {
          select: {
            categoryId: true,
            subcategoryId: true,
            itemId: true
          }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Get category IDs from ticket or fall back to service categories
    const categoryId = ticket.categoryId || ticket.service?.categoryId
    const subcategoryId = ticket.subcategoryId || ticket.service?.subcategoryId
    const itemId = ticket.itemId || ticket.service?.itemId

    // Build the query for related articles
    const whereConditions = []

    // Only show published articles to regular users
    const baseCondition: any = {
      isActive: true
    }

    if (session.user.role === 'USER') {
      baseCondition.status = 'PUBLISHED'
    } else {
      // For other roles, show published and under review
      baseCondition.OR = [
        { status: 'PUBLISHED' },
        { status: 'UNDER_REVIEW' }
      ]
    }

    // Priority 1: Exact match (same item)
    if (itemId) {
      whereConditions.push({
        ...baseCondition,
        itemId: itemId
      })
    }

    // Priority 2: Same subcategory
    if (subcategoryId) {
      whereConditions.push({
        ...baseCondition,
        subcategoryId: subcategoryId,
        itemId: null // Articles at subcategory level
      })
    }

    // Priority 3: Same category
    if (categoryId) {
      whereConditions.push({
        ...baseCondition,
        categoryId: categoryId,
        subcategoryId: null, // Articles at category level
        itemId: null
      })
    }

    // Fetch articles with different priority levels
    const articlesByPriority = await Promise.all(
      whereConditions.map(condition =>
        prisma.knowledgeArticle.findMany({
          where: condition,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true
              }
            },
            category: {
              select: { id: true, name: true }
            },
            subcategory: {
              select: { id: true, name: true }
            },
            item: {
              select: { id: true, name: true }
            },
            _count: {
              select: {
                comments: true,
                attachments: true,
                versions: true
              }
            }
          },
          orderBy: [
            { views: 'desc' },
            { helpful: 'desc' },
            { updatedAt: 'desc' }
          ],
          take: 5 // Limit to 5 articles per priority level
        })
      )
    )

    // Flatten and deduplicate articles
    const allArticles = articlesByPriority.flat()
    const uniqueArticles = Array.from(
      new Map(allArticles.map(article => [article.id, article])).values()
    )

    // Get manually linked articles for this ticket
    const linkedArticles = await prisma.ticketKnowledge.findMany({
      where: { ticketId: id },
      include: {
        article: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true
              }
            },
            category: {
              select: { id: true, name: true }
            },
            subcategory: {
              select: { id: true, name: true }
            },
            item: {
              select: { id: true, name: true }
            },
            _count: {
              select: {
                comments: true,
                attachments: true,
                versions: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { linkedAt: 'desc' }
    })

    // Combine and organize results
    const relatedArticles = {
      suggested: uniqueArticles.slice(0, 5), // Top 5 suggested articles
      linked: linkedArticles.map(link => ({
        ...link.article,
        linkedBy: link.user.name,
        linkedAt: link.linkedAt
      })),
      categoryInfo: {
        category: categoryId ? await prisma.category.findUnique({
          where: { id: categoryId },
          select: { name: true }
        }) : null,
        subcategory: subcategoryId ? await prisma.subcategory.findUnique({
          where: { id: subcategoryId },
          select: { name: true }
        }) : null,
        item: itemId ? await prisma.item.findUnique({
          where: { id: itemId },
          select: { name: true }
        }) : null
      }
    }

    return NextResponse.json(relatedArticles)

  } catch (error) {
    console.error('Error fetching related knowledge articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch related articles' },
      { status: 500 }
    )
  }
}

// POST: Link a knowledge article to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params
    const session = await auth()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only technicians, managers, and admins can link articles
    if (!['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { articleId } = body

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      )
    }

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Check if article exists
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: articleId }
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Knowledge article not found' },
        { status: 404 }
      )
    }

    // Check if link already exists
    const existingLink = await prisma.ticketKnowledge.findUnique({
      where: {
        ticketId_articleId: {
          ticketId,
          articleId
        }
      }
    })

    if (existingLink) {
      return NextResponse.json(
        { error: 'Article is already linked to this ticket' },
        { status: 400 }
      )
    }

    // Create the link
    const link = await prisma.ticketKnowledge.create({
      data: {
        ticketId,
        articleId,
        linkedBy: session.user.id
      },
      include: {
        article: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true
              }
            },
            category: {
              select: { id: true, name: true }
            },
            subcategory: {
              select: { id: true, name: true }
            },
            item: {
              select: { id: true, name: true }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Article linked successfully',
      link
    })

  } catch (error) {
    console.error('Error linking knowledge article:', error)
    return NextResponse.json(
      { error: 'Failed to link article' },
      { status: 500 }
    )
  }
}

// DELETE: Unlink a knowledge article from a ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params
    const session = await auth()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only technicians, managers, and admins can unlink articles
    if (!['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get('articleId')

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      )
    }

    // Delete the link
    await prisma.ticketKnowledge.delete({
      where: {
        ticketId_articleId: {
          ticketId,
          articleId
        }
      }
    })

    return NextResponse.json({
      message: 'Article unlinked successfully'
    })

  } catch (error) {
    console.error('Error unlinking knowledge article:', error)
    return NextResponse.json(
      { error: 'Failed to unlink article' },
      { status: 500 }
    )
  }
}