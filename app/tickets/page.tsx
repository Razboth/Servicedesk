'use client'

import { useState, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { TicketsDataTable } from '@/components/tickets/data-table/tickets-data-table'
import { TicketWizard } from '@/components/tickets/modern/ticket-wizard'
import { Card, CardContent } from '@/components/ui/card'

function TicketsPageContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [showWizard, setShowWizard] = useState(false)
  
  // Get initial filters from URL
  const initialFilters = {
    status: searchParams.get('status') || undefined,
    priority: searchParams.get('priority') || undefined,
    category: searchParams.get('category') || undefined,
    sort: searchParams.get('sort') || undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
    pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined,
  }

  const handleCreateTicket = () => {
    setShowWizard(true)
  }

  const handleTicketCreated = () => {
    setShowWizard(false)
    // The data table will auto-refresh
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-blue-400 to-indigo-400 dark:from-blue-800 dark:to-indigo-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 dark:from-purple-800 dark:to-pink-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400 to-teal-400 dark:from-cyan-800 dark:to-teal-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <TicketsDataTable 
          onCreateTicket={handleCreateTicket}
          initialFilters={initialFilters}
        />
        
        {showWizard && (
          <TicketWizard
            onClose={() => setShowWizard(false)}
            onSuccess={handleTicketCreated}
          />
        )}
      </div>
    </div>
  )
}

export default function TicketsPage() {
  return (
    <Suspense 
      fallback={
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="p-12">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <TicketsPageContent />
    </Suspense>
  )
}