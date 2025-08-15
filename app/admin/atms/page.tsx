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
import { toast } from 'sonner';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MapPin
} from 'lucide-react';

interface ATM {
  id: string;
  code: string;
  name: string;
  location?: string;
  ipAddress?: string;
  isActive: boolean;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    incidents: number;
  };
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ATMsPage() {
  const router = useRouter();
  const [atms, setATMs] = useState<ATM[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [status, setStatus] = useState('all');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchATMs();
  }, [search, selectedBranch, status, pagination.page]);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/admin/branches?limit=100&status=active');
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Branch API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch branches');
      }
      const data = await response.json();
      setBranches(data.branches);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchATMs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(selectedBranch !== 'all' && { branchId: selectedBranch }),
        ...(status !== 'all' && { status })
      });

      const response = await fetch(`/api/admin/atms?${params}`);
      if (!response.ok) throw new Error('Failed to fetch ATMs');

      const data = await response.json();
      setATMs(data.atms);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching ATMs:', error);
      toast.error('Failed to load ATMs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this ATM?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/atms/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete ATM');
      }

      toast.success('ATM deactivated successfully');
      fetchATMs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete ATM');
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            ATM Management
          </h1>
          <p className="text-gray-600 mt-1">Manage bank ATMs across all branches</p>
        </div>
        <Link href="/admin/atms/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add ATM
          </Button>
        </Link>
      </div>

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
                  placeholder="Search by code, name, or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[200px]">
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
                <TableHead>ATM Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="text-center">Incidents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading ATMs...
                  </TableCell>
                </TableRow>
              ) : atms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No ATMs found
                  </TableCell>
                </TableRow>
              ) : (
                atms.map((atm) => (
                  <TableRow key={atm.id}>
                    <TableCell className="font-medium">{atm.code}</TableCell>
                    <TableCell>{atm.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {atm.branch.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {atm.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{atm.location}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {atm.ipAddress || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {atm._count.incidents > 0 && (
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          {atm._count.incidents}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={atm.isActive ? 'success' : 'secondary'}>
                        {atm.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/atms/${atm.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(atm.id)}
                          disabled={!atm.isActive}
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
                {pagination.total} ATMs
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