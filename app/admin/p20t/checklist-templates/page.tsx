'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  ClipboardList,
  Shield,
  AlertTriangle,
} from 'lucide-react';

type P20TCategory = 'IT' | 'KKS' | 'ANTI_FRAUD';

interface Template {
  id: string;
  category: P20TCategory;
  section: string;
  orderIndex: number;
  title: string;
  description: string | null;
  inputType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES: { value: P20TCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'IT', label: 'IT Infrastructure', icon: <ClipboardList className="h-4 w-4" /> },
  { value: 'KKS', label: 'Keamanan Siber', icon: <Shield className="h-4 w-4" /> },
  { value: 'ANTI_FRAUD', label: 'Anti Fraud', icon: <AlertTriangle className="h-4 w-4" /> },
];

const INPUT_TYPES = [
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
];

export default function P20TChecklistTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeCategory, setActiveCategory] = useState<P20TCategory>('IT');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form states
  const [formSection, setFormSection] = useState('A');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formInputType, setFormInputType] = useState('CHECKBOX');

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v2/p20t/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Gagal memuat template');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = templates.filter((t) => t.category === activeCategory);

  const groupedBySection = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.section]) {
      acc[template.section] = [];
    }
    acc[template.section].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  const sections = Object.keys(groupedBySection).sort();

  const resetForm = () => {
    setFormSection('A');
    setFormTitle('');
    setFormDescription('');
    setFormInputType('CHECKBOX');
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast.error('Judul wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v2/p20t/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCategory,
          section: formSection,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          inputType: formInputType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Template berhasil dibuat');
        setIsCreateOpen(false);
        resetForm();
        fetchTemplates();
      } else {
        toast.error(data.error || 'Gagal membuat template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Gagal membuat template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingTemplate || !formTitle.trim()) {
      toast.error('Judul wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v2/p20t/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: formSection,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          inputType: formInputType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Template berhasil diperbarui');
        setIsEditOpen(false);
        setEditingTemplate(null);
        resetForm();
        fetchTemplates();
      } else {
        toast.error(data.error || 'Gagal memperbarui template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Gagal memperbarui template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;

    try {
      const res = await fetch(`/api/v2/p20t/templates/${deleteTemplate.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Template berhasil dihapus');
        setDeleteTemplate(null);
        fetchTemplates();
      } else {
        toast.error(data.error || 'Gagal menghapus template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Gagal menghapus template');
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      const res = await fetch(`/api/v2/p20t/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(template.isActive ? 'Template dinonaktifkan' : 'Template diaktifkan');
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Gagal mengubah status template');
    }
  };

  const handleMoveUp = async (template: Template, sectionTemplates: Template[]) => {
    const index = sectionTemplates.findIndex((t) => t.id === template.id);
    if (index <= 0) return;

    const items = sectionTemplates.map((t, i) => ({
      id: t.id,
      orderIndex: i === index ? index - 1 : i === index - 1 ? index : i,
    }));

    try {
      await fetch('/api/v2/p20t/templates/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const handleMoveDown = async (template: Template, sectionTemplates: Template[]) => {
    const index = sectionTemplates.findIndex((t) => t.id === template.id);
    if (index >= sectionTemplates.length - 1) return;

    const items = sectionTemplates.map((t, i) => ({
      id: t.id,
      orderIndex: i === index ? index + 1 : i === index + 1 ? index : i,
    }));

    try {
      await fetch('/api/v2/p20t/templates/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormSection(template.section);
    setFormTitle(template.title);
    setFormDescription(template.description || '');
    setFormInputType(template.inputType);
    setIsEditOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">P20T Checklist Templates</h1>
          <p className="text-muted-foreground">
            Kelola template checklist untuk setiap kategori P20T
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Template Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <div className="text-sm font-medium">
                  {CATEGORIES.find((c) => c.value === activeCategory)?.label}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Select value={formSection} onValueChange={setFormSection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((s) => (
                      <SelectItem key={s} value={s}>
                        Section {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Judul *</Label>
                <Input
                  id="title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Masukkan judul template"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Deskripsi opsional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inputType">Tipe Input</Label>
                <Select value={formInputType} onValueChange={setFormInputType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INPUT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as P20TCategory)}>
        <TabsList className="grid w-full grid-cols-3">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="flex items-center gap-2">
              {cat.icon}
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.value} value={cat.value} className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : sections.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Belum ada template untuk kategori {cat.label}
                  </p>
                  <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Template Pertama
                  </Button>
                </CardContent>
              </Card>
            ) : (
              sections.map((section) => (
                <Card key={section}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-lg">Section {section}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {groupedBySection[section]
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((template, idx, arr) => (
                          <div
                            key={template.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              template.isActive
                                ? 'bg-white dark:bg-gray-950'
                                : 'bg-gray-100 dark:bg-gray-800 opacity-60'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{template.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {template.inputType}
                                </Badge>
                                {!template.isActive && (
                                  <Badge variant="secondary" className="text-xs">
                                    Nonaktif
                                  </Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {template.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveUp(template, arr)}
                                disabled={idx === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveDown(template, arr)}
                                disabled={idx === arr.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Switch
                                checked={template.isActive}
                                onCheckedChange={() => handleToggleActive(template)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(template)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTemplate(template)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-section">Section</Label>
              <Select value={formSection} onValueChange={setFormSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((s) => (
                    <SelectItem key={s} value={s}>
                      Section {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Judul *</Label>
              <Input
                id="edit-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Deskripsi</Label>
              <Textarea
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-inputType">Tipe Input</Label>
              <Select value={formInputType} onValueChange={setFormInputType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INPUT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus template &quot;{deleteTemplate?.title}&quot;? Tindakan
              ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
