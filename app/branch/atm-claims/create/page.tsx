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
  Building2
} from 'lucide-react';

interface ATM {
  id: string;
  code: string;
  location: string;
  branch: {
    id: string;
    name: string;
    code: string;
  };
}

const CLAIM_TYPES = [
  { value: 'CARD_CAPTURED', label: 'Kartu Tertelan' },
  { value: 'CASH_NOT_DISPENSED', label: 'Uang Tidak Keluar' },
  { value: 'WRONG_AMOUNT', label: 'Nominal Tidak Sesuai' },
  { value: 'DOUBLE_DEBIT', label: 'Terdebet Ganda' },
  { value: 'TIMEOUT', label: 'Transaksi Timeout' },
  { value: 'OTHER', label: 'Lainnya' }
];

export default function CreateATMClaimPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchingATM, setSearchingATM] = useState(false);
  const [atmCode, setAtmCode] = useState('');
  const [selectedATM, setSelectedATM] = useState<ATM | null>(null);
  const [showATMWarning, setShowATMWarning] = useState(false);
  
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
    }
  };

  const searchATM = async () => {
    if (!atmCode) return;
    
    setSearchingATM(true);
    try {
      const response = await fetch(`/api/atms/lookup?code=${atmCode}`);
      const data = await response.json();
      
      if (response.ok && data) {
        setSelectedATM(data);
        
        // Check if ATM is from different branch
        const userBranch = session?.user?.branchId;
        if (userBranch && data.branch?.id && data.branch.id !== userBranch) {
          setShowATMWarning(true);
        } else {
          setShowATMWarning(false);
        }
      } else {
        toast.error('ATM tidak ditemukan');
        setSelectedATM(null);
      }
    } catch (error) {
      toast.error('Error searching ATM');
    } finally {
      setSearchingATM(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedATM) {
      toast.error('Please select an ATM first');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        atmCode: selectedATM.code,
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
        toast.success('Klaim ATM berhasil dibuat');
        
        if (data.routing?.isInterBranch) {
          toast.info(
            `Klaim akan diproses oleh ${data.routing.toBranch}`,
            { duration: 5000 }
          );
        }
        
        router.push('/branch/atm-claims');
      } else {
        toast.error(data.error || 'Failed to create claim');
      }
    } catch (error) {
      toast.error('Error creating claim');
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
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create ATM Claim</h1>
          <p className="text-gray-600">Input klaim nasabah untuk ATM</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ATM Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              ATM Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="atmCode">ATM Code</Label>
                <Input
                  id="atmCode"
                  value={atmCode}
                  onChange={(e) => setAtmCode(e.target.value.toUpperCase())}
                  placeholder="e.g., ATM-001234"
                  required
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={searchATM}
                disabled={searchingATM || !atmCode}
                className="mt-6"
              >
                {searchingATM ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {selectedATM && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="font-semibold">{selectedATM.code}</div>
                <div className="text-sm text-gray-600">
                  Location: {selectedATM.location || 'N/A'}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Branch: {selectedATM.branch?.name || 'Unknown'} ({selectedATM.branch?.code || 'N/A'})
                </div>
              </div>
            )}

            {showATMWarning && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  ATM milik Cabang {selectedATM?.branch.name}. 
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
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerAccount">Account Number *</Label>
                <Input
                  id="customerAccount"
                  value={formData.customerAccount}
                  onChange={(e) => setFormData({...formData, customerAccount: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerPhone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customerEmail">Email (Optional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cardLast4">Last 4 Digits of ATM Card *</Label>
              <Input
                id="cardLast4"
                value={formData.cardLast4}
                onChange={(e) => setFormData({...formData, cardLast4: e.target.value})}
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
              Transaction Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transactionAmount">Transaction Amount *</Label>
                <Input
                  id="transactionAmount"
                  type="number"
                  value={formData.transactionAmount}
                  onChange={(e) => setFormData({...formData, transactionAmount: e.target.value})}
                  placeholder="e.g., 500000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="transactionRef">Transaction Reference</Label>
                <Input
                  id="transactionRef"
                  value={formData.transactionRef}
                  onChange={(e) => setFormData({...formData, transactionRef: e.target.value})}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transactionDate">Transaction Date *</Label>
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
                <Label htmlFor="transactionTime">Transaction Time</Label>
                <Input
                  id="transactionTime"
                  type="time"
                  value={formData.transactionTime}
                  onChange={(e) => setFormData({...formData, transactionTime: e.target.value})}
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
              Claim Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Templates */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Quick Templates:</span>
              {CLAIM_TYPES.slice(0, 3).map(type => (
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
              <Label htmlFor="claimType">Claim Type *</Label>
              <Select
                value={formData.claimType}
                onValueChange={(value) => setFormData({...formData, claimType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select claim type" />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="claimDescription">Claim Description / Kronologi *</Label>
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
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !selectedATM}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Claim'}
          </Button>
        </div>
      </form>
    </div>
  );
}