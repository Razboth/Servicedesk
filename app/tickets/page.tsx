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

  // MANAGER role cannot create tickets - they can only approve them
  const canCreateTicket = session?.user?.role !== 'MANAGER'

  return (
    <div className="w-full px-responsive py-6 space-y-6">
      <PageHeader
        title="Support Tickets"
        description="Manage and track support tickets across all branches"
        icon={<TicketIcon className="h-6 w-6" />}
        action={
          canCreateTicket ? (
            <Button
              onClick={handleCreateTicket}
              variant="default"
              size="default"
              className="shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          ) : null
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
        <div className="w-full px-responsive py-6">
          <Card className="border-border/50">
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent absolute top-0 left-0"></div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Loading tickets...</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Please wait</p>
                </div>
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