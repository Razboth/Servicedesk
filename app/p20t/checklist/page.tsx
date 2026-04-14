'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  CalendarIcon,
  Sun,
  Moon,
  ClipboardList,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Circle,
  MinusCircle,
  XCircle,
  User,
  Lock,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type P20TShift = 'DAY' | 'NIGHT';
type P20TCategory = 'IT' | 'KKS' | 'ANTI_FRAUD';
type P20TItemStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'NA';

interface ChecklistItem {
  id: string;
  templateId: string;
  status: P20TItemStatus;
  value: string | null;
  notes: string | null;
  completedAt: string | null;
  completedBy: { id: string; name: string } | null;
  template: {
    id: string;
    category: P20TCategory;
    section: string;
    orderIndex: number;
    title: string;
    description: string | null;
    inputType: string;
  };
}

interface Assignment {
  id: string;
  date: string;
  shift: P20TShift;
  category: P20TCategory;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

const CATEGORIES: { value: P20TCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'IT', label: 'IT', icon: <ClipboardList className="h-4 w-4" />, color: 'bg-blue-500' },
  { value: 'KKS', label: 'KKS', icon: <Shield className="h-4 w-4" />, color: 'bg-green-500' },
  { value: 'ANTI_FRAUD', label: 'Anti Fraud', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-orange-500' },
];

const SHIFT_INFO = {
  DAY: { label: 'Shift Siang', time: '08:00 - 20:00', icon: Sun },
  NIGHT: { label: 'Shift Malam', time: '20:00 - 08:00', icon: Moon },
};

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', icon: Circle, color: 'text-muted-foreground' },
  COMPLETED: { label: 'Selesai', icon: CheckCircle2, color: 'text-green-500' },
  SKIPPED: { label: 'Dilewati', icon: MinusCircle, color: 'text-yellow-500' },
  NA: { label: 'N/A', icon: XCircle, color: 'text-gray-400' },
};

