'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Settings2,
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  X
} from 'lucide-react'

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  width?: string
  sortable?: boolean
  required?: boolean // Some columns can't be hidden
}

interface ColumnCustomizerProps {
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
  storageKey?: string
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ticketNumber', label: 'Ticket #', visible: true, width: '5rem', sortable: true, required: true },
  { id: 'title', label: 'Title', visible: true, width: '20rem', sortable: true, required: true },
  { id: 'status', label: 'Status', visible: true, width: '5rem', sortable: false },
  { id: 'priority', label: 'Priority', visible: true, width: '5rem', sortable: true },
  { id: 'assignedTo', label: 'Assigned To', visible: true, width: '6rem', sortable: false },
  { id: 'service', label: 'Service', visible: true, width: '8rem', sortable: false },
  { id: 'branch', label: 'Branch', visible: true, width: '10rem', sortable: false },
  { id: 'createdBy', label: 'Created By', visible: false, width: '6rem', sortable: false },
  { id: 'createdAt', label: 'Created', visible: true, width: '5rem', sortable: true },
  { id: 'updatedAt', label: 'Updated', visible: false, width: '5rem', sortable: true },
  { id: 'comments', label: 'Comments', visible: false, width: '4rem', sortable: false },
  { id: 'actions', label: 'Actions', visible: true, width: '8rem', sortable: false, required: true }
]

export function ColumnCustomizer({ 
  columns: initialColumns = DEFAULT_COLUMNS, 
  onColumnsChange,
  storageKey = 'ticket-table-columns'
}: ColumnCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [columns, setColumns] = useState<ColumnConfig[]>(initialColumns)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null)

  // Sync internal state with props when dialog opens
  useEffect(() => {
    if (isOpen) {
      setColumns(initialColumns)
    }
  }, [isOpen, initialColumns])

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDraggedOverIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && draggedOverIndex !== null && draggedIndex !== draggedOverIndex) {
      const newColumns = [...columns]
      const [draggedColumn] = newColumns.splice(draggedIndex, 1)
      newColumns.splice(draggedOverIndex, 0, draggedColumn)
      setColumns(newColumns)
    }
    setDraggedIndex(null)
    setDraggedOverIndex(null)
  }

  const handleToggleVisibility = (columnId: string) => {
    const newColumns = columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    )
    setColumns(newColumns)
  }

  const handleReset = () => {
    setColumns(initialColumns)
    localStorage.removeItem(storageKey)
  }

  const handleSave = () => {
    onColumnsChange(columns)
    setIsOpen(false)
  }

  const visibleCount = columns.filter(c => c.visible).length
  const totalCount = columns.filter(c => !c.required).length

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white/[0.5] dark:bg-gray-800/[0.5]"
        >
          <Settings2 className="h-4 w-4 mr-2" />
          Customize Columns
          <Badge variant="secondary" className="ml-2">
            {visibleCount}/{totalCount}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Customize Table Columns</DialogTitle>
          <DialogDescription>
            Drag to reorder columns and toggle visibility. Required columns cannot be hidden.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
          {columns.map((column, index) => (
            <div
              key={column.id}
              draggable={!column.required}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center justify-between p-3 rounded-lg border
                ${column.required ? 'opacity-75 cursor-not-allowed' : 'cursor-move'}
                ${draggedOverIndex === index ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
                ${column.visible ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/50'}
                hover:border-gray-300 dark:hover:border-gray-600 transition-all
              `}
            >
              <div className="flex items-center gap-3">
                {!column.required && (
                  <GripVertical className="h-4 w-4 text-gray-400" />
                )}
                <Checkbox
                  checked={column.visible}
                  onCheckedChange={() => handleToggleVisibility(column.id)}
                  disabled={column.required}
                  className="border-gray-300"
                />
                <span className={`text-sm font-medium ${!column.visible ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                  {column.label}
                </span>
                {column.required && (
                  <Badge variant="outline" className="text-xs">
                    Required
                  </Badge>
                )}
                {column.sortable && (
                  <Badge variant="secondary" className="text-xs">
                    Sortable
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {column.visible ? (
                  <Eye className="h-4 w-4 text-gray-400" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-red-600 hover:text-red-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { DEFAULT_COLUMNS }