'use client'

import React, { useState, useEffect } from 'react'
import { AnimatedList } from '@/components/ui/animated-list'
import { Bell, CheckCircle, AlertCircle, Clock, UserPlus, MessageSquare, FileText, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface NotificationItem {
  id: string
  title: string
  description: string
  time: Date
  icon: React.ReactNode
  color: string
}

interface TicketNotificationsProps {
  ticketId?: string
  className?: string
  autoFetch?: boolean
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'status_change':
      return <CheckCircle className="h-4 w-4" />
    case 'assignment':
      return <UserPlus className="h-4 w-4" />
    case 'comment':
      return <MessageSquare className="h-4 w-4" />
    case 'attachment':
      return <FileText className="h-4 w-4" />
    case 'overdue':
      return <Clock className="h-4 w-4" />
    case 'error':
      return <XCircle className="h-4 w-4" />
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

const getColorForType = (type: string) => {
  switch (type) {
    case 'status_change':
      return 'text-green-500 bg-green-50 dark:bg-green-950/50'
    case 'assignment':
      return 'text-blue-500 bg-blue-50 dark:bg-blue-950/50'
    case 'comment':
      return 'text-purple-500 bg-purple-50 dark:bg-purple-950/50'
    case 'attachment':
      return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50'
    case 'overdue':
      return 'text-orange-500 bg-orange-50 dark:bg-orange-950/50'
    case 'error':
      return 'text-red-500 bg-red-50 dark:bg-red-950/50'
    default:
      return 'text-gray-500 bg-gray-50 dark:bg-gray-950/50'
  }
}

export function TicketNotifications({ ticketId, className, autoFetch = true }: TicketNotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (autoFetch) {
      fetchNotifications()
    }

    // Set up polling for real-time updates
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [ticketId, autoFetch])

  const fetchNotifications = async () => {
    try {
      const endpoint = ticketId
        ? `/api/notifications/tickets?ticketId=${ticketId}`
        : '/api/notifications/tickets'

      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        const formattedNotifications = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          time: new Date(item.createdAt),
          icon: getIconForType(item.type),
          color: getColorForType(item.type)
        }))
        setNotifications(formattedNotifications)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Demo notifications if no real data
  useEffect(() => {
    if (!autoFetch && notifications.length === 0) {
      const demoNotifications: NotificationItem[] = [
        {
          id: '1',
          title: 'Ticket #1403 Created',
          description: 'New service request for password reset',
          time: new Date(Date.now() - 1000 * 60 * 2),
          icon: getIconForType('status_change'),
          color: getColorForType('status_change')
        },
        {
          id: '2',
          title: 'Ticket #1402 Assigned',
          description: 'Assigned to John Doe',
          time: new Date(Date.now() - 1000 * 60 * 5),
          icon: getIconForType('assignment'),
          color: getColorForType('assignment')
        },
        {
          id: '3',
          title: 'New Comment on #1401',
          description: 'Customer provided additional information',
          time: new Date(Date.now() - 1000 * 60 * 10),
          icon: getIconForType('comment'),
          color: getColorForType('comment')
        },
        {
          id: '4',
          title: 'Ticket #1400 Overdue',
          description: 'SLA breach warning',
          time: new Date(Date.now() - 1000 * 60 * 15),
          icon: getIconForType('overdue'),
          color: getColorForType('overdue')
        },
        {
          id: '5',
          title: 'Attachment Added',
          description: 'Screenshot.png added to ticket #1399',
          time: new Date(Date.now() - 1000 * 60 * 20),
          icon: getIconForType('attachment'),
          color: getColorForType('attachment')
        }
      ]
      setNotifications(demoNotifications)
      setIsLoading(false)
    }
  }, [autoFetch, notifications.length])

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="animate-pulse text-muted-foreground">Loading notifications...</div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">No notifications</p>
        <p className="text-sm text-muted-foreground/70 mt-1">You're all caught up!</p>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Recent Activity</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
        </span>
      </div>

      <AnimatedList className="max-h-[400px] overflow-y-auto" delay={200}>
        {notifications.map((notification, idx) => (
          <NotificationCard key={notification.id} {...notification} />
        ))}
      </AnimatedList>
    </div>
  )
}

function NotificationCard({
  title,
  description,
  time,
  icon,
  color
}: NotificationItem) {
  return (
    <div className={cn(
      "group flex items-start gap-3 rounded-lg border p-3 transition-all",
      "hover:shadow-md hover:scale-[1.01] cursor-pointer",
      "bg-card"
    )}>
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
        color
      )}>
        {icon}
      </div>

      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">
          {title}
        </p>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {formatDistanceToNow(time, { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}