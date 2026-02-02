'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  History,
  MoreVertical,
  RotateCcw,
  CheckCircle,
  GitCompare,
  Eye,
  Star,
  StarOff,
} from 'lucide-react';
import { VersionRestoreDialog } from './version-restore-dialog';
import { VersionDiff } from './version-diff';

interface Version {
  id: string;
  version: number;
  title: string;
  content: string;
  summary: string | null;
  changeNotes: string | null;
  createdAt: string;
  isStable: boolean;
  approvedAt?: string | null;
  author: {
    id?: string;
    name: string;
  };
  approver?: {
    id: string;
    name: string;
  } | null;
}

interface VersionHistoryPanelProps {
  articleId: string;
  canManage?: boolean;
  onVersionRestored?: () => void;
}

export function VersionHistoryPanel({
  articleId,
  canManage = false,
  onVersionRestored,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<Version | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [articleId]);

  const fetchVersions = async () => {
    setIsLoading(true);
    try {
      // Fetch article with versions
      const response = await fetch(`/api/knowledge/${articleId}`);
      if (response.ok) {
        const article = await response.json();
        // Fetch full version details for each version
        const versionPromises = article.versions.map(async (v: any) => {
          const vRes = await fetch(`/api/knowledge/${articleId}/versions/${v.id}`);
          if (vRes.ok) {
            const vData = await vRes.json();
            return vData.data;
          }
          return { ...v, title: article.title, content: article.content, summary: article.summary };
        });
        const fullVersions = await Promise.all(versionPromises);
        setVersions(fullVersions);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkStable = async (version: Version, markAsStable: boolean) => {
    try {
      const response = await fetch(`/api/knowledge/${articleId}/versions/${version.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStable: markAsStable }),
      });

      if (response.ok) {
        toast.success(
          markAsStable
            ? `Versi ${version.version} ditandai sebagai stabil`
            : `Versi ${version.version} tidak lagi stabil`
        );
        fetchVersions();
      } else {
        toast.error('Gagal mengubah status versi');
      }
    } catch (error) {
      console.error('Error updating version:', error);
      toast.error('Gagal mengubah status versi');
    }
  };

  const handleRestoreClick = (version: Version) => {
    setSelectedVersion(version);
    setShowRestoreDialog(true);
  };

  const handleRestored = () => {
    fetchVersions();
    onVersionRestored?.();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Riwayat Versi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Riwayat Versi ({versions.length})
          </CardTitle>
          {versions.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiff(!showDiff)}
              className="flex items-center gap-1"
            >
              <GitCompare className="h-4 w-4" />
              {showDiff ? 'Sembunyikan' : 'Bandingkan'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showDiff && versions.length >= 2 && (
            <div className="mb-6">
              <VersionDiff articleId={articleId} versions={versions} />
            </div>
          )}

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`relative flex items-start gap-3 ${
                    index < versions.length - 1 ? 'pb-4' : ''
                  }`}
                >
                  {/* Timeline connector */}
                  {index < versions.length - 1 && (
                    <div className="absolute top-8 left-4 w-0.5 h-full -ml-px bg-border" />
                  )}

                  {/* Version indicator */}
                  <div
                    className={`relative z-10 flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium ${
                      version.isStable
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                        : index === 0
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {version.isStable ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      `v${version.version}`
                    )}
                  </div>

                  {/* Version content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Versi {version.version}</span>
                          {version.isStable && (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-600 text-xs"
                            >
                              Stabil
                            </Badge>
                          )}
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Terbaru
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Oleh {version.author.name} &middot;{' '}
                          {formatDistanceToNow(new Date(version.createdAt), {
                            addSuffix: true,
                            locale: idLocale,
                          })}
                        </p>
                        {version.changeNotes && (
                          <p className="text-sm mt-1 text-muted-foreground">
                            {version.changeNotes}
                          </p>
                        )}
                        {version.isStable && version.approver && (
                          <p className="text-xs text-green-600 mt-1">
                            Disetujui oleh {version.approver.name}
                          </p>
                        )}
                      </div>

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setPreviewVersion(version)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Lihat Versi
                            </DropdownMenuItem>
                            {index !== 0 && (
                              <DropdownMenuItem
                                onClick={() => handleRestoreClick(version)}
                                className="flex items-center gap-2"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Pulihkan
                              </DropdownMenuItem>
                            )}
                            {version.isStable ? (
                              <DropdownMenuItem
                                onClick={() => handleMarkStable(version, false)}
                                className="flex items-center gap-2"
                              >
                                <StarOff className="h-4 w-4" />
                                Hapus Tanda Stabil
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleMarkStable(version, true)}
                                className="flex items-center gap-2"
                              >
                                <Star className="h-4 w-4" />
                                Tandai Stabil
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <VersionRestoreDialog
        articleId={articleId}
        version={selectedVersion}
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        onRestored={handleRestored}
      />

      {/* Preview Dialog */}
      {previewVersion && (
        <VersionRestoreDialog
          articleId={articleId}
          version={previewVersion}
          open={!!previewVersion}
          onOpenChange={(open) => !open && setPreviewVersion(null)}
        />
      )}
    </>
  );
}
