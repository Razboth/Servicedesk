'use client'

import { ColumnDef } from '@tanstack/react-table'
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
  Copy
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'OPEN':
      return <Circle className="h-4 w-4 text-blue-500" />
    case 'PENDING':
      return <Clock className="h-4 w-4 text-yellow-500" />
    case 'PENDING_APPROVAL':
      return <PauseCircle className="h-4 w-4 text-orange-500" />
    case 'APPROVED':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'REJECTED':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'IN_PROGRESS':
      return <Clock className="h-4 w-4 text-blue-600" />
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
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'PENDING_APPROVAL':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'APPROVED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800 border-blue-200'
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
      return 'bg-blue-100 text-blue-800'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800'
    case 'CRITICAL':
      return 'bg-red-100 text-red-800'
    case 'EMERGENCY':
      return 'bg-red-200 text-red-900 font-bold'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const columns: ColumnDef<Ticket>[] = [
  {
    id: 'select',
    size: 40,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'ticketNumber',
    size: 120,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ticket #" />
    ),
    cell: ({ row }) => {
      const ticket = row.original
      return (
        <div className="flex items-center gap-2">
          {getStatusIcon(ticket.status)}
          <span className="font-mono text-xs font-medium">
            #{ticket.ticketNumber.slice(-6)}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'title',
    size: 300,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      const ticket = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium truncate max-w-[300px]" title={ticket.title}>
            {ticket.title}
          </span>
          <span className="text-xs text-muted-foreground">
            {ticket.service.category.name} / {ticket.service.name}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    size: 120,
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
    size: 100,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
    cell: ({ row }) => {
      const priority = row.getValue('priority') as string
      return (
        <Badge className={getPriorityColor(priority)}>
          {priority}
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
    size: 150,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Branch" />
    ),
    cell: ({ row }) => {
      const branch = row.original.branch
      if (!branch) return <span className="text-muted-foreground">-</span>
      return (
        <div className="flex flex-col">
          <span className="font-medium text-xs">{branch.code}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={branch.name}>
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
        <div className="flex flex-col">
          <Badge variant="outline" className="text-green-700">Assigned</Badge>
          <span className="text-xs text-muted-foreground mt-1 truncate max-w-[150px]" title={assignedTo.name}>
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
        return <span className="text-muted-foreground">Unassigned</span>
      }
      return (
        <span className="text-sm truncate max-w-[150px]" title={assignedTo.name}>
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
      return <span className="text-sm">{category}</span>
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
      return <span className="text-sm truncate max-w-[150px]" title={service}>{service}</span>
    },
    filterFn: (row, id, value) => {
      const service = row.original.service.name
      return value.includes(service)
    },
    enableHiding: true,
  },
  {
    accessorKey: 'createdBy',
    size: 150,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created By" />
    ),
    cell: ({ row }) => {
      const createdBy = row.original.createdBy
      return (
        <span className="text-sm truncate max-w-[150px]" title={createdBy.name}>
          {createdBy.name}
        </span>
      )
    },
    enableHiding: true,
  },
  {
    accessorKey: 'createdAt',
    size: 150,
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
    size: 150,
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
    size: 80,
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
  {
    id: 'actions',
    size: 50,
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
  },
]