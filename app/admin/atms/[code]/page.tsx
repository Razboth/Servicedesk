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
  ExternalLink,
  MapPin,
  Network,
  Server,
  FileText,
  Shield,
  History,
  CheckCircle2,
  Bell
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// WITA timezone (GMT+8)
const WITA_TIMEZONE = 'Asia/Makassar';

// Helper function to format date in WITA timezone
const formatWITA = (date: string | Date, formatStr: string = 'dd MMM yyyy, HH:mm') => {
  const zonedDate = toZonedTime(new Date(date), WITA_TIMEZONE);
  return format(zonedDate, formatStr) + ' WITA';
};

// Helper to get relative time with WITA context
const formatRelativeWITA = (date: string | Date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

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

interface AlarmRecord {
  id: string;
  alarmType: string;
  location: string;
  occurredAt: string;
  clearedAt: string | null;
  duration: number | null;
  isActive: boolean;
}

interface CurrentAlarm {
  id: string;
  alarmType: string;
  location: string;
  occurredAt: string;
  timeAgo: string | null;
}

interface AlarmData {
  atmCode: string;
  atmName: string;
  device: {
    id: string;
    deviceId: string;
    location: string | null;
    status: string;
    lastSeenAt: string;
  } | null;
  currentAlarms: CurrentAlarm[];
  alarmHistory: AlarmRecord[];
  statistics: {
    totalAlarms: number;
    activeAlarms: number;
    avgDurationSeconds: number | null;
    uptimePercentage30Days: number;
    alarmTypeBreakdown: { alarmType: string; count: number }[];
  };
}

export default function ATMDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const atmCode = params.code as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [atm, setATM] = useState<ATM | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'details');
  const [technicalIssues, setTechnicalIssues] = useState<Ticket[]>([]);
  const [claims, setClaims] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [alarmData, setAlarmData] = useState<AlarmData | null>(null);
  const [alarmsLoading, setAlarmsLoading] = useState(false);

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
    Promise.all([fetchATM(), fetchBranches(), fetchAlarmData()]);
  }, [atmCode]);

  useEffect(() => {
    if (activeTab === 'tickets' || activeTab === 'claims') {
      fetchTickets();
    }
  }, [activeTab, atmCode]);

  useEffect(() => {
    if (activeTab === 'incidents') {
      fetchAlarmData();
    }
  }, [activeTab, atmCode]);

  const fetchATM = async () => {
    try {
      const response = await fetch(`/api/admin/atms/code/${atmCode}`);
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
      const response = await fetch(`/api/admin/atms/code/${atmCode}/tickets?type=all`);
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

  const fetchAlarmData = async () => {
    try {
      setAlarmsLoading(true);
      const response = await fetch(`/api/admin/atms/code/${atmCode}/alarms?days=30&limit=100`);
      if (!response.ok) throw new Error('Failed to fetch alarm data');
      const data = await response.json();
      if (data.success) {
        setAlarmData(data.data);
      }
    } catch (error) {
      console.error('Error fetching alarm data:', error);
    } finally {
      setAlarmsLoading(false);
    }
  };

  // Format duration from seconds to readable format
  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get alarm type icon
  const getAlarmIcon = (alarmType: string) => {
    const type = alarmType.toLowerCase();
    if (type.includes('communication') || type.includes('offline')) {
      return <WifiOff className="h-4 w-4" />;
    }
    if (type.includes('cash') || type.includes('cassette')) {
      return <Banknote className="h-4 w-4" />;
    }
    if (type.includes('card') || type.includes('mcrw')) {
      return <CreditCard className="h-4 w-4" />;
    }
    return <AlertTriangle className="h-4 w-4" />;
  };

  // Get alarm color class
  const getAlarmColor = (alarmType: string): string => {
    const type = alarmType.toLowerCase();
    if (type.includes('communication') || type.includes('offline')) {
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    }
    if (type.includes('error')) {
      return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    }
    if (type.includes('warning') || type.includes('low')) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    }
    return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
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

      const response = await fetch(`/api/admin/atms/code/${atmCode}`, {
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

      // If code changed, redirect to new URL
      if (formData.code !== atmCode) {
        router.push(`/admin/atms/${formData.code}`);
      } else {
        fetchATM();
      }
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

  const tabs = [
    { id: 'details', label: 'ATM Details', icon: CreditCard },
    { id: 'network', label: 'Network & Monitoring', icon: Network },
    { id: 'tickets', label: 'Technical Issues', icon: Wrench, count: atm._count.technicalIssueTickets },
    { id: 'claims', label: 'ATM Claims', icon: Banknote, count: atm._count.claimTickets },
    { id: 'incidents', label: 'Alarm History', icon: History, count: alarmData?.statistics?.activeAlarms },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 max-w-[1600px] mx-auto">
      {/* Header Section with improved visual hierarchy */}
      <div className="mb-8">
        <Link href="/admin/atms">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 hover:bg-muted">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to ATMs
          </Button>
        </Link>

        {/* Enhanced Header Card */}
        <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">
                  {atm.name}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <span className="font-mono bg-muted px-2 py-1 rounded">{atm.code}</span>
                  <span className="text-border">|</span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{atm.branch.name}</span>
                    {atm.branch.city && <span className="text-muted-foreground">({atm.branch.city})</span>}
                  </span>
                  <span className="text-border">|</span>
                  <Badge variant={atm.atmCategory === 'CRM' ? 'default' : 'secondary'} className="font-medium">
                    {atm.atmCategory}
                  </Badge>
                </div>
                {atm.location && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {atm.location}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={atm.isActive ? 'success' : 'secondary'}
                className="h-7 px-3 text-sm font-medium"
              >
                {atm.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {getNetworkStatusBadge()}
            </div>
          </div>
        </div>

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Active Alarms</p>
                  <p className="text-3xl font-bold">{alarmData?.statistics?.activeAlarms ?? 0}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Technical Issues</p>
                  <p className="text-3xl font-bold">{atm._count.technicalIssueTickets}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">ATM Claims</p>
                  <p className="text-3xl font-bold">{atm._count.claimTickets}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-green-600 dark:text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Response Time</p>
                  <p className="text-3xl font-bold">
                    {atm.networkStatus?.responseTimeMs ? `${atm.networkStatus.responseTimeMs}` : '-'}
                    {atm.networkStatus?.responseTimeMs && <span className="text-lg text-muted-foreground ml-1">ms</span>}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-purple-600 dark:text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modern Underline-style Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-1 py-3 border-b-2 transition-all whitespace-nowrap
                  ${isActive
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <Badge
                    variant={isActive ? 'default' : 'secondary'}
                    className="h-5 min-w-5 px-1.5 text-xs"
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    <CardTitle>Basic Information</CardTitle>
                  </div>
                  <CardDescription>Core ATM identification and status</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code" className="text-sm font-medium">
                        ATM Code <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g., ATM001"
                        required
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        ATM Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Main Branch ATM"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch" className="text-sm font-medium">
                      Branch <span className="text-destructive">*</span>
                    </Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium">
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Ground floor, near entrance"
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer font-medium">
                      Active Status
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Hardware Information */}
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>Hardware Information</CardTitle>
                  </div>
                  <CardDescription>ATM hardware specifications</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="atmBrand" className="text-sm font-medium">ATM Brand</Label>
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
                    <div className="space-y-2">
                      <Label htmlFor="atmType" className="text-sm font-medium">ATM Model/Type</Label>
                      <Input
                        id="atmType"
                        value={formData.atmType}
                        onChange={(e) => setFormData({ ...formData, atmType: e.target.value })}
                        placeholder="e.g., Pro Cash 2050xe"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="atmCategory" className="text-sm font-medium">Category</Label>
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
                    <div className="space-y-2">
                      <Label htmlFor="serialNumber" className="text-sm font-medium">Serial Number</Label>
                      <Input
                        id="serialNumber"
                        value={formData.serialNumber}
                        onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                        placeholder="Hardware serial number"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Network Configuration */}
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-primary" />
                    <CardTitle>Network Configuration</CardTitle>
                  </div>
                  <CardDescription>Network and connectivity settings</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ipAddress" className="text-sm font-medium">IP Address</Label>
                    <Input
                      id="ipAddress"
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                      placeholder="e.g., 192.168.1.100"
                      className="font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="networkMedia" className="text-sm font-medium">Network Media</Label>
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
                    <div className="space-y-2">
                      <Label htmlFor="networkVendor" className="text-sm font-medium">Network Vendor</Label>
                      <Input
                        id="networkVendor"
                        value={formData.networkVendor}
                        onChange={(e) => setFormData({ ...formData, networkVendor: e.target.value })}
                        placeholder="e.g., Telkom, XL"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude" className="text-sm font-medium">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        placeholder="e.g., -6.200000"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude" className="text-sm font-medium">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        placeholder="e.g., 106.816666"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle>Additional Notes</CardTitle>
                  </div>
                  <CardDescription>Internal notes and comments</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any additional information about this ATM..."
                    rows={6}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/atms')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="min-w-[120px]">
                {saving ? (
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
        )}

        {/* Network & Monitoring Tab */}
        {activeTab === 'network' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle>Current Network Status</CardTitle>
                </div>
                <CardDescription>Real-time monitoring data</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Network Status</span>
                    {getNetworkStatusBadge()}
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Response Time</span>
                    <span className="font-mono font-semibold">
                      {atm.networkStatus?.responseTimeMs ? `${atm.networkStatus.responseTimeMs}ms` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Last Checked</span>
                    <span className="text-sm">
                      {atm.networkStatus?.checkedAt
                        ? formatWITA(atm.networkStatus.checkedAt)
                        : '-'}
                    </span>
                  </div>
                  {atm.networkStatus?.downSince && (
                    <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <span className="text-sm font-medium text-destructive">Down Since</span>
                      <span className="text-sm font-semibold text-destructive">
                        {formatWITA(atm.networkStatus.downSince)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <CardTitle>Recent Monitoring Logs</CardTitle>
                </div>
                <CardDescription>Latest network ping results</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {atm.monitoringLogs.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Response Time</TableHead>
                          <TableHead className="font-semibold">Checked At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {atm.monitoringLogs.map((log) => (
                          <TableRow key={log.id} className="hover:bg-muted/30">
                            <TableCell>
                              <Badge variant={log.status === 'ONLINE' ? 'success' : 'destructive'}>
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.responseTime ? `${log.responseTime}ms` : '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatWITA(log.checkedAt, 'dd/MM HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No monitoring logs available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Technical Issues Tab */}
        {activeTab === 'tickets' && (
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <CardTitle>Technical Issues</CardTitle>
              </div>
              <CardDescription>
                All technical issue tickets reported for ATM {atm.code}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {ticketsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : technicalIssues.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Ticket #</TableHead>
                        <TableHead className="font-semibold">Title</TableHead>
                        <TableHead className="font-semibold">Error Type</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Priority</TableHead>
                        <TableHead className="font-semibold">Created</TableHead>
                        <TableHead className="font-semibold">Assigned To</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {technicalIssues.map((ticket) => (
                        <TableRow key={ticket.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-sm font-medium">{ticket.number}</TableCell>
                          <TableCell className="max-w-[250px] truncate" title={ticket.title}>
                            {ticket.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ticket.errorType || '-'}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                          <TableCell>
                            <Badge variant={ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? 'destructive' : 'outline'}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatWITA(ticket.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm">{ticket.assignee?.name || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/tickets/${ticket.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <Wrench className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No technical issues found</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Claims Tab */}
        {activeTab === 'claims' && (
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                <CardTitle>ATM Claims (Selisih ATM)</CardTitle>
              </div>
              <CardDescription>
                Cash discrepancy claims for ATM {atm.code}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {ticketsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : claims.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Ticket #</TableHead>
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Transaction Date</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Verification</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {claims.map((ticket) => (
                        <TableRow key={ticket.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-sm font-medium">{ticket.number}</TableCell>
                          <TableCell>{ticket.customerName || '-'}</TableCell>
                          <TableCell className="font-semibold">{ticket.transactionAmount || '-'}</TableCell>
                          <TableCell className="text-sm">{ticket.transactionDate || '-'}</TableCell>
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
                          <TableCell className="text-right">
                            <Link href={`/tickets/${ticket.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <Banknote className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No ATM claims found</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alarm History Tab */}
        {activeTab === 'incidents' && (
          <div className="space-y-6">
            {alarmsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Alarm Statistics Summary */}
                {alarmData && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-red-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Alarms</p>
                            <p className="text-2xl font-bold">{alarmData.statistics.activeAlarms}</p>
                          </div>
                          <Bell className="h-8 w-8 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total (30 days)</p>
                            <p className="text-2xl font-bold">{alarmData.alarmHistory.length}</p>
                          </div>
                          <History className="h-8 w-8 text-amber-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                            <p className="text-2xl font-bold">
                              {alarmData.statistics.avgDurationSeconds
                                ? formatDuration(alarmData.statistics.avgDurationSeconds)
                                : '-'}
                            </p>
                          </div>
                          <Clock className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Uptime (30d)</p>
                            <p className="text-2xl font-bold">{alarmData.statistics.uptimePercentage30Days}%</p>
                          </div>
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Current Active Alarms */}
                {alarmData && alarmData.currentAlarms.length > 0 && (
                  <Card className="shadow-sm border-red-200 dark:border-red-800">
                    <CardHeader className="border-b bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <CardTitle className="text-red-600">Active Alarms ({alarmData.currentAlarms.length})</CardTitle>
                      </div>
                      <CardDescription>
                        Currently active alarms that require attention
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {alarmData.currentAlarms.map((alarm) => (
                          <div
                            key={alarm.id}
                            className={`p-4 rounded-lg border-2 ${getAlarmColor(alarm.alarmType)}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-white/50 dark:bg-black/20 rounded">
                                {getAlarmIcon(alarm.alarmType)}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold">{alarm.alarmType}</p>
                                {alarm.location && (
                                  <p className="text-sm opacity-75">Location: {alarm.location}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatWITA(alarm.occurredAt)}
                                  </span>
                                  {alarm.timeAgo && (
                                    <span className="opacity-75">{alarm.timeAgo}</span>
                                  )}
                                </div>
                              </div>
                              <Badge variant="destructive" className="animate-pulse">
                                Active
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Alarm History Table */}
                <Card className="shadow-sm">
                  <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      <CardTitle>Alarm History (Last 30 Days)</CardTitle>
                    </div>
                    <CardDescription>
                      Historical alarm records for ATM {atm.code}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {alarmData && alarmData.alarmHistory.length > 0 ? (
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="font-semibold">Alarm Type</TableHead>
                              <TableHead className="font-semibold">Occurred At</TableHead>
                              <TableHead className="font-semibold">Cleared At</TableHead>
                              <TableHead className="font-semibold">Duration</TableHead>
                              <TableHead className="font-semibold">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {alarmData.alarmHistory.map((record) => (
                              <TableRow key={record.id} className="hover:bg-muted/30">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {getAlarmIcon(record.alarmType)}
                                    <span className="text-sm font-medium">{record.alarmType}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {formatWITA(record.occurredAt)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {record.clearedAt ? (
                                    <span className="text-green-600 dark:text-green-400">
                                      {formatWITA(record.clearedAt)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm font-mono">
                                  {formatDuration(record.duration)}
                                </TableCell>
                                <TableCell>
                                  {record.isActive ? (
                                    <Badge variant="destructive" className="animate-pulse">
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="success" className="gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Cleared
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 border rounded-lg bg-muted/20">
                        <CheckCircle2 className="h-12 w-12 text-green-500/50 mx-auto mb-3" />
                        <p className="text-muted-foreground">No alarm history</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alarmData?.device
                            ? 'No alarms recorded in the last 30 days'
                            : 'ATM monitoring device not found. The ATM may not be connected to the alarm monitoring system.'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Alarm Type Breakdown */}
                {alarmData && alarmData.statistics.alarmTypeBreakdown.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader className="border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <CardTitle>Alarm Type Breakdown</CardTitle>
                      </div>
                      <CardDescription>
                        Distribution of alarm types for this ATM
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex flex-wrap gap-2">
                        {alarmData.statistics.alarmTypeBreakdown.map((item) => (
                          <Badge
                            key={item.alarmType}
                            className={`${getAlarmColor(item.alarmType)} flex items-center gap-1 px-3 py-1`}
                          >
                            {getAlarmIcon(item.alarmType)}
                            <span>{item.alarmType}</span>
                            <span className="ml-1 px-1.5 py-0.5 bg-white/50 dark:bg-black/20 rounded text-xs font-bold">
                              {item.count}
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
