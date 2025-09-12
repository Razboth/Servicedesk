"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export type LegacyTicket = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  originalTicketId: string;
  originalSystem: string;
  isConverted: boolean;
  createdAt: string;
  importedAt: string;
  service?: {
    id: string;
    name: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
    username: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    username: string;
  };
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  supportGroup?: {
    id: string;
    name: string;
  };
  mappedToTicket?: {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
  };
  _count?: {
    comments: number;
  };
};

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'PENDING':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority.toUpperCase()) {
    case 'CRITICAL':
    case 'EMERGENCY':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'LOW':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getSystemColor = (system: string) => {
  switch (system.toUpperCase()) {
    case 'MANAGEENGINE':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'SERVICENOW':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const columns: ColumnDef<LegacyTicket>[] = [
  {
    accessorKey: "ticketNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Ticket #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const ticket = row.original;
      return (
        <div className="space-y-1">
          <Link href={`/tickets/legacy/${ticket.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
            {ticket.ticketNumber}
          </Link>
          <div className="text-xs text-gray-500">
            ME: {ticket.originalTicketId}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const ticket = row.original;
      return (
        <div className="space-y-1 max-w-md">
          <Link href={`/tickets/legacy/${ticket.id}`} className="font-medium truncate hover:text-blue-600 hover:underline block" title={ticket.title}>
            {ticket.title}
          </Link>
          <div className="text-xs text-gray-500 truncate" title={ticket.description}>
            {ticket.description.substring(0, 100)}
            {ticket.description.length > 100 && '...'}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className={getSystemColor(ticket.originalSystem)}>
              {ticket.originalSystem}
            </Badge>
            {ticket.isConverted && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Converted
              </Badge>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant="outline" className={getStatusColor(status)}>
          {status.replace('_', ' ')}
        </Badge>
      );
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Priority
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      return (
        <Badge variant="outline" className={getPriorityColor(priority)}>
          {priority}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdBy",
    header: "Requester",
    cell: ({ row }) => {
      const createdBy = row.original.createdBy;
      const branch = row.original.branch;
      
      if (!createdBy) {
        return <span className="text-gray-400">Unknown</span>;
      }
      
      return (
        <div className="space-y-1">
          <div className="font-medium text-sm">{createdBy.name}</div>
          <div className="text-xs text-gray-500">{createdBy.email}</div>
          {branch && (
            <div className="text-xs text-blue-600">{branch.name}</div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
    cell: ({ row }) => {
      const assignedTo = row.original.assignedTo;
      const supportGroup = row.original.supportGroup;
      
      if (!assignedTo && !supportGroup) {
        return <span className="text-gray-400">Unassigned</span>;
      }
      
      return (
        <div className="space-y-1">
          {assignedTo && (
            <div className="font-medium text-sm">{assignedTo.name}</div>
          )}
          {supportGroup && (
            <div className="text-xs text-blue-600">{supportGroup.name}</div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const createdAt = new Date(row.getValue("createdAt"));
      const importedAt = new Date(row.original.importedAt);
      
      return (
        <div className="space-y-1 text-sm">
          <div className="font-medium">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </div>
          <div className="text-xs text-gray-500">
            Imported: {formatDistanceToNow(importedAt, { addSuffix: true })}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "mappedToTicket",
    header: "Converted To",
    cell: ({ row }) => {
      const mappedTicket = row.original.mappedToTicket;
      
      if (!mappedTicket) {
        return <span className="text-gray-400">Not converted</span>;
      }
      
      return (
        <div className="space-y-1">
          <Link 
            href={`/tickets/${mappedTicket.id}`}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            {mappedTicket.ticketNumber}
          </Link>
          <div className="text-xs text-gray-500 truncate max-w-32" title={mappedTicket.title}>
            {mappedTicket.title}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "_count",
    header: "Comments",
    cell: ({ row }) => {
      const count = row.original._count?.comments || 0;
      return (
        <Badge variant="secondary">
          {count}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const ticket = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(ticket.id)}
            >
              Copy ticket ID
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(ticket.originalTicketId)}
            >
              Copy original ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/tickets/legacy/${ticket.id}`} className="flex items-center">
                <Eye className="mr-2 h-4 w-4" />
                View details
              </Link>
            </DropdownMenuItem>
            {ticket.mappedToTicket && (
              <DropdownMenuItem asChild>
                <Link href={`/tickets/${ticket.mappedToTicket.id}`} className="flex items-center">
                  <Eye className="mr-2 h-4 w-4" />
                  View converted ticket
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];