'use client'

import { useEffect } from 'react'

export function ChunkErrorHandler() {
  useEffect(() => {
    // Handle chunk loading errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error || event.message

      // Check if it's a chunk loading error
      if (
        error &&
        (error.toString().includes('Loading chunk') ||
          error.toString().includes('ChunkLoadError') ||
          event.message?.includes('Loading chunk'))
      ) {
        console.warn('Chunk loading error detected, reloading page...')

        // Prevent infinite reload loops
        const lastReload = sessionStorage.getItem('lastChunkErrorReload')
        const now = Date.now()

        if (!lastReload || now - parseInt(lastReload) > 10000) {
          sessionStorage.setItem('lastChunkErrorReload', now.toString())
          window.location.reload()
        } else {
          console.error('Multiple chunk errors detected, please clear browser cache')
        }
      }
    }

    // Handle unhandled promise rejections (chunk errors often appear here)
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason &&
        (event.reason.toString().includes('Loading chunk') ||
          event.reason.toString().includes('ChunkLoadError'))
      ) {
        console.warn('Chunk loading error detected in promise, reloading page...')

        const lastReload = sessionStorage.getItem('lastChunkErrorReload')
        const now = Date.now()

        if (!lastReload || now - parseInt(lastReload) > 10000) {
          sessionStorage.setItem('lastChunkErrorReload', now.toString())
          window.location.reload()
        }
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
