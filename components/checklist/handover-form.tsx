'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SystemStatus {
  name: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  notes?: string;
}

interface OpenIssue {
  title: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  description?: string;
}

interface HandoverFormProps {
  checklistId: string;
  toChecklistId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DEFAULT_SYSTEMS: SystemStatus[] = [
  { name: 'Internet/Network', status: 'OK' },
  { name: 'Server Utama', status: 'OK' },
  { name: 'Database', status: 'OK' },
  { name: 'Email/Mail Server', status: 'OK' },
  { name: 'Backup System', status: 'OK' },
  { name: 'Monitoring Tools', status: 'OK' },
];

export function HandoverForm({
  checklistId,
  toChecklistId,
  onSuccess,
  onCancel,
}: HandoverFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systems, setSystems] = useState<SystemStatus[]>(DEFAULT_SYSTEMS);
  const [issues, setIssues] = useState<OpenIssue[]>([]);
  const [notes, setNotes] = useState('');
  const [newIssueTitle, setNewIssueTitle] = useState('');

  const handleSystemStatusChange = (index: number, status: 'OK' | 'WARNING' | 'ERROR') => {
    const updated = [...systems];
    updated[index].status = status;
    setSystems(updated);
  };

  const handleSystemNotesChange = (index: number, notes: string) => {
    const updated = [...systems];
    updated[index].notes = notes;
    setSystems(updated);
  };

  const handleAddIssue = () => {
    if (!newIssueTitle.trim()) return;
    setIssues([...issues, { title: newIssueTitle.trim(), priority: 'MEDIUM' }]);
    setNewIssueTitle('');
  };

  const handleRemoveIssue = (index: number) => {
    setIssues(issues.filter((_, i) => i !== index));
  };

  const handleIssuePriorityChange = (index: number, priority: 'LOW' | 'MEDIUM' | 'HIGH') => {
    const updated = [...issues];
    updated[index].priority = priority;
    setIssues(updated);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v2/checklist/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChecklistId: checklistId,
          toChecklistId,
          systemStatus: systems,
          openIssues: issues.length > 0 ? issues : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create handover');
      }

      toast.success('Handover berhasil dibuat');
      onSuccess?.();
    } catch (err) {
      console.error('Error creating handover:', err);
      toast.error(err instanceof Error ? err.message : 'Gagal membuat handover');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Form Serah Terima Shift
        </CardTitle>
        <CardDescription>
          Lengkapi informasi status sistem dan isu yang perlu diketahui oleh PIC berikutnya
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* System Status */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Status Sistem</Label>
          <div className="space-y-2">
            {systems.map((system, index) => (
              <div
                key={system.name}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  system.status === 'OK' && 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
                  system.status === 'WARNING' && 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
                  system.status === 'ERROR' && 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                )}
              >
                <span className="font-medium">{system.name}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={system.status === 'OK' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-8',
                      system.status === 'OK' && 'bg-green-600 hover:bg-green-700'
                    )}
                    onClick={() => handleSystemStatusChange(index, 'OK')}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={system.status === 'WARNING' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-8',
                      system.status === 'WARNING' && 'bg-amber-600 hover:bg-amber-700'
                    )}
                    onClick={() => handleSystemStatusChange(index, 'WARNING')}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={system.status === 'ERROR' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-8',
                      system.status === 'ERROR' && 'bg-red-600 hover:bg-red-700'
                    )}
                    onClick={() => handleSystemStatusChange(index, 'ERROR')}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Notes for Warning/Error */}
        {systems.some((s) => s.status !== 'OK') && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">
              Catatan untuk sistem bermasalah
            </Label>
            {systems
              .filter((s) => s.status !== 'OK')
              .map((system) => {
                const index = systems.findIndex((s) => s.name === system.name);
                return (
                  <div key={system.name} className="space-y-1">
                    <Label className="text-xs">{system.name}</Label>
                    <Textarea
                      value={system.notes || ''}
                      onChange={(e) => handleSystemNotesChange(index, e.target.value)}
                      placeholder={`Jelaskan kondisi ${system.name}...`}
                      rows={2}
                    />
                  </div>
                );
              })}
          </div>
        )}

        {/* Open Issues */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Isu yang Belum Selesai</Label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              placeholder="Tambahkan isu baru..."
              className="flex-1 h-10 px-3 rounded-md border bg-background text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddIssue()}
            />
            <Button type="button" onClick={handleAddIssue} size="sm" className="h-10">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {issues.length > 0 && (
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <span className="text-sm">{issue.title}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={issue.priority}
                      onChange={(e) =>
                        handleIssuePriorityChange(
                          index,
                          e.target.value as 'LOW' | 'MEDIUM' | 'HIGH'
                        )
                      }
                      className="h-8 px-2 text-xs rounded-md border bg-background"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                      onClick={() => handleRemoveIssue(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Catatan Tambahan</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Informasi lain yang perlu diketahui PIC berikutnya..."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Batal
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Buat Handover
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
