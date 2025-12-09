'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Shield,
  Settings,
  Filter,
  XCircle,
  RefreshCw,
  CheckCircle,
  Ticket,
  Wrench,
  Network,
  HelpCircle,
  Activity,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface SupportGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    users: number;
    services: number;
    tickets: number;
  };
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default'
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
}) {
  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success)/0.3)]',
    warning: 'bg-[hsl(var(--warning)/0.1)] border-[hsl(var(--warning)/0.3)]',
    destructive: 'bg-destructive/10 border-destructive/30',
    info: 'bg-[hsl(var(--info)/0.1)] border-[hsl(var(--info)/0.3)]',
  };

  const iconStyles = {
    default: 'text-primary',
    success: 'text-[hsl(var(--success))]',
    warning: 'text-[hsl(var(--warning))]',
    destructive: 'text-destructive',
    info: 'text-[hsl(var(--info))]',
  };

  return (
    <Card className={`${variantStyles[variant]} transition-all duration-200 hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-background/50 ${iconStyles[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Workload Indicator Component
function WorkloadIndicator({ users, tickets }: { users: number; tickets: number }) {
  if (users === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-muted rounded-full" />
        <span className="text-xs text-muted-foreground">No users</span>
      </div>
    );
  }

  const ticketsPerUser = tickets / users;
  let status: 'low' | 'medium' | 'high' = 'low';
  let color = 'bg-[hsl(var(--success))]';
  let label = 'Low';

  if (ticketsPerUser > 10) {
    status = 'high';
    color = 'bg-destructive';
    label = 'High';
  } else if (ticketsPerUser > 5) {
    status = 'medium';
    color = 'bg-[hsl(var(--warning))]';
    label = 'Medium';
  }

  const percentage = Math.min(100, (ticketsPerUser / 15) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {ticketsPerUser.toFixed(1)} tickets/user
      </p>
    </div>
  );
}

export default function SupportGroupsPage() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SupportGroup | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    isActive: true
  });

  // Stats computed from groups
  const stats = {
    total: groups.length,
    active: groups.filter(g => g.isActive).length,
    totalUsers: groups.reduce((sum, g) => sum + (g._count?.users || 0), 0),
    totalTickets: groups.reduce((sum, g) => sum + (g._count?.tickets || 0), 0),
    totalServices: groups.reduce((sum, g) => sum + (g._count?.services || 0), 0),
  };

  useEffect(() => {
    fetchGroups();
  }, [search]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        includeStats: 'true',
        ...(search && { search })
      });

      const response = await fetch(`/api/admin/support-groups?${params}`);
      if (!response.ok) throw new Error('Failed to fetch support groups');

      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching support groups:', error);
      toast.error('Failed to load support groups');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = selectedGroup
        ? `/api/admin/support-groups/${selectedGroup.id}`
        : '/api/admin/support-groups';

      const method = selectedGroup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save support group');
      }

      toast.success(selectedGroup ? 'Support group updated' : 'Support group created');
      setDialogOpen(false);
      resetForm();
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (group: SupportGroup) => {
    try {
      const response = await fetch(`/api/admin/support-groups/${group.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete support group');
      }

      toast.success('Support group deleted');
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      isActive: true
    });
    setSelectedGroup(null);
  };

  const openEditDialog = (group: SupportGroup) => {
    setSelectedGroup(group);
    setFormData({
      code: group.code,
      name: group.name,
      description: group.description || '',
      isActive: group.isActive
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getGroupIcon = (code: string) => {
    const iconMap: Record<string, React.ElementType> = {
      'SECURITY': Shield,
      'NETWORK': Network,
      'IT_HELPDESK': HelpCircle,
      'IT_INFRASTRUCTURE': Settings,
      'IT_DEVELOPMENT': Wrench,
    };
    const Icon = iconMap[code] || Users;
    return <Icon className="h-4 w-4" />;
  };

  const getGroupColor = (code: string) => {
    const colorMap: Record<string, string> = {
      'SECURITY': 'text-destructive',
      'NETWORK': 'text-[hsl(var(--info))]',
      'IT_HELPDESK': 'text-[hsl(var(--success))]',
      'IT_INFRASTRUCTURE': 'text-[hsl(var(--warning))]',
      'IT_DEVELOPMENT': 'text-primary',
    };
    return colorMap[code] || 'text-primary';
  };

  const clearFilters = () => {
    setSearch('');
  };

  const hasActiveFilters = !!search;

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <PageHeader
          title="Support Groups Management"
          description="Manage support teams and their service assignments"
          icon={<Users className="h-6 w-6" />}
          action={
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Support Group
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Total Groups"
            value={stats.total}
            icon={Users}
            description="Support teams"
          />
          <StatCard
            title="Active Groups"
            value={stats.active}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Total Members"
            value={stats.totalUsers}
            icon={Users}
            variant="info"
          />
          <StatCard
            title="Assigned Services"
            value={stats.totalServices}
            icon={Settings}
          />
          <StatCard
            title="Open Tickets"
            value={stats.totalTickets}
            icon={Ticket}
            variant={stats.totalTickets > 50 ? 'warning' : 'default'}
          />
        </div>

        {/* Filters Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Search Support Groups</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {hasActiveFilters && (
              <div className="mt-3 text-sm text-muted-foreground">
                Showing {groups.length} support group(s)
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support Groups Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Group</TableHead>
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4" />
                      Users
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <Settings className="h-4 w-4" />
                      Services
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <Ticket className="h-4 w-4" />
                      Tickets
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      Workload
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading support groups...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        No support groups found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((group) => (
                    <TableRow key={group.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg bg-muted ${getGroupColor(group.code)}`}>
                            {getGroupIcon(group.code)}
                          </div>
                          <span className="font-medium text-foreground">{group.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded text-foreground">
                          {group.code}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-muted-foreground truncate block">
                          {group.description || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={group._count?.users && group._count.users > 0 ? 'default-soft' : 'ghost'}>
                          {group._count?.users || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={group._count?.services && group._count.services > 0 ? 'info-soft' : 'ghost'}>
                          {group._count?.services || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={group._count?.tickets && group._count.tickets > 0 ? 'warning-soft' : 'ghost'}>
                          {group._count?.tickets || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <WorkloadIndicator
                          users={group._count?.users || 0}
                          tickets={group._count?.tickets || 0}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.isActive ? 'success' : 'secondary'}>
                          {group.isActive ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                          ) : (
                            'Inactive'
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="iconSm"
                            onClick={() => openEditDialog(group)}
                            title="Edit support group"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="iconSm"
                                disabled={
                                  (group._count?.users || 0) > 0 ||
                                  (group._count?.services || 0) > 0 ||
                                  (group._count?.tickets || 0) > 0
                                }
                                title={
                                  (group._count?.users || 0) > 0 ||
                                  (group._count?.services || 0) > 0 ||
                                  (group._count?.tickets || 0) > 0
                                    ? "Cannot delete: group has associated data"
                                    : "Delete support group"
                                }
                                className="text-destructive hover:text-destructive disabled:text-muted-foreground"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Support Group</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <p className="mb-2">
                                    Are you sure you want to delete <strong>{group.name}</strong>?
                                  </p>
                                  <p className="text-destructive">
                                    This action will mark the support group as inactive.
                                  </p>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(group)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedGroup ? (
                  <><Edit className="h-5 w-5" /> Edit Support Group</>
                ) : (
                  <><Plus className="h-5 w-5" /> Create Support Group</>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedGroup
                  ? 'Update the support group details below.'
                  : 'Enter the details for the new support group.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                    placeholder="e.g., IT_SUPPORT"
                    disabled={!!selectedGroup}
                    className="bg-background"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for the support group (cannot be changed after creation)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., IT Support Team"
                    className="bg-background"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the support group's responsibilities..."
                    className="bg-background resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive" className="text-base">Active Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable this support group
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedGroup ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
