'use client'

import React, { useState, useEffect } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import { Loader2, MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface ServerPaginationProps {
  currentPage: number
  pageSize: number
  totalTickets: number
  totalPages: number
  onPageChange: (page: number) => Promise<void>
  onPageSizeChange: (size: number) => Promise<void>
  onFirstPage: () => Promise<void>
  onLastPage: () => Promise<void>
  onPreviousPage: () => Promise<void>
  onNextPage: () => Promise<void>
}

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  pagination?: ServerPaginationProps
}

export function DataTablePagination<TData>({
  table,
  pagination,
}: DataTablePaginationProps<TData>) {
  const [isNavigating, setIsNavigating] = useState(false)
  const [jumpToPage, setJumpToPage] = useState('')
  const [showJumpInput, setShowJumpInput] = useState(false)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pagination && (e.ctrlKey || e.metaKey)) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault()
            if (pagination.currentPage > 1) {
              handleNavigation(() => pagination.onPreviousPage())
            }
            break
          case 'ArrowRight':
            e.preventDefault()
            if (pagination.currentPage < pagination.totalPages) {
              handleNavigation(() => pagination.onNextPage())
            }
            break
          case 'Home':
            e.preventDefault()
            handleNavigation(() => pagination.onFirstPage())
            break
          case 'End':
            e.preventDefault()
            handleNavigation(() => pagination.onLastPage())
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pagination])

  const handleNavigation = async (navigationFn: () => Promise<void>) => {
    setIsNavigating(true)
    try {
      await navigationFn()
    } finally {
      setIsNavigating(false)
    }
  }

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage)
    if (pagination && pageNum >= 1 && pageNum <= pagination.totalPages) {
      handleNavigation(() => pagination.onPageChange(pageNum))
      setJumpToPage('')
      setShowJumpInput(false)
    }
  }

  const handlePageSizeChange = (newSize: string) => {
    if (pagination) {
      handleNavigation(() => pagination.onPageSizeChange(Number(newSize)))
    } else {
      table.setPageSize(Number(newSize))
    }
  }

  // Use server pagination data if available, otherwise fall back to table state
  const currentPage = pagination ? pagination.currentPage : table.getState().pagination.pageIndex + 1
  const totalPages = pagination ? pagination.totalPages : table.getPageCount()
  const pageSize = pagination ? pagination.pageSize : table.getState().pagination.pageSize
  const totalRows = pagination ? pagination.totalTickets : table.getFilteredRowModel().rows.length
  const canPreviousPage = pagination ? pagination.currentPage > 1 : table.getCanPreviousPage()
  const canNextPage = pagination ? pagination.currentPage < pagination.totalPages : table.getCanNextPage()

  // Generate page range for quick navigation
  const getPageRange = () => {
    const delta = 2 // Number of pages to show on each side of current page
    const start = Math.max(1, currentPage - delta)
    const end = Math.min(totalPages, currentPage + delta)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }
  return (
    <div className="flex flex-col space-y-4 px-2">
      {/* Top Row: Selection info and records per page */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{' '}
            {table.getFilteredRowModel().rows.length} row(s) selected
          </div>
          {pagination && (
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to{' '}
              {Math.min(currentPage * pageSize, totalRows)} of {totalRows.toLocaleString()} tickets
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={handlePageSizeChange}
            disabled={isNavigating}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[20, 50, 100, 200].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bottom Row: Navigation controls */}
      <div className="flex items-center justify-between">
        {/* Keyboard shortcut hint */}
        {pagination && (
          <div className="hidden text-xs text-muted-foreground lg:block">
            Use Ctrl+← → for navigation, Ctrl+Home/End for first/last page
          </div>
        )}

        <div className="flex items-center space-x-2">
          {/* First page button */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => pagination ? handleNavigation(() => pagination.onFirstPage()) : table.setPageIndex(0)}
            disabled={!canPreviousPage || isNavigating}
          >
            <span className="sr-only">Go to first page</span>
            {isNavigating ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoubleArrowLeftIcon className="h-4 w-4" />}
          </Button>

          {/* Previous page button */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => pagination ? handleNavigation(() => pagination.onPreviousPage()) : table.previousPage()}
            disabled={!canPreviousPage || isNavigating}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          {/* Page number display with quick navigation */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              {/* Show page numbers for small ranges */}
              {totalPages <= 7 ? (
                getPageRange().map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    className="h-8 w-8 p-0"
                    onClick={() => pagination && page !== currentPage && handleNavigation(() => pagination.onPageChange(page))}
                    disabled={isNavigating}
                  >
                    {page}
                  </Button>
                ))
              ) : (
                // Show condensed view for large ranges
                <>
                  {currentPage > 3 && (
                    <>
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => pagination && handleNavigation(() => pagination.onPageChange(1))}
                        disabled={isNavigating}
                      >
                        1
                      </Button>
                      {currentPage > 4 && <span className="text-muted-foreground">...</span>}
                    </>
                  )}

                  {getPageRange().map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      className="h-8 w-8 p-0"
                      onClick={() => pagination && page !== currentPage && handleNavigation(() => pagination.onPageChange(page))}
                      disabled={isNavigating}
                    >
                      {page}
                    </Button>
                  ))}

                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && <span className="text-muted-foreground">...</span>}
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => pagination && handleNavigation(() => pagination.onPageChange(totalPages))}
                        disabled={isNavigating}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </>
              )}

              {/* Jump to page popover */}
              <Popover open={showJumpInput} onOpenChange={setShowJumpInput}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40" side="top">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Jump to page</p>
                    <div className="flex space-x-1">
                      <Input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={jumpToPage}
                        onChange={(e) => setJumpToPage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
                        className="h-8"
                        placeholder="Page"
                      />
                      <Button size="sm" onClick={handleJumpToPage} disabled={!jumpToPage || isNavigating}>
                        Go
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Current page indicator for single page or as fallback */}
          {totalPages <= 1 && (
            <div className="flex items-center justify-center text-sm font-medium min-w-[100px]">
              Page {currentPage} of {Math.max(1, totalPages)}
            </div>
          )}

          {/* Next page button */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => pagination ? handleNavigation(() => pagination.onNextPage()) : table.nextPage()}
            disabled={!canNextPage || isNavigating}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>

          {/* Last page button */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => pagination ? handleNavigation(() => pagination.onLastPage()) : table.setPageIndex(table.getPageCount() - 1)}
            disabled={!canNextPage || isNavigating}
          >
            <span className="sr-only">Go to last page</span>
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}