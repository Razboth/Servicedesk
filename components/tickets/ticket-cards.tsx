'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  UserPlus
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
      params.append('limit', '50')
      
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

  if (tickets.length === 0) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tickets.map((ticket) => (
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
  )
}