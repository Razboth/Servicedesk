'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
  fieldTemplates?: ServiceFieldTemplate[];
  priority: string;
  estimatedHours: number;
  requiresApproval: boolean;
  tier1CategoryId?: string;
  tier2SubcategoryId?: string;
  tier3ItemId?: string;
  defaultTitle?: string;
  defaultItilCategory?: string;
  defaultIssueClassification?: string;
}

interface ServiceFieldTemplate {
  id: string;
  order: number;
  isRequired?: boolean;
  isUserVisible: boolean;
  helpText?: string;
  defaultValue?: string;
  fieldTemplate: {
    id: string;
    name: string;
    label: string;
    type: string;
    placeholder?: string;
    options?: any;
    validation?: any;
    category?: string;
  };
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

interface TierCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
}

interface TierSubcategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
}

interface TierItem {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
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
  fieldValues: z.record(z.union([z.string(), z.number(), z.array(z.string())])).optional(),
  // Security fields
  isConfidential: z.boolean().default(false),
  securityClassification: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  securityFindings: z.string().optional() // Text area for SOC findings
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isAutofilling, setIsAutofilling] = useState(false);
  
  // 3-tier categorization state
  const [tierCategories, setTierCategories] = useState<TierCategory[]>([]);
  const [tierSubcategories, setTierSubcategories] = useState<TierSubcategory[]>([]);
  const [tierItems, setTierItems] = useState<TierItem[]>([]);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
    clearErrors,
    trigger,
    setError
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      priority: 'MEDIUM',
      category: 'INCIDENT',
      fieldValues: {}
    }
  });

  const watchedServiceId = watch('serviceId');
  const watchedCategoryId = watch('categoryId');
  const watchedSubcategoryId = watch('subcategoryId');
  const watchedItemId = watch('itemId');

  // Load categories on mount
  useEffect(() => {
    loadCategories();
    loadTierCategories();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load services when category or debounced search term changes
  useEffect(() => {
    if (selectedCategory || debouncedSearchTerm) {
      loadServices(selectedCategory);
    } else {
      setServices([]);
    }
  }, [selectedCategory, debouncedSearchTerm]);

  // Update selected service when serviceId changes
  useEffect(() => {
    const autofillServiceData = async () => {
      if (watchedServiceId) {
        console.log('🔍 Autofill Debug: Starting autofill for serviceId:', watchedServiceId);
        const service = services.find(s => s.id === watchedServiceId);
        
        // Skip if service is not found and services array is empty (still loading)
        if (!service && services.length === 0) {
          console.log('🔍 Autofill Debug: Services still loading, skipping autofill');
          return;
        }
        
        console.log('🔍 Autofill Debug: Found service:', service);
        console.log('🔍 Autofill Debug: Service tier data:', {
          tier1CategoryId: service?.tier1CategoryId,
          tier2SubcategoryId: service?.tier2SubcategoryId,
          tier3ItemId: service?.tier3ItemId
        });
        console.log('🔍 Autofill Debug: Full service data (stringified):', JSON.stringify(service, null, 2));
        setSelectedService(service || null);
        if (service) {
          setIsAutofilling(true);
          
          // Initialize all field values for the new service to prevent controlled/uncontrolled issues
          const allFields = [
            ...(service.fields || []),
            ...(service.fieldTemplates || []).map(template => template.fieldTemplate)
          ].filter(field => field && (field.isUserVisible || 
            (service.fieldTemplates && service.fieldTemplates.some(t => t.fieldTemplate.id === field.id && t.isUserVisible))));
          
          // Initialize all field paths with empty strings to prevent controlled/uncontrolled issues
          allFields.forEach(field => {
            const currentValue = watch(`fieldValues.${field.name}`);
            if (currentValue === undefined) {
              setValue(`fieldValues.${field.name}`, '');
            }
          });
          
          // Prepare form data with service defaults
          const formData: Partial<TicketFormData> = {
            serviceId: watchedServiceId,
            priority: service.priority as any,
            category: 'INCIDENT' // Keep default
          };
          
          console.log('🔍 Autofill Debug: Initial form data:', formData);
          
          // Add optional fields if they exist
          if (service.defaultTitle) {
            formData.title = service.defaultTitle;
            console.log('🔍 Autofill Debug: Added default title:', service.defaultTitle);
          }
          if (service.defaultItilCategory) {
            formData.category = service.defaultItilCategory as any;
            console.log('🔍 Autofill Debug: Added default ITIL category:', service.defaultItilCategory);
          }
          if (service.defaultIssueClassification) {
            formData.issueClassification = service.defaultIssueClassification as any;
            console.log('🔍 Autofill Debug: Added default issue classification:', service.defaultIssueClassification);
          }
          
          // Handle service field default values
          const fieldValues: Record<string, string> = {};
          
          // Regular fields
          if (service.fields && service.fields.length > 0) {
            service.fields
              .filter(field => field.isUserVisible && field.defaultValue)
              .forEach(field => {
                fieldValues[field.name] = field.defaultValue!;
                console.log('🔍 Autofill Debug: Added field default value:', field.name, '=', field.defaultValue);
              });
          }
          
          // Field templates
          if (service.fieldTemplates && service.fieldTemplates.length > 0) {
            service.fieldTemplates
              .filter(template => template.isUserVisible)
              .forEach(template => {
                const defaultValue = template.defaultValue || template.fieldTemplate.defaultValue || '';
                if (defaultValue) {
                  fieldValues[template.fieldTemplate.name] = defaultValue;
                  console.log('🔍 Autofill Debug: Added field template default value:', template.fieldTemplate.name, '=', defaultValue);
                }
              });
          }
          
          if (Object.keys(fieldValues).length > 0) {
            formData.fieldValues = fieldValues;
            console.log('🔍 Autofill Debug: All field values to autofill:', fieldValues);
          }
          
          // Handle 3-tier categorization with proper async loading
          let loadedSubcategories: any[] = [];
          let loadedItems: any[] = [];
          
          if (service.tier1CategoryId) {
            console.log('🔍 Autofill Debug: Setting tier1CategoryId:', service.tier1CategoryId);
            formData.categoryId = service.tier1CategoryId;
            
            // Load subcategories and wait for completion
            console.log('🔍 Autofill Debug: Loading subcategories for categoryId:', service.tier1CategoryId);
            loadedSubcategories = await loadTierSubcategories(service.tier1CategoryId);
            console.log('🔍 Autofill Debug: Subcategories loaded, current count:', loadedSubcategories.length);
            
            if (service.tier2SubcategoryId) {
              console.log('🔍 Autofill Debug: Setting tier2SubcategoryId:', service.tier2SubcategoryId);
              formData.subcategoryId = service.tier2SubcategoryId;
              
              // Load items and wait for completion
              console.log('🔍 Autofill Debug: Loading items for subcategoryId:', service.tier2SubcategoryId);
              loadedItems = await loadTierItems(service.tier2SubcategoryId);
              console.log('🔍 Autofill Debug: Items loaded, current count:', loadedItems.length);
              
              if (service.tier3ItemId) {
                console.log('🔍 Autofill Debug: Setting tier3ItemId:', service.tier3ItemId);
                console.log('🔍 Autofill Debug: Checking if tier3ItemId exists in loaded items:', 
                  loadedItems.some(item => item.id === service.tier3ItemId));
                formData.itemId = service.tier3ItemId;
                // Also set as pending in case items haven't loaded in state yet
                setPendingItemId(service.tier3ItemId);
              }
            }
          }
          
          console.log('🔍 Autofill Debug: Final form data before setting values:', formData);
          
          // Instead of using reset(), set values individually to preserve field registration
          Object.entries(formData).forEach(([key, value]) => {
            if (key !== 'fieldValues') {
              setValue(key as any, value);
              console.log(`🔍 Autofill Debug: Set ${key} = ${value}`);
            }
          });
          
          // Set field values individually to preserve input control
          if (formData.fieldValues && Object.keys(formData.fieldValues).length > 0) {
            console.log('🔍 Autofill Debug: Setting field values individually');
            Object.entries(formData.fieldValues).forEach(([fieldName, value]) => {
              setValue(`fieldValues.${fieldName}`, value);
              console.log(`🔍 Autofill Debug: Set fieldValues.${fieldName} = ${value}`);
            });
          }
          
          // Set tier values directly using the loaded data
          if (formData.categoryId) {
            setValue('categoryId', formData.categoryId);
            console.log('🔍 Autofill Debug: Set categoryId immediately');
            
            if (formData.subcategoryId && loadedSubcategories.length > 0) {
              setValue('subcategoryId', formData.subcategoryId);
              console.log('🔍 Autofill Debug: Set subcategoryId immediately');
              
              if (formData.itemId && loadedItems.length > 0) {
                setValue('itemId', formData.itemId);
                console.log('🔍 Autofill Debug: Set itemId immediately');
              }
            }
          }
          
          // Store loaded data references for debugging
          const loadedSubcategoriesCount = loadedSubcategories.length;
          const loadedItemsCount = loadedItems.length;
          
          // Wait for state updates to complete before finishing autofill
          setTimeout(() => {
            const currentValues = watch();
            console.log('🔍 Autofill Debug: Current form values after reset:', currentValues);
            console.log('🔍 Autofill Debug: categoryId value:', watch('categoryId'));
            console.log('🔍 Autofill Debug: subcategoryId value:', watch('subcategoryId'));
            console.log('🔍 Autofill Debug: itemId value:', watch('itemId'));
            console.log('🔍 Autofill Debug: Loaded subcategories count:', loadedSubcategoriesCount);
            console.log('🔍 Autofill Debug: Loaded items count:', loadedItemsCount);
            console.log('🔍 Autofill Debug: Current tierItems state count:', tierItems.length);
            console.log('🔍 Autofill Debug: Subcategory dropdown should be enabled:', watch('categoryId') && loadedSubcategoriesCount > 0);
            console.log('🔍 Autofill Debug: Item dropdown should be enabled:', watch('subcategoryId') && loadedItemsCount > 0);
            console.log('🔍 Autofill Debug: Item Select value check - formData.itemId:', formData.itemId, 'watched itemId:', watch('itemId'));
            setIsAutofilling(false);
          }, 100);
        }
      } else if (selectedService) {
        console.log('🔍 Autofill Debug: No serviceId, clearing form');
        setSelectedService(null);
        // Clear form fields without disrupting field registration
        setValue('title', '');
        setValue('description', '');
        setValue('priority', 'MEDIUM');
        setValue('category', 'INCIDENT');
        setValue('issueClassification', undefined);
        setValue('categoryId', '');
        setValue('subcategoryId', '');
        setValue('itemId', '');
        // Keep fieldValues registered but clear them properly
        const currentFieldValues = watch('fieldValues') || {};
        Object.keys(currentFieldValues).forEach(fieldName => {
          setValue(`fieldValues.${fieldName}`, '');
        });
      }
    };
    
    autofillServiceData();
  }, [watchedServiceId, services]);

  // Clear field validation errors when service changes
  useEffect(() => {
    clearErrors('fieldValues');
  }, [selectedService, clearErrors]);

  // Debug effect to watch itemId changes
  useEffect(() => {
    console.log('🔍 Item Debug: watchedItemId changed to:', watchedItemId);
    console.log('🔍 Item Debug: Current tierItems count:', tierItems.length);
    console.log('🔍 Item Debug: Is autofilling:', isAutofilling);
    if (watchedItemId && tierItems.length > 0) {
      const itemExists = tierItems.some(item => item.id === watchedItemId);
      console.log('🔍 Item Debug: Item exists in tierItems:', itemExists);
      if (!itemExists) {
        console.log('🔍 Item Debug: WARNING - Selected itemId not found in current tierItems!');
      }
    }
  }, [watchedItemId, tierItems.length, isAutofilling]);

  // Effect to handle tierItems updates and pending itemId
  useEffect(() => {
    if (tierItems.length > 0 && pendingItemId) {
      const itemExists = tierItems.some(item => item.id === pendingItemId);
      console.log('🔍 Item Debug: Checking pending itemId in newly loaded tierItems:', pendingItemId, 'exists:', itemExists);
      if (itemExists && watch('itemId') !== pendingItemId) {
        console.log('🔍 Item Debug: Setting pending itemId now that tierItems are loaded');
        setValue('itemId', pendingItemId);
        setPendingItemId(null);
      }
    }
  }, [tierItems, pendingItemId, setValue]);



  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/categories?level=1&includeChildren=true');
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded categories:', data);
        setCategories(data);
      } else {
        const error = await response.json();
        console.error('Failed to load categories:', response.status, error);
        toast.error(error.error || 'Failed to load categories');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load service categories');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTierCategories = async () => {
    try {
      const response = await fetch('/api/tier-categories');
      if (response.ok) {
        const data = await response.json();
        setTierCategories(data);
      }
    } catch (error) {
      console.error('Failed to load tier categories:', error);
    }
  };

  const loadTierSubcategories = async (categoryId: string) => {
    try {
      console.log('🔍 Debug: Loading subcategories for categoryId:', categoryId);
      const response = await fetch(`/api/subcategories?categoryId=${categoryId}`);
      console.log('🔍 Debug: Subcategories API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Debug: Subcategories data received:', data);
        setTierSubcategories(data);
        setTierItems([]); // Reset items when subcategories change
        console.log('🔍 Debug: Subcategories state updated, count:', data.length);
        return data; // Return the data for immediate use
      }
      return [];
    } catch (error) {
      console.error('Failed to load tier subcategories:', error);
      return [];
    }
  };

  const loadTierItems = async (subcategoryId: string) => {
    try {
      console.log('🔍 Debug: Loading items for subcategoryId:', subcategoryId);
      const response = await fetch(`/api/items?subcategoryId=${subcategoryId}`);
      console.log('🔍 Debug: Items API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Debug: Items data received:', data);
        setTierItems(data);
        console.log('🔍 Debug: Items state updated, count:', data.length);
        
        // Check if we have a pending itemId to set
        if (pendingItemId && data.some((item: TierItem) => item.id === pendingItemId)) {
          console.log('🔍 Debug: Found pending itemId in loaded items, setting value:', pendingItemId);
          setValue('itemId', pendingItemId);
          setPendingItemId(null); // Clear the pending state
        }
        
        return data; // Return the data for immediate use
      }
      return [];
    } catch (error) {
      console.error('Failed to load tier items:', error);
      return [];
    }
  };

  const loadServices = async (categoryId?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (categoryId) {
        params.append('categoryId', categoryId);
      }
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }
      
      const response = await fetch(`/api/services?${params}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded services:', data);
        setServices(data);
      } else {
        const error = await response.json();
        console.error('Failed to load services:', response.status, error);
        toast.error(error.error || 'Failed to load services');
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
      
      // Validate required dynamic fields - Prioritize Field Templates over Regular Fields
      if (selectedService) {
        let hasValidationErrors = false;
        
        if (selectedService.fieldTemplates && selectedService.fieldTemplates.length > 0) {
          // Validate field templates if they exist
          const requiredTemplates = selectedService.fieldTemplates.filter(
            template => template.isUserVisible && template.isRequired
          );
          console.log('Required field templates:', requiredTemplates);
          
          for (const template of requiredTemplates) {
            const value = data.fieldValues?.[template.fieldTemplate.name];
            console.log(`Field template ${template.fieldTemplate.name}: value = "${value}"`);
            
            // Handle validation for different field types
            let isEmpty = false;
            if (Array.isArray(value)) {
              // For MULTISELECT fields, check if array is empty
              isEmpty = value.length === 0;
            } else {
              const stringValue = typeof value === 'string' ? value : String(value || '');
              isEmpty = !value || stringValue.trim() === '';
            }
            
            if (isEmpty) {
              setError(`fieldValues.${template.fieldTemplate.name}` as any, {
                type: 'required',
                message: `${template.fieldTemplate.label} is required`
              });
              hasValidationErrors = true;
            }
          }
        } else {
          // Fallback to validate regular fields if no field templates
          const requiredFields = selectedService.fields && Array.isArray(selectedService.fields) 
            ? selectedService.fields.filter(field => field.isUserVisible && field.isRequired)
            : [];
          console.log('Required fields:', requiredFields);
          
          for (const field of requiredFields) {
            const value = data.fieldValues?.[field.name];
            console.log(`Field ${field.name}: value = "${value}"`);
            
            // Handle validation for different field types
            let isEmpty = false;
            if (Array.isArray(value)) {
              // For MULTISELECT fields, check if array is empty
              isEmpty = value.length === 0;
            } else {
              const stringValue = typeof value === 'string' ? value : String(value || '');
              isEmpty = !value || stringValue.trim() === '';
            }
            
            if (isEmpty) {
              setError(`fieldValues.${field.name}` as any, {
                type: 'required',
                message: `${field.label} is required`
              });
              hasValidationErrors = true;
            }
          }
        }
        
        if (hasValidationErrors) {
          console.log('Validation errors found, stopping submission');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Collect dynamic field values - Prioritize Field Templates over Regular Fields
      const fieldValues: Array<{ fieldId: string; value: string }> = [];
      if (selectedService && data.fieldValues) {
        if (selectedService.fieldTemplates && selectedService.fieldTemplates.length > 0) {
          // Collect values from field templates if they exist
          selectedService.fieldTemplates
            .filter(template => template.isUserVisible)
            .forEach(template => {
              const value = data.fieldValues?.[template.fieldTemplate.name];
              if (value !== undefined && value !== null && value !== '') {
                // Handle different field types
                let stringValue: string;
                if (Array.isArray(value)) {
                  // For MULTISELECT fields, join array values with commas
                  stringValue = value.join(', ');
                } else if (typeof value === 'number') {
                  stringValue = value.toString();
                } else {
                  stringValue = value;
                }
                // For field templates, we need to store the field template ID, not the service field ID
                fieldValues.push({ fieldId: template.fieldTemplate.id, value: stringValue });
              }
            });
        } else {
          // Fallback to collect values from regular service fields if no field templates
          if (selectedService.fields && Array.isArray(selectedService.fields)) {
            selectedService.fields
              .filter(field => field.isUserVisible)
              .forEach(field => {
                const value = data.fieldValues?.[field.name];
                if (value !== undefined && value !== null && value !== '') {
                  // Handle different field types
                  let stringValue: string;
                  if (Array.isArray(value)) {
                    // For MULTISELECT fields, join array values with commas
                    stringValue = value.join(', ');
                  } else if (typeof value === 'number') {
                    stringValue = value.toString();
                  } else {
                    stringValue = value;
                  }
                  fieldValues.push({ fieldId: field.id, value: stringValue });
                }
              });
          }
        }
      }

      // Process attachments
      const processedAttachments = [];
      for (const file of attachments) {
        try {
          const base64Content = await convertFileToBase64(file);
          processedAttachments.push({
            filename: file.name,
            mimeType: file.type,
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
        console.error('Failed to create ticket:', error);
        if (error.details) {
          // Show validation errors
          const errorMessages = error.details.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
          toast.error(`Validation error: ${errorMessages}`);
        } else {
          toast.error(error.error || 'Failed to create ticket');
        }
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFieldTemplate = (template: ServiceFieldTemplate) => {
    const field = template.fieldTemplate;
    const isRequired = template.isRequired ?? false;
    const helpText = template.helpText || field.helpText || '';
    const defaultValue = template.defaultValue || field.defaultValue || '';
    
    // Convert field template to service field format for rendering
    const serviceField: ServiceField = {
      id: field.id,
      name: field.name,
      label: field.label,
      type: field.type as any,
      isRequired,
      isUserVisible: template.isUserVisible,
      placeholder: field.placeholder,
      helpText,
      defaultValue,
      options: field.options,
      validation: field.validation,
      isActive: true
    };
    
    return renderDynamicField(serviceField);
  };

  const renderDynamicField = (field: ServiceField) => {
    const fieldName = `fieldValues.${field.name}`;
    const isRequired = field.isRequired;

    switch (field.type) {
      case 'TEXT':
      case 'EMAIL':
      case 'URL':
      case 'PHONE':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={fieldName as any}
              control={control}
              rules={{ required: isRequired }}
              defaultValue=""
              render={({ field: controllerField }) => (
                <Input
                  id={field.name}
                  type={field.type === 'PHONE' ? 'tel' : field.type.toLowerCase()}
                  placeholder={field.placeholder}
                  {...controllerField}
                  value={controllerField.value || ''}
                />
              )}
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
            <Controller
              name={fieldName as any}
              control={control}
              rules={{ required: isRequired }}
              defaultValue=""
              render={({ field: controllerField }) => (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  {...controllerField}
                  value={controllerField.value || ''}
                />
              )}
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
            <Select 
              value={watch(`fieldValues.${field.name}`) || ''}
              onValueChange={(value: string) => setValue(fieldName as any, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(field.options) ? (
                  // Handle options as array of strings
                  field.options.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))
                ) : field.options && typeof field.options === 'object' ? (
                  // Handle options as array of objects with value/label
                  Object.entries(field.options).map(([value, label]) => (
                    <SelectItem key={value} value={String(value)}>
                      {String(label)}
                    </SelectItem>
                  ))
                ) : null}
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
            <Controller
              name={fieldName as any}
              control={control}
              rules={{ required: isRequired }}
              defaultValue=""
              render={({ field: controllerField }) => (
                <Input
                  id={field.name}
                  type="number"
                  placeholder={field.placeholder}
                  {...controllerField}
                  value={controllerField.value || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : Number(e.target.value);
                    controllerField.onChange(value);
                  }}
                />
              )}
            />
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            {errors.fieldValues?.[field.name] && (
              <p className="text-sm text-red-500">{errors.fieldValues[field.name]?.message}</p>
            )}
          </div>
        );

      case 'DATE':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={fieldName as any}
              control={control}
              rules={{ required: isRequired }}
              defaultValue=""
              render={({ field: controllerField }) => (
                <Input
                  id={field.name}
                  type="date"
                  placeholder={field.placeholder}
                  {...controllerField}
                  value={controllerField.value || ''}
                />
              )}
            />
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            {errors.fieldValues?.[field.name] && (
              <p className="text-sm text-red-500">{errors.fieldValues[field.name]?.message}</p>
            )}
          </div>
        );

      case 'DATETIME':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={fieldName as any}
              control={control}
              rules={{ required: isRequired }}
              defaultValue=""
              render={({ field: controllerField }) => (
                <Input
                  id={field.name}
                  type="datetime-local"
                  placeholder={field.placeholder}
                  {...controllerField}
                  value={controllerField.value || ''}
                />
              )}
            />
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            {errors.fieldValues?.[field.name] && (
              <p className="text-sm text-red-500">{errors.fieldValues[field.name]?.message}</p>
            )}
          </div>
        );

      case 'CHECKBOX':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                id={field.name}
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                {...register(fieldName as any)}
              />
              <Label htmlFor={field.name} className="text-sm font-medium">
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>
            {field.helpText && (
              <p className="text-sm text-gray-500 ml-6">{field.helpText}</p>
            )}
          </div>
        );

      case 'RADIO':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {(Array.isArray(field.options) ? field.options : []).map((option: string) => (
                <div key={option} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${field.name}-${option}`}
                    value={option}
                    className="h-4 w-4"
                    {...register(fieldName as any, { required: isRequired })}
                  />
                  <Label htmlFor={`${field.name}-${option}`} className="text-sm font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            {errors.fieldValues?.[field.name] && (
              <p className="text-sm text-red-500">{errors.fieldValues[field.name]?.message}</p>
            )}
          </div>
        );

      case 'MULTISELECT':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={fieldName as any}
              control={control}
              rules={{ required: isRequired }}
              defaultValue={[]}
              render={({ field: controllerField }) => {
                const selectedValues = Array.isArray(controllerField.value) ? controllerField.value : [];
                
                return (
                  <div className="space-y-2">
                    {(Array.isArray(field.options) ? field.options : []).map((option: string) => (
                      <div key={option} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`${field.name}-${option}`}
                          checked={selectedValues.includes(option)}
                          onChange={(e) => {
                            const newValues = e.target.checked
                              ? [...selectedValues, option]
                              : selectedValues.filter((v: string) => v !== option);
                            controllerField.onChange(newValues);
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor={`${field.name}-${option}`} className="text-sm font-normal">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                );
              }}
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
      {!selectedService ? (
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
          {(selectedCategory || (debouncedSearchTerm && services.length > 0)) && (
            <div className="space-y-2">
              <h3 className="font-medium">
                {selectedCategory ? 'Available Services' : 'Search Results'}
              </h3>
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
      ) : (
        /* Selected Service Summary */
        <Card>
          <CardHeader>
            <CardTitle>Selected Service</CardTitle>
            <CardDescription>
              {selectedService.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{selectedService.description}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedService.priority}</Badge>
                <Badge variant="outline">~{selectedService.estimatedHours}h</Badge>
                {selectedService.requiresApproval && (
                  <Badge variant="outline">Requires Approval</Badge>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setValue('serviceId', '');
                  setSelectedService(null);
                  setSelectedCategory('');
                  setSearchTerm('');
                }}
              >
                Change Service
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

              {/* Dynamic Fields - Prioritize Field Templates over Regular Fields */}
              {selectedService.fieldTemplates && selectedService.fieldTemplates.length > 0 ? (
                <>
                  {/* Render Field Templates if they exist */}
                  {selectedService.fieldTemplates
                    .filter(template => template.isUserVisible)
                    .sort((a, b) => a.order - b.order)
                    .map((template) => (
                      <div key={template.id}>
                        {renderFieldTemplate(template)}
                      </div>
                    ))}
                </>
              ) : (
                <>
                  {/* Fallback to Regular Fields if no Field Templates */}
                  {selectedService.fields && Array.isArray(selectedService.fields) && 
                    selectedService.fields
                      .filter(field => field.isUserVisible)
                      .map(renderDynamicField)}
                </>
              )}

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
                     value={watchedCategoryId || ''}
                     onValueChange={(value: string) => {
                       setValue('categoryId', value);
                       if (!isAutofilling) {
                         setValue('subcategoryId', '');
                         setValue('itemId', '');
                       }
                       loadTierSubcategories(value);
                     }}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select category (optional)" />
                     </SelectTrigger>
                     <SelectContent>
                       {tierCategories.map((category) => (
                         <SelectItem key={category.id} value={category.id}>
                           {category.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
 
                 {/* Subcategory */}
                 <div className="space-y-2">
                   <Label htmlFor="subcategoryId">Subcategory</Label>
                   <Select
                     value={watchedSubcategoryId || ''}
                     onValueChange={(value: string) => {
                       setValue('subcategoryId', value);
                       if (!isAutofilling) {
                         setValue('itemId', '');
                       }
                       loadTierItems(value);
                     }}
                     disabled={!watchedCategoryId || tierSubcategories.length === 0}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select subcategory (optional)" />
                     </SelectTrigger>
                     <SelectContent>
                       {tierSubcategories.map((subcategory) => (
                         <SelectItem key={subcategory.id} value={subcategory.id}>
                           {subcategory.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
 
                 {/* Item */}
                 <div className="space-y-2">
                   <Label htmlFor="itemId">Item</Label>
                   <Select
                     value={watchedItemId || ''}
                     onValueChange={(value: string) => {
                       console.log('🔍 Item Select: Manual value change to:', value);
                       setValue('itemId', value);
                     }}
                     disabled={!watchedSubcategoryId || tierItems.length === 0}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select item (optional)" />
                     </SelectTrigger>
                     <SelectContent>
                       {tierItems.map((item) => (
                         <SelectItem key={item.id} value={item.id}>
                           {item.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                   {/* Debug info */}
                   {process.env.NODE_ENV === 'development' && (
                     <div className="text-xs text-gray-500 space-y-1">
                       <div>Watched itemId: {watchedItemId || 'none'}</div>
                       <div>Tier items count: {tierItems.length}</div>
                       <div>Subcategory selected: {watchedSubcategoryId || 'none'}</div>
                       <div>Item dropdown disabled: {(!watchedSubcategoryId || tierItems.length === 0).toString()}</div>
                       {tierItems.length > 0 && (
                         <div>Available items: {tierItems.map(i => `${i.name} (${i.id})`).join(', ')}</div>
                       )}
                     </div>
                   )}
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
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar,.csv,.xml,.json"
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