'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import './ticket-cards.css'
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

type TicketWithMeta = Ticket & {
  isNew?: boolean
  highlightedUntil?: number
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
      return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-medium'
    case 'PENDING':
      return 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700 font-medium'
    case 'PENDING_APPROVAL':
      return 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 dark:from-purple-900/30 dark:to-purple-800/30 dark:text-purple-300 border border-purple-200 dark:border-purple-700 font-medium'
    case 'APPROVED':
      return 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 dark:from-emerald-900/30 dark:to-emerald-800/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 font-medium'
    case 'REJECTED':
      return 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 dark:from-red-900/30 dark:to-red-800/30 dark:text-red-300 border border-red-200 dark:border-red-700 font-medium'
    case 'IN_PROGRESS':
      return 'bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-700 dark:from-cyan-900/30 dark:to-cyan-800/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700 font-medium animate-pulse'
    case 'PENDING_VENDOR':
      return 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 dark:from-indigo-900/30 dark:to-indigo-800/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 font-medium'
    case 'RESOLVED':
      return 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-300 border border-green-200 dark:border-green-700 font-semibold'
    case 'CLOSED':
      return 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 dark:from-slate-800/30 dark:to-slate-700/30 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium'
    case 'CANCELLED':
      return 'bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 dark:from-rose-900/30 dark:to-rose-800/30 dark:text-rose-300 border border-rose-200 dark:border-rose-700 font-medium line-through'
    default:
      return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 dark:from-gray-800/30 dark:to-gray-700/30 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-medium'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'LOW':
      return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 dark:from-blue-900/20 dark:to-blue-800/20 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-medium'
    case 'MEDIUM':
      return 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 dark:from-amber-900/20 dark:to-amber-800/20 dark:text-amber-300 border border-amber-200 dark:border-amber-700 font-medium'
    case 'HIGH':
      return 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 dark:from-orange-900/20 dark:to-orange-800/20 dark:text-orange-300 border border-orange-200 dark:border-orange-700 font-medium'
    case 'CRITICAL':
      return 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 dark:from-red-900/20 dark:to-red-800/20 dark:text-red-300 border border-red-200 dark:border-red-700 font-semibold'
    case 'EMERGENCY':
      return 'bg-gradient-to-r from-red-500 to-red-600 text-white dark:from-red-600 dark:to-red-700 border border-red-600 dark:border-red-500 font-bold animate-pulse shadow-lg'
    default:
      return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 dark:from-gray-800/20 dark:to-gray-700/20 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-medium'
  }
}

