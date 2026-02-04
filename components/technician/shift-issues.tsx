'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  X,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Ticket,
  ExternalLink,
  User,
  Calendar,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TicketInfo {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  service: { name: string } | null;
  assignedTo: { name: string } | null;
  createdAt: string;
}

export interface ShiftIssue {
  id: string;
  title: string;
  description: string | null;
  status: 'ONGOING' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  ticketNumber: string | null;
  ticketId: string | null;
  ticket: TicketInfo | null;
}

interface ShiftIssuesProps {
  ongoingIssues: ShiftIssue[];
  resolvedIssues: ShiftIssue[];
  onCreateIssue: (issue: { title: string; description?: string; priority?: string; ticketNumber?: string }) => Promise<void>;
  onUpdateIssue: (issue: { id: string; title?: string; description?: string; status?: string; priority?: string; resolution?: string; ticketNumber?: string }) => Promise<void>;
  onDeleteIssue: (id: string) => Promise<void>;
  isLoading?: boolean;
  readOnly?: boolean;
}

const priorityConfig = {
  LOW: { label: 'Rendah', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  MEDIUM: { label: 'Sedang', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  HIGH: { label: 'Tinggi', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  CRITICAL: { label: 'Kritis', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
};

export function ShiftIssues({
  ongoingIssues,
  resolvedIssues,
  onCreateIssue,
  onUpdateIssue,
  onDeleteIssue,
  isLoading = false,
  readOnly = false,
}: ShiftIssuesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', priority: 'MEDIUM', ticketNumber: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ShiftIssue> & { ticketNumber?: string }>({});
  const [showResolved, setShowResolved] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const handleCreate = async () => {
    if (!newIssue.title.trim() || localLoading) return;
    setLocalLoading(true);
    try {
      await onCreateIssue({
        ...newIssue,
        ticketNumber: newIssue.ticketNumber || undefined,
      });
      setNewIssue({ title: '', description: '', priority: 'MEDIUM', ticketNumber: '' });
      setShowAddForm(false);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleResolve = async (issue: ShiftIssue) => {
    if (localLoading) return;
    setLocalLoading(true);
    try {
      await onUpdateIssue({ id: issue.id, status: 'RESOLVED' });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleReopen = async (issue: ShiftIssue) => {
    if (localLoading) return;
    setLocalLoading(true);
    try {
      await onUpdateIssue({ id: issue.id, status: 'ONGOING' });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (localLoading) return;
    setLocalLoading(true);
    try {
      await onDeleteIssue(id);
    } finally {
      setLocalLoading(false);
    }
  };

  const startEdit = (issue: ShiftIssue) => {
    setEditingId(issue.id);
    setEditData({
      title: issue.title,
      description: issue.description || '',
      priority: issue.priority,
      resolution: issue.resolution || '',
      ticketNumber: issue.ticketNumber || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingId || localLoading) return;
    setLocalLoading(true);
    try {
      await onUpdateIssue({ id: editingId, ...editData });
      setEditingId(null);
      setEditData({});
    } finally {
      setLocalLoading(false);
    }
  };

  const renderIssueItem = (issue: ShiftIssue, isResolved: boolean) => {
    const isEditing = editingId === issue.id;
    const priority = priorityConfig[issue.priority];

    if (isEditing) {
      return (
        <div key={issue.id} className="p-3 space-y-2 bg-muted/30 rounded-lg">
          <Input
            value={editData.title || ''}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            placeholder="Judul masalah"
            className="h-8 text-sm"
          />
          <Textarea
            value={editData.description || ''}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Deskripsi masalah"
            className="min-h-[60px] text-sm"
          />
          <div className="flex gap-2">
            <Select
              value={editData.priority}
              onValueChange={(value) => setEditData({ ...editData, priority: value })}
            >
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue placeholder="Prioritas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Rendah</SelectItem>
                <SelectItem value="MEDIUM">Sedang</SelectItem>
                <SelectItem value="HIGH">Tinggi</SelectItem>
                <SelectItem value="CRITICAL">Kritis</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={editData.ticketNumber || ''}
              onChange={(e) => setEditData({ ...editData, ticketNumber: e.target.value })}
              placeholder="No. Tiket (opsional)"
              className="h-8 text-sm flex-1"
            />
          </div>
          {isResolved && (
            <Textarea
              value={editData.resolution || ''}
              onChange={(e) => setEditData({ ...editData, resolution: e.target.value })}
              placeholder="Resolusi / cara penyelesaian"
              className="min-h-[60px] text-sm"
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleUpdate} disabled={localLoading}>
              Simpan
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingId(null)}>
              Batal
            </Button>
          </div>
        </div>
      );
    }

    const ticketStatusColors: Record<string, string> = {
      OPEN: 'text-blue-600',
      IN_PROGRESS: 'text-yellow-600',
      RESOLVED: 'text-green-600',
      CLOSED: 'text-gray-600',
      ON_HOLD: 'text-orange-600',
    };

    return (
      <div
        key={issue.id}
        className={cn(
          'p-3 rounded-lg border',
          isResolved ? 'bg-muted/30' : 'bg-background'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('font-medium text-sm', isResolved && 'text-muted-foreground')}>
                {issue.title}
              </span>
              <Badge className={cn('text-[10px] h-4 px-1', priority.color)}>
                {priority.label}
              </Badge>
              {/* Ticket Number Badge with Tooltip */}
              {issue.ticketNumber && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={issue.ticket ? `/tickets/${issue.ticketNumber}` : '#'}
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] h-4 px-1.5 rounded-md',
                          'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
                          'hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors',
                          !issue.ticket && 'opacity-60 cursor-default'
                        )}
                        onClick={(e) => !issue.ticket && e.preventDefault()}
                      >
                        <Ticket className="h-2.5 w-2.5" />
                        {issue.ticketNumber}
                        {issue.ticket && <ExternalLink className="h-2 w-2" />}
                      </a>
                    </TooltipTrigger>
                    {issue.ticket ? (
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1.5 text-xs">
                          <div className="font-medium">{issue.ticket.title}</div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span className={cn('font-medium', ticketStatusColors[issue.ticket.status] || 'text-gray-600')}>
                              {issue.ticket.status}
                            </span>
                            <span>•</span>
                            <span>{issue.ticket.priority}</span>
                          </div>
                          {issue.ticket.service && (
                            <div className="text-muted-foreground">
                              Layanan: {issue.ticket.service.name}
                            </div>
                          )}
                          {issue.ticket.assignedTo && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <User className="h-3 w-3" />
                              {issue.ticket.assignedTo.name}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(issue.ticket.createdAt).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      </TooltipContent>
                    ) : (
                      <TooltipContent side="top">
                        <p className="text-xs">Tiket tidak ditemukan di sistem</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {issue.description && (
              <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
            )}
            {issue.resolution && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Resolusi: {issue.resolution}
              </p>
            )}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isResolved && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700"
                  onClick={() => handleResolve(issue)}
                  disabled={localLoading}
                  title="Tandai selesai"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
              {isResolved && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700"
                  onClick={() => handleReopen(issue)}
                  disabled={localLoading}
                  title="Buka kembali"
                >
                  <Clock className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => startEdit(issue)}
                title="Edit"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                onClick={() => handleDelete(issue.id)}
                disabled={localLoading}
                title="Hapus"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Ongoing Issues */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-sm">Masalah Berjalan</span>
            <Badge variant="secondary" className="text-xs">{ongoingIssues.length}</Badge>
          </div>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Tambah
            </Button>
          )}
        </div>

        {/* Add form */}
        {showAddForm && !readOnly && (
          <div className="p-3 border rounded-lg space-y-2 bg-muted/30">
            <Input
              value={newIssue.title}
              onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
              placeholder="Judul masalah"
              className="h-8 text-sm"
            />
            <Textarea
              value={newIssue.description}
              onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
              placeholder="Deskripsi masalah (opsional)"
              className="min-h-[60px] text-sm"
            />
            <div className="flex gap-2">
              <Select
                value={newIssue.priority}
                onValueChange={(value) => setNewIssue({ ...newIssue, priority: value })}
              >
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue placeholder="Prioritas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Rendah</SelectItem>
                  <SelectItem value="MEDIUM">Sedang</SelectItem>
                  <SelectItem value="HIGH">Tinggi</SelectItem>
                  <SelectItem value="CRITICAL">Kritis</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={newIssue.ticketNumber}
                onChange={(e) => setNewIssue({ ...newIssue, ticketNumber: e.target.value })}
                placeholder="No. Tiket (opsional)"
                className="h-8 text-sm flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={localLoading || !newIssue.title.trim()}>
                Simpan
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddForm(false)}>
                Batal
              </Button>
            </div>
          </div>
        )}

        {/* Ongoing issues list */}
        <div className="space-y-2">
          {ongoingIssues.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Tidak ada masalah yang sedang berjalan
            </p>
          ) : (
            ongoingIssues.map((issue) => renderIssueItem(issue, false))
          )}
        </div>
      </div>

      {/* Resolved Issues */}
      <div className="space-y-3">
        <button
          onClick={() => setShowResolved(!showResolved)}
          className="flex items-center gap-2 text-sm"
        >
          {showResolved ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="font-medium">Masalah Selesai</span>
          <Badge variant="secondary" className="text-xs">{resolvedIssues.length}</Badge>
        </button>

        {showResolved && (
          <div className="space-y-2 ml-6">
            {resolvedIssues.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum ada masalah yang diselesaikan
              </p>
            ) : (
              resolvedIssues.map((issue) => renderIssueItem(issue, true))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
