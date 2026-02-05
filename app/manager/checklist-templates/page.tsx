'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Loader2,
  Sun,
  Moon,
  Monitor,
  Radio,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  Clock,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type DailyChecklistType =
  | 'OPS_SIANG'
  | 'OPS_MALAM'
  | 'MONITORING_SIANG'
  | 'MONITORING_MALAM';

type ChecklistInputType =
  | 'CHECKBOX'
  | 'TIMESTAMP'
  | 'GRAFANA_STATUS'
  | 'ATM_ALERT'
  | 'PENDING_TICKETS'
  | 'APP_STATUS'
  | 'AVAILABILITY_STATUS'
  | 'TEXT_INPUT'
  | 'SERVER_METRICS';

interface ChecklistTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  checklistType: DailyChecklistType;
  order: number;
  isRequired: boolean;
  isActive: boolean;
  unlockTime: string | null;
  inputType: ChecklistInputType;
  createdAt: string;
  updatedAt: string;
}

const checklistTypeConfig: Record<DailyChecklistType, {
  label: string;
  description: string;
  icon: typeof Sun;
  category: 'OPS' | 'MONITORING';
  period: 'SIANG' | 'MALAM';
  color: string;
  bgColor: string;
}> = {
  OPS_SIANG: {
    label: 'Ops Siang',
    description: 'Checklist operasional shift siang (08:00-20:00)',
    icon: Sun,
    category: 'OPS',
    period: 'SIANG',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  OPS_MALAM: {
    label: 'Ops Malam',
    description: 'Checklist operasional shift malam (22:00-06:00)',
    icon: Moon,
    category: 'OPS',
    period: 'MALAM',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  MONITORING_SIANG: {
    label: 'Monitoring Siang',
    description: 'Checklist monitoring server shift siang (08:00-20:00)',
    icon: Monitor,
    category: 'MONITORING',
    period: 'SIANG',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  MONITORING_MALAM: {
    label: 'Monitoring Malam',
    description: 'Checklist monitoring server shift malam (22:00-06:00)',
    icon: Radio,
    category: 'MONITORING',
    period: 'MALAM',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

const inputTypeLabels: Record<ChecklistInputType, { label: string; color: string }> = {
  CHECKBOX: { label: 'Checkbox', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  TIMESTAMP: { label: 'Timestamp', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  GRAFANA_STATUS: { label: 'Grafana Status', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  ATM_ALERT: { label: 'ATM Alert', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  PENDING_TICKETS: { label: 'Pending Tickets', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  APP_STATUS: { label: 'App Status', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  AVAILABILITY_STATUS: { label: 'Availability Status', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  TEXT_INPUT: { label: 'Text Input', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
  SERVER_METRICS: { label: 'Server Metrics', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
};

const defaultTemplate: Partial<ChecklistTemplate> = {
  title: '',
  description: '',
  category: '08:00',
  checklistType: 'OPS_SIANG',
  order: 0,
  isRequired: true,
  isActive: true,
  unlockTime: '08:00',
  inputType: 'CHECKBOX',
};

export default function ChecklistTemplatesPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [grouped, setGrouped] = useState<Record<string, ChecklistTemplate[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<DailyChecklistType>('OPS_SIANG');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [expandedTimeSlots, setExpandedTimeSlots] = useState<Set<string>>(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ChecklistTemplate> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ChecklistTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [includeInactive]);

  // Group templates by time slot within each checklist type
  const groupedByTimeSlot = useMemo(() => {
    const result: Record<DailyChecklistType, Record<string, ChecklistTemplate[]>> = {
      OPS_SIANG: {},
      OPS_MALAM: {},
      MONITORING_SIANG: {},
      MONITORING_MALAM: {},
    };

    templates.forEach((template) => {
      if (!result[template.checklistType]) {
        result[template.checklistType] = {};
      }
      if (!result[template.checklistType][template.category]) {
        result[template.checklistType][template.category] = [];
      }
      result[template.checklistType][template.category].push(template);
    });

    // Sort templates within each time slot by order
    Object.values(result).forEach((typeGroup) => {
      Object.values(typeGroup).forEach((timeSlotTemplates) => {
        timeSlotTemplates.sort((a, b) => a.order - b.order);
      });
    });

    return result;
  }, [templates]);

  // Get sorted time slots for a checklist type
  const getSortedTimeSlots = (type: DailyChecklistType) => {
    const timeSlots = Object.keys(groupedByTimeSlot[type] || {});
    return timeSlots.sort((a, b) => {
      // Handle time comparisons properly (00:00 should come after 22:00 for night shifts)
      const config = checklistTypeConfig[type];
      if (config.period === 'MALAM') {
        // For night shifts: 22:00 < 00:00 < 02:00 < 04:00 < 06:00
        const aHour = parseInt(a.split(':')[0]);
        const bHour = parseInt(b.split(':')[0]);
        const aAdjusted = aHour < 12 ? aHour + 24 : aHour;
        const bAdjusted = bHour < 12 ? bHour + 24 : bHour;
        return aAdjusted - bAdjusted;
      }
      return a.localeCompare(b);
    });
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/checklist-templates?includeInactive=${includeInactive}`
      );
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      // Filter to only show the 4 valid types
      const validTypes: DailyChecklistType[] = ['OPS_SIANG', 'OPS_MALAM', 'MONITORING_SIANG', 'MONITORING_MALAM'];
      const filteredTemplates = data.templates.filter((t: ChecklistTemplate) =>
        validTypes.includes(t.checklistType)
      );
      setTemplates(filteredTemplates);
      setGrouped(data.grouped);

      // Expand all time slots by default
      const allTimeSlots = new Set<string>();
      filteredTemplates.forEach((t: ChecklistTemplate) => {
        allTimeSlots.add(`${t.checklistType}-${t.category}`);
      });
      setExpandedTimeSlots(allTimeSlots);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Gagal memuat template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingTemplate?.title || !editingTemplate?.category || !editingTemplate?.checklistType) {
      toast.error('Judul, kategori, dan tipe checklist wajib diisi');
      return;
    }

    try {
      setSaving(true);
      const isNew = !editingTemplate.id;
      const response = await fetch('/api/admin/checklist-templates', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      toast.success(isNew ? 'Template berhasil dibuat' : 'Template berhasil diperbarui');
      setDialogOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/checklist-templates?id=${templateToDelete.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Template berhasil dihapus');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Gagal menghapus template');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (template: ChecklistTemplate) => {
    try {
      const response = await fetch('/api/admin/checklist-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template.id,
          isActive: !template.isActive,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      toast.success(template.isActive ? 'Template dinonaktifkan' : 'Template diaktifkan');
      fetchTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Gagal mengubah status template');
    }
  };

  const openCreateDialog = (timeSlot?: string) => {
    setEditingTemplate({
      ...defaultTemplate,
      checklistType: activeTab,
      category: timeSlot || '08:00',
      unlockTime: timeSlot || '08:00',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (template: ChecklistTemplate) => {
    setEditingTemplate({ ...template });
    setDialogOpen(true);
  };

  const openDeleteDialog = (template: ChecklistTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const toggleTimeSlot = (key: string) => {
    setExpandedTimeSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getTemplateCountForType = (type: DailyChecklistType) => {
    return templates.filter((t) => t.checklistType === type).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeConfig = checklistTypeConfig[activeTab];
  const ActiveIcon = activeConfig.icon;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Kelola Template Checklist</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola item checklist untuk 4 tipe: Ops Siang/Malam dan Monitoring Siang/Malam
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTemplates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => openCreateDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Item
          </Button>
        </div>
      </div>

      {/* Stats Cards - 2x2 grid showing counts per type */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(checklistTypeConfig) as [DailyChecklistType, typeof checklistTypeConfig[DailyChecklistType]][]).map(([type, config]) => {
          const Icon = config.icon;
          const count = getTemplateCountForType(type);
          const activeCount = templates.filter((t) => t.checklistType === type && t.isActive).length;

          return (
            <Card
              key={type}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeTab === type && "ring-2 ring-primary"
              )}
              onClick={() => setActiveTab(type)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", config.bgColor)}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground truncate">{config.label}</p>
                  </div>
                  {activeCount < count && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {count - activeCount} off
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Include Inactive Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={includeInactive}
          onCheckedChange={setIncludeInactive}
          id="include-inactive"
        />
        <Label htmlFor="include-inactive" className="text-sm">
          Tampilkan template nonaktif
        </Label>
      </div>

      {/* Main Content - Tabs with Time Slot Grouping */}
      <Card>
        <CardHeader className="pb-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DailyChecklistType)}>
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
              {(Object.entries(checklistTypeConfig) as [DailyChecklistType, typeof checklistTypeConfig[DailyChecklistType]][]).map(([type, config]) => {
                const Icon = config.icon;
                const count = getTemplateCountForType(type);
                return (
                  <TabsTrigger
                    key={type}
                    value={type}
                    className={cn(
                      "data-[state=active]:shadow-sm gap-2",
                      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Active Tab Description */}
          <div className={cn("p-3 rounded-lg mb-4 flex items-center gap-3", activeConfig.bgColor)}>
            <ActiveIcon className={cn("h-5 w-5", activeConfig.color)} />
            <div>
              <p className="font-medium">{activeConfig.label}</p>
              <p className="text-xs text-muted-foreground">{activeConfig.description}</p>
            </div>
          </div>

          {/* Time Slot Groups */}
          <div className="space-y-3">
            {getSortedTimeSlots(activeTab).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada template untuk {activeConfig.label}</p>
                <Button onClick={() => openCreateDialog()} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Item Pertama
                </Button>
              </div>
            ) : (
              getSortedTimeSlots(activeTab).map((timeSlot) => {
                const items = groupedByTimeSlot[activeTab][timeSlot];
                const key = `${activeTab}-${timeSlot}`;
                const isExpanded = expandedTimeSlots.has(key);

                return (
                  <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleTimeSlot(key)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-sm">
                            <Clock className="h-3 w-3 mr-1" />
                            {timeSlot}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {items.length} item{items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCreateDialog(timeSlot);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="mt-2 space-y-2 pl-4 border-l-2 border-muted ml-4">
                        {items.map((template) => (
                          <div
                            key={template.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg bg-card border",
                              !template.isActive && "opacity-50"
                            )}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{template.title}</span>
                                <Badge className={cn("text-xs", inputTypeLabels[template.inputType].color)}>
                                  {inputTypeLabels[template.inputType].label}
                                </Badge>
                                {template.isRequired && (
                                  <Badge variant="destructive" className="text-xs">
                                    Wajib
                                  </Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {template.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Switch
                                checked={template.isActive}
                                onCheckedChange={() => handleToggleActive(template)}
                                aria-label="Toggle active"
                              />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(template)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(template)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Hapus
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? 'Edit Template' : 'Tambah Template Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate?.id
                ? 'Ubah detail template checklist'
                : 'Buat item checklist baru'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <fieldset className="space-y-4 p-4 border rounded-lg">
              <legend className="text-sm font-medium px-2">Informasi Dasar</legend>

              <div className="space-y-2">
                <Label htmlFor="title">Judul *</Label>
                <Input
                  id="title"
                  value={editingTemplate?.title || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, title: e.target.value })
                  }
                  placeholder="Status Grafik Grafana"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={editingTemplate?.description || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  placeholder="Deskripsi item checklist..."
                  rows={2}
                />
              </div>
            </fieldset>

            {/* Type & Input */}
            <fieldset className="space-y-4 p-4 border rounded-lg">
              <legend className="text-sm font-medium px-2">Tipe & Input</legend>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checklistType">Tipe Checklist *</Label>
                  <Select
                    value={editingTemplate?.checklistType || 'OPS_SIANG'}
                    onValueChange={(value) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        checklistType: value as DailyChecklistType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(checklistTypeConfig) as [DailyChecklistType, typeof checklistTypeConfig[DailyChecklistType]][]).map(([type, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <Icon className={cn("h-4 w-4", config.color)} />
                              {config.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inputType">Tipe Input</Label>
                  <Select
                    value={editingTemplate?.inputType || 'CHECKBOX'}
                    onValueChange={(value) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        inputType: value as ChecklistInputType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(inputTypeLabels) as [ChecklistInputType, typeof inputTypeLabels[ChecklistInputType]][]).map(([type, config]) => (
                        <SelectItem key={type} value={type}>
                          <Badge className={cn("text-xs", config.color)}>
                            {config.label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>

            {/* Time & Order */}
            <fieldset className="space-y-4 p-4 border rounded-lg">
              <legend className="text-sm font-medium px-2">Waktu & Urutan</legend>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori/Waktu *</Label>
                  <Input
                    id="category"
                    value={editingTemplate?.category || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, category: e.target.value })
                    }
                    placeholder="08:00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unlockTime">Unlock Time</Label>
                  <Input
                    id="unlockTime"
                    value={editingTemplate?.unlockTime || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, unlockTime: e.target.value })
                    }
                    placeholder="08:00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order">Urutan</Label>
                  <Input
                    id="order"
                    type="number"
                    value={editingTemplate?.order || 0}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isRequired"
                    checked={editingTemplate?.isRequired !== false}
                    onCheckedChange={(checked) =>
                      setEditingTemplate({ ...editingTemplate, isRequired: checked })
                    }
                  />
                  <Label htmlFor="isRequired">Wajib</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={editingTemplate?.isActive !== false}
                    onCheckedChange={(checked) =>
                      setEditingTemplate({ ...editingTemplate, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive">Aktif</Label>
                </div>
              </div>
            </fieldset>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate?.id ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Template</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus template &quot;{templateToDelete?.title}&quot;?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
