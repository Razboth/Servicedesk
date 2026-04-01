'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  User,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
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

interface HandoverData {
  id: string;
  date: string;
  handoverTime: string;
  systemStatus: SystemStatus[];
  openIssues: OpenIssue[];
  notes?: string;
  acknowledgedAt?: string;
  outgoingPic: {
    id: string;
    name: string;
    username: string;
  };
  incomingPic?: {
    id: string;
    name: string;
    username: string;
  };
  fromChecklist: {
    id: string;
    unit: string;
    shiftType: string;
    items?: Array<{
      id: string;
      title: string;
      status: string;
      notes?: string;
    }>;
  };
}

interface HandoverAcknowledgeProps {
  handoverId: string;
  onAcknowledged?: () => void;
}

export function HandoverAcknowledge({ handoverId, onAcknowledged }: HandoverAcknowledgeProps) {
  const [handover, setHandover] = useState<HandoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  useEffect(() => {
    const fetchHandover = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/v2/checklist/handover/${handoverId}/acknowledge`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch handover');
        }

        const data = await response.json();
        setHandover(data.handover);
        setIsAcknowledged(data.isAcknowledged);
      } catch (err) {
        console.error('Error fetching handover:', err);
        setError(err instanceof Error ? err.message : 'Gagal memuat handover');
      } finally {
        setLoading(false);
      }
    };

    fetchHandover();
  }, [handoverId]);

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      const response = await fetch(`/api/v2/checklist/handover/${handoverId}/acknowledge`, {
        method: 'PUT',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to acknowledge');
      }

      toast.success('Handover berhasil dikonfirmasi');
      setIsAcknowledged(true);
      onAcknowledged?.();
    } catch (err) {
      console.error('Error acknowledging handover:', err);
      toast.error(err instanceof Error ? err.message : 'Gagal mengkonfirmasi handover');
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!handover) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Handover tidak ditemukan</p>
      </div>
    );
  }

  const StatusIcon = {
    OK: CheckCircle2,
    WARNING: AlertTriangle,
    ERROR: XCircle,
  };

  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
    HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Serah Terima Shift
            </CardTitle>
            <CardDescription>
              {format(new Date(handover.handoverTime), 'EEEE, d MMMM yyyy HH:mm', { locale: id })}
            </CardDescription>
          </div>
          {isAcknowledged ? (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Dikonfirmasi
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-500">
              Menunggu Konfirmasi
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PIC Info */}
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">PIC Keluar</p>
              <p className="font-medium">{handover.outgoingPic.name}</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">PIC Masuk</p>
              <p className="font-medium">
                {handover.incomingPic?.name || (isAcknowledged ? '-' : 'Anda')}
              </p>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="space-y-3">
          <h4 className="font-semibold">Status Sistem</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {handover.systemStatus.map((system) => {
              const Icon = StatusIcon[system.status];
              return (
                <div
                  key={system.name}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border',
                    system.status === 'OK' && 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
                    system.status === 'WARNING' && 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
                    system.status === 'ERROR' && 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      system.status === 'OK' && 'text-green-600',
                      system.status === 'WARNING' && 'text-amber-600',
                      system.status === 'ERROR' && 'text-red-600'
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">{system.name}</p>
                    {system.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{system.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Open Issues */}
        {handover.openIssues && handover.openIssues.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-amber-600 dark:text-amber-400">
              Isu yang Belum Selesai ({handover.openIssues.length})
            </h4>
            <div className="space-y-2">
              {handover.openIssues.map((issue, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <span className="text-sm">{issue.title}</span>
                  <Badge className={priorityColors[issue.priority]}>{issue.priority}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed/Needs Attention Items from Previous Checklist */}
        {handover.fromChecklist.items && handover.fromChecklist.items.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-red-600 dark:text-red-400">
              Item Bermasalah dari Shift Sebelumnya
            </h4>
            <div className="space-y-2">
              {handover.fromChecklist.items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'p-3 rounded-lg border',
                    item.status === 'FAILED' && 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
                    item.status === 'NEEDS_ATTENTION' && 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.title}</span>
                    <Badge
                      variant={item.status === 'FAILED' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {item.status === 'FAILED' ? 'Gagal' : 'Perlu Perhatian'}
                    </Badge>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {handover.notes && (
          <div className="space-y-2">
            <h4 className="font-semibold">Catatan Tambahan</h4>
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-sm whitespace-pre-wrap">{handover.notes}</p>
            </div>
          </div>
        )}

        {/* Acknowledge Button */}
        {!isAcknowledged && (
          <div className="pt-4 border-t">
            <Button onClick={handleAcknowledge} disabled={acknowledging} className="w-full">
              {acknowledging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengkonfirmasi...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Konfirmasi Penerimaan Handover
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Dengan mengkonfirmasi, Anda menyatakan telah membaca dan memahami informasi serah terima di atas.
            </p>
          </div>
        )}

        {/* Already Acknowledged Info */}
        {isAcknowledged && handover.acknowledgedAt && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm">
                Dikonfirmasi pada{' '}
                {format(new Date(handover.acknowledgedAt), 'HH:mm, d MMMM yyyy', { locale: id })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
