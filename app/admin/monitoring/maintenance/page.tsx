'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  Building,
  Monitor,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface MaintenanceWindow {
  id: string;
  title: string;
  description: string | null;
  entityType: string | null;
  entityId: string | null;
  entityName: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isCurrentlyActive: boolean;
  isUpcoming: boolean;
  isExpired: boolean;
  createdAt: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

interface ATM {
  id: string;
  code: string;
  name: string;
}

export default function MaintenanceWindowsPage() {
  const { data: session } = useSession();
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [atms, setAtms] = useState<ATM[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState<string>('');
  const [entityId, setEntityId] = useState<string>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [includeExpired]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch maintenance windows
      const windowsRes = await fetch(`/api/monitoring/maintenance?includeExpired=${includeExpired}`);
      if (windowsRes.ok) {
        const data = await windowsRes.json();
        setWindows(data.windows || []);
      }

      // Fetch branches for dropdown
      const branchesRes = await fetch('/api/branches?limit=200');
      if (branchesRes.ok) {
        const data = await branchesRes.json();
        setBranches(data.branches || data || []);
      }

      // Fetch ATMs for dropdown
      const atmsRes = await fetch('/api/atms?limit=200');
      if (atmsRes.ok) {
        const data = await atmsRes.json();
        setAtms(data.atms || data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title || !startTime || !endTime) {
      alert('Please fill in required fields');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/monitoring/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          entityType: entityType || null,
          entityId: entityId || null,
          startTime,
          endTime
        })
      });

      if (response.ok) {
        // Reset form
        setTitle('');
        setDescription('');
        setEntityType('');
        setEntityId('');
        setStartTime('');
        setEndTime('');
        setIsDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create maintenance window');
      }
    } catch (error) {
      console.error('Error creating maintenance window:', error);
      alert('Failed to create maintenance window');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this maintenance window?')) {
      return;
    }

    try {
      const response = await fetch(`/api/monitoring/maintenance?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('Failed to cancel maintenance window');
      }
    } catch (error) {
      console.error('Error deleting maintenance window:', error);
    }
  };

  const getStatusBadge = (window: MaintenanceWindow) => {
    if (!window.isActive) {
      return <Badge variant="secondary">Cancelled</Badge>;
    }
    if (window.isExpired) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (window.isCurrentlyActive) {
      return <Badge variant="success">Active Now</Badge>;
    }
    if (window.isUpcoming) {
      return <Badge variant="warning">Upcoming</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const getEntityIcon = (entityType: string | null) => {
    if (entityType === 'BRANCH') return <Building className="h-4 w-4" />;
    if (entityType === 'ATM') return <Monitor className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  };

  const activeCount = windows.filter(w => w.isCurrentlyActive).length;
  const upcomingCount = windows.filter(w => w.isUpcoming).length;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Maintenance Windows"
        description="Schedule maintenance to suppress alerts during planned downtime"
        icon={<Clock className="h-6 w-6" />}
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Schedule Maintenance Window</DialogTitle>
                <DialogDescription>
                  Alerts will be suppressed during this time period
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Router firmware upgrade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description of the maintenance work"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Scope</Label>
                    <Select value={entityType} onValueChange={(v) => { setEntityType(v); setEntityId(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All (Global)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Global (All)</SelectItem>
                        <SelectItem value="BRANCH">Branch</SelectItem>
                        <SelectItem value="ATM">ATM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Entity</Label>
                    <Select
                      value={entityId}
                      onValueChange={setEntityId}
                      disabled={!entityType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={entityType ? "Select entity" : "Select scope first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All {entityType}s</SelectItem>
                        {entityType === 'BRANCH' && branches.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.code} - {b.name}
                          </SelectItem>
                        ))}
                        {entityType === 'ATM' && atms.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active Now</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{upcomingCount}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
              <Clock className="h-8 w-8 text-warning/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted/20 bg-gradient-to-br from-muted/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{windows.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeExpired}
            onChange={(e) => setIncludeExpired(e.target.checked)}
            className="rounded border-border"
          />
          Show expired windows
        </label>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : windows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No maintenance windows scheduled
                  </TableCell>
                </TableRow>
              ) : (
                windows.map((w) => (
                  <TableRow key={w.id} className={!w.isActive ? 'opacity-50' : ''}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{w.title}</span>
                        {w.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {w.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEntityIcon(w.entityType)}
                        <span className="text-sm">{w.entityName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(w.startTime), 'dd/MM/yyyy HH:mm', { locale: localeId })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(w.endTime), 'dd/MM/yyyy HH:mm', { locale: localeId })}
                    </TableCell>
                    <TableCell>{getStatusBadge(w)}</TableCell>
                    <TableCell>
                      {w.isActive && !w.isExpired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(w.id)}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
