'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Send, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Service {
  id: string
  name: string
  description: string
  priority: string
  slaHours: number
}

interface Branch {
  id: string
  name: string
  code: string
}

export default function SimpleCreateTicketPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    serviceId: '',
    branchId: '',
    priority: 'MEDIUM'
  })

  useEffect(() => {
    fetchServices()
    fetchBranches()
  }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches')
      if (response.ok) {
        const data = await response.json()
        // API returns array directly, not wrapped in { branches: [...] }
        setBranches(Array.isArray(data) ? data : [])
        console.log('Loaded branches:', Array.isArray(data) ? data.length : 0)
      } else {
        console.error('Failed to fetch branches:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !formData.serviceId) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          serviceId: formData.serviceId,
          branchId: formData.branchId || session?.user?.branchId,
          priority: formData.priority,
          category: 'INCIDENT'
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Ticket created successfully!')
        router.push(`/tickets/${result.ticket.id}`)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast.error('Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Required</h2>
            <p className="text-muted-foreground">Please sign in to create tickets.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/80">
        <div className="w-full px-responsive">
          <div className="flex items-center py-6 gap-4">
            <Link href="/tickets/simple">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-responsive-2xl font-bold text-foreground">Create New Ticket</h1>
              <p className="text-responsive-sm text-muted-foreground mt-1">
                Submit a new service request or report an issue
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-responsive py-8">
        <Card className="max-w-4xl mx-auto border-border/50 shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Send className="h-5 w-5 text-primary" />
              </div>
              Ticket Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-medium text-foreground">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Brief description of your issue or request"
                  className="h-12"
                  required
                />
              </div>

              {/* Service */}
              <div className="space-y-2">
                <Label htmlFor="service" className="text-base font-medium text-foreground">
                  Service Type <span className="text-destructive">*</span>
                </Label>
                <select
                  id="service"
                  value={formData.serviceId}
                  onChange={(e) => handleInputChange('serviceId', e.target.value)}
                  className="mt-2 w-full h-12 px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  required
                >
                  <option value="">Select a service...</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-base font-medium text-foreground">
                  Priority Level
                </Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="mt-2 w-full h-12 px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                >
                  <option value="LOW">Low - General inquiry or minor issue</option>
                  <option value="MEDIUM">Medium - Standard service request</option>
                  <option value="HIGH">High - Business impact or urgent need</option>
                  <option value="CRITICAL">Critical - System down or security issue</option>
                </select>
              </div>

              {/* Branch (if user has admin/manager role) */}
              {(['ADMIN', 'MANAGER'].includes(session?.user?.role || '') && branches.length > 0) && (
                <div className="space-y-2">
                  <Label htmlFor="branch" className="text-base font-medium text-foreground">
                    Branch
                  </Label>
                  <select
                    id="branch"
                    value={formData.branchId}
                    onChange={(e) => handleInputChange('branchId', e.target.value)}
                    className="mt-2 w-full h-12 px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  >
                    <option value="">Use my default branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-medium text-foreground">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Please provide detailed information about your issue or request..."
                  className="mt-2 min-h-[160px] resize-none"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Include steps to reproduce the issue, error messages, and any relevant details
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border">
                <Button
                  type="submit"
                  loading={loading}
                  disabled={loading}
                  size="lg"
                  className="flex-1 sm:flex-none"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Create Ticket
                </Button>
                <Link href="/tickets/simple" className="flex-1 sm:flex-none">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </Link>
              </div>

              {/* Help Text */}
              <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-info-foreground">
                    <p className="font-semibold mb-1 text-foreground">Need help?</p>
                    <p className="text-muted-foreground">
                      For urgent issues, contact IT support directly. For general questions,
                      provide as much detail as possible to help us resolve your request quickly.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}