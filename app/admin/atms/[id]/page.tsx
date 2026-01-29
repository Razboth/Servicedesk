'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  CreditCard,
  Loader2,
  Building2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Wrench,
  Banknote,
  Activity,
  Clock,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface ATM {
  id: string;
  code: string;
  name: string;
  branchId: string;
  location?: string;
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  atmBrand?: string;
  atmType?: string;
  atmCategory: 'ATM' | 'CRM';
  serialNumber?: string;
  notes?: string;
  networkMedia?: string;
  networkVendor?: string;
  branch: {
    id: string;
    name: string;
    code: string;
    city?: string;
  };
  incidents: any[];
  monitoringLogs: any[];
  networkStatus?: {
    status: string;
    responseTimeMs?: number;
    checkedAt?: string;
    downSince?: string;
  };
  _count: {
    incidents: number;
    technicalIssueTickets: number;
    claimTickets: number;
  };
}

interface Ticket {
  id: string;
  number: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt?: string;
  creator?: { id: string; name: string };
  assignee?: { id: string; name: string };
  service?: { id: string; name: string };
  errorType?: string;
  customerName?: string;
  transactionAmount?: string;
  transactionDate?: string;
  verification?: {
    recommendation?: string;
    verifiedAt?: string;
    cashVariance?: number;
  };
}

