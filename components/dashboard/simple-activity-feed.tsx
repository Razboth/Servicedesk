'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTicketUrlId } from '@/lib/utils/ticket-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserPlus,
  FileText,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ActivityItem {
  id: string;
  type: 'ticket_created' | 'comment' | 'status_change' | 'assignment' | 'resolved';
  title: string;
  ticketNumber: string;
  user: string;
  time: string;
  status?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
}

const getActivityIcon = (status: string) => {
  if (status === 'RESOLVED' || status === 'CLOSED') return CheckCircle2;
  if (status === 'IN_PROGRESS') return Clock;
  if (status === 'OPEN') return FileText;
  return AlertCircle;
};

const getActivityColor = (status: string) => {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'text-green-500';
  if (status === 'IN_PROGRESS') return 'text-cyan-500';
  if (status === 'OPEN') return 'text-blue-500';
  return 'text-gray-500';
};

const getPriorityColor = (priority?: string) => {
  const colors = {
    CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  };
  return priority ? colors[priority as keyof typeof colors] : '';
};

const getStatusColor = (status?: string) => {
  const colors = {
    RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ON_HOLD: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  };
  return status ? colors[status as keyof typeof colors] : '';
};

const getRelativeTime = (date: string | Date) => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return past.toLocaleDateString();
};

export function SimpleActivityFeed() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRecentTickets = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/tickets?limit=5&sortBy=createdAt&sortOrder=desc');
      if (response.ok) {
        const data = await response.json();

        const formattedActivities: ActivityItem[] = data.tickets.map((ticket: any) => ({
          id: ticket.id,
          type: ticket.status === 'RESOLVED' ? 'resolved' :
                ticket.status === 'IN_PROGRESS' ? 'status_change' :
                'ticket_created',
          title: ticket.title || ticket.description?.substring(0, 50) + '...',
          ticketNumber: `#${ticket.ticketNumber}`,
          user: ticket.creator?.name || ticket.createdBy?.name || 'Unknown',
          time: getRelativeTime(ticket.updatedAt || ticket.createdAt),
          status: ticket.status,
          priority: ticket.priority
        }));

        setActivities(formattedActivities);
      }
    } catch (error) {
      console.error('Error fetching recent tickets:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecentTickets();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchRecentTickets();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-400 dark:border-brown-200"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRecentTickets}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : (
          activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.status || 'OPEN');

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => {
                  const ticketUrlId = getTicketUrlId(activity.ticketNumber) || activity.id;
                  router.push(`/tickets/${ticketUrlId}`)
                }}
              >
                <div className={cn(
                  "mt-0.5 p-1.5 rounded-md bg-background",
                  getActivityColor(activity.status || 'OPEN')
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {activity.title}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {activity.ticketNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{activity.user}</span>
                    <span>•</span>
                    <span>{activity.time}</span>
                    {activity.priority && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary" className={cn("text-xs px-1.5 py-0", getPriorityColor(activity.priority))}>
                          {activity.priority}
                        </Badge>
                      </>
                    )}
                    {activity.status && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary" className={cn("text-xs px-1.5 py-0", getStatusColor(activity.status))}>
                          {activity.status.replace('_', ' ')}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}