'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Plus,
  X,
  Calendar as CalendarIcon,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface Filter {
  id: string
  column: string
  operator: string
  value: any
  logicalOperator?: 'AND' | 'OR'
  columnType?: string // Track column type for proper filtering
  fieldLabel?: string // Display label for custom fields
}

interface FilterBuilderProps {
  module: string
  filters: Filter[]
  onFiltersChange: (filters: Filter[]) => void
  selectedServices?: string[] // For fetching custom fields
}

interface CustomField {
  id: string
  name: string
  label: string
  type: string
  serviceName?: string
  options?: any
}

interface ServiceHierarchy {
  id: string
  name: string
  code: string
  level: number
  serviceCount: number
  subcategories?: ServiceHierarchy[]
  items?: ServiceHierarchy[]
}

const operators = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_than_or_equal', label: 'Greater Than or Equal' },
    { value: 'less_than_or_equal', label: 'Less Than or Equal' },
    { value: 'between', label: 'Between' },
    { value: 'not_between', label: 'Not Between' }
  ],
  date: [
    { value: 'equals', label: 'On' },
    { value: 'not_equals', label: 'Not On' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' },
    { value: 'in_last', label: 'In Last' },
    { value: 'in_next', label: 'In Next' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' }
  ],
  enum: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'in', label: 'In' },
    { value: 'not_in', label: 'Not In' }
  ],
  boolean: [
    { value: 'is_true', label: 'Is True' },
    { value: 'is_false', label: 'Is False' }
  ],
  hierarchy: [
    { value: 'equals', label: 'Equals' },
    { value: 'in', label: 'In' },
    { value: 'not_in', label: 'Not In' }
  ]
}

const getColumnType = (column: string, customFields: CustomField[] = []): string => {
  // Check if this is a custom field
  if (column.startsWith('customField_')) {
    const fieldId = column.replace('customField_', '')
    const customField = customFields.find(f => f.id === fieldId)
    if (customField) {
      // Map field types to filter types
      switch (customField.type.toUpperCase()) {
        case 'NUMBER':
        case 'CURRENCY':
          return 'number'
        case 'DATE':
        case 'DATETIME':
          return 'date'
        case 'SELECT':
        case 'RADIO':
        case 'MULTISELECT':
          return 'enum'
        case 'CHECKBOX':
        case 'TOGGLE':
          return 'boolean'
        default:
          return 'string'
      }
    }
  }

  // Check for service hierarchy filters
  if (column === 'serviceId' || column.startsWith('service.tier') || column === 'service.supportGroupId') {
    return 'hierarchy'
  }

  // Default type detection
  if (column.includes('date') || column.includes('At')) return 'date'
  if (column.includes('id') || column.includes('Time') || column.includes('duration')) return 'number'
  if (column === 'status' || column === 'priority' || column === 'category') return 'enum'
  if (column.includes('is') || column.includes('has')) return 'boolean'
  return 'string'
}

