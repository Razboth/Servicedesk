'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Users, Clock, Download, Printer, Share2, TrendingUp } from 'lucide-react';

interface AccessStatsData {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalAccess: number;
    totalViews: number;
    totalDownloads: number;
    totalPrints: number;
    totalShares: number;
    uniqueVisitors: number;
    avgDuration: number | null;
  };
  accessTypeBreakdown: Array<{ type: string; count: number }>;
  viewsByDate: Array<{ date: string; count: number }>;
  viewsByHour: number[];
  topReferrers: Array<{ referrer: string; count: number }>;
}

interface AccessStatsCardProps {
  articleId: string;
}

const periodOptions = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
];

export function AccessStatsCard({ articleId }: AccessStatsCardProps) {
  const [stats, setStats] = useState<AccessStatsData | null>(null);
  const [period, setPeriod] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [articleId, period]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/knowledge/${articleId}/access-logs/stats?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching access stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">Statistik Akses</CardTitle>
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    {
      icon: Eye,
      label: 'Total Views',
      value: stats.summary.totalViews,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50',
    },
    {
      icon: Users,
      label: 'Unique Visitors',
      value: stats.summary.uniqueVisitors,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/50',
    },
    {
      icon: Clock,
      label: 'Avg. Duration',
      value: formatDuration(stats.summary.avgDuration),
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/50',
    },
    {
      icon: TrendingUp,
      label: 'Total Access',
      value: stats.summary.totalAccess,
      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/50',
    },
  ];

  const actionItems = [
    { icon: Download, label: 'Downloads', value: stats.summary.totalDownloads },
    { icon: Printer, label: 'Prints', value: stats.summary.totalPrints },
    { icon: Share2, label: 'Shares', value: stats.summary.totalShares },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium">Statistik Akses</CardTitle>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Breakdown */}
        {(stats.summary.totalDownloads > 0 || stats.summary.totalPrints > 0 || stats.summary.totalShares > 0) && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Aksi Lainnya</p>
            <div className="flex gap-6">
              {actionItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{item.label}:</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Referrers */}
        {stats.topReferrers.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Sumber Traffic</p>
            <div className="space-y-2">
              {stats.topReferrers.slice(0, 5).map((ref, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {ref.referrer || 'Direct'}
                  </span>
                  <span className="font-medium">{ref.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
