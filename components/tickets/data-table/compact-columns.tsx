'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ChevronRight,
  User,
  Building2
} from 'lucide-react'

export type CompactTicket = {
  id: string
  ticketNumber: string
  title: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ON_HOLD'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  branch: {
    code: string
    name: string
  }
  assignedTo?: {
    id: string
    name: string
  }
  category?: {
    name: string
  }
  createdAt: string
  updatedAt: string
}

const statusConfig = {
  OPEN: {
    label: 'Open',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200',
    icon: Circle
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200',
    icon: Clock
  },
  RESOLVED: {
    label: 'Resolved',
    color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200',
    icon: CheckCircle2
  },
  CLOSED: {
    label: 'Closed',
    color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200',
    icon: CheckCircle2
  },
  ON_HOLD: {
    label: 'On Hold',
    color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200',
    icon: AlertTriangle
  }
}

const priorityConfig = {
  LOW: {
    label: 'Low',
    color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400'
  },
  MEDIUM: {
    label: 'Medium',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
  },
  HIGH: {
    label: 'High',
    color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
  },
  URGENT: {
    label: 'Urgent',
    color: 'bg-red-500/10 text-red-700 dark:text-red-400 font-semibold'
  }
}

export const compactColumns: ColumnDef<CompactTicket>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="h-4 w-4"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="h-4 w-4"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 30,
  },
  {
    accessorKey: "ticketNumber",
    header: "Ticket #",
    cell: ({ row }) => {
      const ticketNumber = row.getValue("ticketNumber") as string
      const status = row.original.status
      const StatusIcon = statusConfig[status].icon

      return (
        <div className="flex items-center gap-1.5">
          <StatusIcon className={cn(
            "h-3.5 w-3.5",
            status === 'CLOSED' ? 'text-gray-400' :
            status === 'RESOLVED' ? 'text-green-500' :
            status === 'IN_PROGRESS' ? 'text-yellow-500' :
            'text-blue-500'
          )} />
          <span className="font-mono text-xs">{ticketNumber}</span>
        </div>
      )
    },
    size: 120,
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => {
      const title = row.getValue("title") as string
      const category = row.original.category?.name

      return (
        <div className="min-w-[200px] max-w-[400px]">
          <div className="font-medium text-sm truncate">{title}</div>
          {category && (
            <div className="text-xs text-muted-foreground truncate">{category}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as keyof typeof statusConfig
      const config = statusConfig[status]

      return (
        <Badge
          variant="outline"
          className={cn("text-xs px-2 py-0.5", config.color)}
        >
          {config.label}
        </Badge>
      )
    },
    size: 100,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as keyof typeof priorityConfig
      const config = priorityConfig[priority]

      return (
        <Badge
          variant="secondary"
          className={cn("text-xs px-2 py-0.5", config.color)}
        >
          {config.label}
        </Badge>
      )
    },
    size: 80,
  },
  {
    accessorKey: "branch",
    header: "Branch",
    cell: ({ row }) => {
      const branch = row.original.branch
      return (
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <div className="text-sm">
            <span className="font-medium">{branch.code}</span>
            <span className="text-muted-foreground ml-1 hidden lg:inline">
              {branch.name.length > 20 ? branch.name.slice(0, 20) + '...' : branch.name}
            </span>
          </div>
        </div>
      )
    },
    size: 150,
  },
  {
    accessorKey: "assignedTo",
    header: "Assignment",
    cell: ({ row }) => {
      const assignedTo = row.original.assignedTo

      if (!assignedTo) {
        return (
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            Unassigned
          </Badge>
        )
      }

      return (
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-3 w-3" />
          </div>
          <span className="text-sm truncate max-w-[120px]">{assignedTo.name}</span>
        </div>
      )
    },
    size: 150,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string
      return (
        <span className="text-xs text-muted-foreground">
          {format(new Date(date), 'MMM dd')}
        </span>
      )
    },
    size: 80,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )
    },
    size: 40,
  },
]