export function FilterBuilder({ module, filters, onFiltersChange, selectedServices = [] }: FilterBuilderProps) {
  const [localFilters, setLocalFilters] = useState<Filter[]>(filters)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [serviceHierarchy, setServiceHierarchy] = useState<ServiceHierarchy[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [loadingHierarchy, setLoadingHierarchy] = useState(false)

  // Load custom fields when services are selected
  useEffect(() => {
    if (module === 'TICKETS' && selectedServices && selectedServices.length > 0) {
      loadCustomFields(selectedServices)
    } else {
      setCustomFields([])
    }
  }, [module, selectedServices])

  // Load service hierarchy
  useEffect(() => {
    if (module === 'TICKETS') {
      loadServiceHierarchy()
    }
  }, [module])

  const loadCustomFields = async (serviceIds: string[]) => {
    try {
      setLoadingFields(true)
      const response = await fetch(`/api/reports/custom/fields?serviceIds=${serviceIds.join(',')}`)

      if (!response.ok) {
        throw new Error('Failed to load custom fields')
      }

      const data = await response.json()
      setCustomFields(data.fields || [])
    } catch (error) {
      console.error('Error loading custom fields:', error)
      setCustomFields([])
    } finally {
      setLoadingFields(false)
    }
  }

  const loadServiceHierarchy = async () => {
    try {
      setLoadingHierarchy(true)
      const response = await fetch('/api/services/hierarchy')

      if (!response.ok) {
        throw new Error('Failed to load service hierarchy')
      }

      const data = await response.json()
      setServiceHierarchy(data.hierarchy || [])
    } catch (error) {
      console.error('Error loading service hierarchy:', error)
      setServiceHierarchy([])
    } finally {
      setLoadingHierarchy(false)
    }
  }

  const addFilter = () => {
    const newFilter: Filter = {
      id: Date.now().toString(),
      column: '',
      operator: 'equals',
      value: '',
      logicalOperator: localFilters.length > 0 ? 'AND' : undefined
    }
    const newFilters = [...localFilters, newFilter]
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const updateFilter = (id: string, updates: Partial<Filter>) => {
    const newFilters = localFilters.map(filter =>
      filter.id === id ? { ...filter, ...updates } : filter
    )
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const removeFilter = (id: string) => {
    const newFilters = localFilters.filter(filter => filter.id !== id)
    // Update logical operators
    if (newFilters.length > 0 && !newFilters[0].logicalOperator) {
      newFilters[0] = { ...newFilters[0], logicalOperator: undefined }
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const getAvailableColumns = () => {
    const baseColumns = []

    switch (module) {
      case 'TICKETS':
        baseColumns.push(
          { value: 'status', label: 'Status', category: 'Basic' },
          { value: 'priority', label: 'Priority', category: 'Basic' },
          { value: 'category', label: 'Category', category: 'Basic' },
          { value: 'createdAt', label: 'Created Date', category: 'Dates' },
          { value: 'resolvedAt', label: 'Resolved Date', category: 'Dates' },
          { value: 'closedAt', label: 'Closed Date', category: 'Dates' },
          { value: 'assignedTo', label: 'Assigned To', category: 'People' },
          { value: 'createdBy', label: 'Created By', category: 'People' },
          { value: 'branch', label: 'Branch', category: 'Location' },
          // Service hierarchy filters
          { value: 'serviceId', label: 'Service (Specific)', category: 'Service' },
          { value: 'service.tier1CategoryId', label: 'Service Category (Tier 1)', category: 'Service Hierarchy' },
          { value: 'service.tier2SubcategoryId', label: 'Service Subcategory (Tier 2)', category: 'Service Hierarchy' },
          { value: 'service.tier3ItemId', label: 'Service Item (Tier 3)', category: 'Service Hierarchy' },
          { value: 'service.supportGroupId', label: 'Support Group', category: 'Service Hierarchy' }
        )
        break
      default:
        break
    }

    // Add custom field columns
    const customFieldColumns = customFields.map(field => ({
      value: `customField_${field.id}`,
      label: `${field.serviceName ? `[${field.serviceName}] ` : ''}${field.label}`,
      category: 'Custom Fields',
      fieldType: field.type
    }))

    return [...baseColumns, ...customFieldColumns]
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Filter Criteria</h3>
          <p className="text-sm text-muted-foreground">
            Define filters to narrow down your report data
          </p>
        </div>
        <Button onClick={addFilter}>
          <Plus className="mr-2 h-4 w-4" />
          Add Filter
        </Button>
      </div>

      {localFilters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center">
              No filters applied. Click "Add Filter" to start filtering your data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {localFilters.map((filter, index) => (
            <Card key={filter.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {index > 0 && (
                    <Select
                      value={filter.logicalOperator}
                      onValueChange={(value) => updateFilter(filter.id, { logicalOperator: value as 'AND' | 'OR' })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <Select
                      value={filter.column}
                      onValueChange={(value) => updateFilter(filter.id, { column: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col.value} value={col.value}>
                            {col.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filter.operator}
                      onValueChange={(value) => updateFilter(filter.id, { operator: value })}
                      disabled={!filter.column}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {(operators[getColumnType(filter.column, customFields) as keyof typeof operators] || operators.string).map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FilterValue
                      column={filter.column}
                      operator={filter.operator}
                      value={filter.value}
                      onChange={(value) => updateFilter(filter.id, { value })}
                      customFields={customFields}
                      serviceHierarchy={serviceHierarchy}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFilter(filter.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {localFilters.length > 0 && (
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Filter Preview</h4>
          <code className="text-sm">
            {localFilters.map((filter, index) => (
              <span key={filter.id}>
                {index > 0 && (
                  <span className={filter.logicalOperator === 'AND' ? 'text-blue-600' : 'text-green-600'}>
                    {' '}{filter.logicalOperator}{' '}
                  </span>
                )}
                <span>
                  {filter.column} {filter.operator} {filter.value || '(empty)'}
                </span>
              </span>
            ))}
          </code>
        </div>
      )}
    </div>
  )
}

function FilterValue({
  column,
  operator,
  value,
  onChange,
  customFields = [],
  serviceHierarchy = []
}: {
  column: string
  operator: string
  value: any
  onChange: (value: any) => void
  customFields?: CustomField[]
  serviceHierarchy?: ServiceHierarchy[]
}) {
  const columnType = getColumnType(column, customFields)

  // No value needed for these operators
  if (['is_empty', 'is_not_empty', 'is_true', 'is_false', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'].includes(operator)) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">No value needed</div>
  }

  // Handle hierarchy filter values
  if (columnType === 'hierarchy') {
    return (
      <HierarchySelector
        column={column}
        operator={operator}
        value={value}
        onChange={onChange}
        serviceHierarchy={serviceHierarchy}
      />
    )
  }

  // Handle custom field values with their specific options
  if (column.startsWith('customField_')) {
    const fieldId = column.replace('customField_', '')
    const customField = customFields.find(f => f.id === fieldId)

    if (customField && customField.type.toUpperCase() === 'SELECT' && customField.options) {
      // Custom field with predefined options
      if (operator === 'in' || operator === 'not_in') {
        return (
          <CustomFieldMultiSelect
            options={customField.options}
            value={value}
            onChange={onChange}
          />
        )
      }
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(customField.options) ? (
              customField.options.map((opt: any) => (
                <SelectItem key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                  {typeof opt === 'string' ? opt : opt.label}
                </SelectItem>
              ))
            ) : null}
          </SelectContent>
        </Select>
      )
    }
  }

  if (columnType === 'date') {
    if (operator === 'between' || operator === 'not_between') {
      return (
        <div className="flex gap-2">
          <DatePicker value={value?.from} onChange={(date) => onChange({ ...value, from: date })} />
          <DatePicker value={value?.to} onChange={(date) => onChange({ ...value, to: date })} />
        </div>
      )
    }
    if (operator === 'in_last' || operator === 'in_next') {
      return (
        <div className="flex gap-2">
          <Input
            type="number"
            value={value?.amount || ''}
            onChange={(e) => onChange({ ...value, amount: e.target.value })}
            placeholder="Number"
            className="w-20"
          />
          <Select
            value={value?.unit || 'days'}
            onValueChange={(unit) => onChange({ ...value, unit })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="weeks">Weeks</SelectItem>
              <SelectItem value="months">Months</SelectItem>
              <SelectItem value="years">Years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    }
    return <DatePicker value={value} onChange={onChange} />
  }

  if (columnType === 'number') {
    if (operator === 'between' || operator === 'not_between') {
      return (
        <div className="flex gap-2">
          <Input
            type="number"
            value={value?.from || ''}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            placeholder="From"
          />
          <Input
            type="number"
            value={value?.to || ''}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            placeholder="To"
          />
        </div>
      )
    }
    return (
      <Input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter value"
      />
    )
  }

  if (columnType === 'enum') {
    if (operator === 'in' || operator === 'not_in') {
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Comma-separated values"
        />
      )
    }
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select value" />
        </SelectTrigger>
        <SelectContent>
          {getEnumValues(column).map(val => (
            <SelectItem key={val} value={val}>
              {val}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value"
    />
  )
}

function DatePicker({ value, onChange }: { value: Date | undefined, onChange: (date: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

function getEnumValues(column: string): string[] {
  switch (column) {
    case 'status':
      return ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED']
    case 'priority':
      return ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY']
    case 'category':
      return ['INCIDENT', 'REQUEST', 'PROBLEM', 'CHANGE']
    default:
      return []
  }
}

// Hierarchy Selector Component for service hierarchy filters
function HierarchySelector({
  column,
  operator,
  value,
  onChange,
  serviceHierarchy
}: {
  column: string
  operator: string
  value: any
  onChange: (value: any) => void
  serviceHierarchy: ServiceHierarchy[]
}) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    Array.isArray(value) ? value : value ? [value] : []
  )
  const [isOpen, setIsOpen] = useState(false)

  // Determine what level we're filtering by
  const getHierarchyLevel = (column: string): number => {
    if (column === 'serviceId') return 0
    if (column === 'service.tier1CategoryId') return 1
    if (column === 'service.tier2SubcategoryId') return 2
    if (column === 'service.tier3ItemId') return 3
    if (column === 'service.supportGroupId') return 0
    return 1
  }

  const level = getHierarchyLevel(column)

  // Build flat list of items based on hierarchy level
  const getHierarchyItems = (): Array<{ id: string; name: string; parent?: string }> => {
    const items: Array<{ id: string; name: string; parent?: string }> = []

    if (level === 1) {
      // Tier 1 Categories
      serviceHierarchy.forEach(cat => {
        items.push({ id: cat.id, name: cat.name })
      })
    } else if (level === 2) {
      // Tier 2 Subcategories
      serviceHierarchy.forEach(cat => {
        cat.subcategories?.forEach(sub => {
          items.push({ id: sub.id, name: `${cat.name} > ${sub.name}`, parent: cat.name })
        })
      })
    } else if (level === 3) {
      // Tier 3 Items
      serviceHierarchy.forEach(cat => {
        cat.subcategories?.forEach(sub => {
          sub.items?.forEach(item => {
            items.push({
              id: item.id,
              name: `${cat.name} > ${sub.name} > ${item.name}`,
              parent: `${cat.name} > ${sub.name}`
            })
          })
        })
      })
    }

    return items
  }

  const items = getHierarchyItems()

  const handleValueChange = (selectedIds: string[]) => {
    setSelectedCategories(selectedIds)

    if (operator === 'in' || operator === 'not_in') {
      onChange(selectedIds)
    } else {
      onChange(selectedIds[0] || '')
    }
  }

  const handleToggle = (itemId: string) => {
    if (operator === 'in' || operator === 'not_in') {
      // Multi-select for 'in' and 'not_in'
      const newSelection = selectedCategories.includes(itemId)
        ? selectedCategories.filter(id => id !== itemId)
        : [...selectedCategories, itemId]
      handleValueChange(newSelection)
    } else {
      // Single select for 'equals'
      handleValueChange([itemId])
      setIsOpen(false)
    }
  }

  const getDisplayText = () => {
    if (selectedCategories.length === 0) return 'Select...'
    if (selectedCategories.length === 1) {
      const item = items.find(i => i.id === selectedCategories[0])
      return item?.name || 'Selected'
    }
    return `${selectedCategories.length} selected`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="justify-between"
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <ScrollArea className="h-[300px]">
          <div className="p-4 space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedCategories.includes(item.id)}
                  onCheckedChange={() => handleToggle(item.id)}
                  id={`hier-${item.id}`}
                />
                <Label
                  htmlFor={`hier-${item.id}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {item.name}
                </Label>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No items available
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

// Custom Field Multi-Select Component
function CustomFieldMultiSelect({
  options,
  value,
  onChange
}: {
  options: any
  value: any
  onChange: (value: any) => void
}) {
  const [selectedValues, setSelectedValues] = useState<string[]>(
    Array.isArray(value) ? value : value ? value.split(',') : []
  )
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = (optValue: string) => {
    const newSelection = selectedValues.includes(optValue)
      ? selectedValues.filter(v => v !== optValue)
      : [...selectedValues, optValue]

    setSelectedValues(newSelection)
    onChange(newSelection)
  }

  const optionsArray = Array.isArray(options) ? options : []

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="justify-between"
        >
          {selectedValues.length === 0
            ? 'Select values...'
            : `${selectedValues.length} selected`}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <ScrollArea className="h-[200px]">
          <div className="p-4 space-y-2">
            {optionsArray.map((opt: any) => {
              const optValue = typeof opt === 'string' ? opt : opt.value
              const optLabel = typeof opt === 'string' ? opt : opt.label

              return (
                <div key={optValue} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedValues.includes(optValue)}
                    onCheckedChange={() => handleToggle(optValue)}
                    id={`opt-${optValue}`}
                  />
                  <Label
                    htmlFor={`opt-${optValue}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {optLabel}
                  </Label>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}