'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Edit,
  Moon,
  Calendar,
  Server,
  UserCheck,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Building,
  Sun
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface StaffProfile {
  id: string;
  userId: string;
  canWorkType1: boolean; // NIGHT_WEEKDAY (20:00-07:59) - Weekdays
  canWorkType2: boolean; // DAY_WEEKEND (08:00-19:00) - Weekends/Holidays
  canWorkType3: boolean; // NIGHT_WEEKEND (20:00-07:59) - Weekends/Holidays
  canWorkType4: boolean; // STANDBY_ONCALL - Everyday (Server only)
  canWorkType5: boolean; // STANDBY_BRANCH - Everyday (Non-server only)
  hasServerAccess: boolean;
  hasSabbathRestriction: boolean;
  preferredShiftType: string | null;
  maxNightShiftsPerMonth: number;
  minDaysBetweenNightShifts: number;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  branch: {
    name: string;
    code: string;
  };
  _count: {
    shiftAssignments: number;
    leaveRequests: number;
    onCallAssignments: number;
  };
}

interface ProfileFormData {
  userId: string;
  canWorkType1: boolean; // NIGHT_WEEKDAY
  canWorkType2: boolean; // DAY_WEEKEND
  canWorkType3: boolean; // NIGHT_WEEKEND
  canWorkType4: boolean; // STANDBY_ONCALL
  canWorkType5: boolean; // STANDBY_BRANCH
  hasServerAccess: boolean;
  hasSabbathRestriction: boolean;
  preferredShiftType: string;
  maxNightShiftsPerMonth: number;
  minDaysBetweenNightShifts: number;
  isActive: boolean;
}

