'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Users, 
  Search, 
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Shield,
  Settings
} from 'lucide-react';

interface SupportGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    users: number;
    services: number;
    tickets: number;
  };
}

export default function SupportGroupsPage() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SupportGroup | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchGroups();
  }, [search]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        includeStats: 'true',
        ...(search && { search })
      });

      const response = await fetch(`/api/admin/support-groups?${params}`);
      if (!response.ok) throw new Error('Failed to fetch support groups');

      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching support groups:', error);
      toast.error('Failed to load support groups');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = selectedGroup 
        ? `/api/admin/support-groups/${selectedGroup.id}`
        : '/api/admin/support-groups';
      
      const method = selectedGroup ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save support group');
      }

      toast.success(selectedGroup ? 'Support group updated' : 'Support group created');
      setDialogOpen(false);
      resetForm();
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/admin/support-groups/${selectedGroup.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete support group');
      }

      toast.success('Support group deleted');
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: ''
    });
    setSelectedGroup(null);
  };

  const openEditDialog = (group: SupportGroup) => {
    setSelectedGroup(group);
    setFormData({
      code: group.code,
      name: group.name,
      description: group.description || ''
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (group: SupportGroup) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  const getGroupIcon = (code: string) => {
    switch (code) {
      case 'SECURITY':
        return <Shield className="h-4 w-4" />;
      case 'NETWORK':
        return <Settings className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          Support Groups Management
        </h1>
        <Button onClick={() => {
          resetForm();
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Support Group
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Support Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, code, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Services</TableHead>
                <TableHead className="text-center">Tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading support groups...
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No support groups found
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getGroupIcon(group.code)}
                        <span className="font-medium">{group.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {group.code}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {group.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {group._count?.users || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {group._count?.services || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {group._count?.tickets || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.isActive ? 'success' : 'secondary'}>
                        {group.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(group)}
                          disabled={
                            (group._count?.users || 0) > 0 ||
                            (group._count?.services || 0) > 0 ||
                            (group._count?.tickets || 0) > 0
                          }
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedGroup ? 'Edit Support Group' : 'Create Support Group'}
            </DialogTitle>
            <DialogDescription>
              {selectedGroup 
                ? 'Update the support group details below.'
                : 'Enter the details for the new support group.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., IT_SUPPORT"
                  disabled={!!selectedGroup}
                  required
                />
                <p className="text-sm text-gray-500">
                  Unique identifier for the support group (cannot be changed)
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., IT Support Team"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the support group's responsibilities..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedGroup ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Support Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this support group?
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <div className="py-4">
              <div className="flex items-center gap-2 text-amber-600 mb-4">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">
                  This action will mark the support group as inactive.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{selectedGroup.name}</p>
                <p className="text-sm text-gray-600">Code: {selectedGroup.code}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}