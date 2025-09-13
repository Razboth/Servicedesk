'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Key,
  DollarSign,
  Building,
  User,
  Monitor
} from 'lucide-react';
import { format } from 'date-fns';

interface OSLicense {
  id: string;
  name: string;
  osName: string;
  osVersion: string | null;
  licenseType: string;
  licenseKey: string | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  cost: number | null;
  vendor: string | null;
  invoiceNumber: string | null;
  maxActivations: number;
  currentActivations: number;
  isActive: boolean;
  notes: string | null;
  assignedToPC: string | null;
  assignedToBranch: string | null;
  assignedToUser: string | null;
  pcAsset: {
    id: string;
    pcName: string;
    brand: string;
  } | null;
  branch: {
    id: string;
    name: string;
    code: string;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export function OSLicensesTab() {
  const [licenses, setLicenses] = useState<OSLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingLicense, setEditingLicense] = useState<OSLicense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [licenseToDelete, setLicenseToDelete] = useState<OSLicense | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    osName: '',
    osVersion: '',
    licenseType: 'OEM',
    licenseKey: '',
    purchaseDate: '',
    expiryDate: '',
    cost: '',
    vendor: '',
    invoiceNumber: '',
    maxActivations: 1,
    notes: ''
  });

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      const response = await fetch('/api/admin/pc-assets/os-licenses');
      if (response.ok) {
        const data = await response.json();
        setLicenses(data);
      }
    } catch (error) {
      console.error('Error fetching OS licenses:', error);
      toast.error('Failed to fetch OS licenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingLicense 
        ? `/api/admin/pc-assets/os-licenses/${editingLicense.id}`
        : '/api/admin/pc-assets/os-licenses';
      
      const method = editingLicense ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingLicense ? 'License updated' : 'License created');
        fetchLicenses();
        handleCloseDialog();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving license:', error);
      toast.error('Failed to save license');
    }
  };

  const handleDelete = async () => {
    if (!licenseToDelete) return;

    try {
      const response = await fetch(`/api/admin/pc-assets/os-licenses/${licenseToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('License deleted');
        fetchLicenses();
        setDeleteDialogOpen(false);
        setLicenseToDelete(null);
      } else {
        toast.error('Failed to delete license');
      }
    } catch (error) {
      console.error('Error deleting license:', error);
      toast.error('Failed to delete license');
    }
  };

  const handleEdit = (license: OSLicense) => {
    setEditingLicense(license);
    setFormData({
      name: license.name,
      osName: license.osName,
      osVersion: license.osVersion || '',
      licenseType: license.licenseType,
      licenseKey: license.licenseKey || '',
      purchaseDate: license.purchaseDate ? format(new Date(license.purchaseDate), 'yyyy-MM-dd') : '',
      expiryDate: license.expiryDate ? format(new Date(license.expiryDate), 'yyyy-MM-dd') : '',
      cost: license.cost?.toString() || '',
      vendor: license.vendor || '',
      invoiceNumber: license.invoiceNumber || '',
      maxActivations: license.maxActivations,
      notes: license.notes || ''
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingLicense(null);
    setFormData({
      name: '',
      osName: '',
      osVersion: '',
      licenseType: 'OEM',
      licenseKey: '',
      purchaseDate: '',
      expiryDate: '',
      cost: '',
      vendor: '',
      invoiceNumber: '',
      maxActivations: 1,
      notes: ''
    });
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    
    const days = Math.floor((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (days < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (days <= 30) {
      return <Badge variant="destructive">Expires in {days} days</Badge>;
    } else if (days <= 90) {
      return <Badge className="bg-yellow-500">Expires in {days} days</Badge>;
    }
    return <Badge variant="outline">{format(new Date(expiryDate), 'MMM dd, yyyy')}</Badge>;
  };

  const filteredLicenses = licenses.filter(license =>
    license.name.toLowerCase().includes(search.toLowerCase()) ||
    license.osName.toLowerCase().includes(search.toLowerCase()) ||
    license.licenseKey?.toLowerCase().includes(search.toLowerCase()) ||
    license.vendor?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.isActive).length,
    expiringSoon: licenses.filter(l => {
      if (!l.expiryDate) return false;
      const days = Math.floor((new Date(l.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    }).length,
    expired: licenses.filter(l => {
      if (!l.expiryDate) return false;
      return new Date(l.expiryDate) < new Date();
    }).length
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Licenses</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">{stats.expired}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search licenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add OS License
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>License Key</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Activations</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading licenses...
                  </TableCell>
                </TableRow>
              ) : filteredLicenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No licenses found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLicenses.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell className="font-medium">{license.name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{license.osName}</p>
                        {license.osVersion && (
                          <p className="text-xs text-gray-500">{license.osVersion}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{license.licenseType}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{license.licenseKey || 'N/A'}</code>
                    </TableCell>
                    <TableCell>
                      {license.pcAsset ? (
                        <div className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          <span className="text-sm">{license.pcAsset.pcName}</span>
                        </div>
                      ) : license.branch ? (
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          <span className="text-sm">{license.branch.name}</span>
                        </div>
                      ) : license.user ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="text-sm">{license.user.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={license.currentActivations >= license.maxActivations ? 'text-red-600 font-medium' : ''}>
                        {license.currentActivations}/{license.maxActivations}
                      </span>
                    </TableCell>
                    <TableCell>{getExpiryStatus(license.expiryDate)}</TableCell>
                    <TableCell>
                      <Badge className={license.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {license.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(license)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setLicenseToDelete(license);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingLicense ? 'Edit OS License' : 'Create OS License'}</DialogTitle>
            <DialogDescription>
              {editingLicense ? 'Update the OS license details' : 'Add a new OS license to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">License Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Windows 11 Pro - Branch A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="osName">Operating System *</Label>
                <Select
                  value={formData.osName}
                  onValueChange={(value) => setFormData({ ...formData, osName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select OS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Windows 11 Pro">Windows 11 Pro</SelectItem>
                    <SelectItem value="Windows 11 Enterprise">Windows 11 Enterprise</SelectItem>
                    <SelectItem value="Windows 10 Pro">Windows 10 Pro</SelectItem>
                    <SelectItem value="Windows 10 Enterprise">Windows 10 Enterprise</SelectItem>
                    <SelectItem value="Windows Server 2022">Windows Server 2022</SelectItem>
                    <SelectItem value="Windows Server 2019">Windows Server 2019</SelectItem>
                    <SelectItem value="Ubuntu">Ubuntu</SelectItem>
                    <SelectItem value="Red Hat Enterprise Linux">Red Hat Enterprise Linux</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="osVersion">Version</Label>
                <Input
                  id="osVersion"
                  value={formData.osVersion}
                  onChange={(e) => setFormData({ ...formData, osVersion: e.target.value })}
                  placeholder="e.g., 22H2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseType">License Type *</Label>
                <Select
                  value={formData.licenseType}
                  onValueChange={(value) => setFormData({ ...formData, licenseType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OEM">OEM</SelectItem>
                    <SelectItem value="FPP">FPP (Full Packaged Product)</SelectItem>
                    <SelectItem value="OLP">OLP (Open License Program)</SelectItem>
                    <SelectItem value="VOLUME">Volume License</SelectItem>
                    <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseKey">License Key</Label>
              <Input
                id="licenseKey"
                value={formData.licenseKey}
                onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value })}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="e.g., Microsoft Store"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="INV-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxActivations">Max Activations</Label>
                <Input
                  id="maxActivations"
                  type="number"
                  value={formData.maxActivations}
                  onChange={(e) => setFormData({ ...formData, maxActivations: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingLicense ? 'Update' : 'Create'} License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete OS License</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the license "{licenseToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}