export function TicketCards({ ticketFilter, onRefresh, showClaimButton = false }: TicketCardsProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [tickets, setTickets] = useState<TicketWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [previousTicketIds, setPreviousTicketIds] = useState<Set<string>>(new Set())
  const [claimingTickets, setClaimingTickets] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')

  // Smart merge function for cards
  const mergeTicketsSmartly = (existing: TicketWithMeta[], incoming: Ticket[]): TicketWithMeta[] => {
    const now = Date.now()
    const existingMap = new Map(existing.map(t => [t.id, t]))
    
    const merged = incoming.map(ticket => {
      const existingTicket = existingMap.get(ticket.id)
      
      if (existingTicket) {
        return {
          ...ticket,
          isNew: existingTicket.isNew,
          highlightedUntil: existingTicket.highlightedUntil
        }
      }
      
      const isActuallyNew = !previousTicketIds.has(ticket.id)
      return {
        ...ticket,
        isNew: isActuallyNew,
        highlightedUntil: isActuallyNew ? now + 5000 : undefined
      }
    })
    
    return merged.sort((a, b) => {
      if (a.isNew && !b.isNew) return -1
      if (!a.isNew && b.isNew) return 1
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
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadTickets(true)
  }, [ticketFilter])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        loadTickets(false)
      }
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [isLoading])

  const loadTickets = async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }
      
      const params = new URLSearchParams()
      if (ticketFilter) {
        params.append('filter', ticketFilter)
      }
      params.append('limit', '100')
      
      const response = await fetch(`/api/tickets?${params}`)
      if (response.ok) {
        const data = await response.json()
        const loadedTickets = data.tickets || []
        
        if (!isInitial && tickets.length > 0) {
          const mergedTickets = mergeTicketsSmartly(tickets, loadedTickets)
          setTickets(mergedTickets)
          
          const newTicketCount = mergedTickets.filter(t => t.isNew).length
          if (newTicketCount > 0) {
            toast.success(`${newTicketCount} new ticket${newTicketCount > 1 ? 's' : ''} added`)
          }
        } else {
          const ticketsWithMeta: TicketWithMeta[] = loadedTickets.map((t: Ticket) => ({
            ...t,
            isNew: false
          }))
          setTickets(ticketsWithMeta)
        }
        
        setPreviousTicketIds(new Set(loadedTickets.map((t: Ticket) => t.id)))
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
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
          <Card key={i} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl">
            <CardHeader className="space-y-1 p-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <Skeleton className="h-3 w-full" />
              </div>
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

      {/* Tickets Grid - ReUI Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTickets.map((ticket) => (
        <Card
          key={ticket.id}
          className={`relative group bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden ${
            ticket.isNew ? 'ring-2 ring-amber-500/20' : ''
          }`}
          onClick={() => handleCardClick(ticket.id)}
        >
          {/* Priority indicator bar */}
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${
            ticket.priority === 'CRITICAL' || ticket.priority === 'EMERGENCY'
              ? 'bg-red-500'
              : ticket.priority === 'HIGH'
              ? 'bg-orange-500'
              : ticket.priority === 'MEDIUM'
              ? 'bg-blue-500'
              : 'bg-gray-300'
          }`} />

          <CardHeader className="space-y-1 p-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                #{ticket.ticketNumber}
              </span>
              <div className="flex items-center gap-2">
                {ticket.isNew && (
                  <Badge className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs px-1.5 py-0 border-0">
                    NEW
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs px-1.5 py-0 ${
                    ticket.priority === 'CRITICAL' || ticket.priority === 'EMERGENCY'
                      ? 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20'
                      : ticket.priority === 'HIGH'
                      ? 'border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20'
                      : ticket.priority === 'MEDIUM'
                      ? 'border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
                  }`}
                >
                  {ticket.priority}
                </Badge>
              </div>
            </div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-primary transition-colors">
              {ticket.title}
            </h3>
          </CardHeader>

          <CardContent className="px-4 py-3 space-y-3">
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`text-xs px-2 py-0.5 font-medium ${
                    ticket.status === 'OPEN'
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : ticket.status === 'IN_PROGRESS'
                      ? 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400'
                      : ticket.status === 'PENDING' || ticket.status === 'PENDING_APPROVAL'
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                      : ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {getStatusIcon(ticket.status)}
                  <span className="ml-1">{ticket.status.replace(/_/g, ' ')}</span>
                </Badge>
              </div>

              {/* Service and category */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Layers className="h-3 w-3" />
                  <span className="truncate">{ticket.service.category.name}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5 truncate">
                  {ticket.service.name}
                </p>
              </div>

              {/* Branch info */}
              {ticket.branch && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {ticket.branch.name}
                  </span>
                </div>
              )}

              {/* Assignee and meta info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">
                    {ticket.assignedTo ? ticket.assignedTo.name.split(' ')[0] : 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {ticket._count.comments > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      <span>{ticket._count.comments}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: false })}</span>
                  </div>
                </div>
              </div>

            </CardContent>

            {/* Claim button for unassigned tickets */}
            {showClaimButton && !ticket.assignedTo && (
              <div className="px-4 pb-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium"
                  onClick={(e) => handleClaimTicket(e, ticket.id)}
                  disabled={claimingTickets.has(ticket.id)}
                >
                  {claimingTickets.has(ticket.id) ? (
                    <>
                      <div className="w-3 h-3 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-600 dark:text-gray-400">Claiming...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">Claim Ticket</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}