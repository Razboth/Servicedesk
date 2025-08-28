'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface TicketEvent {
  id: string
  type: 'NEW_TICKET' | 'TICKET_APPROVED' | 'TICKET_CLAIMED' | 'STATUS_UPDATE' | 'NEW_COMMENT'
  ticketId: string
  ticketNumber: string
  branchName?: string
  catalogName?: string
  technicianName?: string
  status?: string
  commentBy?: string
  timestamp: Date
}

export function TicketNotifications() {
  const { data: session } = useSession()
  const [lastCheckTime, setLastCheckTime] = useState(new Date())
  const notifiedEvents = useRef<Set<string>>(new Set())
  const isFirstLoad = useRef(true)

  useEffect(() => {
    if (!session?.user?.id) return

    // Don't check on first load to avoid showing old events
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      setLastCheckTime(new Date())
      return
    }

    const checkForNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications/tickets?since=${lastCheckTime.toISOString()}`)
        if (!response.ok) return

        const events: TicketEvent[] = await response.json()
        
        // Process each event
        events.forEach(event => {
          // Skip if we've already notified about this event
          if (notifiedEvents.current.has(event.id)) return
          
          notifiedEvents.current.add(event.id)
          
          switch (event.type) {
            case 'NEW_TICKET':
              if (session.user?.role === 'MANAGER' || session.user?.role === 'ADMIN') {
                toast.info(
                  `Ticket baru dari ${event.branchName} dengan katalog ${event.catalogName}, Menunggu Approval Manager`,
                  { duration: 6000 }
                )
              }
              break
              
            case 'TICKET_APPROVED':
              if (['TECHNICIAN', 'SECURITY_ANALYST', 'ADMIN'].includes(session.user?.role || '')) {
                toast.success(
                  `Ticket dari ${event.branchName} dengan katalog ${event.catalogName}, telah di approve dengan kode ${event.ticketNumber}`,
                  { duration: 6000 }
                )
              }
              break
              
            case 'TICKET_CLAIMED':
              // Notify managers and admins when tickets are claimed
              if (['MANAGER', 'ADMIN'].includes(session.user?.role || '')) {
                toast.info(
                  `Ticket dengan nomor ${event.ticketNumber} telah di Claim ${event.technicianName}`,
                  { duration: 5000 }
                )
              }
              break
              
            case 'STATUS_UPDATE':
              // Notify relevant users about status updates
              toast.info(
                `Ticket dengan nomor ${event.ticketNumber} di update dengan status ${event.status} oleh ${event.technicianName}`,
                { duration: 5000 }
              )
              break
              
            case 'NEW_COMMENT':
              // Notify about new comments (skip your own comments)
              if (event.commentBy !== session.user?.name) {
                toast.message(
                  `Komentar baru pada ticket ${event.ticketNumber} dari ${event.commentBy}`,
                  { duration: 4000 }
                )
              }
              break
          }
        })
        
        // Update last check time
        if (events.length > 0) {
          setLastCheckTime(new Date())
        }
      } catch (error) {
        console.error('Error checking notifications:', error)
      }
    }

    // Check immediately, then set up interval
    checkForNotifications()
    const interval = setInterval(checkForNotifications, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [session, lastCheckTime])

  // Clean up old notified events periodically to prevent memory leak
  useEffect(() => {
    const cleanup = setInterval(() => {
      // Keep only last 100 events
      if (notifiedEvents.current.size > 100) {
        const entries = Array.from(notifiedEvents.current)
        notifiedEvents.current = new Set(entries.slice(-100))
      }
    }, 60000) // Clean every minute

    return () => clearInterval(cleanup)
  }, [])

  return null // This component doesn't render anything
}