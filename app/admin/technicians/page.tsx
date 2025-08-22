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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Users, 
  Search,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  UserCheck,
  UserX,
  Filter,
  Settings
} from 'lucide-react';
import Link from 'next/link';

interface Technician {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  supportGroup?: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    assignedTickets: number;
  };
  stats?: {
    openTickets: number;
    inProgressTickets: number;
    resolvedToday: number;
    avgResolutionTime: number;
  };
}

interface SupportGroup {
  id: string;
  name: string;
  code: string;
}

export default function TechniciansPage() {
  const { data: session } = useSession();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [supportGroupFilter, setSupportGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkSupportGroup, setBulkSupportGroup] = useState('');

  useEffect(() => {
    fetchSupportGroups();
  }, []);

  useEffect(() => {
    fetchTechnicians();
  }, [search, supportGroupFilter, statusFilter]);

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

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        includeStats: 'true',
        ...(search && { search }),
        ...(supportGroupFilter !== 'all' && { supportGroupId: supportGroupFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/technicians?${params}`);
      if (!response.ok) throw new Error('Failed to fetch technicians');

      const data = await response.json();
      setTechnicians(data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast.error('Failed to load technicians');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedTechnicians.length === 0) {
      toast.error('Please select at least one technician');
      return;
    }

    if (bulkAction === 'assign' && !bulkSupportGroup) {
      toast.error('Please select a support group');
      return;
    }

    try {
      const response = await fetch('/api/admin/technicians', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianIds: selectedTechnicians,
          action: bulkAction,
          supportGroupId: bulkAction === 'assign' ? bulkSupportGroup : undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update technicians');
      }

      const result = await response.json();
      toast.success(`Updated ${result.updated} technicians`);
      
      // Reset selection and refresh
      setSelectedTechnicians([]);
      setBulkAction('');
      setBulkSupportGroup('');
      fetchTechnicians();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTechnicians.length === technicians.length) {
      setSelectedTechnicians([]);
    } else {
      setSelectedTechnicians(technicians.map(t => t.id));
    }
  };

  const toggleSelectTechnician = (id: string) => {
    setSelectedTechnicians(prev =>
      prev.includes(id)
        ? prev.filter(tid => tid !== id)
        : [...prev, id]
    );
  };

  const getWorkloadColor = (openTickets: number) => {
    if (openTickets > 10) return 'text-red-600';
    if (openTickets > 5) return 'text-amber-600';
    return 'text-green-600';
  };

  // Calculate summary statistics
  const totalTechnicians = technicians.length;
  const activeTechnicians = technicians.filter(t => t.isActive).length;
  const totalOpenTickets = technicians.reduce((sum, t) => sum + (t.stats?.openTickets || 0), 0);
  const avgTicketsPerTech = totalTechnicians > 0 ? Math.round(totalOpenTickets / totalTechnicians) : 0;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="h-8 w-8" />
          Technician Management
        </h1>
        <Link href="/admin/users/new">
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Add Technician
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Technicians
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTechnicians}</div>
            <p className="text-xs text-gray-500 mt-1">
              {activeTechnicians} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Open Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpenTickets}</div>
            <p className="text-xs text-gray-500 mt-1">
              Avg {avgTicketsPerTech} per tech
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Support Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportGroups.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              Active groups
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Resolved Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {technicians.reduce((sum, t) => sum + (t.stats?.resolvedToday || 0), 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tickets resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search technicians..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
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
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedTechnicians.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-800">
                  {selectedTechnicians.length} technician(s) selected
                </p>
                <div className="flex gap-2">
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select action..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assign">Assign to Group</SelectItem>
                      <SelectItem value="unassign">Remove from Group</SelectItem>
                      <SelectItem value="activate">Activate</SelectItem>
                      <SelectItem value="deactivate">Deactivate</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {bulkAction === 'assign' && (
                    <Select value={bulkSupportGroup} onValueChange={setBulkSupportGroup}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select group..." />
                      </SelectTrigger>
                      <SelectContent>
                        {supportGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Button 
                    onClick={handleBulkAction}
                    disabled={!bulkAction || (bulkAction === 'assign' && !bulkSupportGroup)}
                  >
                    Apply
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedTechnicians([])}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technicians Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      technicians.length > 0 && 
                      selectedTechnicians.length === technicians.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Support Group</TableHead>
                <TableHead className="text-center">Workload</TableHead>
                <TableHead className="text-center">Performance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading technicians...
                  </TableCell>
                </TableRow>
              ) : technicians.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No technicians found
                  </TableCell>
                </TableRow>
              ) : (
                technicians.map((tech) => (
                  <TableRow key={tech.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTechnicians.includes(tech.id)}
                        onCheckedChange={() => toggleSelectTechnician(tech.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{tech.name}</p>
                        <p className="text-sm text-gray-500">{tech.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tech.supportGroup ? (
                        <Badge variant="outline">
                          {tech.supportGroup.name}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-4 text-sm">
                          <span className={getWorkloadColor(tech.stats?.openTickets || 0)}>
                            <AlertCircle className="h-4 w-4 inline mr-1" />
                            {tech.stats?.openTickets || 0}
                          </span>
                          <span className="text-amber-600">
                            <Clock className="h-4 w-4 inline mr-1" />
                            {tech.stats?.inProgressTickets || 0}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Total: {tech._count.assignedTickets}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {tech.stats?.resolvedToday || 0} today
                        </div>
                        <p className="text-xs text-gray-500">
                          Avg: {tech.stats?.avgResolutionTime || 0}h
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tech.isActive ? 'success' : 'secondary'}>
                        {tech.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/users/${tech.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
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