'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BranchSelect } from '@/components/ui/branch-select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Plus, Trash2, HardDrive } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface StorageDevice {
  type: 'SSD' | 'HDD';
  size: string;
  brand: string;
}

interface OSType {
  id: string;
  label: string;
  value: string;
  type: string;
  architecture: string | null;
  raw: {
    id: string;
    name: string;
    version: string | null;
    type: string;
    architecture: string | null;
    edition: string | null;
  };
}

interface OfficeType {
  id: string;
  label: string;
  value: string;
  type: string;
  raw: {
    id: string;
    name: string;
    version: string | null;
    type: string;
    edition: string | null;
  };
}

export default function NewPCAssetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [osTypes, setOSTypes] = useState<OSType[]>([]);
  const [officeTypes, setOfficeTypes] = useState<OfficeType[]>([]);
  const [selectedOSType, setSelectedOSType] = useState('');
  const [selectedOfficeType, setSelectedOfficeType] = useState('');
  const [storageDevices, setStorageDevices] = useState<StorageDevice[]>([
    { type: 'SSD', size: '', brand: '' }
  ]);

  const [formData, setFormData] = useState({
    pcName: '',
    brand: '',
    model: '',
    serialNumber: '',
    processor: '',
    ram: '',
    macAddress: '',
    ipAddress: '',
    assignedToId: '',
    purchaseDate: '',
    purchaseOrderNumber: '',
    warrantyExpiry: '',
    assetTag: '',
    operatingSystemId: '',
    osLicenseType: 'OEM' as const,
    osSerialNumber: '',
    officeProductId: '',
    officeLicenseType: 'SUBSCRIPTION' as const,
    officeSerialNumber: '',
    antivirusName: '',
    antivirusVersion: '',
    antivirusLicenseExpiry: '',
    notes: ''
  });

  useEffect(() => {
    fetchBranches();
    fetchUsers();
    fetchPCAssetTypes();
  }, []);

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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPCAssetTypes = async () => {
    try {
      const response = await fetch('/api/admin/pc-assets/types');
      if (response.ok) {
        const data = await response.json();
        setOSTypes(data.operatingSystems || []);
        setOfficeTypes(data.officeProducts || []);
      }
    } catch (error) {
      console.error('Error fetching PC asset types:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addStorageDevice = () => {
    setStorageDevices(prev => [...prev, { type: 'HDD', size: '', brand: '' }]);
  };

  const removeStorageDevice = (index: number) => {
    setStorageDevices(prev => prev.filter((_, i) => i !== index));
  };

  const updateStorageDevice = (index: number, field: keyof StorageDevice, value: string) => {
    setStorageDevices(prev => prev.map((device, i) => 
      i === index ? { ...device, [field]: value } : device
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedBranch) {
      setError('Please select a branch');
      return;
    }

    // Validate storage devices
    const validStorageDevices = storageDevices.filter(d => d.size && d.brand);
    if (validStorageDevices.length === 0) {
      setError('Please add at least one storage device with size and brand');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/pc-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          branchId: selectedBranch,
          storageDevices: validStorageDevices,
          assignedToId: formData.assignedToId || null,
          purchaseDate: formData.purchaseDate || null,
          warrantyExpiry: formData.warrantyExpiry || null,
          antivirusLicenseExpiry: formData.antivirusLicenseExpiry || null,
          operatingSystemId: selectedOSType || null,
          officeProductId: selectedOfficeType || null
        })
      });

      if (response.ok) {
        router.push('/admin/pc-management');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create PC asset');
      }
    } catch (error) {
      console.error('Error creating PC asset:', error);
      setError('Failed to create PC asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <h1 className="text-3xl font-bold">Add New PC Asset</h1>
        <p className="text-muted-foreground mt-2">
          Register a new PC asset in the system
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Essential details about the PC asset
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pcName">PC Name *</Label>
                <Input
                  id="pcName"
                  name="pcName"
                  value={formData.pcName}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., PC-HO-001"
                />
              </div>

              <div>
                <Label htmlFor="assetTag">Asset Tag</Label>
                <Input
                  id="assetTag"
                  name="assetTag"
                  value={formData.assetTag}
                  onChange={handleInputChange}
                  placeholder="e.g., BSG-IT-2024-001"
                />
              </div>

              <div>
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Dell, HP, Lenovo"
                />
              </div>

              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="e.g., OptiPlex 7090"
                />
              </div>

              <div>
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 5CG1234ABC"
                />
              </div>

              <div>
                <Label htmlFor="branch">Branch *</Label>
                <BranchSelect
                  branches={branches}
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                  placeholder="Select branch"
                />
              </div>
            </CardContent>
          </Card>

          {/* Hardware Specifications */}
          <Card>
            <CardHeader>
              <CardTitle>Hardware Specifications</CardTitle>
              <CardDescription>
                Technical specifications of the PC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="processor">Processor *</Label>
                  <Input
                    id="processor"
                    name="processor"
                    value={formData.processor}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Intel Core i5-11400"
                  />
                </div>

                <div>
                  <Label htmlFor="ram">RAM *</Label>
                  <Input
                    id="ram"
                    name="ram"
                    value={formData.ram}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 16GB DDR4"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Storage Devices *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStorageDevice}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Storage
                  </Button>
                </div>
                <div className="space-y-2">
                  {storageDevices.map((device, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <HardDrive className="h-5 w-5 mt-2 text-muted-foreground" />
                      <Select 
                        value={device.type} 
                        onValueChange={(value) => updateStorageDevice(index, 'type', value as 'SSD' | 'HDD')}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SSD">SSD</SelectItem>
                          <SelectItem value="HDD">HDD</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Size (e.g., 512GB)"
                        value={device.size}
                        onChange={(e) => updateStorageDevice(index, 'size', e.target.value)}
                      />
                      <Input
                        placeholder="Brand (e.g., Samsung)"
                        value={device.brand}
                        onChange={(e) => updateStorageDevice(index, 'brand', e.target.value)}
                      />
                      {storageDevices.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStorageDevice(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="macAddress">MAC Address</Label>
                  <Input
                    id="macAddress"
                    name="macAddress"
                    value={formData.macAddress}
                    onChange={handleInputChange}
                    placeholder="e.g., 00:1B:44:11:3A:B7"
                  />
                </div>

                <div>
                  <Label htmlFor="ipAddress">IP Address</Label>
                  <Input
                    id="ipAddress"
                    name="ipAddress"
                    value={formData.ipAddress}
                    onChange={handleInputChange}
                    placeholder="e.g., 192.168.1.100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operating System */}
          <Card>
            <CardHeader>
              <CardTitle>Operating System</CardTitle>
              <CardDescription>
                Select the operating system for this PC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="osType">Select Operating System *</Label>
                <Select 
                  value={selectedOSType} 
                  onValueChange={(value) => {
                    setSelectedOSType(value);
                    setFormData(prev => ({
                      ...prev,
                      operatingSystemId: value
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an operating system" />
                  </SelectTrigger>
                  <SelectContent>
                    {osTypes.length === 0 ? (
                      <SelectItem value="none" disabled>No OS types available</SelectItem>
                    ) : (
                      osTypes.map(os => (
                        <SelectItem 
                          key={os.id} 
                          value={os.value}
                        >
                          {os.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedOSType && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="osLicenseType">License Type</Label>
                    <Select
                      value={formData.osLicenseType}
                      onValueChange={(value) => handleSelectChange('osLicenseType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OEM">OEM</SelectItem>
                        <SelectItem value="FPP">FPP (Full Package Product)</SelectItem>
                        <SelectItem value="OLP">OLP (Open License Program)</SelectItem>
                        <SelectItem value="VOLUME">Volume License</SelectItem>
                        <SelectItem value="OPEN_SOURCE">Open Source</SelectItem>
                        <SelectItem value="TRIAL">Trial</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="osSerialNumber">OS Serial Number (Optional)</Label>
                    <Input
                      id="osSerialNumber"
                      name="osSerialNumber"
                      value={formData.osSerialNumber}
                      onChange={handleInputChange}
                      placeholder="e.g., XXXXX-XXXXX-XXXXX-XXXXX"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Office Suite */}
          <Card>
            <CardHeader>
              <CardTitle>Office Suite (Optional)</CardTitle>
              <CardDescription>
                Select the Office product for this PC (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="officeType">Select Office Product (Optional)</Label>
                <Select
                  value={selectedOfficeType || "none"}
                  onValueChange={(value) => {
                    const actualValue = value === "none" ? "" : value;
                    setSelectedOfficeType(actualValue);
                    setFormData(prev => ({
                      ...prev,
                      officeProductId: actualValue || null
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an Office product (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Office Product</SelectItem>
                    {officeTypes.map(office => (
                      <SelectItem 
                        key={office.id} 
                        value={office.value}
                      >
                        {office.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOfficeType && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="officeLicenseType">License Type</Label>
                    <Select
                      value={formData.officeLicenseType}
                      onValueChange={(value) => handleSelectChange('officeLicenseType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OEM">OEM</SelectItem>
                        <SelectItem value="FPP">FPP (Full Package Product)</SelectItem>
                        <SelectItem value="OLP">OLP (Open License Program)</SelectItem>
                        <SelectItem value="VOLUME">Volume License</SelectItem>
                        <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                        <SelectItem value="OPEN_SOURCE">Open Source</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="officeSerialNumber">Office Serial Number (Optional)</Label>
                    <Input
                      id="officeSerialNumber"
                      name="officeSerialNumber"
                      value={formData.officeSerialNumber}
                      onChange={handleInputChange}
                      placeholder="e.g., XXXXX-XXXXX-XXXXX-XXXXX"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security & Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle>Security & Additional Information</CardTitle>
              <CardDescription>
                Antivirus, purchase details, and assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="antivirusName">Antivirus Name</Label>
                  <Input
                    id="antivirusName"
                    name="antivirusName"
                    value={formData.antivirusName}
                    onChange={handleInputChange}
                    placeholder="e.g., Windows Defender"
                  />
                </div>

                <div>
                  <Label htmlFor="antivirusVersion">Antivirus Version</Label>
                  <Input
                    id="antivirusVersion"
                    name="antivirusVersion"
                    value={formData.antivirusVersion}
                    onChange={handleInputChange}
                    placeholder="e.g., 4.18.2301.6"
                  />
                </div>

                <div>
                  <Label htmlFor="antivirusLicenseExpiry">License Expiry</Label>
                  <Input
                    id="antivirusLicenseExpiry"
                    name="antivirusLicenseExpiry"
                    type="date"
                    value={formData.antivirusLicenseExpiry}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assignedToId">Assigned To</Label>
                  <Select 
                    value={formData.assignedToId || "unassigned"} 
                    onValueChange={(value) => handleSelectChange('assignedToId', value === 'unassigned' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="purchaseOrderNumber">Purchase Order Number</Label>
                  <Input
                    id="purchaseOrderNumber"
                    name="purchaseOrderNumber"
                    value={formData.purchaseOrderNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., PO-2024-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    name="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                  <Input
                    id="warrantyExpiry"
                    name="warrantyExpiry"
                    type="date"
                    value={formData.warrantyExpiry}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes or comments..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Creating...' : 'Create PC Asset'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}