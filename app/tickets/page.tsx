'use client'

import { useState, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { TicketsDataTable } from '@/components/tickets/data-table/tickets-data-table'
import { TicketWizard } from '@/components/tickets/modern/ticket-wizard'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Plus, TicketIcon } from 'lucide-react'

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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Support Tickets"
        description="Manage and track support tickets across all branches"
        icon={<TicketIcon className="h-6 w-6" />}
        action={
          <Button 
            onClick={handleCreateTicket}
            className="bg-gradient-to-r from-brown-400 to-brown-500 dark:from-brown-200 dark:to-brown-300 text-white dark:text-brown-950 hover:from-brown-500 hover:to-brown-600 dark:hover:from-brown-300 dark:hover:to-brown-400"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        }
      />
      
      <TicketsDataTable 
        onCreateTicket={handleCreateTicket}
        initialFilters={initialFilters}
        hideHeader={true}
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