'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { 
  Plus, 
  X, 
  Calendar as CalendarIcon,
  Filter,
  ChevronDown
} from 'lucide-react'

interface Filter {
  id: string
  column: string
  operator: string
  value: any
  logicalOperator?: 'AND' | 'OR'
}

interface FilterBuilderProps {
  module: string
  filters: Filter[]
  onFiltersChange: (filters: Filter[]) => void
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
  ]
}

const getColumnType = (column: string): string => {
  // This should be determined based on the actual column metadata
  if (column.includes('date') || column.includes('At')) return 'date'
  if (column.includes('id') || column.includes('Time') || column.includes('duration')) return 'number'
  if (column === 'status' || column === 'priority' || column === 'category') return 'enum'
  if (column.includes('is') || column.includes('has')) return 'boolean'
  return 'string'
}

export function FilterBuilder({ module, filters, onFiltersChange }: FilterBuilderProps) {
  const [localFilters, setLocalFilters] = useState<Filter[]>(filters)

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
    // This should be based on the actual module columns
    switch (module) {
      case 'TICKETS':
        return [
          { value: 'status', label: 'Status' },
          { value: 'priority', label: 'Priority' },
          { value: 'category', label: 'Category' },
          { value: 'createdAt', label: 'Created Date' },
          { value: 'resolvedAt', label: 'Resolved Date' },
          { value: 'assignedTo', label: 'Assigned To' },
          { value: 'branch', label: 'Branch' },
          { value: 'service', label: 'Service' }
        ]
      default:
        return []
    }
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
                        {(operators[getColumnType(filter.column) as keyof typeof operators] || operators.string).map(op => (
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

function FilterValue({ column, operator, value, onChange }: {
  column: string
  operator: string
  value: any
  onChange: (value: any) => void
}) {
  const columnType = getColumnType(column)

  // No value needed for these operators
  if (['is_empty', 'is_not_empty', 'is_true', 'is_false', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'].includes(operator)) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">No value needed</div>
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
      return ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    case 'category':
      return ['INCIDENT', 'REQUEST', 'PROBLEM', 'CHANGE']
    default:
      return []
  }
}