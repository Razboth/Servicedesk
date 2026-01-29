'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Building2,
  ArrowLeft,
  Users,
  Ticket,
  CreditCard,
  User,
  Mail,
  Network,
  Wifi,
  Globe,
  MapPin,
  Save,
  Loader2,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(100),
  code: z.string().min(1, 'Branch code is required').max(20),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  ipAddress: z.string().optional(),
  backupIpAddress: z.string().optional(),
  monitoringEnabled: z.boolean().default(false),
  networkMedia: z.enum(['VSAT', 'M2M', 'FO']).optional().nullable(),
  networkVendor: z.string().optional(),
  isActive: z.boolean().default(true)
});

type FormData = z.infer<typeof formSchema>;

interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
  backupIpAddress?: string;
  monitoringEnabled: boolean;
  networkMedia?: 'VSAT' | 'M2M' | 'FO' | null;
  networkVendor?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    tickets: number;
    atms: number;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  atms: Array<{
    id: string;
    code: string;
    name: string;
    location: string;
  }>;
}

// Tab configuration
const tabs = [
  { id: 'details', label: 'Branch Details', icon: Building2 },
  { id: 'network', label: 'Network Settings', icon: Network },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'atms', label: 'ATMs', icon: CreditCard },
];

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      province: '',
      latitude: '',
      longitude: '',
      ipAddress: '',
      backupIpAddress: '',
      monitoringEnabled: false,
      networkMedia: null,
      networkVendor: '',
      isActive: true
    }
  });

  useEffect(() => {
    fetchBranch();
  }, [branchId]);

  const fetchBranch = async () => {
    try {
      const response = await fetch(`/api/admin/branches/${branchId}`);
      if (!response.ok) throw new Error('Failed to fetch branch');

      const data = await response.json();
      setBranch(data);

      // Update form with branch data
      form.reset({
        name: data.name,
        code: data.code,
        address: data.address || '',
        city: data.city || '',
        province: data.province || '',
        latitude: data.latitude ? String(data.latitude) : '',
        longitude: data.longitude ? String(data.longitude) : '',
        ipAddress: data.ipAddress || '',
        backupIpAddress: data.backupIpAddress || '',
        monitoringEnabled: data.monitoringEnabled || false,
        networkMedia: data.networkMedia || null,
        networkVendor: data.networkVendor || '',
        isActive: data.isActive
      });
    } catch (error) {
      console.error('Error fetching branch:', error);
      toast.error('Failed to load branch details');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/admin/branches/${branchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update branch');
      }

      toast.success('Branch updated successfully');
      router.push('/admin/branches');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update branch');
    } finally {
      setLoading(false);
    }
  };

  // Get badge count for tabs
  const getTabBadge = (tabId: string) => {
    if (!branch) return null;
    switch (tabId) {
      case 'users':
        return branch._count.users;
      case 'atms':
        return branch._count.atms;
      default:
        return null;
    }
  };

  if (!branch) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading branch details...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 max-w-6xl">
      {/* Back Button */}
      <Link href="/admin/branches">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Branches
        </Button>
      </Link>

      {/* Header Card */}
      <Card className="mb-6 shadow-sm bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{branch.name}</h1>
                <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                  <Badge variant="outline" className="font-mono">
                    {branch.code}
                  </Badge>
                  {branch.city && (
                    <span className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3.5 w-3.5" />
                      {branch.city}{branch.province ? `, ${branch.province}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {branch.monitoringEnabled && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                  <Wifi className="h-3 w-3 mr-1" />
                  Monitoring
                </Badge>
              )}
              <Badge
                variant={branch.isActive ? 'default' : 'secondary'}
                className={branch.isActive ? 'bg-green-500/10 text-green-600 border-green-200' : ''}
              >
                {branch.isActive ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{branch._count.users}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
                <p className="text-3xl font-bold">{branch._count.tickets}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/10">
                <Ticket className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total ATMs</p>
                <p className="text-3xl font-bold">{branch._count.atms}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <CreditCard className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Underline Tab Navigation */}
      <div className="border-b mb-6">
        <nav className="flex gap-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const badge = getTabBadge(tab.id);
            const isActive = activeTab === tab.id;

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
                {tab.label}
                {badge !== null && badge > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Branch Information
                </CardTitle>
                <CardDescription>
                  Basic identification details for this branch
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch Code</FormLabel>
                        <FormControl>
                          <Input {...field} disabled className="font-mono bg-muted" />
                        </FormControl>
                        <FormDescription>
                          Branch code cannot be changed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Province</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/30">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">Active Status</FormLabel>
                        <FormDescription>
                          Deactivating will prevent new operations for this branch
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/admin/branches">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="min-w-[140px]">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {activeTab === 'network' && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Network className="h-5 w-5" />
                  Network Configuration
                </CardTitle>
                <CardDescription>
                  Configure network monitoring and connectivity settings
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <FormField
                  control={form.control}
                  name="monitoringEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-blue-500/5 border-blue-200">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium flex items-center gap-2">
                          <Wifi className="h-4 w-4 text-blue-500" />
                          Network Monitoring
                        </FormLabel>
                        <FormDescription>
                          Enable real-time network monitoring for this branch
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ipAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Primary IP Address
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., 192.168.1.1"
                            className="font-mono"
                          />
                        </FormControl>
                        <FormDescription>
                          Main IP address for network monitoring
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="backupIpAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Backup IP Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., 192.168.1.2"
                            className="font-mono"
                          />
                        </FormControl>
                        <FormDescription>
                          Fallback IP address if primary fails
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="networkMedia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Network Media Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select network media" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="VSAT">VSAT (Satellite)</SelectItem>
                            <SelectItem value="M2M">M2M (Mobile)</SelectItem>
                            <SelectItem value="FO">Fiber Optic (FO)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Type of network connection
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="networkVendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Network Vendor</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Telkom, Indosat"
                          />
                        </FormControl>
                        <FormDescription>
                          Network service provider
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Geographic Location
                </CardTitle>
                <CardDescription>
                  Coordinates for map display and location services
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., 1.4748"
                            type="number"
                            step="any"
                            className="font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., 124.8421"
                            type="number"
                            step="any"
                            className="font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Coordinates are used to display the branch on the network monitoring map at{' '}
                  <Link href="/monitoring/branches" className="text-primary hover:underline">
                    /monitoring/branches
                  </Link>
                </p>
              </CardContent>
            </Card>

            {/* Current Monitoring Status */}
            {branch.monitoringEnabled && (
              <Card className="shadow-sm border-blue-200 bg-blue-500/5">
                <CardHeader className="border-b border-blue-200 bg-blue-500/10">
                  <CardTitle className="flex items-center gap-2 text-lg text-blue-700">
                    <Wifi className="h-5 w-5" />
                    Current Monitoring Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block mb-1">Primary IP</span>
                      <p className="font-mono font-medium">{branch.ipAddress || 'Not configured'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Backup IP</span>
                      <p className="font-mono font-medium">{branch.backupIpAddress || 'Not configured'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Media Type</span>
                      <p className="font-medium">{branch.networkMedia || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Vendor</span>
                      <p className="font-medium">{branch.networkVendor || 'Not specified'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/admin/branches">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="min-w-[180px]">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Network Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {activeTab === 'users' && (
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Branch Users
            </CardTitle>
            <CardDescription>
              Users assigned to this branch
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {branch.users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">No users assigned</p>
                <p className="text-sm">No users have been assigned to this branch yet</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">User</th>
                      <th className="text-left p-3 font-semibold">Email</th>
                      <th className="text-left p-3 font-semibold">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {branch.users.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {user.email}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{user.role}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Link href={`/admin/users?branchId=${branchId}`}>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  View All Users
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'atms' && (
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Branch ATMs
            </CardTitle>
            <CardDescription>
              ATMs assigned to this branch
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {branch.atms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">No ATMs assigned</p>
                <p className="text-sm">No ATMs have been assigned to this branch yet</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">ATM</th>
                      <th className="text-left p-3 font-semibold">Code</th>
                      <th className="text-left p-3 font-semibold">Location</th>
                      <th className="text-right p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {branch.atms.map((atm) => (
                      <tr key={atm.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center">
                              <CreditCard className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="font-medium">{atm.name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="font-mono">
                            {atm.code}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {atm.location || '-'}
                        </td>
                        <td className="p-3 text-right">
                          <Link href={`/admin/atms/${atm.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Link href={`/admin/atms?branchId=${branchId}`}>
                <Button variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  View All ATMs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
