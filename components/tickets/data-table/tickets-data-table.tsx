'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DataTable } from './data-table'
import { getColumns, type Ticket, type TicketWithMeta } from './columns'
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
  const [tickets, setTickets] = useState<TicketWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [previousTicketIds, setPreviousTicketIds] = useState<Set<string>>(new Set())
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

  // Smart merge function to preserve existing tickets and highlight new ones
  const mergeTicketsSmartly = (existing: TicketWithMeta[], incoming: Ticket[]): TicketWithMeta[] => {
    const now = Date.now()
    const existingMap = new Map(existing.map(t => [t.id, t]))
    
    const merged = incoming.map(ticket => {
      const existingTicket = existingMap.get(ticket.id)
      
      // If ticket already exists, preserve its metadata but update the data
      if (existingTicket) {
        return {
          ...ticket,
          isNew: existingTicket.isNew,
          highlightedUntil: existingTicket.highlightedUntil
        }
      }
      
      // New ticket - mark it as new and set highlight duration
      const isActuallyNew = !previousTicketIds.has(ticket.id)
      return {
        ...ticket,
        isNew: isActuallyNew,
        highlightedUntil: isActuallyNew ? now + 5000 : undefined // Highlight for 5 seconds
      }
    })
    
    // Sort to put newest tickets at the top
    return merged.sort((a, b) => {
      // New tickets first
      if (a.isNew && !b.isNew) return -1
      if (!a.isNew && b.isNew) return 1
      // Then by created date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  // Clear expired highlights
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setTickets(prev => prev.map(ticket => {
        if (ticket.highlightedUntil && ticket.highlightedUntil < now) {
          return { ...ticket, isNew: false, highlightedUntil: undefined }
        }
        return ticket
      }))
    }, 1000) // Check every second
    
    return () => clearInterval(interval)
  }, [])

  // Load tickets from API
  const loadTickets = async (isInitial = false) => {
    try {
      // Only show loading spinner on initial load
      if (isInitial) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }
      
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
        
        // Smart merge to preserve existing tickets and highlight new ones
        if (!isInitial && tickets.length > 0) {
          const mergedTickets = mergeTicketsSmartly(tickets, loadedTickets)
          setTickets(mergedTickets)
          
          // Show toast for new tickets
          const newTicketCount = mergedTickets.filter(t => t.isNew).length
          if (newTicketCount > 0) {
            toast.success(`${newTicketCount} new ticket${newTicketCount > 1 ? 's' : ''} added`)
          }
        } else {
          // Initial load - just set tickets without highlights
          const ticketsWithMeta: TicketWithMeta[] = loadedTickets.map((t: Ticket) => ({
            ...t,
            isNew: false
          }))
          setTickets(ticketsWithMeta)
        }
        
        // Update previous ticket IDs for next refresh
        setPreviousTicketIds(new Set(loadedTickets.map((t: Ticket) => t.id)))
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
      setIsRefreshing(false)
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

    if (shouldRefresh && !isLoading) {
      console.log('🔄 Real-time update received, refreshing tickets...')
      loadTickets(false) // Not initial load
    }
  }, [session])

  // Use Socket.io for real-time updates instead of interval
  useTicketListUpdates(handleRealtimeUpdate)

  // Initial load
  useEffect(() => {
    loadTickets(true) // Initial load
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
            loadTickets(false)
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
        loadTickets(false)
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
        <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
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
                    className="bg-gradient-to-r from-brown-400 to-brown-500 dark:from-brown-200 dark:to-brown-300 text-white dark:text-brown-950 hover:from-brown-500 hover:to-brown-600 dark:hover:from-brown-300 dark:hover:to-brown-400"
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
      <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-md">
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
              className="hover:bg-cream-100 dark:hover:bg-warm-dark-200/50 transition-colors"
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