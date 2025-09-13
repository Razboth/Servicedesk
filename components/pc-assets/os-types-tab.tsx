'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Monitor, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface OperatingSystem {
  id: string;
  name: string;
  version: string | null;
  type: string;
  architecture: string | null;
  edition: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function OSTypesTab() {
  const [osTypes, setOSTypes] = useState<OperatingSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingOS, setEditingOS] = useState<OperatingSystem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    type: 'WINDOWS',
    architecture: 'x64',
    edition: '',
    description: '',
    sortOrder: 0
  });

  const osTypeOptions = [
    { value: 'WINDOWS', label: 'Windows' },
    { value: 'LINUX', label: 'Linux' },
    { value: 'MACOS', label: 'macOS' },
    { value: 'UNIX', label: 'Unix' },
    { value: 'CHROME_OS', label: 'Chrome OS' },
    { value: 'OTHER', label: 'Other' }
  ];

  const architectureOptions = [
    { value: 'x64', label: '64-bit (x64)' },
    { value: 'x86', label: '32-bit (x86)' },
    { value: 'ARM', label: 'ARM' },
    { value: 'ARM64', label: 'ARM64' }
  ];

  useEffect(() => {
    fetchOSTypes();
  }, [search, filterType]);

  const fetchOSTypes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterType !== 'all') params.append('type', filterType);
      
      const response = await fetch(`/api/admin/pc-assets/os-types?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOSTypes(data);
      }
    } catch (error) {
      console.error('Error fetching OS types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingOS 
        ? `/api/admin/pc-assets/os-types/${editingOS.id}`
        : '/api/admin/pc-assets/os-types';
      
      const response = await fetch(url, {
        method: editingOS ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          version: formData.version || null,
          edition: formData.edition || null,
          description: formData.description || null,
          sortOrder: parseInt(formData.sortOrder.toString())
        })
      });

      if (response.ok) {
        setShowDialog(false);
        resetForm();
        fetchOSTypes();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save OS type');
      }
    } catch (error) {
      console.error('Error saving OS type:', error);
      alert('Failed to save OS type');
    }
  };

  const handleEdit = (os: OperatingSystem) => {
    setEditingOS(os);
    setFormData({
      name: os.name,
      version: os.version || '',
      type: os.type,
      architecture: os.architecture || 'x64',
      edition: os.edition || '',
      description: os.description || '',
      sortOrder: os.sortOrder
    });
    setShowDialog(true);
  };

  const handleDelete = async (os: OperatingSystem) => {
    if (os.usageCount > 0) {
      alert(`Cannot delete OS type that is in use by ${os.usageCount} PC asset(s)`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${os.name}"?`)) return;

    try {
      const response = await fetch(`/api/admin/pc-assets/os-types/${os.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchOSTypes();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete OS type');
      }
    } catch (error) {
      console.error('Error deleting OS type:', error);
      alert('Failed to delete OS type');
    }
  };

  const updateSortOrder = async (os: OperatingSystem, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? os.sortOrder - 1 : os.sortOrder + 1;
    
    try {
      const response = await fetch(`/api/admin/pc-assets/os-types/${os.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...os,
          sortOrder: Math.max(0, newOrder)
        })
      });

      if (response.ok) {
        fetchOSTypes();
      }
    } catch (error) {
      console.error('Error updating sort order:', error);
    }
  };

  const resetForm = () => {
    setEditingOS(null);
    setFormData({
      name: '',
      version: '',
      type: 'WINDOWS',
      architecture: 'x64',
      edition: '',
      description: '',
      sortOrder: 0
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'WINDOWS': return 'bg-blue-100 text-blue-800';
      case 'LINUX': return 'bg-orange-100 text-orange-800';
      case 'MACOS': return 'bg-gray-100 text-gray-800';
      case 'UNIX': return 'bg-purple-100 text-purple-800';
      case 'CHROME_OS': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate statistics
  const stats = {
    total: osTypes.length,
    inUse: osTypes.filter(os => os.usageCount > 0).length,
    totalUsage: osTypes.reduce((sum, os) => sum + os.usageCount, 0),
    byType: osTypeOptions.map(type => ({
      ...type,
      count: osTypes.filter(os => os.type === type.value).length,
      usage: osTypes.filter(os => os.type === type.value).reduce((sum, os) => sum + os.usageCount, 0)
    }))
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total OS Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.inUse} in use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total PCs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
            <p className="text-xs text-muted-foreground">Using these OS types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Windows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.byType.find(t => t.value === 'WINDOWS')?.usage || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.byType.find(t => t.value === 'WINDOWS')?.count || 0} types
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Linux</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.byType.find(t => t.value === 'LINUX')?.usage || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.byType.find(t => t.value === 'LINUX')?.count || 0} types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Operating Systems</CardTitle>
              <CardDescription>Manage OS types for PC assets</CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add OS Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search OS types..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {osTypeOptions.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Architecture</TableHead>
                  <TableHead>Edition</TableHead>
                  <TableHead className="text-center">In Use</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : osTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No OS types found
                    </TableCell>
                  </TableRow>
                ) : (
                  osTypes.map((os, index) => (
                    <TableRow key={os.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateSortOrder(os, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateSortOrder(os, 'down')}
                            disabled={index === osTypes.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          {os.name}
                        </div>
                      </TableCell>
                      <TableCell>{os.version || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(os.type)}>
                          {os.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{os.architecture || '-'}</TableCell>
                      <TableCell>{os.edition || '-'}</TableCell>
                      <TableCell className="text-center">
                        {os.usageCount > 0 ? (
                          <Badge variant="secondary">{os.usageCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(os)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(os)}
                            disabled={os.usageCount > 0}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingOS ? 'Edit OS Type' : 'Add New OS Type'}
            </DialogTitle>
            <DialogDescription>
              Define an operating system type that can be assigned to PC assets.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Windows 10 Pro"
                  />
                </div>
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="e.g., 22H2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {osTypeOptions.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="architecture">Architecture</Label>
                  <Select
                    value={formData.architecture}
                    onValueChange={(value) => setFormData({ ...formData, architecture: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {architectureOptions.map(arch => (
                        <SelectItem key={arch.value} value={arch.value}>
                          {arch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edition">Edition</Label>
                  <Input
                    id="edition"
                    value={formData.edition}
                    onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                    placeholder="e.g., Pro, Enterprise, Home"
                  />
                </div>
                <div>
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description or notes"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingOS ? 'Update' : 'Create'} OS Type
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}