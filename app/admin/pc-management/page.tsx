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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Monitor,
  Search,
  Plus,
  Edit,
  Trash2,
  FileText,
  Shield,
  HardDrive,
  Cpu,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  Laptop,
  Box,
  Wrench,
  Archive,
  ShieldAlert,
  Clock,
  FileSpreadsheet,
  LayoutDashboard,
  Activity,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import OSTypesTab from '@/components/pc-assets/os-types-tab';
import OfficeTypesTab from '@/components/pc-assets/office-types-tab';

interface PCAsset {
  id: string;
  pcName: string;
  assetTag: string | null;
  brand: string;
  model: string | null;
  serialNumber: string | null;
  processor: string;
  ram: number;
  formFactor: string | null;
  storageType: string | null;
  storageCapacity: string | null;
  storageDevices: any;
  macAddress: string | null;
  ipAddress: string | null;
  department: string | null;
  assignedUserName: string | null;
  status: string;
  operatingSystem: {
    id: string;
    name: string;
    version: string | null;
    type: string;
  } | null;
  officeProduct: {
    id: string;
    name: string;
    version: string | null;
    type: string;
  } | null;
  osLicenseType: string | null;
  officeLicenseType: string | null;
  officeLicenseStatus: string | null;
  antivirusName: string | null;
  antivirusLicenseExpiry: string | null;
  avRealTimeProtection: boolean | null;
  avDefinitionDate: string | null;
  warrantyExpiry: string | null;
  lastHardeningDate: string | null;
  hardeningCompliant: boolean;
  isActive: boolean;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count: {
    serviceLogs: number;
    hardeningChecklists: number;
    osLicenses: number;
    officeLicenses: number;
  };
}

interface DashboardStats {
  summary: {
    totalAssets: number;
    statusCounts: Record<string, number>;
    warrantyExpiringSoon: number;
    warrantyExpired: number;
    avOutdated: number;
    avInactive: number;
    openServiceLogs: number;
  };
  recentServiceLogs: any[];
  assetsByBranch: any[];
  assetsByFormFactor: any[];
}

