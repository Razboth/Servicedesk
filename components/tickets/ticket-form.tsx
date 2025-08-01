'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, ChevronRight, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string;
  category: {
    id: string;
    name: string;
    level: number;
  };
  fields: ServiceField[];
  priority: string;
  estimatedHours: number;
  requiresApproval: boolean;
}

interface ServiceField {
  id: string;
  name: string;
  label: string;
  type: string;
  isRequired: boolean;
  isUserVisible: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  options?: any;
  validation?: any;
}

interface Category {
  id: string;
  name: string;
  level: number;
  children?: Category[];
  _count: {
    services: number;
    children: number;
  };
}



const ticketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  serviceId: z.string().min(1, 'Service selection is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  category: z.enum(['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST']).default('INCIDENT'),
  issueClassification: z.enum(['HUMAN_ERROR', 'SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE', 'SECURITY_INCIDENT', 'DATA_ISSUE', 'PROCESS_GAP', 'EXTERNAL_FACTOR']).optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  itemId: z.string().optional(),
  fieldValues: z.record(z.string()).optional()
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface TicketFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TicketForm({ onSuccess, onCancel }: TicketFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    clearErrors,
    trigger,
    setError
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      priority: 'MEDIUM',
      category: 'INCIDENT'
    }
  });

  const watchedServiceId = watch('serviceId');

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load services when category changes
  useEffect(() => {
    if (selectedCategory) {
      loadServices(selectedCategory);
    } else {
      setServices([]);
    }
  }, [selectedCategory]);

  // Update selected service when serviceId changes
  useEffect(() => {
    if (watchedServiceId) {
      const service = services.find(s => s.id === watchedServiceId);
      setSelectedService(service || null);
      if (service) {
        setValue('priority', service.priority as any);
      }
    } else {
      setSelectedService(null);
    }
  }, [watchedServiceId, services, setValue]);

  // Clear field validation errors when service changes
  useEffect(() => {
    clearErrors('fieldValues');
  }, [selectedService, clearErrors]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/categories?level=1&includeChildren=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load service categories');
    } finally {
      setIsLoading(false);
    }
  };

  const loadServices = async (categoryId: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ categoryId });
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await fetch(`/api/services?${params}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles: File[] = [];
    
    for (const file of files) {
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }
      validFiles.push(file);
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
    // Reset the input
    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 content
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const onSubmit = async (data: TicketFormData) => {
    try {
      setIsSubmitting(true);
      
      // Debug: Log form data
      console.log('Form submission data:', data);
      console.log('Selected service:', selectedService);
      
      // Validate required dynamic fields
      if (selectedService) {
        const requiredFields = selectedService.fields.filter(field => field.isUserVisible && field.isRequired);
        let hasValidationErrors = false;
        
        console.log('Required fields:', requiredFields);
        
        for (const field of requiredFields) {
          const value = data.fieldValues?.[field.name];
          console.log(`Field ${field.name}: value = "${value}"`);
          if (!value || value.trim() === '') {
            setError(`fieldValues.${field.name}` as any, {
              type: 'required',
              message: `${field.label} is required`
            });
            hasValidationErrors = true;
          }
        }
        
        if (hasValidationErrors) {
          console.log('Validation errors found, stopping submission');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Collect dynamic field values
      const fieldValues: Array<{ fieldId: string; value: string }> = [];
      if (selectedService && data.fieldValues) {
        selectedService.fields
          .filter(field => field.isUserVisible)
          .forEach(field => {
            const value = data.fieldValues?.[field.name];
            if (value) {
              fieldValues.push({ fieldId: field.id, value });
            }
          });
      }

      // Process attachments
      const processedAttachments = [];
      for (const file of attachments) {
        try {
          const base64Content = await convertFileToBase64(file);
          processedAttachments.push({
            filename: file.name,
            contentType: file.type,
            size: file.size,
            content: base64Content
          });
        } catch (error) {
          console.error('Error processing file:', file.name, error);
          toast.error(`Failed to process file: ${file.name}`);
        }
      }

      const payload = {
        title: data.title,
        description: data.description,
        serviceId: data.serviceId,
        priority: data.priority,
        category: data.category,
        issueClassification: data.issueClassification,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        itemId: data.itemId,
        fieldValues: fieldValues.length > 0 ? fieldValues : undefined,
        attachments: processedAttachments.length > 0 ? processedAttachments : undefined
      };

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const ticket = await response.json();
        toast.success(`Ticket ${ticket.ticketNumber} created successfully`);
        onSuccess?.();
        router.push('/tickets');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDynamicField = (field: ServiceField) => {
    const fieldName = `fieldValues.${field.name}`;
    const isRequired = field.isRequired;

    switch (field.type) {
      case 'TEXT':
      case 'EMAIL':
      case 'URL':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type.toLowerCase()}
              placeholder={field.placeholder}
              {...register(fieldName as any, { required: isRequired })}
            />
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            {errors.fieldValues?.[field.name] && (
              <p className="text-sm text-red-500">{errors.fieldValues[field.name]?.message}</p>
            )}
          </div>
        );

      case 'TEXTAREA':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              {...register(fieldName as any, { required: isRequired })}
            />
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            {errors.fieldValues?.[field.name] && (
              <p className="text-sm text-red-500">{errors.fieldValues[field.name]?.message}</p>
            )}
          </div>
        );

      case 'SELECT':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select onValueChange={(value: string) => setValue(fieldName as any, value)}>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            {errors.fieldValues?.[field.name] && (
              <p className="text-sm text-red-500">{errors.fieldValues[field.name]?.message}</p>
            )}
          </div>
        );

      case 'NUMBER':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              placeholder={field.placeholder}
              {...register(fieldName as any, { 
                required: isRequired,
                valueAsNumber: true
              })}
            />
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            {errors.fieldValues?.[field.name] && (
              <p className="text-sm text-red-500">{errors.fieldValues[field.name]?.message}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Service</CardTitle>
          <CardDescription>
            Choose the service you need help with to create your ticket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedCategory === category.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setValue('serviceId', '');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-gray-500">
                        {category._count.services} services
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Services */}
          {selectedCategory && (
            <div className="space-y-2">
              <h3 className="font-medium">Available Services</h3>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="grid gap-2">
                  {services.map((service) => (
                    <Card
                      key={service.id}
                      className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                        watchedServiceId === service.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setValue('serviceId', service.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{service.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {service.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">
                                {service.priority}
                              </Badge>
                              <Badge variant="outline">
                                ~{service.estimatedHours}h
                              </Badge>
                              {service.requiresApproval && (
                                <Badge variant="outline">Requires Approval</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          {errors.serviceId && (
            <p className="text-sm text-red-500 mt-2">{errors.serviceId.message}</p>
          )}
          {/* Hidden input to register serviceId with react-hook-form */}
          <input type="hidden" {...register('serviceId')} />
        </CardContent>
      </Card>

      {/* Ticket Form */}
      {selectedService && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
              <CardDescription>
                Provide details about your request for: {selectedService.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Brief description of your request"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Detailed description of your request or issue"
                  rows={4}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* Dynamic Fields */}
              {selectedService.fields
                .filter(field => field.isUserVisible)
                .map(renderDynamicField)}

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={watch('priority')}
                  onValueChange={(value: string) => setValue('priority', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ITIL Category */}
               <div className="space-y-2">
                 <Label htmlFor="category">
                   ITIL Category <span className="text-red-500">*</span>
                 </Label>
                 <Select
                   value={watch('category')}
                   onValueChange={(value: string) => setValue('category', value as any)}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="INCIDENT">Incident</SelectItem>
                     <SelectItem value="SERVICE_REQUEST">Service Request</SelectItem>
                     <SelectItem value="CHANGE_REQUEST">Change Request</SelectItem>
                     <SelectItem value="EVENT_REQUEST">Event Request</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

              {/* Issue Classification */}
               <div className="space-y-2">
                 <Label htmlFor="issueClassification">
                   Issue Classification
                 </Label>
                 <Select
                   value={watch('issueClassification') || ''}
                   onValueChange={(value: string) => setValue('issueClassification', value as any)}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select classification (optional)" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="HUMAN_ERROR">Human Error</SelectItem>
                     <SelectItem value="SYSTEM_ERROR">System Error</SelectItem>
                     <SelectItem value="HARDWARE_FAILURE">Hardware Failure</SelectItem>
                     <SelectItem value="NETWORK_ISSUE">Network Issue</SelectItem>
                     <SelectItem value="SECURITY_INCIDENT">Security Incident</SelectItem>
                     <SelectItem value="DATA_ISSUE">Data Issue</SelectItem>
                     <SelectItem value="PROCESS_GAP">Process Gap</SelectItem>
                     <SelectItem value="EXTERNAL_FACTOR">External Factor</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

              {/* 3-Tier Categorization */}
               <div className="space-y-4">
                 <h4 className="font-medium text-sm">3-Tier Categorization</h4>
                 
                 {/* Category */}
                 <div className="space-y-2">
                   <Label htmlFor="categoryId">
                     Category
                   </Label>
                   <Select
                     value={watch('categoryId') || ''}
                     onValueChange={(value: string) => {
                       setValue('categoryId', value);
                       setValue('subcategoryId', '');
                       setValue('itemId', '');
                     }}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select category (optional)" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="hardware">Hardware</SelectItem>
                       <SelectItem value="software">Software</SelectItem>
                       <SelectItem value="network">Network</SelectItem>
                       <SelectItem value="security">Security</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
 
                 {/* Subcategory */}
                 <div className="space-y-2">
                   <Label htmlFor="subcategoryId">Subcategory</Label>
                   <Select
                     value={watch('subcategoryId') || ''}
                     onValueChange={(value: string) => {
                       setValue('subcategoryId', value);
                       setValue('itemId', '');
                     }}
                     disabled={!watch('categoryId')}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select subcategory (optional)" />
                     </SelectTrigger>
                     <SelectContent>
                       {watch('categoryId') === 'hardware' && (
                         <>
                           <SelectItem value="computer">Computer</SelectItem>
                           <SelectItem value="printer">Printer</SelectItem>
                           <SelectItem value="mobile">Mobile Device</SelectItem>
                         </>
                       )}
                       {watch('categoryId') === 'software' && (
                         <>
                           <SelectItem value="application">Application</SelectItem>
                           <SelectItem value="os">Operating System</SelectItem>
                           <SelectItem value="utility">Utility</SelectItem>
                         </>
                       )}
                       {watch('categoryId') === 'network' && (
                         <>
                           <SelectItem value="connectivity">Connectivity</SelectItem>
                           <SelectItem value="vpn">VPN</SelectItem>
                           <SelectItem value="wifi">WiFi</SelectItem>
                         </>
                       )}
                       {watch('categoryId') === 'security' && (
                         <>
                           <SelectItem value="access_control">Access Control</SelectItem>
                           <SelectItem value="malware">Malware</SelectItem>
                           <SelectItem value="data_protection">Data Protection</SelectItem>
                         </>
                       )}
                     </SelectContent>
                   </Select>
                 </div>
 
                 {/* Item */}
                 <div className="space-y-2">
                   <Label htmlFor="itemId">Item</Label>
                   <Select
                     value={watch('itemId') || ''}
                     onValueChange={(value: string) => setValue('itemId', value)}
                     disabled={!watch('subcategoryId')}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select item (optional)" />
                     </SelectTrigger>
                     <SelectContent>
                       {watch('subcategoryId') === 'computer' && (
                         <>
                           <SelectItem value="desktop_pc">Desktop PC</SelectItem>
                           <SelectItem value="laptop">Laptop</SelectItem>
                           <SelectItem value="monitor">Monitor</SelectItem>
                         </>
                       )}
                       {watch('subcategoryId') === 'application' && (
                         <>
                           <SelectItem value="core_banking">Core Banking System</SelectItem>
                           <SelectItem value="email_client">Email Client</SelectItem>
                           <SelectItem value="office_suite">Office Suite</SelectItem>
                         </>
                       )}
                       {watch('subcategoryId') === 'access_control' && (
                         <>
                           <SelectItem value="user_account">User Account</SelectItem>
                           <SelectItem value="permissions">Permissions</SelectItem>
                           <SelectItem value="password_reset">Password Reset</SelectItem>
                         </>
                       )}
                     </SelectContent>
                   </Select>
                 </div>
               </div>

              {/* Attachments */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Attachments</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Click to upload files or drag and drop
                      </span>
                      <span className="text-xs text-gray-500">
                        Maximum file size: 10MB
                      </span>
                    </label>
                  </div>
                </div>

                {/* Attachment List */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Files ({attachments.length})</Label>
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Upload className="h-4 w-4 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Ticket'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}