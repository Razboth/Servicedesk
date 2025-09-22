'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Edit, Users, Link, MessageSquare, FileText, Eye, GitBranch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TimelineItem {
  id: string;
  type: 'activity' | 'version';
  action: string;
  details: any;
  metadata?: any;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
}

interface ArticleTimelineProps {
  articleId: string;
}

const actionIcons: Record<string, any> = {
  VERSION_CREATED: GitBranch,
  COMMENT_ADDED: MessageSquare,
  COLLABORATOR_ADDED: Users,
  COLLABORATOR_REMOVED: Users,
  COLLABORATOR_LEFT: Users,
  COLLABORATOR_ROLE_CHANGED: Users,
  SERVICE_LINKED: Link,
  SERVICE_UNLINKED: Link,
  ARTICLE_VIEWED: Eye,
  ARTICLE_EDITED: Edit,
  ARTICLE_PUBLISHED: FileText,
  ARTICLE_UNPUBLISHED: FileText
};

const actionColors: Record<string, string> = {
  VERSION_CREATED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  COMMENT_ADDED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  COLLABORATOR_ADDED: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  COLLABORATOR_REMOVED: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  SERVICE_LINKED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  SERVICE_UNLINKED: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
};

export function ArticleTimeline({ articleId }: ArticleTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [articleId]);

  const fetchTimeline = async () => {
    try {
      const response = await fetch(`/api/knowledge/${articleId}/activity`);
      if (response.ok) {
        const data = await response.json();
        setTimeline(data);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionDescription = (item: TimelineItem) => {
    const { action, details } = item;

    switch (action) {
      case 'VERSION_CREATED':
        return (
          <span>
            created version <Badge variant="outline" className="ml-1">{details.version}</Badge>
            {details.changelog && (
              <span className="text-muted-foreground ml-2">- {details.changelog}</span>
            )}
          </span>
        );
      case 'COMMENT_ADDED':
        return (
          <span>
            added a comment
            {details.hasAttachments && (
              <Badge variant="secondary" className="ml-2">with attachments</Badge>
            )}
          </span>
        );
      case 'COLLABORATOR_ADDED':
        return <span>added {details.collaboratorName} as collaborator</span>;
      case 'COLLABORATOR_REMOVED':
        return <span>removed {details.collaboratorName} from collaborators</span>;
      case 'COLLABORATOR_LEFT':
        return <span>left as collaborator</span>;
      case 'COLLABORATOR_ROLE_CHANGED':
        return (
          <span>
            changed {details.collaboratorName}'s role to{' '}
            <Badge variant="outline" className="ml-1">{details.newRole}</Badge>
          </span>
        );
      case 'SERVICE_LINKED':
        return (
          <span>
            linked to {details.serviceName || details.categoryName}
          </span>
        );
      case 'SERVICE_UNLINKED':
        return (
          <span>
            unlinked from {details.serviceName || details.categoryName}
          </span>
        );
      case 'ARTICLE_PUBLISHED':
        return <span>published the article</span>;
      case 'ARTICLE_UNPUBLISHED':
        return <span>unpublished the article</span>;
      default:
        return <span>{action.toLowerCase().replace(/_/g, ' ')}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {timeline.map((item, index) => {
          const Icon = actionIcons[item.action] || Clock;
          const colorClass = actionColors[item.action] || 'bg-gray-100 text-gray-700';

          return (
            <div key={item.id} className="flex items-start gap-3">
              <div className="relative">
                <div className={`p-2 rounded-full ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {index < timeline.length - 1 && (
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-border" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={item.user.avatar} alt={item.user.name} />
                    <AvatarFallback>{item.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{item.user.name}</span>{' '}
                      {getActionDescription(item)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}