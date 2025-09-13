'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Calendar,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  Key,
  ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import OSTypesTab from '@/components/pc-assets/os-types-tab';
import OfficeTypesTab from '@/components/pc-assets/office-types-tab';

interface PCAsset {
  id: string;
  pcName: string;
  brand: string;
  model: string | null;
  serialNumber: string | null;
  processor: string;
  ram: string;
  storageDevices: any;
  macAddress: string | null;
  ipAddress: string | null;
  osName: string;
  osVersion: string | null;
  osLicenseType: string;
  antivirusName: string | null;
  antivirusLicenseExpiry: string | null;
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

export default function PCAssetsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [pcAssets, setPCAssets] = useState<PCAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    fetchBranches();
    fetchPCAssets();
  }, [search, filterBranch, filterStatus]);

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

  const fetchPCAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterBranch) params.append('branchId', filterBranch);
      if (filterStatus === 'active') params.append('isActive', 'true');
      else if (filterStatus === 'inactive') params.append('isActive', 'false');

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
    } catch (error) {
      toast.error('Failed to delete PC asset');
    }
  };

  const getComplianceIcon = (asset: PCAsset) => {
    if (!asset.lastHardeningDate) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return asset.hardeningCompliant 
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getAntivirusStatus = (asset: PCAsset) => {
    if (!asset.antivirusName) {
      return <Badge variant="destructive">No Antivirus</Badge>;
    }
    if (!asset.antivirusLicenseExpiry) {
      return <Badge variant="secondary">{asset.antivirusName}</Badge>;
    }
    const expiry = new Date(asset.antivirusLicenseExpiry);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">{asset.antivirusName} (Expired)</Badge>;
    } else if (daysUntilExpiry < 30) {
      return <Badge variant="warning">{asset.antivirusName} (Expires soon)</Badge>;
    }
    return <Badge variant="success">{asset.antivirusName}</Badge>;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Monitor className="h-8 w-8" />
          PC Asset & License Management
        </h1>
      </div>

      <Tabs defaultValue="assets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            PC Assets
          </TabsTrigger>
          <TabsTrigger value="os-types" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Operating Systems
          </TabsTrigger>
          <TabsTrigger value="office-types" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Office Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/pc-assets/import')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={() => router.push('/admin/pc-assets/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add PC Asset
            </Button>
          </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search and Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, brand, IP, MAC, serial number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterBranch || "all"} onValueChange={(value) => setFilterBranch(value === "all" ? "" : value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PC Name</TableHead>
                <TableHead>Hardware</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Operating System</TableHead>
                <TableHead>Licenses</TableHead>
                <TableHead>Security</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading PC assets...
                  </TableCell>
                </TableRow>
              ) : pcAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    No PC assets found
                  </TableCell>
                </TableRow>
              ) : (
                pcAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{asset.pcName}</span>
                        <span className="text-sm text-gray-500">
                          {asset.brand} {asset.model}
                        </span>
                        {asset.ipAddress && (
                          <span className="text-xs text-gray-400">
                            IP: {asset.ipAddress}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <div className="flex items-center gap-1">
                          <Cpu className="h-3 w-3" />
                          {asset.processor}
                        </div>
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {asset.ram}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {asset.branch.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {asset.assignedTo ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{asset.assignedTo.name}</span>
                          <span className="text-xs text-gray-500">
                            {asset.assignedTo.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">{asset.osName}</span>
                        <Badge variant="outline" className="w-fit text-xs">
                          {asset.osLicenseType}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {asset._count.osLicenses > 0 && (
                          <Badge variant="outline" className="text-xs">
                            OS: {asset._count.osLicenses}
                          </Badge>
                        )}
                        {asset._count.officeLicenses > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Office: {asset._count.officeLicenses}
                          </Badge>
                        )}
                        {asset._count.osLicenses === 0 && asset._count.officeLicenses === 0 && (
                          <span className="text-xs text-gray-400">No licenses</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          {getComplianceIcon(asset)}
                          <span className="text-sm">
                            {asset.hardeningCompliant ? 'Compliant' : 
                             asset.lastHardeningDate ? 'Non-compliant' : 'Not hardened'}
                          </span>
                        </div>
                        {getAntivirusStatus(asset)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {asset._count.serviceLogs > 0 && (
                          <Badge variant="secondary">
                            <FileText className="h-3 w-3 mr-1" />
                            {asset._count.serviceLogs}
                          </Badge>
                        )}
                        {asset._count.hardeningChecklists > 0 && (
                          <Badge variant="secondary">
                            <Shield className="h-3 w-3 mr-1" />
                            {asset._count.hardeningChecklists}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={asset.isActive ? 'success' : 'secondary'}>
                        {asset.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/pc-assets/${asset.id}`)}
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
      </Tabs>
    </div>
  );
}