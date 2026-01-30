'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BranchSelect } from '@/components/ui/branch-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Plus,
  Edit,
  Trash,
  Search,
  Download,
  DollarSign,
  Calendar,
  Users,
  Building,
  User,
  Monitor,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface OfficeLicense {
  id: string;
  name: string;
  productName: string;
  productType: string;
  licenseType: string;
  licenseKey?: string;
  subscriptionId?: string;
  purchaseDate?: string;
  expiryDate?: string;
  renewalDate?: string;
  cost?: number;
  costPeriod?: string;
  vendor?: string;
  invoiceNumber?: string;
  maxUsers: number;
  currentUsers: number;
  isActive: boolean;
  autoRenew: boolean;
  notes?: string;
  assignedToPC?: string;
  assignedToBranch?: string;
  assignedToUser?: string;
  pcAsset?: { id: string; pcName: string };
  branch?: { id: string; name: string; code: string };
  user?: { id: string; name: string; email: string };
  createdByUser?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export default function OfficeManagementPage() {
  const [licenses, setLicenses] = useState<OfficeLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterProductType, setFilterProductType] = useState('all');
  const [filterLicenseType, setFilterLicenseType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pcAssets, setPCAssets] = useState<any[]>([]);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<OfficeLicense | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    productName: '',
    productType: 'OFFICE_365',
    licenseType: 'SUBSCRIPTION',
    licenseKey: '',
    subscriptionId: '',
    purchaseDate: '',
    expiryDate: '',
    renewalDate: '',
    cost: '',
    costPeriod: 'YEARLY',
    vendor: '',
    invoiceNumber: '',
    maxUsers: '1',
    currentUsers: '0',
    autoRenew: false,
    notes: '',
    assignedToPC: '',
    assignedToBranch: '',
    assignedToUser: '',
    isActive: true
  });

  useEffect(() => {
    fetchLicenses();
    fetchBranches();
    fetchUsers();
    fetchPCAssets();
  }, [search, filterBranch, filterProductType, filterLicenseType, filterStatus]);

  const fetchLicenses = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterBranch !== 'all') params.append('branchId', filterBranch);
      if (filterProductType !== 'all') params.append('productType', filterProductType);
      if (filterLicenseType !== 'all') params.append('licenseType', filterLicenseType);
      if (filterStatus !== 'all') params.append('isActive', filterStatus);

      const response = await fetch(`/api/admin/office-licenses?${params}`);
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setLicenses(data);
      } else {
        console.error('Invalid response format:', data);
        setLicenses([]);
      }
    } catch (error) {
      console.error('Error fetching Office licenses:', error);
      setLicenses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches');
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setBranches(data);
      } else {
        console.error('Invalid branches response:', data);
        setBranches([]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error('Invalid users response:', data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchPCAssets = async () => {
    try {
      const response = await fetch('/api/admin/pc-assets');
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setPCAssets(data);
      } else {
        console.error('Invalid PC assets response:', data);
        setPCAssets([]);
      }
    } catch (error) {
      console.error('Error fetching PC assets:', error);
      setPCAssets([]);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      productName: '',
      productType: 'OFFICE_365',
      licenseType: 'SUBSCRIPTION',
      licenseKey: '',
      subscriptionId: '',
      purchaseDate: '',
      expiryDate: '',
      renewalDate: '',
      cost: '',
      costPeriod: 'YEARLY',
      vendor: '',
      invoiceNumber: '',
      maxUsers: '1',
      currentUsers: '0',
      autoRenew: false,
      notes: '',
      assignedToPC: '',
      assignedToBranch: '',
      assignedToUser: '',
      isActive: true
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (license: OfficeLicense) => {
    setSelectedLicense(license);
    setFormData({
      name: license.name,
      productName: license.productName,
      productType: license.productType,
      licenseType: license.licenseType,
      licenseKey: license.licenseKey || '',
      subscriptionId: license.subscriptionId || '',
      purchaseDate: license.purchaseDate ? new Date(license.purchaseDate).toISOString().split('T')[0] : '',
      expiryDate: license.expiryDate ? new Date(license.expiryDate).toISOString().split('T')[0] : '',
      renewalDate: license.renewalDate ? new Date(license.renewalDate).toISOString().split('T')[0] : '',
      cost: license.cost?.toString() || '',
      costPeriod: license.costPeriod || 'YEARLY',
      vendor: license.vendor || '',
      invoiceNumber: license.invoiceNumber || '',
      maxUsers: license.maxUsers.toString(),
      currentUsers: license.currentUsers.toString(),
      autoRenew: license.autoRenew,
      notes: license.notes || '',
      assignedToPC: license.pcAsset?.id || '',
      assignedToBranch: license.branch?.id || '',
      assignedToUser: license.user?.id || '',
      isActive: license.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (license: OfficeLicense) => {
    setSelectedLicense(license);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveCreate = async () => {
    try {
      const response = await fetch('/api/admin/office-licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          maxUsers: parseInt(formData.maxUsers),
          currentUsers: parseInt(formData.currentUsers)
        })
      });

      if (response.ok) {
        fetchLicenses();
        setIsCreateDialogOpen(false);
      }
    } catch (error) {
      console.error('Error creating Office license:', error);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/admin/office-licenses/${selectedLicense?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          maxUsers: parseInt(formData.maxUsers),
          currentUsers: parseInt(formData.currentUsers)
        })
      });

      if (response.ok) {
        fetchLicenses();
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating Office license:', error);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`/api/admin/office-licenses/${selectedLicense?.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchLicenses();
        setIsDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting Office license:', error);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Product', 'Type', 'License Type', 'License Key', 'Branch', 'User', 'PC', 'Status', 'Cost', 'Vendor', 'Expiry'],
      ...licenses.map(l => [
        l.name,
        l.productName,
        l.productType,
        l.licenseType,
        l.licenseKey || l.subscriptionId || '',
        l.branch?.name || '',
        l.user?.name || '',
        l.pcAsset?.pcName || '',
        l.isActive ? 'Active' : 'Inactive',
        l.cost?.toString() || '',
        l.vendor || '',
        l.expiryDate ? new Date(l.expiryDate).toLocaleDateString() : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `office-licenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Statistics
  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.isActive).length,
    subscriptions: licenses.filter(l => l.licenseType === 'SUBSCRIPTION').length,
    perpetual: licenses.filter(l => l.licenseType === 'PERPETUAL').length,
    available: licenses.filter(l => l.currentUsers < l.maxUsers).length,
    expiringSoon: licenses.filter(l => {
      if (!l.expiryDate) return false;
      const daysUntilExpiry = Math.floor((new Date(l.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length,
    totalCost: licenses.reduce((sum, l) => sum + (l.cost || 0), 0)
  };

  if (loading) {
    return <div className="p-6">Loading Office licenses...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Office License Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage Microsoft Office and productivity suite licenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add New License
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Licenses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.subscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.available}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoon}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search licenses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <BranchSelect
              branches={branches}
              value={filterBranch}
              onValueChange={setFilterBranch}
              placeholder="All Branches"
              allOption={true}
              allOptionLabel="All Branches"
              className="w-[200px]"
            />
            <Select value={filterProductType} onValueChange={setFilterProductType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="OFFICE_365">Office 365</SelectItem>
                <SelectItem value="OFFICE_2021_LTSC">Office 2021</SelectItem>
                <SelectItem value="OFFICE_2019">Office 2019</SelectItem>
                <SelectItem value="LIBRE_OFFICE">LibreOffice</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLicenseType} onValueChange={setFilterLicenseType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                <SelectItem value="PERPETUAL">Perpetual</SelectItem>
                <SelectItem value="OEM">OEM</SelectItem>
                <SelectItem value="VOLUME">Volume</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* License Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((license) => (
                <TableRow key={license.id}>
                  <TableCell className="font-medium">{license.name}</TableCell>
                  <TableCell>{license.productName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{license.productType.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{license.licenseType}</Badge>
                  </TableCell>
                  <TableCell>
                    {license.pcAsset && (
                      <div className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        <span className="text-sm">{license.pcAsset.pcName}</span>
                      </div>
                    )}
                    {license.branch && (
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span className="text-sm">{license.branch.name}</span>
                      </div>
                    )}
                    {license.user && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="text-sm">{license.user.name}</span>
                      </div>
                    )}
                    {!license.pcAsset && !license.branch && !license.user && '-'}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {license.currentUsers}/{license.maxUsers}
                    </span>
                  </TableCell>
                  <TableCell>
                    {license.expiryDate ? (
                      <span className="text-sm">
                        {new Date(license.expiryDate).toLocaleDateString()}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={license.isActive ? 'default' : 'secondary'}>
                      {license.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(license)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(license)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Office License</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>License Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Office 365 Business - Branch 001"
              />
            </div>
            <div>
              <Label>Product Name</Label>
              <Input
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="e.g., Microsoft Office 365 Business"
              />
            </div>
            <div>
              <Label>Product Type</Label>
              <Select 
                value={formData.productType} 
                onValueChange={(value) => setFormData({ ...formData, productType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFICE_365">Office 365</SelectItem>
                  <SelectItem value="OFFICE_2021_LTSC">Office 2021 LTSC</SelectItem>
                  <SelectItem value="OFFICE_2019">Office 2019</SelectItem>
                  <SelectItem value="OFFICE_2016">Office 2016</SelectItem>
                  <SelectItem value="LIBRE_OFFICE">LibreOffice</SelectItem>
                  <SelectItem value="OPEN_OFFICE">OpenOffice</SelectItem>
                  <SelectItem value="WPS_OFFICE">WPS Office</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>License Type</Label>
              <Select 
                value={formData.licenseType} 
                onValueChange={(value) => setFormData({ ...formData, licenseType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                  <SelectItem value="PERPETUAL">Perpetual</SelectItem>
                  <SelectItem value="OEM">OEM</SelectItem>
                  <SelectItem value="VOLUME">Volume</SelectItem>
                  <SelectItem value="FPP">FPP</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>License Key</Label>
              <Input
                value={formData.licenseKey}
                onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value })}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              />
            </div>
            <div>
              <Label>Subscription ID</Label>
              <Input
                value={formData.subscriptionId}
                onChange={(e) => setFormData({ ...formData, subscriptionId: e.target.value })}
                placeholder="For subscription-based licenses"
              />
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Renewal Date</Label>
              <Input
                type="date"
                value={formData.renewalDate}
                onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Cost ($)</Label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Cost Period</Label>
              <Select 
                value={formData.costPeriod} 
                onValueChange={(value) => setFormData({ ...formData, costPeriod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                  <SelectItem value="ONE_TIME">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor</Label>
              <Input
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="e.g., Microsoft"
              />
            </div>
            <div>
              <Label>Invoice Number</Label>
              <Input
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Max Users</Label>
              <Input
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
              />
            </div>
            <div>
              <Label>Assign to PC</Label>
              <Select 
                value={formData.assignedToPC} 
                onValueChange={(value) => setFormData({ ...formData, assignedToPC: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {pcAssets.map(pc => (
                    <SelectItem key={pc.id} value={pc.id}>
                      {pc.pcName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign to Branch</Label>
              <BranchSelect
                branches={branches}
                value={formData.assignedToBranch}
                onValueChange={(value) => setFormData({ ...formData, assignedToBranch: value })}
                placeholder="Select Branch"
                noneOption={true}
                noneOptionLabel="None"
              />
            </div>
            <div>
              <Label>Assign to User</Label>
              <Select 
                value={formData.assignedToUser} 
                onValueChange={(value) => setFormData({ ...formData, assignedToUser: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoRenew"
                checked={formData.autoRenew}
                onCheckedChange={(checked) => setFormData({ ...formData, autoRenew: checked as boolean })}
              />
              <Label htmlFor="autoRenew">Auto-renew subscription</Label>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCreate}>
              Create License
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Office License</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>License Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Product Name</Label>
              <Input
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              />
            </div>
            <div>
              <Label>Product Type</Label>
              <Select 
                value={formData.productType} 
                onValueChange={(value) => setFormData({ ...formData, productType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFICE_365">Office 365</SelectItem>
                  <SelectItem value="OFFICE_2021_LTSC">Office 2021 LTSC</SelectItem>
                  <SelectItem value="OFFICE_2019">Office 2019</SelectItem>
                  <SelectItem value="OFFICE_2016">Office 2016</SelectItem>
                  <SelectItem value="LIBRE_OFFICE">LibreOffice</SelectItem>
                  <SelectItem value="OPEN_OFFICE">OpenOffice</SelectItem>
                  <SelectItem value="WPS_OFFICE">WPS Office</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>License Type</Label>
              <Select 
                value={formData.licenseType} 
                onValueChange={(value) => setFormData({ ...formData, licenseType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                  <SelectItem value="PERPETUAL">Perpetual</SelectItem>
                  <SelectItem value="OEM">OEM</SelectItem>
                  <SelectItem value="VOLUME">Volume</SelectItem>
                  <SelectItem value="FPP">FPP</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>License Key</Label>
              <Input
                value={formData.licenseKey}
                onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value })}
              />
            </div>
            <div>
              <Label>Subscription ID</Label>
              <Input
                value={formData.subscriptionId}
                onChange={(e) => setFormData({ ...formData, subscriptionId: e.target.value })}
              />
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Renewal Date</Label>
              <Input
                type="date"
                value={formData.renewalDate}
                onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Cost ($)</Label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              />
            </div>
            <div>
              <Label>Cost Period</Label>
              <Select 
                value={formData.costPeriod} 
                onValueChange={(value) => setFormData({ ...formData, costPeriod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                  <SelectItem value="ONE_TIME">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor</Label>
              <Input
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              />
            </div>
            <div>
              <Label>Invoice Number</Label>
              <Input
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Max Users</Label>
              <Input
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
              />
            </div>
            <div>
              <Label>Current Users</Label>
              <Input
                type="number"
                value={formData.currentUsers}
                onChange={(e) => setFormData({ ...formData, currentUsers: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={formData.isActive.toString()} 
                onValueChange={(value) => setFormData({ ...formData, isActive: value === 'true' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign to PC</Label>
              <Select 
                value={formData.assignedToPC} 
                onValueChange={(value) => setFormData({ ...formData, assignedToPC: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {pcAssets.map(pc => (
                    <SelectItem key={pc.id} value={pc.id}>
                      {pc.pcName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign to Branch</Label>
              <BranchSelect
                branches={branches}
                value={formData.assignedToBranch}
                onValueChange={(value) => setFormData({ ...formData, assignedToBranch: value })}
                placeholder="Select Branch"
                noneOption={true}
                noneOptionLabel="None"
              />
            </div>
            <div>
              <Label>Assign to User</Label>
              <Select 
                value={formData.assignedToUser} 
                onValueChange={(value) => setFormData({ ...formData, assignedToUser: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoRenew"
                checked={formData.autoRenew}
                onCheckedChange={(checked) => setFormData({ ...formData, autoRenew: checked as boolean })}
              />
              <Label htmlFor="autoRenew">Auto-renew subscription</Label>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the Office license "{selectedLicense?.name}". 
              The license will be marked as inactive and can be reactivated later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}