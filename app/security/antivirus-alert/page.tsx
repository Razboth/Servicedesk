'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { AlertTriangle, Shield, Calendar, User, Server, Wifi, Bug, AlertCircle, FileText, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function AntivirusAlertPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [antivirusService, setAntivirusService] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    detectionDate: format(new Date(), 'yyyy-MM-dd'),
    endpoint: '',
    username: '',
    ipAddress: '',
    threatType: '',
    severity: 'Medium',
    actionTaken: '',
    actionOther: '',
    preliminaryAnalysis: '',
    followupActions: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    // Check if user has permission
    if (session.user.role !== 'SECURITY_ANALYST' && session.user.supportGroupCode !== 'SECURITY_OPS') {
      toast.error('Access denied. Security Operations team only.')
      router.push('/')
      return
    }

    // Fetch the antivirus alert service
    fetchAntivirusService()
  }, [session, status, router])

  const fetchAntivirusService = async () => {
    try {
      const response = await fetch('/api/services?name=Antivirus Alert')
      if (response.ok) {
        const data = await response.json()
        const service = data.services?.find((s: any) => s.name === 'Antivirus Alert')
        if (service) {
          setAntivirusService(service)
        } else {
          toast.error('Antivirus Alert service not found. Please run the seed script.')
        }
      }
    } catch (error) {
      console.error('Error fetching service:', error)
      toast.error('Failed to load service configuration')
    }
  }

  const validateForm = () => {
    if (!formData.endpoint.trim()) {
      toast.error('Endpoint/Hostname is required')
      return false
    }
    if (!formData.username.trim()) {
      toast.error('Username is required')
      return false
    }
    if (!formData.ipAddress.trim()) {
      toast.error('IP Address is required')
      return false
    }
    if (!formData.threatType.trim()) {
      toast.error('Threat/Malware Type is required')
      return false
    }
    if (!formData.actionTaken) {
      toast.error('Automatic Action is required')
      return false
    }
    if (formData.actionTaken === 'Other' && !formData.actionOther.trim()) {
      toast.error('Please specify the other action taken')
      return false
    }
    if (!formData.preliminaryAnalysis.trim()) {
      toast.error('Preliminary Analysis is required')
      return false
    }
    if (!formData.followupActions.trim()) {
      toast.error('Required Follow-up Actions is required')
      return false
    }

    // Validate IP address format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(formData.ipAddress)) {
      toast.error('Please enter a valid IP address')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    if (!antivirusService) {
      toast.error('Service configuration not loaded')
      return
    }

    setIsLoading(true)
    try {
      const ticketData = {
        title: `Antivirus Alert - ${formData.threatType}`,
        description: `Detection Date: ${formData.detectionDate}\nEndpoint: ${formData.endpoint}\nUsername: ${formData.username}\nIP Address: ${formData.ipAddress}\nThreat Type: ${formData.threatType}\nSeverity: ${formData.severity}\nAction Taken: ${formData.actionTaken}${formData.actionTaken === 'Other' ? ` (${formData.actionOther})` : ''}\n\nPreliminary Analysis:\n${formData.preliminaryAnalysis}\n\nRequired Follow-up Actions:\n${formData.followupActions}`,
        serviceId: antivirusService.id,
        priority: formData.severity === 'Critical' ? 'URGENT' : formData.severity === 'High' ? 'HIGH' : formData.severity === 'Medium' ? 'MEDIUM' : 'LOW',
        fieldValues: {
          av_detection_date: formData.detectionDate,
          av_endpoint_hostname: formData.endpoint,
          av_username: formData.username,
          av_ip_address: formData.ipAddress,
          av_threat_type: formData.threatType,
          av_severity: formData.severity,
          av_action_taken: formData.actionTaken,
          av_action_other: formData.actionOther || '',
          av_preliminary_analysis: formData.preliminaryAnalysis,
          av_followup_actions: formData.followupActions
        }
      }

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      })

      const result = await response.json()
      
      if (response.ok) {
        toast.success('Antivirus alert ticket created successfully!')
        router.push(`/tickets/${result.id}`)
      } else {
        throw new Error(result.error || 'Failed to create ticket')
      }
    } catch (error: any) {
      console.error('Error creating ticket:', error)
      toast.error(error.message || 'Failed to create ticket')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-cream-100 dark:bg-brown-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-400 dark:border-brown-200"></div>
          <span className="text-brown-700 dark:text-cream-200">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-brown-950">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="Antivirus Alert"
          description="Report and track antivirus/endpoint protection alerts and incidents"
          icon={<Shield className="h-6 w-6" />}
          action={
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="border-brown-400 dark:border-brown-600 text-brown-700 dark:text-brown-200"
            >
              Back to Dashboard
            </Button>
          }
        />

        <Card className="bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200 shadow-lg max-w-4xl mx-auto">
          <CardHeader className="border-b border-cream-500 dark:border-warm-dark-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-xl text-brown-900 dark:text-cream-200">
                    Create Antivirus Alert Ticket
                  </CardTitle>
                  <CardDescription className="text-brown-600 dark:text-cream-400">
                    Report security threats detected by Kaspersky or other antivirus software
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Detection Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brown-900 dark:text-cream-200 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Detection Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="detectionDate" className="text-brown-700 dark:text-cream-300">
                    Detection Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="detectionDate"
                    type="date"
                    value={formData.detectionDate}
                    onChange={(e) => setFormData({...formData, detectionDate: e.target.value})}
                    className="bg-white dark:bg-warm-dark-200 border-cream-500 dark:border-warm-dark-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity" className="text-brown-700 dark:text-cream-300">
                    Severity <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.severity} 
                    onValueChange={(value) => setFormData({...formData, severity: value})}
                  >
                    <SelectTrigger className="bg-white dark:bg-warm-dark-200 border-cream-500 dark:border-warm-dark-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Endpoint Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brown-900 dark:text-cream-200 flex items-center gap-2">
                <Server className="h-5 w-5" />
                Endpoint Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endpoint" className="text-brown-700 dark:text-cream-300">
                    Endpoint / Hostname <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endpoint"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                    placeholder="e.g., DESKTOP-ABC123 or server01.banksulutgo.co.id"
                    className="bg-white dark:bg-warm-dark-200 border-cream-500 dark:border-warm-dark-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-brown-700 dark:text-cream-300">
                    Username <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    placeholder="e.g., john.doe or domain\\username"
                    className="bg-white dark:bg-warm-dark-200 border-cream-500 dark:border-warm-dark-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ipAddress" className="text-brown-700 dark:text-cream-300">
                    IP Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ipAddress"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({...formData, ipAddress: e.target.value})}
                    placeholder="e.g., 192.168.1.100"
                    className="bg-white dark:bg-warm-dark-200 border-cream-500 dark:border-warm-dark-100"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Threat Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brown-900 dark:text-cream-200 flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Threat Information
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="threatType" className="text-brown-700 dark:text-cream-300">
                    Threat/Malware Type <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="threatType"
                    value={formData.threatType}
                    onChange={(e) => setFormData({...formData, threatType: e.target.value})}
                    placeholder="e.g., Trojan.Win32.Generic, Ransomware, Adware"
                    className="bg-white dark:bg-warm-dark-200 border-cream-500 dark:border-warm-dark-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actionTaken" className="text-brown-700 dark:text-cream-300">
                    Automatic Action by Kaspersky <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.actionTaken} 
                    onValueChange={(value) => setFormData({...formData, actionTaken: value})}
                  >
                    <SelectTrigger className="bg-white dark:bg-warm-dark-200 border-cream-500 dark:border-warm-dark-100">
                      <SelectValue placeholder="Select action taken" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                      <SelectItem value="Quarantined">Quarantined</SelectItem>
                      <SelectItem value="Deleted">Deleted</SelectItem>
                      <SelectItem value="No Action Taken">No Action Taken</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.actionTaken === 'Other' && (
                  <div className="space-y-2">
                    <Label htmlFor="actionOther" className="text-brown-700 dark:text-cream-300">
                      Other Action (please specify) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="actionOther"
                      value={formData.actionOther}
                      onChange={(e) => setFormData({...formData, actionOther: e.target.value})}
                      placeholder="Specify the action taken"
                      className="bg-white dark:bg-warm-dark-200 border-cream-500 dark:border-warm-dark-100"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Analysis */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brown-900 dark:text-cream-200 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Analysis & Follow-up
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preliminaryAnalysis" className="text-brown-700 dark:text-cream-300">
                    Preliminary Analysis <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="preliminaryAnalysis"
                    value={formData.preliminaryAnalysis}
                    onChange={(e) => setFormData({...formData, preliminaryAnalysis: e.target.value})}
                    placeholder="Provide initial analysis of the threat detection..."
                    rows={4}
                    className="bg-white dark:bg-warm-dark-200 border-cream-500 dark:border-warm-dark-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="followupActions" className="text-brown-700 dark:text-cream-300">
                    Required Follow-up Actions <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="followupActions"
                    value={formData.followupActions}
                    onChange={(e) => setFormData({...formData, followupActions: e.target.value})}
                    placeholder="List required follow-up actions..."
                    rows={4}
                    className="bg-white dark:bg-warm-dark-200 border-cream-500 dark:border-warm-dark-100"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4 border-t border-cream-500 dark:border-warm-dark-200">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="border-brown-400 dark:border-brown-600 text-brown-700 dark:text-brown-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !antivirusService}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg"
              >
                {isLoading ? 'Creating...' : 'Create Alert Ticket'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}