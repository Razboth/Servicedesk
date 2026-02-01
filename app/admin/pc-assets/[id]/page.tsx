'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BranchSelect } from '@/components/ui/branch-select';
import { toast } from 'sonner';
import {
  Monitor,
  ArrowLeft,
  Save,
  Wrench,
  Shield,
  QrCode,
  Info,
  Calendar,
  User,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { PCAssetQRTab } from '@/components/pc-assets/pc-asset-qr-tab';
import { ServiceLogsTab } from '@/components/pc-assets/service-logs-tab';
import { HardeningTab } from '@/components/pc-assets/hardening-tab';

interface PCAsset {
  id: string;
  pcName: string;
  brand: string;
  model: string | null;
  serialNumber: string | null;
  assetTag: string | null;
  processor: string;
  ram: number;
  formFactor: string | null;
  storageType: string | null;
  storageCapacity: string | null;
  macAddress: string | null;
  ipAddress: string | null;
  purchaseDate: string | null;
  purchaseOrderNumber: string | null;
  warrantyExpiry: string | null;
  status: string;
  isActive: boolean;
  notes: string | null;
  department: string | null;
  assignedUserName: string | null;
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
  osProductKey: string | null;
  officeLicenseType: string | null;
  officeLicenseAccount: string | null;
  antivirusName: string | null;
  antivirusVersion: string | null;
  antivirusLicenseExpiry: string | null;
  serviceLogs: any[];
  hardeningChecklists: any[];
  createdBy: {
    id: string;
    name: string;
  };
}

const STATUS_OPTIONS = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'DEPLOYED', label: 'Deployed' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'DISPOSED', label: 'Disposed' }
];

const FORM_FACTOR_OPTIONS = [
  { value: 'DESKTOP', label: 'Desktop' },
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'ALL_IN_ONE', label: 'All-in-One' },
  { value: 'MINI_PC', label: 'Mini PC' },
  { value: 'WORKSTATION', label: 'Workstation' }
];

const tabConfig = [
  { id: 'details', label: 'Details', icon: Info },
  { id: 'service-logs', label: 'Service Logs', icon: Wrench },
  { id: 'hardening', label: 'Hardening', icon: Shield },
  { id: 'qr-code', label: 'QR Code', icon: QrCode },
];

