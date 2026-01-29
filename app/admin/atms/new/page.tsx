'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Save, CreditCard, Server, MapPin, Network, FileText } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
}

// Known ATM brands for autocomplete suggestions
const KNOWN_ATM_BRANDS = ['Diebold', 'Diebold Nixdorf', 'Hyosung', 'Wincor'];

export default function NewATMPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [existingBrands, setExistingBrands] = useState<string[]>([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    branchId: '',
    location: '',
    ipAddress: '',
    latitude: '',
    longitude: '',
    // New hardware fields
    atmBrand: '',
    atmType: '',
    atmCategory: 'ATM' as 'ATM' | 'CRM',
    serialNumber: '',
    // New network fields
    networkMedia: '' as '' | 'VSAT' | 'M2M' | 'FO',
    networkVendor: '',
    // Notes
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    fetchBranches();
    fetchExistingBrands();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/admin/branches?limit=100&status=active');
      if (!response.ok) throw new Error('Failed to fetch branches');
      const data = await response.json();
      setBranches(data.branches);
    } catch (error) {
      toast.error('Failed to load branches');
    }
  };

  const fetchExistingBrands = async () => {
    try {
      const response = await fetch('/api/admin/atms?limit=1');
      if (response.ok) {
        const data = await response.json();
        if (data.filters?.brands) {
          setExistingBrands(data.filters.brands);
        }
      }
    } catch (error) {
      // Silently fail - will use default brands
    }
  };

  // Combine known brands with existing brands from database
  const allBrands = [...new Set([...KNOWN_ATM_BRANDS, ...existingBrands])].sort();

  // Filter brands based on input
  const filteredBrands = allBrands.filter(brand =>
    brand.toLowerCase().includes(formData.atmBrand.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name || !formData.branchId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        atmBrand: formData.atmBrand || undefined,
        atmType: formData.atmType || undefined,
        serialNumber: formData.serialNumber || undefined,
        networkMedia: formData.networkMedia || undefined,
        networkVendor: formData.networkVendor || undefined,
        notes: formData.notes || undefined,
      };

      const response = await fetch('/api/admin/atms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ATM');
      }

      toast.success('ATM created successfully');
      router.push('/admin/atms');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create ATM');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/atms">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to ATMs
          </Button>
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Add New ATM
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Enter the basic identification details for the ATM
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">ATM Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., ATM001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">ATM Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Branch ATM"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="branch">Branch *</Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </CardContent>
        </Card>

        {/* Hardware Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Hardware Information
            </CardTitle>
            <CardDescription>
              Specify the ATM hardware details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Label htmlFor="atmBrand">Brand</Label>
                <Input
                  id="atmBrand"
                  value={formData.atmBrand}
                  onChange={(e) => {
                    setFormData({ ...formData, atmBrand: e.target.value });
                    setShowBrandSuggestions(true);
                  }}
                  onFocus={() => setShowBrandSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
                  placeholder="e.g., Diebold Nixdorf"
                  autoComplete="off"
                />
                {showBrandSuggestions && formData.atmBrand && filteredBrands.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredBrands.map((brand) => (
                      <div
                        key={brand}
                        className="px-3 py-2 cursor-pointer hover:bg-accent text-sm"
                        onMouseDown={() => {
                          setFormData({ ...formData, atmBrand: brand });
                          setShowBrandSuggestions(false);
                        }}
                      >
                        {brand}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="atmType">Model/Type</Label>
                <Input
                  id="atmType"
                  value={formData.atmType}
                  onChange={(e) => setFormData({ ...formData, atmType: e.target.value })}
                  placeholder="e.g., Pro Cash 2050xe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="atmCategory">Category *</Label>
                <Select
                  value={formData.atmCategory}
                  onValueChange={(value: 'ATM' | 'CRM') => setFormData({ ...formData, atmCategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATM">ATM (Withdrawal Only)</SelectItem>
                    <SelectItem value="CRM">CRM (Cash Recycling Machine)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  placeholder="e.g., SN123456789"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Network Configuration
            </CardTitle>
            <CardDescription>
              Configure network settings for monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ipAddress">IP Address</Label>
              <Input
                id="ipAddress"
                value={formData.ipAddress}
                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                placeholder="e.g., 192.168.1.100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="networkMedia">Network Media</Label>
                <Select
                  value={formData.networkMedia}
                  onValueChange={(value: '' | 'VSAT' | 'M2M' | 'FO') => setFormData({ ...formData, networkMedia: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select network type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VSAT">VSAT (Satellite)</SelectItem>
                    <SelectItem value="M2M">M2M (Mobile)</SelectItem>
                    <SelectItem value="FO">FO (Fiber Optic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="networkVendor">Network Vendor</Label>
                <Input
                  id="networkVendor"
                  value={formData.networkVendor}
                  onChange={(e) => setFormData({ ...formData, networkVendor: e.target.value })}
                  placeholder="e.g., Telkom, Indosat"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
            <CardDescription>
              Physical location details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="location">Location Description</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Ground floor, near main entrance"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="e.g., -6.200000"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="e.g., 106.816666"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Additional Notes
            </CardTitle>
            <CardDescription>
              Any additional information about this ATM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Enter any additional notes or comments about this ATM..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/atms">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Creating...' : 'Create ATM'}
          </Button>
        </div>
      </form>
    </div>
  );
}
