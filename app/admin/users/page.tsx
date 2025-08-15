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
  DialogTrigger,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertTriangle
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  loginAttempts: number;
  lockedAt: string | null;
  lastActivity: string | null;
  createdAt: string;
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
}

interface UserFormData {
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
  { value: 'USER', label: 'User', description: 'Regular branch employee' },
  { value: 'TECHNICIAN', label: 'Technician', description: 'IT support technician' },
  { value: 'MANAGER', label: 'Manager', description: 'Branch manager with approval rights' },
  { value: 'ADMIN', label: 'Super Admin', description: 'Full system administrator' },
  { value: 'SECURITY_ANALYST', label: 'Security Analyst', description: 'Security specialist with confidential access' }
];

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
      setBranches(data);
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
      setSupportGroups(data);
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
      setUsers(data.users || data);
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
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (session.user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto py-8">
        <Alert>
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive';
      case 'MANAGER': return 'warning';
      case 'TECHNICIAN': return 'default';
      case 'AGENT': return 'secondary';
      case 'SECURITY_ANALYST': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
      case 'SECURITY_ANALYST':
        return <Shield className="h-3 w-3" />;
      case 'MANAGER':
      case 'USER':
      case 'AGENT':
        return <Building2 className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Create, edit, and manage user accounts
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="user@banksulutgo.co.id"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Full Name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-branch">Branch</Label>
                <Select value={formData.branchId || "none"} onValueChange={(value) => setFormData({...formData, branchId: value === "none" ? "" : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Branch</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-support-group">Support Group</Label>
                <Select value={formData.supportGroupId || "none"} onValueChange={(value) => setFormData({...formData, supportGroupId: value === "none" ? "" : value})}>
                  <SelectTrigger>
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
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="create-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                />
                <Label htmlFor="create-active">Active</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={actionLoading}>
                {actionLoading ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="TECHNICIAN">Technician</SelectItem>
                <SelectItem value="AGENT">Agent</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="SECURITY_ANALYST">Security Analyst</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead className="text-center">Tickets</TableHead>
                <TableHead>Security Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.phone ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {user.phone}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
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
                          <p className="font-medium">{user.branch.name}</p>
                          <p className="text-gray-500">{user.branch.code}</p>
                        </div>
                      )}
                      {user.supportGroup && (
                        <div className="text-sm">
                          <p className="font-medium">{user.supportGroup.name}</p>
                          <p className="text-gray-500">Support Group</p>
                        </div>
                      )}
                      {!user.branch && !user.supportGroup && (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-center text-sm">
                        <p>Created: {user._count?.createdTickets || 0}</p>
                        <p>Assigned: {user._count?.assignedTickets || 0}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
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
                      <div className="text-sm">
                        {formatDate(user.lastActivity)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={user.isActive ? "destructive" : "default"}
                          onClick={() => handleToggleActive(user)}
                          disabled={actionLoading}
                        >
                          {user.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        {user.lockedAt && user.loginAttempts >= 5 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUnlockUser(user)}
                            disabled={actionLoading}
                            title="Unlock account"
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionLoading}
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
                                className="bg-red-600 hover:bg-red-700"
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

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-branch">Branch</Label>
              <Select value={formData.branchId || "none"} onValueChange={(value) => setFormData({...formData, branchId: value === "none" ? "" : value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Branch</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-support-group">Support Group</Label>
              <Select value={formData.supportGroupId || "none"} onValueChange={(value) => setFormData({...formData, supportGroupId: value === "none" ? "" : value})}>
                <SelectTrigger>
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
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={actionLoading}>
              {actionLoading ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}