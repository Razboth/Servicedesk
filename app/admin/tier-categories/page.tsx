'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  ChevronDown,
  Layers,
  FolderOpen,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface Subcategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  items: Item[];
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  subcategories: Subcategory[];
  _count: {
    services: number;
    subcategories: number;
  };
  createdAt: string;
  updatedAt: string;
}

type EntityType = 'category' | 'subcategory' | 'item';

interface FormData {
  name: string;
  description: string;
  isActive: boolean;
  order: number;
}

export default function AdminTierCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>('category');
  const [parentId, setParentId] = useState<string | null>(null);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  
  // Form data
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    isActive: true,
    order: 0
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/tier-categories?includeInactive=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        toast.error('Failed to fetch tier categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error fetching categories');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleSubcategory = (subcategoryId: string) => {
    setExpandedSubcategories(prev => {
      const next = new Set(prev);
      if (next.has(subcategoryId)) {
        next.delete(subcategoryId);
      } else {
        next.add(subcategoryId);
      }
      return next;
    });
  };

  const openCreateDialog = (type: EntityType, parentIdValue: string | null = null) => {
    setEntityType(type);
    setParentId(parentIdValue);
    setFormData({
      name: '',
      description: '',
      isActive: true,
      order: 0
    });
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (type: EntityType, entity: any, parentIdValue: string | null = null) => {
    setEntityType(type);
    setEditingEntity(entity);
    setParentId(parentIdValue);
    setFormData({
      name: entity.name,
      description: entity.description || '',
      isActive: entity.isActive,
      order: entity.order || 0
    });
    setIsEditDialogOpen(true);
  };

  const handleCreate = async () => {
    try {
      let endpoint = '';
      let body: any = { ...formData };

      switch (entityType) {
        case 'category':
          endpoint = '/api/admin/tier-categories';
          break;
        case 'subcategory':
          endpoint = '/api/admin/tier-categories/subcategories';
          body.categoryId = parentId;
          break;
        case 'item':
          endpoint = '/api/admin/tier-categories/items';
          body.subcategoryId = parentId;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(`${entityType} created successfully`);
        setIsCreateDialogOpen(false);
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to create ${entityType}`);
      }
    } catch (error) {
      console.error(`Error creating ${entityType}:`, error);
      toast.error(`Error creating ${entityType}`);
    }
  };

  const handleUpdate = async () => {
    if (!editingEntity) return;

    try {
      let endpoint = '';
      switch (entityType) {
        case 'category':
          endpoint = `/api/admin/tier-categories/${editingEntity.id}`;
          break;
        case 'subcategory':
          endpoint = `/api/admin/tier-categories/subcategories/${editingEntity.id}`;
          break;
        case 'item':
          endpoint = `/api/admin/tier-categories/items/${editingEntity.id}`;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(`${entityType} updated successfully`);
        setIsEditDialogOpen(false);
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to update ${entityType}`);
      }
    } catch (error) {
      console.error(`Error updating ${entityType}:`, error);
      toast.error(`Error updating ${entityType}`);
    }
  };

  const handleDelete = async (type: EntityType, id: string) => {
    try {
      let endpoint = '';
      switch (type) {
        case 'category':
          endpoint = `/api/admin/tier-categories/${id}`;
          break;
        case 'subcategory':
          endpoint = `/api/admin/tier-categories/subcategories/${id}`;
          break;
        case 'item':
          endpoint = `/api/admin/tier-categories/items/${id}`;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`${type} deleted successfully`);
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to delete ${type}`);
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      toast.error(`Error deleting ${type}`);
    }
  };

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case 'category':
        return <Layers className="h-4 w-4" />;
      case 'subcategory':
        return <FolderOpen className="h-4 w-4" />;
      case 'item':
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading tier categories...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="3-Tier Categories Management"
        description="Manage the hierarchical structure: Categories → Subcategories → Items"
        icon={<Layers className="h-6 w-6" />}
        action={
          <Button onClick={() => openCreateDialog('category')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        }
      />
      
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle>Categories Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="border rounded-lg">
                {/* Category Level */}
                <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        {expandedCategories.has(category.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <Layers className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{category.name}</span>
                          <Badge variant={category.isActive ? "default" : "secondary"}>
                            {category.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            {category.subcategories.length} subcategories
                          </Badge>
                        </div>
                        {category.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCreateDialog('subcategory', category.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog('category', category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={category.subcategories.length > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{category.name}"?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete('category', category.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>

                {/* Subcategories */}
                {expandedCategories.has(category.id) && category.subcategories.length > 0 && (
                  <div className="border-t pl-8">
                    {category.subcategories.map((subcategory) => (
                      <div key={subcategory.id} className="border-b last:border-b-0">
                        <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleSubcategory(subcategory.id)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                              >
                                {expandedSubcategories.has(subcategory.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                              <FolderOpen className="h-4 w-4 text-green-600" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{subcategory.name}</span>
                                  <Badge variant={subcategory.isActive ? "default" : "secondary"} className="text-xs">
                                    {subcategory.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {subcategory.items.length} items
                                  </Badge>
                                </div>
                                {subcategory.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {subcategory.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCreateDialog('item', subcategory.id)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog('subcategory', subcategory, category.id)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={subcategory.items.length > 0}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{subcategory.name}"?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete('subcategory', subcategory.id)}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>

                        {/* Items */}
                        {expandedSubcategories.has(subcategory.id) && subcategory.items.length > 0 && (
                          <div className="pl-8 bg-gray-50 dark:bg-gray-900">
                            {subcategory.items.map((item) => (
                              <div
                                key={item.id}
                                className="p-2 border-t first:border-t-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-3 w-3 text-orange-600" />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs">{item.name}</span>
                                        <Badge 
                                          variant={item.isActive ? "default" : "secondary"} 
                                          className="text-xs h-4"
                                        >
                                          {item.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                      </div>
                                      {item.description && (
                                        <p className="text-xs text-muted-foreground">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditDialog('item', item, subcategory.id)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete "{item.name}"?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDelete('item', item.id)}
                                            className="bg-destructive text-destructive-foreground"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No categories found. Click "Add Category" to create your first category.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getEntityIcon(entityType)}
              Create New {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Add a new {entityType} to the hierarchy
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={`${entityType} name`}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={`${entityType} description (optional)`}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                placeholder="Display order"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name}>
              Create {entityType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getEntityIcon(entityType)}
              Edit {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Update the {entityType} information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={`${entityType} name`}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={`${entityType} description (optional)`}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-order">Order</Label>
              <Input
                id="edit-order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                placeholder="Display order"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name}>
              Update {entityType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}