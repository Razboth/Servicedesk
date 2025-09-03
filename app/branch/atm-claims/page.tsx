'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Building2,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ATMClaim {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  branch?: {
    name: string;
    code: string;
  };
  createdBy?: {
    name: string;
    branch?: {
      name: string;
      code: string;
    };
  };
  atmClaimVerification?: {
    verifiedAt?: string;
    recommendation?: string;
  };
  branchAssignments?: Array<{
    id: string;
    status: string;
    assignedTo: {
      name: string;
    };
  }>;
  _count?: {
    comments: number;
    attachments: number;
  };
}

export default function BranchATMClaimsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [claims, setClaims] = useState<ATMClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [claimType, setClaimType] = useState('atm'); // 'atm', 'payment', 'purchase'
  const [searchTerm, setSearchTerm] = useState('');
  const [statistics, setStatistics] = useState<any>({
    total: 0,
    pendingVerifications: 0,
    fromOtherBranches: 0,
    breakdown: {
      all: { total: 0, pendingVerifications: 0 },
      internal: { total: 0, pendingVerifications: 0 },
      external: { total: 0, pendingVerifications: 0 }
    }
  });
  
  // Check if user is Call Center agent (USER or TECHNICIAN role with CALL_CENTER support group)
  const isCallCenterAgent = (session?.user?.role === 'USER' || session?.user?.role === 'TECHNICIAN') && 
                            session?.user?.supportGroupCode === 'CALL_CENTER';

  const fetchClaims = async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('source', activeTab);
      }
      if (claimType !== 'atm') {
        params.append('claimType', claimType);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/branch/atm-claims?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setClaims(data.claims);
        setStatistics(data.statistics);
      } else {
        toast.error('Failed to fetch claims');
      }
    } catch (error) {
      toast.error('Error fetching claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [activeTab, claimType, searchTerm]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4" />;
      case 'PENDING_APPROVAL':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getVerificationStatus = (claim: ATMClaim) => {
    if (claim.atmClaimVerification?.verifiedAt) {
      return (
        <Badge variant="success">
          Verified - {claim.atmClaimVerification.recommendation}
        </Badge>
      );
    }
    if (claim.branchAssignments?.some(a => a.status === 'IN_PROGRESS')) {
      return <Badge variant="warning">Verification in Progress</Badge>;
    }
    return <Badge variant="secondary">Pending Verification</Badge>;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isCallCenterAgent ? 'Transaction Claims Management' : 
             claimType === 'payment' ? 'Payment Claims Management' :
             claimType === 'purchase' ? 'Purchase Claims Management' :
             'ATM Claims Management'}
          </h1>
          <p className="text-gray-600">
            {isCallCenterAgent 
              ? 'View and manage all transaction claims across all branches'
              : claimType === 'payment' ? 'Manage and verify payment claims for your branch'
              : claimType === 'purchase' ? 'Manage and verify purchase claims for your branch'
              : 'Manage and verify ATM claims for your branch'}
          </p>
        </div>
        <Button
          onClick={() => router.push('/branch/atm-claims/create')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Claim
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {activeTab === 'internal' ? 'Internal Claims' : 
               activeTab === 'external' ? 'External Claims' : 
               'Total Claims'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeTab === 'internal' ? statistics.breakdown?.internal?.total || 0 :
               activeTab === 'external' ? statistics.breakdown?.external?.total || 0 :
               statistics.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'internal' ? 'From your branch' :
               activeTab === 'external' ? 'From other branches' :
               'All active claims'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeTab === 'internal' ? statistics.breakdown?.internal?.pendingVerifications || 0 :
               activeTab === 'external' ? statistics.breakdown?.external?.pendingVerifications || 0 :
               statistics.breakdown?.all?.pendingVerifications || statistics.pendingVerifications}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'internal' ? 'Internal pending' :
               activeTab === 'external' ? 'External pending' :
               'Total awaiting verification'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">From Other Branches</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.fromOtherBranches}</div>
            <p className="text-xs text-muted-foreground">Inter-branch claims</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {claims.filter(c => 
                c.branchAssignments?.some(a => a.status === 'IN_PROGRESS')
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Active tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by ticket number, customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={fetchClaims}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Claim Type Tabs */}
      <Tabs value={claimType} onValueChange={setClaimType} className="mb-6">
        <TabsList>
          <TabsTrigger value="atm">ATM Claims</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="purchase">Purchase</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Source Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="internal">Internal</TabsTrigger>
          <TabsTrigger value="external">From Other Branches</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="text-center py-8">Loading claims...</div>
          ) : claims.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No claims found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <Card key={claim.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-lg">{claim.ticketNumber}</h3>
                          <Badge variant={getPriorityColor(claim.priority)}>
                            {claim.priority}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getStatusIcon(claim.status)}
                            {claim.status}
                          </Badge>
                          {getVerificationStatus(claim)}
                        </div>
                        
                        <p className="text-gray-700 mb-2">{claim.title}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {new Date(claim.createdAt).toLocaleDateString('id-ID')}
                          </div>
                          <div>
                            <span className="font-medium">Creator:</span>{' '}
                            {claim.createdBy?.name}
                          </div>
                          <div>
                            <span className="font-medium">From Branch:</span>{' '}
                            {claim.createdBy?.branch?.name || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">ATM Branch:</span>{' '}
                            {claim.branch?.name}
                          </div>
                        </div>

                        {/* Assignment Info */}
                        {claim.branchAssignments && claim.branchAssignments.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Users className="w-4 h-4" />
                            Assigned to: {claim.branchAssignments[0].assignedTo.name}
                          </div>
                        )}

                        <div className="flex gap-4 text-sm text-gray-500 mt-2">
                          <span>{claim._count?.comments || 0} comments</span>
                          <span>{claim._count?.attachments || 0} attachments</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => router.push(`/branch/atm-claims/${claim.id}`)}
                        className="flex items-center gap-2"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}