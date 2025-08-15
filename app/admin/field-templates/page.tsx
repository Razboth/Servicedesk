'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Filter, Copy, FileDown, FileUp } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'TEXTAREA', label: 'Text Area' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'DATETIME', label: 'Date & Time' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'MULTISELECT', label: 'Multi-Select' },
  { value: 'RADIO', label: 'Radio Buttons' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'FILE', label: 'File Upload' },
  { value: 'URL', label: 'URL' },
]

const FIELD_CATEGORIES = [
  'Customer Information',
  'ATM Information',
  'User Account',
  'Transaction Information',
  'Error Information',
  'Location Information',
  'Approval Information',
  'ATM Reconciliation',
  'Service Specific',
  'Technical Details',
  'Date & Time',
  'Financial',
  'Document',
  'Other'
]

interface FieldTemplate {
  id: string
  name: string
  label: string
  type: string
  category: string | null
  description: string | null
  isRequired: boolean
  isUserVisible: boolean
  placeholder: string | null
  helpText: string | null
  defaultValue: string | null
  options: string[] | null
  validation: any | null
  order: number
  createdAt: string
  updatedAt: string
  _count?: {
    serviceFieldTemplates: number
  }
}

interface CustomServiceField {
  id: string
  serviceId: string
  name: string
  label: string
  type: string
  isRequired: boolean
  isUserVisible: boolean
  placeholder: string | null
  helpText: string | null
  defaultValue: string | null
  options: any
  validation: any
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  service: {
    id: string
    name: string
  }
}

