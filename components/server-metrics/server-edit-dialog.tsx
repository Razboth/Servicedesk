'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ServerData {
  id: string;
  ipAddress: string;
  serverName: string | null;
  description: string | null;
  category: string | null;
}

interface ServerEditDialogProps {
  server: ServerData;
  categories: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const defaultCategories = ['Production', 'Development', 'Database', 'Web Server', 'Application', 'Backup', 'Other'];

export function ServerEditDialog({
  server,
  categories,
  open,
  onOpenChange,
  onSuccess,
}: ServerEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    serverName: server.serverName || '',
    description: server.description || '',
    category: server.category || '',
  });
  const [newCategory, setNewCategory] = useState('');

  const allCategories = [...new Set([...defaultCategories, ...categories])];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/server-metrics/${server.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverName: formData.serverName || null,
          description: formData.description || null,
          category: formData.category === 'new' ? newCategory : formData.category || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Gagal memperbarui server');
      }

      toast.success('Server berhasil diperbarui');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Server</DialogTitle>
          <DialogDescription>
            Update informasi untuk server {server.ipAddress}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ipAddress">IP Address</Label>
              <Input
                id="ipAddress"
                value={server.ipAddress}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="serverName">Nama Server</Label>
              <Input
                id="serverName"
                placeholder="Contoh: Web Server Production 1"
                value={formData.serverName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, serverName: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak ada kategori</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ Kategori baru...</SelectItem>
                </SelectContent>
              </Select>
              {formData.category === 'new' && (
                <Input
                  placeholder="Nama kategori baru"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi / Catatan</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi atau catatan tentang server ini..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
