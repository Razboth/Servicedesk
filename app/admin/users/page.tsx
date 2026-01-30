'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { BranchSelect } from '@/components/ui/branch-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveTable, MobileCard } from '@/components/ui/responsive-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ModernDialog,
  ModernDialogContent,
  ModernDialogHeader,
  ModernDialogTitle,
  ModernDialogDescription,
  ModernDialogBody,
  ModernDialogFooter
} from '@/components/ui/modern-dialog';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  Phone,
  Edit,
  Trash2,
  Building2,
  Shield,
  Filter,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  Monitor,
  Smartphone,
  FileText,
  Wrench,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  Activity,
  RefreshCw
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  loginAttempts: number;
  lockedAt: string | null;
  lastActivity: string | null;
  createdAt: string;
  mustChangePassword?: boolean;
  isFirstLogin?: boolean;
  passwordChangedAt?: string | null;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  supportGroup?: {
    id: string;
    name: string;
    code: string;
  };
  _count?: {
    createdTickets: number;
    assignedTickets: number;
  };
  lastDevice?: {
    browser: string;
    os: string;
    deviceType: string;
    lastSeen: string;
    ipAddress?: string;
    rawUserAgent?: string;
  } | null;
}

interface UserFormData {
  username?: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  branchId: string;
  supportGroupId: string;
  isActive: boolean;
  password?: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface SupportGroup {
  id: string;
  name: string;
  code: string;
}

const USER_ROLES = [
  { value: 'USER', label: 'User', description: 'Regular branch employee', icon: Users },
  { value: 'TECHNICIAN', label: 'Technician', description: 'IT support technician', icon: Wrench },
  { value: 'MANAGER', label: 'Manager', description: 'Branch manager with approval rights', icon: Building2 },
  { value: 'MANAGER_IT', label: 'IT Manager', description: 'IT manager with shift management access', icon: Monitor },
  { value: 'ADMIN', label: 'Super Admin', description: 'Full system administrator', icon: Shield },
  { value: 'SECURITY_ANALYST', label: 'Security Analyst', description: 'Security specialist with confidential access', icon: Shield }
];

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
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}) {
  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success)/0.3)]',
    warning: 'bg-[hsl(var(--warning)/0.1)] border-[hsl(var(--warning)/0.3)]',
    destructive: 'bg-destructive/10 border-destructive/30',
  };

  const iconStyles = {
    default: 'text-primary',
    success: 'text-[hsl(var(--success))]',
    warning: 'text-[hsl(var(--warning))]',
    destructive: 'text-destructive',
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

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [supportGroupFilter, setSupportGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form and dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    phone: '',
    role: 'USER',
    branchId: '',
    supportGroupId: '',
    isActive: true
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Stats computed from users
  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    locked: users.filter(u => u.lockedAt && u.loginAttempts >= 5).length,
  };

  // Define all functions using useCallback to prevent re-creation on every render
  const fetchBranches = useCallback(async () => {
    try {
      const response = await fetch('/api/branches');
      if (!response.ok) {
        let errorMessage = 'Failed to fetch branches';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore parsing errors for error responses
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setBranches(Array.isArray(data) ? data : data.branches || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to load branches');
      setBranches([]);
    }
  }, []);

  const fetchSupportGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/support-groups');
      if (!response.ok) {
        let errorMessage = 'Failed to fetch support groups';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore parsing errors for error responses
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setSupportGroups(Array.isArray(data) ? data : data.supportGroups || []);
    } catch (error) {
      console.error('Error fetching support groups:', error);
      toast.error('Failed to load support groups');
      setSupportGroups([]);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(branchFilter !== 'all' && { branchId: branchFilter }),
        ...(supportGroupFilter !== 'all' && { supportGroupId: supportGroupFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/users?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      // Ensure data is always an array
      setUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      // Don't re-throw - let the function complete normally
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, branchFilter, supportGroupFilter, statusFilter]);

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchBranches(),
          fetchSupportGroups(),
          fetchUsers()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    if (session?.user?.role === 'ADMIN') {
      initializeData();
    }
  }, [session?.user?.role, fetchBranches, fetchSupportGroups, fetchUsers]);

  // Refetch users when filters change
  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [search, roleFilter, branchFilter, supportGroupFilter, statusFilter, session?.user?.role, fetchUsers]);

  // Auth guard - show loading or access denied if not admin
  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  if (session.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-background p-8">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Super admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleCreateUser = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      toast.success('User created successfully');
      setShowCreateDialog(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      toast.success('User updated successfully');
      setShowEditDialog(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/users/${user.id}/toggle-active`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to toggle user status');

      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockUser = async (user: User) => {
    let unlockSuccessful = false;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/admin/users/${user.id}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to unlock user';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      // If we get here, the unlock was successful
      unlockSuccessful = true;

      try {
        await response.json();
      } catch {
        // Ignore JSON parsing errors as long as the status was OK
      }

      // Show success message
      toast.success(`User ${user.name} unlocked successfully`);

    } catch (error) {
      if (!unlockSuccessful) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to unlock user account';
        toast.error(errorMessage);
      }
    }

    // Always try to refresh the users list
    try {
      await fetchUsers();
    } catch {
      // Ignore refresh errors - the unlock itself succeeded
    }

    setActionLoading(false);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      role: user.role,
      branchId: user.branch?.id || '',
      supportGroupId: user.supportGroup?.id || '',
      isActive: user.isActive
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      name: '',
      phone: '',
      role: 'USER',
      branchId: '',
      supportGroupId: '',
      isActive: true
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getRoleBadgeVariant = (role: string): "default" | "destructive" | "warning" | "success" | "info" | "secondary" | "outline" | "ghost" => {
    switch (role) {
      case 'ADMIN': return 'destructive';
      case 'MANAGER': return 'warning';
      case 'MANAGER_IT': return 'warning';
      case 'TECHNICIAN': return 'info';
      case 'AGENT': return 'secondary';
      case 'SECURITY_ANALYST': return 'info';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-3 w-3" />;
      case 'SECURITY_ANALYST':
        return <Shield className="h-3 w-3" />;
      case 'MANAGER':
      case 'MANAGER_IT':
        return <Building2 className="h-3 w-3" />;
      case 'TECHNICIAN':
        return <Wrench className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setBranchFilter('all');
    setSupportGroupFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = search || roleFilter !== 'all' || branchFilter !== 'all' || supportGroupFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <PageHeader
          title="User Management"
          description="Create, edit, and manage user accounts across the organization"
          icon={<Users className="h-6 w-6" />}
          action={
            <ModernDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <ModernDialogContent className="max-w-2xl">
                <ModernDialogHeader variant="gradient" icon={<UserPlus className="w-5 h-5" />}>
                  <ModernDialogTitle>Create New User</ModernDialogTitle>
                  <ModernDialogDescription>
                    Add a new user to the system
                  </ModernDialogDescription>
                </ModernDialogHeader>
                <ModernDialogBody>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-email">Email</Label>
                      <Input
                        id="create-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="user@banksulutgo.co.id"
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-name">Name</Label>
                      <Input
                        id="create-name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Full Name"
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-phone">Phone</Label>
                      <Input
                        id="create-phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="Phone number"
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-role">Role</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map(role => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center gap-2">
                                <role.icon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{role.label}</div>
                                  <div className="text-xs text-muted-foreground">{role.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-branch">Branch</Label>
                      <BranchSelect
                        branches={branches}
                        value={formData.branchId || "none"}
                        onValueChange={(value) => setFormData({...formData, branchId: value === "none" ? "" : value})}
                        allOption={false}
                        noneOption={true}
                        noneOptionLabel="No Branch"
                        placeholder="Select branch"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-support-group">Support Group</Label>
                      <Select value={formData.supportGroupId || "none"} onValueChange={(value) => setFormData({...formData, supportGroupId: value === "none" ? "" : value})}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select support group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Support Group</SelectItem>
                          {supportGroups.map(group => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-password">Password</Label>
                      <Input
                        id="create-password"
                        type="password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Leave empty for default: password123"
                        className="bg-background"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id="create-active"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                      />
                      <Label htmlFor="create-active">Active</Label>
                    </div>
                  </div>
                </ModernDialogBody>
                <ModernDialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    disabled={actionLoading}
                    loading={actionLoading}
                  >
                    Create User
                  </Button>
                </ModernDialogFooter>
              </ModernDialogContent>
            </ModernDialog>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Users"
            value={stats.total}
            icon={Users}
            description="All registered users"
          />
          <StatCard
            title="Active Users"
            value={stats.active}
            icon={UserCheck}
            variant="success"
          />
          <StatCard
            title="Inactive Users"
            value={stats.inactive}
            icon={UserX}
            variant="warning"
          />
          <StatCard
            title="Locked Accounts"
            value={stats.locked}
            icon={Lock}
            variant={stats.locked > 0 ? 'destructive' : 'default'}
          />
        </div>

        {/* Filters Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Filters</CardTitle>
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
            <div className="grid gap-4 md:grid-cols-6">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {USER_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <BranchSelect
                branches={branches}
                value={branchFilter}
                onValueChange={setBranchFilter}
                allOption={true}
                allOptionLabel="All Branches"
              />
              <Select value={supportGroupFilter} onValueChange={setSupportGroupFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Support Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Support Groups</SelectItem>
                  {supportGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <div className="mt-3 text-sm text-muted-foreground">
                Showing {users.length} user(s) matching your filters
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <ResponsiveTable
              mobileCardView={
                <div className="space-y-3 p-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading users...
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      No users found
                    </div>
                  ) : (
                    users.map((user) => (
                      <MobileCard key={user.id} className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-foreground">{user.name}</p>
                              <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                                <span className="flex items-center gap-1">
                                  {getRoleIcon(user.role)}
                                  {user.role}
                                </span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{user.email}</p>

                            {user.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </div>
                            )}

                            {user.branch && (
                              <div className="text-sm mb-2">
                                <span className="font-medium text-foreground">Branch: </span>
                                <span className="text-muted-foreground">{user.branch.name} ({user.branch.code})</span>
                              </div>
                            )}

                            {user.supportGroup && (
                              <div className="text-sm mb-2">
                                <span className="font-medium text-foreground">Support Group: </span>
                                <span className="text-muted-foreground">{user.supportGroup.name}</span>
                              </div>
                            )}

                            <div className="text-xs text-muted-foreground">
                              Created: {user._count?.createdTickets || 0} |
                              Assigned: {user._count?.assignedTickets || 0} tickets
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={user.isActive ? 'success' : 'secondary'} size="sm">
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {user.mustChangePassword && (
                              <Badge variant="warning" size="sm">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Must Change Password
                              </Badge>
                            )}

                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </MobileCard>
                    ))
                  )}
                </div>
              }
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Assignment</TableHead>
                    <TableHead className="text-center font-semibold">Tickets</TableHead>
                    <TableHead className="font-semibold">Device</TableHead>
                    <TableHead className="font-semibold">Security Status</TableHead>
                    <TableHead className="font-semibold">Last Activity</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Loading users...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          No users found
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.phone ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            <span className="flex items-center gap-1">
                              {getRoleIcon(user.role)}
                              {user.role}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.branch && (
                            <div className="text-sm">
                              <p className="font-medium text-foreground">{user.branch.name}</p>
                              <p className="text-muted-foreground">{user.branch.code}</p>
                            </div>
                          )}
                          {user.supportGroup && (
                            <div className="text-sm">
                              <p className="font-medium text-foreground">{user.supportGroup.name}</p>
                              <p className="text-muted-foreground">Support Group</p>
                            </div>
                          )}
                          {!user.branch && !user.supportGroup && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-center text-sm text-muted-foreground">
                            <p>Created: {user._count?.createdTickets || 0}</p>
                            <p>Assigned: {user._count?.assignedTickets || 0}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.lastDevice ? (
                            <div className="text-xs space-y-1">
                              <div className="flex items-center gap-1 text-foreground">
                                {user.lastDevice.deviceType === 'mobile' ? (
                                  <Smartphone className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <Monitor className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span>{user.lastDevice.browser}</span>
                              </div>
                              <div className="text-muted-foreground">{user.lastDevice.os}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">No data</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={user.isActive ? 'success' : 'destructive'}>
                              {user.isActive ? (
                                <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                              ) : (
                                <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
                              )}
                            </Badge>
                            {user.mustChangePassword && (
                              <Badge variant="warning-soft" size="sm">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Must Change Password
                              </Badge>
                            )}
                            {user.lockedAt && user.loginAttempts >= 5 && (
                              <Badge variant="destructive">
                                <Lock className="h-3 w-3 mr-1" />
                                Locked
                              </Badge>
                            )}
                            {user.loginAttempts > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {user.loginAttempts}/5 attempts
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(user.lastActivity)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="iconSm"
                              variant="ghost"
                              onClick={() => openEditDialog(user)}
                              title="Edit user"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="iconSm"
                              variant={user.isActive ? "ghost" : "ghost"}
                              onClick={() => handleToggleActive(user)}
                              disabled={actionLoading}
                              title={user.isActive ? 'Deactivate user' : 'Activate user'}
                              className={user.isActive ? 'text-destructive hover:text-destructive' : 'text-[hsl(var(--success))] hover:text-[hsl(var(--success))]'}
                            >
                              {user.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            {user.lockedAt && user.loginAttempts >= 5 && (
                              <Button
                                size="iconSm"
                                variant="ghost"
                                onClick={() => handleUnlockUser(user)}
                                disabled={actionLoading}
                                title="Unlock account"
                                className="text-[hsl(var(--warning))] hover:text-[hsl(var(--warning))]"
                              >
                                <Unlock className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="iconSm"
                                  variant="ghost"
                                  disabled={actionLoading}
                                  title="Delete user"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {user.name}? This action cannot be undone and will fail if the user has existing tickets.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
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
            </ResponsiveTable>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <ModernDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <ModernDialogContent className="max-w-2xl">
            <ModernDialogHeader variant="gradient" icon={<Edit className="w-5 h-5" />}>
              <ModernDialogTitle>Edit User</ModernDialogTitle>
              <ModernDialogDescription>
                Update user information and permissions
              </ModernDialogDescription>
            </ModernDialogHeader>

            <ModernDialogBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="bg-background"
                    placeholder="Enter username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <role.icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{role.label}</div>
                              <div className="text-xs text-muted-foreground">{role.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-branch">Branch</Label>
                  <BranchSelect
                    branches={branches}
                    value={formData.branchId || "none"}
                    onValueChange={(value) => setFormData({...formData, branchId: value === "none" ? "" : value})}
                    allOption={false}
                    noneOption={true}
                    noneOptionLabel="No Branch"
                    placeholder="Select branch"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-support-group">Support Group</Label>
                  <Select value={formData.supportGroupId || "none"} onValueChange={(value) => setFormData({...formData, supportGroupId: value === "none" ? "" : value})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select support group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Support Group</SelectItem>
                      {supportGroups.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-password">New Password</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Leave empty to keep current"
                    className="bg-background"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="edit-active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                  />
                  <Label htmlFor="edit-active">Active</Label>
                </div>
              </div>
            </ModernDialogBody>
            <ModernDialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateUser}
                disabled={actionLoading}
                loading={actionLoading}
              >
                Update User
              </Button>
            </ModernDialogFooter>
          </ModernDialogContent>
        </ModernDialog>
      </div>
    </div>
  );
}
