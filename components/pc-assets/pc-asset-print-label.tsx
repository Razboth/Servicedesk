'use client';

import React, { forwardRef } from 'react';
import { PCAssetQRCode } from './pc-asset-qr-code';

interface PCAssetPrintLabelProps {
  assetId: string;
  pcName: string;
  assetTag?: string;
  serialNumber?: string;
  branchName?: string;
  branchCode?: string;
}

export const PCAssetPrintLabel = forwardRef<HTMLDivElement, PCAssetPrintLabelProps>(
  function PCAssetPrintLabel({ assetId, pcName, assetTag, serialNumber, branchName, branchCode }, ref) {
    return (
      <div ref={ref} className="print-label-container">
        {/* Single Label - Compact format for asset stickers */}
        <div
          className="label-card"
          style={{
            width: '85mm',
            height: '54mm',
            padding: '4mm',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header with Bank SulutGo Branding */}
          <div
            style={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              padding: '3mm 4mm',
              borderRadius: '2px',
              marginBottom: '3mm',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
              <div
                style={{
                  width: '8mm',
                  height: '8mm',
                  backgroundColor: 'white',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: '#DC2626', fontWeight: 'bold', fontSize: '6pt' }}>BSG</span>
              </div>
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: '8pt', fontWeight: 'bold' }}>Bank SulutGo</div>
                <div style={{ fontSize: '5pt', opacity: 0.9 }}>IT Asset Management</div>
              </div>
            </div>
            {branchCode && (
              <div style={{ color: 'white', fontSize: '7pt', fontWeight: 'bold' }}>
                {branchCode}
              </div>
            )}
          </div>

          {/* Content Row - QR Code and Details */}
          <div style={{ display: 'flex', gap: '3mm', flex: 1 }}>
            {/* QR Code */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'white',
                padding: '1mm',
                borderRadius: '2px',
                border: '1px solid #e5e7eb',
              }}
            >
              <PCAssetQRCode
                assetId={assetId}
                pcName={pcName}
                assetTag={assetTag}
                serialNumber={serialNumber}
                size={80}
              />
            </div>

            {/* Asset Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2mm' }}>
              {/* PC Name - Primary */}
              <div>
                <div style={{ fontSize: '5pt', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                  PC Name
                </div>
                <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#111827' }}>
                  {pcName}
                </div>
              </div>

              {/* Asset Tag */}
              {assetTag && (
                <div>
                  <div style={{ fontSize: '5pt', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                    Asset Tag
                  </div>
                  <div style={{ fontSize: '8pt', fontWeight: '600', color: '#374151' }}>
                    {assetTag}
                  </div>
                </div>
              )}

              {/* Serial Number */}
              {serialNumber && (
                <div>
                  <div style={{ fontSize: '5pt', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                    S/N
                  </div>
                  <div style={{ fontSize: '7pt', color: '#374151', fontFamily: 'monospace' }}>
                    {serialNumber}
                  </div>
                </div>
              )}

              {/* Branch Name */}
              {branchName && (
                <div>
                  <div style={{ fontSize: '5pt', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                    Branch
                  </div>
                  <div style={{ fontSize: '6pt', color: '#374151' }}>
                    {branchName}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '2mm',
              paddingTop: '2mm',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '5pt', color: '#9ca3af' }}>
              Scan QR for verification
            </div>
            <div style={{ fontSize: '5pt', color: '#9ca3af' }}>
              © Bank SulutGo IT
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            * {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            @page {
              margin: 5mm;
              size: 90mm 60mm;
            }

            body {
              margin: 0;
              padding: 0;
            }

            .print-label-container {
              page-break-inside: avoid;
            }
          }

          @media screen {
            .print-label-container {
              display: flex;
              justify-content: center;
              padding: 16px;
            }
          }
        `}</style>
      </div>
    );
  }
);

// Multi-label print sheet (for printing multiple labels on A4)
interface PCAssetPrintSheetProps {
  assets: Array<{
    id: string;
    pcName: string;
    assetTag?: string;
    serialNumber?: string;
    branch?: {
      name: string;
      code: string;
    };
  }>;
}

export function PCAssetPrintSheet({ assets }: PCAssetPrintSheetProps) {
  return (
    <div className="print-sheet">
      <div
        className="labels-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '5mm',
          padding: '10mm',
        }}
      >
        {assets.map((asset) => (
          <PCAssetPrintLabel
            key={asset.id}
            assetId={asset.id}
            pcName={asset.pcName}
            assetTag={asset.assetTag}
            serialNumber={asset.serialNumber}
            branchName={asset.branch?.name}
            branchCode={asset.branch?.code}
          />
        ))}
      </div>

      <style jsx global>{`
        @media print {
          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          @page {
            margin: 10mm;
            size: A4 portrait;
          }

          .print-sheet {
            width: 100%;
          }

          .labels-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .label-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

export default PCAssetPrintLabel;
