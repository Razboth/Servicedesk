'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  ClipboardCheck,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

type ChecklistType = 'IT_INFRASTRUKTUR' | 'KEAMANAN_SIBER' | 'FRAUD_COMPLIANCE';
type ChecklistShiftType = 'SHIFT_SIANG' | 'SHIFT_MALAM';

interface Template {
  id: string;
  checklistType: ChecklistType;
  shiftType: ChecklistShiftType;
  section: string;
  sectionTitle: string;
  itemNumber: number;
  title: string;
  description?: string;
  toolSystem?: string;
  timeSlot?: string;
  isRequired: boolean;
  order: number;
  isActive: boolean;
}

const TYPE_OPTIONS: { value: ChecklistType; label: string }[] = [
  { value: 'IT_INFRASTRUKTUR', label: 'IT & Infrastruktur' },
  { value: 'KEAMANAN_SIBER', label: 'Keamanan Siber (KKS)' },
  { value: 'FRAUD_COMPLIANCE', label: 'Fraud & Compliance' },
];

const SHIFT_OPTIONS: { value: ChecklistShiftType; label: string }[] = [
  { value: 'SHIFT_SIANG', label: 'Shift Siang (08:00-20:00)' },
  { value: 'SHIFT_MALAM', label: 'Shift Malam (20:00-08:00)' },
];

const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

export default function ChecklistTemplatesV2Page() {
  const { data: session, status } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ChecklistType | ''>('');
  const [filterShift, setFilterShift] = useState<ChecklistShiftType | ''>('');
  const [filterSection, setFilterSection] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Template>>({
    checklistType: 'IT_INFRASTRUKTUR',
    shiftType: 'SHIFT_SIANG',
    section: 'A',
    sectionTitle: '',
    itemNumber: 1,
    title: '',
    description: '',
    toolSystem: '',
    timeSlot: '',
    isRequired: true,
    order: 1,
    isActive: true,
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append('checklistType', filterType);
      if (filterShift) params.append('shiftType', filterShift);
      if (filterSection) params.append('section', filterSection);
      if (showInactive) params.append('includeInactive', 'true');

      const response = await fetch(`/api/v2/checklist/templates?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        toast.error('Gagal memuat templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Error loading templates');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterShift, filterSection, showInactive]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchTemplates();
    }
  }, [session, fetchTemplates]);

  const handleOpenCreateDialog = () => {
    setFormData({
      checklistType: 'IT_INFRASTRUKTUR',
      shiftType: 'SHIFT_SIANG',
      section: 'A',
      sectionTitle: '',
      itemNumber: 1,
      title: '',
      description: '',
      toolSystem: '',
      timeSlot: '',
      isRequired: true,
      order: templates.length + 1,
      isActive: true,
    });
    setIsCreating(true);
    setEditingTemplate(null);
  };

  const handleOpenEditDialog = (template: Template) => {
    setFormData(template);
    setEditingTemplate(template);
    setIsCreating(false);
  };

  const handleCloseDialog = () => {
    setEditingTemplate(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    if (!formData.title || !formData.sectionTitle) {
      toast.error('Title dan Section Title wajib diisi');
      return;
    }

    setSaving(true);
    try {
      const url = editingTemplate
        ? `/api/v2/checklist/templates/${editingTemplate.id}`
        : '/api/v2/checklist/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      toast.success(editingTemplate ? 'Template berhasil diupdate' : 'Template berhasil dibuat');
      handleCloseDialog();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus template ini?')) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/v2/checklist/templates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete template');
      }

      toast.success('Template berhasil dihapus');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus template');
    } finally {
      setDeleting(null);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !t.title.toLowerCase().includes(query) &&
        !t.sectionTitle.toLowerCase().includes(query) &&
        !(t.toolSystem?.toLowerCase().includes(query) || false)
      ) {
        return false;
      }
    }
    return true;
  });

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

  const allowedRoles = ['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(session.user.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Akses Ditolak</h1>
          <p className="text-muted-foreground">
            Halaman ini hanya dapat diakses oleh Manager atau Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4 md:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Checklist Templates</h1>
                <p className="text-sm text-muted-foreground">
                  Kelola template checklist untuk berbagai unit dan shift
                </p>
              </div>
            </div>
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Template
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari template..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ChecklistType | '')}
                className="h-10 px-3 rounded-md border bg-background min-w-[180px]"
              >
                <option value="">Semua Tipe</option>
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value as ChecklistShiftType | '')}
                className="h-10 px-3 rounded-md border bg-background min-w-[150px]"
              >
                <option value="">Semua Shift</option>
                {SHIFT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="h-10 px-3 rounded-md border bg-background"
              >
                <option value="">Semua Section</option>
                {SECTION_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <Switch checked={showInactive} onCheckedChange={setShowInactive} />
                <span className="text-sm text-muted-foreground">Tampilkan Inactive</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Templates ({filteredTemplates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Tipe / Shift</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Tool/System</TableHead>
                    <TableHead>Time Slot</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Tidak ada template ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-mono text-sm">
                          {template.section}.{template.itemNumber}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs">
                              {TYPE_OPTIONS.find((t) => t.value === template.checklistType)?.label}
                            </Badge>
                            <Badge variant="secondary" className="text-xs block w-fit">
                              {SHIFT_OPTIONS.find((s) => s.value === template.shiftType)?.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{template.section}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {template.sectionTitle}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{template.title}</p>
                            {template.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {template.toolSystem && (
                            <Badge variant="secondary">{template.toolSystem}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {template.timeSlot && (
                            <span className="font-mono text-sm">{template.timeSlot}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {template.isActive ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenEditDialog(template)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                              onClick={() => handleDelete(template.id)}
                              disabled={deleting === template.id}
                            >
                              {deleting === template.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreating || !!editingTemplate} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Tambah Template Baru'}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate
                  ? 'Ubah informasi template checklist'
                  : 'Buat template checklist baru'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipe Checklist</Label>
                  <select
                    value={formData.checklistType || 'IT_INFRASTRUKTUR'}
                    onChange={(e) =>
                      setFormData({ ...formData, checklistType: e.target.value as ChecklistType })
                    }
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Shift Type</Label>
                  <select
                    value={formData.shiftType || 'SHIFT_SIANG'}
                    onChange={(e) =>
                      setFormData({ ...formData, shiftType: e.target.value as ChecklistShiftType })
                    }
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    {SHIFT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Section</Label>
                  <select
                    value={formData.section || 'A'}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    {SECTION_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Item Number</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.itemNumber || 1}
                    onChange={(e) =>
                      setFormData({ ...formData, itemNumber: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div>
                  <Label>Order</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.order || 1}
                    onChange={(e) =>
                      setFormData({ ...formData, order: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Section Title *</Label>
                <Input
                  value={formData.sectionTitle || ''}
                  onChange={(e) => setFormData({ ...formData, sectionTitle: e.target.value })}
                  placeholder="e.g., MONITORING AWAL HARI (07:00-08:00)"
                />
              </div>

              <div>
                <Label>Item Title *</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Cek status server utama"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi detail item checklist..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tool/System</Label>
                  <Input
                    value={formData.toolSystem || ''}
                    onChange={(e) => setFormData({ ...formData, toolSystem: e.target.value })}
                    placeholder="e.g., Grafana, ServiceDesk"
                  />
                </div>
                <div>
                  <Label>Time Slot</Label>
                  <Input
                    value={formData.timeSlot || ''}
                    onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                    placeholder="e.g., 08:00"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isRequired ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
                  />
                  <Label>Wajib</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isActive ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : editingTemplate ? (
                  'Update Template'
                ) : (
                  'Buat Template'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
