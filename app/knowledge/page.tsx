import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import KnowledgeListingClient from '@/components/knowledge/knowledge-listing-client'

export const metadata: Metadata = {
  title: 'Knowledge Base - ServiceDesk',
  description: 'Browse and search through knowledge articles and documentation'
}

export default async function KnowledgePage() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-600 mt-1">
            Find answers and documentation for common issues and procedures
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Suspense fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <KnowledgeListingClient />
      </Suspense>
    </div>
  )
}