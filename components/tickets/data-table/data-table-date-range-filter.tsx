'use client'

import * as React from 'react'
import { CalendarIcon } from '@radix-ui/react-icons'
import { addDays, format } from 'date-fns'
import { Column } from '@tanstack/react-table'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DataTableDateRangeFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
}

export function DataTableDateRangeFilter<TData, TValue>({
  column,
  title = 'Date',
}: DataTableDateRangeFilterProps<TData, TValue>) {
  const [fromDate, setFromDate] = React.useState<Date | undefined>()
  const [toDate, setToDate] = React.useState<Date | undefined>()
  const [quickSelect, setQuickSelect] = React.useState<string>('')

  const handleQuickSelect = (value: string) => {
    setQuickSelect(value)
    const today = new Date()
    let from: Date | undefined
    let to: Date | undefined

    switch (value) {
      case 'today':
        from = today
        to = today
        break
      case 'yesterday':
        from = addDays(today, -1)
        to = addDays(today, -1)
        break
      case 'last7days':
        from = addDays(today, -7)
        to = today
        break
      case 'last30days':
        from = addDays(today, -30)
        to = today
        break
      case 'thisMonth':
        from = new Date(today.getFullYear(), today.getMonth(), 1)
        to = today
        break
      case 'lastMonth':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        to = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      case 'all':
        from = undefined
        to = undefined
        break
    }

    setFromDate(from)
    setToDate(to)
    
    if (from && to) {
      console.log('Setting date filter:', { from, to })
      column?.setFilterValue([from, to])
    } else {
      column?.setFilterValue(undefined)
    }
  }

  const applyDateFilter = () => {
    if (fromDate && toDate) {
      console.log('Applying date filter:', { fromDate, toDate })
      column?.setFilterValue([fromDate, toDate])
    } else if (fromDate && !toDate) {
      // If only from date is selected, use it as both from and to
      console.log('Applying single date filter:', fromDate)
      column?.setFilterValue([fromDate, fromDate])
    } else {
      column?.setFilterValue(undefined)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            size="sm"
            className={cn(
              'h-8 justify-start text-left font-normal',
              !fromDate && !toDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {fromDate ? (
              toDate && fromDate.getTime() !== toDate.getTime() ? (
                <>
                  {format(fromDate, 'MMM dd')} - {format(toDate, 'MMM dd, y')}
                </>
              ) : (
                format(fromDate, 'MMM dd, y')
              )
            ) : (
              <span>{title}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            {/* Quick select */}
            <Select value={quickSelect} onValueChange={handleQuickSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Quick select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7days">Last 7 days</SelectItem>
                <SelectItem value="last30days">Last 30 days</SelectItem>
                <SelectItem value="thisMonth">This month</SelectItem>
                <SelectItem value="lastMonth">Last month</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            {/* From Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !fromDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      setFromDate(date)
                      setQuickSelect('')
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !toDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => {
                      setToDate(date)
                      setQuickSelect('')
                    }}
                    initialFocus
                    disabled={(date) => fromDate ? date < fromDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={applyDateFilter}
                disabled={!fromDate}
              >
                Apply
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setFromDate(undefined)
                  setToDate(undefined)
                  column?.setFilterValue(undefined)
                  setQuickSelect('')
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}