export default function PCManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [pcAssets, setPCAssets] = useState<PCAsset[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFormFactor, setFilterFormFactor] = useState('');
  const [filterWarrantyStatus, setFilterWarrantyStatus] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchBranches();
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    fetchPCAssets();
  }, [search, filterBranch, filterStatus, filterFormFactor, filterWarrantyStatus]);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches');
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setDashboardLoading(true);
      const response = await fetch('/api/admin/pc-management/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchPCAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterBranch) params.append('branchId', filterBranch);
      if (filterStatus) params.append('status', filterStatus);
      if (filterFormFactor) params.append('formFactor', filterFormFactor);
      if (filterWarrantyStatus) params.append('warrantyStatus', filterWarrantyStatus);
      params.append('isActive', 'true');

      const response = await fetch(`/api/admin/pc-assets?${params}`);
      if (!response.ok) throw new Error('Failed to fetch PC assets');

      const data = await response.json();
      setPCAssets(data);
    } catch (error) {
      console.error('Error fetching PC assets:', error);
      toast.error('Failed to load PC assets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PC asset?')) return;

    try {
      const response = await fetch(`/api/admin/pc-assets/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete PC asset');

      toast.success('PC asset deleted successfully');
      fetchPCAssets();
      fetchDashboardStats();
    } catch (error) {
      toast.error('Failed to delete PC asset');
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.append('format', format);
      if (filterBranch) params.append('branchId', filterBranch);
      if (filterStatus) params.append('status', filterStatus);
      if (filterFormFactor) params.append('formFactor', filterFormFactor);

      const response = await fetch(`/api/admin/pc-management/export?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PC_Inventory_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Exported to ${format.toUpperCase()} successfully`);
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'; label: string }> = {
      'IN_USE': { variant: 'success', label: 'In Use' },
      'STOCK': { variant: 'secondary', label: 'Stock' },
      'BROKEN': { variant: 'destructive', label: 'Broken' },
      'DISPOSED': { variant: 'outline', label: 'Disposed' },
      'MAINTENANCE': { variant: 'warning', label: 'Maintenance' },
      'RESERVED': { variant: 'default', label: 'Reserved' }
    };
    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getFormFactorIcon = (formFactor: string | null) => {
    switch (formFactor) {
      case 'LAPTOP': return <Laptop className="h-4 w-4" />;
      case 'DESKTOP': return <Monitor className="h-4 w-4" />;
      case 'AIO': return <Monitor className="h-4 w-4" />;
      case 'WORKSTATION': return <Cpu className="h-4 w-4" />;
      case 'SERVER': return <HardDrive className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getAVStatus = (asset: PCAsset) => {
    if (!asset.antivirusName) {
      return <Badge variant="destructive">No AV</Badge>;
    }
    if (asset.avRealTimeProtection === false) {
      return <Badge variant="warning">AV Disabled</Badge>;
    }
    if (asset.avDefinitionDate) {
      const defDate = new Date(asset.avDefinitionDate);
      const daysOld = Math.floor((Date.now() - defDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOld > 7) {
        return <Badge variant="warning">AV Outdated</Badge>;
      }
    }
    return <Badge variant="success">AV Active</Badge>;
  };

  const StatCard = ({ title, value, icon: Icon, description, variant = 'default' }: {
    title: string;
    value: number;
    icon: any;
    description?: string;
    variant?: 'default' | 'warning' | 'danger';
  }) => {
    const bgColor = variant === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                    variant === 'danger' ? 'bg-red-50 dark:bg-red-900/20' : '';
    const iconColor = variant === 'warning' ? 'text-yellow-600' :
                      variant === 'danger' ? 'text-red-600' : 'text-primary';
    return (
      <Card className={bgColor}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
            <Icon className={`h-8 w-8 ${iconColor}`} />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Monitor className="h-8 w-8" />
            IT PC Management System
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage PC assets, licenses, and service history
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={() => router.push('/admin/pc-management/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add PC
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      {dashboardLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-20 bg-muted" />
            </Card>
          ))}
        </div>
      ) : dashboardStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="Total Assets"
            value={dashboardStats.summary.totalAssets}
            icon={Monitor}
          />
          <StatCard
            title="In Use"
            value={dashboardStats.summary.statusCounts.IN_USE || 0}
            icon={CheckCircle}
          />
          <StatCard
            title="Stock"
            value={dashboardStats.summary.statusCounts.STOCK || 0}
            icon={Box}
          />
          <StatCard
            title="Warranty Expiring"
            value={dashboardStats.summary.warrantyExpiringSoon}
            icon={Clock}
            description="Within 30 days"
            variant="warning"
          />
          <StatCard
            title="AV Outdated"
            value={dashboardStats.summary.avOutdated}
            icon={ShieldAlert}
            variant={dashboardStats.summary.avOutdated > 0 ? 'danger' : 'default'}
          />
          <StatCard
            title="Open Service Logs"
            value={dashboardStats.summary.openServiceLogs}
            icon={Wrench}
            variant={dashboardStats.summary.openServiceLogs > 0 ? 'warning' : 'default'}
          />
        </div>
      )}

      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="os-types" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            OS Types
          </TabsTrigger>
          <TabsTrigger value="office-types" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Office Products
          </TabsTrigger>
          <TabsTrigger value="service-logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Search & Filter</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search hostname, serial, user, IP, MAC..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterBranch || "all"} onValueChange={(value) => setFilterBranch(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.code} - {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus || "all"} onValueChange={(value) => setFilterStatus(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="IN_USE">In Use</SelectItem>
                  <SelectItem value="STOCK">Stock</SelectItem>
                  <SelectItem value="BROKEN">Broken</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="DISPOSED">Disposed</SelectItem>
                  <SelectItem value="RESERVED">Reserved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterFormFactor || "all"} onValueChange={(value) => setFilterFormFactor(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Form Factors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Form Factors</SelectItem>
                  <SelectItem value="LAPTOP">Laptop</SelectItem>
                  <SelectItem value="DESKTOP">Desktop</SelectItem>
                  <SelectItem value="AIO">All-in-One</SelectItem>
                  <SelectItem value="WORKSTATION">Workstation</SelectItem>
                  <SelectItem value="SERVER">Server</SelectItem>
                  <SelectItem value="THIN_CLIENT">Thin Client</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* PC Assets Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Specs</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Software</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading PC assets...
                      </TableCell>
                    </TableRow>
                  ) : pcAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No PC assets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    pcAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            {getFormFactorIcon(asset.formFactor)}
                            <div>
                              <span className="font-medium">{asset.pcName}</span>
                              {asset.assetTag && (
                                <span className="text-xs text-muted-foreground block">
                                  {asset.assetTag}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {asset.brand} {asset.model}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Cpu className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">{asset.processor}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3 text-muted-foreground" />
                              {asset.ram}GB RAM
                              {asset.storageCapacity && ` / ${asset.storageCapacity}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                            <div>
                              <span className="text-sm">{asset.branch.name}</span>
                              {asset.department && (
                                <span className="text-xs text-muted-foreground block">{asset.department}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {asset.assignedTo ? (
                            <div>
                              <span className="text-sm">{asset.assignedTo.name}</span>
                              <span className="text-xs text-muted-foreground block">
                                {asset.assignedTo.email}
                              </span>
                            </div>
                          ) : asset.assignedUserName ? (
                            <span className="text-sm">{asset.assignedUserName}</span>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {asset.operatingSystem && (
                              <Badge variant="outline" className="text-xs">
                                {asset.operatingSystem.name}
                              </Badge>
                            )}
                            {asset.officeProduct && (
                              <Badge variant="outline" className="text-xs">
                                {asset.officeProduct.name}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getAVStatus(asset)}
                            {asset.hardeningCompliant ? (
                              <Badge variant="success" className="flex items-center gap-1 w-fit">
                                <CheckCircle className="h-3 w-3" />
                                Hardened
                              </Badge>
                            ) : asset.lastHardeningDate ? (
                              <Badge variant="warning" className="flex items-center gap-1 w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                Non-compliant
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(asset.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/pc-management/${asset.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(asset.id)}
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
        </TabsContent>

        <TabsContent value="os-types">
          <OSTypesTab />
        </TabsContent>

        <TabsContent value="office-types">
          <OfficeTypesTab />
        </TabsContent>

        <TabsContent value="service-logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Service Logs</CardTitle>
              <CardDescription>Latest 10 service activities across all PC assets</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardStats?.recentServiceLogs && dashboardStats.recentServiceLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>PC Asset</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardStats.recentServiceLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.performedAt), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{log.pcName}</span>
                            {log.assetTag && (
                              <span className="text-xs text-muted-foreground block">{log.assetTag}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{log.branchName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.serviceType}</Badge>
                        </TableCell>
                        <TableCell>{log.performedBy}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'RESOLVED' ? 'success' : 'warning'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.cost ? `Rp ${Number(log.cost).toLocaleString('id-ID')}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent service logs</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
