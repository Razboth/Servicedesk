'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/ui/page-header';
import { Key, Copy, Trash2, Edit, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  description?: string;
  permissions?: any;
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  usageCount: number;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
  linkedUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

// Available permissions
const AVAILABLE_PERMISSIONS = [
  { value: '*', label: 'Full Access', description: 'Complete API access' },
  { value: 'tickets:*', label: 'Tickets (All)', description: 'Full access to tickets' },
  { value: 'tickets:create', label: 'Create Tickets', description: 'Create new tickets' },
  { value: 'tickets:read', label: 'Read Tickets', description: 'View ticket details' },
  { value: 'tickets:update', label: 'Update Tickets', description: 'Modify existing tickets' },
  { value: 'tickets:delete', label: 'Delete Tickets', description: 'Remove tickets' },
  { value: 'claims:*', label: 'Claims (All)', description: 'Full access to claims' },
  { value: 'claims:create', label: 'Create Claims', description: 'Submit new claims' },
  { value: 'claims:read', label: 'Read Claims', description: 'View claim details' },
  { value: 'atms:*', label: 'ATMs (All)', description: 'Full access to ATM data' },
  { value: 'atms:read', label: 'Read ATMs', description: 'View ATM information' },
  { value: 'services:*', label: 'Services (All)', description: 'Full access to services' },
  { value: 'services:read', label: 'Read Services', description: 'View service catalog' },
  { value: 'users:*', label: 'Users (All)', description: 'Full access to users' },
  { value: 'users:read', label: 'Read Users', description: 'View user information' },
  { value: 'soc', label: 'SOC Integration', description: 'Security Operations Center access' },
  { value: 'reports:*', label: 'Reports (All)', description: 'Full access to reports' },
  { value: 'reports:read', label: 'Read Reports', description: 'View and generate reports' },
];

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expiresIn, setExpiresIn] = useState('365');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [linkedUserId, setLinkedUserId] = useState<string>('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  // Check authorization
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, status, router]);

  // Fetch API keys and users
  useEffect(() => {
    fetchApiKeys();
    fetchAvailableUsers();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?role=TECHNICIAN,ADMIN');
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          permissions,
          expiresIn: parseInt(expiresIn),
          linkedUserId: linkedUserId || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.fullKey);
        setShowCreateDialog(false);
        setShowKeyDialog(true);
        fetchApiKeys();
        // Reset form
        setName('');
        setDescription('');
        setExpiresIn('365');
        setLinkedUserId('');
        setPermissions([]);
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<ApiKey>) => {
    try {
      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        fetchApiKeys();
        setEditingKey(null);
      }
    } catch (error) {
      console.error('Failed to update API key:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="API Key Management"
        description="Manage API keys for external integrations"
        icon={<Key className="h-6 w-6" />}
        action={
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-brown-400 to-brown-500 dark:from-brown-200 dark:to-brown-300 text-white dark:text-brown-950 hover:from-brown-500 hover:to-brown-600 dark:hover:from-brown-300 dark:hover:to-brown-400"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Create and manage API keys for SOC integration and other external tools
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Create a new API key for external integrations
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., SOC Integration"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this API key is for"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedUser">Link to User (Optional)</Label>
                    <Select value={linkedUserId || "none"} onValueChange={(value) => setLinkedUserId(value === "none" ? "" : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user to link this API key to" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No linked user (use Admin account)</SelectItem>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email}) - {user.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Tickets created with this API key will be attributed to the linked user. Only Technicians and Admins can be selected.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires">Expires In</Label>
                    <Select value={expiresIn} onValueChange={setExpiresIn}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                        <SelectItem value="0">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                      {AVAILABLE_PERMISSIONS.map((perm) => (
                        <label key={perm.value} className="flex items-start space-x-2 hover:bg-gray-50 p-2 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={permissions.includes(perm.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // If selecting full access, clear other permissions
                                if (perm.value === '*') {
                                  setPermissions(['*']);
                                } else {
                                  // Remove full access if selecting specific permission
                                  const newPerms = permissions.filter(p => p !== '*');
                                  setPermissions([...newPerms, perm.value]);
                                }
                              } else {
                                setPermissions(permissions.filter(p => p !== perm.value));
                              }
                            }}
                            disabled={perm.value !== '*' && permissions.includes('*')}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{perm.label}</div>
                            <div className="text-xs text-gray-500">{perm.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {permissions.length === 0 && (
                      <p className="text-sm text-amber-600">Please select at least one permission</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={!name || permissions.length === 0}>
                    Create API Key
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Linked User</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{apiKey.name}</div>
                      {apiKey.description && (
                        <div className="text-sm text-gray-500">{apiKey.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {apiKey.key}
                    </code>
                  </TableCell>
                  <TableCell>
                    {apiKey.linkedUser ? (
                      <div className="text-sm">
                        <div className="font-medium">{apiKey.linkedUser.name}</div>
                        <div className="text-gray-500">{apiKey.linkedUser.role}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        <div>Admin Account</div>
                        <div className="text-xs">{apiKey.createdBy.name}</div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {apiKey.permissions && Array.isArray(apiKey.permissions) ? (
                        apiKey.permissions.length > 0 ? (
                          apiKey.permissions.slice(0, 3).map((perm: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No permissions</span>
                        )
                      ) : (
                        <span className="text-sm text-gray-500">Legacy</span>
                      )}
                      {apiKey.permissions && Array.isArray(apiKey.permissions) && apiKey.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{apiKey.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                      {apiKey.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{apiKey.usageCount} requests</div>
                      {apiKey.lastUsedAt && (
                        <div className="text-gray-500">
                          Last used: {format(new Date(apiKey.lastUsedAt), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {apiKey.expiresAt ? (
                      <div className="text-sm">
                        {format(new Date(apiKey.expiresAt), 'MMM d, yyyy')}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          handleUpdate(apiKey.id, { isActive: !apiKey.isActive });
                        }}
                      >
                        {apiKey.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(apiKey.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New API Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Save this API key securely. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Make sure to copy your API key now. You won't be able to see it again!
              </AlertDescription>
            </Alert>
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <code className="text-sm break-all">{newApiKey}</code>
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => copyToClipboard(newApiKey)}
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy API Key
                </>
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>
              I've saved the key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}