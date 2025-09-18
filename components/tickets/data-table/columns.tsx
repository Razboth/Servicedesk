'use client'

import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from './data-table-column-header'
import { 
  MoreHorizontal, 
  Eye, 
  MessageCircle,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  XCircle,
  PauseCircle,
  UserPlus,
  Edit,
  ExternalLink,
  Copy,
  UserCheck
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format, formatDistanceToNow, isWithinInterval } from 'date-fns'
import { toast } from 'sonner'

export type Ticket = {
  id: string
  ticketNumber: string
  title: string
  description: string
  status: 'OPEN' | 'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'PENDING_VENDOR' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY'
  createdAt: string
  updatedAt: string
  branch?: {
    id: string
    name: string
    code: string
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  service: {
    id: string
    name: string
    category: {
      name: string
    }
  }
  _count: {
    comments: number
  }
}

export type TicketWithMeta = Ticket & {
  isNew?: boolean
  highlightedUntil?: number
  hasChanged?: boolean
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'OPEN':
      return <Circle className="h-4 w-4 text-emerald-500" />
    case 'PENDING':
      return <Clock className="h-4 w-4 text-yellow-500" />
    case 'PENDING_APPROVAL':
      return <PauseCircle className="h-4 w-4 text-orange-500" />
    case 'APPROVED':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'REJECTED':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'IN_PROGRESS':
      return <Clock className="h-4 w-4 text-amber-600" />
    case 'PENDING_VENDOR':
      return <PauseCircle className="h-4 w-4 text-purple-500" />
    case 'RESOLVED':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'CLOSED':
      return <CheckCircle className="h-4 w-4 text-gray-500" />
    case 'CANCELLED':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <Circle className="h-4 w-4 text-gray-400" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'PENDING_APPROVAL':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'APPROVED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'IN_PROGRESS':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'PENDING_VENDOR':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'RESOLVED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'LOW':
      return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 dark:from-blue-900/20 dark:to-blue-800/20 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-medium'
    case 'MEDIUM':
      return 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 dark:from-amber-900/20 dark:to-amber-800/20 dark:text-amber-300 border border-amber-200 dark:border-amber-700 font-medium'
    case 'HIGH':
      return 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 dark:from-orange-900/20 dark:to-orange-800/20 dark:text-orange-300 border border-orange-200 dark:border-orange-700 font-medium'
    case 'CRITICAL':
      return 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 dark:from-red-900/20 dark:to-red-800/20 dark:text-red-300 border border-red-200 dark:border-red-700 font-semibold'
    case 'EMERGENCY':
      return 'bg-gradient-to-r from-red-500 to-red-600 text-white dark:from-red-600 dark:to-red-700 border border-red-600 dark:border-red-500 font-bold animate-pulse shadow-lg'
    default:
      return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 dark:from-gray-800/20 dark:to-gray-700/20 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-medium'
  }
}

