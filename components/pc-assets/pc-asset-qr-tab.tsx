'use client';

import React, { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PCAssetQRCode, getAssetVerificationUrl, encodeAssetQRData } from './pc-asset-qr-code';
import { PCAssetPrintLabel } from './pc-asset-print-label';
import { Download, Printer, QrCode, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

interface PCAssetQRTabProps {
  asset: {
    id: string;
    pcName: string;
    assetTag: string | null;
    serialNumber: string | null;
    branch?: {
      name: string;
      code: string;
    } | null;
  };
}

export function PCAssetQRTab({ asset }: PCAssetQRTabProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const encodedData = encodeAssetQRData({
    id: asset.id,
    pcName: asset.pcName,
    assetTag: asset.assetTag || undefined,
    serialNumber: asset.serialNumber || undefined
  });

  const verificationUrl = getAssetVerificationUrl(encodedData);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      toast.success('URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector('.qr-code-display svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${asset.pcName}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="space-y-6">
      {/* QR Code Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code
          </CardTitle>
          <CardDescription>
            Scan this QR code to verify asset information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* QR Code */}
            <div className="qr-code-display flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <PCAssetQRCode
                  assetId={asset.id}
                  pcName={asset.pcName}
                  assetTag={asset.assetTag || undefined}
                  serialNumber={asset.serialNumber || undefined}
                  size={200}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadQR}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PNG
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? 'Copied!' : 'Copy URL'}
                </Button>
              </div>
            </div>

            {/* Asset Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">PC Name</h4>
                <p className="text-lg font-semibold">{asset.pcName}</p>
              </div>
              {asset.assetTag && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Asset Tag</h4>
                  <p className="text-lg font-semibold">{asset.assetTag}</p>
                </div>
              )}
              {asset.serialNumber && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Serial Number</h4>
                  <p className="font-mono">{asset.serialNumber}</p>
                </div>
              )}
              {asset.branch && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Branch</h4>
                  <p>{asset.branch.name} ({asset.branch.code})</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-gray-500">Verification URL</h4>
                <p className="text-sm text-blue-600 break-all">{verificationUrl}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable Label */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Printable Label
          </CardTitle>
          <CardDescription>
            Print this label and attach it to the PC asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Preview */}
            <div className="bg-gray-100 p-6 rounded-lg flex justify-center print:bg-white print:p-0">
              <div ref={printRef}>
                <PCAssetPrintLabel
                  assetId={asset.id}
                  pcName={asset.pcName}
                  assetTag={asset.assetTag || undefined}
                  serialNumber={asset.serialNumber || undefined}
                  branchName={asset.branch?.name}
                  branchCode={asset.branch?.code}
                />
              </div>
            </div>

            {/* Print Button */}
            <div className="flex justify-center print:hidden">
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print Label
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          .print-label-container,
          .print-label-container * {
            visibility: visible;
          }

          .print-label-container {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default PCAssetQRTab;
