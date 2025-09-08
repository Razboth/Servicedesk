'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  UserPlus,
  Building2,
  Mail,
  Phone,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Copy,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

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

export default function CreateUserPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    phone: '',
    role: 'USER',
    branchId: '',
    supportGroupId: '',
    generatePassword: true,
    sendEmail: false
  });

  useEffect(() => {
    fetchBranches();
    fetchSupportGroups();
  }, []);

  useEffect(() => {
    // Reset branch/support group based on role
    if (formData.role === 'TECHNICIAN') {
      setFormData(prev => ({ ...prev, branchId: '' }));
    } else if (['ADMIN', 'SECURITY_ANALYST'].includes(formData.role)) {
      setFormData(prev => ({ ...prev, branchId: '', supportGroupId: '' }));
    } else {
      setFormData(prev => ({ ...prev, supportGroupId: '' }));
    }
  }, [formData.role]);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches');
      if (!response.ok) throw new Error('Failed to fetch branches');
      const data = await response.json();
      // API returns array directly, not wrapped in { branches: [...] }
      setBranches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to load branches');
    }
  };

  const fetchSupportGroups = async () => {
    try {
      const response = await fetch('/api/admin/support-groups?status=active');
      if (!response.ok) throw new Error('Failed to fetch support groups');
      const data = await response.json();
      setSupportGroups(data);
    } catch (error) {
      console.error('Error fetching support groups:', error);
      toast.error('Failed to load support groups');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        password: formData.generatePassword ? undefined : formData.password
      };

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const data = await response.json();
      
      if (data.tempPassword && !formData.sendEmail) {
        setGeneratedPassword(data.tempPassword);
        toast.success('User created successfully!');
      } else {
        toast.success('User created and email sent!');
        router.push('/admin/users');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Password copied to clipboard');
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Full system access, can manage all settings and users';
      case 'MANAGER':
        return 'Can manage branch operations and approve tickets';
      case 'TECHNICIAN':
        return 'Can handle and resolve assigned tickets';
      case 'AGENT':
        return 'Can create and manage tickets for the branch';
      case 'USER':
        return 'Can create tickets and view their own tickets';
      case 'SECURITY_ANALYST':
        return 'Can view security reports and audit logs';
      default:
        return '';
    }
  };

  if (generatedPassword) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-6 w-6" />
              User Created Successfully
            </CardTitle>
            <CardDescription>
              Save these credentials securely. The password cannot be retrieved later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 mb-4">
                User account has been created. Please share these credentials securely with the user.
              </p>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-green-800">Email</Label>
                  <p className="font-mono bg-white px-3 py-2 rounded border">{formData.email}</p>
                </div>
                
                <div>
                  <Label className="text-green-800">Temporary Password</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 font-mono bg-white px-3 py-2 rounded border flex items-center justify-between">
                      <span>{showPassword ? generatedPassword : '••••••••••••'}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyPassword}
                    >
                      {copied ? 'Copied!' : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setGeneratedPassword('');
                  setFormData({
                    email: '',
                    name: '',
                    password: '',
                    phone: '',
                    role: 'USER',
                    branchId: '',
                    supportGroupId: '',
                    generatePassword: true,
                    sendEmail: false
                  });
                }}
                variant="outline"
              >
                Create Another User
              </Button>
              <Link href="/admin/users">
                <Button>
                  Go to Users List
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Create New User
          </CardTitle>
          <CardDescription>
            Add a new user to the system with appropriate role and permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="AGENT">Agent</SelectItem>
                      <SelectItem value="TECHNICIAN">Technician</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="SECURITY_ANALYST">Security Analyst</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    {getRoleDescription(formData.role)}
                  </p>
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Assignment</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                {['USER', 'AGENT', 'MANAGER'].includes(formData.role) && (
                  <div className="space-y-2">
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
                )}

                {formData.role === 'TECHNICIAN' && (
                  <div className="space-y-2">
                    <Label htmlFor="supportGroup">Support Group *</Label>
                    <Select
                      value={formData.supportGroupId}
                      onValueChange={(value) => setFormData({ ...formData, supportGroupId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a support group" />
                      </SelectTrigger>
                      <SelectContent>
                        {supportGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Password Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Password Options</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="generatePassword"
                    checked={formData.generatePassword}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, generatePassword: checked as boolean })
                    }
                  />
                  <Label htmlFor="generatePassword">
                    Generate secure password automatically
                  </Label>
                </div>

                {!formData.generatePassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-10 pr-10"
                        required={!formData.generatePassword}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendEmail"
                    checked={formData.sendEmail}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, sendEmail: checked as boolean })
                    }
                  />
                  <Label htmlFor="sendEmail">
                    Send credentials via email (not implemented yet)
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
              <Link href="/admin/users">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}