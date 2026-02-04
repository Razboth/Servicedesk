'use client';

import { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Loader2,
  ClipboardList,
  ServerCog,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

type DailyChecklistType =
  | 'HARIAN'
  | 'SERVER_SIANG'
  | 'SERVER_MALAM'
  | 'AKHIR_HARI'
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
  | 'TEXT_INPUT';

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

const checklistTypeLabels: Record<DailyChecklistType, string> = {
  HARIAN: 'Harian',
  SERVER_SIANG: 'Server Siang',
  SERVER_MALAM: 'Server Malam',
  AKHIR_HARI: 'Akhir Hari',
  OPS_SIANG: 'Ops Siang',
  OPS_MALAM: 'Ops Malam',
  MONITORING_SIANG: 'Monitoring Siang',
  MONITORING_MALAM: 'Monitoring Malam',
};

const inputTypeLabels: Record<ChecklistInputType, string> = {
  CHECKBOX: 'Checkbox',
  TIMESTAMP: 'Timestamp',
  GRAFANA_STATUS: 'Grafana Status',
  ATM_ALERT: 'ATM Alert',
  PENDING_TICKETS: 'Pending Tickets',
  APP_STATUS: 'App Status',
  AVAILABILITY_STATUS: 'Availability Status',
  TEXT_INPUT: 'Text Input',
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
  const [activeTab, setActiveTab] = useState<string>('OPS_SIANG');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ChecklistTemplate> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ChecklistTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [includeInactive]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/checklist-templates?includeInactive=${includeInactive}`
      );
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setTemplates(data.templates);
      setGrouped(data.grouped);
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

  const openCreateDialog = () => {
    setEditingTemplate({ ...defaultTemplate, checklistType: activeTab as DailyChecklistType });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Kelola Template Checklist</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola item checklist untuk semua tipe checklist
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTemplates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-xs text-muted-foreground">Total Template</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter((t) => t.isActive).length}
                </p>
                <p className="text-xs text-muted-foreground">Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <ServerCog className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(grouped).length}</p>
                <p className="text-xs text-muted-foreground">Tipe Checklist</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter((t) => !t.isActive).length}
                </p>
                <p className="text-xs text-muted-foreground">Nonaktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
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

      {/* Templates Table by Type */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-4 pt-4">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                {Object.entries(checklistTypeLabels).map(([type, label]) => (
                  <TabsTrigger
                    key={type}
                    value={type}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {label}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {grouped[type]?.length || 0}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {Object.entries(checklistTypeLabels).map(([type, label]) => (
              <TabsContent key={type} value={type} className="m-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Order</TableHead>
                      <TableHead className="w-[80px]">Waktu</TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead className="w-[120px]">Input Type</TableHead>
                      <TableHead className="w-[80px]">Wajib</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                      <TableHead className="w-[80px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(grouped[type] || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Tidak ada template untuk {label}
                        </TableCell>
                      </TableRow>
                    ) : (
                      (grouped[type] || []).map((template) => (
                        <TableRow
                          key={template.id}
                          className={!template.isActive ? 'opacity-50' : ''}
                        >
                          <TableCell className="font-mono text-sm">
                            {template.order}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {template.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{template.title}</p>
                              {template.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                  {template.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {inputTypeLabels[template.inputType]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {template.isRequired ? (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                                Wajib
                              </Badge>
                            ) : (
                              <Badge variant="outline">Opsional</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={template.isActive}
                              onCheckedChange={() => handleToggleActive(template)}
                            />
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
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

          <div className="space-y-4 py-4">
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
                    {Object.entries(checklistTypeLabels).map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        {label}
                      </SelectItem>
                    ))}
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
                    {Object.entries(inputTypeLabels).map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2 flex items-end">
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
              </div>
            </div>
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
