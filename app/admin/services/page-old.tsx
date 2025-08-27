'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Eye, Settings, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceFieldTemplatesDialog } from '@/components/admin/service-field-templates-dialog';

interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  level: number;
}

interface ServiceField {
  id?: string;
  name: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'EMAIL' | 'PHONE' | 'URL' | 'TEXTAREA' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'DATE' | 'FILE';
  isRequired: boolean;
  isUserVisible: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  options?: string[];
  validation?: any;
  order: number;
  isActive: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string;
  helpText?: string;
  categoryId: string;
  subcategoryId?: string;
  itemId?: string;
  tier1CategoryId?: string;
  tier2SubcategoryId?: string;
  tier3ItemId?: string;
  supportGroup: 'IT_HELPDESK' | 'NETWORK_TEAM' | 'SECURITY_TEAM' | 'VENDOR_SUPPORT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  estimatedHours?: number;
  slaHours: number;
  isActive: boolean;
  requiresApproval: boolean;
  isConfidential: boolean;
  category?: ServiceCategory;
  fields: ServiceField[];
  serviceFieldTemplates?: any[];
  _count?: {
    tickets: number;
    serviceFieldTemplates?: number;
  };
}

interface NewService {
  name: string;
  description: string;
  helpText: string;
  categoryId: string;
  subcategoryId: string;
  itemId: string;
  tier1CategoryId?: string;
  tier2SubcategoryId?: string;
  tier3ItemId?: string;
  supportGroup: 'IT_HELPDESK' | 'NETWORK_TEAM' | 'SECURITY_TEAM' | 'VENDOR_SUPPORT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  estimatedHours: number;
  slaHours: number;
  requiresApproval: boolean;
  isConfidential: boolean;
  defaultTitle: string;
  defaultItilCategory: 'INCIDENT' | 'SERVICE_REQUEST' | 'CHANGE_REQUEST' | 'EVENT_REQUEST';
  defaultIssueClassification: string;
}

interface NewField {
  name: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'EMAIL' | 'PHONE' | 'URL' | 'TEXTAREA' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'DATE' | 'FILE';
  isRequired: boolean;
  isUserVisible: boolean;
  placeholder: string;
  helpText: string;
  defaultValue: string;
  options: string;
  order: number;
}

const fieldTypes = [
  { value: 'TEXT', label: 'Text Input' },
  { value: 'NUMBER', label: 'Number Input' },
  { value: 'EMAIL', label: 'Email Input' },
  { value: 'PHONE', label: 'Phone Input' },
  { value: 'URL', label: 'URL Input' },
  { value: 'TEXTAREA', label: 'Text Area' },
  { value: 'SELECT', label: 'Dropdown Select' },
  { value: 'RADIO', label: 'Radio Buttons' },
  { value: 'CHECKBOX', label: 'Checkboxes' },
  { value: 'DATE', label: 'Date Picker' },
  { value: 'FILE', label: 'File Upload' }
];

const supportGroups = [
  { value: 'IT_HELPDESK', label: 'IT Helpdesk' },
  { value: 'NETWORK_TEAM', label: 'Network Team' },
  { value: 'SECURITY_TEAM', label: 'Security Team' },
  { value: 'VENDOR_SUPPORT', label: 'Vendor Support' }
];

const priorities = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'EMERGENCY', label: 'Emergency' }
];

const itilCategories = [
  { value: 'INCIDENT', label: 'Incident' },
  { value: 'SERVICE_REQUEST', label: 'Service Request' },
  { value: 'CHANGE_REQUEST', label: 'Change Request' },
  { value: 'EVENT_REQUEST', label: 'Event Request' }
];

const issueClassifications = [
  { value: 'HUMAN_ERROR', label: 'Human Error' },
  { value: 'SYSTEM_ERROR', label: 'System Error' },
  { value: 'HARDWARE_FAILURE', label: 'Hardware Failure' },
  { value: 'NETWORK_ISSUE', label: 'Network Issue' },
  { value: 'SECURITY_INCIDENT', label: 'Security Incident' },
  { value: 'DATA_ISSUE', label: 'Data Issue' },
  { value: 'PROCESS_GAP', label: 'Process Gap' },
  { value: 'EXTERNAL_FACTOR', label: 'External Factor' }
];

