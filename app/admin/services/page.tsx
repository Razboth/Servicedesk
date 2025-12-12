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
import { PageHeader } from '@/components/ui/page-header';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  ModernDialog,
  ModernDialogContent,
  ModernDialogHeader,
  ModernDialogTitle,
  ModernDialogDescription,
  ModernDialogBody,
  ModernDialogFooter
} from '@/components/ui/modern-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Settings,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Download,
  FileSpreadsheet,
  Search,
  Filter,
  XCircle,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Layers,
  Users,
  Ticket,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { ServiceFieldTemplatesDialog } from '@/components/admin/service-field-templates-dialog';
import { exportToCSV, exportToExcel, generateFilename } from '@/lib/export-utils';

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
  defaultTitle?: string;
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
  tier1Category?: { id: string; name: string; };
  tier2Subcategory?: { id: string; name: string; };
  tier3Item?: { id: string; name: string; };
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
  defaultTitle?: string;
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
  { value: 'LOW', label: 'Low', color: 'secondary' },
  { value: 'MEDIUM', label: 'Medium', color: 'default' },
  { value: 'HIGH', label: 'High', color: 'warning' },
  { value: 'CRITICAL', label: 'Critical', color: 'destructive' },
  { value: 'EMERGENCY', label: 'Emergency', color: 'destructive' }
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

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default'
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
}) {
  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success)/0.3)]',
    warning: 'bg-[hsl(var(--warning)/0.1)] border-[hsl(var(--warning)/0.3)]',
    destructive: 'bg-destructive/10 border-destructive/30',
    info: 'bg-[hsl(var(--info)/0.1)] border-[hsl(var(--info)/0.3)]',
  };

  const iconStyles = {
    default: 'text-primary',
    success: 'text-[hsl(var(--success))]',
    warning: 'text-[hsl(var(--warning))]',
    destructive: 'text-destructive',
    info: 'text-[hsl(var(--info))]',
  };

  return (
    <Card className={`${variantStyles[variant]} transition-all duration-200 hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-background/50 ${iconStyles[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ServicesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [tierCategories, setTierCategories] = useState<any[]>([]);
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
    defaultTitle: '',
    categoryId: '',
    subcategoryId: '',
    itemId: '',
    tier1CategoryId: '',
    tier2SubcategoryId: '',
    tier3ItemId: '',
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

  // Stats computed from services
  const stats = {
    total: services.length,
    active: services.filter(s => s.isActive).length,
    inactive: services.filter(s => !s.isActive).length,
    requiresApproval: services.filter(s => s.requiresApproval).length,
    confidential: services.filter(s => s.isConfidential).length,
    totalTickets: services.reduce((sum, s) => sum + (s._count?.tickets || 0), 0),
  };

  useEffect(() => {
    fetchServices();
    fetchCategories();
    fetchTierCategories();
    fetchSupportGroups();
  }, []);

  // Filter services based on search and filters
  useEffect(() => {
    let filtered = [...services];

    if (searchQuery) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.categoryId === selectedCategory);
    }

    if (selectedSupportGroup !== 'all') {
      filtered = filtered.filter(service => service.supportGroupId === selectedSupportGroup);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(service => service.priority === selectedPriority);
    }

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
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchTierCategories = async () => {
    try {
      const response = await fetch('/api/tier-categories');
      if (!response.ok) throw new Error('Failed to fetch tier categories');
      const data = await response.json();
      setTierCategories(data || []);
    } catch (error) {
      console.error('Error fetching tier categories:', error);
      toast.error('Failed to load tier categories');
    }
  };

  const fetchSupportGroups = async () => {
    try {
      const response = await fetch('/api/admin/support-groups?status=active');
      if (!response.ok) throw new Error('Failed to fetch support groups');
      const data = await response.json();
      setSupportGroups(data);

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
        tier1CategoryId: '',
        tier2SubcategoryId: '',
        tier3ItemId: '',
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
      const dataToSend = { ...editService };

      Object.keys(dataToSend).forEach(key => {
        const value = dataToSend[key as keyof typeof dataToSend];

        if (value === 'none' || value === null) {
          delete dataToSend[key as keyof typeof dataToSend];
        }
        else if (value === undefined) {
          delete dataToSend[key as keyof typeof dataToSend];
        }
      });

      const response = await fetch(`/api/admin/services/${selectedService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details?.[0]?.message || error.error || 'Failed to update service');
      }

      toast.success('Service updated successfully');
      setIsEditServiceOpen(false);
      setEditService({});
      setSelectedService(null);
      fetchServices();
    } catch (error: any) {
      console.error('Error updating service:', error);
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

  const handleExportCSV = () => {
    try {
      const exportData = filteredServices.map(service => ({
        'Service Name': service.name,
        'Description': service.description,
        'Category (Tier 1)': service.tier1Category?.name || service.category?.name || 'N/A',
        'Subcategory (Tier 2)': service.tier2Subcategory?.name || 'N/A',
        'Item (Tier 3)': service.tier3Item?.name || 'N/A',
        'Support Group': service.supportGroup?.name || 'N/A',
        'Priority': service.priority,
        'Estimated Hours': service.estimatedHours || 'N/A',
        'SLA Hours': service.slaHours,
        'Status': service.isActive ? 'Active' : 'Inactive',
        'Requires Approval': service.requiresApproval ? 'Yes' : 'No',
        'Confidential': service.isConfidential ? 'Yes' : 'No',
        'Total Tickets': service._count?.tickets || 0,
        'Total Fields': service._count?.fieldTemplates || 0
      }));

      const filename = generateFilename('services-export', 'csv');
      exportToCSV({ data: exportData, filename, title: 'Services Export' });
      toast.success('Services exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting services:', error);
      toast.error('Failed to export services');
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredServices.map(service => ({
        'Service Name': service.name,
        'Description': service.description,
        'Category (Tier 1)': service.tier1Category?.name || service.category?.name || 'N/A',
        'Subcategory (Tier 2)': service.tier2Subcategory?.name || 'N/A',
        'Item (Tier 3)': service.tier3Item?.name || 'N/A',
        'Support Group': service.supportGroup?.name || 'N/A',
        'Priority': service.priority,
        'Estimated Hours': service.estimatedHours || 'N/A',
        'SLA Hours': service.slaHours,
        'Status': service.isActive ? 'Active' : 'Inactive',
        'Requires Approval': service.requiresApproval ? 'Yes' : 'No',
        'Confidential': service.isConfidential ? 'Yes' : 'No',
        'Total Tickets': service._count?.tickets || 0,
        'Total Fields': service._count?.fieldTemplates || 0
      }));

      const filename = generateFilename('services-export', 'xlsx');
      exportToExcel({ data: exportData, filename, title: 'Services Export' });
      toast.success('Services exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting services:', error);
      toast.error('Failed to export services');
    }
  };

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setEditService({
      name: service.name || '',
      description: service.description || '',
      helpText: service.helpText || '',
      defaultTitle: service.defaultTitle || service.name || '',
      categoryId: service.categoryId || undefined,
      subcategoryId: service.subcategoryId || undefined,
      itemId: service.itemId || undefined,
      tier1CategoryId: service.tier1CategoryId || undefined,
      tier2SubcategoryId: service.tier2SubcategoryId || undefined,
      tier3ItemId: service.tier3ItemId || undefined,
      supportGroupId: service.supportGroupId || undefined,
      priority: service.priority || 'MEDIUM',
      estimatedHours: service.estimatedHours || 4,
      slaHours: service.slaHours || 24,
      requiresApproval: service.requiresApproval ?? true,
      isConfidential: service.isConfidential ?? false,
      isActive: service.isActive ?? true
    });
    setIsEditServiceOpen(true);
  };

  const getPriorityBadgeVariant = (priority: string): "default" | "destructive" | "warning" | "success" | "info" | "secondary" | "outline" | "ghost" => {
    switch (priority) {
      case 'LOW': return 'secondary';
      case 'MEDIUM': return 'default';
      case 'HIGH': return 'warning';
      case 'CRITICAL': return 'destructive';
      case 'EMERGENCY': return 'destructive';
      default: return 'default';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSupportGroup('all');
    setSelectedPriority('all');
    setSelectedStatus('all');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedSupportGroup !== 'all' || selectedPriority !== 'all' || selectedStatus !== 'all';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading services...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <PageHeader
          title="Service Catalog Management"
          description="Manage service catalog, configurations, and SLA settings"
          icon={<Settings className="h-6 w-6" />}
          action={
            <div className="flex gap-2">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                disabled={filteredServices.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                disabled={filteredServices.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button
                onClick={() => setIsNewServiceOpen(true)}
                variant="default"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Service
              </Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="Total Services"
            value={stats.total}
            icon={Layers}
            description="Service catalog"
          />
          <StatCard
            title="Active"
            value={stats.active}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Inactive"
            value={stats.inactive}
            icon={XCircle}
            variant={stats.inactive > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Requires Approval"
            value={stats.requiresApproval}
            icon={ShieldCheck}
            variant="info"
          />
          <StatCard
            title="Confidential"
            value={stats.confidential}
            icon={Lock}
            variant={stats.confidential > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Total Tickets"
            value={stats.totalTickets}
            icon={Ticket}
          />
        </div>

        {/* Filters Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Filters</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Array.isArray(categories) && categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {hasActiveFilters && (
              <div className="mt-3 text-sm text-muted-foreground">
                Showing {filteredServices.length} of {services.length} services
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Service Name</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Support Group</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      SLA
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">Fields</TableHead>
                  <TableHead className="text-center font-semibold">Tickets</TableHead>
                  <TableHead className="font-semibold">Flags</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        No services found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((service) => (
                    <TableRow key={service.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{service.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{service.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{service.category?.name || '-'}</span>
                      </TableCell>
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
                      <TableCell>
                        <span className="text-foreground font-medium">{service.slaHours}h</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{service.fields?.length || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={service._count?.tickets && service._count.tickets > 0 ? 'info-soft' : 'ghost'}>
                          {service._count?.tickets || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {service.requiresApproval && (
                            <Badge variant="warning-soft" size="sm" title="Requires Approval">
                              <ShieldCheck className="h-3 w-3" />
                            </Badge>
                          )}
                          {service.isConfidential && (
                            <Badge variant="destructive-soft" size="sm" title="Confidential">
                              <Lock className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={service.isActive ? 'success' : 'secondary'}>
                          {service.isActive ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                          ) : (
                            'Inactive'
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="iconSm"
                            onClick={() => router.push(`/services/${service.id}`)}
                            title="View Service Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            onClick={() => openEditDialog(service)}
                            title="Edit Service"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            onClick={() => {
                              setSelectedService(service);
                              setIsManageFieldsOpen(true);
                            }}
                            title="Manage Fields"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          {(!service._count?.tickets || service._count.tickets === 0) && (
                            <Button
                              variant="ghost"
                              size="iconSm"
                              onClick={() => handleDeleteService(service)}
                              title="Delete Service"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Service Dialog */}
        <Dialog open={isNewServiceOpen} onOpenChange={setIsNewServiceOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Plus className="h-5 w-5" />
                Create New Service
              </DialogTitle>
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
                    onChange={(e) => setNewService(prev => ({
                      ...prev,
                      name: e.target.value,
                      defaultTitle: e.target.value
                    }))}
                    placeholder="e.g., Password Reset"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category (Optional)</Label>
                  <Select
                    value={newService.categoryId}
                    onValueChange={(value) => setNewService(prev => ({ ...prev, categoryId: value }))}
                  >
                    <SelectTrigger className="bg-background">
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

              {/* 3-Tier Category Selection */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier1CategoryId">Tier 1 Category *</Label>
                  <Select
                    value={newService.tier1CategoryId || ''}
                    onValueChange={(value) => {
                      setNewService(prev => ({
                        ...prev,
                        tier1CategoryId: value,
                        tier2SubcategoryId: '',
                        tier3ItemId: ''
                      }));
                    }}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Tier 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {tierCategories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier2SubcategoryId">Tier 2 Subcategory</Label>
                  <Select
                    value={newService.tier2SubcategoryId || ''}
                    onValueChange={(value) => {
                      setNewService(prev => ({
                        ...prev,
                        tier2SubcategoryId: value,
                        tier3ItemId: ''
                      }));
                    }}
                    disabled={!newService.tier1CategoryId}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Tier 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {newService.tier1CategoryId &&
                        tierCategories
                          .find(c => c.id === newService.tier1CategoryId)
                          ?.subcategories?.map((sub: any) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier3ItemId">Tier 3 Item</Label>
                  <Select
                    value={newService.tier3ItemId || ''}
                    onValueChange={(value) => setNewService(prev => ({ ...prev, tier3ItemId: value }))}
                    disabled={!newService.tier2SubcategoryId}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Tier 3" />
                    </SelectTrigger>
                    <SelectContent>
                      {newService.tier2SubcategoryId &&
                        tierCategories
                          .find(c => c.id === newService.tier1CategoryId)
                          ?.subcategories?.find((s: any) => s.id === newService.tier2SubcategoryId)
                          ?.items?.map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))
                      }
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
                  className="bg-background resize-none"
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
                  className="bg-background resize-none"
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
                    <SelectTrigger className="bg-background">
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
                    <SelectTrigger className="bg-background">
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
                    className="bg-background"
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
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultItilCategory">ITIL Category</Label>
                  <Select
                    value={newService.defaultItilCategory}
                    onValueChange={(value: any) => setNewService(prev => ({ ...prev, defaultItilCategory: value }))}
                  >
                    <SelectTrigger className="bg-background">
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
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="requiresApproval" className="text-base">Requires Approval</Label>
                    <p className="text-sm text-muted-foreground">Tickets need manager approval</p>
                  </div>
                  <Switch
                    id="requiresApproval"
                    checked={newService.requiresApproval}
                    onCheckedChange={(checked) => setNewService(prev => ({ ...prev, requiresApproval: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="isConfidential" className="text-base">Confidential</Label>
                    <p className="text-sm text-muted-foreground">Restrict visibility</p>
                  </div>
                  <Switch
                    id="isConfidential"
                    checked={newService.isConfidential}
                    onCheckedChange={(checked) => setNewService(prev => ({ ...prev, isConfidential: checked }))}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setIsNewServiceOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateService} variant="default">
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
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Edit className="h-5 w-5" />
                Edit Service
              </DialogTitle>
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
                    onChange={(e) => setEditService(prev => ({
                      ...prev,
                      name: e.target.value,
                      defaultTitle: e.target.value
                    }))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-categoryId">Category</Label>
                  <Select
                    value={editService.categoryId || 'none'}
                    onValueChange={(value) => setEditService(prev => ({ ...prev, categoryId: value === 'none' ? undefined : value }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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
                  className="bg-background resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-helpText">Help Text</Label>
                <Textarea
                  id="edit-helpText"
                  value={editService.helpText || ''}
                  onChange={(e) => setEditService(prev => ({ ...prev, helpText: e.target.value }))}
                  className="bg-background resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-tier1CategoryId">Tier 1 Category</Label>
                  <Select
                    value={editService.tier1CategoryId || 'none'}
                    onValueChange={(value) => {
                      setEditService(prev => ({
                        ...prev,
                        tier1CategoryId: value === 'none' ? undefined : value,
                        tier2SubcategoryId: undefined,
                        tier3ItemId: undefined
                      }));
                    }}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Tier 1" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {tierCategories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tier2SubcategoryId">Tier 2 Subcategory</Label>
                  <Select
                    value={editService.tier2SubcategoryId || 'none'}
                    onValueChange={(value) => {
                      setEditService(prev => ({
                        ...prev,
                        tier2SubcategoryId: value === 'none' ? undefined : value,
                        tier3ItemId: undefined
                      }));
                    }}
                    disabled={!editService.tier1CategoryId || editService.tier1CategoryId === 'none'}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Tier 2" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {editService.tier1CategoryId && editService.tier1CategoryId !== 'none' &&
                        tierCategories
                          .find(c => c.id === editService.tier1CategoryId)
                          ?.subcategories?.map((sub: any) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tier3ItemId">Tier 3 Item</Label>
                  <Select
                    value={editService.tier3ItemId || 'none'}
                    onValueChange={(value) => setEditService(prev => ({ ...prev, tier3ItemId: value === 'none' ? undefined : value }))}
                    disabled={!editService.tier2SubcategoryId || editService.tier2SubcategoryId === 'none'}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Tier 3" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {editService.tier2SubcategoryId && editService.tier2SubcategoryId !== 'none' &&
                        tierCategories
                          .find(c => c.id === editService.tier1CategoryId)
                          ?.subcategories?.find((s: any) => s.id === editService.tier2SubcategoryId)
                          ?.items?.map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-supportGroupId">Support Group</Label>
                  <Select
                    value={editService.supportGroupId}
                    onValueChange={(value) => setEditService(prev => ({ ...prev, supportGroupId: value }))}
                  >
                    <SelectTrigger className="bg-background">
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
                    <SelectTrigger className="bg-background">
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
                    className="bg-background"
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
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="edit-requiresApproval" className="text-sm">Requires Approval</Label>
                  <Switch
                    id="edit-requiresApproval"
                    checked={editService.requiresApproval}
                    onCheckedChange={(checked) => setEditService(prev => ({ ...prev, requiresApproval: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="edit-isConfidential" className="text-sm">Confidential</Label>
                  <Switch
                    id="edit-isConfidential"
                    checked={editService.isConfidential}
                    onCheckedChange={(checked) => setEditService(prev => ({ ...prev, isConfidential: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="edit-isActive" className="text-sm">Active</Label>
                  <Switch
                    id="edit-isActive"
                    checked={editService.isActive}
                    onCheckedChange={(checked) => setEditService(prev => ({ ...prev, isActive: checked }))}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setIsEditServiceOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateService} variant="default">
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
    </div>
  );
}
