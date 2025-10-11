'use client'

import * as React from 'react'
import { useState } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableViewOptions } from './data-table-view-options'
import { DataTableFacetedFilter } from './data-table-faceted-filter'
import { DataTableDateRangeFilter } from './data-table-date-range-filter'
import {
  RefreshCw,
  Filter,
  Download,
  UserPlus,
  CheckSquare,
  User,
  UserCheck,
  CheckCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Define the status options - all available statuses from schema
export const statuses = [
  { value: 'OPEN', label: 'Open', icon: '🔵' },
  { value: 'PENDING', label: 'Pending', icon: '🟡' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval', icon: '🟠' },
  { value: 'APPROVED', label: 'Approved', icon: '✅' },
  { value: 'REJECTED', label: 'Rejected', icon: '❌' },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: '⚡' },
  { value: 'PENDING_VENDOR', label: 'Pending Vendor', icon: '⏳' },
  { value: 'RESOLVED', label: 'Resolved', icon: '🟢' },
  { value: 'CLOSED', label: 'Closed', icon: '⚫' },
  { value: 'CANCELLED', label: 'Cancelled', icon: '🔴' },
]

// Define the priority options - all available priorities from schema
export const priorities = [
  { value: 'LOW', label: 'Low', icon: '🔵' },
  { value: 'MEDIUM', label: 'Medium', icon: '🟡' },
  { value: 'HIGH', label: 'High', icon: '🟠' },
  { value: 'CRITICAL', label: 'Critical', icon: '🔴' },
  { value: 'EMERGENCY', label: 'Emergency', icon: '🚨' },
]

// Define assignment status options
export const assignmentStatuses = [
  { value: 'assigned', label: 'Assigned', icon: UserCheck },
  { value: 'unassigned', label: 'Unassigned', icon: User },
]

// Define SLA status options
export const slaStatuses = [
  { value: 'within', label: 'Within SLA', icon: '✅' },
  { value: 'at_risk', label: 'At Risk', icon: '⚠️' },
  { value: 'breached', label: 'Breached', icon: '🚨' },
]

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  onRefresh?: () => void
  globalFilter: string
  setGlobalFilter: (value: string) => void
  enableBulkActions?: boolean
  selectedRows?: TData[]
  onBulkAction?: (action: string, selectedRows: TData[], additionalData?: any, table?: any) => void
  bulkActionType?: 'claim' | 'status'
  branchOptions?: { value: string; label: string }[]
  categoryOptions?: { value: string; label: string }[]
  serviceOptions?: { value: string; label: string }[]
  technicianOptions?: { value: string; label: string }[]
  onServerSearch?: (query: string) => void
  onFilterChange?: (filters: {
    status?: string;
    priority?: string;
    category?: string;
    branch?: string;
    assignment?: string;
    technicianId?: string;
  }) => void
}

