'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { 
  CreditCard, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Building,
  ArrowRight,
  Eye,
  CheckCheck,
  X
} from 'lucide-react';

interface ATMClaim {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  branchId: string;
  branch?: {
    name: string;
    code: string;
  };
  fieldValues?: Array<{
    field: {
      name: string;
      label: string;
    };
    value: string;
  }>;
  createdBy: {
    name: string;
    email: string;
    branchId?: string;
  };
}

export function ATMClaimsWidget() {
  const router = useRouter();
  const [claims, setClaims] = useState<ATMClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingFromOthers: 0,
    pendingInternal: 0,
    inProgress: 0,
    resolvedToday: 0
  });

  useEffect(() => {
    fetchATMClaims();
  }, []);

  const fetchATMClaims = async () => {
    try {
      // Fetch ATM claims - filter by service name
      const response = await fetch('/api/tickets?search=Penarikan%20Tunai%20Internal&limit=10');
      if (response.ok) {
        const data = await response.json();
        const atmClaims = data.tickets.filter((ticket: any) => 
          ticket.service?.name?.includes('Penarikan Tunai Internal') || 
          ticket.service?.name?.includes('ATM Claim')
        );
        
        setClaims(atmClaims);
        
        // Calculate stats
        const pending = atmClaims.filter((c: any) => c.status === 'PENDING_APPROVAL' || c.status === 'OPEN');
        const inProgress = atmClaims.filter((c: any) => c.status === 'IN_PROGRESS');
        const resolvedToday = atmClaims.filter((c: any) => {
          if (c.status === 'RESOLVED' || c.status === 'CLOSED') {
            const resolvedDate = new Date(c.resolvedAt || c.closedAt);
            const today = new Date();
            return resolvedDate.toDateString() === today.toDateString();
          }
          return false;
        });

        setStats({
          pendingFromOthers: pending.filter((c: any) => c.branchId !== c.createdBy.branchId).length,
          pendingInternal: pending.filter((c: any) => c.branchId === c.createdBy.branchId).length,
          inProgress: inProgress.length,
          resolvedToday: resolvedToday.length
        });
      }
    } catch (error) {
      console.error('Failed to fetch ATM claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFieldValue = (claim: ATMClaim, fieldName: string): string => {
    const field = claim.fieldValues?.find(fv => fv.field.name === fieldName);
    return field?.value || '-';
  };

  const formatAmount = (amount: string): string => {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const getClaimTypeLabel = (type: string): string => {
    const types: Record<string, string> = {
      'CARD_CAPTURED': 'Kartu Tertelan',
      'CASH_NOT_DISPENSED': 'Uang Tidak Keluar',
      'WRONG_AMOUNT': 'Nominal Tidak Sesuai',
      'DOUBLE_DEBIT': 'Terdebet Ganda',
      'TIMEOUT': 'Timeout',
      'OTHER': 'Lainnya'
    };
    return types[type] || type;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'default';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'secondary';
    }
  };

  const handleApprove = async (claimId: string) => {
    // TODO: Implement approve logic
    console.log('Approve claim:', claimId);
    router.push(`/tickets/${claimId}`);
  };

  const handleReject = async (claimId: string) => {
    // TODO: Implement reject logic
    console.log('Reject claim:', claimId);
    router.push(`/tickets/${claimId}`);
  };

  const handleView = (claimId: string) => {
    router.push(`/tickets/${claimId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            ATM Claims
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            ATM Claims Management
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/tickets?service=atm-claim')}
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          Monitor and manage ATM-related claims
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-medium">From Other Branch</span>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">
              {stats.pendingFromOthers}
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Building className="h-4 w-4" />
              <span className="text-xs font-medium">Internal Claims</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
              {stats.pendingInternal}
            </p>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mt-1">
              {stats.inProgress}
            </p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Resolved Today</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
              {stats.resolvedToday}
            </p>
          </div>
        </div>

        {/* Claims List */}
        <div className="space-y-3">
          {claims.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No pending ATM claims at the moment
              </AlertDescription>
            </Alert>
          ) : (
            claims.slice(0, 5).map((claim) => (
              <div 
                key={claim.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {claim.ticketNumber}
                      </span>
                      <Badge variant={getPriorityColor(claim.priority)}>
                        {claim.priority}
                      </Badge>
                      {claim.branchId !== claim.createdBy.branchId && (
                        <Badge variant="outline" className="text-xs">
                          From: {claim.branch?.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {claim.title}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                  <div>
                    <span className="font-medium">ATM:</span> {getFieldValue(claim, 'atm_code')}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {getClaimTypeLabel(getFieldValue(claim, 'claim_type'))}
                  </div>
                  <div>
                    <span className="font-medium">Amount:</span> {formatAmount(getFieldValue(claim, 'transaction_amount'))}
                  </div>
                  <div>
                    <span className="font-medium">Customer:</span> {getFieldValue(claim, 'customer_name')}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleView(claim.id)}
                    className="flex-1"
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View Details
                  </Button>
                  {(claim.status === 'PENDING_APPROVAL' || claim.status === 'OPEN') && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(claim.id)}
                        className="flex-1"
                      >
                        <CheckCheck className="mr-1 h-3 w-3" />
                        Process
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReject(claim.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}