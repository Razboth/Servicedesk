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
  MapPin,
  ToggleLeft,
  ToggleRight,
  WifiOff,
  Clock,
  Wifi,
  RefreshCw
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
  networkStatus?: {
    networkStatus: 'ONLINE' | 'OFFLINE' | 'SLOW' | 'TIMEOUT' | 'ERROR' | 'WARNING' | 'MAINTENANCE';
    responseTimeMs?: number;
    packetLoss?: number;
    errorMessage?: string;
    checkedAt: string;
    statusChangedAt?: string;
    downSince?: string;
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
        problemsOnly: 'true',
        includeNetworkStatus: 'true',
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

  const handleToggleStatus = async (atm: any) => {
    try {
      const response = await fetch(`/api/admin/atms/${atm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !atm.isActive
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update ATM status');
      }

      toast.success(`ATM ${atm.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchATMs();
    } catch (error: any) {
      console.error('Toggle status error:', error);
      toast.error(error.message || 'Failed to update ATM status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('WARNING: This will permanently delete the ATM from the database. This action cannot be undone. Are you sure?')) {
      return;
    }

    if (!confirm('This is your final warning! The ATM and all related data will be PERMANENTLY DELETED. Continue?')) {
      return;
    }

    try {
      console.log('Deleting ATM with ID:', id);
      
      const response = await fetch(`/api/admin/atms/${id}`, {
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
        const errorMessage = data.error || 'Failed to delete ATM';
        const errorDetails = data.details ? `\n${data.details}` : '';
        throw new Error(errorMessage + errorDetails);
      }

      toast.success(data.message || 'ATM permanently deleted');
      fetchATMs();
    } catch (error: any) {
      console.error('Delete error:', error);
      // Show the actual error message
      const errorMessage = error.message || 'Failed to delete ATM';
      toast.error(errorMessage);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            ATM Problems Dashboard
          </h1>
          <p className="text-gray-600 mt-1">ATMs with network issues (received via monitoring API)</p>
          <p className="text-xs text-orange-600 mt-1">
            Only showing ATMs with problems: OFFLINE, SLOW, TIMEOUT, ERROR, WARNING, MAINTENANCE
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchATMs()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/admin/atms/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add ATM
            </Button>
          </Link>
        </div>
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
                <TableHead>Network Status</TableHead>
                <TableHead>Last Check</TableHead>
                <TableHead className="text-center">Incidents</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading ATMs with problems...
                  </TableCell>
                </TableRow>
              ) : atms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Wifi className="h-12 w-12 text-green-500" />
                      <p className="text-lg font-medium text-green-600">All ATMs are Online!</p>
                      <p className="text-sm text-gray-500">No ATM problems detected from monitoring API</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                atms.map((atm) => {
                  const ns = atm.networkStatus;
                  const getStatusBadge = () => {
                    if (!ns) return <Badge variant="secondary">No Data</Badge>;
                    switch (ns.networkStatus) {
                      case 'OFFLINE':
                      case 'TIMEOUT':
                        return <Badge className="bg-red-100 text-red-800 border-red-200">{ns.networkStatus}</Badge>;
                      case 'SLOW':
                      case 'WARNING':
                        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{ns.networkStatus}</Badge>;
                      case 'ERROR':
                      case 'MAINTENANCE':
                        return <Badge className="bg-red-100 text-red-800 border-red-200">{ns.networkStatus}</Badge>;
                      default:
                        return <Badge variant="secondary">{ns.networkStatus}</Badge>;
                    }
                  };

                  const formatTimeAgo = (dateString?: string) => {
                    if (!dateString) return 'Never';
                    const date = new Date(dateString);
                    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
                    if (seconds < 60) return `${seconds}s ago`;
                    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
                    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
                    return `${Math.floor(seconds / 86400)}d ago`;
                  };

                  return (
                    <TableRow key={atm.id} className="bg-red-50/50">
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
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge()}
                          {ns?.responseTimeMs && (
                            <span className="text-xs text-gray-500">{ns.responseTimeMs}ms</span>
                          )}
                          {ns?.packetLoss && ns.packetLoss > 0 && (
                            <span className="text-xs text-red-500">{ns.packetLoss}% loss</span>
                          )}
                          {ns?.errorMessage && (
                            <span className="text-xs text-red-600 truncate max-w-[150px]" title={ns.errorMessage}>
                              {ns.errorMessage}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {formatTimeAgo(ns?.checkedAt)}
                        </div>
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
                        <div className="flex gap-2">
                          <Link href={`/admin/atms/${atm.id}`}>
                            <Button variant="ghost" size="sm" title="View ATM Details">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(atm)}
                            title={atm.isActive ? "Deactivate ATM" : "Activate ATM"}
                          >
                            {atm.isActive ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(atm.id)}
                            disabled={false}
                            title="Permanently delete ATM"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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