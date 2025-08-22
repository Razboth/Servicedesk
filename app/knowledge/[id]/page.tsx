import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import KnowledgeArticleView from '@/components/knowledge/knowledge-article-view'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Knowledge Article - ServiceDesk',
  description: 'View knowledge base article'
}

export default async function KnowledgeArticlePage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Suspense fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <KnowledgeArticleView articleId={id} />
      </Suspense>
    </div>
  )
}