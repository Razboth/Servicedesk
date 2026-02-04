'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Ticket,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Clock,
  User,
  Building,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface PendingTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: 'PENDING' | 'PENDING_VENDOR' | 'OPEN';
  priority: string;
  service: string | null;
  branch: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface PendingTicketsSummary {
  PENDING: number;
  PENDING_VENDOR: number;
  OPEN: number;
  total: number;
}

interface PendingTicketsVerificationProps {
  onDataLoaded?: (summary: PendingTicketsSummary) => void;
}

const statusConfig = {
  PENDING: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  PENDING_VENDOR: {
    label: 'Pending Vendor',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  OPEN: {
    label: 'Open',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
};

const priorityConfig: Record<string, string> = {
  EMERGENCY: 'bg-red-600 text-white',
  CRITICAL: 'bg-red-500 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-black',
  LOW: 'bg-green-500 text-white',
};

export function PendingTicketsVerification({ onDataLoaded }: PendingTicketsVerificationProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>('');
  const [summary, setSummary] = useState<PendingTicketsSummary | null>(null);
  const [tickets, setTickets] = useState<PendingTicket[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/server-checklist/pending-tickets');
      if (!response.ok) {
        throw new Error('Gagal mengambil data');
      }
      const data = await response.json();
      setDate(data.date);
      setSummary(data.summary);
      setTickets(data.tickets);
      if (onDataLoaded) {
        onDataLoaded(data.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Memuat data ticket H-1...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-2">
      {/* Summary Header */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ticket H-1 ({date})</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={fetchData}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            Total: {summary.total}
          </Badge>
          {summary.OPEN > 0 && (
            <Badge className={cn('text-xs', statusConfig.OPEN.color)}>
              Open: {summary.OPEN}
            </Badge>
          )}
          {summary.PENDING > 0 && (
            <Badge className={cn('text-xs', statusConfig.PENDING.color)}>
              Pending: {summary.PENDING}
            </Badge>
          )}
          {summary.PENDING_VENDOR > 0 && (
            <Badge className={cn('text-xs', statusConfig.PENDING_VENDOR.color)}>
              Pending Vendor: {summary.PENDING_VENDOR}
            </Badge>
          )}
        </div>

        {summary.total === 0 ? (
          <p className="text-sm text-green-600 dark:text-green-400">
            Tidak ada ticket pending dari H-1
          </p>
        ) : (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {isExpanded ? 'Sembunyikan' : 'Lihat'} detail ticket
          </button>
        )}
      </div>

      {/* Ticket List */}
      {isExpanded && tickets.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {ticket.ticketNumber}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <Badge className={cn('text-[10px]', statusConfig[ticket.status].color)}>
                      {statusConfig[ticket.status].label}
                    </Badge>
                    <Badge className={cn('text-[10px]', priorityConfig[ticket.priority] || 'bg-gray-500 text-white')}>
                      {ticket.priority}
                    </Badge>
                  </div>
                  <p className="text-sm mt-1 line-clamp-1">{ticket.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                    {ticket.service && (
                      <span className="flex items-center gap-1">
                        <Ticket className="h-3 w-3" />
                        {ticket.service}
                      </span>
                    )}
                    {ticket.branch && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {ticket.branch}
                      </span>
                    )}
                    {ticket.assignedTo && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ticket.assignedTo}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