export default function ATMDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [atm, setATM] = useState<ATM | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'details');
  const [technicalIssues, setTechnicalIssues] = useState<Ticket[]>([]);
  const [claims, setClaims] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    branchId: '',
    location: '',
    ipAddress: '',
    latitude: '',
    longitude: '',
    isActive: true,
    atmBrand: '',
    atmType: '',
    atmCategory: 'ATM' as 'ATM' | 'CRM',
    serialNumber: '',
    notes: '',
    networkMedia: '',
    networkVendor: '',
  });

  useEffect(() => {
    Promise.all([fetchATM(), fetchBranches()]);
  }, [id]);

  useEffect(() => {
    if (activeTab === 'tickets' || activeTab === 'claims') {
      fetchTickets();
    }
  }, [activeTab, id]);

  const fetchATM = async () => {
    try {
      const response = await fetch(`/api/admin/atms/${id}`);
      if (!response.ok) throw new Error('Failed to fetch ATM');

      const data: ATM = await response.json();
      setATM(data);
      setFormData({
        code: data.code,
        name: data.name,
        branchId: data.branchId,
        location: data.location || '',
        ipAddress: data.ipAddress || '',
        latitude: data.latitude?.toString() || '',
        longitude: data.longitude?.toString() || '',
        isActive: data.isActive,
        atmBrand: data.atmBrand || '',
        atmType: data.atmType || '',
        atmCategory: data.atmCategory || 'ATM',
        serialNumber: data.serialNumber || '',
        notes: data.notes || '',
        networkMedia: data.networkMedia || '',
        networkVendor: data.networkVendor || '',
      });
    } catch (error) {
      toast.error('Failed to load ATM details');
      router.push('/admin/atms');
    } finally {
      setLoading(false);
    }
  };

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

  const fetchTickets = async () => {
    try {
      setTicketsLoading(true);
      const response = await fetch(`/api/admin/atms/${id}/tickets?type=all`);
      if (!response.ok) throw new Error('Failed to fetch tickets');
      const data = await response.json();
      setTechnicalIssues(data.technicalIssues || []);
      setClaims(data.claims || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name || !formData.branchId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        atmBrand: formData.atmBrand || null,
        atmType: formData.atmType || null,
        serialNumber: formData.serialNumber || null,
        notes: formData.notes || null,
        networkMedia: formData.networkMedia || null,
        networkVendor: formData.networkVendor || null,
      };

      const response = await fetch(`/api/admin/atms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update ATM');
      }

      toast.success('ATM updated successfully');
      fetchATM();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update ATM');
    } finally {
      setSaving(false);
    }
  };

  const getNetworkStatusBadge = () => {
    if (!atm?.networkStatus) {
      return <Badge variant="outline" className="text-gray-400">No Data</Badge>;
    }

    const status = atm.networkStatus.status;
    switch (status) {
      case 'ONLINE':
        return (
          <Badge variant="success" className="gap-1">
            <Wifi className="h-3 w-3" />
            Online
          </Badge>
        );
      case 'OFFLINE':
        return (
          <Badge variant="destructive" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Offline
          </Badge>
        );
      case 'SLOW':
      case 'WARNING':
        return (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {status}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="destructive">Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">In Progress</Badge>;
      case 'RESOLVED':
        return <Badge variant="success">Resolved</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!atm) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
        <div className="text-center py-8">ATM not found</div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/atms">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to ATMs
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              {atm.name}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
              <span className="font-mono">{atm.code}</span>
              <span>|</span>
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {atm.branch.name}
              </span>
              <span>|</span>
              <Badge variant={atm.atmCategory === 'CRM' ? 'default' : 'secondary'}>
                {atm.atmCategory}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={atm.isActive ? 'success' : 'secondary'}>
              {atm.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {getNetworkStatusBadge()}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{atm._count.incidents}</p>
                <p className="text-sm text-muted-foreground">Active Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{atm._count.technicalIssueTickets}</p>
                <p className="text-sm text-muted-foreground">Tech Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{atm._count.claimTickets}</p>
                <p className="text-sm text-muted-foreground">ATM Claims</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {atm.networkStatus?.responseTimeMs ? `${atm.networkStatus.responseTimeMs}ms` : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="details">ATM Details</TabsTrigger>
          <TabsTrigger value="network">Network & Monitoring</TabsTrigger>
          <TabsTrigger value="tickets">
            Technical Issues ({atm._count.technicalIssueTickets})
          </TabsTrigger>
          <TabsTrigger value="claims">
            ATM Claims ({atm._count.claimTickets})
          </TabsTrigger>
          <TabsTrigger value="incidents">
            Incidents ({atm._count.incidents})
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
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
                            {branch.code} - {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Ground floor, near entrance"
                    />
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
                  <CardTitle>Hardware Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="atmBrand">ATM Brand</Label>
                      <Input
                        id="atmBrand"
                        value={formData.atmBrand}
                        onChange={(e) => setFormData({ ...formData, atmBrand: e.target.value })}
                        placeholder="e.g., Diebold, Wincor"
                        list="brands-list"
                      />
                      <datalist id="brands-list">
                        <option value="Diebold" />
                        <option value="Diebold Nixdorf" />
                        <option value="Hyosung" />
                        <option value="Wincor" />
                      </datalist>
                    </div>
                    <div>
                      <Label htmlFor="atmType">ATM Model/Type</Label>
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
                      <Label htmlFor="atmCategory">Category</Label>
                      <Select
                        value={formData.atmCategory}
                        onValueChange={(value: 'ATM' | 'CRM') => setFormData({ ...formData, atmCategory: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ATM">ATM (Standard)</SelectItem>
                          <SelectItem value="CRM">CRM (Cash Recycling)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="serialNumber">Serial Number</Label>
                      <Input
                        id="serialNumber"
                        value={formData.serialNumber}
                        onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                        placeholder="Hardware serial number"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Network Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Network Configuration</CardTitle>
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
                        onValueChange={(value) => setFormData({ ...formData, networkMedia: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select media type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VSAT">VSAT</SelectItem>
                          <SelectItem value="M2M">M2M</SelectItem>
                          <SelectItem value="FO">Fiber Optic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="networkVendor">Network Vendor</Label>
                      <Input
                        id="networkVendor"
                        value={formData.networkVendor}
                        onChange={(e) => setFormData({ ...formData, networkVendor: e.target.value })}
                        placeholder="e.g., Telkom, XL"
                      />
                    </div>
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
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this ATM..."
                    rows={5}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Network & Monitoring Tab */}
        <TabsContent value="network">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Network Status</span>
                    {getNetworkStatusBadge()}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Response Time</span>
                    <span className="font-mono">
                      {atm.networkStatus?.responseTimeMs ? `${atm.networkStatus.responseTimeMs}ms` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Last Checked</span>
                    <span>
                      {atm.networkStatus?.checkedAt
                        ? formatDistanceToNow(new Date(atm.networkStatus.checkedAt), { addSuffix: true })
                        : '-'}
                    </span>
                  </div>
                  {atm.networkStatus?.downSince && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Down Since</span>
                      <span className="text-red-500">
                        {format(new Date(atm.networkStatus.downSince), 'PPp')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Monitoring Logs</CardTitle>
              </CardHeader>
              <CardContent>
                {atm.monitoringLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Response Time</TableHead>
                        <TableHead>Checked At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atm.monitoringLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant={log.status === 'ONLINE' ? 'success' : 'destructive'}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.responseTime ? `${log.responseTime}ms` : '-'}</TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(log.checkedAt), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No monitoring logs available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Technical Issues Tab */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Technical Issues
              </CardTitle>
              <CardDescription>
                Tickets reported for ATM {atm.code}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : technicalIssues.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Error Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {technicalIssues.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono">{ticket.number}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={ticket.title}>
                          {ticket.title}
                        </TableCell>
                        <TableCell>{ticket.errorType || '-'}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell>
                          <Badge variant={ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? 'destructive' : 'outline'}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>{ticket.assignee?.name || '-'}</TableCell>
                        <TableCell>
                          <Link href={`/tickets/${ticket.id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">No technical issues found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                ATM Claims (Selisih ATM)
              </CardTitle>
              <CardDescription>
                Cash discrepancy claims for ATM {atm.code}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : claims.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Transaction Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono">{ticket.number}</TableCell>
                        <TableCell>{ticket.customerName || '-'}</TableCell>
                        <TableCell>{ticket.transactionAmount || '-'}</TableCell>
                        <TableCell>{ticket.transactionDate || '-'}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell>
                          {ticket.verification?.recommendation ? (
                            <Badge variant={
                              ticket.verification.recommendation === 'APPROVE' ? 'success' :
                              ticket.verification.recommendation === 'REJECT' ? 'destructive' : 'warning'
                            }>
                              {ticket.verification.recommendation}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link href={`/tickets/${ticket.id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">No ATM claims found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                ATM Incidents
              </CardTitle>
              <CardDescription>
                Active incidents for ATM {atm.code}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {atm.incidents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Detected At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {atm.incidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell>
                          <Badge variant="outline">{incident.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            incident.severity === 'CRITICAL' || incident.severity === 'HIGH'
                              ? 'destructive'
                              : incident.severity === 'MEDIUM' ? 'warning' : 'secondary'
                          }>
                            {incident.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={incident.description}>
                          {incident.description}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">No active incidents</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
