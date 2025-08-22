'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  GripVertical, 
  ChevronRight, 
  ChevronLeft, 
  Search,
  X,
  Plus,
  Columns,
  Eye,
  EyeOff
} from 'lucide-react'

interface Column {
  id: string
  name: string
  label: string
  type: string
  category: string
}

interface ColumnSelectorProps {
  module: string
  selectedColumns: string[]
  onColumnsChange: (columns: string[]) => void
}

// Define available columns for each module
const getModuleColumns = (module: string): Column[] => {
  const baseColumns: Column[] = [
    { id: 'id', name: 'id', label: 'ID', type: 'number', category: 'Basic' },
    { id: 'createdAt', name: 'createdAt', label: 'Created Date', type: 'date', category: 'Basic' },
    { id: 'updatedAt', name: 'updatedAt', label: 'Updated Date', type: 'date', category: 'Basic' }
  ]

  switch (module) {
    case 'TICKETS':
      return [
        ...baseColumns,
        { id: 'ticketNumber', name: 'ticketNumber', label: 'Ticket Number', type: 'string', category: 'Basic' },
        { id: 'title', name: 'title', label: 'Title', type: 'string', category: 'Basic' },
        { id: 'description', name: 'description', label: 'Description', type: 'string', category: 'Basic' },
        { id: 'status', name: 'status', label: 'Status', type: 'enum', category: 'Status' },
        { id: 'priority', name: 'priority', label: 'Priority', type: 'enum', category: 'Status' },
        { id: 'category', name: 'category', label: 'Category', type: 'enum', category: 'Classification' },
        { id: 'service.name', name: 'service.name', label: 'Service', type: 'string', category: 'Service' },
        { id: 'createdBy.name', name: 'createdBy.name', label: 'Created By', type: 'string', category: 'People' },
        { id: 'assignedTo.name', name: 'assignedTo.name', label: 'Assigned To', type: 'string', category: 'People' },
        { id: 'branch.name', name: 'branch.name', label: 'Branch', type: 'string', category: 'Location' },
        { id: 'supportGroup.name', name: 'supportGroup.name', label: 'Support Group', type: 'string', category: 'Assignment' },
        { id: 'resolvedAt', name: 'resolvedAt', label: 'Resolved Date', type: 'date', category: 'Dates' },
        { id: 'closedAt', name: 'closedAt', label: 'Closed Date', type: 'date', category: 'Dates' },
        { id: 'responseTime', name: 'responseTime', label: 'Response Time', type: 'number', category: 'SLA' },
        { id: 'resolutionTime', name: 'resolutionTime', label: 'Resolution Time', type: 'number', category: 'SLA' },
        { id: 'isConfidential', name: 'isConfidential', label: 'Confidential', type: 'boolean', category: 'Flags' },
        { id: 'rootCause', name: 'rootCause', label: 'Root Cause', type: 'string', category: 'Analysis' }
      ]
    case 'TIME_SPENT':
      return [
        ...baseColumns,
        { id: 'ticketId', name: 'ticketId', label: 'Ticket ID', type: 'string', category: 'Reference' },
        { id: 'userId', name: 'userId', label: 'User', type: 'string', category: 'People' },
        { id: 'duration', name: 'duration', label: 'Duration (minutes)', type: 'number', category: 'Time' },
        { id: 'activity', name: 'activity', label: 'Activity', type: 'string', category: 'Basic' },
        { id: 'date', name: 'date', label: 'Date', type: 'date', category: 'Dates' }
      ]
    case 'TASKS':
      return [
        ...baseColumns,
        { id: 'title', name: 'title', label: 'Task Title', type: 'string', category: 'Basic' },
        { id: 'status', name: 'status', label: 'Status', type: 'enum', category: 'Status' },
        { id: 'assignedTo.name', name: 'assignedTo.name', label: 'Assigned To', type: 'string', category: 'People' },
        { id: 'dueDate', name: 'dueDate', label: 'Due Date', type: 'date', category: 'Dates' },
        { id: 'completedAt', name: 'completedAt', label: 'Completed Date', type: 'date', category: 'Dates' },
        { id: 'ticket.ticketNumber', name: 'ticket.ticketNumber', label: 'Ticket', type: 'string', category: 'Reference' }
      ]
    default:
      return baseColumns
  }
}

export function ColumnSelector({ module, selectedColumns, onColumnsChange }: ColumnSelectorProps) {
  const [availableColumns, setAvailableColumns] = useState<Column[]>([])
  const [displayColumns, setDisplayColumns] = useState<string[]>(selectedColumns)
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  useEffect(() => {
    const columns = getModuleColumns(module)
    setAvailableColumns(columns)
  }, [module])

  const categories = ['All', ...new Set(availableColumns.map(col => col.category))]

  const filteredColumns = availableColumns.filter(col => {
    const matchesSearch = col.label.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || col.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleAddColumn = (columnId: string) => {
    if (!displayColumns.includes(columnId)) {
      const newColumns = [...displayColumns, columnId]
      setDisplayColumns(newColumns)
      onColumnsChange(newColumns)
    }
  }

  const handleRemoveColumn = (columnId: string) => {
    const newColumns = displayColumns.filter(id => id !== columnId)
    setDisplayColumns(newColumns)
    onColumnsChange(newColumns)
  }

  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (!draggedColumn) return

    const draggedIndex = displayColumns.indexOf(draggedColumn)
    if (draggedIndex === -1) {
      // Adding from available columns
      const newColumns = [...displayColumns]
      newColumns.splice(targetIndex, 0, draggedColumn)
      setDisplayColumns(newColumns)
      onColumnsChange(newColumns)
    } else {
      // Reordering existing columns
      const newColumns = [...displayColumns]
      newColumns.splice(draggedIndex, 1)
      newColumns.splice(targetIndex, 0, draggedColumn)
      setDisplayColumns(newColumns)
      onColumnsChange(newColumns)
    }
    setDraggedColumn(null)
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Available Columns */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Columns</CardTitle>
            <div className="space-y-3 mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredColumns.map(column => (
                  <div
                    key={column.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, column.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border hover:bg-accent cursor-move ${
                      displayColumns.includes(column.id) ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{column.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {column.category} • {column.type}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddColumn(column.id)}
                      disabled={displayColumns.includes(column.id)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Display Columns */}
      <div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Display Columns</CardTitle>
              <span className="text-sm text-muted-foreground">
                {displayColumns.length} selected
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {displayColumns.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Columns className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No columns selected. Drag columns from the left or click the arrow to add them.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayColumns.map((columnId, index) => {
                    const column = availableColumns.find(c => c.id === columnId)
                    if (!column) return null

                    return (
                      <div
                        key={columnId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, columnId)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent cursor-move"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">{column.label}</div>
                            <div className="text-xs text-muted-foreground">
                              Position: {index + 1}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              // Toggle visibility (for future implementation)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveColumn(columnId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}