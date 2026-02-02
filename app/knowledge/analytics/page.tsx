'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import {
  BarChart3,
  FileText,
  Eye,
  Download,
  Users,
  ThumbsUp,
  AlertTriangle,
  TrendingUp,
  Search,
  Activity,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

interface AnalyticsData {
  period: string;
  startDate: string;
  endDate: string;
  overview: {
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
    archivedArticles: number;
    staleArticles: number;
  };
  accessStats: {
    totalViews: number;
    totalDownloads: number;
    uniqueUsers: number;
    uniqueArticlesViewed: number;
  };
  feedback: {
    totalHelpful: number;
    totalNotHelpful: number;
    overallHelpfulRate: number | null;
  };
  viewsByDate: Array<{ date: string; count: number }>;
  topArticles: Array<{
    id: string;
    title: string;
    slug: string;
    views: number;
    periodViews: number;
    helpful: number;
    notHelpful: number;
    helpfulRate: number | null;
    author: { name: string };
    category: { name: string } | null;
  }>;
  topSearchQueries: Array<{ query: string; count: number }>;
  articlesNeedingAttention: Array<{
    id: string;
    title: string;
    slug: string;
    isStale: boolean;
    nextReviewDate: string | null;
    lastReviewedAt: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    user: { name: string };
    article: { title: string; slug: string };
  }>;
}

const periodOptions = [
  { value: '7d', label: '7 Hari Terakhir' },
  { value: '30d', label: '30 Hari Terakhir' },
  { value: '90d', label: '90 Hari Terakhir' },
  { value: '1y', label: '1 Tahun Terakhir' },
];

export default function KnowledgeAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/knowledge/analytics?period=${period}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      VERSION_CREATED: 'membuat versi baru',
      ARTICLE_PUBLISHED: 'mempublikasikan artikel',
      ARTICLE_REVIEWED: 'mereview artikel',
      COMMENT_ADDED: 'menambahkan komentar',
      COLLABORATOR_ADDED: 'menambahkan kolaborator',
      VISIBILITY_CHANGED: 'mengubah visibilitas',
      OWNERSHIP_TRANSFERRED: 'mentransfer kepemilikan',
      VERSION_RESTORED: 'memulihkan versi',
      BULK_PERMISSIONS_APPLIED: 'menerapkan permission',
    };
    return labels[action] || action.toLowerCase().replace(/_/g, ' ');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium">Gagal memuat analytics</p>
          <Button onClick={fetchAnalytics} className="mt-4">
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: FileText,
      label: 'Total Artikel',
      value: data.overview.totalArticles,
      subLabel: `${data.overview.publishedArticles} dipublikasikan`,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50',
    },
    {
      icon: Eye,
      label: 'Total Views',
      value: data.accessStats.totalViews,
      subLabel: `${data.accessStats.uniqueArticlesViewed} artikel dilihat`,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/50',
    },
    {
      icon: Users,
      label: 'Pengguna Unik',
      value: data.accessStats.uniqueUsers,
      subLabel: 'mengakses knowledge base',
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/50',
    },
    {
      icon: ThumbsUp,
      label: 'Helpful Rate',
      value: data.feedback.overallHelpfulRate ? `${data.feedback.overallHelpfulRate}%` : '-',
      subLabel: `${data.feedback.totalHelpful} helpful votes`,
      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/50',
    },
  ];

  // Calculate max value for simple bar chart
  const maxViewCount = Math.max(...data.viewsByDate.map((d) => d.count), 1);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/knowledge" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Knowledge Base Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Pantau performa dan engagement knowledge base
            </p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
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
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.subLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stale Articles Alert */}
      {data.overview.staleArticles > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {data.overview.staleArticles} artikel membutuhkan review
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Artikel sudah melewati jadwal review atau ditandai sebagai kadaluarsa
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/knowledge?filter=stale">Lihat Semua</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Views per Hari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-end gap-1">
              {data.viewsByDate.slice(-14).map((day) => (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all"
                    style={{
                      height: `${(day.count / maxViewCount) * 200}px`,
                      minHeight: day.count > 0 ? '4px' : '0',
                    }}
                    title={`${day.date}: ${day.count} views`}
                  />
                  <span className="text-[10px] text-muted-foreground rotate-45 origin-left">
                    {day.date.slice(-5)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Search Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Top Pencarian
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topSearchQueries.length > 0 ? (
              <div className="space-y-3">
                {data.topSearchQueries.map((query, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm w-5">{idx + 1}.</span>
                      <span className="font-medium">{query.query}</span>
                    </div>
                    <Badge variant="secondary">{query.count}x</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Belum ada data pencarian</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Articles */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Artikel Paling Populer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artikel</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Helpful</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topArticles.slice(0, 5).map((article, idx) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <span className="font-medium text-muted-foreground w-5">
                          {idx + 1}.
                        </span>
                        <div>
                          <Link
                            href={`/knowledge/${article.slug}`}
                            className="font-medium hover:underline flex items-center gap-1"
                          >
                            {article.title}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {article.category?.name || 'Uncategorized'} &middot;{' '}
                            {article.author.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span className="font-medium">{article.periodViews}</span>
                        <p className="text-xs text-muted-foreground">
                          Total: {article.views}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {article.helpfulRate !== null ? (
                        <Badge
                          variant={article.helpfulRate >= 70 ? 'default' : 'secondary'}
                          className={
                            article.helpfulRate >= 70
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                              : ''
                          }
                        >
                          {article.helpfulRate}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Aktivitas Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {data.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user.name}</span>{' '}
                        {getActionLabel(activity.action)}
                      </p>
                      <Link
                        href={`/knowledge/${activity.article.slug}`}
                        className="text-sm text-blue-600 hover:underline truncate block"
                      >
                        {activity.article.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                          locale: idLocale,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Articles Needing Attention */}
      {data.articlesNeedingAttention.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Artikel Perlu Perhatian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.articlesNeedingAttention.map((article) => (
                <div
                  key={article.id}
                  className="p-4 border rounded-lg hover:border-yellow-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Link
                      href={`/knowledge/${article.slug}`}
                      className="font-medium hover:underline line-clamp-2"
                    >
                      {article.title}
                    </Link>
                    {article.isStale && (
                      <Badge variant="destructive" className="ml-2 flex-shrink-0">
                        Stale
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {article.lastReviewedAt
                      ? `Terakhir direview ${formatDistanceToNow(new Date(article.lastReviewedAt), { locale: idLocale })} lalu`
                      : 'Belum pernah direview'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