export default function PCAssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [asset, setAsset] = useState<PCAsset | null>(null);
  const [formData, setFormData] = useState<Partial<PCAsset>>({});
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [osTypes, setOsTypes] = useState<any[]>([]);
  const [officeTypes, setOfficeTypes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchAsset();
    fetchOptions();
  }, [params.id]);

  const fetchAsset = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/pc-assets/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch asset');

      const data = await response.json();
      setAsset(data);
      setFormData({
        pcName: data.pcName,
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        assetTag: data.assetTag,
        processor: data.processor,
        ram: data.ram,
        formFactor: data.formFactor,
        storageType: data.storageType,
        storageCapacity: data.storageCapacity,
        macAddress: data.macAddress,
        ipAddress: data.ipAddress,
        purchaseDate: data.purchaseDate?.slice(0, 10),
        purchaseOrderNumber: data.purchaseOrderNumber,
        warrantyExpiry: data.warrantyExpiry?.slice(0, 10),
        status: data.status,
        isActive: data.isActive,
        notes: data.notes,
        department: data.department,
        branchId: data.branch?.id,
        assignedToId: data.assignedTo?.id,
        operatingSystemId: data.operatingSystem?.id,
        officeProductId: data.officeProduct?.id,
        osLicenseType: data.osLicenseType,
        osProductKey: data.osProductKey,
        officeLicenseType: data.officeLicenseType,
        officeLicenseAccount: data.officeLicenseAccount,
        antivirusName: data.antivirusName,
        antivirusVersion: data.antivirusVersion,
        antivirusLicenseExpiry: data.antivirusLicenseExpiry?.slice(0, 10)
      });
    } catch (error) {
      toast.error('Failed to load PC asset');
      router.push('/admin/pc-assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [branchRes, userRes, osRes, officeRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/users'),
        fetch('/api/admin/pc-assets/os-types'),
        fetch('/api/admin/pc-assets/office-types')
      ]);

      if (branchRes.ok) setBranches(await branchRes.json());
      if (userRes.ok) setUsers(await userRes.json());
      if (osRes.ok) setOsTypes(await osRes.json());
      if (officeRes.ok) setOfficeTypes(await officeRes.json());
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/pc-assets/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update asset');
      }

      toast.success('PC asset updated successfully');
      fetchAsset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update asset');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Asset not found</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/admin/pc-assets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Monitor className="h-6 w-6" />
              {asset.pcName}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              {asset.branch.name}
              {asset.assignedTo && (
                <>
                  <span className="mx-2">|</span>
                  <User className="h-4 w-4" />
                  {asset.assignedTo.name}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={asset.isActive ? 'success' : 'secondary'}>
            {asset.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge>{asset.status}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="border-b mb-6">
          <nav className="flex gap-6 overflow-x-auto" aria-label="Tabs">
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              let badgeCount = 0;
              if (tab.id === 'service-logs') badgeCount = asset.serviceLogs.length;
              if (tab.id === 'hardening') badgeCount = asset.hardeningChecklists.length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                    ${isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">
                    {tab.id === 'service-logs' ? 'Service' : tab.id === 'qr-code' ? 'QR' : tab.label}
                  </span>
                  {badgeCount > 0 && (
                    <Badge variant="secondary" className="ml-1">{badgeCount}</Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pcName">PC Name *</Label>
                      <Input
                        id="pcName"
                        value={formData.pcName || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, pcName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assetTag">Asset Tag</Label>
                      <Input
                        id="assetTag"
                        value={formData.assetTag || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, assetTag: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand *</Label>
                      <Input
                        id="brand"
                        value={formData.brand || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={formData.model || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serialNumber">Serial Number</Label>
                      <Input
                        id="serialNumber"
                        value={formData.serialNumber || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="formFactor">Form Factor</Label>
                      <Select
                        value={formData.formFactor || ''}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, formFactor: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select form factor" />
                        </SelectTrigger>
                        <SelectContent>
                          {FORM_FACTOR_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status || ''}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Active</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                        />
                        <span className="text-sm text-gray-500">
                          {formData.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hardware */}
              <Card>
                <CardHeader>
                  <CardTitle>Hardware Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="processor">Processor</Label>
                    <Input
                      id="processor"
                      value={formData.processor || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, processor: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ram">RAM (GB)</Label>
                      <Input
                        id="ram"
                        type="number"
                        value={formData.ram || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, ram: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storageCapacity">Storage</Label>
                      <Input
                        id="storageCapacity"
                        placeholder="e.g., 512GB SSD"
                        value={formData.storageCapacity || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, storageCapacity: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="macAddress">MAC Address</Label>
                      <Input
                        id="macAddress"
                        placeholder="XX:XX:XX:XX:XX:XX"
                        value={formData.macAddress || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, macAddress: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ipAddress">IP Address</Label>
                      <Input
                        id="ipAddress"
                        placeholder="xxx.xxx.xxx.xxx"
                        value={formData.ipAddress || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location & Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle>Location & Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Branch *</Label>
                    <BranchSelect
                      branches={branches}
                      value={formData.branchId || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, branchId: value }))}
                      placeholder="Select branch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned To</Label>
                    <Select
                      value={formData.assignedToId || 'unassigned'}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        assignedToId: value === 'unassigned' ? null : value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Purchase & Warranty */}
              <Card>
                <CardHeader>
                  <CardTitle>Purchase & Warranty</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate">Purchase Date</Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={formData.purchaseDate || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                      <Input
                        id="warrantyExpiry"
                        type="date"
                        value={formData.warrantyExpiry || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, warrantyExpiry: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchaseOrderNumber">Purchase Order Number</Label>
                    <Input
                      id="purchaseOrderNumber"
                      value={formData.purchaseOrderNumber || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchaseOrderNumber: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Software */}
              <Card>
                <CardHeader>
                  <CardTitle>Software</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Operating System</Label>
                    <Select
                      value={formData.operatingSystemId || 'none'}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        operatingSystemId: value === 'none' ? null : value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select OS" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {osTypes.map((os: any) => (
                          <SelectItem key={os.id} value={os.id}>
                            {os.name} {os.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Office Product</Label>
                    <Select
                      value={formData.officeProductId || 'none'}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        officeProductId: value === 'none' ? null : value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Office" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {officeTypes.map((office: any) => (
                          <SelectItem key={office.id} value={office.id}>
                            {office.name} {office.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Antivirus */}
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="antivirusName">Antivirus</Label>
                      <Input
                        id="antivirusName"
                        value={formData.antivirusName || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, antivirusName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="antivirusVersion">Version</Label>
                      <Input
                        id="antivirusVersion"
                        value={formData.antivirusVersion || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, antivirusVersion: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="antivirusLicenseExpiry">License Expiry</Label>
                    <Input
                      id="antivirusLicenseExpiry"
                      type="date"
                      value={formData.antivirusLicenseExpiry || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, antivirusLicenseExpiry: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Additional notes..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-6">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}

        {/* Service Logs Tab */}
        {activeTab === 'service-logs' && (
          <ServiceLogsTab
            assetId={asset.id}
            assetName={asset.pcName}
            serviceLogs={asset.serviceLogs}
            onRefresh={fetchAsset}
          />
        )}

        {/* Hardening Tab */}
        {activeTab === 'hardening' && (
          <HardeningTab
            assetId={asset.id}
            assetName={asset.pcName}
            hardeningChecklists={asset.hardeningChecklists}
            onRefresh={fetchAsset}
          />
        )}

        {/* QR Code Tab */}
        {activeTab === 'qr-code' && (
          <PCAssetQRTab
            asset={{
              id: asset.id,
              pcName: asset.pcName,
              assetTag: asset.assetTag,
              serialNumber: asset.serialNumber,
              branch: asset.branch
            }}
          />
        )}
      </div>
    </div>
  );
}
