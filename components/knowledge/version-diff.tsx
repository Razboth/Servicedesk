'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCompare, Plus, Minus, Equal, CheckCircle } from 'lucide-react';

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber?: { old?: number; new?: number };
}

interface VersionInfo {
  id: string;
  version: number;
  createdAt: string;
  author: { id: string; name: string };
  changeNotes: string | null;
  isStable: boolean;
}

interface DiffData {
  fromVersion: VersionInfo;
  toVersion: VersionInfo;
  diff: {
    title: { changed: boolean; old?: string; new?: string };
    summary: { changed: boolean; old?: string; new?: string };
    content: DiffLine[];
  };
  stats: {
    addedLines: number;
    removedLines: number;
    unchangedLines: number;
    totalChanges: number;
  };
}

interface Version {
  id: string;
  version: number;
  changeNotes: string | null;
  createdAt: string;
  isStable?: boolean;
  author: { name: string };
}

interface VersionDiffProps {
  articleId: string;
  versions: Version[];
}

export function VersionDiff({ articleId, versions }: VersionDiffProps) {
  const [fromVersionId, setFromVersionId] = useState<string>('');
  const [toVersionId, setToVersionId] = useState<string>('');
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with latest two versions
  useEffect(() => {
    if (versions.length >= 2 && !fromVersionId && !toVersionId) {
      setFromVersionId(versions[1].id); // Second latest
      setToVersionId(versions[0].id); // Latest
    }
  }, [versions, fromVersionId, toVersionId]);

  // Fetch diff when versions change
  useEffect(() => {
    if (fromVersionId && toVersionId && fromVersionId !== toVersionId) {
      fetchDiff();
    }
  }, [fromVersionId, toVersionId]);

  const fetchDiff = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/knowledge/${articleId}/versions/compare?from=${fromVersionId}&to=${toVersionId}`
      );
      if (response.ok) {
        const data = await response.json();
        setDiffData(data.data);
      }
    } catch (error) {
      console.error('Error fetching diff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (versions.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <GitCompare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Minimal 2 versi diperlukan untuk perbandingan</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          Perbandingan Versi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Version Selectors */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block">Dari Versi</label>
            <Select value={fromVersionId} onValueChange={setFromVersionId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih versi" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === toVersionId}>
                    <div className="flex items-center gap-2">
                      <span>v{v.version}</span>
                      {v.isStable && <CheckCircle className="h-3 w-3 text-green-600" />}
                      <span className="text-muted-foreground text-xs">
                        - {formatDistanceToNow(new Date(v.createdAt), { locale: idLocale })} lalu
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block">Ke Versi</label>
            <Select value={toVersionId} onValueChange={setToVersionId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih versi" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === fromVersionId}>
                    <div className="flex items-center gap-2">
                      <span>v{v.version}</span>
                      {v.isStable && <CheckCircle className="h-3 w-3 text-green-600" />}
                      <span className="text-muted-foreground text-xs">
                        - {formatDistanceToNow(new Date(v.createdAt), { locale: idLocale })} lalu
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : diffData ? (
          <div className="space-y-4">
            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-green-600">
                <Plus className="h-4 w-4" />
                <span>{diffData.stats.addedLines} baris ditambah</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-600">
                <Minus className="h-4 w-4" />
                <span>{diffData.stats.removedLines} baris dihapus</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Equal className="h-4 w-4" />
                <span>{diffData.stats.unchangedLines} baris tidak berubah</span>
              </div>
            </div>

            {/* Title Diff */}
            {diffData.diff.title.changed && (
              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Judul</p>
                <div className="space-y-1">
                  <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 p-2 rounded text-sm">
                    <Minus className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-red-800 dark:text-red-300">{diffData.diff.title.old}</span>
                  </div>
                  <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950/30 p-2 rounded text-sm">
                    <Plus className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-green-800 dark:text-green-300">{diffData.diff.title.new}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Diff */}
            {diffData.diff.summary.changed && (
              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Ringkasan</p>
                <div className="space-y-1">
                  {diffData.diff.summary.old && (
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 p-2 rounded text-sm">
                      <Minus className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-red-800 dark:text-red-300">{diffData.diff.summary.old}</span>
                    </div>
                  )}
                  {diffData.diff.summary.new && (
                    <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950/30 p-2 rounded text-sm">
                      <Plus className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-green-800 dark:text-green-300">{diffData.diff.summary.new}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content Diff */}
            <div className="border rounded-lg">
              <div className="px-3 py-2 border-b bg-muted/50">
                <p className="text-sm font-medium">Konten</p>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="font-mono text-sm">
                  {diffData.diff.content.map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex px-3 py-0.5 ${
                        line.type === 'added'
                          ? 'bg-green-50 dark:bg-green-950/30'
                          : line.type === 'removed'
                          ? 'bg-red-50 dark:bg-red-950/30'
                          : ''
                      }`}
                    >
                      <span className="w-12 text-muted-foreground text-right pr-3 select-none flex-shrink-0">
                        {line.lineNumber?.old || ''}
                      </span>
                      <span className="w-12 text-muted-foreground text-right pr-3 select-none flex-shrink-0">
                        {line.lineNumber?.new || ''}
                      </span>
                      <span
                        className={`flex-1 ${
                          line.type === 'added'
                            ? 'text-green-800 dark:text-green-300'
                            : line.type === 'removed'
                            ? 'text-red-800 dark:text-red-300'
                            : ''
                        }`}
                      >
                        <span className="mr-2 select-none">
                          {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                        </span>
                        {line.content || '\u00A0'}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
