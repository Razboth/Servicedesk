'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Search, 
  Plus, 
  Filter, 
  Clock, 
  User, 
  AlertCircle,
  CheckCircle,
  Circle,
  Settings
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface SimpleTicket {
  id: string
  ticketNumber: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  createdAt: string
  updatedAt: string
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
  }
  branch?: {
    name: string
    code: string
  }
}

export default function SimpleTicketsPage() {
  const { data: session } = useSession()
  const [tickets, setTickets] = useState<SimpleTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tickets')
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <Circle className="h-4 w-4 text-blue-500" />
      case 'IN_PROGRESS': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'RESOLVED': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'CLOSED': return <CheckCircle className="h-4 w-4 text-gray-500" />
      default: return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'URGENT': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800'
      case 'RESOLVED': return 'bg-green-100 text-green-800'
      case 'CLOSED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Required</h2>
          <p className="text-gray-600">Please sign in to view tickets.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card shadow-sm border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
              <p className="text-gray-600 mt-1">
                {filteredTickets.length} tickets {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' ? 'found' : 'total'}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link href="/tickets">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced View
                </Button>
              </Link>
              <Link href="/tickets/simple/create">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Ticket
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-card rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priority</option>
                <option value="URGENT">Urgent</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Tickets List */}
        {!loading && (
          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your search criteria.'
                    : 'Create your first ticket to get started.'}
                </p>
                {(!searchTerm && statusFilter === 'all' && priorityFilter === 'all') && (
                  <Link href="/tickets/simple/create">
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Ticket
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <Link href={`/tickets/${ticket.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            {getStatusIcon(ticket.status)}
                            <span className="font-mono text-sm text-gray-500">
                              #{ticket.ticketNumber}
                            </span>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                            <Badge variant="outline" className={getStatusColor(ticket.status)}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                            {ticket.title}
                          </h3>
                          
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {ticket.description}
                          </p>
                          
                          <div className="flex items-center text-sm text-gray-500 space-x-4">
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              <span>{ticket.createdBy.name}</span>
                            </div>
                            {ticket.assignedTo && (
                              <div className="flex items-center">
                                <span>→</span>
                                <span className="ml-1">{ticket.assignedTo.name}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>
                                {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            {ticket.branch && (
                              <div className="hidden sm:flex items-center">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {ticket.branch.code}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Quick Stats */}
        {!loading && filteredTickets.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-lg shadow-sm border text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredTickets.filter(t => t.status === 'OPEN').length}
              </div>
              <div className="text-sm text-gray-600">Open</div>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm border text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredTickets.filter(t => t.status === 'IN_PROGRESS').length}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm border text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredTickets.filter(t => t.status === 'RESOLVED').length}
              </div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm border text-center">
              <div className="text-2xl font-bold text-gray-600">
                {filteredTickets.filter(t => t.status === 'CLOSED').length}
              </div>
              <div className="text-sm text-gray-600">Closed</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}