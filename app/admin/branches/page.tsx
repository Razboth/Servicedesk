'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Ticket, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  province?: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    users: number;
    tickets: number;
    atms: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function BranchesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchBranches();
  }, [search, status, pagination.page]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(status !== 'all' && { status })
      });

      const response = await fetch(`/api/admin/branches?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Branch API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch branches');
      }

      const data = await response.json();
      setBranches(data.branches);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    try {
      const response = await fetch(`/api/admin/branches/${branch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !branch.isActive
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update branch status');
      }

      toast.success(`Branch ${branch.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchBranches();
    } catch (error: any) {
      console.error('Toggle status error:', error);
      toast.error(error.message || 'Failed to update branch status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('WARNING: This will permanently delete the branch from the database. This action cannot be undone. Are you sure?')) {
      return;
    }

    if (!confirm('This is your final warning! The branch and all audit logs will be PERMANENTLY DELETED. Continue?')) {
      return;
    }

    try {
      console.log('Deleting branch with ID:', id);
      
      const response = await fetch(`/api/admin/branches/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Delete response status:', response.status);
      
      const data = await response.json();
      console.log('Delete response data:', data);

      if (!response.ok) {
        // Show detailed error if available
        const errorMessage = data.error || 'Failed to delete branch';
        const errorDetails = data.details ? `\n${data.details}` : '';
        throw new Error(errorMessage + errorDetails);
      }

      toast.success(data.message || 'Branch permanently deleted');
      fetchBranches();
    } catch (error: any) {
      console.error('Delete error:', error);
      // Show the actual error message
      const errorMessage = error.message || 'Failed to delete branch';
      toast.error(errorMessage);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Branch Management"
        description="Manage bank branches and their details"
        icon={<Building2 className="h-6 w-6" />}
        action={
          <Link href="/admin/branches/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Branch
            </Button>
          </Link>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, code, or city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
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
                <TableHead>Branch Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Tickets</TableHead>
                <TableHead className="text-center">ATMs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading branches...
                  </TableCell>
                </TableRow>
              ) : branches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No branches found
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>{branch.code}</TableCell>
                    <TableCell>
                      {branch.city && branch.province ? 
                        `${branch.city}, ${branch.province}` : 
                        branch.city || branch.province || '-'
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        {branch._count.users}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Ticket className="h-4 w-4 text-gray-400" />
                        {branch._count.tickets}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        {branch._count.atms}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={branch.isActive ? 'success' : 'secondary'}>
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/branches/${branch.id}`}>
                          <Button variant="ghost" size="sm" title="Edit Branch">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(branch)}
                          title={branch.isActive ? "Deactivate Branch" : "Activate Branch"}
                        >
                          {branch.isActive ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(branch.id)}
                          disabled={false}
                          title="Permanently delete branch"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} branches
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}