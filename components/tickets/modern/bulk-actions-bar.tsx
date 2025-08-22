'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  UserPlus, 
  X, 
  Loader2,
  CheckCircle,
  AlertCircle 
} from 'lucide-react'
import { toast } from 'sonner'

interface BulkActionsBarProps {
  selectedCount: number
  selectedTickets: string[]
  onClearSelection: () => void
  onBulkClaim: (ticketIds: string[]) => Promise<void>
  isVisible: boolean
}

export function BulkActionsBar({ 
  selectedCount, 
  selectedTickets, 
  onClearSelection, 
  onBulkClaim,
  isVisible 
}: BulkActionsBarProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleBulkClaim = async () => {
    if (selectedCount === 0) return

    try {
      setIsProcessing(true)
      await onBulkClaim(selectedTickets)
    } catch (error) {
      console.error('Error in bulk claim:', error)
      toast.error('Failed to claim tickets')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isVisible || selectedCount === 0) {
    return null
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2">
      <Card className="bg-white/[0.95] dark:bg-gray-800/[0.95] backdrop-blur-lg border shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedCount} ticket{selectedCount !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearSelection}
                disabled={isProcessing}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>

              <Button
                onClick={handleBulkClaim}
                disabled={isProcessing}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Claim Selected
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}