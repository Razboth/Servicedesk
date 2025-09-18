'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserPlus,
  FileText,
  Star,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'ticket_created' | 'comment' | 'status_change' | 'assignment' | 'resolved' | 'rating';
  title: string;
  description: string;
  user: {
    name: string;
    avatar?: string;
    initials: string;
  };
  timestamp: string;
  metadata?: {
    ticketId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    status?: string;
  };
}

const activities: ActivityItem[] = [
  {
    id: '1',
    type: 'ticket_created',
    title: 'New ticket created',
    description: 'Network connectivity issue in Branch 001',
    user: { name: 'John Doe', initials: 'JD' },
    timestamp: '2 minutes ago',
    metadata: { ticketId: '#2024-1234', priority: 'high' }
  },
  {
    id: '2',
    type: 'comment',
    title: 'Comment added',
    description: 'Updated status after initial diagnosis',
    user: { name: 'Jane Smith', initials: 'JS' },
    timestamp: '5 minutes ago',
    metadata: { ticketId: '#2024-1233' }
  },
  {
    id: '3',
    type: 'resolved',
    title: 'Ticket resolved',
    description: 'ATM maintenance completed successfully',
    user: { name: 'Mike Johnson', initials: 'MJ' },
    timestamp: '10 minutes ago',
    metadata: { ticketId: '#2024-1232' }
  },
  {
    id: '4',
    type: 'assignment',
    title: 'Ticket assigned',
    description: 'Assigned to Technical Support Team',
    user: { name: 'Sarah Wilson', initials: 'SW' },
    timestamp: '15 minutes ago',
    metadata: { ticketId: '#2024-1231', priority: 'medium' }
  },
  {
    id: '5',
    type: 'rating',
    title: 'Feedback received',
    description: 'Customer rated service as excellent',
    user: { name: 'David Brown', initials: 'DB' },
    timestamp: '20 minutes ago',
    metadata: { ticketId: '#2024-1230' }
  },
  {
    id: '6',
    type: 'status_change',
    title: 'Status updated',
    description: 'Changed from In Progress to Pending Review',
    user: { name: 'Emily Davis', initials: 'ED' },
    timestamp: '25 minutes ago',
    metadata: { ticketId: '#2024-1229', status: 'pending' }
  }
];

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'ticket_created':
      return FileText;
    case 'comment':
      return MessageSquare;
    case 'resolved':
      return CheckCircle2;
    case 'assignment':
      return UserPlus;
    case 'rating':
      return Star;
    case 'status_change':
      return Clock;
    default:
      return AlertCircle;
  }
};

const getActivityColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'ticket_created':
      return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
    case 'comment':
      return 'text-purple-500 bg-purple-50 dark:bg-purple-500/10';
    case 'resolved':
      return 'text-green-500 bg-green-50 dark:bg-green-500/10';
    case 'assignment':
      return 'text-orange-500 bg-orange-50 dark:bg-orange-500/10';
    case 'rating':
      return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10';
    case 'status_change':
      return 'text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10';
    default:
      return 'text-gray-500 bg-gray-50 dark:bg-gray-500/10';
  }
};

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'low':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

export function ActivityFeed() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Real-time updates from your service desk
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence mode="sync">
          {activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.type);

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ x: 4 }}
                className="group relative"
              >
                <div className="flex gap-4">
                  {/* Timeline */}
                  <div className="relative flex flex-col items-center">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110",
                      getActivityColor(activity.type)
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {index < activities.length - 1 && (
                      <div className="absolute top-10 h-full w-0.5 bg-border" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <div className="rounded-lg border bg-card/50 p-4 backdrop-blur-sm transition-all duration-200 group-hover:shadow-md group-hover:bg-card/80">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.description}
                          </p>

                          {activity.metadata && (
                            <div className="flex items-center gap-2 pt-2">
                              {activity.metadata.ticketId && (
                                <Badge variant="outline" className="text-xs">
                                  {activity.metadata.ticketId}
                                </Badge>
                              )}
                              {activity.metadata.priority && (
                                <Badge
                                  variant="secondary"
                                  className={cn("text-xs", getPriorityColor(activity.metadata.priority))}
                                >
                                  {activity.metadata.priority}
                                </Badge>
                              )}
                              {activity.metadata.status && (
                                <Badge variant="secondary" className="text-xs">
                                  {activity.metadata.status}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {activity.timestamp}
                          </span>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={activity.user.avatar} />
                            <AvatarFallback className="text-xs">
                              {activity.user.initials}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}