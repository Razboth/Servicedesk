'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Monitor,
  ArrowLeft,
  Shield,
  Wrench,
  QrCode,
  Info,
  Calendar,
  User,
  MapPin,
  Cpu,
  HardDrive,
  Network,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { PCAssetQRCode } from '@/components/pc-assets/pc-asset-qr-code';

interface PCAsset {
  id: string;
  pcName: string;
  brand: string;
  model: string | null;
  serialNumber: string | null;
  assetTag: string | null;
  processor: string;
  ram: number;
  storageCapacity: string | null;
  macAddress: string | null;
  ipAddress: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  status: string;
  branch: {
    id: string;
    name: string;
    code: string;
    address: string | null;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  operatingSystem: {
    name: string;
    version: string | null;
    type: string;
  } | null;
  officeProduct: {
    name: string;
    version: string | null;
    type: string;
  } | null;
  osLicense: {
    licenseKey: string;
    licenseType: string;
    expiryDate: string | null;
  } | null;
  officeLicense: {
    licenseKey: string;
    licenseType: string;
    expiryDate: string | null;
  } | null;
  antivirusLicense: {
    productName: string;
    licenseKey: string;
    expiryDate: string | null;
    isActive: boolean;
  } | null;
  serviceLogs: Array<{
    id: string;
    serviceType: string;
    description: string;
    findings: string | null;
    recommendations: string | null;
    performedAt: string;
    performedBy: {
      name: string;
    };
    ticket: {
      ticketNumber: string;
      title: string;
    } | null;
  }>;
  hardeningChecklists: Array<{
    id: string;
    status: string;
    completedAt: string | null;
    complianceScore: number | null;
    notes: string | null;
    template: {
      name: string;
      description: string | null;
    };
    completedBy: {
      name: string;
    } | null;
    results: Array<{
      id: string;
      status: string;
      notes: string | null;
      checklistItem: {
        title: string;
        description: string | null;
        category: string;
        isRequired: boolean;
      };
    }>;
  }>;
}

export default function MyAssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [asset, setAsset] = useState<PCAsset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAsset();
    }
  }, [status, params.id]);

  const fetchAsset = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user/my-pc-assets/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Asset not found or not assigned to you');
          router.push('/my-assets');
          return;
        }
        throw new Error('Failed to fetch asset');
      }

      const data = await response.json();
      setAsset(data);
    } catch (error) {
      console.error('Error fetching asset:', error);
      toast.error('Failed to load asset details');
      router.push('/my-assets');
    } finally {
      setLoading(false);
    }
  };

  const getResultIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'SKIPPED':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const groupResultsByCategory = (results: any[]) => {
    return results.reduce((acc, result) => {
      const category = result.checklistItem.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      return acc;
    }, {} as Record<string, any[]>);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  const latestHardening = asset.hardeningChecklists[0];
  const isCompliant = latestHardening?.status === 'COMPLETED' && (latestHardening.complianceScore || 0) >= 80;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/my-assets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Monitor className="h-6 w-6" />
              {asset.pcName}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              {asset.branch.name}
              <span className="mx-2">|</span>
              <span>{asset.brand} {asset.model}</span>
            </div>
          </div>
        </div>
        <Badge variant={asset.status === 'DEPLOYED' ? 'success' : 'secondary'}>
          {asset.status}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Information
          </TabsTrigger>
          <TabsTrigger value="service" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Service History
            {asset.serviceLogs.length > 0 && (
              <Badge variant="secondary" className="ml-1">{asset.serviceLogs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="hardening" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Hardening
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code
          </TabsTrigger>
        </TabsList>

        {/* Information Tab */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Device Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">PC Name</p>
                    <p className="font-medium">{asset.pcName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Asset Tag</p>
                    <p className="font-medium">{asset.assetTag || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Brand</p>
                    <p className="font-medium">{asset.brand}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Model</p>
                    <p className="font-medium">{asset.model || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Serial Number</p>
                    <p className="font-mono text-sm">{asset.serialNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge>{asset.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hardware */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Hardware Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Processor</p>
                    <p className="font-medium">{asset.processor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">RAM</p>
                    <p className="font-medium">{asset.ram} GB</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Storage</p>
                    <p className="font-medium">{asset.storageCapacity || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Network Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">IP Address</p>
                    <p className="font-mono">{asset.ipAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">MAC Address</p>
                    <p className="font-mono text-sm">{asset.macAddress || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Branch</p>
                  <p className="font-medium">{asset.branch.name}</p>
                  <p className="text-sm text-gray-400">Code: {asset.branch.code}</p>
                </div>
                {asset.branch.address && (
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-sm">{asset.branch.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Software */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Software
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Operating System</p>
                  <p className="font-medium">
                    {asset.operatingSystem
                      ? `${asset.operatingSystem.name} ${asset.operatingSystem.version || ''}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Office Suite</p>
                  <p className="font-medium">
                    {asset.officeProduct
                      ? `${asset.officeProduct.name} ${asset.officeProduct.version || ''}`
                      : 'N/A'}
                  </p>
                </div>
                {asset.antivirusLicense && (
                  <div>
                    <p className="text-sm text-gray-500">Antivirus</p>
                    <p className="font-medium">{asset.antivirusLicense.productName}</p>
                    {asset.antivirusLicense.expiryDate && (
                      <p className="text-xs text-gray-400">
                        Expires: {format(new Date(asset.antivirusLicense.expiryDate), 'dd MMM yyyy', { locale: id })}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warranty */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Warranty & Purchase
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Purchase Date</p>
                    <p className="font-medium">
                      {asset.purchaseDate
                        ? format(new Date(asset.purchaseDate), 'dd MMM yyyy', { locale: id })
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Warranty Until</p>
                    {asset.warrantyExpiry ? (
                      <>
                        <p className="font-medium">
                          {format(new Date(asset.warrantyExpiry), 'dd MMM yyyy', { locale: id })}
                        </p>
                        {new Date(asset.warrantyExpiry) < new Date() && (
                          <Badge variant="destructive" className="mt-1">Expired</Badge>
                        )}
                      </>
                    ) : (
                      <p className="font-medium">N/A</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Service History Tab */}
        <TabsContent value="service">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service History
              </CardTitle>
              <CardDescription>
                Complete service and maintenance records for this device
              </CardDescription>
            </CardHeader>
            <CardContent>
              {asset.serviceLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No service records yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {asset.serviceLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge>{log.serviceType}</Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(log.performedAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                        </span>
                      </div>
                      <p className="text-gray-900 mb-2">{log.description}</p>
                      {log.findings && (
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Findings:</span> {log.findings}
                        </p>
                      )}
                      {log.recommendations && (
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Recommendations:</span> {log.recommendations}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-3 pt-3 border-t">
                        <User className="h-4 w-4" />
                        <span>By: {log.performedBy.name}</span>
                        {log.ticket && (
                          <span className="ml-4">| Ticket: {log.ticket.ticketNumber}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hardening Tab */}
        <TabsContent value="hardening">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Hardening Status
              </CardTitle>
              <CardDescription>
                Security hardening compliance for this device
              </CardDescription>
            </CardHeader>
            <CardContent>
              {asset.hardeningChecklists.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hardening records yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Latest Status Summary */}
                  {latestHardening && (
                    <div className={`p-4 rounded-lg ${isCompliant ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isCompliant ? (
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-8 w-8 text-yellow-600" />
                          )}
                          <div>
                            <p className={`font-bold text-lg ${isCompliant ? 'text-green-800' : 'text-yellow-800'}`}>
                              {isCompliant ? 'Compliant' : 'Needs Attention'}
                            </p>
                            <p className="text-sm text-gray-600">{latestHardening.template.name}</p>
                          </div>
                        </div>
                        {latestHardening.complianceScore !== null && (
                          <div className="text-right">
                            <p className={`text-3xl font-bold ${isCompliant ? 'text-green-600' : 'text-yellow-600'}`}>
                              {latestHardening.complianceScore}%
                            </p>
                            <Progress value={latestHardening.complianceScore} className="w-24 h-2 mt-2" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Checklist Details */}
                  {asset.hardeningChecklists.map((checklist) => (
                    <div key={checklist.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-4 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{checklist.template.name}</h3>
                            <p className="text-sm text-gray-500">
                              {checklist.completedAt
                                ? `Completed: ${format(new Date(checklist.completedAt), 'dd MMM yyyy', { locale: id })}`
                                : `Status: ${checklist.status}`}
                            </p>
                          </div>
                          <Badge className={
                            checklist.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }>
                            {checklist.status}
                          </Badge>
                        </div>
                      </div>

                      {checklist.results.length > 0 && (
                        <div className="p-4">
                          <Accordion type="multiple">
                            {Object.entries(groupResultsByCategory(checklist.results)).map(([category, results]) => (
                              <AccordionItem key={category} value={category}>
                                <AccordionTrigger className="text-sm font-medium">
                                  {category} ({results.filter((r: any) => r.status === 'PASSED').length}/{results.length} passed)
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-2">
                                    {results.map((result: any) => (
                                      <div key={result.id} className="flex items-start gap-3 p-2 rounded bg-gray-50">
                                        {getResultIcon(result.status)}
                                        <div className="flex-1">
                                          <p className="font-medium text-sm">{result.checklistItem.title}</p>
                                          {result.checklistItem.description && (
                                            <p className="text-xs text-gray-500">{result.checklistItem.description}</p>
                                          )}
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          {result.status}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR Code Tab */}
        <TabsContent value="qr">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Asset QR Code
              </CardTitle>
              <CardDescription>
                Scan this QR code to quickly access this device's information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <PCAssetQRCode
                    assetId={asset.id}
                    pcName={asset.pcName}
                    assetTag={asset.assetTag || undefined}
                    serialNumber={asset.serialNumber || undefined}
                    size={200}
                  />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">{asset.pcName}</p>
                  {asset.assetTag && (
                    <p className="text-gray-500">{asset.assetTag}</p>
                  )}
                  <p className="text-sm text-gray-400 mt-2">
                    Scan with any QR reader app to verify this asset
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