export function DataTableToolbar<TData>({
  table,
  onRefresh,
  globalFilter,
  setGlobalFilter,
  enableBulkActions,
  selectedRows = [],
  onBulkAction,
  bulkActionType,
  branchOptions = [],
  categoryOptions = [],
  serviceOptions = [],
  technicianOptions = [],
  onServerSearch,
  onFilterChange,
}: DataTableToolbarProps<TData>) {
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchValue, setSearchValue] = useState<string>('')
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter !== '' || searchValue !== ''

  // Notify parent component when filters change (for server-side filtering)
  React.useEffect(() => {
    if (onFilterChange) {
      const columnFilters = table.getState().columnFilters
      const statusFilter = columnFilters.find(f => f.id === 'status')
      const priorityFilter = columnFilters.find(f => f.id === 'priority')
      const categoryFilter = columnFilters.find(f => f.id === 'service.category.name')
      const branchFilter = columnFilters.find(f => f.id === 'branch.code')
      const slaStatusFilter = columnFilters.find(f => f.id === 'slaStatus')
      const createdAtFilter = columnFilters.find(f => f.id === 'createdAt')
      const updatedAtFilter = columnFilters.find(f => f.id === 'updatedAt')
      const assignmentFilter = columnFilters.find(f => f.id === 'assignmentStatus')
      const technicianFilter = columnFilters.find(f => f.id === 'assignedTo.id')

      // Extract values - faceted filters return arrays, join with comma for multi-select
      const statusValue = statusFilter?.value
      const priorityValue = priorityFilter?.value
      const categoryValue = categoryFilter?.value
      const branchValue = branchFilter?.value
      const slaStatusValue = slaStatusFilter?.value
      const assignmentValue = assignmentFilter?.value
      const technicianValue = technicianFilter?.value

      // Date range filters return [from, to] array
      const createdAtValue = createdAtFilter?.value as [Date, Date] | undefined
      const updatedAtValue = updatedAtFilter?.value as [Date, Date] | undefined

      onFilterChange({
        status: Array.isArray(statusValue) ? statusValue.join(',') : statusValue as string | undefined,
        priority: Array.isArray(priorityValue) ? priorityValue.join(',') : priorityValue as string | undefined,
        category: Array.isArray(categoryValue) ? categoryValue[0] : categoryValue as string | undefined,
        branch: Array.isArray(branchValue) ? branchValue[0] : branchValue as string | undefined,
        slaStatus: Array.isArray(slaStatusValue) ? slaStatusValue[0] : slaStatusValue as string | undefined,
        // Assignment filter - single select (assigned/unassigned)
        assignment: Array.isArray(assignmentValue) ? assignmentValue[0] : assignmentValue as string | undefined,
        // Technician filter - multi-select by technician IDs (join with comma)
        technicianId: Array.isArray(technicianValue) ? technicianValue.join(',') : technicianValue as string | undefined,
        createdAfter: createdAtValue?.[0]?.toISOString(),
        createdBefore: createdAtValue?.[1]?.toISOString(),
        updatedAfter: updatedAtValue?.[0]?.toISOString(),
        updatedBefore: updatedAtValue?.[1]?.toISOString(),
      } as any)
    }
  }, [table.getState().columnFilters, onFilterChange])

  // Debug: Log available columns
  React.useEffect(() => {
    const allColumns = table.getAllColumns().map(col => col.id)
    console.log('Available columns:', allColumns)
    console.log('Branch column exists:', !!table.getColumn('branch.code'))
    console.log('Branch options:', branchOptions.length, branchOptions.slice(0, 3))
    console.log('Category column exists:', !!table.getColumn('service.category.name'))
    console.log('Category options:', categoryOptions.length, categoryOptions.slice(0, 3))
    console.log('Service column exists:', !!table.getColumn('service.name'))
    console.log('Service options:', serviceOptions.length, serviceOptions.slice(0, 3))
    console.log('Technician column exists:', !!table.getColumn('assignedTo.id'))
    console.log('Technician options:', technicianOptions.length, technicianOptions.slice(0, 3))
  }, [table, branchOptions, categoryOptions, serviceOptions, technicianOptions])

  return (
    <div className="flex flex-col gap-4">
      {/* Bulk Actions Bar */}
      {enableBulkActions && selectedRows.length > 0 && (
        <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedRows.length} selected
            </Badge>
            {bulkActionType === 'claim' ? (
              <Button
                size="sm"
                variant="default"
                onClick={() => onBulkAction?.('claim', selectedRows, undefined, table)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Claim Selected
              </Button>
            ) : bulkActionType === 'status' ? (
              <>
                <select
                  id="bulk-status"
                  className="h-8 px-3 py-1 text-sm border rounded-md bg-white dark:bg-gray-900"
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value)
                  }}
                >
                  <option value="">Select Status...</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    if (selectedStatus) {
                      onBulkAction?.('updateStatus', selectedRows, { status: selectedStatus }, table)
                      setSelectedStatus('') // Reset selection after update
                    }
                  }}
                  disabled={!selectedStatus}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
              </>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => table.toggleAllPageRowsSelected(false)}
          >
            Clear Selection
          </Button>
        </div>
      )}
      
      {/* Main Toolbar */}
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search tickets (ID, title, description)..."
              value={onServerSearch ? searchValue : (globalFilter ?? '')}
              onChange={(event) => {
                const value = event.target.value
                // If server-side search is available, use it exclusively
                if (onServerSearch) {
                  setSearchValue(value)
                  setGlobalFilter('')  // Clear client-side filter to prevent double filtering
                  onServerSearch(value)
                } else {
                  // Fall back to client-side filtering
                  setGlobalFilter(value)
                }
              }}
              className="h-8 w-[150px] lg:w-[350px]"
            />
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="h-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
          <DataTableViewOptions table={table} />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          {table.getColumn('status') && (
            <DataTableFacetedFilter
              column={table.getColumn('status')}
              title="Status"
              options={statuses}
            />
          )}
          
          {/* Priority Filter */}
          {table.getColumn('priority') && (
            <DataTableFacetedFilter
              column={table.getColumn('priority')}
              title="Priority"
              options={priorities}
            />
          )}

          {/* SLA Status Filter */}
          {table.getColumn('slaStatus') && (
            <DataTableFacetedFilter
              column={table.getColumn('slaStatus')}
              title="SLA Status"
              options={slaStatuses}
            />
          )}

          {/* Branch Filter */}
          {table.getColumn('branch.code') && (
            <DataTableFacetedFilter
              column={table.getColumn('branch.code')}
              title="Branch"
              options={branchOptions}
            />
          )}
          
          {/* Assignment Status Filter */}
          {table.getColumn('assignmentStatus') && (
            <DataTableFacetedFilter
              column={table.getColumn('assignmentStatus')}
              title="Assignment"
              options={assignmentStatuses}
            />
          )}
          
          {/* Category Filter */}
          {table.getColumn('service.category.name') && (
            <DataTableFacetedFilter
              column={table.getColumn('service.category.name')}
              title="Category"
              options={categoryOptions}
            />
          )}
          
          {/* Service Filter */}
          {table.getColumn('service.name') && (
            <DataTableFacetedFilter
              column={table.getColumn('service.name')}
              title="Service"
              options={serviceOptions}
            />
          )}
          
          {/* Technician Filter */}
          {table.getColumn('assignedTo.id') && (
            <DataTableFacetedFilter
              column={table.getColumn('assignedTo.id')}
              title="Technician"
              options={technicianOptions}
            />
          )}
          
          {/* Date Filters */}
          {table.getColumn('createdAt') && (
            <DataTableDateRangeFilter
              column={table.getColumn('createdAt')}
              title="Created Date"
            />
          )}
          
          {table.getColumn('updatedAt') && (
            <DataTableDateRangeFilter
              column={table.getColumn('updatedAt')}
              title="Updated Date"
            />
          )}
          
          {/* Reset Filters */}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                table.resetColumnFilters()
                setGlobalFilter('')
                setSearchValue('')
                // Clear server-side search as well
                if (onServerSearch) {
                  onServerSearch('')
                }
              }}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <Cross2Icon className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}