export default function FieldTemplatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [templates, setTemplates] = useState<FieldTemplate[]>([])
  const [customFields, setCustomFields] = useState<CustomServiceField[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('templates')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<FieldTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    type: 'TEXT',
    category: '',
    description: '',
    isRequired: false,
    placeholder: '',
    helpText: '',
    defaultValue: '',
    options: '',
    validationPattern: '',
    validationMin: '',
    validationMax: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      router.push('/')
      return
    }
    fetchTemplates()
  }, [session, status, router])

  const fetchTemplates = async () => {
    try {
      // Fetch field templates
      const templatesResponse = await fetch('/api/admin/field-templates')
      if (!templatesResponse.ok) throw new Error('Failed to fetch templates')
      const templatesData = await templatesResponse.json()
      setTemplates(templatesData)

      // Fetch custom service fields
      const customFieldsResponse = await fetch('/api/admin/custom-fields')
      if (customFieldsResponse.ok) {
        const customFieldsData = await customFieldsResponse.json()
        setCustomFields(customFieldsData)
      }
    } catch (error) {
      toast.error('Failed to load field templates')
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (template.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
      const matchesType = selectedType === 'all' || template.type === selectedType
      return matchesSearch && matchesCategory && matchesType
    })
  }, [templates, searchTerm, selectedCategory, selectedType])

  const filteredCustomFields = useMemo(() => {
    return customFields.filter(field => {
      const matchesSearch = field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (field.helpText?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          field.service.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = selectedType === 'all' || field.type === selectedType
      return matchesSearch && matchesType
    })
  }, [customFields, searchTerm, selectedType])

  const handleCreate = () => {
    setFormData({
      name: '',
      label: '',
      type: 'TEXT',
      category: '',
      description: '',
      isRequired: false,
      placeholder: '',
      helpText: '',
      defaultValue: '',
      options: '',
      validationPattern: '',
      validationMin: '',
      validationMax: ''
    })
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (template: FieldTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      label: template.label,
      type: template.type,
      category: template.category || '',
      description: template.description || '',
      isRequired: template.isRequired,
      placeholder: template.placeholder || '',
      helpText: template.helpText || '',
      defaultValue: template.defaultValue || '',
      options: Array.isArray(template.options) ? template.options.join('\n') : '',
      validationPattern: (template.validation as any)?.pattern || '',
      validationMin: (template.validation as any)?.min?.toString() || '',
      validationMax: (template.validation as any)?.max?.toString() || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = (template: FieldTemplate) => {
    setSelectedTemplate(template)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation: any = {}
    if (formData.validationPattern) validation.pattern = formData.validationPattern
    if (formData.validationMin) validation.min = Number(formData.validationMin)
    if (formData.validationMax) validation.max = Number(formData.validationMax)

    const payload = {
      name: formData.name,
      label: formData.label,
      type: formData.type,
      category: formData.category || null,
      description: formData.description || null,
      isRequired: formData.isRequired,
      placeholder: formData.placeholder || null,
      helpText: formData.helpText || null,
      defaultValue: formData.defaultValue || null,
      options: ['SELECT', 'MULTISELECT', 'RADIO'].includes(formData.type) && formData.options
        ? formData.options.split('\n').filter(o => o.trim())
        : null,
      validation: Object.keys(validation).length > 0 ? validation : null
    }

    try {
      const url = selectedTemplate 
        ? `/api/admin/field-templates/${selectedTemplate.id}`
        : '/api/admin/field-templates'
      const method = selectedTemplate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to save template')

      toast.success(selectedTemplate ? 'Template updated' : 'Template created')
      setIsCreateDialogOpen(false)
      setIsEditDialogOpen(false)
      fetchTemplates()
    } catch (error) {
      toast.error('Failed to save template')
    }
  }

  const confirmDelete = async () => {
    if (!selectedTemplate) return

    try {
      const response = await fetch(`/api/admin/field-templates/${selectedTemplate.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete template')

      toast.success('Template deleted')
      setIsDeleteDialogOpen(false)
      fetchTemplates()
    } catch (error) {
      toast.error('Failed to delete template')
    }
  }

  const duplicateTemplate = async (template: FieldTemplate) => {
    const payload = {
      ...template,
      name: `${template.name}_copy`,
      label: `${template.label} (Copy)`,
    }
    delete (payload as any).id
    delete (payload as any).createdAt
    delete (payload as any).updatedAt
    delete (payload as any)._count

    try {
      const response = await fetch('/api/admin/field-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to duplicate template')

      toast.success('Template duplicated')
      fetchTemplates()
    } catch (error) {
      toast.error('Failed to duplicate template')
    }
  }

  const handleEditCustomField = (field: CustomServiceField) => {
    // Navigate to the service's field management page
    router.push(`/admin/services`);
  };

  const handleDeleteCustomField = async (field: CustomServiceField) => {
    if (!confirm(`Are you sure you want to delete the field "${field.label}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/services/${field.serviceId}/fields/${field.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete field')
      }

      toast.success('Field deleted successfully')
      fetchTemplates() // Refresh the data
    } catch (error) {
      console.error('Error deleting field:', error)
      toast.error('Failed to delete field')
    }
  };

  const renderFieldDialog = () => {
    const isEdit = !!selectedTemplate
    const title = isEdit ? 'Edit Field Template' : 'Create Field Template'
    const description = isEdit ? 'Update the field template details' : 'Create a new reusable field template'

    return (
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Field Name (Internal)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="customer_name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Field Label (Display)</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Customer Name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Field Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category || 'no-category'} onValueChange={(value) => setFormData({ ...formData, category: value === 'no-category' ? '' : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-category">No Category</SelectItem>
                    {FIELD_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this field"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placeholder">Placeholder</Label>
                <Input
                  id="placeholder"
                  value={formData.placeholder}
                  onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                  placeholder="Enter placeholder text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultValue">Default Value</Label>
                <Input
                  id="defaultValue"
                  value={formData.defaultValue}
                  onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                  placeholder="Default value"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="helpText">Help Text</Label>
              <Input
                id="helpText"
                value={formData.helpText}
                onChange={(e) => setFormData({ ...formData, helpText: e.target.value })}
                placeholder="Help text shown below the field"
              />
            </div>

            {['SELECT', 'MULTISELECT', 'RADIO'].includes(formData.type) && (
              <div className="space-y-2">
                <Label htmlFor="options">Options (one per line)</Label>
                <Textarea
                  id="options"
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={4}
                />
              </div>
            )}

            {formData.type === 'TEXT' && (
              <div className="space-y-2">
                <Label htmlFor="validationPattern">Validation Pattern (Regex)</Label>
                <Input
                  id="validationPattern"
                  value={formData.validationPattern}
                  onChange={(e) => setFormData({ ...formData, validationPattern: e.target.value })}
                  placeholder="^[A-Z0-9]+$"
                />
              </div>
            )}

            {formData.type === 'NUMBER' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validationMin">Min Value</Label>
                  <Input
                    id="validationMin"
                    type="number"
                    value={formData.validationMin}
                    onChange={(e) => setFormData({ ...formData, validationMin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validationMax">Max Value</Label>
                  <Input
                    id="validationMax"
                    type="number"
                    value={formData.validationMax}
                    onChange={(e) => setFormData({ ...formData, validationMax: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRequired"
                checked={formData.isRequired}
                onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked as boolean })}
              />
              <Label htmlFor="isRequired">Required Field (Default)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => isEdit ? setIsEditDialogOpen(false) : setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? 'Update' : 'Create'} Template</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    )
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Field Templates</h1>
          <p className="text-muted-foreground">Create and manage reusable field templates for services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileUp className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Field Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="custom">Custom Fields ({customFields.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {FIELD_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {FIELD_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-mono text-sm">{template.name}</TableCell>
                      <TableCell>{template.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {FIELD_TYPES.find(t => t.value === template.type)?.label || template.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{template.category || '-'}</TableCell>
                      <TableCell>
                        {template.isRequired ? (
                          <Badge variant="default">Required</Badge>
                        ) : (
                          <Badge variant="secondary">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {template._count?.serviceFieldTemplates || 0} services
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateTemplate(template)}
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template)}
                            disabled={template._count?.serviceFieldTemplates && template._count.serviceFieldTemplates > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search custom fields..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {FIELD_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                   <TableRow>
                     <TableHead>Service</TableHead>
                     <TableHead>Name</TableHead>
                     <TableHead>Label</TableHead>
                     <TableHead>Type</TableHead>
                     <TableHead>Required</TableHead>
                     <TableHead>User Visible</TableHead>
                     <TableHead>Active</TableHead>
                     <TableHead>Order</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {filteredCustomFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Badge variant="secondary">{field.service.name}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{field.name}</TableCell>
                      <TableCell>{field.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {field.isRequired ? (
                          <Badge variant="default">Required</Badge>
                        ) : (
                          <Badge variant="secondary">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {field.isUserVisible ? (
                          <Badge variant="default">Visible</Badge>
                        ) : (
                          <Badge variant="secondary">Hidden</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {field.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{field.order}</TableCell>
                       <TableCell className="text-right">
                         <div className="flex justify-end gap-2">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleEditCustomField(field)}
                           >
                             <Pencil className="h-4 w-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleDeleteCustomField(field)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        {renderFieldDialog()}
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        {renderFieldDialog()}
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the field template "{selectedTemplate?.label}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}