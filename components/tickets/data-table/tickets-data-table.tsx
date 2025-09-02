'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DataTable } from './data-table'
import { getColumns, type Ticket } from './columns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  RefreshCw, 
  Plus,
  Filter,
  Download,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useTicketListUpdates } from '@/hooks/use-socket'
import { SocketStatus } from '@/components/ui/socket-status'
import { cn } from '@/lib/utils'

interface TicketsDataTableProps {
  onCreateTicket?: () => void
  ticketFilter?: 'my-tickets' | 'available-tickets'
  hideHeader?: boolean
  showClaimButton?: boolean
  initialFilters?: {
    status?: string
    priority?: string
    category?: string
    sort?: string
    page?: number
    pageSize?: number
  }
}

export function TicketsDataTable({ 
  onCreateTicket,
  ticketFilter,
  hideHeader = false,
  showClaimButton = false,
  initialFilters 
}: TicketsDataTableProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([])
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([])
  const [serviceOptions, setServiceOptions] = useState<{ value: string; label: string }[]>([])
  const [technicianOptions, setTechnicianOptions] = useState<{ value: string; label: string }[]>([])

  // Load branches for filter
  const loadBranches = async () => {
    try {
      const response = await fetch('/api/branches')
      if (response.ok) {
        const data = await response.json()
        const options = data.branches?.map((branch: any) => ({
          value: branch.code,
          label: `${branch.code} - ${branch.name}`
        })) || []
        setBranchOptions(options)
        console.log('Loaded branches:', options.length)
      } else {
        console.error('Failed to load branches:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading branches:', error)
    }
  }

  // Load categories for filter
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/services/categories')
      if (response.ok) {
        const data = await response.json()
        const options = data.categories?.map((category: any) => ({
          value: category.name,
          label: category.name
        })) || []
        setCategoryOptions(options)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  // Load services for filter
  const loadServices = async () => {
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        // Handle both array and object response formats
        const services = Array.isArray(data) ? data : data.services || []
        const options = services.map((service: any) => ({
          value: service.name,
          label: service.name
        }))
        setServiceOptions(options)
      }
    } catch (error) {
      console.error('Error loading services:', error)
    }
  }

  // Load technicians for filter
  const loadTechnicians = async (ticketData?: Ticket[]) => {
    try {
      // First try admin endpoint, fallback to extracting from tickets if not admin
      let response = await fetch('/api/admin/technicians')
      
      if (response.ok) {
        const data = await response.json()
        const options = [
          { value: 'Unassigned', label: 'Unassigned' },
          ...(data.technicians?.map((tech: any) => ({
            value: tech.name,
            label: tech.name
          })) || [])
        ]
        setTechnicianOptions(options)
      } else if (ticketData && ticketData.length > 0) {
        // Fallback: extract unique technicians from provided tickets
        const uniqueTechnicians = new Set<string>()
        ticketData.forEach(ticket => {
          if (ticket.assignedTo?.name) {
            uniqueTechnicians.add(ticket.assignedTo.name)
          }
        })
        
        const options = [
          { value: 'Unassigned', label: 'Unassigned' },
          ...Array.from(uniqueTechnicians).sort().map(name => ({
            value: name,
            label: name
          }))
        ]
        setTechnicianOptions(options)
      }
    } catch (error) {
      console.error('Error loading technicians:', error)
      // Fallback to extracting from tickets
      if (ticketData && ticketData.length > 0) {
        const uniqueTechnicians = new Set<string>()
        ticketData.forEach(ticket => {
          if (ticket.assignedTo?.name) {
            uniqueTechnicians.add(ticket.assignedTo.name)
          }
        })
        
        const options = [
          { value: 'Unassigned', label: 'Unassigned' },
          ...Array.from(uniqueTechnicians).sort().map(name => ({
            value: name,
            label: name
          }))
        ]
        setTechnicianOptions(options)
      }
    }
  }

  // Load tickets from API
  const loadTickets = async () => {
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams()
      
      if (ticketFilter) {
        params.append('filter', ticketFilter)
      }
      
      if (initialFilters?.status) {
        params.append('status', initialFilters.status)
      }
      
      if (initialFilters?.priority) {
        params.append('priority', initialFilters.priority)
      }
      
      if (initialFilters?.category) {
        params.append('categoryId', initialFilters.category)
      }

      // Add a higher limit to get more tickets
      params.append('limit', '1000')
      
      const response = await fetch(`/api/tickets?${params}`)
      if (response.ok) {
        const data = await response.json()
        const loadedTickets = data.tickets || []
        setTickets(loadedTickets)
        setLastRefreshTime(new Date())
        
        // Extract filter options from loaded tickets as fallback
        extractFilterOptionsFromTickets(loadedTickets)
        // Load technicians with the ticket data
        loadTechnicians(loadedTickets)
      } else {
        toast.error('Failed to load tickets')
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
      toast.error('Failed to load tickets')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Extract filter options from tickets as fallback
  const extractFilterOptionsFromTickets = (ticketData: Ticket[]) => {
    // Extract branches if not loaded
    if (branchOptions.length === 0) {
      const uniqueBranches = new Map<string, string>()
      ticketData.forEach(ticket => {
        if (ticket.branch?.code && ticket.branch?.name) {
          uniqueBranches.set(ticket.branch.code, ticket.branch.name)
        }
      })
      
      const options = Array.from(uniqueBranches.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([code, name]) => ({
          value: code,
          label: `${code} - ${name}`
        }))
      
      if (options.length > 0) {
        setBranchOptions(options)
        console.log('Extracted branches from tickets:', options.length)
      }
    }
    
    // Extract categories if not loaded
    if (categoryOptions.length === 0) {
      const uniqueCategories = new Set<string>()
      ticketData.forEach(ticket => {
        if (ticket.service?.category?.name) {
          uniqueCategories.add(ticket.service.category.name)
        }
      })
      
      const options = Array.from(uniqueCategories)
        .sort()
        .map(name => ({
          value: name,
          label: name
        }))
      
      if (options.length > 0) {
        setCategoryOptions(options)
        console.log('Extracted categories from tickets:', options.length)
      }
    }
    
    // Extract services if not loaded
    if (serviceOptions.length === 0) {
      const uniqueServices = new Set<string>()
      ticketData.forEach(ticket => {
        if (ticket.service?.name) {
          uniqueServices.add(ticket.service.name)
        }
      })
      
      const options = Array.from(uniqueServices)
        .sort()
        .map(name => ({
          value: name,
          label: name
        }))
      
      if (options.length > 0) {
        setServiceOptions(options)
        console.log('Extracted services from tickets:', options.length)
      }
    }
    
    // Don't extract technicians here - it's handled by loadTechnicians
  }

  // Memoize loadTickets to prevent unnecessary re-renders
  const handleRealtimeUpdate = useCallback(() => {
    // Only refresh if we should be listening for updates
    const shouldRefresh = 
      session?.user?.role && 
      ['TECHNICIAN', 'SECURITY_ANALYST', 'ADMIN', 'MANAGER', 'USER'].includes(session.user.role)

    if (shouldRefresh) {
      console.log('🔄 Real-time update received, refreshing tickets...')
      loadTickets()
    }
  }, [session])

  // Use Socket.io for real-time updates instead of interval
  useTicketListUpdates(handleRealtimeUpdate)

  // Initial load
  useEffect(() => {
    loadTickets()
    loadBranches()
    loadCategories()
    loadServices()
    loadTechnicians() // Try loading from API first
  }, [ticketFilter, initialFilters])

  const handleRowClick = (ticket: Ticket) => {
    router.push(`/tickets/${ticket.id}`)
  }

  const handleBulkAction = async (action: string, selectedTickets: Ticket[]) => {
    switch (action) {
      case 'claim':
        // Handle bulk claim
        if (!session?.user?.id) {
          toast.error('You must be logged in to claim tickets')
          return
        }
        
        toast.info(`Claiming ${selectedTickets.length} tickets...`)
        
        try {
          // Claim tickets one by one (can be optimized with a bulk API endpoint)
          const promises = selectedTickets.map(ticket => 
            fetch(`/api/tickets/${ticket.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                assignedToId: session.user.id,
              }),
            })
          )
          
          const results = await Promise.allSettled(promises)
          const successful = results.filter(r => r.status === 'fulfilled' && (r.value as Response).ok).length
          const failed = results.length - successful
          
          if (successful > 0) {
            toast.success(`Successfully claimed ${successful} ticket${successful > 1 ? 's' : ''}`)
            // Reload tickets to reflect the changes
            loadTickets()
          }
          
          if (failed > 0) {
            toast.error(`Failed to claim ${failed} ticket${failed > 1 ? 's' : ''}`)
          }
        } catch (error) {
          console.error('Error claiming tickets:', error)
          toast.error('Failed to claim tickets')
        }
        break
      case 'assign':
        // Handle bulk assign
        toast.info(`Assigning ${selectedTickets.length} tickets...`)
        break
      case 'export':
        // Handle export
        toast.info(`Exporting ${selectedTickets.length} tickets...`)
        break
      default:
        break
    }
  }

  const handleClaimTicket = async (ticketId: string) => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to claim tickets')
      return
    }

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedToId: session.user.id,
        }),
      })

      if (response.ok) {
        toast.success('Ticket claimed successfully')
        // Reload tickets to reflect the change
        loadTickets()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to claim ticket')
      }
    } catch (error) {
      console.error('Error claiming ticket:', error)
      toast.error('Failed to claim ticket')
    }
  }

  // Get columns with claim button if needed
  const tableColumns = React.useMemo(
    () => getColumns({
      showClaimButton,
      onClaimTicket: handleClaimTicket,
      enableBulkActions: ticketFilter === 'available-tickets',
    }),
    [showClaimButton, ticketFilter]
  )

  return (
    <div className="w-full space-y-6">
      {/* Modern Header with gradient background */}
      {!hideHeader && (
        <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Support Tickets
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage and track support tickets across all branches
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {onCreateTicket && (
                  <Button 
                    onClick={onCreateTicket}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Ticket
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time connection status with modern styling */}
      <Card className="bg-white/[0.5] dark:bg-gray-800/[0.5] backdrop-blur-sm border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SocketStatus />
              {lastRefreshTime && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Updated {lastRefreshTime.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadTickets}
              disabled={isLoading}
              className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <DataTable
        columns={tableColumns}
        data={tickets}
        onRowClick={handleRowClick}
        onRefresh={loadTickets}
        isLoading={isLoading}
        enableBulkActions={ticketFilter === 'available-tickets'}
        onBulkAction={handleBulkAction}
        branchOptions={branchOptions}
        categoryOptions={categoryOptions}
        serviceOptions={serviceOptions}
        technicianOptions={technicianOptions}
      />
    </div>
  )
}