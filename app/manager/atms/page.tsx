'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
  Search, 
  Building2,
  MapPin,
  AlertTriangle,
  Activity,
  WifiOff,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

interface ATM {
  id: string;
  code: string;
  name: string;
  location?: string;
  ipAddress?: string;
  isActive: boolean;
  lastHeartbeat?: string;
  _count: {
    incidents: number;
  };
  activeIncidents: number;
}

interface BranchInfo {
  name: string;
  code: string;
  atmCount: number;
  activeATMs: number;
}

export default function ManagerATMsPage() {
  const { data: session } = useSession();
  const [atms, setATMs] = useState<ATM[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);

  useEffect(() => {
    fetchATMs();
  }, [search, statusFilter]);

  const fetchATMs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/manager/atms?${params}`);
      if (!response.ok) throw new Error('Failed to fetch ATMs');

      const data = await response.json();
      setATMs(data.atms);
      setBranchInfo(data.branchInfo);
    } catch (error) {
      console.error('Error fetching ATMs:', error);
      toast.error('Failed to load ATMs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (atm: ATM) => {
    if (!atm.isActive) {
      return <WifiOff className="h-5 w-5 text-gray-400" />;
    }
    if (atm.activeIncidents > 0) {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = (atm: ATM) => {
    if (!atm.isActive) return 'Inactive';
    if (atm.activeIncidents > 0) return 'Has Issues';
    return 'Operational';
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          ATM Management
        </h1>
        {branchInfo && (
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {branchInfo.name} ({branchInfo.code}) - {branchInfo.activeATMs} of {branchInfo.atmCount} ATMs active
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total ATMs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branchInfo?.atmCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Operational</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {atms.filter(a => a.isActive && a.activeIncidents === 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-600">With Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {atms.filter(a => a.activeIncidents > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {atms.filter(a => !a.isActive).length}
            </div>
          </CardContent>
        </Card>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="issues">Has Issues</SelectItem>
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
                <TableHead>Status</TableHead>
                <TableHead>ATM Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="text-center">Total Incidents</TableHead>
                <TableHead className="text-center">Active Issues</TableHead>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(atm)}
                        <span className="text-sm">{getStatusText(atm)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{atm.code}</TableCell>
                    <TableCell>{atm.name}</TableCell>
                    <TableCell>
                      {atm.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{atm.location}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {atm.ipAddress || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {atm._count.incidents}
                    </TableCell>
                    <TableCell className="text-center">
                      {atm.activeIncidents > 0 && (
                        <Badge variant="destructive">
                          {atm.activeIncidents}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/manager/atms/${atm.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                        {atm.activeIncidents > 0 && (
                          <Link href={`/tickets/create?atmId=${atm.id}`}>
                            <Button variant="destructive" size="sm">
                              Create Ticket
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}