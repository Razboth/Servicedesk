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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
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
  ToggleRight,
  MapPin,
  Filter,
  XCircle,
  RefreshCw,
  CheckCircle,
  Activity,
  Globe,
  Signal,
  WifiOff
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

  // Stats computed from branches
  const stats = {
    total: pagination.total,
    active: branches.filter(b => b.isActive).length,
    inactive: branches.filter(b => !b.isActive).length,
    totalUsers: branches.reduce((sum, b) => sum + b._count.users, 0),
    totalATMs: branches.reduce((sum, b) => sum + b._count.atms, 0),
  };

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

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
  };

  const hasActiveFilters = search || status !== 'all';

  // Group branches by province for display
  const branchesByProvince = branches.reduce((acc, branch) => {
    const province = branch.province || 'Unknown';
    if (!acc[province]) {
      acc[province] = [];
    }
    acc[province].push(branch);
    return acc;
  }, {} as Record<string, Branch[]>);

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <PageHeader
          title="Branch Management"
          description="Manage bank branches, locations, and network connectivity"
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Total Branches"
            value={stats.total}
            icon={Building2}
            description="All registered branches"
          />
          <StatCard
            title="Active"
            value={stats.active}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Inactive"
            value={stats.inactive}
            icon={WifiOff}
            variant={stats.inactive > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            variant="info"
          />
          <StatCard
            title="Total ATMs"
            value={stats.totalATMs}
            icon={CreditCard}
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
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            {hasActiveFilters && (
              <div className="mt-3 text-sm text-muted-foreground">
                Showing {branches.length} of {pagination.total} branches
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branches Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Branch Name</TableHead>
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4" />
                      Users
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <Ticket className="h-4 w-4" />
                      Tickets
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <CreditCard className="h-4 w-4" />
                      ATMs
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading branches...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : branches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        No branches found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  branches.map((branch) => (
                    <TableRow key={branch.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${branch.isActive ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'}`} />
                          <span className="font-medium text-foreground">{branch.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded text-foreground">
                          {branch.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div>
                            {branch.city && branch.province ? (
                              <>
                                <span className="text-foreground">{branch.city}</span>
                                <span className="text-muted-foreground block text-sm">{branch.province}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">
                                {branch.city || branch.province || '-'}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={branch._count.users > 0 ? 'default-soft' : 'ghost'}>
                          {branch._count.users}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={branch._count.tickets > 0 ? 'info-soft' : 'ghost'}>
                          {branch._count.tickets}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={branch._count.atms > 0 ? 'success-soft' : 'ghost'}>
                          {branch._count.atms}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={branch.isActive ? 'success' : 'secondary'}>
                          {branch.isActive ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                          ) : (
                            <><WifiOff className="h-3 w-3 mr-1" /> Inactive</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link href={`/admin/branches/${branch.id}`}>
                            <Button variant="ghost" size="iconSm" title="Edit Branch">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            onClick={() => handleToggleStatus(branch)}
                            title={branch.isActive ? "Deactivate Branch" : "Activate Branch"}
                            className={branch.isActive ? 'text-[hsl(var(--success))] hover:text-[hsl(var(--success))]' : 'text-muted-foreground hover:text-foreground'}
                          >
                            {branch.isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="iconSm"
                                title="Permanently delete branch"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Branch</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <p className="mb-2">
                                    Are you sure you want to permanently delete <strong>{branch.name}</strong>?
                                  </p>
                                  <p className="text-destructive">
                                    This action cannot be undone. All associated audit logs will also be deleted.
                                  </p>
                                  {(branch._count.users > 0 || branch._count.tickets > 0 || branch._count.atms > 0) && (
                                    <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                                      <p className="font-medium text-destructive">Warning: This branch has associated data:</p>
                                      <ul className="list-disc list-inside text-sm mt-1">
                                        {branch._count.users > 0 && <li>{branch._count.users} users</li>}
                                        {branch._count.tickets > 0 && <li>{branch._count.tickets} tickets</li>}
                                        {branch._count.atms > 0 && <li>{branch._count.atms} ATMs</li>}
                                      </ul>
                                    </div>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(branch.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Permanently
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

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
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
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
