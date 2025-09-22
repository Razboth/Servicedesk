'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Info, AlertTriangle, X, Calendar, Eye, Megaphone, Wrench, RefreshCw, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { format } from 'date-fns';

interface AnnouncementImage {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  caption?: string;
  order: number;
}

interface Announcement {
  id: string;
  title: string;
  content?: string;
  type: 'GENERAL' | 'MAINTENANCE' | 'ALERT' | 'UPDATE' | 'PROMOTION';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  startDate: string;
  endDate: string;
  images: AnnouncementImage[];
  creator: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    views: number;
  };
  isViewed: boolean;
}

const typeIcons = {
  GENERAL: Megaphone,
  MAINTENANCE: Wrench,
  ALERT: AlertCircle,
  UPDATE: RefreshCw,
  PROMOTION: Gift
};

const typeColors = {
  GENERAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  ALERT: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  UPDATE: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  PROMOTION: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
};

const priorityColors = {
  LOW: 'border-l-4 border-l-slate-400',
  NORMAL: 'border-l-4 border-l-blue-500',
  HIGH: 'border-l-4 border-l-orange-500',
  URGENT: 'border-l-4 border-l-red-500 animate-pulse'
};

export function AnnouncementCarousel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (!autoRotate || announcements.length <= 1 || isDismissed) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 8000); // Rotate every 8 seconds

    return () => clearInterval(interval);
  }, [autoRotate, announcements.length, isDismissed]);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const goToPrevious = () => {
    setAutoRotate(false);
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const goToNext = () => {
    setAutoRotate(false);
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const goToSlide = (index: number) => {
    setAutoRotate(false);
    setCurrentIndex(index);
  };

  if (isLoading) {
    return (
      <Card className="mb-6 bg-gradient-to-r from-cream-50 to-cream-100 dark:from-brown-900 dark:to-brown-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0 || isDismissed) {
    return null;
  }

  const current = announcements[currentIndex];
  const Icon = typeIcons[current.type];

  return (
    <Card className={cn(
      "mb-6 relative overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl",
      "bg-gradient-to-r from-cream-50 to-cream-100 dark:from-brown-900 dark:to-brown-800",
      priorityColors[current.priority]
    )}>
      <CardContent className="p-0">
        <div className="relative">
          {/* Header bar with type and priority */}
          <div className="bg-gradient-to-r from-brown-600 to-brown-700 dark:from-brown-800 dark:to-brown-900 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("px-3 py-1 rounded-full flex items-center gap-2", typeColors[current.type])}>
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">{current.type}</span>
                </div>
                {!current.isViewed && (
                  <Badge variant="default" className="bg-green-500 text-white">New</Badge>
                )}
                {current.priority === 'URGENT' && (
                  <Badge variant="destructive" className="animate-pulse">Urgent</Badge>
                )}
                {current.priority === 'HIGH' && (
                  <Badge variant="destructive" className="bg-orange-500">High Priority</Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                onClick={() => setIsDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex">
            {/* Image section if available */}
            {current.images.length > 0 && (
              <div className="w-64 relative bg-muted flex-shrink-0">
                <Image
                  src={`/api/files/${current.images[0].filename}`}
                  alt={current.images[0].caption || current.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Content section */}
            <div className="flex-1 p-6">
              <div className="space-y-3">
                <h3 className="font-bold text-xl text-brown-800 dark:text-cream-100">
                  {current.title}
                </h3>

                {current.content && (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-brown-700 dark:text-cream-200"
                    dangerouslySetInnerHTML={{ __html: current.content }}
                  />
                )}

                {/* Footer info */}
                <div className="flex items-center justify-between pt-4 border-t border-brown-200 dark:border-brown-700">
                  <div className="flex items-center gap-4 text-xs text-brown-600 dark:text-cream-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Valid until {format(new Date(current.endDate), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{current._count.views} views</span>
                    </div>
                  </div>
                  <div className="text-xs text-brown-500 dark:text-cream-500">
                    Posted by {current.creator.name}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation controls */}
          {announcements.length > 1 && (
            <>
              {/* Navigation bar */}
              <div className="bg-brown-100 dark:bg-brown-800 px-4 py-3 border-t border-brown-200 dark:border-brown-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white dark:bg-brown-700 border-brown-300 dark:border-brown-600"
                      onClick={goToPrevious}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white dark:bg-brown-700 border-brown-300 dark:border-brown-600"
                      onClick={goToNext}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-brown-600 dark:text-cream-300 ml-2">
                      {currentIndex + 1} of {announcements.length}
                    </span>
                  </div>

                  {/* Dots indicator */}
                  <div className="flex gap-1">
                    {announcements.map((_, index) => (
                      <button
                        key={index}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          index === currentIndex
                            ? "bg-brown-600 dark:bg-cream-300 w-8"
                            : "bg-brown-300 dark:bg-brown-600 w-2 hover:bg-brown-400 dark:hover:bg-brown-500"
                        )}
                        onClick={() => goToSlide(index)}
                        aria-label={`Go to announcement ${index + 1}`}
                      />
                    ))}
                  </div>

                  <div className="text-xs text-brown-500 dark:text-cream-400">
                    {autoRotate ? 'Auto-playing' : 'Paused'}
                  </div>
                </div>
              </div>

              {/* Auto-rotate progress bar */}
              {autoRotate && (
                <div className="h-1 bg-brown-200 dark:bg-brown-700">
                  <div
                    className="h-full bg-brown-600 dark:bg-cream-400 transition-all duration-[8000ms] ease-linear"
                    style={{ width: '100%' }}
                    key={currentIndex}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}