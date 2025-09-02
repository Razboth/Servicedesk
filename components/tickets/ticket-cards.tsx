'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Clock,
  User,
  Building,
  MessageCircle,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Circle,
  XCircle,
  PauseCircle,
  ChevronRight,
  Tag,
  Layers,
  UserPlus,
  Search,
  Filter,
  X
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

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
    name: string
    code: string
  }
  createdBy: {
    name: string
    email: string
  }
  assignedTo?: {
    name: string
    email: string
  }
  service: {
    name: string
    category: {
      name: string
    }
  }
  _count: {
    comments: number
  }
}

interface TicketCardsProps {
  ticketFilter?: 'my-tickets' | 'available-tickets'
  onRefresh?: () => void
  showClaimButton?: boolean
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'OPEN':
      return <Circle className="h-4 w-4" />
    case 'PENDING':
    case 'PENDING_APPROVAL':
      return <Clock className="h-4 w-4" />
    case 'APPROVED':
      return <CheckCircle className="h-4 w-4" />
    case 'REJECTED':
      return <XCircle className="h-4 w-4" />
    case 'IN_PROGRESS':
      return <Clock className="h-4 w-4" />
    case 'PENDING_VENDOR':
      return <PauseCircle className="h-4 w-4" />
    case 'RESOLVED':
    case 'CLOSED':
      return <CheckCircle className="h-4 w-4" />
    case 'CANCELLED':
      return <XCircle className="h-4 w-4" />
    default:
      return <Circle className="h-4 w-4" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
    case 'PENDING_APPROVAL':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
    case 'APPROVED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
    case 'PENDING_VENDOR':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
    case 'RESOLVED':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300'
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'LOW':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    case 'EMERGENCY':
      return 'bg-red-200 text-red-900 dark:bg-red-900/70 dark:text-red-200 animate-pulse'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300'
  }
}

export function TicketCards({ ticketFilter, onRefresh, showClaimButton = false }: TicketCardsProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [claimingTickets, setClaimingTickets] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')

  useEffect(() => {
    loadTickets()
  }, [ticketFilter])

  const loadTickets = async () => {
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams()
      if (ticketFilter) {
        params.append('filter', ticketFilter)
      }
      params.append('limit', '100')
      
      const response = await fetch(`/api/tickets?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter tickets based on search and filters
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        ticket.title.toLowerCase().includes(searchLower) ||
        ticket.ticketNumber.toLowerCase().includes(searchLower) ||
        ticket.description?.toLowerCase().includes(searchLower) ||
        ticket.service.name.toLowerCase().includes(searchLower) ||
        ticket.service.category.name.toLowerCase().includes(searchLower)
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
      
      // Priority filter
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
      
      // Branch filter
      const matchesBranch = branchFilter === 'all' || ticket.branch?.code === branchFilter
      
      return matchesSearch && matchesStatus && matchesPriority && matchesBranch
    })
  }, [tickets, searchQuery, statusFilter, priorityFilter, branchFilter])

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(tickets.map(t => t.status))
    return Array.from(statuses).sort()
  }, [tickets])

  const uniquePriorities = useMemo(() => {
    const priorities = new Set(tickets.map(t => t.priority))
    return Array.from(priorities).sort()
  }, [tickets])

  const uniqueBranches = useMemo(() => {
    const branches = new Map<string, string>()
    tickets.forEach(t => {
      if (t.branch) {
        branches.set(t.branch.code, `${t.branch.code} - ${t.branch.name}`)
      }
    })
    return Array.from(branches.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [tickets])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setBranchFilter('all')
  }

  const handleCardClick = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`)
  }

  const handleClaimTicket = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation() // Prevent card click
    
    if (!session?.user?.id) {
      toast.error('You must be logged in to claim tickets')
      return
    }

    setClaimingTickets(prev => new Set(prev).add(ticketId))
    
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
        if (onRefresh) onRefresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to claim ticket')
      }
    } catch (error) {
      console.error('Error claiming ticket:', error)
      toast.error('Failed to claim ticket')
    } finally {
      setClaimingTickets(prev => {
        const newSet = new Set(prev)
        newSet.delete(ticketId)
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="bg-white/[0.7] dark:bg-gray-800/[0.7]">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || branchFilter !== 'all'

  if (tickets.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-gray-400 mb-4">
          <Circle className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No tickets found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {ticketFilter === 'my-tickets' 
            ? 'You have no assigned tickets'
            : 'No available tickets to claim'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm rounded-lg p-4 shadow-lg space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search tickets by title, number, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    <span>{status.replace(/_/g, ' ')}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {uniquePriorities.map(priority => (
                <SelectItem key={priority} value={priority}>
                  <Badge className={getPriorityColor(priority)}>
                    {priority}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Branch Filter */}
          {uniqueBranches.length > 0 && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {uniqueBranches.map(([code, label]) => (
                  <SelectItem key={code} value={code}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="ml-auto"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredTickets.length} of {tickets.length} tickets
          {hasActiveFilters && ' (filtered)'}
        </div>
      </div>

      {/* No Results Message */}
      {filteredTickets.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 bg-white/[0.7] dark:bg-gray-800/[0.7] rounded-lg">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No tickets match your filters
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Try adjusting your search or filters
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTickets.map((ticket) => (
        <Card
          key={ticket.id}
          className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => handleCardClick(ticket.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between mb-2">
              <Badge variant="outline" className="text-xs">
                #{ticket.ticketNumber}
              </Badge>
              <Badge className={`${getPriorityColor(ticket.priority)} text-xs`}>
                {ticket.priority}
              </Badge>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {ticket.title}
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(ticket.status)} flex items-center gap-1`}>
                {getStatusIcon(ticket.status)}
                <span className="text-xs">{ticket.status.replace(/_/g, ' ')}</span>
              </Badge>
            </div>

            {/* Category & Service */}
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Layers className="h-3 w-3" />
              <span className="truncate">{ticket.service.category.name}</span>
              <span className="text-gray-400">•</span>
              <span className="truncate">{ticket.service.name}</span>
            </div>

            {/* Branch */}
            {ticket.branch && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Building className="h-3 w-3" />
                <span className="truncate">{ticket.branch.code} - {ticket.branch.name}</span>
              </div>
            )}

            {/* Assignee */}
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <User className="h-3 w-3" />
              <span className="truncate">
                {ticket.assignedTo ? ticket.assignedTo.name : 'Unassigned'}
              </span>
            </div>

            {/* Comments count */}
            {ticket._count.comments > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <MessageCircle className="h-3 w-3" />
                <span>{ticket._count.comments} comments</span>
              </div>
            )}

            {/* Time info */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(ticket.createdAt), 'MMM dd')}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              {/* Claim button for unassigned tickets */}
              {showClaimButton && !ticket.assignedTo && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  onClick={(e) => handleClaimTicket(e, ticket.id)}
                  disabled={claimingTickets.has(ticket.id)}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  {claimingTickets.has(ticket.id) ? 'Claiming...' : 'Claim'}
                </Button>
              )}
              
              {/* View button */}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCardClick(ticket.id)
                }}
              >
                View Details
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}