export default function StaffProfilesPage() {
  const { data: session } = useSession();
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<StaffProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingProfile, setDeletingProfile] = useState<StaffProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>({
    userId: '',
    canWorkType1: false,
    canWorkType2: false,
    canWorkType3: false,
    canWorkType4: false,
    canWorkType5: false,
    hasServerAccess: false,
    hasSabbathRestriction: false,
    preferredShiftType: '',
    maxNightShiftsPerMonth: 5,
    minDaysBetweenNightShifts: 3,
    isActive: true,
  });

  useEffect(() => {
    if (session?.user?.branchId) {
      fetchProfiles();
    }
  }, [session, statusFilter]);

  // Server access validation: Enforce shift type rules based on hasServerAccess
  useEffect(() => {
    if (formData.hasServerAccess) {
      // Server staff: Can ONLY work Types 1, 3, 4
      // Disable and uncheck Types 2 and 5
      setFormData(prev => ({
        ...prev,
        canWorkType2: false, // DAY_WEEKEND - server staff cannot work
        canWorkType5: false, // STANDBY_BRANCH - server staff cannot work
      }));
    } else {
      // Non-server staff: Can ONLY work Types 1, 2, 3, 5
      // Disable and uncheck Type 4
      setFormData(prev => ({
        ...prev,
        canWorkType4: false, // STANDBY_ONCALL - only server staff can work
      }));
    }
  }, [formData.hasServerAccess]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        branchId: session?.user?.branchId || '',
        ...(statusFilter !== 'all' && { isActive: statusFilter }),
      });

      const response = await fetch(`/api/shifts/staff-profiles?${params}`);
      if (!response.ok) throw new Error('Failed to fetch profiles');

      const data = await response.json();
      setProfiles(data.data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Failed to load staff profiles');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      // Fetch technicians from manager users endpoint for shift scheduling
      const response = await fetch(`/api/manager/users?role=TECHNICIAN&status=active&limit=1000`);
      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      // Filter out users who already have profiles
      const existingUserIds = profiles.map(p => p.userId);
      const availableUsers = data.users?.filter((u: User) => !existingUserIds.includes(u.id)) || [];
      setUsers(availableUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load technicians');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreate = () => {
    setEditingProfile(null);
    setFormData({
      userId: '',
      canWorkType1: false,
      canWorkType2: false,
      canWorkType3: false,
      canWorkType4: false,
      canWorkType5: false,
      hasServerAccess: false,
      hasSabbathRestriction: false,
      preferredShiftType: '',
      maxNightShiftsPerMonth: 5,
      minDaysBetweenNightShifts: 3,
      isActive: true,
    });
    fetchUsers();
    setIsDialogOpen(true);
  };

  const handleEdit = (profile: StaffProfile) => {
    setEditingProfile(profile);
    setFormData({
      userId: profile.userId,
      canWorkType1: profile.canWorkType1,
      canWorkType2: profile.canWorkType2,
      canWorkType3: profile.canWorkType3,
      canWorkType4: profile.canWorkType4,
      canWorkType5: profile.canWorkType5,
      hasServerAccess: profile.hasServerAccess,
      hasSabbathRestriction: profile.hasSabbathRestriction,
      preferredShiftType: profile.preferredShiftType || '',
      maxNightShiftsPerMonth: profile.maxNightShiftsPerMonth,
      minDaysBetweenNightShifts: profile.minDaysBetweenNightShifts,
      isActive: profile.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.userId) {
      toast.error('Please select a user');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/shifts/staff-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          branchId: session?.user?.branchId,
          preferredShiftType: formData.preferredShiftType || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save profile');

      toast.success(editingProfile ? 'Profile updated successfully' : 'Profile created successfully');
      setIsDialogOpen(false);
      fetchProfiles();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProfile) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/shifts/staff-profiles?userId=${deletingProfile.userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete profile');
      }

      toast.success('Staff profile deleted successfully');
      setDeletingProfile(null);
      fetchProfiles();
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      toast.error(error.message || 'Failed to delete profile');
    } finally {
      setDeleting(false);
    }
  };

  if (!session) {
    return null;
  }

  const filteredProfiles = statusFilter === 'all'
    ? profiles
    : profiles.filter(p => p.isActive === (statusFilter === 'true'));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Staff Shift Profiles</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage technician shift preferences and constraints for scheduling
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Technician Profile
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full md:w-64">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                <SelectItem value="true">Active Only</SelectItem>
                <SelectItem value="false">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Profiles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Profiles ({filteredProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
              <p>Loading profiles...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No staff profiles found</p>
              <Button variant="outline" className="mt-4" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Profile
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Restrictions</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.user.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{profile.user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {profile.canWorkType1 && (
                          <Badge variant="outline" className="text-xs bg-indigo-50 dark:bg-indigo-900/20">
                            <Moon className="w-3 h-3 mr-1" />
                            Type 1
                          </Badge>
                        )}
                        {profile.canWorkType2 && (
                          <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/20">
                            <Sun className="w-3 h-3 mr-1" />
                            Type 2
                          </Badge>
                        )}
                        {profile.canWorkType3 && (
                          <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20">
                            <Moon className="w-3 h-3 mr-1" />
                            Type 3
                          </Badge>
                        )}
                        {profile.canWorkType4 && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-900/20">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Type 4
                          </Badge>
                        )}
                        {profile.canWorkType5 && (
                          <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-900/20">
                            <Building className="w-3 h-3 mr-1" />
                            Type 5
                          </Badge>
                        )}
                        {profile.hasServerAccess && (
                          <Badge variant="outline" className="text-xs">
                            <Server className="w-3 h-3 mr-1" />
                            Server
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {profile.hasSabbathRestriction ? (
                        <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-900/20">
                          Sabbath
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-500">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-gray-600">
                          {profile._count.shiftAssignments} shifts
                        </div>
                        <div className="text-xs text-gray-500">
                          {profile._count.onCallAssignments} on-call
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {profile.isActive ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(profile)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingProfile(profile)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? 'Edit Staff Profile' : 'Create Staff Profile'}
            </DialogTitle>
            <DialogDescription>
              Configure shift scheduling preferences and constraints for staff member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* User Selection */}
            {!editingProfile && (
              <div className="space-y-2">
                <Label>Technician *</Label>
                <Select
                  value={formData.userId}
                  onValueChange={(value) => setFormData({ ...formData, userId: value })}
                  disabled={loadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingUsers ? (
                      <SelectItem value="loading" disabled>Loading technicians...</SelectItem>
                    ) : users.length === 0 ? (
                      <SelectItem value="none" disabled>No available technicians</SelectItem>
                    ) : (
                      users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Only active technicians are shown. Staff profiles are for IT technicians who work shifts.
                </p>
              </div>
            )}

            {editingProfile && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-medium">{editingProfile.user.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{editingProfile.user.email}</p>
              </div>
            )}

            {/* Server Access First */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Server Access</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="server"
                  checked={formData.hasServerAccess}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, hasServerAccess: checked as boolean })
                  }
                />
                <label
                  htmlFor="server"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Has server access
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Server staff can work Types 1, 3, 4 only. Non-server staff can work Types 1, 2, 3, 5 only.
              </p>
            </div>

            {/* Shift Types Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Shift Types</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select which shift types this staff can work:
              </p>

              <div className="space-y-3 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                {/* Type 1 */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type1"
                    checked={formData.canWorkType1}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canWorkType1: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="type1"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/20">
                        <Moon className="w-3 h-3 mr-1" />
                        Type 1
                      </Badge>
                      <span>Night Weekday (20:00-07:59) - Mon-Fri</span>
                    </div>
                  </label>
                </div>

                {/* Type 2 */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type2"
                    checked={formData.canWorkType2}
                    disabled={formData.hasServerAccess}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canWorkType2: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="type2"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20">
                        <Sun className="w-3 h-3 mr-1" />
                        Type 2
                      </Badge>
                      <span>Day Weekend (08:00-19:00) - Sat-Sun/Holidays</span>
                      {formData.hasServerAccess && <span className="text-xs text-red-500">(Server staff cannot work)</span>}
                    </div>
                  </label>
                </div>

                {/* Type 3 */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type3"
                    checked={formData.canWorkType3}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canWorkType3: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="type3"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20">
                        <Moon className="w-3 h-3 mr-1" />
                        Type 3
                      </Badge>
                      <span>Night Weekend (20:00-07:59) - Sat-Sun/Holidays</span>
                    </div>
                  </label>
                </div>

                {/* Type 4 */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type4"
                    checked={formData.canWorkType4}
                    disabled={!formData.hasServerAccess}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canWorkType4: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="type4"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Type 4
                      </Badge>
                      <span>Standby On-Call - Everyday</span>
                      {!formData.hasServerAccess && <span className="text-xs text-red-500">(Only server staff)</span>}
                    </div>
                  </label>
                </div>

                {/* Type 5 */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type5"
                    checked={formData.canWorkType5}
                    disabled={formData.hasServerAccess}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canWorkType5: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="type5"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20">
                        <Building className="w-3 h-3 mr-1" />
                        Type 5
                      </Badge>
                      <span>Standby Branch Operations - Everyday</span>
                      {formData.hasServerAccess && <span className="text-xs text-red-500">(Server staff cannot work)</span>}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Restrictions */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Restrictions</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sabbath"
                  checked={formData.hasSabbathRestriction}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, hasSabbathRestriction: checked as boolean })
                  }
                />
                <label
                  htmlFor="sabbath"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Has Sabbath restrictions (Friday sunset to Saturday sunset)
                </label>
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Preferences</Label>

              <div className="space-y-2">
                <Label>Preferred Shift Type</Label>
                <Select
                  value={formData.preferredShiftType || "NONE"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, preferredShiftType: value === "NONE" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No preference</SelectItem>
                    <SelectItem value="DAY">Day Shift</SelectItem>
                    <SelectItem value="NIGHT">Night Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Constraints */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Shift Constraints</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Night Shifts Per Month</Label>
                  <Input
                    type="number"
                    min="0"
                    max="15"
                    value={formData.maxNightShiftsPerMonth}
                    onChange={(e) =>
                      setFormData({ ...formData, maxNightShiftsPerMonth: parseInt(e.target.value) || 5 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Min Days Between Night Shifts</Label>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    value={formData.minDaysBetweenNightShifts}
                    onChange={(e) =>
                      setFormData({ ...formData, minDaysBetweenNightShifts: parseInt(e.target.value) || 3 })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked as boolean })
                  }
                />
                <label
                  htmlFor="active"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Active (include in shift scheduling)
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  {editingProfile ? 'Update Profile' : 'Create Profile'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingProfile} onOpenChange={(open) => !open && setDeletingProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Staff Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the profile for <strong>{deletingProfile?.user.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          {deletingProfile && deletingProfile._count.shiftAssignments > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> This profile has {deletingProfile._count.shiftAssignments} shift assignment(s).
                The profile cannot be deleted. Consider setting it to inactive instead.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingProfile(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || (deletingProfile && deletingProfile._count.shiftAssignments > 0)}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Profile
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}