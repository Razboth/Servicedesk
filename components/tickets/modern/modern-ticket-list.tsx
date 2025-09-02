'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  User, 
  Building2,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Circle,
  MoreHorizontal,
  Calendar,
  Tag,
  ArrowUpDown,
  Grid3X3,
  List,
  RefreshCw,
  Plus,
  XCircle,
  ChevronUp,
  ChevronDown,
  Inbox,
  UserPlus,
  Edit,
  ExternalLink,
  Copy
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { BulkActionsBar } from './bulk-actions-bar'
import { ColumnCustomizer, type ColumnConfig, DEFAULT_COLUMNS } from '../column-customizer'

interface Ticket {
  id: string
  ticketNumber: string
  title: string
  description: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  branch?: {
    id: string
    name: string
    code: string
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  service: {
    id: string
    name: string
    category: {
      name: string
    }
  }
  _count: {
    comments: number
  }
}

interface ModernTicketListProps {
  viewMode: 'cards' | 'table' | 'inbox'
  searchTerm: string
  onCreateTicket: () => void
  ticketFilter?: 'my-tickets' | 'available-tickets'
  onClaimTicket?: (ticketId: string) => void
  enableBulkActions?: boolean
  onUpdateStatus?: (ticketId: string) => void
  categoryFilter?: string
  statusFilter?: string
  onSearchChange?: (searchTerm: string) => void
  initialFilters?: {
    status?: string
    priority?: string
    category?: string
    sort?: string
    page?: number
    pageSize?: number
  }
}

export function ModernTicketList({ viewMode, searchTerm, onCreateTicket, ticketFilter, onClaimTicket, enableBulkActions = false, onUpdateStatus, categoryFilter, statusFilter: propStatusFilter, onSearchChange, initialFilters }: ModernTicketListProps) {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(initialFilters?.status || propStatusFilter || 'ALL')
  const [priorityFilter, setPriorityFilter] = useState(initialFilters?.priority || 'ALL')
  const [categoryFilterState, setCategoryFilterState] = useState(initialFilters?.category || categoryFilter || 'all')
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])
  const [sortBy, setSortBy] = useState(initialFilters?.sort || 'newest')
  const [currentPage, setCurrentPage] = useState(initialFilters?.page || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedTickets, setSelectedTickets] = useState<string[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [pageSize, setPageSize] = useState(() => {
    if (initialFilters?.pageSize) return initialFilters.pageSize
    switch (viewMode) {
      case 'cards': return 20
      case 'table': return 50  
      case 'inbox': return 100
      default: return 20
    }
  })
  const [tableColumns, setTableColumns] = useState<ColumnConfig[]>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ticketColumnPreferences')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to parse column preferences:', e)
        }
      }
    }
    return DEFAULT_COLUMNS
  })
  
  // Drag and drop state for column reordering
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  
  // Memoized column change handler to prevent re-renders
  const handleColumnsChange = useCallback((columns: ColumnConfig[]) => {
    setTableColumns(columns)
    localStorage.setItem('ticketColumnPreferences', JSON.stringify(columns))
  }, [])

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  // Update page size when view mode changes (only if no initial pageSize was provided)
  useEffect(() => {
    if (!initialFilters?.pageSize) {
      const defaultSize = (() => {
        switch (viewMode) {
          case 'cards': return 20
          case 'table': return 50
          case 'inbox': return 100
          default: return 20
        }
      })()
      setPageSize(defaultSize)
    }
  }, [viewMode, initialFilters?.pageSize])

  // Update status filter when prop changes
  useEffect(() => {
    if (propStatusFilter && propStatusFilter !== 'all') {
      setStatusFilter(propStatusFilter)
    } else {
      setStatusFilter('ALL')
    }
  }, [propStatusFilter])

  useEffect(() => {
    loadTickets()
  }, [currentPage, statusFilter, priorityFilter, sortBy, searchTerm, ticketFilter, categoryFilterState])
  
  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, priorityFilter, searchTerm, pageSize, ticketFilter, categoryFilterState])

  // Auto-refresh tickets every 15 seconds to catch newly approved tickets
  useEffect(() => {
    // Only auto-refresh for technicians and on specific pages
    const shouldAutoRefresh = 
      session?.user?.role && 
      ['TECHNICIAN', 'SECURITY_ANALYST', 'ADMIN'].includes(session.user.role) &&
      (ticketFilter === 'available-tickets' || !ticketFilter); // Refresh on available tickets or main tickets page
    
    if (shouldAutoRefresh) {
      setIsAutoRefreshing(true)
      const refreshInterval = setInterval(() => {
        setLastRefreshTime(new Date())
        loadTickets()
      }, 15000); // Refresh every 15 seconds
      
      return () => {
        clearInterval(refreshInterval)
        setIsAutoRefreshing(false)
      }
    } else {
      setIsAutoRefreshing(false)
    }
  }, [session, ticketFilter])

  const loadTickets = async () => {
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy: sortBy,
        sortOrder: sortBy === 'newest' ? 'desc' : sortBy === 'oldest' ? 'asc' : 'desc'
      })

      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter)
      }
      if (priorityFilter !== 'ALL') {
        params.append('priority', priorityFilter)
      }
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      if (ticketFilter) {
        params.append('filter', ticketFilter)
      }
      if (categoryFilterState && categoryFilterState !== 'all') {
        params.append('categoryId', categoryFilterState)
      }

      const response = await fetch(`/api/tickets?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
        // Calculate pages manually to ensure correct pagination
        const total = data.pagination?.total || 0
        const calculatedPages = Math.max(1, Math.ceil(total / pageSize))
        setTotalPages(calculatedPages)
        setTotalItems(total)
        // Debug pagination if needed
        if (process.env.NODE_ENV === 'development') {
          console.log('Pagination info:', {
            total,
            pageSize,
            calculatedPages,
            currentPage,
            ticketsReceived: data.tickets?.length
          })
        }
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


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Circle className="h-4 w-4 text-blue-500" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'CLOSED':
        return <CheckCircle className="h-4 w-4 text-gray-500" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'PENDING_VENDOR':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getCardBorderColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'border-l-4 border-l-blue-500'
      case 'IN_PROGRESS':
        return 'border-l-4 border-l-yellow-500'
      case 'RESOLVED':
        return 'border-l-4 border-l-green-500'
      case 'CLOSED':
        return 'border-l-4 border-l-gray-400'
      case 'CANCELLED':
        return 'border-l-4 border-l-red-500'
      case 'PENDING_VENDOR':
        return 'border-l-4 border-l-purple-500'
      default:
        return 'border-l-4 border-l-gray-400'
    }
  }

  const handleTicketClick = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`)
  }

  const handleOpenInNewTab = (ticketId: string) => {
    window.open(`/tickets/${ticketId}`, '_blank')
  }

  const handleCopyLink = async (ticketId: string) => {
    try {
      const url = `${window.location.origin}/tickets/${ticketId}`
      await navigator.clipboard.writeText(url)
      toast.success('Ticket link copied to clipboard')
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast.error('Failed to copy link')
    }
  }

  const handleClaimTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignedToId: session?.user?.id }),
      })
      
      if (response.ok) {
        // Update status to IN_PROGRESS when claiming
        await fetch(`/api/tickets/${ticketId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'IN_PROGRESS' }),
        })
        
        toast.success('Ticket claimed successfully')
        loadTickets() // Refresh the list
        if (onClaimTicket) {
          onClaimTicket(ticketId)
        }
      } else {
        toast.error('Failed to claim ticket')
      }
    } catch (error) {
      console.error('Error claiming ticket:', error)
      toast.error('Failed to claim ticket')
    }
  }

  // Bulk selection handlers
  const handleToggleTicket = (ticketId: string) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    )
  }

  const handleSelectAll = () => {
    const availableTickets = tickets.filter(ticket => 
      !ticket.assignedTo && 
      ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session?.user?.role || '')
    )
    const allSelected = availableTickets.every(ticket => selectedTickets.includes(ticket.id))
    
    if (allSelected) {
      // Deselect all visible tickets
      setSelectedTickets(prev => prev.filter(id => !availableTickets.map(t => t.id).includes(id)))
    } else {
      // Select all available tickets on current page
      setSelectedTickets(prev => [
        ...prev.filter(id => !availableTickets.map(t => t.id).includes(id)),
        ...availableTickets.map(t => t.id)
      ])
    }
  }

  const handleClearSelection = () => {
    setSelectedTickets([])
    setIsSelecting(false)
  }

  const handleBulkClaim = async (ticketIds: string[]) => {
    try {
      const response = await fetch('/api/tickets/bulk/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketIds,
          assignedToId: session?.user?.id
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        toast.success(
          `Successfully claimed ${result.summary.successful} of ${result.summary.total} tickets`,
          {
            description: result.summary.failed > 0 
              ? `${result.summary.failed} tickets could not be claimed`
              : undefined
          }
        )
        
        // Clear selection and refresh
        handleClearSelection()
        loadTickets()
        
        if (onClaimTicket) {
          onClaimTicket('')
        }
      } else {
        const error = await response.json()
        toast.error('Failed to claim tickets', {
          description: error.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      console.error('Error in bulk claim:', error)
      toast.error('Failed to claim tickets')
    }
  }

  // Get available tickets that can be selected
  const availableTicketsForSelection = tickets.filter(ticket => 
    !ticket.assignedTo && 
    ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session?.user?.role || '')
  )

  const isAllSelected = availableTicketsForSelection.length > 0 && 
    availableTicketsForSelection.every(ticket => selectedTickets.includes(ticket.id))

  const isSomeSelected = availableTicketsForSelection.some(ticket => selectedTickets.includes(ticket.id))

  // Helper function to check if a ticket can have its status updated
  const canUpdateTicketStatus = (ticket: Ticket) => {
    return ticketFilter === 'my-tickets' && 
           ticket.assignedTo?.id === session?.user?.id &&
           !['CLOSED', 'CANCELLED'].includes(ticket.status) &&
           ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session?.user?.role || '')
  }

  // Reusable dropdown menu for ticket actions
  const renderTicketDropdownMenu = (ticket: Ticket, showOnHover: boolean = true) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 w-8 p-0 transition-opacity ${showOnHover ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTicketClick(ticket.id); }}>
          <Eye className="h-4 w-4 mr-2" />
          Open ticket
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenInNewTab(ticket.id); }}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in new tab
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(ticket.id); }}>
          <Copy className="h-4 w-4 mr-2" />
          Copy link
        </DropdownMenuItem>
        
        {/* Show additional actions based on context */}
        {(ticketFilter === 'available-tickets' && 
          !ticket.assignedTo && 
          ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session?.user?.role || '')) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleClaimTicket(ticket.id); }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Claim ticket
            </DropdownMenuItem>
          </>
        )}
        
        {canUpdateTicketStatus(ticket) && onUpdateStatus && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStatus(ticket.id); }}>
              <Edit className="h-4 w-4 mr-2" />
              Update status
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderTicketCard = (ticket: Ticket) => (
    <Card 
      className={`bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group h-full flex flex-col ${getCardBorderColor(ticket.status)}`}
      onClick={() => handleTicketClick(ticket.id)}
    >
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {getStatusIcon(ticket.status)}
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate">
              #{ticket.ticketNumber}
            </span>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <Badge className={`${getPriorityColor(ticket.priority)} text-xs px-1 py-0`}>
              {ticket.priority}
            </Badge>
            {renderTicketDropdownMenu(ticket)}
          </div>
        </div>

        <Link 
          href={`/tickets/${ticket.id}`}
          className="text-sm font-semibold text-gray-900 dark:text-white hover:text-pink-600 dark:hover:text-pink-400 hover:italic mb-2 line-clamp-2 leading-tight block transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {ticket.title}
        </Link>


        <div className="mb-2">
          <Badge variant="outline" className={`${getStatusColor(ticket.status)} text-xs`}>
            {ticket.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <User className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{ticket.createdBy.name}</span>
            {ticket.assignedTo && (
              <>
                <span className="mx-1">→</span>
                <span className="truncate">{ticket.assignedTo.name}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center min-w-0 flex-1">
              <Tag className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{ticket.service.name}</span>
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              {ticket._count.comments > 0 && (
                <div className="flex items-center">
                  <MessageCircle className="h-3 w-3 mr-1" />
                  <span>{ticket._count.comments}</span>
                </div>
              )}
              {ticket.branch && (
                <div className="flex items-center">
                  <Building2 className="h-3 w-3 mr-1" />
                  <span>{ticket.branch.code}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
              </span>
            </div>
            
            {/* Claim button for available tickets in card view */}
            {ticketFilter === 'available-tickets' && 
             !ticket.assignedTo && 
             ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session?.user?.role || '') && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleClaimTicket(ticket.id); 
                }}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-2 py-1 h-auto"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Claim
              </Button>
            )}
            
            {/* Update status button for my tickets in card view */}
            {canUpdateTicketStatus(ticket) && onUpdateStatus && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onUpdateStatus(ticket.id); 
                }}
                className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs px-2 py-1 h-auto"
              >
                <Edit className="h-3 w-3 mr-1" />
                Update
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderTicketListItem = (ticket: Ticket) => (
    <Card 
      className={`bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group ${getCardBorderColor(ticket.status)}`}
      onClick={() => handleTicketClick(ticket.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex items-center space-x-3">
              {getStatusIcon(ticket.status)}
              <span className="font-mono text-sm text-gray-500 dark:text-gray-400 w-20">
                #{ticket.ticketNumber}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {ticket.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {ticket.service.name} • {ticket.createdBy.name}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Badge className={getPriorityColor(ticket.priority)}>
                {ticket.priority}
              </Badge>
              <Badge variant="outline" className={getStatusColor(ticket.status)}>
                {ticket.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              {ticket._count.comments > 0 && (
                <div className="flex items-center">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  <span>{ticket._count.comments}</span>
                </div>
              )}
              
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-xs w-20 text-right">
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Render functions for each column type
  const renderColumnContent = (column: ColumnConfig, ticket: Ticket) => {
    switch (column.id) {
      case 'ticketNumber':
        return (
          <div className="flex items-center gap-1">
            {getStatusIcon(ticket.status)}
            <span className="font-mono text-xs text-gray-900 dark:text-white">
              #{ticket.ticketNumber.slice(-4)}
            </span>
          </div>
        )
      case 'title':
        return (
          <div className="min-w-0">
            <Link 
              href={`/tickets/${ticket.id}`}
              className="font-medium text-sm text-gray-900 dark:text-white hover:text-pink-600 dark:hover:text-pink-400 hover:italic transition-colors"
              title={ticket.title}
              onClick={(e) => e.stopPropagation()}
            >
              {ticket.title}
            </Link>
          </div>
        )
      case 'status':
        return (
          <Badge variant="outline" className={`${getStatusColor(ticket.status)} text-xs px-1 py-0`}>
            {ticket.status.replace('_', ' ')}
          </Badge>
        )
      case 'priority':
        return (
          <Badge className={`${getPriorityColor(ticket.priority)} text-xs px-1 py-0`}>
            {ticket.priority}
          </Badge>
        )
      case 'assignedTo':
        return (
          <div className="min-w-0 text-xs text-gray-900 dark:text-white" title={ticket.assignedTo ? ticket.assignedTo.name : 'Unassigned'}>
            {ticket.assignedTo ? ticket.assignedTo.name : 'Unassigned'}
          </div>
        )
      case 'service':
        return (
          <div className="min-w-0 text-xs text-gray-500 dark:text-gray-400" title={ticket.service.name}>
            {ticket.service.name}
          </div>
        )
      case 'branch':
        return ticket.branch ? (
          <div className="text-xs text-gray-900 dark:text-gray-300" title={ticket.branch.name}>
            <span className="font-medium">{ticket.branch.code}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">({ticket.branch.name})</span>
          </div>
        ) : <span className="text-xs text-gray-400">-</span>
      case 'createdBy':
        return (
          <div className="text-xs text-gray-500 dark:text-gray-400" title={ticket.createdBy.name}>
            {ticket.createdBy.name}
          </div>
        )
      case 'createdAt':
        return (
          <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400">
            <span className="truncate">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
            <span className="text-xs truncate" title={ticket.createdBy.name}>{ticket.createdBy.name.split(' ')[0]}</span>
          </div>
        )
      case 'updatedAt':
        return (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
          </div>
        )
      case 'comments':
        return ticket._count.comments > 0 ? (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <MessageCircle className="h-3 w-3 mr-1" />
            {ticket._count.comments}
          </div>
        ) : <span className="text-xs text-gray-400">-</span>
      case 'actions':
        return (
          <div className="flex items-center space-x-1">
            {ticketFilter === 'available-tickets' && 
             !ticket.assignedTo && 
             ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session?.user?.role || '') && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleClaimTicket(ticket.id); 
                }}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-2 py-1 h-7"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Claim
              </Button>
            )}
            
            {canUpdateTicketStatus(ticket) && onUpdateStatus && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onUpdateStatus(ticket.id); 
                }}
                className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs px-2 py-1 h-7"
              >
                <Edit className="h-3 w-3 mr-1" />
                Update
              </Button>
            )}
            
            {renderTicketDropdownMenu(ticket, false)}
          </div>
        )
      default:
        return null
    }
  }

  // Drag and drop handlers for column reordering
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId)
    }
  }
  
  const handleDragLeave = () => {
    setDragOverColumn(null)
  }
  
  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    
    if (draggedColumn && draggedColumn !== targetColumnId) {
      const newColumns = [...tableColumns]
      const draggedIndex = newColumns.findIndex(col => col.id === draggedColumn)
      const targetIndex = newColumns.findIndex(col => col.id === targetColumnId)
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Remove dragged column and insert at target position
        const [draggedCol] = newColumns.splice(draggedIndex, 1)
        newColumns.splice(targetIndex, 0, draggedCol)
        
        // Update state and save to localStorage
        setTableColumns(newColumns)
        localStorage.setItem('ticketColumnPreferences', JSON.stringify(newColumns))
        
        toast.success('Column order updated')
      }
    }
    
    // Reset drag state
    setDraggedColumn(null)
    setDragOverColumn(null)
  }
  
  const handleDragEnd = () => {
    setDraggedColumn(null)
    setDragOverColumn(null)
  }

  const renderTableView = () => {
    // Filter to only visible columns
    const visibleColumns = tableColumns.filter(col => col.visible)
    
    return (
    <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {/* Checkbox column for bulk selection */}
                {enableBulkActions && ticketFilter === 'available-tickets' && (
                  <th className="px-2 py-2 text-left w-8">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      className="border-gray-300"
                    />
                  </th>
                )}
                {visibleColumns.map((column) => (
                  <th 
                    key={column.id}
                    draggable={!column.required}
                    onDragStart={(e) => !column.required && handleDragStart(e, column.id)}
                    onDragOver={(e) => handleDragOver(e, column.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, column.id)}
                    onDragEnd={handleDragEnd}
                    className={`px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : ''
                    } min-w-[${column.width}] ${
                      !column.required ? 'cursor-move' : ''
                    } ${
                      dragOverColumn === column.id ? 'bg-blue-100 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
                    } ${
                      draggedColumn === column.id ? 'opacity-50' : ''
                    } transition-all duration-200`}
                    onClick={column.sortable ? () => handleSort(column.id) : undefined}
                  >
                    <div className="flex items-center gap-1 select-none">
                      {!column.required && (
                        <Grid3X3 className="h-3 w-3 text-gray-400 mr-1" />
                      )}
                      {column.label}
                      {column.sortable && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                  selectedTickets.includes(ticket.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                } ${getCardBorderColor(ticket.status).replace('border-l-4', 'border-l-[3px]')}`}
                    onClick={() => handleTicketClick(ticket.id)}>
                  {/* Checkbox column for bulk selection */}
                  {enableBulkActions && ticketFilter === 'available-tickets' && (
                    <td className="px-2 py-2 whitespace-nowrap">
                      {!ticket.assignedTo && ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session?.user?.role || '') ? (
                        <Checkbox
                          checked={selectedTickets.includes(ticket.id)}
                          onCheckedChange={() => handleToggleTicket(ticket.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="border-gray-300"
                        />
                      ) : (
                        <div className="w-4 h-4"></div>
                      )}
                    </td>
                  )}
                  {visibleColumns.map((column) => (
                    <td 
                      key={column.id}
                      className={`px-2 py-2 ${
                        column.id === 'title' ? '' : 'whitespace-nowrap'
                      }`}
                    >
                      {renderColumnContent(column, ticket)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    )
  }

  const renderInboxView = () => (
    <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {tickets.map((ticket) => (
            <div key={ticket.id} 
                 className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-4"
                 onClick={() => handleTicketClick(ticket.id)}>
              <div className="flex items-center gap-3 flex-shrink-0">
                {getStatusIcon(ticket.status)}
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400 w-20">
                  #{ticket.ticketNumber}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link 
                    href={`/tickets/${ticket.id}`}
                    className="font-medium text-gray-900 dark:text-white hover:text-pink-600 dark:hover:text-pink-400 hover:italic truncate flex-1 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ticket.title}
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={getPriorityColor(ticket.priority)} variant="secondary">
                      {ticket.priority}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(ticket.status)}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {ticket.service.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {ticket.assignedTo ? ticket.assignedTo.name : 'Unassigned'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </span>
                  {ticket._count.comments > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {ticket._count.comments}
                    </span>
                  )}
                  {ticket.branch && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {ticket.branch.code}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                {/* Claim button for available tickets in inbox view */}
                {ticketFilter === 'available-tickets' && 
                 !ticket.assignedTo && 
                 ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session?.user?.role || '') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleClaimTicket(ticket.id); 
                    }}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Claim
                  </Button>
                )}
                
                {/* Update status button for my tickets in inbox view */}
                {canUpdateTicketStatus(ticket) && onUpdateStatus && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onUpdateStatus(ticket.id); 
                    }}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Update Status
                  </Button>
                )}
                
                {renderTicketDropdownMenu(ticket, false)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const handleSort = (field: string) => {
    if (field === 'newest' || field === 'oldest') {
      setSortBy(field)
    } else {
      setSortBy(field)
    }
  }

  // Update URL parameters helper function
  const updateURLParams = (params: Record<string, string | number | undefined>) => {
    if (typeof window === 'undefined') return
    
    const searchParams = new URLSearchParams(window.location.search)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        searchParams.delete(key)
      } else {
        searchParams.set(key, value.toString())
      }
    })
    
    const newURL = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState({}, '', newURL)
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          {/* Call Center Indicator */}
          {session?.user?.role === 'USER' && (
            <div className="flex items-center justify-between mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                  Viewing Transaction Claims category only
                </span>
              </div>
            </div>
          )}
          
          {/* Auto-refresh indicator */}
          {isAutoRefreshing && (
            <div className="flex items-center justify-between mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  Auto-refreshing every 15 seconds to show newly approved tickets
                </span>
              </div>
              {lastRefreshTime && (
                <span className="text-xs text-blue-500 dark:text-blue-300">
                  Last refresh: {formatDistanceToNow(lastRefreshTime, { addSuffix: true })}
                </span>
              )}
            </div>
          )}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Category Filter - Hidden for Call Center (USER role) */}
              {session?.user?.role !== 'USER' && (
                <Select value={categoryFilterState} onValueChange={(value) => {
                  setCategoryFilterState(value)
                  updateURLParams({ category: value === 'all' ? undefined : value })
                }}>
                  <SelectTrigger className="bg-white/[0.5] dark:bg-gray-800/[0.5]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value)
                updateURLParams({ status: value === 'ALL' ? undefined : value })
              }}>
                <SelectTrigger className="bg-white/[0.5] dark:bg-gray-800/[0.5]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={(value) => {
                setPriorityFilter(value)
                updateURLParams({ priority: value === 'ALL' ? undefined : value })
              }}>
                <SelectTrigger className="bg-white/[0.5] dark:bg-gray-800/[0.5]">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(value) => {
                setSortBy(value)
                updateURLParams({ sort: value === 'newest' ? undefined : value })
              }}>
                <SelectTrigger className="bg-white/[0.5] dark:bg-gray-800/[0.5]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              {/* Page Size Selector */}
              <Select value={pageSize.toString()} onValueChange={(value) => {
                const newSize = parseInt(value)
                setPageSize(newSize)
                updateURLParams({ pageSize: newSize === 20 ? undefined : newSize })
              }}>
                <SelectTrigger className="bg-white/[0.5] dark:bg-gray-800/[0.5]">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {viewMode === 'table' && (
                <ColumnCustomizer 
                  columns={tableColumns}
                  onColumnsChange={handleColumnsChange}
                  storageKey="ticket-table-columns"
                />
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadTickets}
                className="bg-white/[0.5] dark:bg-gray-800/[0.5]"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading tickets...</p>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tickets found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                ? 'No tickets match your current filters.'
                : 'Create your first ticket to get started.'}
            </p>
            <Button onClick={onCreateTicket} className="bg-gradient-to-r from-blue-500 to-indigo-600">
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems} ticket{totalItems !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Render based on view mode */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {tickets.map((ticket) => (
                <div key={ticket.id}>{renderTicketCard(ticket)}</div>
              ))}
            </div>
          ) : viewMode === 'table' ? (
            renderTableView()
          ) : viewMode === 'inbox' ? (
            renderInboxView()
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id}>{renderTicketListItem(ticket)}</div>
              ))}
            </div>
          )}

          {/* Pagination - Always show if there are tickets */}
          {totalItems > 0 && (
            <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg mt-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages} • {totalItems} total tickets
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = Math.max(1, currentPage - 1)
                        setCurrentPage(newPage)
                        updateURLParams({ page: newPage === 1 ? undefined : newPage })
                      }}
                      disabled={currentPage === 1}
                      className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 z-10 relative"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = Math.min(totalPages, currentPage + 1)
                        setCurrentPage(newPage)
                        updateURLParams({ page: newPage === 1 ? undefined : newPage })
                      }}
                      disabled={currentPage === totalPages}
                      className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 z-10 relative"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Bulk Actions Bar */}
      {enableBulkActions && (
        <BulkActionsBar
          selectedCount={selectedTickets.length}
          selectedTickets={selectedTickets}
          onClearSelection={handleClearSelection}
          onBulkClaim={handleBulkClaim}
          isVisible={selectedTickets.length > 0}
        />
      )}
    </div>
  )
}