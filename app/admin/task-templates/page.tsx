'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Trash2, Plus, Edit, Save, X, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
}

interface TaskTemplateItem {
  id?: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  isRequired: boolean;
  order: number;
}

interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  serviceId: string;
  service: Service;
  items: TaskTemplateItem[];
}

interface NewTaskTemplate {
  name: string;
  description: string;
  serviceId: string;
  items: TaskTemplateItem[];
}

export default function TaskTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState<NewTaskTemplate>({
    name: '',
    description: '',
    serviceId: '',
    items: []
  });
  const [editTemplate, setEditTemplate] = useState<NewTaskTemplate>({
    name: '',
    description: '',
    serviceId: '',
    items: []
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      router.push('/unauthorized');
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [templatesRes, servicesRes] = await Promise.all([
        fetch('/api/task-templates'),
        fetch('/api/services')
      ]);

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTaskTemplates(templatesData);
      }

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/task-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTemplate)
      });

      if (response.ok) {
        toast.success('Task template created successfully');
        setShowNewForm(false);
        setNewTemplate({ name: '', description: '', serviceId: '', items: [] });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create task template');
      }
    } catch (error) {
      console.error('Error creating task template:', error);
      toast.error('Failed to create task template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this task template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/task-templates/${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Task template deleted successfully');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete task template');
      }
    } catch (error) {
      console.error('Error deleting task template:', error);
      toast.error('Failed to delete task template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editTemplate.name || !editTemplate.serviceId || !editingTemplate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`/api/task-templates/${editingTemplate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editTemplate)
      });

      if (response.ok) {
        toast.success('Task template updated successfully');
        setEditingTemplate(null);
        setEditTemplate({ name: '', description: '', serviceId: '', items: [] });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update task template');
      }
    } catch (error) {
      console.error('Error updating task template:', error);
      toast.error('Failed to update task template');
    }
  };

  const startEditTemplate = (template: TaskTemplate) => {
    setEditTemplate({
      name: template.name,
      description: template.description || '',
      serviceId: template.service.id,
      items: template.items.map(item => ({
        title: item.title,
        description: item.description || '',
        estimatedMinutes: item.estimatedMinutes || 0,
        isRequired: item.isRequired,
        order: item.order
      }))
    });
    setEditingTemplate(template.id);
  };

  const addNewItem = (isNewTemplate = false, isEditTemplate = false) => {
    const newItem: TaskTemplateItem = {
      title: '',
      description: '',
      estimatedMinutes: 0,
      isRequired: true,
      order: isNewTemplate ? newTemplate.items.length : isEditTemplate ? editTemplate.items.length : 0
    };

    if (isNewTemplate) {
      setNewTemplate(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    } else if (isEditTemplate) {
      setEditTemplate(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    }
  };

  const removeItem = (index: number, isNewTemplate = false, isEditTemplate = false) => {
    if (isNewTemplate) {
      setNewTemplate(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    } else if (isEditTemplate) {
      setEditTemplate(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index: number, field: keyof TaskTemplateItem, value: any, isNewTemplate = false, isEditTemplate = false) => {
    if (isNewTemplate) {
      setNewTemplate(prev => ({
        ...prev,
        items: prev.items.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }));
    } else if (isEditTemplate) {
      setEditTemplate(prev => ({
        ...prev,
        items: prev.items.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }));
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Task Templates"
        description="Manage task templates for services to standardize work processes"
        icon={<ClipboardList className="h-6 w-6" />}
        action={
          <Button onClick={() => setShowNewForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        }
      />

      {showNewForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Task Template</CardTitle>
            <CardDescription>
              Define a reusable task template for a specific service
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <Label htmlFor="service">Service</Label>
                <Select
                  value={newTemplate.serviceId}
                  onValueChange={(value) => setNewTemplate(prev => ({ ...prev, serviceId: value }))}
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
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter template description"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Task Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addNewItem(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              </div>
              
              {newTemplate.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                      <div>
                        <Label>Task Title</Label>
                        <Input
                          value={item.title}
                          onChange={(e) => updateItem(index, 'title', e.target.value, true)}
                          placeholder="Enter task title"
                        />
                      </div>
                      <div>
                        <Label>Estimated Minutes</Label>
                        <Input
                          type="number"
                          value={item.estimatedMinutes || ''}
                          onChange={(e) => updateItem(index, 'estimatedMinutes', parseInt(e.target.value) || 0, true)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index, true)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value, true)}
                      placeholder="Enter task description"
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`required-${index}`}
                      checked={item.isRequired}
                      onChange={(e) => updateItem(index, 'isRequired', e.target.checked, true)}
                    />
                    <Label htmlFor={`required-${index}`}>Required Task</Label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateTemplate} disabled={!newTemplate.name || !newTemplate.serviceId}>
                <Save className="h-4 w-4 mr-2" />
                Create Template
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewForm(false);
                  setNewTemplate({ name: '', description: '', serviceId: '', items: [] });
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Task Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={editTemplate.name}
                  onChange={(e) => setEditTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <Label>Service</Label>
                <select
                  value={editTemplate.serviceId}
                  onChange={(e) => setEditTemplate(prev => ({ ...prev, serviceId: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editTemplate.description}
                onChange={(e) => setEditTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter template description"
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Task Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addNewItem(false, true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              </div>
              
              {editTemplate.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                      <div>
                        <Label>Task Title</Label>
                        <Input
                          value={item.title}
                          onChange={(e) => updateItem(index, 'title', e.target.value, false, true)}
                          placeholder="Enter task title"
                        />
                      </div>
                      <div>
                        <Label>Estimated Minutes</Label>
                        <Input
                          type="number"
                          value={item.estimatedMinutes || ''}
                          onChange={(e) => updateItem(index, 'estimatedMinutes', parseInt(e.target.value) || 0, false, true)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index, false, true)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value, false, true)}
                      placeholder="Enter task description"
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-required-${index}`}
                      checked={item.isRequired}
                      onChange={(e) => updateItem(index, 'isRequired', e.target.checked, false, true)}
                    />
                    <Label htmlFor={`edit-required-${index}`}>Required Task</Label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpdateTemplate} disabled={!editTemplate.name || !editTemplate.serviceId}>
                <Save className="h-4 w-4 mr-2" />
                Update Template
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTemplate(null);
                  setEditTemplate({ name: '', description: '', serviceId: '', items: [] });
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {taskTemplates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {template.name}
                    <Badge variant="secondary">{template.service.name}</Badge>
                  </CardTitle>
                  {template.description && (
                    <CardDescription className="mt-2">
                      {template.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditTemplate(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">
                  Tasks ({template.items.length})
                </h4>
                {template.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.title}</span>
                        {item.isRequired && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                        {item.estimatedMinutes && (
                          <Badge variant="outline" className="text-xs">
                            {item.estimatedMinutes}min
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {taskTemplates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No task templates found</p>
            <Button onClick={() => setShowNewForm(true)}>
              Create your first task template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}