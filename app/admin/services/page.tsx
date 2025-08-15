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

interface SupportGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
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
  supportGroupId?: string;
  supportGroup?: SupportGroup;
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
    fieldTemplates?: number;
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
  supportGroupId: string;
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
  options: string[];
  validation: any;
  order: number;
  isActive: boolean;
}

const fieldTypes = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'URL', label: 'URL' },
  { value: 'TEXTAREA', label: 'Text Area' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'RADIO', label: 'Radio Buttons' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'DATE', label: 'Date' },
  { value: 'FILE', label: 'File Upload' }
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

export default function ServicesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [isManageFieldsOpen, setIsManageFieldsOpen] = useState(false);
  const [isFieldTemplatesOpen, setIsFieldTemplatesOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editService, setEditService] = useState<Partial<Service>>({});
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSupportGroup, setSelectedSupportGroup] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  const [newService, setNewService] = useState<NewService>({
    name: '',
    description: '',
    helpText: '',
    categoryId: '',
    subcategoryId: '',
    itemId: '',
    supportGroupId: '',
    priority: 'MEDIUM',
    estimatedHours: 4,
    slaHours: 24,
    requiresApproval: true,
    isConfidential: false,
    defaultTitle: '',
    defaultItilCategory: 'INCIDENT',
    defaultIssueClassification: 'SYSTEM_ERROR'
  });

  const [defaultSupportGroupId, setDefaultSupportGroupId] = useState<string>('');

  useEffect(() => {
    fetchServices();
    fetchCategories();
    fetchSupportGroups();
  }, []);

  // Filter services based on search and filters
  useEffect(() => {
    let filtered = [...services];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.categoryId === selectedCategory);
    }

    // Support group filter
    if (selectedSupportGroup !== 'all') {
      filtered = filtered.filter(service => service.supportGroupId === selectedSupportGroup);
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(service => service.priority === selectedPriority);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(service => 
        selectedStatus === 'active' ? service.isActive : !service.isActive
      );
    }

    setFilteredServices(filtered);
  }, [services, searchQuery, selectedCategory, selectedSupportGroup, selectedPriority, selectedStatus]);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/admin/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchSupportGroups = async () => {
    try {
      const response = await fetch('/api/admin/support-groups?status=active');
      if (!response.ok) throw new Error('Failed to fetch support groups');
      const data = await response.json();
      setSupportGroups(data);
      
      // Set default support group
      const defaultGroup = data.find((g: SupportGroup) => g.code === 'IT_HELPDESK');
      if (defaultGroup) {
        setDefaultSupportGroupId(defaultGroup.id);
        setNewService(prev => ({ ...prev, supportGroupId: defaultGroup.id }));
      }
    } catch (error) {
      console.error('Error fetching support groups:', error);
      toast.error('Failed to load support groups');
    }
  };

  const handleCreateService = async () => {
    try {
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details?.[0]?.message || error.error || 'Failed to create service');
      }

      toast.success('Service created successfully');
      setIsNewServiceOpen(false);
      setNewService({
        name: '',
        description: '',
        helpText: '',
        categoryId: '',
        subcategoryId: '',
        itemId: '',
        supportGroupId: defaultSupportGroupId,
        priority: 'MEDIUM',
        estimatedHours: 4,
        slaHours: 24,
        requiresApproval: true,
        isConfidential: false,
        defaultTitle: '',
        defaultItilCategory: 'INCIDENT',
        defaultIssueClassification: 'SYSTEM_ERROR'
      });
      fetchServices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create service');
    }
  };

  const handleUpdateService = async () => {
    if (!selectedService) return;

    try {
      const response = await fetch(`/api/admin/services/${selectedService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editService)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update service');
      }

      toast.success('Service updated successfully');
      setIsEditServiceOpen(false);
      setEditService({});
      setSelectedService(null);
      fetchServices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update service');
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (!confirm(`Are you sure you want to delete "${service.name}"?`)) return;

    try {
      const response = await fetch(`/api/admin/services/${service.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete service');
      }

      toast.success('Service deleted successfully');
      fetchServices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete service');
    }
  };

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setEditService({
      name: service.name,
      description: service.description,
      helpText: service.helpText,
      categoryId: service.categoryId,
      supportGroupId: service.supportGroupId,
      priority: service.priority,
      estimatedHours: service.estimatedHours,
      slaHours: service.slaHours,
      requiresApproval: service.requiresApproval,
      isConfidential: service.isConfidential,
      isActive: service.isActive
    });
    setIsEditServiceOpen(true);
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'secondary';
      case 'MEDIUM': return 'default';
      case 'HIGH': return 'warning';
      case 'CRITICAL': return 'destructive';
      case 'EMERGENCY': return 'destructive';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <p>Loading services...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Service Management</h1>
          <p className="text-gray-600">Manage service catalog and configurations</p>
        </div>
        <Button onClick={() => setIsNewServiceOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Service
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-1">
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
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
              <Select value={selectedSupportGroup} onValueChange={setSelectedSupportGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="All Support Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Support Groups</SelectItem>
                  {supportGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorities.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredServices.length} of {services.length} services
            </p>
            {(searchQuery || selectedCategory !== 'all' || selectedSupportGroup !== 'all' || 
              selectedPriority !== 'all' || selectedStatus !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedSupportGroup('all');
                  setSelectedPriority('all');
                  setSelectedStatus('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Support Group</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{service.name}</p>
                      <p className="text-sm text-gray-500">{service.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>{service.category?.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {service.supportGroup?.name || 'Not Assigned'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityBadgeVariant(service.priority)}>
                      {service.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{service.slaHours}h</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{service.fields?.length || 0}</Badge>
                  </TableCell>
                  <TableCell>{service._count?.tickets || 0}</TableCell>
                  <TableCell>
                    <Badge variant={service.isActive ? 'success' : 'secondary'}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(service)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedService(service);
                          setIsManageFieldsOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      {(!service._count?.tickets || service._count.tickets === 0) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteService(service)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Service Dialog */}
      <Dialog open={isNewServiceOpen} onOpenChange={setIsNewServiceOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Service</DialogTitle>
            <DialogDescription>
              Add a new service to the catalog with its configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={newService.name}
                  onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Password Reset"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={newService.categoryId}
                  onValueChange={(value) => setNewService(prev => ({ ...prev, categoryId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newService.description}
                onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the service"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="helpText">Help Text (Optional)</Label>
              <Textarea
                id="helpText"
                value={newService.helpText}
                onChange={(e) => setNewService(prev => ({ ...prev, helpText: e.target.value }))}
                placeholder="Additional help or instructions for users"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supportGroupId">Support Group</Label>
                <Select
                  value={newService.supportGroupId}
                  onValueChange={(value) => setNewService(prev => ({ ...prev, supportGroupId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select support group" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  value={newService.estimatedHours}
                  onChange={(e) => setNewService(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 4 }))}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slaHours">SLA Hours</Label>
                <Input
                  id="slaHours"
                  type="number"
                  value={newService.slaHours}
                  onChange={(e) => setNewService(prev => ({ ...prev, slaHours: parseInt(e.target.value) || 24 }))}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultItilCategory">ITIL Category</Label>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsNewServiceOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateService}>
                Create Service
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update service configuration and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Service Name</Label>
                <Input
                  id="edit-name"
                  value={editService.name || ''}
                  onChange={(e) => setEditService(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-categoryId">Category</Label>
                <Select
                  value={editService.categoryId}
                  onValueChange={(value) => setEditService(prev => ({ ...prev, categoryId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
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

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editService.description || ''}
                onChange={(e) => setEditService(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-helpText">Help Text</Label>
              <Textarea
                id="edit-helpText"
                value={editService.helpText || ''}
                onChange={(e) => setEditService(prev => ({ ...prev, helpText: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-supportGroupId">Support Group</Label>
                <Select
                  value={editService.supportGroupId}
                  onValueChange={(value) => setEditService(prev => ({ ...prev, supportGroupId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select support group" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Default Priority</Label>
                <Select
                  value={editService.priority}
                  onValueChange={(value: any) => setEditService(prev => ({ ...prev, priority: value }))}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-estimatedHours">Estimated Hours</Label>
                <Input
                  id="edit-estimatedHours"
                  type="number"
                  value={editService.estimatedHours || ''}
                  onChange={(e) => setEditService(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 4 }))}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slaHours">SLA Hours</Label>
                <Input
                  id="edit-slaHours"
                  type="number"
                  value={editService.slaHours || ''}
                  onChange={(e) => setEditService(prev => ({ ...prev, slaHours: parseInt(e.target.value) || 24 }))}
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editService.isActive}
                  onCheckedChange={(checked) => setEditService(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditServiceOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateService}>
                Update Service
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Fields Dialog */}
      {selectedService && (
        <ServiceFieldTemplatesDialog
          open={isManageFieldsOpen}
          onOpenChange={setIsManageFieldsOpen}
          service={selectedService}
          onUpdate={() => fetchServices()}
        />
      )}
    </div>
  );
}