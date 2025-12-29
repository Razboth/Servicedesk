import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import KnowledgeCreateForm from '@/components/knowledge/knowledge-create-form'

export const metadata: Metadata = {
  title: 'Create Knowledge Article - ServiceDesk',
  description: 'Create a new knowledge base article'
}

export default async function CreateKnowledgeArticlePage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  // Check permissions - only ADMIN, MANAGER, and TECHNICIAN can create articles
  if (!['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    redirect('/knowledge')
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Create Knowledge Article
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Share your knowledge and help others solve similar issues
        </p>
      </div>

      {/* Form */}
      <Suspense fallback={
        <div className="flex justify-center items-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-sm text-muted-foreground">Loading form...</p>
          </div>
        </div>
      }>
        <KnowledgeCreateForm />
      </Suspense>
    </div>
  )
}
