'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string;
  helpText?: string;
  supportGroup: string;
  priority: string;
  estimatedHours?: number;
  slaHours: number;
  requiresApproval: boolean;
  isConfidential: boolean;
  defaultTitle?: string;
  defaultItilCategory?: string;
  defaultIssueClassification?: string;
  tier1CategoryId?: string;
  tier2SubcategoryId?: string;
  tier3ItemId?: string;
  fields: any[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  description?: string;
  items: Item[];
}

interface Item {
  id: string;
  name: string;
  description?: string;
}

interface AttachmentFile {
  file: File;
  preview: string;
}

const TICKET_CATEGORIES = [
  { value: 'INCIDENT', label: 'Incident', description: 'Unplanned interruption or reduction in quality of service' },
  { value: 'SERVICE_REQUEST', label: 'Service Request', description: 'Request for information, advice, or standard change' },
  { value: 'CHANGE_REQUEST', label: 'Change Request', description: 'Request to add, modify, or remove service components' },
  { value: 'EVENT_REQUEST', label: 'Event Request', description: 'Automated system-generated request' },
];

const ISSUE_CLASSIFICATIONS = [
  { value: 'HUMAN_ERROR', label: 'Human Error', description: 'Wrong password, incorrect data input, accidental deletion' },
  { value: 'SYSTEM_ERROR', label: 'System Error', description: 'Application crash, service timeout, database failure' },
  { value: 'HARDWARE_FAILURE', label: 'Hardware Failure', description: 'Hard disk failure, power supply damage, card reader jam' },
  { value: 'NETWORK_ISSUE', label: 'Network Issue', description: 'Connection timeout, slow response, DNS failure' },
  { value: 'SECURITY_INCIDENT', label: 'Security Incident', description: 'Suspicious login, malware detection, unauthorized access' },
  { value: 'DATA_ISSUE', label: 'Data Issue', description: 'Data corruption, missing records, synchronization failure' },
  { value: 'PROCESS_GAP', label: 'Process Gap', description: 'Missing SOP, unclear instructions, workflow bottleneck' },
  { value: 'EXTERNAL_FACTOR', label: 'External Factor', description: 'ISP outage, vendor system down, power failure' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

export default function CreateEnhancedTicketPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    serviceId: '',
    category: 'INCIDENT',
    issueClassification: '',
    priority: 'MEDIUM',
    tier1CategoryId: '',
    tier2SubcategoryId: '',
    tier3ItemId: '',
  });

  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find(s => s.id === serviceId);
    if (selectedService) {
      setFormData(prev => ({
        ...prev,
        serviceId,
        title: selectedService.defaultTitle || prev.title,
        category: selectedService.defaultItilCategory || prev.category,
        issueClassification: selectedService.defaultIssueClassification || prev.issueClassification,
        priority: selectedService.priority || prev.priority,
        tier1CategoryId: selectedService.tier1CategoryId || '',
        tier2SubcategoryId: selectedService.tier2SubcategoryId || '',
        tier3ItemId: selectedService.tier3ItemId || '',
      }));
    } else {
      setFormData(prev => ({ ...prev, serviceId }));
    }
  };

  const selectedCategory = categories.find(c => c.id === formData.tier1CategoryId);
  const selectedSubcategory = selectedCategory?.subcategories.find(s => s.id === formData.tier2SubcategoryId);

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/tier-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachments(prev => [...prev, {
          file,
          preview: e.target?.result as string
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert attachments to base64
      const attachmentData = await Promise.all(
        attachments.map(async (attachment) => {
          const base64 = attachment.preview.split(',')[1];
          return {
            filename: attachment.file.name,
            mimeType: attachment.file.type,
            size: attachment.file.size,
            content: base64
          };
        })
      );

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          attachments: attachmentData
        }),
      });

      if (response.ok) {
        const ticket = await response.json();
        toast.success('Ticket created successfully!');
        router.push(`/tickets/${ticket.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Create Enhanced Ticket</h1>
          <p className="text-muted-foreground mt-2">
            Create a new ticket with ITIL-based categorization and enhanced features
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Essential ticket details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Brief description of the issue"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detailed description of the issue"
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="service">Service *</Label>
                    <Select
                      value={formData.serviceId}
                      onValueChange={handleServiceChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ITIL Classification</CardTitle>
                  <CardDescription>Categorize according to ITIL standards</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="category">Ticket Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div>
                              <div className="font-medium">{cat.label}</div>
                              <div className="text-sm text-muted-foreground">{cat.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="issueClassification">Issue Classification</Label>
                    <Select
                      value={formData.issueClassification}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, issueClassification: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select issue classification" />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_CLASSIFICATIONS.map((classification) => (
                          <SelectItem key={classification.value} value={classification.value}>
                            <div>
                              <div className="font-medium">{classification.label}</div>
                              <div className="text-sm text-muted-foreground">{classification.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            <div className="flex items-center gap-2">
                              <Badge className={priority.color}>{priority.label}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>3-Tier Categorization</CardTitle>
                  <CardDescription>Hierarchical categorization structure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="tier1">Category (Tier 1)</Label>
                    <Select
                      value={formData.tier1CategoryId}
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        tier1CategoryId: value,
                        tier2SubcategoryId: '',
                        tier3ItemId: ''
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tier2">Subcategory (Tier 2)</Label>
                    <Select
                      value={formData.tier2SubcategoryId}
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        tier2SubcategoryId: value,
                        tier3ItemId: ''
                      }))}
                      disabled={!selectedCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedCategory?.subcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tier3">Item (Tier 3)</Label>
                    <Select
                      value={formData.tier3ItemId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, tier3ItemId: value }))}
                      disabled={!selectedSubcategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedSubcategory?.items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attachments</CardTitle>
                  <CardDescription>Upload supporting files (max 10MB each)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <Label htmlFor="file-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Click to upload files
                          </span>
                          <Input
                            id="file-upload"
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
                          />
                        </Label>
                      </div>
                    </div>

                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        {attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              {getFileIcon(attachment.file.type)}
                              <span className="text-sm font-medium">{attachment.file.name}</span>
                              <span className="text-xs text-gray-500">
                                ({(attachment.file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}