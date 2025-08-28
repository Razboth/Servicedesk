'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  Camera, 
  DollarSign, 
  CreditCard,
  AlertCircle,
  Upload,
  Save
} from 'lucide-react';

interface VerificationItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
}

interface ATMClaimVerificationProps {
  ticketId: string;
  onComplete?: (data: any) => void;
  readOnly?: boolean;
}

export function ATMClaimVerification({ ticketId, onComplete, readOnly = false }: ATMClaimVerificationProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    journalChecked: false,
    ejChecked: false,
    cctvReviewed: false,
    balanceVerified: false,
    cashReconciled: false,
    coreBankingChecked: false
  });

  const [findings, setFindings] = useState<Record<string, string>>({
    journalFindings: '',
    ejFindings: '',
    cctvFindings: '',
    balanceFindings: '',
    cashFindings: '',
    coreBankingFindings: ''
  });

  const [recommendation, setRecommendation] = useState<'APPROVE' | 'REJECT' | 'ESCALATE' | ''>('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const verificationItems: VerificationItem[] = [
    {
      id: 'journalChecked',
      label: 'ATM Journal Check',
      description: 'Review ATM transaction journal for the reported time',
      icon: <FileText className="h-4 w-4" />,
      required: true
    },
    {
      id: 'ejChecked',
      label: 'Electronic Journal (EJ)',
      description: 'Verify transaction in electronic journal',
      icon: <FileText className="h-4 w-4" />,
      required: true
    },
    {
      id: 'cctvReviewed',
      label: 'CCTV Review',
      description: 'Review CCTV footage if available',
      icon: <Camera className="h-4 w-4" />,
      required: false
    },
    {
      id: 'balanceVerified',
      label: 'Balance Verification',
      description: 'Verify customer account balance and transaction',
      icon: <DollarSign className="h-4 w-4" />,
      required: true
    },
    {
      id: 'cashReconciled',
      label: 'Cash Reconciliation',
      description: 'Reconcile ATM cash position',
      icon: <CreditCard className="h-4 w-4" />,
      required: true
    },
    {
      id: 'coreBankingChecked',
      label: 'Core Banking Check',
      description: 'Verify transaction in core banking system',
      icon: <FileText className="h-4 w-4" />,
      required: true
    }
  ];

  const handleCheckChange = (itemId: string, checked: boolean) => {
    if (!readOnly) {
      setChecklist(prev => ({ ...prev, [itemId]: checked }));
    }
  };

  const handleFindingChange = (itemId: string, value: string) => {
    if (!readOnly) {
      setFindings(prev => ({ ...prev, [`${itemId.replace('Checked', 'Findings')}`]: value }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && !readOnly) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const isAllRequiredChecked = () => {
    return verificationItems
      .filter(item => item.required)
      .every(item => checklist[item.id]);
  };

  const handleSubmit = async () => {
    if (!isAllRequiredChecked()) {
      toast.error('Please complete all required verification items');
      return;
    }

    if (!recommendation) {
      toast.error('Please select a recommendation');
      return;
    }

    const verificationData = {
      ticketId,
      checklist,
      findings,
      recommendation,
      notes,
      attachments: attachments.map(f => f.name),
      verifiedAt: new Date().toISOString()
    };

    try {
      // TODO: Submit to backend
      console.log('Submitting verification:', verificationData);
      
      // Add comment to ticket
      await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Verification completed. Recommendation: ${recommendation}\n\nFindings:\n${Object.entries(findings).filter(([_, v]) => v).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\nNotes: ${notes}`,
          isInternal: true
        })
      });

      toast.success('Verification submitted successfully');
      onComplete?.(verificationData);
    } catch (error) {
      toast.error('Failed to submit verification');
    }
  };

  const getProgressPercentage = () => {
    const total = Object.keys(checklist).length;
    const checked = Object.values(checklist).filter(Boolean).length;
    return Math.round((checked / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Verification Progress</span>
            <Badge variant={getProgressPercentage() === 100 ? 'default' : 'secondary'}>
              {getProgressPercentage()}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Verification Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Checklist</CardTitle>
          <CardDescription>
            Complete all required items to process the claim
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationItems.map((item) => (
            <div key={item.id} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={item.id}
                  checked={checklist[item.id]}
                  onCheckedChange={(checked) => handleCheckChange(item.id, checked as boolean)}
                  disabled={readOnly}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <Label 
                      htmlFor={item.id} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {item.label}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  
                  {checklist[item.id] && (
                    <div className="mt-3">
                      <Label className="text-xs">Findings</Label>
                      <Textarea
                        className="mt-1"
                        placeholder={`Enter findings for ${item.label}...`}
                        value={findings[`${item.id.replace('Checked', 'Findings')}`]}
                        onChange={(e) => handleFindingChange(item.id, e.target.value)}
                        disabled={readOnly}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
                {checklist[item.id] ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <div className="h-5 w-5" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendation</CardTitle>
          <CardDescription>
            Based on your verification, select the appropriate action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant={recommendation === 'APPROVE' ? 'default' : 'outline'}
              onClick={() => !readOnly && setRecommendation('APPROVE')}
              disabled={readOnly}
              className="justify-start"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Claim
            </Button>
            <Button
              variant={recommendation === 'REJECT' ? 'destructive' : 'outline'}
              onClick={() => !readOnly && setRecommendation('REJECT')}
              disabled={readOnly}
              className="justify-start"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject Claim
            </Button>
            <Button
              variant={recommendation === 'ESCALATE' ? 'secondary' : 'outline'}
              onClick={() => !readOnly && setRecommendation('ESCALATE')}
              disabled={readOnly}
              className="justify-start"
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Escalate to HO
            </Button>
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              className="mt-1"
              placeholder="Add any additional notes or observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={readOnly}
              rows={4}
            />
          </div>

          <div>
            <Label>Supporting Documents</Label>
            <div className="mt-1">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={readOnly}
                className="hidden"
                id="file-upload"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <Label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Upload className="h-4 w-4" />
                Upload Evidence
              </Label>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      • {file.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      {!readOnly && (
        <div className="flex justify-end gap-4">
          <Button variant="outline">
            Save Draft
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isAllRequiredChecked() || !recommendation}
          >
            <Save className="mr-2 h-4 w-4" />
            Submit Verification
          </Button>
        </div>
      )}

      {/* Warning for incomplete verification */}
      {!isAllRequiredChecked() && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete all required verification items before submitting
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}