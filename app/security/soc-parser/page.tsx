'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, AlertTriangle, FileText, Loader2, Edit, CheckCircle, Bug } from 'lucide-react';

interface ParsedField {
  fieldName: string;
  value: string;
}

interface ParsedData {
  title: string;
  description: string;
  fieldValues: ParsedField[];
  severity: string;
  securityClassification: string;
}

interface AntivirusData {
  detectionDate: string;
  endpoint: string;
  username: string;
  ipAddress: string;
  virusName: string;
  filePath: string;
  action: string;
  actionTaken?: string;
  actionOther?: string;
  severity: string;
  description: string;
  preliminaryAnalysis?: string;
  followupActions?: string;
}

export default function SOCParserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socText, setSocText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showAntivirusDialog, setShowAntivirusDialog] = useState(false);
  const [antivirusData, setAntivirusData] = useState<AntivirusData>({
    detectionDate: new Date().toISOString().slice(0, 16),
    endpoint: '',
    username: '',
    ipAddress: '',
    virusName: '',
    filePath: '',
    action: 'Quarantined',
    actionTaken: 'Quarantined',
    actionOther: '',
    severity: 'High',
    description: '',
    preliminaryAnalysis: '',
    followupActions: ''
  });

  // Check authorization
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session || (!['SECURITY_ANALYST', 'ADMIN'].includes(session.user.role) && session.user.supportGroupCode !== 'SECURITY_OPS')) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 px-4 py-8">
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Access denied. This page is only available to Security Analysts or members of the Security Operations Center.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleParse = async () => {
    if (!socText.trim()) {
      setError('Please paste the SOC notification text');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/soc/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: socText })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse SOC notification');
      }

      setParsedData(data.parsed);
      setValidationErrors(data.validation.errors || []);
      setShowConfirmation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!parsedData) return;

    setIsCreating(true);
    setError('');

    try {
      // Convert parsed data back to text format for the API
      // This allows us to use the existing API endpoint
      const response = await fetch('/api/soc/parse-and-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          text: socText,
          parsedData: parsedData // Send both for backward compatibility
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create SOC ticket');
      }

      setResult(data);
      setShowConfirmation(false);
      
      // Clear the text area on success
      setSocText('');
      setParsedData(null);

      // Redirect to the created ticket after 3 seconds
      if (data.ticket?.id) {
        setTimeout(() => {
          router.push(`/tickets/${data.ticket.id}`);
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateAntivirusAlert = async () => {
    if (!antivirusData.endpoint || !antivirusData.username || !antivirusData.virusName) {
      setError('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Find the Antivirus Alert service
      const servicesResponse = await fetch('/api/services?search=Antivirus%20Alert');
      const servicesData = await servicesResponse.json();
      
      if (!servicesData.services || servicesData.services.length === 0) {
        throw new Error('Antivirus Alert service not found. Please contact administrator.');
      }

      const antivirusService = servicesData.services[0];

      // Create the ticket
      const ticketData = {
        serviceId: antivirusService.id,
        title: `Antivirus Alert: ${antivirusData.virusName} on ${antivirusData.endpoint}`,
        description: `Virus Detection Alert
        
Computer Name: ${antivirusData.endpoint}
User: ${antivirusData.username}
IP Address: ${antivirusData.ipAddress}
Virus: ${antivirusData.virusName}
File: ${antivirusData.filePath}
Action Taken: ${antivirusData.actionTaken}
${antivirusData.actionTaken === 'Other' ? `Other Action: ${antivirusData.actionOther}` : ''}

Preliminary Analysis:
${antivirusData.preliminaryAnalysis}

Required Follow-up Actions:
${antivirusData.followupActions}`,
        priority: antivirusData.severity === 'Critical' ? 'URGENT' : 
                  antivirusData.severity === 'High' ? 'HIGH' : 
                  antivirusData.severity === 'Medium' ? 'MEDIUM' : 'LOW',
        customFields: {
          'Computer Name': antivirusData.endpoint,
          'User Name': antivirusData.username,
          'Virus Name': antivirusData.virusName,
          'File Path': antivirusData.filePath,
          'Detection Time': antivirusData.detectionDate,
          'Action Taken': antivirusData.actionTaken,
          'Severity': antivirusData.severity,
          'Additional Info': antivirusData.preliminaryAnalysis
        }
      };

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ticket');
      }

      // Success - show result and redirect
      setResult(data);
      setShowAntivirusDialog(false);
      
      // Reset form
      setAntivirusData({
        detectionDate: new Date().toISOString().slice(0, 16),
        endpoint: '',
        username: '',
        ipAddress: '',
        virusName: '',
        filePath: '',
        action: 'Quarantined',
        actionTaken: 'Quarantined',
        actionOther: '',
        severity: 'High',
        description: '',
        preliminaryAnalysis: '',
        followupActions: ''
      });

      // Redirect to ticket after a short delay
      setTimeout(() => {
        router.push(`/tickets/${data.ticket.id}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const updateFieldValue = (fieldName: string, newValue: string) => {
    if (!parsedData) return;
    
    setParsedData({
      ...parsedData,
      fieldValues: parsedData.fieldValues.map(field =>
        field.fieldName === fieldName ? { ...field, value: newValue } : field
      )
    });
  };

  const getFieldLabel = (fieldName: string): string => {
    const labels: { [key: string]: string } = {
      'soc_date_time': 'Date & Time',
      'soc_severity': 'Severity',
      'soc_first_action': 'First Action Needed',
      'soc_case_id_lr': 'Case ID LR',
      'soc_ultima_id': 'Ultima ID',
      'soc_incident_type': 'Incident Type',
      'soc_ip_host_origin': 'IP/Host Origin',
      'soc_user_origin': 'User Origin',
      'soc_ip_host_impacted': 'IP/Host Impacted',
      'soc_user_impacted': 'User Impacted',
      'soc_log_source': 'Log Source',
      'soc_status_ticket': 'Status Ticket',
      'soc_port': 'Port',
      'soc_classification': 'Classification',
      'soc_url': 'URL',
      'soc_file_process': 'File Process',
      'soc_file_path': 'File Path',
      'soc_action': 'Action',
      'soc_description': 'Description',
      'soc_recommendations': 'Recommendations'
    };
    return labels[fieldName] || fieldName;
  };

  const isRequiredField = (fieldName: string): boolean => {
    const requiredFields = [
      'soc_date_time',
      'soc_severity',
      'soc_first_action',
      'soc_ultima_id',
      'soc_incident_type',
      'soc_ip_host_impacted',
      'soc_status_ticket',
      'soc_classification',
      'soc_description',
      'soc_recommendations'
    ];
    return requiredFields.includes(fieldName);
  };

  const sampleText = `Dear Team IT,
SOC Notification Alert!
Date                                : 08/04/2025 12:50:33 pm
Severity                          : High
First Action Needed        : Validasi
Case ID LR                       : -
Ultima ID                       : ABC-DEF-082025-11704
Incident Type                   : ENDS: LIN: PE-TA0004: Sudo Command Executed: Log: Success
IP / Host Origin               : -
User Origin                      : -
IP / Host Impacted           : HOST-IMPACTED
User Impacted                 : -
Log Source                      : -
Status Tiket                      : New
Port                                  : -
Classification                   : Activity
URL                                  : -
File_Proses                       : sudo
File_Path                           : -
Action                              : -
Deskripsi:
Team SOC menemukan alarm ENDS: LIN: PE-TA0004: Sudo Command Executed: Log: Success pada log source Linux.
Event tersebut terjadi karena terdeteksinya adanya aktivitas sudo command executed pada [user1] dan [-] dengan [server1] menggunakan [sudo] pada [/usr/bin/su].
pada perintah /usr/bin/su digunakan untuk beralih (switch) ke pengguna lain yang biasanya untuk memperoleh akses lebih tinggi  seperti root (administrator).
Rekomendasi:
1. Melakukan pengecekan dan validasi terkait aktivitas pada IP/user omsagent legitimate atau tidak.
2. Membatasi atau limitasi user untuk melakukan perintah command sudo menggunakan user root.
3. Gunakan password dengan karakter unik. Password yang terdiri dari karakter, termasuk huruf, angka, dan simbol.
4. Aktifkan verifikasi dua faktor (2FA). 2FA menambahkan lapisan keamanan tambahan untuk memasukkan kode yang dikirim ke perangkat.
Terima kasih.
Salam,
SOC Team`;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-red-600" />
          <h1 className="text-2xl font-bold">SOC Notification Parser</h1>
        </div>
        <p className="text-gray-600">
          Parse SOC email notifications and automatically create security incident tickets
        </p>
      </div>

      {/* SOC Parser Card */}
      <Card className="border-2 hover:shadow-lg transition-shadow mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            <CardTitle>SOC Notification Parser</CardTitle>
          </div>
          <CardDescription>
            Parse SOC email notifications and automatically create security incident tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Use this tool to quickly convert SOC notification emails into structured tickets with all required fields.
          </p>
          <Button 
            className="w-full bg-red-600 hover:bg-red-700"
            onClick={() => document.getElementById('soc-textarea')?.focus()}
          >
            <Edit className="mr-2 h-4 w-4" />
            Parse SOC Notification
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Parse SOC Notification</CardTitle>
          <CardDescription>
            Paste the SOC notification email content below. The system will automatically extract all fields and create a ticket.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              id="soc-textarea"
              placeholder="Paste SOC notification text here..."
              value={socText}
              onChange={(e) => setSocText(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />
          </div>

          {error && !showConfirmation && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className="bg-green-50 border-green-200">
              <FileText className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-1">
                  <p className="font-medium">Ticket created successfully!</p>
                  <p>Ticket Number: {result.ticket.ticketNumber}</p>
                  <p>Priority: {result.ticket.priority}</p>
                  {result.ticket.assignedTo && (
                    <p>Assigned to: {result.ticket.assignedTo.name}</p>
                  )}
                  <p className="text-sm mt-2">Redirecting to ticket details...</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setSocText(sampleText)}
              disabled={isProcessing}
            >
              Load Sample
            </Button>
            
            <Button
              onClick={handleParse}
              disabled={isProcessing || !socText.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Parse SOC Notification
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Parsed SOC Data</DialogTitle>
            <DialogDescription>
              Please review and edit the parsed information before creating the ticket.
              Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          {parsedData && (
            <div className="space-y-6 py-4">
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    <p className="font-medium text-orange-800 mb-1">Please fix the following issues:</p>
                    <ul className="list-disc list-inside text-sm text-orange-700">
                      {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Title and Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={parsedData.title}
                    onChange={(e) => setParsedData({ ...parsedData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity *</Label>
                  <Select
                    value={parsedData.severity}
                    onValueChange={(value) => setParsedData({ ...parsedData, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Informational">Informational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Field Values Grid */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-700">SOC Fields</h3>
                <div className="grid grid-cols-2 gap-4">
                  {parsedData.fieldValues
                    .filter(field => !['soc_description', 'soc_recommendations'].includes(field.fieldName))
                    .map((field) => (
                      <div key={field.fieldName} className="space-y-2">
                        <Label htmlFor={field.fieldName}>
                          {getFieldLabel(field.fieldName)}
                          {isRequiredField(field.fieldName) && ' *'}
                        </Label>
                        <Input
                          id={field.fieldName}
                          value={field.value}
                          onChange={(e) => updateFieldValue(field.fieldName, e.target.value)}
                          className={isRequiredField(field.fieldName) && !field.value ? 'border-red-300' : ''}
                        />
                      </div>
                    ))}
                </div>
              </div>

              {/* Description and Recommendations */}
              <div className="space-y-4">
                {parsedData.fieldValues
                  .filter(field => ['soc_description', 'soc_recommendations'].includes(field.fieldName))
                  .map((field) => (
                    <div key={field.fieldName} className="space-y-2">
                      <Label htmlFor={field.fieldName}>
                        {getFieldLabel(field.fieldName)}
                        {isRequiredField(field.fieldName) && ' *'}
                      </Label>
                      <Textarea
                        id={field.fieldName}
                        value={field.value}
                        onChange={(e) => updateFieldValue(field.fieldName, e.target.value)}
                        className={`min-h-[100px] ${isRequiredField(field.fieldName) && !field.value ? 'border-red-300' : ''}`}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={isCreating}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Ticket...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Card>
        <CardHeader>
          <CardTitle>API Integration</CardTitle>
          <CardDescription>
            External SOC tools can integrate using the API endpoint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-mono text-sm mb-2">POST /api/soc/parse-and-create</p>
            <p className="text-sm text-gray-600 mb-2">Headers:</p>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}
            </pre>
            <p className="text-sm text-gray-600 mb-2 mt-2">Body:</p>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`{
  "text": "SOC notification content..."
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}