export default function P20TChecklistPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedShift, setSelectedShift] = useState<P20TShift>('DAY');
  const [selectedCategory, setSelectedCategory] = useState<P20TCategory>('IT');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [itemsBySection, setItemsBySection] = useState<Record<string, ChecklistItem[]>>({});
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(
        `/api/v2/p20t/checklist?date=${dateStr}&shift=${selectedShift}&category=${selectedCategory}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memuat checklist');
      }

      if (data.success) {
        if (data.data.message) {
          setMessage(data.data.message);
          setItems([]);
          setItemsBySection({});
        } else {
          setItems(data.data.checklist?.items || []);
          setItemsBySection(data.data.itemsBySection || {});
        }
        setAssignment(data.data.assignment);
        setCanEdit(data.data.canEdit);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat checklist');
      setItems([]);
      setItemsBySection({});
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedShift, selectedCategory]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const updateItem = async (
    itemId: string,
    updates: { status?: P20TItemStatus; value?: string; notes?: string }
  ) => {
    if (!canEdit) return;

    setUpdating(itemId);
    try {
      const response = await fetch('/api/v2/p20t/checklist/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, ...updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengupdate item');
      }

      // Update local state
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? data.data : item))
      );
      setItemsBySection((prev) => {
        const newSections = { ...prev };
        for (const section in newSections) {
          newSections[section] = newSections[section].map((item) =>
            item.id === itemId ? data.data : item
          );
        }
        return newSections;
      });

      toast.success('Item berhasil diupdate');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengupdate item');
    } finally {
      setUpdating(null);
    }
  };

  const handleCheckboxChange = (item: ChecklistItem, checked: boolean) => {
    updateItem(item.id, { status: checked ? 'COMPLETED' : 'PENDING' });
  };

  const handleStatusChange = (item: ChecklistItem, status: P20TItemStatus) => {
    updateItem(item.id, { status });
  };

  const handleValueChange = (item: ChecklistItem, value: string) => {
    updateItem(item.id, { value, status: value ? 'COMPLETED' : 'PENDING' });
  };

  const handleNotesChange = (item: ChecklistItem, notes: string) => {
    updateItem(item.id, { notes });
  };

  const categoryInfo = CATEGORIES.find((c) => c.value === selectedCategory)!;
  const ShiftIcon = SHIFT_INFO[selectedShift].icon;

  // Calculate progress
  const totalItems = items.length;
  const completedItems = items.filter(
    (i) => i.status === 'COMPLETED' || i.status === 'SKIPPED' || i.status === 'NA'
  ).length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">P20T Checklist</h1>
          <p className="text-muted-foreground">
            Pusat Pengendalian Operasional Terpadu
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchChecklist}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Date Picker */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tanggal:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'dd MMMM yyyy', { locale: id })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Shift Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Shift:</span>
              <Tabs
                value={selectedShift}
                onValueChange={(v) => setSelectedShift(v as P20TShift)}
              >
                <TabsList>
                  <TabsTrigger value="DAY" className="gap-1">
                    <Sun className="h-4 w-4" />
                    Siang
                  </TabsTrigger>
                  <TabsTrigger value="NIGHT" className="gap-1">
                    <Moon className="h-4 w-4" />
                    Malam
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Category Select */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Kategori:</span>
              <Select
                value={selectedCategory}
                onValueChange={(v) => setSelectedCategory(v as P20TCategory)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', cat.color)} />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment & Progress Info */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Assignment Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Petugas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : assignment ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{assignment.user.name || assignment.user.email}</p>
                  <p className="text-sm text-muted-foreground">{assignment.user.email}</p>
                </div>
                {canEdit ? (
                  <Badge className="bg-green-500">Anda Bertugas</Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Eye className="h-3 w-3" />
                    View Only
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>Belum ada penugasan</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {categoryInfo.icon}
              Progress {categoryInfo.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{completedItems} dari {totalItems} item</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full transition-all', categoryInfo.color)}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checklist Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', categoryInfo.color)} />
              <CardTitle>Checklist {categoryInfo.label}</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShiftIcon className="h-4 w-4" />
              {SHIFT_INFO[selectedShift].time}
            </div>
          </div>
          <CardDescription>
            {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : message ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{message}</p>
            </div>
          ) : Object.keys(itemsBySection).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada checklist item</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {Object.entries(itemsBySection)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([section, sectionItems]) => (
                    <div key={section} className="space-y-3">
                      <h3 className="font-semibold text-lg border-b pb-2">
                        Section {section}
                      </h3>
                      <div className="space-y-3">
                        {sectionItems.map((item) => {
                          const StatusIcon = STATUS_CONFIG[item.status].icon;
                          const isUpdating = updating === item.id;

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                'p-4 rounded-lg border transition-colors',
                                item.status === 'COMPLETED' && 'bg-green-50 border-green-200',
                                item.status === 'SKIPPED' && 'bg-yellow-50 border-yellow-200',
                                item.status === 'NA' && 'bg-gray-50 border-gray-200',
                                isUpdating && 'opacity-50'
                              )}
                            >
                              <div className="flex items-start gap-3">
                                {/* Checkbox for CHECKBOX type */}
                                {item.template.inputType === 'CHECKBOX' && (
                                  <Checkbox
                                    checked={item.status === 'COMPLETED'}
                                    onCheckedChange={(checked) =>
                                      handleCheckboxChange(item, !!checked)
                                    }
                                    disabled={!canEdit || isUpdating}
                                    className="mt-1"
                                  />
                                )}

                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className={cn(
                                        'font-medium',
                                        item.status === 'COMPLETED' && 'line-through text-muted-foreground'
                                      )}>
                                        {item.template.title}
                                      </p>
                                      {item.template.description && (
                                        <p className="text-sm text-muted-foreground">
                                          {item.template.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <StatusIcon
                                        className={cn('h-5 w-5', STATUS_CONFIG[item.status].color)}
                                      />
                                      {canEdit && item.template.inputType === 'CHECKBOX' && (
                                        <Select
                                          value={item.status}
                                          onValueChange={(v) =>
                                            handleStatusChange(item, v as P20TItemStatus)
                                          }
                                          disabled={isUpdating}
                                        >
                                          <SelectTrigger className="w-[100px] h-8 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="PENDING">Pending</SelectItem>
                                            <SelectItem value="COMPLETED">Selesai</SelectItem>
                                            <SelectItem value="SKIPPED">Dilewati</SelectItem>
                                            <SelectItem value="NA">N/A</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </div>
                                  </div>

                                  {/* Input for TEXT/NUMBER type */}
                                  {(item.template.inputType === 'TEXT' ||
                                    item.template.inputType === 'NUMBER') && (
                                    <Input
                                      type={item.template.inputType === 'NUMBER' ? 'number' : 'text'}
                                      placeholder="Masukkan nilai..."
                                      value={item.value || ''}
                                      onChange={(e) => handleValueChange(item, e.target.value)}
                                      disabled={!canEdit || isUpdating}
                                      className="max-w-md"
                                    />
                                  )}

                                  {/* Notes */}
                                  {canEdit && (
                                    <Textarea
                                      placeholder="Catatan (opsional)..."
                                      value={item.notes || ''}
                                      onChange={(e) => handleNotesChange(item, e.target.value)}
                                      disabled={isUpdating}
                                      className="max-w-md text-sm"
                                      rows={2}
                                    />
                                  )}

                                  {/* Completed info */}
                                  {item.completedAt && item.completedBy && (
                                    <p className="text-xs text-muted-foreground">
                                      Diselesaikan oleh {item.completedBy.name} pada{' '}
                                      {format(new Date(item.completedAt), 'dd/MM/yyyy HH:mm')}
                                    </p>
                                  )}

                                  {/* Show notes in view mode */}
                                  {!canEdit && item.notes && (
                                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                      Catatan: {item.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
