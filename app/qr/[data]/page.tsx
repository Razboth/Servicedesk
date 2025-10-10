'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface QRData {
  ticketNumber: string;
  approverName: string;
  approvedDate: string;
  status: string;
}

export default function QRVerificationPage() {
  const params = useParams();
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      if (!params.data) {
        throw new Error('No QR data provided');
      }

      // Decode the base64 encoded data
      const decodedData = atob(params.data as string);
      const parsedData = JSON.parse(decodedData) as QRData;

      // Validate the data structure
      if (!parsedData.ticketNumber || !parsedData.approverName || !parsedData.approvedDate) {
        throw new Error('Invalid QR code data');
      }

      setQrData(parsedData);
      setError(null);
    } catch (err) {
      console.error('QR decode error:', err);
      setError('Invalid or corrupted QR code');
      setQrData(null);
    } finally {
      setLoading(false);
    }
  }, [params.data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Verifying QR code...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <CardTitle className="text-red-600">Verification Failed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || 'Unable to verify QR code'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-green-200 dark:border-green-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-600">Approval Verified</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center mb-4">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-4 py-2 text-lg">
              {qrData.status}
            </Badge>
          </div>

          <div className="space-y-3 bg-card p-4 rounded-lg border">
            <div>
              <p className="text-sm text-muted-foreground">Ticket Number</p>
              <p className="font-semibold text-lg">{qrData.ticketNumber}</p>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">Approved By</p>
              <p className="font-semibold">{qrData.approverName}</p>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">Approval Date & Time</p>
              <p className="font-semibold">
                {format(new Date(qrData.approvedDate), 'dd MMMM yyyy, HH:mm:ss')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-900">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">Digital Signature</p>
              <p className="text-xs">
                This QR code serves as a digital signature verifying that this ticket has been officially approved by the manager listed above.
              </p>
            </div>
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Bank SulutGo ServiceDesk
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
