'use client';

import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface Collection {
  id: string;
  fetchedAt: string;
  fetchedAtLocal: string | null;
  totalServers: number;
  summary: {
    warning: number;
    caution: number;
    ok: number;
  };
}

interface CollectionSelectorProps {
  collections: Collection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isLoading?: boolean;
}

export function CollectionSelector({
  collections,
  selectedId,
  onSelect,
  isLoading = false,
}: CollectionSelectorProps) {
  const formatCollectionDate = (collection: Collection) => {
    if (collection.fetchedAtLocal) {
      return collection.fetchedAtLocal;
    }
    try {
      return format(new Date(collection.fetchedAt), 'dd MMM yyyy, HH:mm', { locale: idLocale });
    } catch {
      return collection.fetchedAt;
    }
  };

  const getStatusIndicator = (collection: Collection) => {
    if (collection.summary.warning > 0) {
      return '🔴';
    }
    if (collection.summary.caution > 0) {
      return '🟡';
    }
    return '🟢';
  };

  return (
    <Select
      value={selectedId || 'latest'}
      onValueChange={(value) => onSelect(value === 'latest' ? null : value)}
      disabled={isLoading}
    >
      <SelectTrigger className="w-[280px]">
        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Pilih Data" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="latest">
          <span className="flex items-center gap-2">
            Data Terbaru
          </span>
        </SelectItem>
        {collections.map((collection) => (
          <SelectItem key={collection.id} value={collection.id}>
            <span className="flex items-center gap-2">
              <span>{getStatusIndicator(collection)}</span>
              <span>{formatCollectionDate(collection)}</span>
              <span className="text-muted-foreground text-xs">
                ({collection.totalServers} server)
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