// Function to create columns with optional features
export const getColumns = (options?: { 
  showClaimButton?: boolean; 
  onClaimTicket?: (ticketId: string) => Promise<void>;
  enableBulkActions?: boolean;
}): ColumnDef<TicketWithMeta>[] => {
  const baseColumns: ColumnDef<TicketWithMeta>[] = []
  
  // Add checkbox column if bulk actions are enabled
  if (options?.enableBulkActions) {
    baseColumns.push({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    })
  }
  
  // Add the rest of the columns
  baseColumns.push(
  {
    accessorKey: 'ticketNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ticket #" />
    ),
    cell: ({ row }) => {
      const ticket = row.original
      const isNew = ticket.isNew
      const hasChanged = ticket.hasChanged
      return (
        <div className={`flex items-center gap-1 ${isNew ? 'new-ticket-highlight rounded-md px-2 py-1 -mx-2 -my-1' : hasChanged ? 'new-ticket-shimmer rounded-md px-2 py-1 -mx-2 -my-1' : ''}`}>
          {isNew && (
            <Badge className="bg-gradient-to-r from-brown-500 to-brown-600 text-white text-xs px-1.5 py-0 new-ticket-badge">
              NEW
            </Badge>
          )}
          {getStatusIcon(ticket.status)}
          <span className="font-mono text-xs">
            #{ticket.ticketNumber.slice(-6)}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      const ticket = row.original
      return (
        <div className="max-w-[300px]">
          <Link 
            href={`/tickets/${ticket.id}`}
            className="block font-medium text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 hover:underline truncate" 
            title={ticket.title}
          >
            {ticket.title}
          </Link>
          <span className="block text-xs text-muted-foreground truncate">
            {ticket.service.category.name} / {ticket.service.name}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge variant="outline" className={getStatusColor(status)}>
          {status.replace('_', ' ')}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'priority',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
    cell: ({ row }) => {
      const priority = row.getValue('priority') as string
      return (
        <Badge
          className={`${getPriorityColor(priority)} px-2.5 py-0.5 text-xs`}
          variant="secondary"
        >
          {priority === 'EMERGENCY' ? '🚨 ' + priority : priority}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: 'branch.code',
    accessorFn: (row) => row.branch?.code,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Branch" />
    ),
    cell: ({ row }) => {
      const branch = row.original.branch
      if (!branch) return <span className="text-muted-foreground text-xs">-</span>
      return (
        <div className="max-w-[120px]">
          <span className="block font-medium text-xs">{branch.code}</span>
          <span className="block text-xs text-muted-foreground truncate" title={branch.name}>
            {branch.name}
          </span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const branchCode = row.original.branch?.code
      if (!branchCode) return false
      return value.includes(branchCode)
    },
  },
  {
    id: 'assignmentStatus',
    accessorFn: (row) => row.assignedTo ? 'assigned' : 'unassigned',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assignment" />
    ),
    cell: ({ row }) => {
      const assignedTo = row.original.assignedTo
      if (!assignedTo) {
        return <Badge variant="outline" className="text-gray-500">Unassigned</Badge>
      }
      return (
        <div className="max-w-[120px]">
          <Badge variant="outline" className="text-green-700 text-xs">Assigned</Badge>
          <span className="block text-xs text-muted-foreground mt-1 truncate" title={assignedTo.name}>
            {assignedTo.name}
          </span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const status = row.original.assignedTo ? 'assigned' : 'unassigned'
      return value.includes(status)
    },
  },
  {
    id: 'assignedTo.name',
    accessorFn: (row) => row.assignedTo?.name || 'Unassigned',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Technician" />
    ),
    cell: ({ row }) => {
      const assignedTo = row.original.assignedTo
      if (!assignedTo) {
        return <span className="text-muted-foreground text-xs">Unassigned</span>
      }
      return (
        <span className="text-xs truncate block max-w-[120px]" title={assignedTo.name}>
          {assignedTo.name}
        </span>
      )
    },
    filterFn: (row, id, value) => {
      const technician = row.original.assignedTo?.name || 'Unassigned'
      return value.includes(technician)
    },
    enableHiding: true,
  },
  {
    id: 'service.category.name',
    accessorFn: (row) => row.service.category.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => {
      const category = row.original.service.category.name
      return <span className="text-xs truncate block max-w-[120px]" title={category}>{category}</span>
    },
    filterFn: (row, id, value) => {
      const category = row.original.service.category.name
      return value.includes(category)
    },
    enableHiding: true,
  },
  {
    id: 'service.name',
    accessorFn: (row) => row.service.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Service" />
    ),
    cell: ({ row }) => {
      const service = row.original.service.name
      return <span className="text-xs truncate block max-w-[150px]" title={service}>{service}</span>
    },
    filterFn: (row, id, value) => {
      const service = row.original.service.name
      return value.includes(service)
    },
    enableHiding: true,
  },
  {
    accessorKey: 'createdBy',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created By" />
    ),
    cell: ({ row }) => {
      const createdBy = row.original.createdBy
      return (
        <span className="text-xs truncate block max-w-[120px]" title={createdBy.name}>
          {createdBy.name}
        </span>
      )
    },
    enableHiding: true,
  },
  {
    accessorKey: 'createdAt',
    enableColumnFilter: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      const createdAt = row.getValue('createdAt') as string
      return (
        <div className="flex flex-col">
          <span className="text-xs">
            {format(new Date(createdAt), 'MMM dd, yyyy')}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      if (!value || !Array.isArray(value) || value.length !== 2) return true
      
      const dateString = row.getValue(id) as string
      if (!dateString) return false
      
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return false
      
      const [start, end] = value
      const startDate = new Date(start)
      const endDate = new Date(end)
      
      // Set end date to end of day for proper comparison
      endDate.setHours(23, 59, 59, 999)
      
      try {
        return isWithinInterval(date, { start: startDate, end: endDate })
      } catch (error) {
        console.error('Date filter error:', error)
        return true
      }
    },
  },
  {
    accessorKey: 'updatedAt',
    enableColumnFilter: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated" />
    ),
    cell: ({ row }) => {
      const updatedAt = row.getValue('updatedAt') as string
      return (
        <div className="flex flex-col">
          <span className="text-xs">
            {format(new Date(updatedAt), 'MMM dd, yyyy')}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      if (!value || !Array.isArray(value) || value.length !== 2) return true
      
      const dateString = row.getValue(id) as string
      if (!dateString) return false
      
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return false
      
      const [start, end] = value
      const startDate = new Date(start)
      const endDate = new Date(end)
      
      // Set end date to end of day for proper comparison
      endDate.setHours(23, 59, 59, 999)
      
      try {
        return isWithinInterval(date, { start: startDate, end: endDate })
      } catch (error) {
        console.error('Date filter error:', error)
        return true
      }
    },
    enableHiding: true,
  },
  {
    id: 'comments',
    header: 'Comments',
    cell: ({ row }) => {
      const count = row.original._count.comments
      if (count === 0) return <span className="text-muted-foreground">-</span>
      return (
        <div className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs">{count}</span>
        </div>
      )
    },
    enableHiding: true,
  },
  );

  // Add claim button column if enabled
  if (options?.showClaimButton) {
    baseColumns.push({
      id: 'claim',
      header: '',
      cell: ({ row }) => {
        const ticket = row.original
        // Only show claim button for unassigned tickets
        if (ticket.assignedTo) {
          return (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <UserCheck className="h-3 w-3" />
              <span>Assigned</span>
            </div>
          )
        }
        
        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
            onClick={(e) => {
              e.stopPropagation()
              if (options.onClaimTicket) {
                options.onClaimTicket(ticket.id)
              }
            }}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Claim
          </Button>
        )
      },
      enableHiding: false,
    });
  }

  // Add actions column
  baseColumns.push({
    id: 'actions',
    cell: ({ row }) => {
      const ticket = row.original

      const handleCopyTicketNumber = () => {
        navigator.clipboard.writeText(ticket.ticketNumber)
        toast.success('Ticket number copied to clipboard')
      }

      const handleOpenInNewTab = () => {
        window.open(`/tickets/${ticket.id}`, '_blank')
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyTicketNumber(); }}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Ticket #
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenInNewTab(); }}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!ticket.assignedTo && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                <UserPlus className="mr-2 h-4 w-4" />
                Claim Ticket
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
              <Edit className="mr-2 h-4 w-4" />
              Update Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  });

  return baseColumns;
}

// Default columns for backward compatibility
export const columns: ColumnDef<Ticket>[] = getColumns()