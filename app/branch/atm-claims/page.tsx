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

  // Modern Tab Component with animations and count badges
  const ModernTabs = () => {
    const internalCount = statistics.breakdown?.internal?.total || 0;
    const externalCount = statistics.breakdown?.external?.total || 0;

    return (
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-2 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-700">
        <div className="relative flex gap-2">
          {/* Animated Background Slider */}
          <div
            className={cn(
              "absolute inset-y-0 w-[calc(50%-0.25rem)] bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg transition-all duration-300 ease-out",
              activeTab === 'external' && "translate-x-[calc(100%+0.5rem)]"
            )}
          />

          {/* Internal Tab */}
          <button
            onClick={() => setActiveTab('internal')}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ease-out",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              activeTab === 'internal'
                ? "text-white scale-[1.02]"
                : "text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50"
            )}
          >
            <Home className={cn(
              "w-5 h-5 transition-all duration-300",
              activeTab === 'internal' ? "scale-110" : "scale-100"
            )} />
            <span className="text-base">Klaim Saya</span>
            {/* Count Badge */}
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-[28px] h-7 px-2.5 rounded-full text-xs font-bold transition-all duration-300",
                activeTab === 'internal'
                  ? "bg-white/20 text-white ring-2 ring-white/30 scale-110"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              )}
            >
              {internalCount}
            </span>
          </button>

          {/* External Tab */}
          <button
            onClick={() => setActiveTab('external')}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ease-out",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              activeTab === 'external'
                ? "text-white scale-[1.02]"
                : "text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50"
            )}
          >
            <Network className={cn(
              "w-5 h-5 transition-all duration-300",
              activeTab === 'external' ? "scale-110" : "scale-100"
            )} />
            <span className="text-base">Cabang Lain</span>
            {/* Count Badge */}
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-[28px] h-7 px-2.5 rounded-full text-xs font-bold transition-all duration-300",
                activeTab === 'external'
                  ? "bg-white/20 text-white ring-2 ring-white/30 scale-110"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              )}
            >
              {externalCount}
            </span>
          </button>
        </div>

        {/* Tab Description */}
        <div className="mt-3 px-2">
          <p className="text-xs text-center text-gray-600 dark:text-gray-400 font-medium">
            {activeTab === 'internal'
              ? 'Claims created by your branch'
              : 'Claims from other branches requiring verification'
            }
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Header Section with gradient background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-8 shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.1))]" />
        <div className="relative flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isCallCenterAgent ? 'Transaction Claims Management' : 'ATM Claims Management'}
            </h1>
            <p className="text-blue-50 text-lg">
              {isCallCenterAgent
                ? 'View and manage all transaction claims across all branches'
                : 'Manage and verify ATM claims for your branch'}
            </p>
          </div>
          <Button
            onClick={() => router.push('/branch/atm-claims/create')}
            className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            size="lg"
          >
            <Plus className="w-5 h-5" />
            New Claim
          </Button>
        </div>
      </div>

      {/* Statistics Cards with modern design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {activeTab === 'internal' ? 'My Branch Claims' : 'External Claims'}
            </CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {activeTab === 'internal' ? statistics.breakdown?.internal?.total || 0 :
               statistics.breakdown?.external?.total || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {activeTab === 'internal' ? 'Created by your branch' : 'From other branches'}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Verification</CardTitle>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {activeTab === 'internal' ? statistics.breakdown?.internal?.pendingVerifications || 0 :
               statistics.breakdown?.external?.pendingVerifications || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Awaiting verification
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Inter-Branch</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {statistics.fromOtherBranches}
            </div>
            <p className="text-xs text-gray-500 mt-1">Cross-branch claims</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">My Assignments</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {claims.filter(c =>
                c.branchAssignments?.some(a => a.status === 'IN_PROGRESS')
              ).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Active tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Section */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by ticket number, customer name, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
          />
        </div>
        <Button
          variant="outline"
          onClick={fetchClaims}
          className="h-12 px-6 gap-2 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </Button>
      </div>

      {/* Modern Tabs Component */}
      <ModernTabs />

      {/* Claims List with animation */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 font-medium">Loading claims...</p>
            </div>
          </div>
        ) : claims.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium mb-2">No claims found</p>
              <p className="text-gray-400 text-sm">
                {activeTab === 'internal'
                  ? 'Your branch has not created any claims yet.'
                  : 'No claims from other branches require verification.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {claims.map((claim, index) => (
              <Card
                key={claim.id}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1 space-y-4">
                      {/* Header with badges */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                          {claim.ticketNumber}
                        </h3>
                        <Badge
                          variant={getPriorityColor(claim.priority)}
                          className="px-3 py-1 text-xs font-semibold"
                        >
                          {claim.priority}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                          {getStatusIcon(claim.status)}
                          <span className="text-xs font-medium">{claim.status}</span>
                        </Badge>
                        {getVerificationStatus(claim)}
                      </div>

                      {/* Title */}
                      <p className="text-gray-700 dark:text-gray-300 font-medium text-base leading-relaxed">
                        {claim.title}
                      </p>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Created</span>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {new Date(claim.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Creator</span>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {claim.createdBy?.name}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">From Branch</span>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {claim.createdBy?.branch?.name || 'N/A'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">ATM Branch</span>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {claim.branch?.name}
                          </p>
                        </div>
                      </div>

                      {/* Assignment Info */}
                      {claim.branchAssignments && claim.branchAssignments.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                            Assigned to: {claim.branchAssignments[0].assignedTo.name}
                          </span>
                        </div>
                      )}

                      {/* Footer with counts */}
                      <div className="flex gap-6 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">{claim._count?.comments || 0} comments</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">{claim._count?.attachments || 0} attachments</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => router.push(`/branch/atm-claims/${claim.id}`)}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                      size="lg"
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
      </div>
    </div>
  );
}
