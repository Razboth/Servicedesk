'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  CreditCard,
  User,
  Phone,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Building2,
  ArrowDownToLine,
  ArrowUpFromLine
} from 'lucide-react';
import {
  TransactionType,
  WITHDRAWAL_CLAIM_TYPES,
  DEPOSIT_CLAIM_TYPES,
  getClaimTypes
} from '@/lib/constants/claim-types';

interface ATM {
  id: string;
  code: string;
  name?: string;
  location: string;
  atmCategory?: 'ATM' | 'CRM';
  branch: {
    id: string;
    name: string;
    code: string;
  };
}

export default function CreateATMClaimPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchingATM, setSearchingATM] = useState(false);
  const [atmCode, setAtmCode] = useState('');
  const [selectedATM, setSelectedATM] = useState<ATM | null>(null);
  const [showATMWarning, setShowATMWarning] = useState(false);
  const [matchedATMs, setMatchedATMs] = useState<ATM[]>([]);
  const [transactionType, setTransactionType] = useState<TransactionType>('WITHDRAWAL');

  // Get current claim types based on transaction type
  const currentClaimTypes = getClaimTypes(transactionType);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerAccount: '',
    customerPhone: '',
    customerEmail: '',
    transactionAmount: '',
    transactionDate: '',
    transactionTime: '',
    transactionRef: '',
    cardLast4: '',
    claimType: '',
    claimDescription: ''
  });

  // Quick templates for common cases
  const applyTemplate = (type: string) => {
    // Withdrawal templates
    switch (type) {
      case 'CARD_CAPTURED':
        setFormData(prev => ({
          ...prev,
          claimType: 'CARD_CAPTURED',
          claimDescription: 'Nasabah melakukan transaksi penarikan tunai pada ATM tersebut. Setelah memasukkan PIN, kartu ATM tertelan dan tidak keluar kembali. Nasabah sudah mencoba menunggu beberapa saat namun kartu tidak keluar.'
        }));
        break;
      case 'CASH_NOT_DISPENSED':
        setFormData(prev => ({
          ...prev,
          claimType: 'CASH_NOT_DISPENSED',
          claimDescription: 'Nasabah melakukan transaksi penarikan tunai. Saldo sudah terpotong sesuai nominal transaksi namun uang tidak keluar dari mesin ATM. Struk transaksi menunjukkan transaksi berhasil.'
        }));
        break;
      case 'WRONG_AMOUNT':
        setFormData(prev => ({
          ...prev,
          claimType: 'WRONG_AMOUNT',
          claimDescription: 'Nasabah melakukan penarikan tunai sebesar Rp [nominal]. Uang yang keluar tidak sesuai dengan nominal yang diminta. Nasabah menerima Rp [nominal aktual].'
        }));
        break;
      // Deposit templates
      case 'SALDO_BELUM_MASUK':
        setFormData(prev => ({
          ...prev,
          claimType: 'SALDO_BELUM_MASUK',
          claimDescription: 'Nasabah melakukan setor tunai pada mesin CRM. Uang sudah dimasukkan dan struk keluar menunjukkan transaksi berhasil, namun saldo rekening belum bertambah sesuai nominal setoran.'
        }));
        break;
      case 'NOMINAL_TIDAK_SESUAI':
        setFormData(prev => ({
          ...prev,
          claimType: 'NOMINAL_TIDAK_SESUAI',
          claimDescription: 'Nasabah melakukan setor tunai sebesar Rp [nominal]. Saldo yang masuk ke rekening tidak sesuai dengan jumlah uang yang dimasukkan. Saldo bertambah Rp [nominal aktual].'
        }));
        break;
      case 'UANG_TIDAK_KEMBALI':
        setFormData(prev => ({
          ...prev,
          claimType: 'UANG_TIDAK_KEMBALI',
          claimDescription: 'Nasabah melakukan setor tunai pada mesin CRM. Uang ditolak oleh mesin namun tidak keluar/dikembalikan kepada nasabah.'
        }));
        break;
      case 'MESIN_ERROR':
        setFormData(prev => ({
          ...prev,
          claimType: 'MESIN_ERROR',
          claimDescription: 'Nasabah melakukan setor tunai pada mesin CRM. Setelah uang dimasukkan, mesin mengalami error/hang. Uang tidak dikembalikan dan transaksi tidak berhasil.'
        }));
        break;
    }
  };

  const searchATM = async () => {
    if (!atmCode) return;

    setSearchingATM(true);
    setMatchedATMs([]);
    setSelectedATM(null);

    // Build query params - filter by CRM category when Setor Tunai is selected
    const categoryParam = transactionType === 'DEPOSIT' ? '&category=CRM' : '';

    try {
      // First try exact code match
      let response = await fetch(`/api/atms/lookup?code=${atmCode.toUpperCase()}${categoryParam}`);

      if (response.ok) {
        const data = await response.json();
        if (data) {
          // Exact match found - select it immediately
          selectATM(data);
          setMatchedATMs([data]);
          return;
        }
      }

      // No exact match - search by name, location, and branch with multi-criteria support
      response = await fetch(`/api/atms/lookup${categoryParam ? '?' + categoryParam.substring(1) : ''}`);
      const allATMs = await response.json();

      // Split search term into multiple keywords for multi-criteria matching
      const searchTerms = atmCode.toLowerCase().trim().split(/\s+/);

      const matches = allATMs.options?.filter((atm: any) => {
        const searchableText = [
          atm.atmName?.toLowerCase() || '',
          atm.location?.toLowerCase() || '',
          atm.value?.toLowerCase() || '',
          atm.branchName?.toLowerCase() || '',
          atm.branchCode?.toLowerCase() || ''
        ].join(' ');

        // All search terms must be present in the searchable text (AND logic)
        return searchTerms.every((term: string) => searchableText.includes(term));
      });

      if (matches && matches.length > 0) {
        // Fetch full data for all matches (include category filter)
        const matchedATMsData = await Promise.all(
          matches.map(async (match: any) => {
            const res = await fetch(`/api/atms/lookup?code=${match.value}${categoryParam}`);
            return res.json();
          })
        );

        // Filter out null results (ATMs that don't match category)
        const validMatches = matchedATMsData.filter(atm => atm && atm.id);
        setMatchedATMs(validMatches);

        // If only one match, select it automatically
        if (validMatches.length === 1) {
          selectATM(validMatches[0]);
        } else if (validMatches.length > 1) {
          toast.info(`Ditemukan ${validMatches.length} ${transactionType === 'DEPOSIT' ? 'CRM' : 'ATM'} yang cocok. Silakan pilih salah satu.`);
        } else {
          toast.error(transactionType === 'DEPOSIT' ? 'CRM tidak ditemukan' : 'ATM tidak ditemukan');
        }
      } else {
        toast.error(transactionType === 'DEPOSIT' ? 'CRM tidak ditemukan. Pastikan mesin mendukung Setor Tunai.' : 'ATM tidak ditemukan');
        setMatchedATMs([]);
      }
    } catch (error) {
      toast.error('Gagal mencari ATM');
    } finally {
      setSearchingATM(false);
    }
  };

  const selectATM = (atm: ATM) => {
    setSelectedATM(atm);

    // Check if ATM is from different branch
    const userBranch = session?.user?.branchId;
    if (userBranch && atm.branch?.id && atm.branch.id !== userBranch) {
      setShowATMWarning(true);
    } else {
      setShowATMWarning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedATM) {
      toast.error('Silakan pilih ATM terlebih dahulu');
      return;
    }

    // Validate account number length
    if (formData.customerAccount.length !== 14) {
      toast.error('Nomor rekening harus 14 karakter');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        atmCode: selectedATM.code,
        transactionType,
        ...formData,
        transactionAmount: parseFloat(formData.transactionAmount),
        transactionDate: `${formData.transactionDate}T${formData.transactionTime || '00:00'}:00`
      };

      const response = await fetch('/api/branch/atm-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(transactionType === 'DEPOSIT' ? 'Klaim Setor Tunai berhasil dibuat' : 'Klaim ATM berhasil dibuat');

        if (data.routing?.isInterBranch) {
          toast.info(
            `Klaim akan diproses oleh ${data.routing.toBranch}`,
            { duration: 5000 }
          );
        }

        router.push('/branch/atm-claims');
      } else {
        toast.error(data.error || 'Gagal membuat klaim');
      }
    } catch (error) {
      toast.error('Gagal membuat klaim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {transactionType === 'DEPOSIT' ? 'Buat Klaim Setor Tunai' : 'Buat Klaim ATM'}
          </h1>
          <p className="text-gray-600">
            {transactionType === 'DEPOSIT'
              ? 'Input klaim nasabah untuk transaksi setor tunai di CRM'
              : 'Input klaim nasabah untuk transaksi penarikan tunai di ATM'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Jenis Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setTransactionType('WITHDRAWAL');
                  setSelectedATM(null);
                  setMatchedATMs([]);
                  setAtmCode('');
                  setFormData(prev => ({ ...prev, claimType: '', claimDescription: '' }));
                }}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  transactionType === 'WITHDRAWAL'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ArrowDownToLine className={`w-6 h-6 ${transactionType === 'WITHDRAWAL' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="font-semibold">Penarikan Tunai</div>
                  <div className="text-sm text-gray-500">Klaim ATM (semua mesin)</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransactionType('DEPOSIT');
                  setSelectedATM(null);
                  setMatchedATMs([]);
                  setAtmCode('');
                  setFormData(prev => ({ ...prev, claimType: '', claimDescription: '' }));
                }}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  transactionType === 'DEPOSIT'
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ArrowUpFromLine className={`w-6 h-6 ${transactionType === 'DEPOSIT' ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="font-semibold">Setor Tunai</div>
                  <div className="text-sm text-gray-500">Klaim CRM (Cash Recycling Machine)</div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ATM/CRM Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {transactionType === 'DEPOSIT' ? 'Informasi CRM' : 'Informasi ATM'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="atmCode">
                  Kode / Nama / Lokasi / Cabang {transactionType === 'DEPOSIT' ? 'CRM' : 'ATM'} *
                </Label>
                <Input
                  id="atmCode"
                  value={atmCode}
                  onChange={(e) => setAtmCode(e.target.value)}
                  placeholder={`Cari ${transactionType === 'DEPOSIT' ? 'CRM' : 'ATM'} berdasarkan kode, nama, lokasi, atau cabang`}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {transactionType === 'DEPOSIT'
                    ? 'Hanya mesin CRM (Cash Recycling Machine) yang dapat melakukan setor tunai'
                    : 'Contoh: ATM-001234 atau "Indomaret" atau "Indomaret Gorontalo" atau "Mall Manado"'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={searchATM}
                disabled={searchingATM || !atmCode}
                className="mt-6"
              >
                {searchingATM ? 'Mencari...' : 'Cari'}
              </Button>
            </div>

            {/* Multiple matches - show selection list */}
            {matchedATMs.length > 1 && !selectedATM && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Pilih {transactionType === 'DEPOSIT' ? 'CRM' : 'ATM'} yang sesuai ({matchedATMs.length} hasil):
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {matchedATMs.map((atm) => (
                    <button
                      key={atm.id}
                      type="button"
                      onClick={() => selectATM(atm)}
                      className="w-full p-4 bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg text-left transition-all"
                    >
                      <div className="font-semibold text-gray-900">{atm.code}</div>
                      {atm.name && (
                        <div className="text-sm text-gray-600 mt-1">
                          Nama: {atm.name}
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        Lokasi: {atm.location || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Building2 className="w-4 h-4" />
                        Cabang: {atm.branch?.name || 'Unknown'} ({atm.branch?.code || 'N/A'})
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected ATM/CRM display */}
            {selectedATM && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-green-900">
                    ✓ {transactionType === 'DEPOSIT' ? 'CRM' : 'ATM'} Dipilih
                  </div>
                  {matchedATMs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedATM(null);
                        setShowATMWarning(false);
                      }}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Ganti {transactionType === 'DEPOSIT' ? 'CRM' : 'ATM'}
                    </Button>
                  )}
                </div>
                <div className="font-semibold text-gray-900">{selectedATM.code}</div>
                {selectedATM.name && (
                  <div className="text-sm text-gray-600">
                    Nama: {selectedATM.name}
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  Lokasi: {selectedATM.location || 'N/A'}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Cabang: {selectedATM.branch?.name || 'Unknown'} ({selectedATM.branch?.code || 'N/A'})
                </div>
              </div>
            )}

            {showATMWarning && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  {transactionType === 'DEPOSIT' ? 'CRM' : 'ATM'} milik Cabang {selectedATM?.branch.name}.
                  Klaim akan diteruskan ke cabang tersebut untuk diproses.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informasi Nasabah
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Nama Nasabah *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  placeholder="Nama lengkap nasabah"
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerAccount">Nomor Rekening *</Label>
                <Input
                  id="customerAccount"
                  value={formData.customerAccount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 14);
                    setFormData({...formData, customerAccount: value});
                  }}
                  placeholder="14 digit nomor rekening"
                  maxLength={14}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.customerAccount.length}/14 karakter
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerPhone">Nomor Telepon *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    className="pl-10"
                    placeholder="08xx xxxx xxxx"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customerEmail">Email (Opsional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                  placeholder="email@contoh.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cardLast4">4 Digit Terakhir Kartu ATM *</Label>
              <Input
                id="cardLast4"
                value={formData.cardLast4}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setFormData({...formData, cardLast4: value});
                }}
                placeholder="XXXX"
                maxLength={4}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Detail Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transactionAmount">Nominal Transaksi *</Label>
                <Input
                  id="transactionAmount"
                  type="number"
                  value={formData.transactionAmount}
                  onChange={(e) => setFormData({...formData, transactionAmount: e.target.value})}
                  placeholder="Contoh: 500000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="transactionRef">Referensi Transaksi</Label>
                <Input
                  id="transactionRef"
                  value={formData.transactionRef}
                  onChange={(e) => setFormData({...formData, transactionRef: e.target.value})}
                  placeholder="Opsional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transactionDate">Tanggal Transaksi *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="transactionDate"
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({...formData, transactionDate: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="transactionTime">Waktu Transaksi</Label>
                <Input
                  id="transactionTime"
                  type="time"
                  value={formData.transactionTime}
                  onChange={(e) => setFormData({...formData, transactionTime: e.target.value})}
                  placeholder="HH:MM"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claim Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detail Klaim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Templates */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Template Cepat:</span>
              {currentClaimTypes.slice(0, 3).map(type => (
                <Button
                  key={type.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(type.value)}
                >
                  {type.label}
                </Button>
              ))}
            </div>

            <div>
              <Label htmlFor="claimType">Jenis Klaim *</Label>
              <Select
                value={formData.claimType}
                onValueChange={(value) => setFormData({...formData, claimType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis klaim" />
                </SelectTrigger>
                <SelectContent>
                  {currentClaimTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="claimDescription">Deskripsi Klaim / Kronologi *</Label>
              <Textarea
                id="claimDescription"
                value={formData.claimDescription}
                onChange={(e) => setFormData({...formData, claimDescription: e.target.value})}
                rows={5}
                placeholder="Jelaskan kronologi kejadian secara detail..."
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={loading || !selectedATM}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Membuat...' : 'Buat Klaim'}
          </Button>
        </div>
      </form>
    </div>
  );
}