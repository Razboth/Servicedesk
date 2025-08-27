import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import KnowledgeEditForm from '@/components/knowledge/knowledge-edit-form'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Edit Knowledge Article - ServiceDesk',
  description: 'Edit knowledge base article'
}

async function getArticle(id: string) {
  // First try to find by ID, if not found try by slug for backwards compatibility
  let article = await prisma.knowledgeArticle.findUnique({
    where: { id },
    include: {
      versions: {
        select: {
          id: true,
          version: true,
          changeNotes: true,
          createdAt: true,
          author: {
            select: { name: true }
          }
        },
        orderBy: { version: 'desc' },
        take: 10
      }
    }
  })
  
  return article
}

export default async function EditKnowledgeArticlePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  const article = await getArticle(id)
  
  if (!article) {
    redirect('/knowledge')
  }

  // Check permissions - allow authors to edit their own articles
  const canEdit = session.user.role === 'ADMIN' || 
                 session.user.role === 'MANAGER' ||
                 article.authorId === session.user.id

  if (!canEdit) {
    redirect(`/knowledge/${id}`)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Knowledge Article</h1>
        <p className="text-gray-600 mt-1">
          Update and improve your knowledge article
        </p>
      </div>

      {/* Form */}
      <Suspense fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <KnowledgeEditForm 
          articleId={article.id}
          initialData={{
            title: article.title,
            content: article.content,
            summary: article.summary || undefined,
            categoryId: article.categoryId || undefined,
            subcategoryId: article.subcategoryId || undefined,
            itemId: article.itemId || undefined,
            tags: article.tags,
            status: article.status as 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'ARCHIVED',
            expiresAt: article.expiresAt?.toISOString().split('T')[0],
            versions: article.versions.map(v => ({
              id: v.id,
              version: v.version,
              changeNotes: v.changeNotes || '',
              createdAt: v.createdAt.toISOString(),
              author: v.author
            }))
          }}
        />
      </Suspense>
    </div>
  )
}