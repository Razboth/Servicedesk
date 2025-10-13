'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  MessageSquare,
  Users,
  Clock
} from 'lucide-react';
import VerificationChecklist from '@/components/branch/verification-checklist';
import AssignmentPanel from '@/components/branch/assignment-panel';
import CommunicationPanel from '@/components/branch/communication-panel';

interface ClaimDetail {
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
    email: string;
    branch?: {
      name: string;
    };
  };
  service?: {
    name: string;
    requiresApproval: boolean;
  };
  atmClaimVerification?: any;
  branchAssignments?: any[];
  comments?: any[];
  approvals?: any[];
}

export default function ATMClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [verificationProgress, setVerificationProgress] = useState(0);

  const fetchClaimDetails = async () => {
    try {
      const response = await fetch(`/api/tickets/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setClaim(data);
        
        // Fetch verification progress
        const verifyResponse = await fetch(`/api/branch/atm-claims/${params.id}/verify`);
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          setVerificationProgress(verifyData.progress || 0);
        }
      } else {
        toast.error('Gagal mengambil detail klaim');
      }
    } catch (error) {
      toast.error('Kesalahan saat memuat klaim');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchClaimDetails();
    }
  }, [params.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'success';
      case 'CLOSED':
        return 'secondary';
      case 'REJECTED':
        return 'destructive';
      case 'IN_PROGRESS':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleApproval = async (action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketIds: [claim?.id],
          action,
          reason: action === 'approve' 
            ? 'Claim verified and approved' 
            : 'Claim rejected after verification'
        })
      });

      if (response.ok) {
        toast.success(`Klaim berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}`);
        fetchClaimDetails();
      } else {
        toast.error(`Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} klaim`);
      }
    } catch (error) {
      toast.error('Kesalahan saat memproses persetujuan');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Memuat detail klaim...</div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Klaim tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{claim.ticketNumber}</h1>
            <p className="text-gray-600">{claim.title}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Badge variant={getStatusColor(claim.status)} className="text-lg px-3 py-1">
            {claim.status}
          </Badge>
          <Badge variant="outline" className="text-lg px-3 py-1">
            {claim.priority}
          </Badge>
        </div>
      </div>

      {/* Verification Progress */}
      {verificationProgress > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Progres Verifikasi</span>
              <span className="text-sm text-gray-600">{verificationProgress}%</span>
            </div>
            <Progress value={verificationProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Manager Actions */}
      {session?.user?.role === 'MANAGER' && claim.status === 'PENDING_APPROVAL' && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                <div>
                  <p className="font-semibold">Persetujuan Manager Diperlukan</p>
                  <p className="text-sm text-gray-600">
                    Tinjau detail verifikasi dan buat keputusan
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApproval('approve')}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Setujui
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleApproval('reject')}
                  className="flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Tolak
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Detail
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Verifikasi
          </TabsTrigger>
          {/* Assignments tab - hidden for now but implementation preserved */}
          {/* <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Assignments
          </TabsTrigger> */}
          <TabsTrigger value="communication" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Komunikasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Claim Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informasi Klaim</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dibuat:</span>
                  <span>{new Date(claim.createdAt).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Layanan:</span>
                  <span>{claim.service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cabang ATM:</span>
                  <span>{claim.branch?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dibuat Oleh:</span>
                  <span>{claim.createdBy?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cabang Pembuat:</span>
                  <span>{claim.createdBy?.branch?.name || 'T/A'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Deskripsi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-gray-700">
                  {claim.description}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comments Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Komentar ({claim.comments?.length || 0})
                </span>
                <Button size="sm">Tambah Komentar</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {claim.comments && claim.comments.length > 0 ? (
                <div className="space-y-4">
                  {claim.comments.map((comment: any) => (
                    <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{comment.user?.name}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(comment.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                      {comment.isInternal && (
                        <Badge variant="secondary" className="mt-1">Internal</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Belum ada komentar</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <VerificationChecklist 
            ticketId={claim.id}
            onUpdate={fetchClaimDetails}
          />
        </TabsContent>

        {/* Assignments tab content - hidden for now but implementation preserved */}
        {/* <TabsContent value="assignments">
          <AssignmentPanel 
            ticketId={claim.id}
            branchId={claim.branch?.code || ''}
            currentAssignments={claim.branchAssignments || []}
            onUpdate={fetchClaimDetails}
          />
        </TabsContent> */}

        <TabsContent value="communication">
          <CommunicationPanel 
            ticketId={claim.id}
            onUpdate={fetchClaimDetails}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}