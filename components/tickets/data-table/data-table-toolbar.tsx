'use client'

import * as React from 'react'
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
  UserCheck
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

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  onRefresh?: () => void
  globalFilter: string
  setGlobalFilter: (value: string) => void
  enableBulkActions?: boolean
  selectedRows?: TData[]
  onBulkAction?: (action: string, selectedRows: TData[]) => void
  branchOptions?: { value: string; label: string }[]
  categoryOptions?: { value: string; label: string }[]
  serviceOptions?: { value: string; label: string }[]
  technicianOptions?: { value: string; label: string }[]
}

export function DataTableToolbar<TData>({
  table,
  onRefresh,
  globalFilter,
  setGlobalFilter,
  enableBulkActions,
  selectedRows = [],
  onBulkAction,
  branchOptions = [],
  categoryOptions = [],
  serviceOptions = [],
  technicianOptions = [],
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter !== ''
  
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
    console.log('Technician column exists:', !!table.getColumn('assignedTo.name'))
    console.log('Technician options:', technicianOptions.length, technicianOptions.slice(0, 3))
  }, [table, branchOptions, categoryOptions, serviceOptions, technicianOptions])

  return (
    <div className="flex flex-col gap-4">
      {/* Bulk Actions Bar */}
      {enableBulkActions && selectedRows.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">
              {selectedRows.length} ticket(s) selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction?.('assign', selectedRows)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Bulk Assign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction?.('export', selectedRows)}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.resetRowSelection()}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Main Toolbar */}
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search tickets..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-8 w-[150px] lg:w-[250px]"
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
          {table.getColumn('assignedTo.name') && (
            <DataTableFacetedFilter
              column={table.getColumn('assignedTo.name')}
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