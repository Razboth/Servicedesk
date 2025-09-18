'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Calendar,
  User,
  Building2,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Timer,
  Hash,
  Paperclip,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface TicketCardProps {
  ticket: {
    id: string;
    ticketNumber: string;
    title: string;
    description?: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ON_HOLD';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    createdAt: string;
    updatedAt: string;
    dueDate?: string;
    assignedTo?: {
      id: string;
      name: string;
      avatar?: string;
      email: string;
    };
    createdBy: {
      id: string;
      name: string;
      email: string;
      branch?: {
        name: string;
        code: string;
      };
    };
    service?: {
      name: string;
      category?: {
        name: string;
      };
    };
    comments?: {
      id: string;
    }[];
    attachments?: {
      id: string;
    }[];
  };
  index?: number;
  viewMode?: 'grid' | 'list';
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200';
    case 'ON_HOLD':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200';
    case 'LOW':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'OPEN':
      return <AlertCircle className="h-4 w-4" />;
    case 'IN_PROGRESS':
      return <Timer className="h-4 w-4" />;
    case 'RESOLVED':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'CLOSED':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'ON_HOLD':
      return <Clock className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

export function ModernTicketCard({ ticket, index = 0, viewMode = 'grid' }: TicketCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    router.push(`/tickets/${ticket.id}`);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        delay: index * 0.05,
        type: "spring",
        stiffness: 100
      }
    },
    hover: {
      y: -4,
      transition: {
        duration: 0.2,
        type: "spring",
        stiffness: 300
      }
    }
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={handleClick}
        className="cursor-pointer"
      >
        <Card className={cn(
          "relative overflow-hidden transition-all duration-200",
          "hover:shadow-lg hover:border-primary/20",
          "bg-card/50 backdrop-blur-sm"
        )}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100 pointer-events-none" />

          <div className="flex items-center p-4 gap-4">
            {/* Status Icon */}
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-transform",
              isHovered ? "scale-110" : "scale-100",
              getStatusColor(ticket.status).replace('text-', 'bg-').replace('800', '100').replace('400', '500/10')
            )}>
              {getStatusIcon(ticket.status)}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      #{ticket.ticketNumber}
                    </span>
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(ticket.status))}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", getPriorityColor(ticket.priority))}>
                      {ticket.priority}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-sm line-clamp-1 mb-1">
                    {ticket.title}
                  </h3>

                  {ticket.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {ticket.description}
                    </p>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {ticket.assignedTo && (
                    <div className="flex items-center gap-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={ticket.assignedTo.avatar} />
                        <AvatarFallback className="text-xs">
                          {ticket.assignedTo.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:inline">{ticket.assignedTo.name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </div>

                  {ticket.comments && ticket.comments.length > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {ticket.comments.length}
                    </div>
                  )}

                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {ticket.attachments.length}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isHovered ? "translate-x-1" : ""
            )} />
          </div>
        </Card>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      className="cursor-pointer h-full"
    >
      <Card className={cn(
        "relative overflow-hidden h-full flex flex-col transition-all duration-200",
        "hover:shadow-xl hover:border-primary/20",
        "bg-card/50 backdrop-blur-sm"
      )}>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100 pointer-events-none" />

        {/* Priority indicator */}
        {ticket.priority === 'URGENT' && (
          <div className="absolute top-0 right-0 w-24 h-24">
            <div className="absolute transform rotate-45 bg-red-500 text-white text-xs font-bold py-1 right-[-35px] top-[20px] w-[120px] text-center">
              URGENT
            </div>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={cn("text-xs", getStatusColor(ticket.status))}>
                  {getStatusIcon(ticket.status)}
                  <span className="ml-1">{ticket.status.replace('_', ' ')}</span>
                </Badge>
                {ticket.priority !== 'URGENT' && (
                  <Badge variant="outline" className={cn("text-xs", getPriorityColor(ticket.priority))}>
                    {ticket.priority}
                  </Badge>
                )}
              </div>

              <CardTitle className="text-base line-clamp-2">
                {ticket.title}
              </CardTitle>

              <p className="text-xs text-muted-foreground mt-1 font-mono">
                #{ticket.ticketNumber}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between pb-4">
          {ticket.description && (
            <CardDescription className="line-clamp-2 text-sm mb-4">
              {ticket.description}
            </CardDescription>
          )}

          <div className="space-y-3">
            {/* Service Info */}
            {ticket.service && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span className="truncate">
                  {ticket.service.category?.name && `${ticket.service.category.name} / `}
                  {ticket.service.name}
                </span>
              </div>
            )}

            {/* Branch Info */}
            {ticket.createdBy.branch && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate">
                  {ticket.createdBy.branch.name} ({ticket.createdBy.branch.code})
                </span>
              </div>
            )}

            {/* Assignee */}
            {ticket.assignedTo && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={ticket.assignedTo.avatar} />
                  <AvatarFallback className="text-xs">
                    {ticket.assignedTo.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  {ticket.assignedTo.name}
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {ticket.comments && ticket.comments.length > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {ticket.comments.length}
                  </div>
                )}
                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {ticket.attachments.length}
                  </div>
                )}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Created: {new Date(ticket.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(ticket.updatedAt).toLocaleString()}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}