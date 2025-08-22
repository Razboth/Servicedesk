'use client'

import { useState } from 'react'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Grid3X3, Table as TableIcon } from 'lucide-react'

interface ResponsiveTableProps {
  children: React.ReactNode
  mobileCardView?: React.ReactNode
  className?: string
}

export function ResponsiveTable({ children, mobileCardView, className }: ResponsiveTableProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  return (
    <div className={className}>
      {/* Mobile view mode toggle */}
      <div className="md:hidden mb-4 flex justify-end">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border shadow-sm">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-7 px-2"
            title="Table View"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="h-7 px-2"
            title="Card View"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Desktop: Always show table, Mobile: Show based on viewMode */}
      <div className={`${viewMode === 'table' || !mobileCardView ? 'block' : 'hidden md:block'}`}>
        {/* Table with horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile card view */}
      {mobileCardView && (
        <div className={`md:hidden ${viewMode === 'cards' ? 'block' : 'hidden'}`}>
          {mobileCardView}
        </div>
      )}
    </div>
  )
}

interface ResponsiveTableHeaderProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveTableHeader({ children, className }: ResponsiveTableHeaderProps) {
  return (
    <TableHeader className={className}>
      {children}
    </TableHeader>
  )
}

interface ResponsiveTableRowProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function ResponsiveTableRow({ children, className, onClick }: ResponsiveTableRowProps) {
  return (
    <TableRow className={className} onClick={onClick}>
      {children}
    </TableRow>
  )
}

interface ResponsiveTableCellProps {
  children: React.ReactNode
  className?: string
  priority?: 'high' | 'medium' | 'low' // Priority for mobile display
}

export function ResponsiveTableCell({ children, className, priority = 'medium' }: ResponsiveTableCellProps) {
  const priorityClasses = {
    high: '', // Always visible
    medium: 'hidden sm:table-cell', // Hidden on mobile
    low: 'hidden lg:table-cell' // Hidden on mobile and tablet
  }

  return (
    <td className={`${priorityClasses[priority]} ${className || ''}`}>
      {children}
    </td>
  )
}

// Mobile card component for table alternatives
interface MobileCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function MobileCard({ children, className, onClick }: MobileCardProps) {
  return (
    <Card className={`mb-3 cursor-pointer hover:shadow-md transition-shadow ${className || ''}`} onClick={onClick}>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  )
}

// Pagination component for large tables
interface ResponsiveTablePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function ResponsiveTablePagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  className 
}: ResponsiveTablePaginationProps) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 sm:px-6 ${className || ''}`}>
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Page <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="rounded-l-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
              if (pageNum > totalPages) return null
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="rounded-none"
                >
                  {pageNum}
                </Button>
              )
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-r-md"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </div>
    </div>
  )
}