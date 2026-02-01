'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ArrowUp, ArrowDown, Settings, Link, FileText, List, Layers, Eraser } from 'lucide-react';
import { toast } from 'sonner';

interface FieldTemplate {
  id: string;
  name: string;
  label: string;
  description?: string;
  type: string;
  isRequired: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  options?: any;
  category?: string;
}

interface ServiceFieldTemplate {
  id: string;
  fieldTemplateId: string;
  order: number;
  isRequired?: boolean;
  isUserVisible: boolean;
  helpText?: string;
  defaultValue?: string;
  fieldTemplate: FieldTemplate;
}

interface ServiceField {
  id?: string;
  name: string;
  label: string;
  type: string;
  isRequired: boolean;
  isUserVisible: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  options?: any;
  order: number;
  isActive: boolean;
}

interface Props {
  service: {
    id: string;
    name: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const mainTabConfig = [
  { id: 'templates', label: 'Active Fields', icon: FileText },
  { id: 'custom', label: 'Custom Fields', icon: List },
  { id: 'all', label: 'All Fields', icon: Layers },
  { id: 'cleanup', label: 'Cleanup', icon: Eraser },
];

export function ServiceFieldTemplatesDialog({
  service,
  open,
  onOpenChange,
  onUpdate
}: Props) {
  const serviceId = service.id;
  const serviceName = service.name;
  const isOpen = open;
  const onClose = () => onOpenChange(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [fieldTemplates, setFieldTemplates] = useState<FieldTemplate[]>([]);
  const [serviceFieldTemplates, setServiceFieldTemplates] = useState<ServiceFieldTemplate[]>([]);
  const [customFields, setCustomFields] = useState<ServiceField[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<FieldTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, serviceId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all field templates (including newly created ones)
      const templatesRes = await fetch('/api/admin/field-templates');
      if (templatesRes.ok) {
        const templates = await templatesRes.json();
        setFieldTemplates(templates);
      }

      // Fetch service field templates
      const serviceTemplatesRes = await fetch(`/api/admin/services/${serviceId}/field-templates`);
      if (serviceTemplatesRes.ok) {
        const serviceTemplates = await serviceTemplatesRes.json();
        setServiceFieldTemplates(serviceTemplates);
      }

      // Fetch custom fields
      const fieldsRes = await fetch(`/api/admin/services/${serviceId}/fields`);
      if (fieldsRes.ok) {
        const fields = await fieldsRes.json();
        setCustomFields(fields);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load field data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter available templates (not already added)
  useEffect(() => {
    const usedTemplateIds = serviceFieldTemplates.map(st => st.fieldTemplateId);
    const available = fieldTemplates.filter(t => !usedTemplateIds.includes(t.id));
    setAvailableTemplates(available);
  }, [fieldTemplates, serviceFieldTemplates]);

  const handleAddTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/services/${serviceId}/field-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldTemplateId: templateId,
          order: serviceFieldTemplates.length
        })
      });

      if (response.ok) {
        toast.success('Field template added');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add field template');
      }
    } catch (error) {
      console.error('Error adding template:', error);
      toast.error('Failed to add field template');
    }
  };

  const handleRemoveTemplate = async (fieldTemplateId: string) => {
    try {
      const response = await fetch(
        `/api/admin/services/${serviceId}/field-templates?fieldTemplateId=${fieldTemplateId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast.success('Field template removed');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove field template');
      }
    } catch (error) {
      console.error('Error removing template:', error);
      toast.error('Failed to remove field template');
    }
  };

  const handleUpdateTemplates = async (updates: any[]) => {
    try {
      const response = await fetch(`/api/admin/services/${serviceId}/field-templates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (response.ok) {
        toast.success('Field templates updated');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update field templates');
      }
    } catch (error) {
      console.error('Error updating templates:', error);
      toast.error('Failed to update field templates');
    }
  };

  const handleMoveTemplate = (index: number, direction: 'up' | 'down') => {
    const newTemplates = [...serviceFieldTemplates];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newTemplates.length) {
      [newTemplates[index], newTemplates[targetIndex]] = [newTemplates[targetIndex], newTemplates[index]];

      // Update order values and save
      const updates = newTemplates.map((template, i) => ({
        id: template.id,
        order: i
      }));

      setServiceFieldTemplates(newTemplates);
      handleUpdateTemplates(updates);
    }
  };

  const handleToggleVisibility = (template: ServiceFieldTemplate) => {
    const updates = [{
      id: template.id,
      isUserVisible: !template.isUserVisible
    }];
    handleUpdateTemplates(updates);
  };

  const handleToggleRequired = (template: ServiceFieldTemplate) => {
    const updates = [{
      id: template.id,
      isRequired: !template.isRequired
    }];
    handleUpdateTemplates(updates);
  };

  const handleMoveCustomField = async (index: number, direction: 'up' | 'down') => {
    const newFields = [...customFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];

      // Update order values
      const updatedFields = newFields.map((field, i) => ({
        ...field,
        order: i
      }));

      setCustomFields(updatedFields);

      // Save to backend
      try {
        const response = await fetch(`/api/admin/services/${serviceId}/fields`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: updatedFields })
        });

        if (!response.ok) {
          throw new Error('Failed to update field order');
        }
      } catch (error) {
        console.error('Error updating field order:', error);
        toast.error('Failed to update field order');
        fetchData(); // Refresh to revert
      }
    }
  };

  const [editingField, setEditingField] = useState<ServiceField | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceField>>({});
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<any>(null);

  const handleCleanupPreview = async () => {
    try {
      setCleanupLoading(true);
      const response = await fetch(`/api/admin/services/${serviceId}/fields/cleanup`);
      if (response.ok) {
        const data = await response.json();
        setCleanupPreview(data);
      } else {
        toast.error('Failed to load cleanup preview');
      }
    } catch (error) {
      console.error('Error loading cleanup preview:', error);
      toast.error('Failed to load cleanup preview');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanupFields = async (type: 'all' | 'fields' | 'templates' = 'all') => {
    const confirmMessage = type === 'all'
      ? 'This will remove ALL custom fields (both direct fields and field templates) from this service. This action cannot be undone.'
      : type === 'fields'
      ? 'This will remove all DIRECT custom fields from this service. Field templates will remain.'
      : 'This will remove all FIELD TEMPLATE links from this service. Direct custom fields will remain.';

    if (!confirm(confirmMessage + '\n\nContinue?')) {
      return;
    }

    try {
      setCleanupLoading(true);
      const response = await fetch(`/api/admin/services/${serviceId}/fields/cleanup?type=${type}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setCleanupPreview(null);
        fetchData(); // Refresh the data
        onUpdate(); // Update parent component
      } else {
        const error = await response.json();
        if (error.hasTicketData) {
          toast.error('Cannot delete fields with existing ticket data. Use the cleanup script for this operation.');
        } else {
          toast.error(error.error || 'Failed to cleanup fields');
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error('Failed to cleanup fields');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleEditCustomField = (field: ServiceField) => {
    setEditingField(field);
    setEditForm({
      name: field.name,
      label: field.label,
      type: field.type,
      isRequired: field.isRequired,
      isUserVisible: field.isUserVisible,
      placeholder: field.placeholder,
      helpText: field.helpText,
      defaultValue: field.defaultValue,
      isActive: field.isActive
    });
  };

  const handleSaveEditField = async () => {
    if (!editingField || !editForm.name || !editForm.label) {
      toast.error('Name and label are required');
      return;
    }

    try {
      const response = await fetch(`/api/admin/services/${serviceId}/fields/${editingField.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        toast.success('Custom field updated');
        setEditingField(null);
        setEditForm({});
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update custom field');
      }
    } catch (error) {
      console.error('Error updating custom field:', error);
      toast.error('Failed to update custom field');
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditForm({});
  };

  const handleDeleteCustomField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/services/${serviceId}/fields/${fieldId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Custom field deleted');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete custom field');
      }
    } catch (error) {
      console.error('Error deleting custom field:', error);
      toast.error('Failed to delete custom field');
    }
  };

  const filteredAvailableTemplates = selectedCategory === 'all'
    ? availableTemplates
    : availableTemplates.filter(t => t.category === selectedCategory);

  const categories = ['all', ...new Set(fieldTemplates.map(t => t.category).filter(Boolean))] as string[];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Fields - {serviceName}</DialogTitle>
          <DialogDescription>
            Configure fields using reusable templates or custom fields
          </DialogDescription>
        </DialogHeader>

        <div className="border-b mb-6">
          <nav className="flex gap-6 overflow-x-auto" aria-label="Tabs">
            {mainTabConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                    ${isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                    }
                    ${tab.id === 'cleanup' ? 'text-red-600' : ''}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Active Fields</h3>
              {serviceFieldTemplates.length === 0 && customFields.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-6">
                    <p className="text-gray-500">No fields configured yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {/* Custom Fields */}
                  {customFields.map((field, index) => (
                    <Card key={`field-${field.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">Direct Field</Badge>
                              <Badge variant="outline">{field.type}</Badge>
                              <span className="font-medium">{field.label}</span>
                              <Badge variant={field.isRequired ? "destructive" : "secondary"} className="text-xs">
                                {field.isRequired ? 'Required' : 'Optional'}
                              </Badge>
                              <Badge variant={field.isUserVisible ? "default" : "secondary"} className="text-xs">
                                {field.isUserVisible ? 'User Visible' : 'Technician Only'}
                              </Badge>
                            </div>
                            {field.helpText && (
                              <p className="text-sm text-gray-600">{field.helpText}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMoveCustomField(index, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMoveCustomField(index, 'down')}
                              disabled={index === customFields.length - 1}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCustomField(field)}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCustomField(field.id!)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Field Templates */}
                  {serviceFieldTemplates.map((template, index) => (
                    <Card key={template.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="default" className="text-xs bg-purple-100 text-purple-800">Template Field</Badge>
                              <Badge variant="outline">{template.fieldTemplate.type}</Badge>
                              <span className="font-medium">{template.fieldTemplate.label}</span>
                              <Badge variant={template.isRequired ? "destructive" : "secondary"} className="text-xs">
                                {template.isRequired ? 'Required' : 'Optional'}
                              </Badge>
                              <Badge variant={template.isUserVisible ? "default" : "secondary"} className="text-xs">
                                {template.isUserVisible ? 'User Visible' : 'Technician Only'}
                              </Badge>
                            </div>
                            {template.fieldTemplate.description && (
                              <p className="text-sm text-gray-600">{template.fieldTemplate.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`visible-${template.id}`}
                                  checked={template.isUserVisible}
                                  onCheckedChange={() => handleToggleVisibility(template)}
                                />
                                <Label htmlFor={`visible-${template.id}`} className="text-xs">
                                  User Visible
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`required-${template.id}`}
                                  checked={template.isRequired ?? template.fieldTemplate.isRequired}
                                  onCheckedChange={() => handleToggleRequired(template)}
                                />
                                <Label htmlFor={`required-${template.id}`} className="text-xs">
                                  Required
                                </Label>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMoveTemplate(index, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMoveTemplate(index, 'down')}
                              disabled={index === serviceFieldTemplates.length - 1}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveTemplate(template.fieldTemplateId)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Available Templates</h3>
              <div className="border-b mb-4">
                <nav className="flex gap-4 overflow-x-auto" aria-label="Category Tabs">
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`
                          py-2 px-1 border-b-2 font-medium text-xs whitespace-nowrap transition-colors
                          ${isActive
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                          }
                        `}
                      >
                        {cat === 'all' ? 'All' : cat}
                      </button>
                    );
                  })}
                </nav>
              </div>
              {filteredAvailableTemplates.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-4">
                    <p className="text-gray-500 text-sm">No available templates</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredAvailableTemplates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{template.type}</Badge>
                              <span className="text-sm font-medium">{template.label}</span>
                            </div>
                            {template.description && (
                              <p className="text-xs text-gray-600">{template.description}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddTemplate(template.id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Custom Fields</h3>
              <Button
                size="sm"
                onClick={() => toast.info('Add custom field functionality coming soon')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Custom Field
              </Button>
            </div>

            {customFields.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6">
                  <p className="text-gray-500">No custom fields created yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Custom fields are specific to this service only. For reusable fields, use field templates.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {customFields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{field.type}</Badge>
                            <span className="font-medium">{field.label}</span>
                            <span className="text-sm text-gray-500">({field.name})</span>
                          </div>
                          {field.helpText && (
                            <p className="text-sm text-gray-600 mt-1">{field.helpText}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className={field.isRequired ? "text-red-600" : "text-gray-500"}>
                              {field.isRequired ? "Required" : "Optional"}
                            </span>
                            <span className={field.isUserVisible ? "text-green-600" : "text-orange-600"}>
                              {field.isUserVisible ? "User Visible" : "Technician Only"}
                            </span>
                            {field.defaultValue && (
                              <span className="text-gray-500">
                                Default: {field.defaultValue}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMoveCustomField(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMoveCustomField(index, 'down')}
                            disabled={index === customFields.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCustomField(field)}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCustomField(field.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">
                All Fields ({serviceFieldTemplates.length + customFields.length} total)
              </h3>
              <div className="text-sm text-gray-600">
                {serviceFieldTemplates.length} templates, {customFields.length} custom
              </div>
            </div>

            {serviceFieldTemplates.length === 0 && customFields.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6">
                  <p className="text-gray-500">No fields configured</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {/* Custom Fields */}
                {customFields.map((field) => (
                  <Card key={`all-field-${field.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">Direct</Badge>
                          <Badge variant="outline" className="text-xs">{field.type}</Badge>
                          <span className="text-sm font-medium">{field.label}</span>
                          {field.isRequired && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                          {!field.isUserVisible && (
                            <Badge variant="secondary" className="text-xs">Technician Only</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">Order: {field.order}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Field Templates */}
                {serviceFieldTemplates.map((template) => (
                  <Card key={`all-template-${template.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs bg-purple-100 text-purple-800">Template</Badge>
                          <Badge variant="outline" className="text-xs">{template.fieldTemplate.type}</Badge>
                          <span className="text-sm font-medium">{template.fieldTemplate.label}</span>
                          {(template.isRequired ?? template.fieldTemplate.isRequired) && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                          {!template.isUserVisible && (
                            <Badge variant="secondary" className="text-xs">Technician Only</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">Order: {template.order}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cleanup' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Field Cleanup Tool</h3>
              <p className="text-yellow-700 text-sm mb-4">
                This service has <strong>TWO TYPES</strong> of custom fields that might be causing confusion:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-blue-800">Direct Custom Fields</h4>
                  <p className="text-gray-600">Fields created directly for this service</p>
                  <p className="text-sm text-gray-500">Count: {customFields.length}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-purple-800">Field Templates</h4>
                  <p className="text-gray-600">Reusable field templates linked to this service</p>
                  <p className="text-sm text-gray-500">Count: {serviceFieldTemplates.length}</p>
                </div>
              </div>
              <p className="text-yellow-700 text-sm mt-3">
                <strong>Problem:</strong> When you delete fields through the normal UI, only one type gets removed,
                so fields from the other system "come back" and appear to regenerate.
              </p>
            </div>

            {/* Cleanup Preview */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-md font-medium">Cleanup Preview</h4>
                <Button
                  variant="outline"
                  onClick={handleCleanupPreview}
                  disabled={cleanupLoading}
                >
                  {cleanupLoading ? 'Loading...' : 'Preview Cleanup'}
                </Button>
              </div>

              {cleanupPreview && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <h5 className="font-medium mb-3">Service: {cleanupPreview.service.name}</h5>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-lg font-bold text-blue-600">
                        {cleanupPreview.currentFields.counts.serviceFields}
                      </div>
                      <div className="text-sm text-gray-600">Direct Custom Fields</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-lg font-bold text-purple-600">
                        {cleanupPreview.currentFields.counts.serviceFieldTemplates}
                      </div>
                      <div className="text-sm text-gray-600">Field Templates</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-lg font-bold text-gray-700">
                        {cleanupPreview.currentFields.counts.total}
                      </div>
                      <div className="text-sm text-gray-600">Total Fields</div>
                    </div>
                  </div>

                  {cleanupPreview.riskAssessment.hasTicketData && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                      <p className="text-red-800 text-sm">
                        <strong>Warning:</strong> This service has {cleanupPreview.riskAssessment.affectedTicketFieldValues}
                        ticket field values that may be affected by cleanup.
                      </p>
                      <p className="text-red-700 text-xs mt-1">
                        Recommendation: Use the command-line cleanup script for services with ticket data.
                      </p>
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <strong>Recommendation:</strong> {cleanupPreview.riskAssessment.recommendation}
                  </div>
                </div>
              )}
            </div>

            {/* Cleanup Actions */}
            <div className="space-y-4">
              <h4 className="text-md font-medium">Cleanup Actions</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Remove All Fields</CardTitle>
                    <CardDescription className="text-xs">
                      Removes both direct custom fields AND field templates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCleanupFields('all')}
                      disabled={cleanupLoading}
                      className="w-full"
                    >
                      Clean All
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Remove Direct Fields Only</CardTitle>
                    <CardDescription className="text-xs">
                      Keeps field templates, removes direct custom fields
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCleanupFields('fields')}
                      disabled={cleanupLoading || customFields.length === 0}
                      className="w-full"
                    >
                      Clean Direct Fields
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Remove Templates Only</CardTitle>
                    <CardDescription className="text-xs">
                      Keeps direct fields, removes field template links
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCleanupFields('templates')}
                      disabled={cleanupLoading || serviceFieldTemplates.length === 0}
                      className="w-full"
                    >
                      Clean Templates
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-800 mb-2">Alternative: Command Line Tool</h5>
                <p className="text-blue-700 text-sm mb-2">
                  For services with existing ticket data, use the command-line cleanup tool:
                </p>
                <code className="text-xs bg-blue-100 p-2 rounded block">
                  npx tsx scripts/cleanup-service-fields.ts --service-name "{serviceName}" --dry-run
                </code>
                <p className="text-blue-600 text-xs mt-2">
                  Remove --dry-run flag to execute actual cleanup
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => {
            onUpdate();
            onClose();
          }}>
            Done
          </Button>
        </div>
      </DialogContent>

      {/* Edit Field Dialog */}
      {editingField && (
        <Dialog open={!!editingField} onOpenChange={(open) => !open && handleCancelEdit()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Custom Field</DialogTitle>
              <DialogDescription>
                Modify the properties of this custom field
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Field Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="field_name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-label">Display Label</Label>
                <Input
                  id="edit-label"
                  value={editForm.label || ''}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  placeholder="Field Label"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-placeholder">Placeholder Text</Label>
                <Input
                  id="edit-placeholder"
                  value={editForm.placeholder || ''}
                  onChange={(e) => setEditForm({ ...editForm, placeholder: e.target.value })}
                  placeholder="Enter placeholder text..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-help">Help Text</Label>
                <Textarea
                  id="edit-help"
                  value={editForm.helpText || ''}
                  onChange={(e) => setEditForm({ ...editForm, helpText: e.target.value })}
                  placeholder="Additional help text for users..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-default">Default Value</Label>
                <Input
                  id="edit-default"
                  value={editForm.defaultValue || ''}
                  onChange={(e) => setEditForm({ ...editForm, defaultValue: e.target.value })}
                  placeholder="Default value..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-required"
                  checked={editForm.isRequired || false}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isRequired: checked })}
                />
                <Label htmlFor="edit-required">Required Field</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-visible"
                  checked={editForm.isUserVisible || false}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isUserVisible: checked })}
                />
                <Label htmlFor="edit-visible">User Visible</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={editForm.isActive || false}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditField}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
