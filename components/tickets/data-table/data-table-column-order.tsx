'use client'

import React, { useState, useEffect } from 'react'
import { Table } from '@tanstack/react-table'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Column {
  id: string
  label: string
  visible: boolean
}

interface DataTableColumnOrderProps<TData> {
  table: Table<TData>
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SortableItem({ column, onToggle }: { column: Column; onToggle: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-lg border ${
        column.visible 
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
          : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60'
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-3">
        <button
          className="cursor-grab hover:text-blue-600 dark:hover:text-blue-400"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{column.label}</span>
      </div>
      <Switch
        checked={column.visible}
        onCheckedChange={() => onToggle(column.id)}
      />
    </div>
  )
}

export function DataTableColumnOrder<TData>({
  table,
  open,
  onOpenChange,
}: DataTableColumnOrderProps<TData>) {
  const [columns, setColumns] = useState<Column[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Initialize columns from table
  useEffect(() => {
    // Load saved visibility from localStorage
    const savedVisibility = localStorage.getItem('ticketTableColumnVisibility')
    let visibilityState: Record<string, boolean> = {}
    if (savedVisibility) {
      try {
        visibilityState = JSON.parse(savedVisibility)
      } catch (e) {
        console.error('Failed to parse saved visibility:', e)
      }
    }
    
    const tableColumns = table.getAllColumns()
      .filter(col => typeof col.accessorFn !== 'undefined' || col.id === 'actions' || col.id === 'claim' || col.id === 'select')
      .map(col => ({
        id: col.id,
        label: formatColumnLabel(col.id),
        visible: visibilityState[col.id] !== undefined ? visibilityState[col.id] : col.getIsVisible(),
      }))
    
    // Load saved order from localStorage
    const savedOrder = localStorage.getItem('ticketTableColumnOrder')
    if (savedOrder) {
      try {
        let parsedOrder = JSON.parse(savedOrder)
        
        // Extract select column if it exists
        const selectColumn = tableColumns.find(col => col.id === 'select')
        const otherColumns = tableColumns.filter(col => col.id !== 'select')
        
        // Merge saved order with current columns (excluding select)
        const orderedColumns = parsedOrder
          .filter((id: string) => id !== 'select')
          .map((id: string) => otherColumns.find(col => col.id === id))
          .filter(Boolean)
        
        // Add any new columns that aren't in saved order
        const newColumns = otherColumns.filter(
          col => !parsedOrder.includes(col.id)
        )
        
        // Put select column first if it exists
        const finalColumns = selectColumn 
          ? [selectColumn, ...orderedColumns, ...newColumns]
          : [...orderedColumns, ...newColumns]
        
        setColumns(finalColumns)
      } catch (e) {
        // On error, ensure select column is first if it exists
        const selectColumn = tableColumns.find(col => col.id === 'select')
        const otherColumns = tableColumns.filter(col => col.id !== 'select')
        setColumns(selectColumn ? [selectColumn, ...otherColumns] : tableColumns)
      }
    } else {
      // No saved order, ensure select column is first if it exists
      const selectColumn = tableColumns.find(col => col.id === 'select')
      const otherColumns = tableColumns.filter(col => col.id !== 'select')
      setColumns(selectColumn ? [selectColumn, ...otherColumns] : tableColumns)
    }
  }, [table])

  const formatColumnLabel = (id: string): string => {
    // Handle nested column IDs
    if (id.includes('.')) {
      const parts = id.split('.')
      return parts[parts.length - 1]
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
    }
    
    // Handle special cases
    const labelMap: Record<string, string> = {
      select: 'Select',
      ticketNumber: 'Ticket #',
      createdAt: 'Created Date',
      updatedAt: 'Updated Date',
      assignedTo: 'Assigned To',
      createdBy: 'Created By',
      _count: 'Comments',
    }
    
    return labelMap[id] || 
      id.replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        const newOrder = arrayMove(items, oldIndex, newIndex)
        setHasChanges(true)
        return newOrder
      })
    }
  }

  const handleToggle = (id: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === id ? { ...col, visible: !col.visible } : col
      )
    )
    setHasChanges(true)
  }

  const handleShowAll = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })))
    setHasChanges(true)
  }

  const handleHideAll = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: false })))
    setHasChanges(true)
  }

  const handleReset = () => {
    localStorage.removeItem('ticketTableColumnOrder')
    localStorage.removeItem('ticketTableColumnVisibility')
    // Reset to default order
    const tableColumns = table.getAllColumns()
      .filter(col => typeof col.accessorFn !== 'undefined' || col.id === 'actions' || col.id === 'claim' || col.id === 'select')
      .map(col => ({
        id: col.id,
        label: formatColumnLabel(col.id),
        visible: true,
      }))
    setColumns(tableColumns)
    setHasChanges(true)
  }

  const handleApply = () => {
    // Save column order
    const columnOrder = columns.map(col => col.id)
    localStorage.setItem('ticketTableColumnOrder', JSON.stringify(columnOrder))
    
    // Save column visibility
    const visibilityState: Record<string, boolean> = {}
    columns.forEach(col => {
      visibilityState[col.id] = col.visible
    })
    localStorage.setItem('ticketTableColumnVisibility', JSON.stringify(visibilityState))
    
    // Apply visibility changes to table
    columns.forEach(col => {
      const tableColumn = table.getColumn(col.id)
      if (tableColumn) {
        tableColumn.toggleVisibility(col.visible)
      }
    })
    
    // Apply column order to table
    table.setColumnOrder(columnOrder)
    
    setHasChanges(false)
    onOpenChange(false)
  }

  const handleCancel = () => {
    // Restore original state
    const tableColumns = table.getAllColumns()
      .filter(col => typeof col.accessorFn !== 'undefined' || col.id === 'actions' || col.id === 'claim' || col.id === 'select')
      .map(col => ({
        id: col.id,
        label: formatColumnLabel(col.id),
        visible: col.getIsVisible(),
      }))
    setColumns(tableColumns)
    setHasChanges(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Customize Columns</DialogTitle>
          <DialogDescription>
            Drag to reorder columns and toggle visibility. Your preferences will be saved.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowAll}
              >
                <Eye className="h-3 w-3 mr-1" />
                Show All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleHideAll}
              >
                <EyeOff className="h-3 w-3 mr-1" />
                Hide All
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>

          {/* Draggable column list */}
          <ScrollArea className="h-[400px] rounded-lg border p-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columns.map(col => col.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {columns.map((column) => (
                    <SortableItem
                      key={column.id}
                      column={column}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!hasChanges}>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}