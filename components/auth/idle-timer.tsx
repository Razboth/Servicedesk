'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface IdleTimerProps {
  timeout?: number // timeout in milliseconds, default 30 minutes
  warningTime?: number // warning time in milliseconds, default 25 minutes
}

export default function IdleTimer({ 
  timeout = 30 * 60 * 1000, // 30 minutes
  warningTime = 25 * 60 * 1000 // 25 minutes  
}: IdleTimerProps) {
  const { data: session, status } = useSession()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningTimeoutRef = useRef<NodeJS.Timeout>()
  const countdownIntervalRef = useRef<NodeJS.Timeout>()
  const lastActivityRef = useRef<number>(Date.now())

  // Update last activity in database
  const updateLastActivity = async () => {
    if (!session?.user?.email) return

    try {
      await fetch('/api/auth/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: session.user.email,
          timestamp: new Date().toISOString() 
        })
      })
    } catch (error) {
      console.error('Failed to update last activity:', error)
    }
  }

  // Reset timer
  const resetTimer = () => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

    // Hide warning dialog
    setShowWarning(false)
    setCountdown(0)

    // Update last activity time
    lastActivityRef.current = Date.now()

    // Update database (throttled to prevent excessive requests)
    const now = Date.now()
    if (now - lastActivityRef.current > 60000) { // Update max once per minute
      updateLastActivity()
    }

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true)
      const warningDuration = timeout - warningTime
      setCountdown(Math.ceil(warningDuration / 1000))

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            handleTimeout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, warningTime)

    // Set logout timer
    timeoutRef.current = setTimeout(handleTimeout, timeout)
  }

  // Handle timeout - logout user
  const handleTimeout = async () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    
    // Update database before logout
    if (session?.user?.email) {
      try {
        await fetch('/api/auth/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: session.user.email,
            timestamp: new Date().toISOString(),
            action: 'idle_timeout'
          })
        })
      } catch (error) {
        console.error('Failed to log timeout activity:', error)
      }
    }

    // Sign out user
    await signOut({
      callbackUrl: '/auth/signin?message=Session expired due to inactivity'
    })
  }

  // Continue session - reset timer
  const handleContinueSession = () => {
    resetTimer()
  }

  // Activity event handlers
  const handleActivity = () => {
    const now = Date.now()
    // Only reset if more than 5 seconds have passed to avoid excessive resets
    if (now - lastActivityRef.current > 5000) {
      resetTimer()
    }
  }

  useEffect(() => {
    // Only run if user is authenticated
    if (status !== 'authenticated' || !session) {
      return
    }

    // Activity event types to monitor
    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ]

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Initialize timer
    resetTimer()

    // Cleanup on unmount
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [session, status])

  // Don't render anything if not authenticated
  if (status !== 'authenticated') {
    return null
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <svg 
              className="h-6 w-6 text-yellow-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in <strong>{formatTime(countdown)}</strong> due to inactivity.
            <br />
            <br />
            Click "Continue Session" to stay logged in, or you will be automatically signed out for security reasons.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleTimeout}
            className="bg-gray-100 hover:bg-gray-200"
          >
            Sign Out Now
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleContinueSession}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Format time for display
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}