export default function AdminServicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [tierCategories, setTierCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showFieldsDialog, setShowFieldsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [newService, setNewService] = useState<NewService>({
    name: '',
    description: '',
    helpText: '',
    categoryId: '',
    subcategoryId: '',
    itemId: '',
    supportGroup: 'IT_HELPDESK',
    priority: 'MEDIUM',
    estimatedHours: 4,
    slaHours: 24,
    requiresApproval: true,
    isConfidential: false,
    defaultTitle: '',
    defaultItilCategory: 'INCIDENT',
    defaultIssueClassification: ''
  });

  const [newField, setNewField] = useState<NewField>({
    name: '',
    label: '',
    type: 'TEXT',
    isRequired: false,
    isUserVisible: true,
    placeholder: '',
    helpText: '',
    defaultValue: '',
    options: '',
    order: 0
  });

  const [editFields, setEditFields] = useState<ServiceField[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [editService, setEditService] = useState<NewService>({
    name: '',
    description: '',
    helpText: '',
    categoryId: '',
    subcategoryId: '',
    itemId: '',
    supportGroup: 'IT_HELPDESK',
    priority: 'MEDIUM',
    estimatedHours: 4,
    slaHours: 24,
    requiresApproval: true,
    isConfidential: false,
    defaultTitle: '',
    defaultItilCategory: 'INCIDENT',
    defaultIssueClassification: ''
  });

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Fetch data
  useEffect(() => {
    if (session && ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      fetchServices();
      fetchCategories();
    }
  }, [session]);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Fetch both ServiceCategory (for service catalog) and Category (for 3-tier)
      const [serviceCategoriesRes, categoriesRes] = await Promise.all([
        fetch('/api/categories'), // ServiceCategory for service catalog
        fetch('/api/tier-categories') // Category for 3-tier categorization
      ]);
      
      if (serviceCategoriesRes.ok) {
        const serviceCategories = await serviceCategoriesRes.json();
        setCategories(serviceCategories);
      }
      
      if (categoriesRes.ok) {
        const tierCategories = await categoriesRes.json();
        setTierCategories(tierCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    try {
      console.log('Fetching subcategories from API for categoryId:', categoryId);
      const response = await fetch(`/api/subcategories?categoryId=${categoryId}`);
      console.log('Subcategories API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Subcategories data received:', data);
        setSubcategories(data);
      } else {
        console.error('Failed to fetch subcategories:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubcategories([]);
    }
  };

  const fetchItems = async (subcategoryId: string) => {
    try {
      const response = await fetch(`/api/items?subcategoryId=${subcategoryId}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([]);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    console.log('Category selected:', categoryId);
    setNewService(prev => ({ 
      ...prev, 
      categoryId, 
      subcategoryId: '', 
      itemId: '' 
    }));
    setSubcategories([]);
    setItems([]);
    if (categoryId) {
      console.log('Fetching subcategories for category:', categoryId);
      fetchSubcategories(categoryId);
    }
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setNewService(prev => ({ 
      ...prev, 
      subcategoryId, 
      itemId: '' 
    }));
    setItems([]);
    if (subcategoryId) {
      fetchItems(subcategoryId);
    }
  };

  const handleItemChange = (itemId: string) => {
    setNewService(prev => ({ 
      ...prev, 
      itemId 
    }));
  };

  const handleCreateService = async () => {
    try {
      // Clean up empty strings for optional fields
      const cleanedService = { ...newService };
      if (cleanedService.tier1CategoryId === '') cleanedService.tier1CategoryId = undefined;
      if (cleanedService.tier2SubcategoryId === '') cleanedService.tier2SubcategoryId = undefined as any;
      if (cleanedService.tier3ItemId === '') cleanedService.tier3ItemId = undefined as any;
      if (cleanedService.subcategoryId === '') cleanedService.subcategoryId = undefined as any;
      if (cleanedService.itemId === '') cleanedService.itemId = undefined as any;
      
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedService)
      });

      if (response.ok) {
        toast.success('Service created successfully');
        setShowNewForm(false);
        setNewService({
          name: '',
          description: '',
          helpText: '',
          categoryId: '',
          subcategoryId: '',
          itemId: '',
          supportGroup: 'IT_HELPDESK',
          priority: 'MEDIUM',
          estimatedHours: 4,
          slaHours: 24,
          requiresApproval: true,
          isConfidential: false,
          defaultTitle: '',
          defaultItilCategory: 'INCIDENT',
          defaultIssueClassification: ''
        } as NewService);
        fetchServices();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create service');
      }
    } catch (error) {
      console.error('Error creating service:', error);
      toast.error('Failed to create service');
    }
  };

  const handleUpdateService = async (serviceId: string, updates: Partial<Service>) => {
    try {
      // Clean up empty strings for optional fields
      const cleanedUpdates = { ...updates };
      if (cleanedUpdates.tier1CategoryId === '') cleanedUpdates.tier1CategoryId = undefined;
      if (cleanedUpdates.tier2SubcategoryId === '') cleanedUpdates.tier2SubcategoryId = undefined;
      if (cleanedUpdates.tier3ItemId === '') cleanedUpdates.tier3ItemId = undefined;
      if (cleanedUpdates.subcategoryId === '') cleanedUpdates.subcategoryId = undefined;
      if (cleanedUpdates.itemId === '') cleanedUpdates.itemId = undefined;
      
      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedUpdates)
      });

      if (response.ok) {
        toast.success('Service updated successfully');
        setEditingService(null);
        fetchServices();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update service');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Failed to update service');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Service deleted successfully');
        fetchServices();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete service');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  };

  const handleToggleStatus = async (serviceId: string, isActive: boolean) => {
    await handleUpdateService(serviceId, { isActive });
  };

  const openFieldsDialog = (service: Service) => {
    setSelectedService(service);
    setEditFields([...service.fields]);
    setShowFieldsDialog(true);
  };

  const startEditService = (service: Service) => {
    setEditService({
      name: service.name,
      description: service.description,
      helpText: service.helpText || '',
      categoryId: service.categoryId,
      subcategoryId: service.subcategoryId || '',
      itemId: service.itemId || '',
      tier1CategoryId: service.tier1CategoryId || '',
      tier2SubcategoryId: service.tier2SubcategoryId || '',
      tier3ItemId: service.tier3ItemId || '',
      supportGroup: service.supportGroup,
      priority: service.priority,
      estimatedHours: service.estimatedHours || 4,
      slaHours: service.slaHours,
      requiresApproval: service.requiresApproval,
      isConfidential: service.isConfidential,
      defaultTitle: '',
      defaultItilCategory: 'INCIDENT',
      defaultIssueClassification: ''
    });
    
    // Load subcategories and items if tier1CategoryId exists
    if (service.tier1CategoryId) {
      fetchSubcategories(service.tier1CategoryId);
      if (service.tier2SubcategoryId) {
        fetchItems(service.tier2SubcategoryId);
      }
    }
    
    setEditingService(service.id);
  };

  const handleAddField = () => {
    const field: ServiceField = {
      ...newField,
      options: newField.options ? newField.options.split(',').map(o => o.trim()) : undefined,
      order: editFields.length,
      isActive: true
    };
    setEditFields([...editFields, field]);
    setNewField({
      name: '',
      label: '',
      type: 'TEXT',
      isRequired: false,
      isUserVisible: true,
      placeholder: '',
      helpText: '',
      defaultValue: '',
      options: '',
      order: 0
    });
    setShowAddField(false);
  };

  const handleRemoveField = (index: number) => {
    const updatedFields = editFields.filter((_, i) => i !== index);
    setEditFields(updatedFields);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...editFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      // Update order values
      newFields.forEach((field, i) => {
        field.order = i;
      });
      setEditFields(newFields);
    }
  };

  const handleSaveFields = async () => {
    if (!selectedService) return;

    try {
      const response = await fetch(`/api/admin/services/${selectedService.id}/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: editFields })
      });

      if (response.ok) {
        toast.success('Service fields updated successfully');
        setShowFieldsDialog(false);
        fetchServices();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update service fields');
      }
    } catch (error) {
      console.error('Error updating service fields:', error);
      toast.error('Failed to update service fields');
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = !searchTerm || 
                         (service.name && service.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || service.categoryId === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && service.isActive) ||
                         (statusFilter === 'inactive' && !service.isActive);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Service Templates</h1>
          <p className="text-gray-600 mt-2">
            Manage service catalog templates and dynamic fields
          </p>
        </div>
        <Button onClick={() => setShowNewForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Service Template
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={fetchServices} className="w-full">
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Templates ({filteredServices.length})</CardTitle>
          <CardDescription>
            Manage your service catalog templates and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Support Group</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>SLA Hours</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    {searchTerm ? `No services found matching "${searchTerm}"` : 'No services available'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service) => (
                  <TableRow key={service.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {service.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {service.category?.name || 'No Category'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {supportGroups.find(g => g.value === service.supportGroup)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={service.priority === 'CRITICAL' || service.priority === 'EMERGENCY' ? 'destructive' : 'default'}
                    >
                      {service.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{service.slaHours}h</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openFieldsDialog(service)}
                      className="flex items-center gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      {(service._count?.serviceFieldTemplates || 0) + service.fields.length} fields
                    </Button>
                  </TableCell>
                  <TableCell>{service._count?.tickets || 0}</TableCell>
                  <TableCell>
                    <Switch
                      checked={service.isActive}
                      onCheckedChange={(checked) => handleToggleStatus(service.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditService(service)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteService(service.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
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

      {/* New Service Form */}
      {showNewForm && (
        <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Service Template</DialogTitle>
              <DialogDescription>
                Define a new service template with custom fields and configuration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    value={newService.name}
                    onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter service name"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Service Catalog Category</Label>
                  <Select
                    value={newService.categoryId}
                    onValueChange={(value) => setNewService(prev => ({ ...prev, categoryId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service catalog category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 3-Tier Categorization Section */}
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">3-Tier Categorization (Tech-facing)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="tier1Category">Category (Tier 1)</Label>
                      <Select
                        value={newService.categoryId}
                        onValueChange={handleCategoryChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                        {tierCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tier2Subcategory">Subcategory (Tier 2)</Label>
                      <Select
                        value={newService.subcategoryId}
                        onValueChange={handleSubcategoryChange}
                        disabled={!newService.categoryId || subcategories.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategories.map(subcategory => (
                            <SelectItem key={subcategory.id} value={subcategory.id}>
                              {subcategory.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tier3Item">Item (Tier 3)</Label>
                      <Select
                        value={newService.itemId}
                        onValueChange={handleItemChange}
                        disabled={!newService.subcategoryId || items.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newService.description}
                  onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter service description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="helpText">Help Text</Label>
                <Textarea
                  id="helpText"
                  value={newService.helpText}
                  onChange={(e) => setNewService(prev => ({ ...prev, helpText: e.target.value }))}
                  placeholder="Enter help text for users"
                  rows={2}
                />
              </div>

              {/* Default Values Section */}
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Default Ticket Values</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="defaultTitle">Default Title</Label>
                      <Input
                        id="defaultTitle"
                        value={newService.defaultTitle}
                        onChange={(e) => setNewService(prev => ({ ...prev, defaultTitle: e.target.value }))}
                        placeholder="Enter default ticket title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultItilCategory">Default ITIL Category</Label>
                      <Select
                        value={newService.defaultItilCategory}
                        onValueChange={(value: any) => setNewService(prev => ({ ...prev, defaultItilCategory: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {itilCategories.map(category => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="defaultIssueClassification">Default Issue Classification</Label>
                      <Select
                        value={newService.defaultIssueClassification}
                        onValueChange={(value: any) => setNewService(prev => ({ ...prev, defaultIssueClassification: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                        <SelectContent>
                          {issueClassifications.map(classification => (
                            <SelectItem key={classification.value} value={classification.value}>
                              {classification.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="supportGroup">Support Group</Label>
                  <Select
                    value={newService.supportGroup}
                    onValueChange={(value: any) => setNewService(prev => ({ ...prev, supportGroup: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supportGroups.map(group => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Default Priority</Label>
                  <Select
                    value={newService.priority}
                    onValueChange={(value: any) => setNewService(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="slaHours">SLA Hours</Label>
                  <Input
                    id="slaHours"
                    type="number"
                    value={newService.slaHours}
                    onChange={(e) => setNewService(prev => ({ ...prev, slaHours: parseInt(e.target.value) || 24 }))}
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    value={newService.estimatedHours}
                    onChange={(e) => setNewService(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 4 }))}
                    min="1"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requiresApproval"
                      checked={newService.requiresApproval}
                      onCheckedChange={(checked) => setNewService(prev => ({ ...prev, requiresApproval: checked }))}
                    />
                    <Label htmlFor="requiresApproval">Requires Approval</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isConfidential"
                      checked={newService.isConfidential}
                      onCheckedChange={(checked) => setNewService(prev => ({ ...prev, isConfidential: checked }))}
                    />
                    <Label htmlFor="isConfidential">Confidential</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateService}>
                  Create Service
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Service Dialog */}
      {editingService && (
        <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Service Template</DialogTitle>
              <DialogDescription>
                Update the service template configuration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Service Name</Label>
                  <Input
                    id="edit-name"
                    value={editService.name}
                    onChange={(e) => setEditService(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter service name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">Service Catalog Category</Label>
                  <Select
                    value={editService.categoryId}
                    onValueChange={(value) => setEditService(prev => ({ ...prev, categoryId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service catalog category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 3-Tier Categorization Section for Edit */}
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">3-Tier Categorization (Tech-facing)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-tier1Category">Category (Tier 1)</Label>
                      <Select
                        value={editService.tier1CategoryId || ''}
                        onValueChange={(value) => {
                          setEditService(prev => ({ 
                            ...prev, 
                            tier1CategoryId: value,
                            tier2SubcategoryId: '',
                            tier3ItemId: ''
                          }));
                          if (value) {
                            fetchSubcategories(value);
                          } else {
                            setSubcategories([]);
                            setItems([]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {tierCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-tier2Subcategory">Subcategory (Tier 2)</Label>
                      <Select
                        value={editService.tier2SubcategoryId || ''}
                        onValueChange={(value) => {
                          setEditService(prev => ({ 
                            ...prev, 
                            tier2SubcategoryId: value,
                            tier3ItemId: ''
                          }));
                          if (value) {
                            fetchItems(value);
                          } else {
                            setItems([]);
                          }
                        }}
                        disabled={!editService.tier1CategoryId || subcategories.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategories.map(subcategory => (
                            <SelectItem key={subcategory.id} value={subcategory.id}>
                              {subcategory.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-tier3Item">Item (Tier 3)</Label>
                      <Select
                        value={editService.tier3ItemId || ''}
                        onValueChange={(value) => setEditService(prev => ({ ...prev, tier3ItemId: value }))}
                        disabled={!editService.tier2SubcategoryId || items.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editService.description}
                  onChange={(e) => setEditService(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter service description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-helpText">Help Text</Label>
                <Textarea
                  id="edit-helpText"
                  value={editService.helpText}
                  onChange={(e) => setEditService(prev => ({ ...prev, helpText: e.target.value }))}
                  placeholder="Enter help text for users"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-supportGroup">Support Group</Label>
                  <Select
                    value={editService.supportGroup}
                    onValueChange={(value: any) => setEditService(prev => ({ ...prev, supportGroup: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select support group" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportGroups.map(group => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={editService.priority}
                    onValueChange={(value: any) => setEditService(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-estimatedHours">Estimated Hours</Label>
                  <Input
                    id="edit-estimatedHours"
                    type="number"
                    value={editService.estimatedHours}
                    onChange={(e) => setEditService(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter estimated hours"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-slaHours">SLA Hours</Label>
                  <Input
                    id="edit-slaHours"
                    type="number"
                    value={editService.slaHours}
                    onChange={(e) => setEditService(prev => ({ ...prev, slaHours: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter SLA hours"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-requiresApproval"
                    checked={editService.requiresApproval}
                    onCheckedChange={(checked) => setEditService(prev => ({ ...prev, requiresApproval: checked }))}
                  />
                  <Label htmlFor="edit-requiresApproval">Requires Approval</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isConfidential"
                    checked={editService.isConfidential}
                    onCheckedChange={(checked) => setEditService(prev => ({ ...prev, isConfidential: checked }))}
                  />
                  <Label htmlFor="edit-isConfidential">Confidential</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingService(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateService(editingService, editService)}>
                  Update Service
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Fields Management Dialog */}
      {showFieldsDialog && selectedService && (
        <ServiceFieldTemplatesDialog
          service={selectedService}
          open={showFieldsDialog}
          onOpenChange={setShowFieldsDialog}
          onUpdate={fetchServices}
        />
      )}
    </div>
  );
}