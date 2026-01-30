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
import { BranchSelect } from '@/components/ui/branch-select';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Download,
  Wifi,
  WifiOff,
  Wrench,
  Banknote,
  Eye,
  RefreshCw
} from 'lucide-react';

interface ATM {
  id: string;
  code: string;
  name: string;
  location?: string;
  ipAddress?: string;
  isActive: boolean;
  atmBrand?: string;
  atmType?: string;
  atmCategory: 'ATM' | 'CRM';
  serialNumber?: string;
  networkMedia?: string;
  networkVendor?: string;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    incidents: number;
    technicalIssueTickets?: number;
    claimTickets?: number;
  };
  networkStatus?: {
    networkStatus: string;
    responseTimeMs?: number;
    checkedAt?: string;
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

interface FiltersInfo {
  brands: string[];
}

export default function ATMsPage() {
  const router = useRouter();
  const [atms, setATMs] = useState<ATM[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [status, setStatus] = useState('all');
  const [atmBrand, setAtmBrand] = useState('all');
  const [atmCategory, setAtmCategory] = useState('all');
  const [networkStatus, setNetworkStatus] = useState('all');
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
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
  }, [search, selectedBranch, status, atmBrand, atmCategory, pagination.page]);

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
        includeNetworkStatus: 'true',
        includeTicketCounts: 'true',
        ...(search && { search }),
        ...(selectedBranch !== 'all' && { branchId: selectedBranch }),
        ...(status !== 'all' && { status }),
        ...(atmBrand !== 'all' && { atmBrand }),
        ...(atmCategory !== 'all' && { atmCategory })
      });

      const response = await fetch(`/api/admin/atms?${params}`);
      if (!response.ok) throw new Error('Failed to fetch ATMs');

      const data = await response.json();
      setATMs(data.atms);
      setPagination(data.pagination);
      if (data.filters?.brands) {
        setAvailableBrands(data.filters.brands);
      }
    } catch (error) {
      console.error('Error fetching ATMs:', error);
      toast.error('Failed to load ATMs');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (atm: ATM) => {
    try {
      const response = await fetch(`/api/admin/atms/code/${atm.code}`, {
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

  const handleDelete = async (code: string) => {
    if (!confirm('WARNING: This will permanently delete the ATM from the database. This action cannot be undone. Are you sure?')) {
      return;
    }

    if (!confirm('This is your final warning! The ATM and all related data will be PERMANENTLY DELETED. Continue?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/atms/code/${code}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to delete ATM';
        const errorDetails = data.details ? `\n${data.details}` : '';
        throw new Error(errorMessage + errorDetails);
      }

      toast.success(data.message || 'ATM permanently deleted');
      fetchATMs();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete ATM');
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      // Build export URL with current filters
      const params = new URLSearchParams({
        format,
        ...(search && { search }),
        ...(selectedBranch !== 'all' && { branchId: selectedBranch }),
        ...(status !== 'all' && { status }),
        ...(atmBrand !== 'all' && { atmBrand }),
        ...(atmCategory !== 'all' && { atmCategory })
      });

      // For now, just export current data as CSV
      const csvContent = generateCSV(atms);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `atms_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export completed');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export ATMs');
    }
  };

  const generateCSV = (data: ATM[]) => {
    const headers = [
      'ATM Code',
      'Name',
      'Branch Code',
      'Branch Name',
      'Brand',
      'Type',
      'Category',
      'Serial Number',
      'IP Address',
      'Location',
      'Network Media',
      'Network Vendor',
      'Status',
      'Active Incidents',
      'Tech Issues',
      'Claims'
    ];

    const rows = data.map(atm => [
      atm.code,
      atm.name,
      atm.branch.code,
      atm.branch.name,
      atm.atmBrand || '',
      atm.atmType || '',
      atm.atmCategory,
      atm.serialNumber || '',
      atm.ipAddress || '',
      atm.location || '',
      atm.networkMedia || '',
      atm.networkVendor || '',
      atm.isActive ? 'Active' : 'Inactive',
      atm._count.incidents.toString(),
      (atm._count.technicalIssueTickets || 0).toString(),
      (atm._count.claimTickets || 0).toString()
    ]);

    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  };

  const getNetworkStatusBadge = (atm: ATM) => {
    if (!atm.networkStatus) {
      return <Badge variant="outline" className="text-gray-400">No Data</Badge>;
    }

    const status = atm.networkStatus.networkStatus;
    switch (status) {
      case 'ONLINE':
        return (
          <Badge variant="success" className="gap-1">
            <Wifi className="h-3 w-3" />
            Online
          </Badge>
        );
      case 'OFFLINE':
        return (
          <Badge variant="destructive" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Offline
          </Badge>
        );
      case 'SLOW':
        return (
          <Badge variant="warning" className="gap-1">
            <Wifi className="h-3 w-3" />
            Slow
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Warning
          </Badge>
        );
      case 'ERROR':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedBranch('all');
    setStatus('all');
    setAtmBrand('all');
    setAtmCategory('all');
    setNetworkStatus('all');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = search || selectedBranch !== 'all' || status !== 'all' ||
    atmBrand !== 'all' || atmCategory !== 'all' || networkStatus !== 'all';

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            ATM Management
          </h1>
          <p className="text-gray-600 mt-1">Manage bank ATMs across all branches</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/admin/atms/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add ATM
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Filters</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
            {/* Search */}
            <div className="col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search code, name, location, serial..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Branch Filter */}
            <BranchSelect
              branches={branches}
              value={selectedBranch}
              onValueChange={setSelectedBranch}
              allOption={true}
              allOptionLabel="All Branches"
            />

            {/* Brand Filter */}
            <Select value={atmBrand} onValueChange={setAtmBrand}>
              <SelectTrigger>
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {availableBrands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={atmCategory} onValueChange={setAtmCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="ATM">ATM</SelectItem>
                <SelectItem value="CRM">CRM</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={status} onValueChange={setStatus}>
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
                <TableHead className="w-[100px]">ATM Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Brand / Type</TableHead>
                <TableHead className="text-center">Category</TableHead>
                <TableHead className="text-center">Network</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Incidents</TableHead>
                <TableHead className="text-center">Tech Issues</TableHead>
                <TableHead className="text-center">Claims</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8">
                    Loading ATMs...
                  </TableCell>
                </TableRow>
              ) : atms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8">
                    No ATMs found
                  </TableCell>
                </TableRow>
              ) : (
                atms.map((atm) => (
                  <TableRow key={atm.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{atm.code}</TableCell>
                    <TableCell className="font-medium">{atm.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {atm.branch.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{atm.atmBrand || '-'}</p>
                        <p className="text-muted-foreground text-xs">{atm.atmType || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={atm.atmCategory === 'CRM' ? 'default' : 'secondary'}>
                        {atm.atmCategory}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {getNetworkStatusBadge(atm)}
                    </TableCell>
                    <TableCell>
                      {atm.location ? (
                        <div className="flex items-center gap-1 max-w-[150px]">
                          <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-sm truncate" title={atm.location}>
                            {atm.location}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {atm._count.incidents > 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {atm._count.incidents}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/admin/atms/${atm.code}?tab=tickets`}>
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-muted gap-1"
                        >
                          <Wrench className="h-3 w-3" />
                          {atm._count.technicalIssueTickets || 0}
                        </Badge>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/admin/atms/${atm.code}?tab=claims`}>
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-muted gap-1"
                        >
                          <Banknote className="h-3 w-3" />
                          {atm._count.claimTickets || 0}
                        </Badge>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={atm.isActive ? 'success' : 'secondary'}>
                        {atm.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/admin/atms/${atm.code}`}>
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="h-4 w-4" />
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
                          onClick={() => handleDelete(atm.code)}
                          title="Permanently delete ATM"
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
