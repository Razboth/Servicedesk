'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Download,
  Upload,
  Camera,
  DollarSign,
  CreditCard,
  Database,
  Save
} from 'lucide-react';

interface VerificationChecklistProps {
  ticketId: string;
  onUpdate?: () => void;
  readOnly?: boolean;
}

export default function VerificationChecklist({ ticketId, onUpdate, readOnly = false }: VerificationChecklistProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingJournal, setUploadingJournal] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [hasJournalFile, setHasJournalFile] = useState(false);
  const journalFileInputRef = useRef<HTMLInputElement>(null);
  const evidenceFileInputRef = useRef<HTMLInputElement>(null);
  
  const [verification, setVerification] = useState<any>({
    journalChecked: false,
    journalFindings: '',
    ejTransactionFound: null,
    ejReferenceNumber: '',
    amountMatches: null,
    cashOpening: '',
    cashDispensed: '',
    cashRemaining: '',
    cashVariance: '',
    cctvReviewed: false,
    cctvFindings: '',
    cctvEvidenceUrl: '',
    debitSuccessful: null,
    reversalCompleted: null,
    recommendation: '',
    recommendationNotes: ''
  });

  useEffect(() => {
    fetchVerification();
    checkJournalAvailability();
  }, [ticketId]);

  const fetchVerification = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/branch/atm-claims/${ticketId}/verify`);
      if (response.ok) {
        const data = await response.json();
        if (data.verification) {
          // Ensure string fields are never null/undefined
          const safeVerification = {
            journalChecked: data.verification.journalChecked || false,
            journalFindings: data.verification.journalFindings || '',
            ejTransactionFound: data.verification.ejTransactionFound,
            ejReferenceNumber: data.verification.ejReferenceNumber || '',
            amountMatches: data.verification.amountMatches,
            cashOpening: data.verification.cashOpening?.toString() || '',
            cashDispensed: data.verification.cashDispensed?.toString() || '',
            cashRemaining: data.verification.cashRemaining?.toString() || '',
            cashVariance: data.verification.cashVariance?.toString() || '',
            cctvReviewed: data.verification.cctvReviewed || false,
            cctvFindings: data.verification.cctvFindings || '',
            cctvEvidenceUrl: data.verification.cctvEvidenceUrl || '',
            debitSuccessful: data.verification.debitSuccessful,
            reversalCompleted: data.verification.reversalCompleted,
            recommendation: data.verification.recommendation || '',
            recommendationNotes: data.verification.recommendationNotes || ''
          };
          setVerification(safeVerification);
        }
      }
    } catch (error) {
      console.error('Error fetching verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCashVariance = () => {
    const opening = parseFloat(verification.cashOpening) || 0;
    const dispensed = parseFloat(verification.cashDispensed) || 0;
    const remaining = parseFloat(verification.cashRemaining) || 0;
    const expectedRemaining = opening - dispensed;
    const variance = remaining - expectedRemaining;
    
    setVerification({
      ...verification,
      cashVariance: variance.toString()
    });
  };

  const handleJournalUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipe file tidak diizinkan. Silakan unggah file PDF atau gambar.');
      return;
    }

    if (file.size > maxSize) {
      toast.error('Ukuran file melebihi batas 10MB.');
      return;
    }

    setUploadingJournal(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'journal');

    try {
      const response = await fetch(`/api/branch/atm-claims/${ticketId}/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Jurnal berhasil diunggah');

        // Update verification state with uploaded file info
        setVerification({
          ...verification,
          journalAttachments: [...(verification.journalAttachments || []), data.file]
        });

        // Update journal availability
        setHasJournalFile(true);

        if (onUpdate) onUpdate();
      } else {
        toast.error('Gagal mengunggah jurnal');
      }
    } catch (error) {
      toast.error('Kesalahan saat mengunggah jurnal');
    } finally {
      setUploadingJournal(false);
      if (journalFileInputRef.current) {
        journalFileInputRef.current.value = '';
      }
    }
  };

  const checkJournalAvailability = async () => {
    try {
      // Check if journal file exists for this ticket
      const response = await fetch(`/api/branch/atm-claims/${ticketId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        // Check if any attachment contains 'journal' in its name
        const hasJournal = data.attachments?.some((att: any) => 
          att.filename?.toLowerCase().includes('journal') || 
          att.originalName?.toLowerCase().includes('journal')
        );
        setHasJournalFile(hasJournal || false);
      }
    } catch (error) {
      console.error('Error checking journal availability:', error);
    }
  };

  const handleEvidenceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4', 'video/avi'];
    const maxSize = 50 * 1024 * 1024; // 50MB for video

    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipe file tidak diizinkan. Silakan unggah file gambar atau video.');
      return;
    }

    if (file.size > maxSize) {
      toast.error('Ukuran file melebihi batas 50MB.');
      return;
    }

    setUploadingEvidence(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'cctv_evidence');

    try {
      const response = await fetch(`/api/branch/atm-claims/${ticketId}/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Bukti berhasil diunggah');

        // Update verification state with uploaded file URL
        setVerification({
          ...verification,
          cctvEvidenceUrl: data.file.url || data.file.path
        });

        if (onUpdate) onUpdate();
      } else {
        toast.error('Gagal mengunggah bukti');
      }
    } catch (error) {
      toast.error('Kesalahan saat mengunggah bukti');
    } finally {
      setUploadingEvidence(false);
      if (evidenceFileInputRef.current) {
        evidenceFileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadJournal = async () => {
    try {
      // This would typically download the ATM journal file if available
      const response = await fetch(`/api/branch/atm-claims/${ticketId}/journal`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ATM_Journal_${ticketId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Jurnal berhasil diunduh');
      } else if (response.status === 404) {
        toast.info('Tidak ada file jurnal tersedia untuk klaim ini');
      } else {
        toast.error('Gagal mengunduh jurnal');
      }
    } catch (error) {
      toast.error('Kesalahan saat mengunduh jurnal');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare data for API, converting empty strings to appropriate types
      const apiData: any = {
        journalChecked: verification.journalChecked,
        journalFindings: verification.journalFindings || undefined,
        ejTransactionFound: verification.ejTransactionFound,
        ejReferenceNumber: verification.ejReferenceNumber || undefined,
        amountMatches: verification.amountMatches,
        cashOpening: verification.cashOpening ? parseFloat(verification.cashOpening) : undefined,
        cashDispensed: verification.cashDispensed ? parseFloat(verification.cashDispensed) : undefined,
        cashRemaining: verification.cashRemaining ? parseFloat(verification.cashRemaining) : undefined,
        cashVariance: verification.cashVariance ? parseFloat(verification.cashVariance) : undefined,
        cctvReviewed: verification.cctvReviewed,
        cctvFindings: verification.cctvFindings || undefined,
        cctvEvidenceUrl: verification.cctvEvidenceUrl || undefined,
        debitSuccessful: verification.debitSuccessful,
        reversalCompleted: verification.reversalCompleted,
        recommendation: verification.recommendation || undefined,
        recommendationNotes: verification.recommendationNotes || undefined
      };

      // Remove undefined values to avoid sending empty fields
      Object.keys(apiData).forEach(key => {
        if (apiData[key] === undefined) {
          delete apiData[key];
        }
      });

      const response = await fetch(`/api/branch/atm-claims/${ticketId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });

      if (response.ok) {
        toast.success('Verifikasi berhasil diperbarui');
        if (onUpdate) onUpdate();
      } else {
        toast.error('Gagal memperbarui verifikasi');
      }
    } catch (error) {
      toast.error('Kesalahan saat menyimpan verifikasi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Memuat verifikasi...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Read-Only Notice */}
      {readOnly && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-900">Mode Hanya Lihat</p>
                <p className="text-sm text-yellow-800">
                  Anda hanya dapat melihat verifikasi ini. Hanya cabang pemilik ATM yang dapat mengedit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Journal Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Langkah 1: Verifikasi Jurnal ATM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={verification.journalChecked}
              onCheckedChange={(checked) =>
                setVerification({...verification, journalChecked: checked})
              }
              disabled={readOnly}
            />
            <Label>Jurnal telah diperiksa</Label>
          </div>

          <div className="flex gap-2">
            {hasJournalFile && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={handleDownloadJournal}
              >
                <Download className="w-4 h-4" />
                Unduh Jurnal
              </Button>
            )}
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => journalFileInputRef.current?.click()}
                  disabled={uploadingJournal}
                >
                  <Upload className="w-4 h-4" />
                  {uploadingJournal ? 'Mengunggah...' : 'Unggah Hasil'}
                </Button>
                <input
                  ref={journalFileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={handleJournalUpload}
                />
              </>
            )}
          </div>

          <div>
            <Label htmlFor="journalFindings">Temuan Jurnal</Label>
            <Textarea
              id="journalFindings"
              value={verification.journalFindings || ''}
              onChange={(e) =>
                setVerification({...verification, journalFindings: e.target.value})
              }
              placeholder="Deskripsikan apa yang ditemukan di jurnal..."
              rows={3}
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Electronic Journal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Langkah 2: Jurnal Elektronik (EJ)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Transaksi Ditemukan di EJ?</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={verification.ejTransactionFound === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, ejTransactionFound: true})}
                className="flex items-center gap-2"
                disabled={readOnly}
              >
                <CheckCircle2 className="w-4 h-4" />
                Ya
              </Button>
              <Button
                variant={verification.ejTransactionFound === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, ejTransactionFound: false})}
                className="flex items-center gap-2"
                disabled={readOnly}
              >
                <XCircle className="w-4 h-4" />
                Tidak
              </Button>
            </div>
          </div>

          {verification.ejTransactionFound && (
            <>
              <div>
                <Label htmlFor="ejReferenceNumber">Nomor Referensi EJ</Label>
                <Input
                  id="ejReferenceNumber"
                  value={verification.ejReferenceNumber || ''}
                  onChange={(e) =>
                    setVerification({...verification, ejReferenceNumber: e.target.value})
                  }
                  placeholder="Masukkan nomor referensi dari EJ"
                  disabled={readOnly}
                />
              </div>

              <div>
                <Label>Jumlah Sesuai Klaim?</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={verification.amountMatches === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVerification({...verification, amountMatches: true})}
                    disabled={readOnly}
                  >
                    Ya
                  </Button>
                  <Button
                    variant={verification.amountMatches === false ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVerification({...verification, amountMatches: false})}
                    disabled={readOnly}
                  >
                    Tidak
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Cash Reconciliation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Langkah 3: Rekonsiliasi Kas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cashOpening">Kas Pembukaan (Rp)</Label>
              <Input
                id="cashOpening"
                type="number"
                value={verification.cashOpening || ''}
                onChange={(e) =>
                  setVerification({...verification, cashOpening: e.target.value})
                }
                onBlur={calculateCashVariance}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="cashDispensed">Kas yang Dikeluarkan (Rp)</Label>
              <Input
                id="cashDispensed"
                type="number"
                value={verification.cashDispensed || ''}
                onChange={(e) =>
                  setVerification({...verification, cashDispensed: e.target.value})
                }
                onBlur={calculateCashVariance}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cashRemaining">Sisa Kas (Rp)</Label>
              <Input
                id="cashRemaining"
                type="number"
                value={verification.cashRemaining || ''}
                onChange={(e) =>
                  setVerification({...verification, cashRemaining: e.target.value})
                }
                onBlur={calculateCashVariance}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="cashVariance">Selisih (Rp)</Label>
              <Input
                id="cashVariance"
                type="number"
                value={verification.cashVariance || ''}
                readOnly
                disabled={readOnly}
                className={`${
                  parseFloat(verification.cashVariance || '0') !== 0
                    ? 'bg-red-50 text-red-600'
                    : 'bg-green-50 text-green-600'
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: CCTV Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Langkah 4: Peninjauan CCTV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={verification.cctvReviewed}
              onCheckedChange={(checked) =>
                setVerification({...verification, cctvReviewed: checked})
              }
              disabled={readOnly}
            />
            <Label>Rekaman CCTV telah ditinjau</Label>
          </div>

          {verification.cctvReviewed && (
            <>
              <div>
                <Label htmlFor="cctvFindings">Temuan CCTV</Label>
                <Textarea
                  id="cctvFindings"
                  value={verification.cctvFindings || ''}
                  onChange={(e) =>
                    setVerification({...verification, cctvFindings: e.target.value})
                  }
                  placeholder="Deskripsikan apa yang ditemukan dalam rekaman CCTV..."
                  rows={3}
                  disabled={readOnly}
                />
              </div>

              {!readOnly && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => evidenceFileInputRef.current?.click()}
                    disabled={uploadingEvidence}
                  >
                    {uploadingEvidence ? 'Mengunggah...' : 'Unggah Bukti'}
                  </Button>
                  <input
                    ref={evidenceFileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleEvidenceUpload}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 5: Core Banking Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Langkah 5: Pemeriksaan Core Banking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Transaksi Debit Berhasil?</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={verification.debitSuccessful === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, debitSuccessful: true})}
                disabled={readOnly}
              >
                Ya
              </Button>
              <Button
                variant={verification.debitSuccessful === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, debitSuccessful: false})}
                disabled={readOnly}
              >
                Tidak
              </Button>
              <Button
                variant={verification.debitSuccessful === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, debitSuccessful: null})}
                disabled={readOnly}
              >
                T/A
              </Button>
            </div>
          </div>

          <div>
            <Label>Reversal Selesai?</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={verification.reversalCompleted === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, reversalCompleted: true})}
                disabled={readOnly}
              >
                Ya
              </Button>
              <Button
                variant={verification.reversalCompleted === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, reversalCompleted: false})}
                disabled={readOnly}
              >
                Tidak
              </Button>
              <Button
                variant={verification.reversalCompleted === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, reversalCompleted: null})}
                disabled={readOnly}
              >
                T/A
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Recommendation */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Rekomendasi Akhir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label htmlFor="recommendation">Rekomendasi</Label>
            <Select
              value={verification.recommendation || ''}
              onValueChange={(value) =>
                setVerification({...verification, recommendation: value})
              }
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih rekomendasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVE">Setujui Klaim</SelectItem>
                <SelectItem value="REJECT">Tolak Klaim</SelectItem>
                <SelectItem value="NEED_MORE_INFO">Perlu Informasi Lebih Lanjut</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="recommendationNotes">Catatan Rekomendasi</Label>
            <Textarea
              id="recommendationNotes"
              value={verification.recommendationNotes || ''}
              onChange={(e) =>
                setVerification({...verification, recommendationNotes: e.target.value})
              }
              placeholder="Berikan alasan detail untuk rekomendasi Anda..."
              rows={4}
              disabled={readOnly}
            />
          </div>

          {verification.recommendation && (
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Rekomendasi:</p>
                <Badge
                  variant={
                    verification.recommendation === 'APPROVE' ? 'success' :
                    verification.recommendation === 'REJECT' ? 'destructive' :
                    'warning'
                  }
                  className="mt-1"
                >
                  {verification.recommendation === 'APPROVE' ? 'SETUJUI' :
                   verification.recommendation === 'REJECT' ? 'TOLAK' :
                   verification.recommendation === 'NEED_MORE_INFO' ? 'PERLU INFO LEBIH LANJUT' :
                   verification.recommendation}
                </Badge>
              </div>
              {!readOnly && (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Menyimpan...' : 'Simpan Verifikasi'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}