'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ChecklistPanelV2 } from '@/components/checklist';
import { HandoverForm, HandoverAcknowledge } from '@/components/checklist';
import {
  ClipboardCheck,
  Monitor,
  Server,
  Sun,
  Moon,
  Clock,
  ArrowRight,
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

type ChecklistUnit = 'IT_OPERATIONS' | 'MONITORING';
type ChecklistShiftType = 'HARIAN_KANTOR' | 'STANDBY_LEMBUR' | 'SHIFT_MALAM' | 'SHIFT_SIANG_WEEKEND';

interface ShiftInfo {
  currentShift: ChecklistShiftType | null;
  availableShifts: ChecklistShiftType[];
  serverTime: {
    wita: string;
    witaHour: number;
    witaMinute: number;
  };
}

interface PendingHandover {
  id: string;
  outgoingPic: { name: string };
  handoverTime: string;
}

const UNIT_CONFIG = {
  IT_OPERATIONS: {
    label: 'IT Operations',
    icon: Server,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
  MONITORING: {
    label: 'Monitoring',
    icon: Monitor,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
  },
};

const SHIFT_CONFIG: Record<ChecklistShiftType, { label: string; icon: typeof Sun; time: string }> = {
  HARIAN_KANTOR: { label: 'Harian Kantor', icon: Sun, time: '08:00 - 17:00' },
  STANDBY_LEMBUR: { label: 'Standby Lembur', icon: Clock, time: '17:00 - 20:00' },
  SHIFT_MALAM: { label: 'Shift Malam', icon: Moon, time: '20:00 - 08:00' },
  SHIFT_SIANG_WEEKEND: { label: 'Shift Siang Weekend', icon: Sun, time: '08:00 - 20:00' },
};

export default function ChecklistV2Page() {
  const { data: session, status } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUnit, setSelectedUnit] = useState<ChecklistUnit>('IT_OPERATIONS');
  const [selectedShift, setSelectedShift] = useState<ChecklistShiftType | null>(null);
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo | null>(null);
  const [pendingHandovers, setPendingHandovers] = useState<PendingHandover[]>([]);
  const [showHandoverForm, setShowHandoverForm] = useState(false);
  const [selectedHandoverId, setSelectedHandoverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPDF = async () => {
    if (!selectedShift) {
      toast.error('Pilih shift terlebih dahulu');
      return;
    }

    setExportingPdf(true);
    try {
      // Fetch fresh checklist data with cache busting
      const timestamp = Date.now();
      const checklistResponse = await fetch(
        `/api/v2/checklist?unit=${selectedUnit}&shiftType=${selectedShift}&date=${selectedDate}&_t=${timestamp}`,
        { cache: 'no-store' }
      );

      if (!checklistResponse.ok) {
        throw new Error('Failed to fetch checklist data');
      }

      const checklistData = await checklistResponse.json();

      if (!checklistData.checklist) {
        toast.error('Tidak ada checklist untuk shift ini');
        return;
      }

      const { checklist, progress, totalItems, completedItems } = checklistData;
      const items = checklist.items || [];

      // Create PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPos = 20;

      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LAPORAN CHECKLIST HARIAN', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      // Subheader
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${UNIT_CONFIG[selectedUnit].label} - ${SHIFT_CONFIG[selectedShift].label}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;

      // Info box
      pdf.setFontSize(10);
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(15, yPos, pageWidth - 30, 25);
      yPos += 8;

      pdf.text(`Tanggal: ${format(new Date(selectedDate), 'EEEE, dd MMMM yyyy', { locale: id })}`, 20, yPos);
      yPos += 6;
      pdf.text(`Waktu Shift: ${SHIFT_CONFIG[selectedShift].time}`, 20, yPos);
      yPos += 6;
      pdf.text(`Progress: ${completedItems}/${totalItems} item selesai (${progress}%)`, 20, yPos);
      yPos += 15;

      // Assignments
      if (checklist.assignments && checklist.assignments.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Petugas:', 20, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 6;
        checklist.assignments.forEach((a: any) => {
          pdf.text(`- ${a.user?.name || 'Unknown'} (${a.role === 'SUPERVISOR' ? 'Supervisor' : 'Staff'})`, 25, yPos);
          yPos += 5;
        });
        yPos += 10;
      }

      // Items by section
      const sections = checklist.sections || [];

      for (const section of sections) {
        // Check if we need a new page
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        // Section header
        pdf.setFillColor(240, 240, 240);
        pdf.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(`${section.section}. ${section.sectionTitle}`, 20, yPos);
        yPos += 10;

        // Items
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);

        for (const item of section.items) {
          // Check if we need a new page
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }

          // Status indicator
          let statusText = '';
          let statusColor: [number, number, number] = [128, 128, 128];

          switch (item.status) {
            case 'COMPLETED':
              statusText = '[v]';
              statusColor = [34, 197, 94]; // green
              break;
            case 'FAILED':
              statusText = '[x]';
              statusColor = [239, 68, 68]; // red
              break;
            case 'NOT_APPLICABLE':
              statusText = '[N/A]';
              statusColor = [156, 163, 175]; // gray
              break;
            case 'NEEDS_ATTENTION':
              statusText = '[!]';
              statusColor = [245, 158, 11]; // amber
              break;
            default:
              statusText = '[ ]';
              statusColor = [156, 163, 175]; // gray
          }

          pdf.setTextColor(...statusColor);
          pdf.text(statusText, 20, yPos);
          pdf.setTextColor(0, 0, 0);

          // Item title with time slot
          const timeSlotText = item.timeSlot ? ` (${item.timeSlot})` : '';
          const titleText = `${item.itemNumber}. ${item.title}${timeSlotText}`;

          // Wrap long text
          const splitTitle = pdf.splitTextToSize(titleText, pageWidth - 60);
          pdf.text(splitTitle, 35, yPos);
          yPos += splitTitle.length * 4 + 2;

          // Notes if any
          if (item.notes) {
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            const notesText = `Catatan: ${item.notes}`;
            const splitNotes = pdf.splitTextToSize(notesText, pageWidth - 70);
            pdf.text(splitNotes, 40, yPos);
            yPos += splitNotes.length * 3 + 2;
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(9);
          }

          yPos += 2;
        }

        yPos += 5;
      }

      // Footer
      if (yPos > 260) {
        pdf.addPage();
        yPos = 20;
      }

      yPos += 10;
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Dicetak pada: ${format(new Date(), 'dd/MM/yyyy HH:mm')} WITA`, 20, yPos);
      pdf.text(`Status: ${checklist.status === 'COMPLETED' ? 'Selesai' : checklist.status === 'IN_PROGRESS' ? 'Sedang Dikerjakan' : 'Belum Dimulai'}`, pageWidth - 60, yPos);

      // Save PDF
      const filename = `Checklist_${selectedUnit}_${selectedShift}_${selectedDate}.pdf`;
      pdf.save(filename);

      toast.success('PDF berhasil diunduh');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Gagal mengunduh PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchShiftInfo();
      fetchPendingHandovers();
    }
  }, [session, selectedDate]);

  const fetchShiftInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v2/checklist?date=${selectedDate}&getShiftInfo=true`);
      if (response.ok) {
        const data = await response.json();
        setShiftInfo(data.shiftInfo);
        if (data.shiftInfo?.currentShift && !selectedShift) {
          setSelectedShift(data.shiftInfo.currentShift);
        }
      }
    } catch (error) {
      console.error('Error fetching shift info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingHandovers = async () => {
    try {
      const response = await fetch(`/api/v2/checklist/handover?date=${selectedDate}&pending=true`);
      if (response.ok) {
        const data = await response.json();
        setPendingHandovers(data.handovers?.filter((h: any) => !h.acknowledgedAt) || []);
      }
    } catch (error) {
      console.error('Error fetching pending handovers:', error);
    }
  };

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-8 px-4 md:px-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Akses Ditolak</h1>
          <p className="text-muted-foreground">Silakan login untuk mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  const UnitIcon = UNIT_CONFIG[selectedUnit].icon;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4 md:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Checklist Harian</h1>
              <p className="text-sm text-muted-foreground">
                Kelola dan pantau checklist operasional harian
              </p>
            </div>
          </div>
        </div>

        {/* Pending Handovers Alert */}
        {pendingHandovers.length > 0 && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ArrowRight className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">
                      {pendingHandovers.length} Handover Menunggu Konfirmasi
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Dari: {pendingHandovers.map((h) => h.outgoingPic.name).join(', ')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedHandoverId(pendingHandovers[0].id)}
                  className="border-amber-500 text-amber-700 hover:bg-amber-100"
                >
                  Lihat Handover
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDateChange(-1)}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-0 focus:outline-none focus:ring-0 font-medium"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDateChange(1)}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {shiftInfo?.serverTime && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {String(shiftInfo.serverTime.witaHour).padStart(2, '0')}:
                  {String(shiftInfo.serverTime.witaMinute).padStart(2, '0')} WITA
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-xs"
              >
                Hari Ini
              </Button>
            </div>
          </div>
        </div>

        {/* Unit Selection Tabs */}
        <Tabs
          value={selectedUnit}
          onValueChange={(v) => setSelectedUnit(v as ChecklistUnit)}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            {Object.entries(UNIT_CONFIG).map(([unit, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger key={unit} value={unit} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {config.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Shift Selection */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3">Pilih Shift</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(SHIFT_CONFIG).map(([shift, config]) => {
              const Icon = config.icon;
              const isSelected = selectedShift === shift;
              const isCurrent = shiftInfo?.currentShift === shift;

              return (
                <Button
                  key={shift}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`justify-start h-auto py-3 ${isSelected ? '' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelectedShift(shift as ChecklistShiftType)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs opacity-70">{config.time}</p>
                    </div>
                    {isCurrent && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Sekarang
                      </Badge>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Checklist Content */}
        {selectedShift ? (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${UNIT_CONFIG[selectedUnit].bgColor}`}>
                    <UnitIcon className={`h-5 w-5 ${UNIT_CONFIG[selectedUnit].color}`} />
                  </div>
                  <div>
                    <CardTitle>{UNIT_CONFIG[selectedUnit].label}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {SHIFT_CONFIG[selectedShift].label} • {SHIFT_CONFIG[selectedShift].time}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={exportingPdf}
                  >
                    {exportingPdf ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowHandoverForm(true)}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Buat Handover
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChecklistPanelV2 unit={selectedUnit} shiftType={selectedShift} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Pilih Shift</p>
              <p className="text-muted-foreground">
                Pilih shift di atas untuk melihat checklist yang perlu dikerjakan
              </p>
            </CardContent>
          </Card>
        )}

        {/* Handover Form Dialog */}
        {showHandoverForm && selectedShift && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <HandoverForm
                checklistId=""
                onSuccess={() => {
                  setShowHandoverForm(false);
                  fetchPendingHandovers();
                  toast.success('Handover berhasil dibuat');
                }}
                onCancel={() => setShowHandoverForm(false)}
              />
            </div>
          </div>
        )}

        {/* Handover Acknowledge Dialog */}
        {selectedHandoverId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-background rounded-lg">
                <div className="flex justify-end p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedHandoverId(null)}
                  >
                    Tutup
                  </Button>
                </div>
                <HandoverAcknowledge
                  handoverId={selectedHandoverId}
                  onAcknowledged={() => {
                    setSelectedHandoverId(null);
                    fetchPendingHandovers();
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
