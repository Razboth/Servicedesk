'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface PCAssetQRCodeProps {
  assetId: string;
  pcName: string;
  assetTag?: string;
  serialNumber?: string;
  size?: number;
  className?: string;
}

// Helper function to encode asset data for QR code
export function encodeAssetQRData(data: {
  id: string;
  pcName: string;
  assetTag?: string;
  serialNumber?: string;
}): string {
  const payload = {
    type: 'PC_ASSET',
    id: data.id,
    pcName: data.pcName,
    assetTag: data.assetTag || '',
    serialNumber: data.serialNumber || ''
  };
  return btoa(JSON.stringify(payload));
}

// Helper function to decode asset data from QR code
export function decodeAssetQRData(encoded: string): {
  type: string;
  id: string;
  pcName: string;
  assetTag: string;
  serialNumber: string;
} | null {
  try {
    const decoded = atob(encoded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Helper function to generate the verification URL
export function getAssetVerificationUrl(encodedData: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/qr/pc/${encodedData}`;
  }
  return `/qr/pc/${encodedData}`;
}

export function PCAssetQRCode({
  assetId,
  pcName,
  assetTag,
  serialNumber,
  size = 120,
  className
}: PCAssetQRCodeProps) {
  const encodedData = encodeAssetQRData({
    id: assetId,
    pcName,
    assetTag,
    serialNumber
  });

  const verificationUrl = getAssetVerificationUrl(encodedData);

  return (
    <div className={className}>
      <QRCodeSVG
        value={verificationUrl}
        size={size}
        level="H"
        includeMargin={true}
        bgColor="#ffffff"
        fgColor="#000000"
      />
    </div>
  );
}

export default PCAssetQRCode;
