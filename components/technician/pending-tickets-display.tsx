'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Ticket,
  CheckCircle2,
  RefreshCw,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface PendingTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  approvedAt?: string;
  category?: string;
  branch?: string;
}

export interface PendingTicketsData {
  fetchedAt: string;
  totalTickets: number;
  tickets: PendingTicket[];
  timeRange: {
    from: string;
    to: string;
  };
}

interface PendingTicketsDisplayProps {
  value?: PendingTicketsData;
  onChange: (data: PendingTicketsData) => void;
  onSubmit?: () => void;
  readOnly?: boolean;
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PENDING_VENDOR: 'bg-purple-100 text-purple-700',
  OPEN: 'bg-blue-100 text-blue-700',
};

export function PendingTicketsDisplay({
  value,
  onChange,
  onSubmit,
  readOnly = false,
}: PendingTicketsDisplayProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PendingTicketsData | null>(value || null);

  useEffect(() => {
    if (value) {
      setData(value);
    }
  }, [value]);

  const fetchTickets = async () => {
    try {
      setLoading(true);

      // Calculate time range: 8AM yesterday to 8AM today
      const now = new Date();
      const todayAt8 = new Date(now);
      todayAt8.setHours(8, 0, 0, 0);

      const yesterdayAt8 = new Date(todayAt8);
      yesterdayAt8.setDate(yesterdayAt8.getDate() - 1);

      // Fetch pending tickets from API
      const params = new URLSearchParams({
        status: 'PENDING,PENDING_VENDOR,OPEN',
        approvedFrom: yesterdayAt8.toISOString(),
        approvedTo: todayAt8.toISOString(),
      });

      const response = await fetch(`/api/tickets/pending?${params}`);

      let tickets: PendingTicket[] = [];
      if (response.ok) {
        const result = await response.json();
        tickets = result.data || [];
      }

      const ticketData: PendingTicketsData = {
        fetchedAt: new Date().toISOString(),
        totalTickets: tickets.length,
        tickets,
        timeRange: {
          from: yesterdayAt8.toISOString(),
          to: todayAt8.toISOString(),
        },
      };

      setData(ticketData);
      onChange(ticketData);
      toast.success(`Ditemukan ${ticketData.totalTickets} tiket pending`);
    } catch (error) {
      console.error('Error fetching pending tickets:', error);

      // Create empty data on error
      const now = new Date();
      const todayAt8 = new Date(now);
      todayAt8.setHours(8, 0, 0, 0);
      const yesterdayAt8 = new Date(todayAt8);
      yesterdayAt8.setDate(yesterdayAt8.getDate() - 1);

      const emptyData: PendingTicketsData = {
        fetchedAt: new Date().toISOString(),
        totalTickets: 0,
        tickets: [],
        timeRange: {
          from: yesterdayAt8.toISOString(),
          to: todayAt8.toISOString(),
        },
      };
      setData(emptyData);
      onChange(emptyData);
      toast.info('Tidak ada tiket pending ditemukan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (data) {
      onChange(data);
      onSubmit?.();
    }
  };

  // Auto-complete when data is fetched
  useEffect(() => {
    if (data && !value && onSubmit) {
      handleSubmit();
    }
  }, [data]);

  return (
    <Card className="bg-muted/30">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Ticket className="h-4 w-4 text-blue-500" />
            Check Pending Tickets
          </CardTitle>
          {data && (
            <Badge variant={data.totalTickets > 0 ? 'secondary' : 'default'}>
              {data.totalTickets} Tiket
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : data ? (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Periode: {format(new Date(data.timeRange.from), 'HH:mm d MMM', { locale: id })} -{' '}
                {format(new Date(data.timeRange.to), 'HH:mm d MMM yyyy', { locale: id })}
              </span>
            </div>

            {data.totalTickets === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  Tidak ada tiket pending
                </span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-start gap-2 p-2 bg-background rounded-lg border text-sm"
                  >
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-medium text-xs">
                          #{ticket.ticketNumber}
                        </span>
                        <Badge className={statusColors[ticket.status] || ''} variant="outline">
                          {ticket.status}
                        </Badge>
                        <Badge className={priorityColors[ticket.priority] || ''} variant="outline">
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1 truncate">{ticket.title}</p>
                      {ticket.branch && (
                        <p className="text-xs text-muted-foreground">{ticket.branch}</p>
                      )}
                    </div>
                    <a
                      href={`/tickets/${ticket.ticketNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">
              Tiket PENDING, PENDING_VENDOR, OPEN
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Approved: 8AM kemarin s.d. 8AM hari ini
            </p>
          </div>
        )}

        {!readOnly && (
          <div className="flex justify-end pt-2 border-t">
            <Button
              size="sm"
              onClick={data ? handleSubmit : fetchTickets}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Mengambil...
                </>
              ) : data ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Ambil Data Tiket
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
