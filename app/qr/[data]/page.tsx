'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Printer } from 'lucide-react';
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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Memverifikasi QR code...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full border-2 border-red-200">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Verifikasi Gagal</h1>
            <p className="text-gray-600">{error || 'Tidak dapat memverifikasi QR code'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 print:p-0 print:bg-white">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full print:shadow-none print:max-w-none">
          {/* Header - Bank SulutGo Branding */}
          <div
            className="px-8 py-6 print:py-4"
            style={{ background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-lg p-2 shadow-sm print:shadow-none">
                  <div className="w-12 h-12 bg-red-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xl">BSG</span>
                  </div>
                </div>
                <div className="text-white">
                  <h1 className="text-2xl font-bold tracking-tight print:text-xl">Bank SulutGo</h1>
                  <p className="text-sm opacity-90 print:text-xs">ServiceDesk - Digital Verification</p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg border-2 border-white/30 transition-colors print:hidden"
                type="button"
              >
                <Printer className="h-4 w-4" />
                <span className="font-semibold">Print</span>
              </button>
            </div>
          </div>

          {/* Success Badge */}
          <div className="px-8 py-6 border-b border-gray-200 print:py-4">
            <div className="flex items-center justify-center gap-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 print:w-10 print:h-10">
                <CheckCircle className="h-7 w-7 text-green-600 print:h-6 print:w-6" />
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-green-600 print:text-2xl">Terverifikasi</h2>
                <p className="text-sm text-gray-600 mt-1 print:text-xs">Tanda Tangan Digital Sah</p>
              </div>
            </div>
          </div>

          {/* Verification Details */}
          <div className="px-8 py-6 space-y-6 print:py-4 print:space-y-4">
            {/* Status Badge */}
            <div className="flex justify-center">
              <div
                className="inline-block px-6 py-3 rounded-lg border-2 print:px-4 print:py-2"
                style={{
                  backgroundColor: '#dcfce7',
                  borderColor: '#16a34a',
                  color: '#166534'
                }}
              >
                <span className="font-bold text-lg uppercase tracking-wide print:text-base">
                  {qrData.status}
                </span>
              </div>
            </div>

            {/* Ticket Information Grid */}
            <div
              className="rounded-lg p-6 print:p-4"
              style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
            >
              <div className="space-y-4 print:space-y-3">
                <div className="pb-4 border-b border-gray-300 print:pb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 print:text-[10px]">
                    Nomor Tiket
                  </p>
                  <p className="text-2xl font-bold text-gray-900 print:text-xl">
                    {qrData.ticketNumber}
                  </p>
                </div>

                <div className="pb-4 border-b border-gray-300 print:pb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 print:text-[10px]">
                    Disetujui Oleh
                  </p>
                  <p className="text-lg font-bold text-gray-900 print:text-base">
                    {qrData.approverName}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 print:text-[10px]">
                    Tanggal & Waktu Persetujuan
                  </p>
                  <p className="text-lg font-bold text-gray-900 print:text-base">
                    {format(new Date(qrData.approvedDate), 'dd MMMM yyyy, HH:mm:ss')}
                  </p>
                </div>
              </div>
            </div>

            {/* Digital Signature Notice */}
            <div
              className="rounded-lg p-4 print:p-3"
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #3b82f6'
              }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0 print:h-4 print:w-4" />
                <div>
                  <p className="font-bold text-sm text-blue-900 mb-1 print:text-xs">
                    Tanda Tangan Digital
                  </p>
                  <p className="text-xs text-blue-800 leading-relaxed print:text-[10px] print:leading-normal">
                    QR code ini berfungsi sebagai tanda tangan digital yang memverifikasi bahwa tiket ini telah resmi disetujui oleh manajer yang tercantum di atas. Dokumen ini memiliki kekuatan hukum yang setara dengan tanda tangan fisik.
                  </p>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div
              className="rounded-lg p-4 print:p-3"
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #dc2626'
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5 print:w-4 print:h-4">
                  <span className="text-white text-xs font-bold print:text-[10px]">!</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-red-900 mb-1 print:text-xs">
                    Peringatan Keamanan
                  </p>
                  <p className="text-xs text-red-800 leading-relaxed print:text-[10px] print:leading-normal">
                    Dokumen ini bersifat rahasia dan hanya untuk penggunaan internal Bank SulutGo. Dilarang keras untuk menyalin, mendistribusikan, atau menggunakan informasi ini tanpa izin resmi.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-8 py-4 print:py-3"
            style={{ background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' }}
          >
            <div className="flex items-center justify-between text-white text-xs print:text-[10px]">
              <p className="font-semibold">
                © {new Date().getFullYear()} Bank SulutGo - ServiceDesk System
              </p>
              <p className="font-semibold">
                Dicetak: {format(new Date(), 'dd MMM yyyy, HH:mm')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          @page {
            margin: 0;
            size: A4 portrait;
          }

          body {
            margin: 0;
            padding: 0;
          }

          /* Hide scrollbars and unnecessary elements */
          ::-webkit-scrollbar {
            display: none;
          }

          /* Ensure proper page breaks */
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Optimize font rendering */
          * {
            font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important;
          }
        }
      `}</style>
    </>
  );
}
