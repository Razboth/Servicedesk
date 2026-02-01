'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Monitor,
  MapPin,
  User,
  Calendar,
  Shield,
  Wrench,
  Tag,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { decodeAssetQRData } from '@/components/pc-assets/pc-asset-qr-code';

interface PCAssetData {
  type: string;
  id: string;
  pcName: string;
  assetTag: string;
  serialNumber: string;
}

interface PCAssetDetails {
  id: string;
  pcName: string;
  assetTag: string | null;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  status: string;
  isActive: boolean;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  branch: {
    name: string;
    code: string;
    address: string | null;
  } | null;
  assignedTo: {
    name: string;
    email: string;
  } | null;
  operatingSystem: {
    name: string;
    version: string | null;
  } | null;
  hardeningChecklists: Array<{
    status: string;
    complianceScore: number | null;
    completedAt: string | null;
  }>;
  _count: {
    serviceLogs: number;
    hardeningChecklists: number;
  };
}

export default function PCAssetQRVerificationPage() {
  const params = useParams();
  const [qrData, setQrData] = useState<PCAssetData | null>(null);
  const [assetDetails, setAssetDetails] = useState<PCAssetDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAsset() {
      try {
        if (!params.data) {
          throw new Error('No QR data provided');
        }

        // Decode the base64 encoded data
        const decodedData = decodeAssetQRData(params.data as string);

        if (!decodedData) {
          throw new Error('Invalid QR code data');
        }

        if (decodedData.type !== 'PC_ASSET') {
          throw new Error('QR code is not for a PC asset');
        }

        setQrData(decodedData);

        // Fetch asset details from API
        const response = await fetch(`/api/pc-assets/${decodedData.id}/verify`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Aset PC tidak ditemukan dalam sistem');
          }
          throw new Error('Gagal memverifikasi aset');
        }

        const data = await response.json();
        setAssetDetails(data);
        setError(null);
      } catch (err) {
        console.error('QR verification error:', err);
        setError(err instanceof Error ? err.message : 'Invalid or corrupted QR code');
        setQrData(null);
      } finally {
        setLoading(false);
      }
    }

    verifyAsset();
  }, [params.data]);

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

  const latestHardening = assetDetails?.hardeningChecklists?.[0];
  const isCompliant = latestHardening?.status === 'COMPLETED' && (latestHardening.complianceScore || 0) >= 80;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full overflow-hidden">
        {/* Header - Bank SulutGo Branding */}
        <div
          className="px-8 py-6"
          style={{ background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
        >
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <div className="w-12 h-12 bg-red-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xl">BSG</span>
              </div>
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold tracking-tight">Bank SulutGo</h1>
              <p className="text-sm opacity-90">IT Asset Verification</p>
            </div>
          </div>
        </div>

        {/* Verification Badge */}
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex items-center justify-center gap-3">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${
              assetDetails?.isActive ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {assetDetails?.isActive ? (
                <CheckCircle className="h-7 w-7 text-green-600" />
              ) : (
                <AlertCircle className="h-7 w-7 text-yellow-600" />
              )}
            </div>
            <div className="text-center">
              <h2 className={`text-3xl font-bold ${
                assetDetails?.isActive ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {assetDetails?.isActive ? 'Terverifikasi' : 'Tidak Aktif'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {assetDetails?.isActive ? 'Aset PC Terdaftar & Aktif' : 'Aset Tidak Aktif'}
              </p>
            </div>
          </div>
        </div>

        {/* Asset Information */}
        <div className="px-8 py-6 space-y-6">
          {/* PC Name */}
          <div
            className="rounded-lg p-6"
            style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Monitor className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-bold text-gray-900">Informasi Aset</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Nama PC
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {assetDetails?.pcName || qrData.pcName}
                </p>
              </div>

              {(assetDetails?.assetTag || qrData.assetTag) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Asset Tag
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {assetDetails?.assetTag || qrData.assetTag}
                  </p>
                </div>
              )}

              {(assetDetails?.serialNumber || qrData.serialNumber) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Hash className="h-3 w-3" /> Serial Number
                  </p>
                  <p className="text-sm font-mono text-gray-700">
                    {assetDetails?.serialNumber || qrData.serialNumber}
                  </p>
                </div>
              )}

              {assetDetails?.brand && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Brand / Model
                  </p>
                  <p className="text-sm text-gray-700">
                    {assetDetails.brand} {assetDetails.model && `/ ${assetDetails.model}`}
                  </p>
                </div>
              )}

              {assetDetails?.operatingSystem && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Sistem Operasi
                  </p>
                  <p className="text-sm text-gray-700">
                    {assetDetails.operatingSystem.name} {assetDetails.operatingSystem.version}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Status
                </p>
                <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                  assetDetails?.status === 'DEPLOYED'
                    ? 'bg-green-100 text-green-800'
                    : assetDetails?.status === 'IN_STOCK'
                    ? 'bg-blue-100 text-blue-800'
                    : assetDetails?.status === 'MAINTENANCE'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {assetDetails?.status || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Location & Assignment */}
          {(assetDetails?.branch || assetDetails?.assignedTo) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assetDetails?.branch && (
                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: '#eff6ff', border: '1px solid #3b82f6' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <h4 className="font-bold text-blue-900">Lokasi</h4>
                  </div>
                  <p className="text-sm font-semibold text-blue-800">
                    {assetDetails.branch.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    Kode: {assetDetails.branch.code}
                  </p>
                  {assetDetails.branch.address && (
                    <p className="text-xs text-blue-600 mt-1">
                      {assetDetails.branch.address}
                    </p>
                  )}
                </div>
              )}

              {assetDetails?.assignedTo && (
                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: '#f0fdf4', border: '1px solid #22c55e' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-green-600" />
                    <h4 className="font-bold text-green-900">Pengguna</h4>
                  </div>
                  <p className="text-sm font-semibold text-green-800">
                    {assetDetails.assignedTo.name}
                  </p>
                  <p className="text-xs text-green-700">
                    {assetDetails.assignedTo.email}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Hardening & Service Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hardening Status */}
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: isCompliant ? '#f0fdf4' : '#fef3c7',
                border: `1px solid ${isCompliant ? '#22c55e' : '#f59e0b'}`
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className={`h-5 w-5 ${isCompliant ? 'text-green-600' : 'text-yellow-600'}`} />
                <h4 className={`font-bold ${isCompliant ? 'text-green-900' : 'text-yellow-900'}`}>
                  Hardening Status
                </h4>
              </div>
              {latestHardening ? (
                <>
                  <p className={`text-sm font-semibold ${isCompliant ? 'text-green-800' : 'text-yellow-800'}`}>
                    {latestHardening.status === 'COMPLETED' ? 'Selesai' :
                     latestHardening.status === 'IN_PROGRESS' ? 'Dalam Proses' : 'Pending'}
                  </p>
                  {latestHardening.complianceScore !== null && (
                    <p className={`text-xs ${isCompliant ? 'text-green-700' : 'text-yellow-700'}`}>
                      Skor: {latestHardening.complianceScore}%
                    </p>
                  )}
                  {latestHardening.completedAt && (
                    <p className={`text-xs ${isCompliant ? 'text-green-600' : 'text-yellow-600'} mt-1`}>
                      {format(new Date(latestHardening.completedAt), 'dd MMM yyyy', { locale: id })}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-yellow-800">Belum ada data hardening</p>
              )}
            </div>

            {/* Service Logs Count */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: '#faf5ff', border: '1px solid #a855f7' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-5 w-5 text-purple-600" />
                <h4 className="font-bold text-purple-900">Riwayat Service</h4>
              </div>
              <p className="text-2xl font-bold text-purple-800">
                {assetDetails?._count?.serviceLogs || 0}
              </p>
              <p className="text-xs text-purple-700">
                Total catatan service
              </p>
            </div>
          </div>

          {/* Warranty Info */}
          {assetDetails?.warrantyExpiry && (
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: new Date(assetDetails.warrantyExpiry) > new Date() ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${new Date(assetDetails.warrantyExpiry) > new Date() ? '#22c55e' : '#dc2626'}`
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className={`h-5 w-5 ${
                  new Date(assetDetails.warrantyExpiry) > new Date() ? 'text-green-600' : 'text-red-600'
                }`} />
                <h4 className={`font-bold ${
                  new Date(assetDetails.warrantyExpiry) > new Date() ? 'text-green-900' : 'text-red-900'
                }`}>
                  Garansi
                </h4>
              </div>
              <p className={`text-sm font-semibold ${
                new Date(assetDetails.warrantyExpiry) > new Date() ? 'text-green-800' : 'text-red-800'
              }`}>
                {new Date(assetDetails.warrantyExpiry) > new Date() ? 'Aktif' : 'Berakhir'}
              </p>
              <p className={`text-xs ${
                new Date(assetDetails.warrantyExpiry) > new Date() ? 'text-green-700' : 'text-red-700'
              }`}>
                Hingga: {format(new Date(assetDetails.warrantyExpiry), 'dd MMMM yyyy', { locale: id })}
              </p>
            </div>
          )}

          {/* Security Notice */}
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #dc2626'
            }}
          >
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <p className="font-bold text-sm text-red-900 mb-1">
                  Peringatan Keamanan
                </p>
                <p className="text-xs text-red-800 leading-relaxed">
                  Informasi aset ini bersifat rahasia dan hanya untuk penggunaan internal Bank SulutGo.
                  Jika Anda menemukan perangkat ini tanpa pemilik yang sah, harap hubungi IT ServiceDesk.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4"
          style={{ background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' }}
        >
          <div className="flex items-center justify-between text-white text-xs">
            <p className="font-semibold">
              © {new Date().getFullYear()} Bank SulutGo - IT Asset Management
            </p>
            <p className="font-semibold">
              Verified: {format(new Date(), 'dd MMM yyyy, HH:mm')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
