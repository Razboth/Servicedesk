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
import { Plus, Pencil, Trash2, FileText, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface OfficeProduct {
  id: string;
  name: string;
  version: string | null;
  type: string;
  edition: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function OfficeTypesTab() {
  const [officeTypes, setOfficeTypes] = useState<OfficeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingOffice, setEditingOffice] = useState<OfficeProduct | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    type: 'MICROSOFT_365',
    edition: '',
    description: '',
    sortOrder: 0
  });

  const officeTypeOptions = [
    { value: 'MICROSOFT_365', label: 'Microsoft 365' },
    { value: 'OFFICE_LTSC', label: 'Office LTSC' },
    { value: 'LIBRE_OFFICE', label: 'LibreOffice' },
    { value: 'OPEN_OFFICE', label: 'OpenOffice' },
    { value: 'WPS_OFFICE', label: 'WPS Office' },
    { value: 'GOOGLE_WORKSPACE', label: 'Google Workspace' },
    { value: 'OTHER', label: 'Other' }
  ];

  useEffect(() => {
    fetchOfficeTypes();
  }, [search, filterType]);

  const fetchOfficeTypes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterType !== 'all') params.append('type', filterType);
      
      const response = await fetch(`/api/admin/pc-assets/office-types?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOfficeTypes(data);
      }
    } catch (error) {
      console.error('Error fetching Office types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingOffice 
        ? `/api/admin/pc-assets/office-types/${editingOffice.id}`
        : '/api/admin/pc-assets/office-types';
      
      const response = await fetch(url, {
        method: editingOffice ? 'PUT' : 'POST',
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
        fetchOfficeTypes();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save Office type');
      }
    } catch (error) {
      console.error('Error saving Office type:', error);
      alert('Failed to save Office type');
    }
  };

  const handleEdit = (office: OfficeProduct) => {
    setEditingOffice(office);
    setFormData({
      name: office.name,
      version: office.version || '',
      type: office.type,
      edition: office.edition || '',
      description: office.description || '',
      sortOrder: office.sortOrder
    });
    setShowDialog(true);
  };

  const handleDelete = async (office: OfficeProduct) => {
    if (office.usageCount > 0) {
      alert(`Cannot delete Office type that is in use by ${office.usageCount} PC asset(s)`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${office.name}"?`)) return;

    try {
      const response = await fetch(`/api/admin/pc-assets/office-types/${office.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchOfficeTypes();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete Office type');
      }
    } catch (error) {
      console.error('Error deleting Office type:', error);
      alert('Failed to delete Office type');
    }
  };

  const updateSortOrder = async (office: OfficeProduct, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? office.sortOrder - 1 : office.sortOrder + 1;
    
    try {
      const response = await fetch(`/api/admin/pc-assets/office-types/${office.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...office,
          sortOrder: Math.max(0, newOrder)
        })
      });

      if (response.ok) {
        fetchOfficeTypes();
      }
    } catch (error) {
      console.error('Error updating sort order:', error);
    }
  };

  const resetForm = () => {
    setEditingOffice(null);
    setFormData({
      name: '',
      version: '',
      type: 'MICROSOFT_365',
      edition: '',
      description: '',
      sortOrder: 0
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'MICROSOFT_365': return 'bg-blue-100 text-blue-800';
      case 'OFFICE_LTSC': return 'bg-indigo-100 text-indigo-800';
      case 'LIBRE_OFFICE': return 'bg-green-100 text-green-800';
      case 'OPEN_OFFICE': return 'bg-orange-100 text-orange-800';
      case 'WPS_OFFICE': return 'bg-purple-100 text-purple-800';
      case 'GOOGLE_WORKSPACE': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate statistics
  const stats = {
    total: officeTypes.length,
    inUse: officeTypes.filter(office => office.usageCount > 0).length,
    totalUsage: officeTypes.reduce((sum, office) => sum + office.usageCount, 0),
    byType: officeTypeOptions.map(type => ({
      ...type,
      count: officeTypes.filter(office => office.type === type.value).length,
      usage: officeTypes.filter(office => office.type === type.value).reduce((sum, office) => sum + office.usageCount, 0)
    }))
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Office Types</CardTitle>
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
            <p className="text-xs text-muted-foreground">Using Office products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Microsoft 365</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.byType.find(t => t.value === 'MICROSOFT_365')?.usage || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.byType.find(t => t.value === 'MICROSOFT_365')?.count || 0} types
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Office LTSC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.byType.find(t => t.value === 'OFFICE_LTSC')?.usage || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.byType.find(t => t.value === 'OFFICE_LTSC')?.count || 0} types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Office Products</CardTitle>
              <CardDescription>Manage Office types for PC assets</CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Office Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Office types..."
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
                {officeTypeOptions.map(type => (
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
                  <TableHead>Edition</TableHead>
                  <TableHead className="text-center">In Use</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : officeTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No Office types found
                    </TableCell>
                  </TableRow>
                ) : (
                  officeTypes.map((office, index) => (
                    <TableRow key={office.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateSortOrder(office, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateSortOrder(office, 'down')}
                            disabled={index === officeTypes.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {office.name}
                        </div>
                      </TableCell>
                      <TableCell>{office.version || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(office.type)}>
                          {officeTypeOptions.find(t => t.value === office.type)?.label || office.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{office.edition || '-'}</TableCell>
                      <TableCell className="text-center">
                        {office.usageCount > 0 ? (
                          <Badge variant="secondary">{office.usageCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(office)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(office)}
                            disabled={office.usageCount > 0}
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
              {editingOffice ? 'Edit Office Type' : 'Add New Office Type'}
            </DialogTitle>
            <DialogDescription>
              Define an Office product type that can be assigned to PC assets.
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
                    placeholder="e.g., Office 365"
                  />
                </div>
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="e.g., 2021, 2024, 365"
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
                      {officeTypeOptions.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edition">Edition</Label>
                  <Input
                    id="edition"
                    value={formData.edition}
                    onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                    placeholder="e.g., Professional Plus, Standard"
                  />
                </div>
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
                {editingOffice ? 'Update' : 'Create'} Office Type
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}