'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Printer, 
  Download,
  Maximize2,
  FileText
} from 'lucide-react'

interface AttachmentPreviewProps {
  isOpen: boolean
  onClose: () => void
  attachment: {
    id: string
    filename?: string
    originalName: string
    mimeType: string
    size: number
    ticketId?: string
    commentId?: string
  }
  attachments?: Array<{
    id: string
    filename?: string
    originalName: string
    mimeType: string
    size: number
    ticketId?: string
    commentId?: string
  }>
  currentIndex?: number
  onNavigate?: (index: number) => void
  ticketTitle?: string
}

export function AttachmentPreview({
  isOpen,
  onClose,
  attachment,
  attachments,
  currentIndex = 0,
  onNavigate,
  ticketTitle
}: AttachmentPreviewProps) {
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [localCurrentIndex, setLocalCurrentIndex] = useState(currentIndex)
  const transformRef = useRef<any>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Use current attachment from array if available
  const currentAttachment = attachments?.[localCurrentIndex] || attachment

  const isImage = currentAttachment.mimeType?.startsWith('image/')
  const isPDF = currentAttachment.mimeType === 'application/pdf'
  const hasMultiple = attachments && attachments.length > 1

  // Get ticket ID from the URL if not provided
  const getTicketId = () => {
    if (currentAttachment.ticketId) return currentAttachment.ticketId
    // Extract from current URL path
    const pathParts = window.location.pathname.split('/')
    const ticketIndex = pathParts.indexOf('tickets')
    if (ticketIndex !== -1 && pathParts[ticketIndex + 1]) {
      return pathParts[ticketIndex + 1]
    }
    return null
  }

  // Handle navigation
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!attachments) return

    let newIndex: number
    if (direction === 'next') {
      newIndex = (localCurrentIndex + 1) % attachments.length
    } else {
      newIndex = localCurrentIndex === 0 ? attachments.length - 1 : localCurrentIndex - 1
    }

    setLocalCurrentIndex(newIndex)
    setRotation(0) // Reset rotation on navigation
    if (onNavigate) {
      onNavigate(newIndex)
    }
  }

  // Sync local index with prop - use length instead of reference to avoid unnecessary triggers
  const attachmentsLength = attachments?.length ?? 0

  useEffect(() => {
    if (attachmentsLength > 0 && currentIndex !== localCurrentIndex) {
      setLocalCurrentIndex(currentIndex)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, attachmentsLength]) // Intentionally exclude localCurrentIndex to prevent loops

  // Track attachment ID to prevent unnecessary reloads
  const currentAttachmentId = currentAttachment?.id

  useEffect(() => {
    if (isOpen && currentAttachmentId) {
      loadAttachment()
    }
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl)
      }
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [isOpen, currentAttachmentId, localCurrentIndex])

  const loadAttachment = async () => {
    setLoading(true)
    setError(null)

    try {
      const ticketId = currentAttachment.ticketId || getTicketId()
      if (!ticketId) {
        throw new Error('Could not determine ticket ID')
      }

      // Build the correct API URL based on whether it's a comment attachment or ticket attachment
      let apiUrl: string
      if (currentAttachment.commentId) {
        apiUrl = `/api/tickets/${ticketId}/comments/${currentAttachment.commentId}/attachments/${currentAttachment.id}/download`
      } else {
        apiUrl = `/api/tickets/${ticketId}/attachments/${currentAttachment.id}/download`
      }

      const response = await fetch(apiUrl)
      if (!response.ok) {
        throw new Error('Failed to load attachment')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      if (isImage) {
        setImageUrl(url)
      } else if (isPDF) {
        setPdfUrl(url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attachment')
    } finally {
      setLoading(false)
    }
  }

  const handleRotate = (direction: 'left' | 'right') => {
    const newRotation = direction === 'right' 
      ? (rotation + 90) % 360 
      : (rotation - 90 + 360) % 360
    setRotation(newRotation)
  }

  const handlePrint = () => {
    if (isPDF && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print()
    } else if (isImage && imageUrl) {
      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      const content = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print ${currentAttachment.originalName}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              img {
                max-width: 100%;
                height: auto;
                transform: rotate(${rotation}deg);
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="${currentAttachment.originalName}" />
          </body>
        </html>
      `

      printWindow.document.write(content)
      printWindow.document.close()
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          printWindow.onafterprint = () => {
            printWindow.close()
          }
        }, 500)
      }
    }
  }

  const handleDownload = async () => {
    try {
      const ticketId = currentAttachment.ticketId || getTicketId()
      if (!ticketId) {
        throw new Error('Could not determine ticket ID')
      }

      // Build the correct API URL based on whether it's a comment attachment or ticket attachment
      let apiUrl: string
      if (currentAttachment.commentId) {
        apiUrl = `/api/tickets/${ticketId}/comments/${currentAttachment.commentId}/attachments/${currentAttachment.id}/download`
      } else {
        apiUrl = `/api/tickets/${ticketId}/attachments/${currentAttachment.id}/download`
      }

      const response = await fetch(apiUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = currentAttachment.originalName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  if (!isOpen) return null

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <p className="mb-2">Error loading attachment</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )
    }

    if (isImage && imageUrl) {
      return (
        <>
          {/* Control Buttons - Fixed Position */}
          <div className="absolute top-4 left-4 z-20 flex gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
            <Button
              size="sm"
              variant="outline"
              onClick={() => transformRef.current?.zoomIn()}
              title="Zoom In (Scroll wheel also works)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => transformRef.current?.zoomOut()}
              title="Zoom Out (Scroll wheel also works)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => transformRef.current?.resetTransform()}
              title="Reset View"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRotate('left')}
              title="Rotate Left"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRotate('right')}
              title="Rotate Right"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              title="Print"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Mouse wheel to zoom • Click and drag to pan • Double-click to zoom
            </p>
          </div>

          {/* Image with Transform Controls */}
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={0.1}
            maxScale={10}
            wheel={{ wheelDisabled: false, step: 0.1 }}
            panning={{ disabled: false }}
            doubleClick={{ disabled: false }}
            alignmentAnimation={{ disabled: true }}
            velocityAnimation={{ disabled: true }}
            limitToBounds={false}
            centerOnInit={true}
          >
            {() => (
              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: '100%',
                  cursor: 'move'
                }}
                contentStyle={{
                  width: '100%',
                  height: '100%',
                }}
              >
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}>
                  <img
                    src={imageUrl}
                    alt={currentAttachment.originalName}
                    style={{ 
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      transform: `rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease',
                      userSelect: 'none',
                      pointerEvents: 'all'
                    }}
                    draggable={false}
                  />
                </div>
              </TransformComponent>
            )}
          </TransformWrapper>
        </>
      )
    }

    if (isPDF && pdfUrl) {
      return (
        <div className="relative w-full h-full flex flex-col">
          <div className="absolute top-4 left-4 z-10 flex gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              title="Print PDF"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&zoom=page-width`}
            className="w-full flex-1 border-0"
            title={currentAttachment.originalName}
            style={{ minHeight: '600px' }}
          />
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-600">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="mb-2">Preview not available for this file type</p>
          <p className="text-sm mb-4">{currentAttachment.mimeType}</p>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="fixed left-[50%] top-[50%] z-50 w-[95vw] h-[90vh] translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-white dark:bg-gray-900 relative">
          <div className="pr-12">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentAttachment.originalName}
              </h2>
              {hasMultiple && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({localCurrentIndex + 1} of {attachments.length})
                </span>
              )}
            </div>
            {ticketTitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Ticket: {ticketTitle}
              </p>
            )}
          </div>

          {/* Navigation buttons */}
          {hasMultiple && (
            <div className="absolute right-16 top-4 flex gap-1">
              <button
                onClick={() => handleNavigate('prev')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Previous attachment"
              >
                <svg className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => handleNavigate('next')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Next attachment"
              >
                <svg className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="relative w-full h-[calc(100%-73px)] overflow-hidden bg-gray-100 dark:bg-gray-950">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}