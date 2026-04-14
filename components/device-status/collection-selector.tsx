'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { History, ChevronDown, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface CollectionSummary {
  id: string;
  fetchedAt: string;
  fetchedAtLocal: string | null;
  totalServices: number;
  summary: {
    ok: number;
    down: number;
    inactive: number;
  };
}

interface CollectionSelectorProps {
  collections: CollectionSummary[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isLoading?: boolean;
}

export function CollectionSelector({
  collections,
  selectedId,
  onSelect,
  isLoading,
}: CollectionSelectorProps) {
  const [open, setOpen] = useState(false);

  const formatDate = (dateStr: string | null, fallback: string) => {
    if (dateStr) return dateStr;
    try {
      return format(parseISO(fallback), 'dd MMM yyyy, HH:mm', { locale: idLocale });
    } catch {
      return fallback;
    }
  };

  const selectedCollection = collections.find((c) => c.id === selectedId);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <History className="h-4 w-4 mr-2" />
          )}
          {selectedId ? 'Historis' : 'Terbaru'}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuItem onClick={() => onSelect(null)}>
          <div className="flex flex-col">
            <span className="font-medium">Data Terbaru</span>
            <span className="text-xs text-muted-foreground">
              Tampilkan data paling baru
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {collections.map((collection) => (
          <DropdownMenuItem
            key={collection.id}
            onClick={() => onSelect(collection.id)}
            className={selectedId === collection.id ? 'bg-accent' : ''}
          >
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {formatDate(collection.fetchedAtLocal, collection.fetchedAt)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {collection.totalServices} layanan
                </span>
              </div>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-green-600">{collection.summary.ok} OK</span>
                {collection.summary.down > 0 && (
                  <span className="text-red-600">{collection.summary.down} Down</span>
                )}
                <span className="text-gray-500">{collection.summary.inactive} Inactive</span>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
