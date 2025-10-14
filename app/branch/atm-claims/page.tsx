'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  RefreshCw,
  Home,
  Network
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

type TabValue = 'internal' | 'external';

export default function BranchATMClaimsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [claims, setClaims] = useState<ATMClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('internal');
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
      setLoading(true);
      const params = new URLSearchParams();
      params.append('source', activeTab);
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
  }, [activeTab, searchTerm]);

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

  // Simplified Tab Component with standard styling
  const SimpleTabs = () => {
    const internalCount = statistics.breakdown?.internal?.total || 0;
    const externalCount = statistics.breakdown?.external?.total || 0;

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'internal' ? 'default' : 'outline'}
              onClick={() => setActiveTab('internal')}
              className="flex-1 gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Klaim Saya</span>
              <Badge variant={activeTab === 'internal' ? 'secondary' : 'outline'} className="ml-2">
                {internalCount}
              </Badge>
            </Button>
            <Button
              variant={activeTab === 'external' ? 'default' : 'outline'}
              onClick={() => setActiveTab('external')}
              className="flex-1 gap-2"
            >
              <Network className="w-4 h-4" />
              <span>Cabang Lain</span>
              <Badge variant={activeTab === 'external' ? 'secondary' : 'outline'} className="ml-2">
                {externalCount}
              </Badge>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            {activeTab === 'internal'
              ? 'Claims created by your branch'
              : 'Claims from other branches requiring verification'
            }
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Simplified Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {isCallCenterAgent ? 'Transaction Claims Management' : 'ATM Claims Management'}
          </h1>
          <p className="text-muted-foreground">
            {isCallCenterAgent
              ? 'View and manage all transaction claims across all branches'
              : 'Manage and verify ATM claims for your branch'}
          </p>
        </div>
        <Button
          onClick={() => router.push('/branch/atm-claims/create')}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Claim
        </Button>
      </div>

      {/* Simplified Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {activeTab === 'internal' ? 'My Branch Claims' : 'External Claims'}
                </p>
                <p className="text-3xl font-bold">
                  {activeTab === 'internal' ? statistics.breakdown?.internal?.total || 0 :
                   statistics.breakdown?.external?.total || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeTab === 'internal' ? 'Created by your branch' : 'From other branches'}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Verification</p>
                <p className="text-3xl font-bold">
                  {activeTab === 'internal' ? statistics.breakdown?.internal?.pendingVerifications || 0 :
                   statistics.breakdown?.external?.pendingVerifications || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inter-Branch</p>
                <p className="text-3xl font-bold">
                  {statistics.fromOtherBranches}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Cross-branch claims</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Assignments</p>
                <p className="text-3xl font-bold">
                  {claims.filter(c =>
                    c.branchAssignments?.some(a => a.status === 'IN_PROGRESS')
                  ).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Active tasks</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Section */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by ticket number, customer name, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={fetchClaims}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Simplified Tabs Component */}
      <SimpleTabs />

      {/* Simplified Claims List */}
      <div className="min-h-[400px]">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <RefreshCw className="w-12 h-12 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Loading claims...</p>
              </div>
            </CardContent>
          </Card>
        ) : claims.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No claims found</p>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'internal'
                  ? 'Your branch has not created any claims yet.'
                  : 'No claims from other branches require verification.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => (
              <Card key={claim.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1 space-y-4">
                      {/* Header with badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">
                          {claim.ticketNumber}
                        </h3>
                        <Badge variant={getPriorityColor(claim.priority)}>
                          {claim.priority}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1.5">
                          {getStatusIcon(claim.status)}
                          <span>{claim.status}</span>
                        </Badge>
                        {getVerificationStatus(claim)}
                      </div>

                      {/* Title */}
                      <p className="font-medium">
                        {claim.title}
                      </p>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {new Date(claim.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Creator</p>
                          <p className="font-medium">{claim.createdBy?.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">From Branch</p>
                          <p className="font-medium">{claim.createdBy?.branch?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ATM Branch</p>
                          <p className="font-medium">{claim.branch?.name}</p>
                        </div>
                      </div>

                      {/* Assignment Info */}
                      {claim.branchAssignments && claim.branchAssignments.length > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                          <Users className="w-4 h-4" />
                          <span>Assigned to: {claim.branchAssignments[0].assignedTo.name}</span>
                        </div>
                      )}

                      {/* Footer with counts */}
                      <div className="flex gap-4 pt-2 border-t text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>{claim._count?.comments || 0} comments</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>{claim._count?.attachments || 0} attachments</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => router.push(`/branch/atm-claims/${claim.id}`)}
                      size="lg"
                    >
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
