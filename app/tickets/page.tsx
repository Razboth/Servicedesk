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
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 p-6">
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-400 dark:border-brown-200"></div>
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