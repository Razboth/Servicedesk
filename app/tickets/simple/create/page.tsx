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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Required</h2>
          <p className="text-gray-600">Please sign in to create tickets.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card shadow-sm border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/tickets/simple">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tickets
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Ticket</h1>
              <p className="text-gray-600 mt-1">
                Submit a new service request or report an issue
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="h-5 w-5 mr-2" />
              Ticket Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-base font-medium">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Brief description of your issue or request"
                  className="mt-2"
                  required
                />
              </div>

              {/* Service */}
              <div>
                <Label htmlFor="service" className="text-base font-medium">
                  Service Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="service"
                  value={formData.serviceId}
                  onChange={(e) => handleInputChange('serviceId', e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div>
                <Label htmlFor="priority" className="text-base font-medium">
                  Priority Level
                </Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Low - General inquiry or minor issue</option>
                  <option value="MEDIUM">Medium - Standard service request</option>
                  <option value="HIGH">High - Business impact or urgent need</option>
                  <option value="CRITICAL">Critical - System down or security issue</option>
                </select>
              </div>

              {/* Branch (if user has admin/manager role) */}
              {(['ADMIN', 'MANAGER'].includes(session?.user?.role || '') && branches.length > 0) && (
                <div>
                  <Label htmlFor="branch" className="text-base font-medium">
                    Branch
                  </Label>
                  <select
                    id="branch"
                    value={formData.branchId}
                    onChange={(e) => handleInputChange('branchId', e.target.value)}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div>
                <Label htmlFor="description" className="text-base font-medium">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Please provide detailed information about your issue or request..."
                  className="mt-2 min-h-[120px]"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Include steps to reproduce the issue, error messages, and any relevant details
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create Ticket
                    </>
                  )}
                </Button>
                <Link href="/tickets/simple">
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </Link>
              </div>

              {/* Help Text */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 mt-6">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-emerald-700">
                    <p className="font-medium mb-1">Need help?</p>
                    <p>
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