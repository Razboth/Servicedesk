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
}

export default function VerificationChecklist({ ticketId, onUpdate }: VerificationChecklistProps) {
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
      toast.error('File type not allowed. Please upload PDF or image files.');
      return;
    }

    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit.');
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
        toast.success('Journal uploaded successfully');
        
        // Update verification state with uploaded file info
        setVerification({
          ...verification,
          journalAttachments: [...(verification.journalAttachments || []), data.file]
        });
        
        // Update journal availability
        setHasJournalFile(true);
        
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to upload journal');
      }
    } catch (error) {
      toast.error('Error uploading journal');
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
      toast.error('File type not allowed. Please upload image or video files.');
      return;
    }

    if (file.size > maxSize) {
      toast.error('File size exceeds 50MB limit.');
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
        toast.success('Evidence uploaded successfully');
        
        // Update verification state with uploaded file URL
        setVerification({
          ...verification,
          cctvEvidenceUrl: data.file.url || data.file.path
        });
        
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to upload evidence');
      }
    } catch (error) {
      toast.error('Error uploading evidence');
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
        toast.success('Journal downloaded successfully');
      } else if (response.status === 404) {
        toast.info('No journal file available for this claim');
      } else {
        toast.error('Failed to download journal');
      }
    } catch (error) {
      toast.error('Error downloading journal');
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
        toast.success('Verification updated successfully');
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to update verification');
      }
    } catch (error) {
      toast.error('Error saving verification');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading verification...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Journal Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Step 1: ATM Journal Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={verification.journalChecked}
              onCheckedChange={(checked) => 
                setVerification({...verification, journalChecked: checked})
              }
            />
            <Label>Journal has been checked</Label>
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
                Download Journal
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => journalFileInputRef.current?.click()}
              disabled={uploadingJournal}
            >
              <Upload className="w-4 h-4" />
              {uploadingJournal ? 'Uploading...' : 'Upload Result'}
            </Button>
            <input
              ref={journalFileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,image/*"
              onChange={handleJournalUpload}
            />
          </div>
          
          <div>
            <Label htmlFor="journalFindings">Journal Findings</Label>
            <Textarea
              id="journalFindings"
              value={verification.journalFindings || ''}
              onChange={(e) => 
                setVerification({...verification, journalFindings: e.target.value})
              }
              placeholder="Describe what was found in the journal..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Electronic Journal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Step 2: Electronic Journal (EJ)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Transaction Found in EJ?</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={verification.ejTransactionFound === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, ejTransactionFound: true})}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Yes
              </Button>
              <Button
                variant={verification.ejTransactionFound === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, ejTransactionFound: false})}
                className="flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                No
              </Button>
            </div>
          </div>

          {verification.ejTransactionFound && (
            <>
              <div>
                <Label htmlFor="ejReferenceNumber">EJ Reference Number</Label>
                <Input
                  id="ejReferenceNumber"
                  value={verification.ejReferenceNumber || ''}
                  onChange={(e) => 
                    setVerification({...verification, ejReferenceNumber: e.target.value})
                  }
                  placeholder="Enter reference number from EJ"
                />
              </div>

              <div>
                <Label>Amount Matches Claim?</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={verification.amountMatches === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVerification({...verification, amountMatches: true})}
                  >
                    Yes
                  </Button>
                  <Button
                    variant={verification.amountMatches === false ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVerification({...verification, amountMatches: false})}
                  >
                    No
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
            Step 3: Cash Reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cashOpening">Opening Cash (Rp)</Label>
              <Input
                id="cashOpening"
                type="number"
                value={verification.cashOpening || ''}
                onChange={(e) => 
                  setVerification({...verification, cashOpening: e.target.value})
                }
                onBlur={calculateCashVariance}
              />
            </div>
            <div>
              <Label htmlFor="cashDispensed">Cash Dispensed (Rp)</Label>
              <Input
                id="cashDispensed"
                type="number"
                value={verification.cashDispensed || ''}
                onChange={(e) => 
                  setVerification({...verification, cashDispensed: e.target.value})
                }
                onBlur={calculateCashVariance}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cashRemaining">Cash Remaining (Rp)</Label>
              <Input
                id="cashRemaining"
                type="number"
                value={verification.cashRemaining || ''}
                onChange={(e) => 
                  setVerification({...verification, cashRemaining: e.target.value})
                }
                onBlur={calculateCashVariance}
              />
            </div>
            <div>
              <Label htmlFor="cashVariance">Variance (Rp)</Label>
              <Input
                id="cashVariance"
                type="number"
                value={verification.cashVariance || ''}
                readOnly
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
            Step 4: CCTV Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={verification.cctvReviewed}
              onCheckedChange={(checked) => 
                setVerification({...verification, cctvReviewed: checked})
              }
            />
            <Label>CCTV footage has been reviewed</Label>
          </div>

          {verification.cctvReviewed && (
            <>
              <div>
                <Label htmlFor="cctvFindings">CCTV Findings</Label>
                <Textarea
                  id="cctvFindings"
                  value={verification.cctvFindings || ''}
                  onChange={(e) => 
                    setVerification({...verification, cctvFindings: e.target.value})
                  }
                  placeholder="Describe what was found in CCTV footage..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    toast.info('CCTV footage request has been sent to security team');
                    // In a real implementation, this would create a request ticket
                  }}
                >
                  Request CCTV Footage
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => evidenceFileInputRef.current?.click()}
                  disabled={uploadingEvidence}
                >
                  {uploadingEvidence ? 'Uploading...' : 'Upload Evidence'}
                </Button>
                <input
                  ref={evidenceFileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleEvidenceUpload}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 5: Core Banking Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Step 5: Core Banking Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Debit Transaction Successful?</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={verification.debitSuccessful === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, debitSuccessful: true})}
              >
                Yes
              </Button>
              <Button
                variant={verification.debitSuccessful === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, debitSuccessful: false})}
              >
                No
              </Button>
              <Button
                variant={verification.debitSuccessful === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, debitSuccessful: null})}
              >
                N/A
              </Button>
            </div>
          </div>

          <div>
            <Label>Reversal Completed?</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={verification.reversalCompleted === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, reversalCompleted: true})}
              >
                Yes
              </Button>
              <Button
                variant={verification.reversalCompleted === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, reversalCompleted: false})}
              >
                No
              </Button>
              <Button
                variant={verification.reversalCompleted === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerification({...verification, reversalCompleted: null})}
              >
                N/A
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
            Final Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label htmlFor="recommendation">Recommendation</Label>
            <Select
              value={verification.recommendation || ''}
              onValueChange={(value) => 
                setVerification({...verification, recommendation: value})
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recommendation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVE">Approve Claim</SelectItem>
                <SelectItem value="REJECT">Reject Claim</SelectItem>
                <SelectItem value="ESCALATE">Escalate to HO/IT</SelectItem>
                <SelectItem value="NEED_MORE_INFO">Need More Information</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="recommendationNotes">Recommendation Notes</Label>
            <Textarea
              id="recommendationNotes"
              value={verification.recommendationNotes || ''}
              onChange={(e) => 
                setVerification({...verification, recommendationNotes: e.target.value})
              }
              placeholder="Provide detailed reasoning for your recommendation..."
              rows={4}
            />
          </div>

          {verification.recommendation && (
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Recommendation:</p>
                <Badge 
                  variant={
                    verification.recommendation === 'APPROVE' ? 'success' :
                    verification.recommendation === 'REJECT' ? 'destructive' :
                    'warning'
                  }
                  className="mt-1"
                >
                  {verification.recommendation}
                </Badge>
              </div>
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Verification'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}