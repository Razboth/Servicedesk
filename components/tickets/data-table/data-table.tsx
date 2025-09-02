'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { DataTablePagination } from './data-table-pagination'
import { DataTableToolbar } from './data-table-toolbar'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  onRefresh?: () => void
  isLoading?: boolean
  enableBulkActions?: boolean
  onBulkAction?: (action: string, selectedRows: TData[]) => void
  branchOptions?: { value: string; label: string }[]
  categoryOptions?: { value: string; label: string }[]
  serviceOptions?: { value: string; label: string }[]
  technicianOptions?: { value: string; label: string }[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  onRefresh,
  isLoading = false,
  enableBulkActions = false,
  onBulkAction,
  branchOptions = [],
  categoryOptions = [],
  serviceOptions = [],
  technicianOptions = [],
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [columnOrder, setColumnOrder] = React.useState<string[]>([])
  // Remove separate pagination state - let the table manage it internally

  // Load column visibility and order from localStorage
  React.useEffect(() => {
    // Load column visibility
    const savedVisibility = localStorage.getItem('ticketTableColumnVisibility')
    if (savedVisibility) {
      try {
        setColumnVisibility(JSON.parse(savedVisibility))
      } catch (e) {
        console.error('Failed to parse column visibility:', e)
      }
    } else {
      // Set default visibility for columns
      setColumnVisibility({
        'service.name': false, // Hide service column by default as it's detailed
        'assignedTo.name': false, // Hide technician column as we have assignment status
        'createdBy': false, // Hide created by column by default
        'updatedAt': false, // Hide updated at column by default
      })
    }
    
    // Load column order
    const savedOrder = localStorage.getItem('ticketTableColumnOrder')
    if (savedOrder) {
      try {
        let parsedOrder = JSON.parse(savedOrder)
        // Ensure 'select' column is always first if it exists
        if (columns.some(col => col.id === 'select')) {
          parsedOrder = parsedOrder.filter((id: string) => id !== 'select')
          parsedOrder.unshift('select')
        }
        setColumnOrder(parsedOrder)
      } catch (e) {
        console.error('Failed to parse column order:', e)
      }
    }
  }, [])

  // Save column visibility to localStorage
  React.useEffect(() => {
    localStorage.setItem('ticketTableColumnVisibility', JSON.stringify(columnVisibility))
  }, [columnVisibility])
  
  // Save column order to localStorage
  React.useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem('ticketTableColumnOrder', JSON.stringify(columnOrder))
    }
  }, [columnOrder])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      columnOrder,
    },
    initialState: {
      pagination: {
        pageSize: 50,
        pageIndex: 0,
      },
    },
    enableRowSelection: enableBulkActions,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
  
  // Debug pagination
  React.useEffect(() => {
    console.log('Pagination state:', table.getState().pagination)
    console.log('Total rows:', data.length)
    console.log('Filtered rows:', table.getFilteredRowModel().rows.length)
    console.log('Paginated rows:', table.getRowModel().rows.length)
    console.log('Page count:', table.getPageCount())
  }, [table.getState().pagination, data.length])

  return (
    <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="space-y-4">
          <DataTableToolbar 
            table={table}
            onRefresh={onRefresh}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            enableBulkActions={enableBulkActions}
            selectedRows={selectedRows}
            onBulkAction={onBulkAction}
            branchOptions={branchOptions}
            categoryOptions={categoryOptions}
            serviceOptions={serviceOptions}
            technicianOptions={technicianOptions}
          />
          <div className="relative -mx-6">
            <div className="overflow-x-auto px-6">
              <Table className="min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id}
                      className="text-xs"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
              </Table>
            </div>
          </div>
          <div className="mt-4">
            <DataTablePagination table={table} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}