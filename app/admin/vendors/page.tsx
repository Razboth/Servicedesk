'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  BarChart,
  RefreshCw,
  Trash
} from 'lucide-react';
import { format } from 'date-fns';

interface Vendor {
  id: string;
  name: string;
  code: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  supportHours: string | null;
  slaResponseTime: number | null;
  slaResolutionTime: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalTickets?: number;
  activeTickets?: number;
  resolvedTickets?: number;
  avgResolutionTimeHours?: number;
}

export default function VendorsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    supportHours: '',
    slaResponseTime: 4,
    slaResolutionTime: 24,
    notes: '',
    isActive: true,
    contractStartDate: '',
    contractEndDate: ''
  });

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    fetchVendors();
  }, [session, search, filterStatus]);

  const fetchVendors = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatus !== 'all') params.append('isActive', filterStatus);

      const response = await fetch(`/api/vendors?${params}`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      } else {
        toast.error('Failed to fetch vendors');
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      code: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      supportHours: '',
      slaResponseTime: 4,
      slaResolutionTime: 24,
      notes: '',
      isActive: true,
      contractStartDate: '',
      contractEndDate: ''
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      code: vendor.code,
      contactPerson: vendor.contactName || '',
      email: vendor.contactEmail || '',
      phone: vendor.contactPhone || '',
      address: vendor.address || '',
      website: vendor.website || '',
      supportHours: vendor.supportHours || '',
      slaResponseTime: vendor.slaResponseTime || 4,
      slaResolutionTime: vendor.slaResolutionTime || 24,
      notes: vendor.notes || '',
      isActive: vendor.isActive,
      contractStartDate: '',
      contractEndDate: ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = selectedVendor 
        ? `/api/vendors/${selectedVendor.id}`
        : '/api/vendors';
      
      const method = selectedVendor ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(selectedVendor ? 'Vendor updated successfully' : 'Vendor created successfully');
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        setSelectedVendor(null);
        fetchVendors();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save vendor');
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast.error('Failed to save vendor');
    }
  };

  const handleDeactivate = async (vendor: Vendor) => {
    if (!confirm(`Are you sure you want to deactivate ${vendor.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Vendor deactivated successfully');
        fetchVendors();
      } else {
        const error = await response.json();
        // Show more detailed error message
        if (error.error === 'Cannot deactivate vendor with active tickets') {
          toast.error('Cannot deactivate vendor with active tickets. Please resolve or reassign all active tickets first.');
        } else {
          toast.error(error.error || 'Failed to deactivate vendor');
        }
      }
    } catch (error) {
      console.error('Error deactivating vendor:', error);
      toast.error('Failed to deactivate vendor');
    }
  };

  const handleReactivate = async (vendor: Vendor) => {
    if (!confirm(`Are you sure you want to reactivate ${vendor.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vendor, isActive: true }),
      });

      if (response.ok) {
        toast.success('Vendor reactivated successfully');
        fetchVendors();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reactivate vendor');
      }
    } catch (error) {
      console.error('Error reactivating vendor:', error);
      toast.error('Failed to reactivate vendor');
    }
  };

  const handleHardDelete = async (vendor: Vendor) => {
    const confirmText = `DELETE ${vendor.code}`;
    const userInput = prompt(
      `⚠️ PERMANENT DELETION WARNING ⚠️\n\n` +
      `This will PERMANENTLY delete "${vendor.name}" and ALL associated data.\n` +
      `This action CANNOT be undone!\n\n` +
      `Type "${confirmText}" to confirm:`
    );

    if (userInput !== confirmText) {
      if (userInput !== null) {
        toast.error('Deletion cancelled - confirmation text did not match');
      }
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${vendor.id}/hard-delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Vendor permanently deleted');
        fetchVendors();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete vendor');
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    }
  };


  // Statistics
  const stats = {
    totalVendors: vendors.filter(v => v.isActive).length,
    totalTickets: vendors.reduce((acc, v) => acc + (v.totalTickets || 0), 0),
    activeTickets: vendors.reduce((acc, v) => acc + (v.activeTickets || 0), 0),
    avgResolutionTime: vendors.length > 0
      ? Math.round(vendors.reduce((acc, v) => acc + (v.avgResolutionTimeHours || 0), 0) / vendors.length)
      : 0
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground">Manage external vendors and their performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/vendors/performance')}>
            <BarChart className="w-4 h-4 mr-2" />
            View Performance
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Vendors</p>
                <p className="text-3xl font-bold">{stats.totalVendors}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                <p className="text-3xl font-bold">{stats.totalTickets}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Tickets</p>
                <p className="text-3xl font-bold">{stats.activeTickets}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                <p className="text-3xl font-bold">{stats.avgResolutionTime}h</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search vendors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vendors Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Service Types</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading vendors...
                  </TableCell>
                </TableRow>
              ) : vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No vendors found
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow 
                    key={vendor.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        <p className="text-sm text-muted-foreground">Code: {vendor.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {vendor.contactName && (
                          <p className="text-sm">{vendor.contactName}</p>
                        )}
                        {vendor.contactEmail && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {vendor.contactEmail}
                          </p>
                        )}
                        {vendor.contactPhone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {vendor.contactPhone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {vendor.supportHours || 'Not specified'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>Response: {vendor.slaResponseTime}h</p>
                        <p>Resolution: {vendor.slaResolutionTime}h</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Total:</span>
                          <Badge variant="outline">{vendor.totalTickets || 0}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Active:</span>
                          <Badge variant="destructive">{vendor.activeTickets || 0}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Avg:</span>
                          <Badge variant="secondary">{vendor.avgResolutionTimeHours || 0}h</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={vendor.isActive ? 'success' : 'secondary'}>
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(vendor)}
                          title="Edit vendor"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {vendor.isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivate(vendor)}
                            title="Deactivate vendor"
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivate(vendor)}
                              title="Reactivate vendor"
                              className="text-green-600 hover:text-green-700"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reactivate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleHardDelete(vendor)}
                              title="Permanently delete vendor"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </>
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

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={() => {
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        setSelectedVendor(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedVendor ? 'Edit Vendor' : 'Create New Vendor'}
            </DialogTitle>
            <DialogDescription>
              {selectedVendor ? 'Update vendor information' : 'Add a new vendor to the system'}
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
                  />
                </div>
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractStartDate">Contract Start Date</Label>
                  <Input
                    id="contractStartDate"
                    type="date"
                    value={formData.contractStartDate}
                    onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contractEndDate">Contract End Date</Label>
                  <Input
                    id="contractEndDate"
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="slaResponseTime">SLA Response Time (hours)</Label>
                  <Input
                    id="slaResponseTime"
                    type="number"
                    value={formData.slaResponseTime}
                    onChange={(e) => setFormData({ ...formData, slaResponseTime: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slaResolutionTime">SLA Resolution Time (hours)</Label>
                  <Input
                    id="slaResolutionTime"
                    type="number"
                    value={formData.slaResolutionTime}
                    onChange={(e) => setFormData({ ...formData, slaResolutionTime: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                {selectedVendor ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}