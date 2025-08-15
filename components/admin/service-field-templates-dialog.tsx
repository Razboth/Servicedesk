'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ArrowUp, ArrowDown, Settings, Link } from 'lucide-react';
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
      // Fetch all field templates
      const templatesRes = await fetch('/api/admin/field-templates?isActive=true');
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

  const categories = ['all', ...new Set(fieldTemplates.map(t => t.category).filter(Boolean))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Fields - {serviceName}</DialogTitle>
          <DialogDescription>
            Configure fields using reusable templates or custom fields
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="templates">Active Fields</TabsTrigger>
            <TabsTrigger value="custom">Custom Fields</TabsTrigger>
            <TabsTrigger value="all">All Fields</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
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
                                <Badge variant="secondary" className="text-xs">Custom</Badge>
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
                                <Badge variant="default" className="text-xs">Template</Badge>
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
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                  <TabsList className="h-auto flex-wrap">
                    {categories.map(cat => (
                      <TabsTrigger key={cat} value={cat} className="text-xs">
                        {cat === 'all' ? 'All' : cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value={selectedCategory} className="mt-2">
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
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="all">
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
                            <Badge variant="secondary" className="text-xs">Custom</Badge>
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
                            <Badge variant="default" className="text-xs">Template</Badge>
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
          </TabsContent>
        </Tabs>

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