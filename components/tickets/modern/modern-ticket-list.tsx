'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Plus
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

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
  viewMode: 'list' | 'grid'
  searchTerm: string
  onCreateTicket: () => void
}

export function ModernTicketList({ viewMode, searchTerm, onCreateTicket }: ModernTicketListProps) {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const pageSize = viewMode === 'grid' ? 12 : 10

  useEffect(() => {
    loadTickets()
  }, [currentPage, statusFilter, priorityFilter, sortBy])

  useEffect(() => {
    filterAndSortTickets()
  }, [tickets, searchTerm, statusFilter, priorityFilter, sortBy])

  const loadTickets = async () => {
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      })

      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter)
      }
      if (priorityFilter !== 'ALL') {
        params.append('priority', priorityFilter)
      }

      const response = await fetch(`/api/tickets?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
        setTotalPages(data.pagination?.totalPages || 1)
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

  const filterAndSortTickets = () => {
    let filtered = tickets.filter(ticket => {
      const matchesSearch = 
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.service.name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter
      const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })

    // Sort tickets
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'priority':
        const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
        filtered.sort((a, b) => (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0))
        break
      case 'status':
        filtered.sort((a, b) => a.status.localeCompare(b.status))
        break
    }

    setFilteredTickets(filtered)
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
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const handleTicketClick = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`)
  }

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <Card 
      className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
      onClick={() => handleTicketClick(ticket.id)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(ticket.status)}
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
              #{ticket.ticketNumber}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getPriorityColor(ticket.priority)}>
              {ticket.priority}
            </Badge>
            <Badge variant="outline" className={getStatusColor(ticket.status)}>
              {ticket.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {ticket.title}
        </h3>

        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {ticket.description}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              <span className="truncate max-w-24">{ticket.createdBy.name}</span>
            </div>
            
            {ticket.assignedTo && (
              <div className="flex items-center">
                <span>→</span>
                <span className="ml-1 truncate max-w-24">{ticket.assignedTo.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {ticket._count.comments > 0 && (
              <div className="flex items-center">
                <MessageCircle className="h-4 w-4 mr-1" />
                <span>{ticket._count.comments}</span>
              </div>
            )}
            
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span className="text-xs">
                {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Tag className="h-3 w-3 mr-1" />
              <span className="truncate">{ticket.service.name}</span>
            </div>
            
            {ticket.branch && (
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Building2 className="h-3 w-3 mr-1" />
                <span>{ticket.branch.code}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const TicketListItem = ({ ticket }: { ticket: Ticket }) => (
    <Card 
      className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
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

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/[0.5] dark:bg-gray-800/[0.5]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
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
              <Select value={sortBy} onValueChange={setSortBy}>
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
            </div>

            <div className="flex items-center gap-2">
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
      ) : filteredTickets.length === 0 ? (
        <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tickets found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                ? 'Try adjusting your search criteria.'
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <TicketListItem key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="bg-white/[0.5] dark:bg-gray-800/[0.5]"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400 px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="bg-white/[0.5] dark:bg-gray-800/[0.5]"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}