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
    <div className="container mx-auto p-6 max-w-4xl overflow-x-hidden">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 break-words">Create Knowledge Article</h1>
        <p className="text-gray-600 mt-1 break-words">
          Share your knowledge and help others solve similar issues
        </p>
      </div>

      {/* Form */}
      <Suspense fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <KnowledgeCreateForm />
      </Suspense>
    </div>
  )
}