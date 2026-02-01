'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Monitor,
  Shield,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Calendar,
  MapPin,
  Eye,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

interface PCAsset {
  id: string;
  pcName: string;
  brand: string;
  model: string | null;
  serialNumber: string | null;
  assetTag: string | null;
  status: string;
  warrantyExpiry: string | null;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  operatingSystem: {
    name: string;
    version: string | null;
    type: string;
  } | null;
  hardeningChecklists: Array<{
    id: string;
    status: string;
    complianceScore: number | null;
    template: {
      name: string;
    };
  }>;
  serviceLogs: Array<{
    id: string;
    serviceType: string;
    performedAt: string;
  }>;
  _count: {
    serviceLogs: number;
    hardeningChecklists: number;
  };
}

interface Summary {
  totalAssets: number;
  hardeningCompliant: number;
  warrantyExpiringSoon: number;
  recentServiceCount: number;
}

export default function MyAssetsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assets, setAssets] = useState<PCAsset[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAssets();
    }
  }, [status]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/my-pc-assets');
      if (!response.ok) throw new Error('Failed to fetch assets');

      const data = await response.json();
      setAssets(data.assets);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load your PC assets');
    } finally {
      setLoading(false);
    }
  };

  const getHardeningStatus = (asset: PCAsset) => {
    const latest = asset.hardeningChecklists[0];
    if (!latest) {
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">No data</span>
        </div>
      );
    }

    const isCompliant = latest.status === 'COMPLETED' && (latest.complianceScore || 0) >= 80;
    return (
      <div className={`flex items-center gap-1 ${isCompliant ? 'text-green-600' : 'text-yellow-600'}`}>
        {isCompliant ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <span className="text-sm">
          {latest.complianceScore !== null ? `${latest.complianceScore}%` : latest.status}
        </span>
      </div>
    );
  };

  const getWarrantyStatus = (warrantyExpiry: string | null) => {
    if (!warrantyExpiry) {
      return <span className="text-gray-400 text-sm">N/A</span>;
    }

    const expiry = new Date(warrantyExpiry);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysUntilExpiry < 30) {
      return <Badge variant="warning">Expires soon</Badge>;
    }
    return (
      <span className="text-sm text-green-600">
        {format(expiry, 'dd MMM yyyy', { locale: id })}
      </span>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Monitor className="h-8 w-8" />
            My PC Assets
          </h1>
          <p className="text-gray-500 mt-1">
            View and track your assigned PC/laptop devices
          </p>
        </div>
        <Button variant="outline" onClick={fetchAssets} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Monitor className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalAssets}</p>
                  <p className="text-sm text-gray-500">Total Devices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.hardeningCompliant}</p>
                  <p className="text-sm text-gray-500">Hardening Compliant</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.warrantyExpiringSoon}</p>
                  <p className="text-sm text-gray-500">Warranty Expiring</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Wrench className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.recentServiceCount}</p>
                  <p className="text-sm text-gray-500">Total Services</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Devices</CardTitle>
          <CardDescription>
            PC and laptop devices assigned to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No devices assigned</p>
              <p className="text-sm">You don't have any PC assets assigned to you yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Operating System</TableHead>
                  <TableHead>Hardening</TableHead>
                  <TableHead>Last Service</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{asset.pcName}</p>
                        <p className="text-sm text-gray-500">
                          {asset.brand} {asset.model}
                        </p>
                        {asset.assetTag && (
                          <p className="text-xs text-gray-400">{asset.assetTag}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{asset.branch.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {asset.operatingSystem ? (
                        <span className="text-sm">
                          {asset.operatingSystem.name} {asset.operatingSystem.version}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>{getHardeningStatus(asset)}</TableCell>
                    <TableCell>
                      {asset.serviceLogs[0] ? (
                        <div className="text-sm">
                          <p className="text-gray-600">{asset.serviceLogs[0].serviceType}</p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(asset.serviceLogs[0].performedAt), 'dd MMM yyyy', { locale: id })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No service</span>
                      )}
                    </TableCell>
                    <TableCell>{getWarrantyStatus(asset.warrantyExpiry)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/my-assets/${asset.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
