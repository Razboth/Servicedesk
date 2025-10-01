'use client';

import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Moon, Sun, Coffee, Calendar, Clock, AlertTriangle } from 'lucide-react';

interface ShiftAssignment {
  id: string;
  date: string;
  shiftType: string;
  staffProfile: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
}

const shiftTypeConfig = {
  NIGHT: { label: 'Night', icon: Moon, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300', borderColor: 'border-indigo-300 dark:border-indigo-700' },
  SATURDAY_DAY: { label: 'Sat Day', icon: Sun, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', borderColor: 'border-blue-300 dark:border-blue-700' },
  SATURDAY_NIGHT: { label: 'Sat Night', icon: Moon, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', borderColor: 'border-purple-300 dark:border-purple-700' },
  SUNDAY_DAY: { label: 'Sun Day', icon: Sun, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', borderColor: 'border-orange-300 dark:border-orange-700' },
  SUNDAY_NIGHT: { label: 'Sun Night', icon: Moon, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300', borderColor: 'border-pink-300 dark:border-pink-700' },
  ON_CALL: { label: 'On-Call', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', borderColor: 'border-yellow-300 dark:border-yellow-700' },
  OFF: { label: 'Off', icon: Coffee, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', borderColor: 'border-gray-300 dark:border-gray-700' },
  LEAVE: { label: 'Leave', icon: Calendar, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', borderColor: 'border-red-300 dark:border-red-700' },
  HOLIDAY: { label: 'Holiday', icon: Calendar, color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', borderColor: 'border-green-300 dark:border-green-700' },
};

interface DraggableAssignmentChipProps {
  assignment: ShiftAssignment;
  editable: boolean;
  hasWarning?: boolean;
}

export function DraggableAssignmentChip({
  assignment,
  editable,
  hasWarning,
}: DraggableAssignmentChipProps) {
  const config = shiftTypeConfig[assignment.shiftType as keyof typeof shiftTypeConfig];
  const Icon = config?.icon || Clock;

  const isDraggableShift = editable && !['OFF', 'LEAVE', 'HOLIDAY'].includes(assignment.shiftType);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `assignment-${assignment.id}`,
    data: {
      type: 'assignment',
      assignmentId: assignment.id,
      staffId: assignment.staffProfile.id,
      staffName: assignment.staffProfile.user.name,
      shiftType: assignment.shiftType,
      sourceDate: new Date(assignment.date).toISOString().split('T')[0],
    },
    disabled: !isDraggableShift,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative text-xs p-1.5 rounded transition-all
        ${config?.color}
        ${isDraggableShift
          ? 'cursor-move hover:opacity-80 hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-600'
          : 'cursor-default'
        }
        ${isDragging ? 'ring-2 ring-blue-500 shadow-lg' : ''}
        ${hasWarning ? 'ring-2 ring-yellow-400 dark:ring-yellow-600' : ''}
      `}
      title={`${assignment.staffProfile.user.name} - ${config?.label}${isDraggableShift ? ' (Drag to swap)' : ''}`}
      {...(isDraggableShift ? { ...listeners, ...attributes } : {})}
    >
      <div className="flex items-center gap-1">
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate font-medium">
          {assignment.staffProfile.user.name.split(' ')[0]}
        </span>
        {hasWarning && <AlertTriangle className="w-3 h-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />}
      </div>
    </div>
  );
}

interface ShiftDropZoneProps {
  id: string;
  shiftType: string;
  date: string;
  dateStr: string;
  assignment?: ShiftAssignment;
  editable: boolean;
  maxSlots?: number;
  slotIndex?: number;
  isRequired?: boolean;
  validationError?: string;
  onAssign?: (staffId: string, shiftType: string, date: string) => void;
}

export function ShiftDropZone({
  id,
  shiftType,
  date,
  dateStr,
  assignment,
  editable,
  maxSlots = 1,
  slotIndex = 0,
  isRequired = false,
  validationError,
}: ShiftDropZoneProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: {
      type: 'shift-slot',
      shiftType,
      date: dateStr,
      currentAssignment: assignment,
    },
    disabled: !editable,
  });

  const config = shiftTypeConfig[shiftType as keyof typeof shiftTypeConfig];
  const Icon = config?.icon || Clock;

  // Check if dragging item is valid for this slot
  const canAcceptDrop = active && (
    active.data.current?.type === 'staff' ||
    active.data.current?.type === 'assignment'
  );

  const isEmpty = !assignment;
  const hasError = !!validationError;

  return (
    <div
      ref={setNodeRef}
      className={`
        relative min-h-[36px] p-1.5 rounded border-2 transition-all
        ${isEmpty
          ? 'border-dashed'
          : 'border-solid'
        }
        ${config?.borderColor}
        ${isEmpty && editable
          ? 'bg-gray-50 dark:bg-gray-800/50'
          : ''
        }
        ${isOver && canAcceptDrop
          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 scale-105 shadow-lg'
          : ''
        }
        ${hasError
          ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
          : ''
        }
        ${isRequired && isEmpty && !isOver
          ? 'border-yellow-400 dark:border-yellow-600'
          : ''
        }
      `}
      title={validationError || (isEmpty ? `Drop staff here for ${config?.label}` : '')}
    >
      {isEmpty ? (
        <div className="flex items-center justify-center gap-1 text-xs text-gray-400 dark:text-gray-600">
          <Icon className="w-3 h-3" />
          <span className="hidden sm:inline">
            {config?.label}
            {maxSlots > 1 && ` #${slotIndex + 1}`}
          </span>
        </div>
      ) : (
        <DraggableAssignmentChip
          assignment={assignment}
          editable={editable}
          hasWarning={hasError}
        />
      )}

      {/* Drop indicator */}
      {isOver && canAcceptDrop && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-500 dark:border-blue-400 rounded pointer-events-none animate-pulse" />
      )}

      {/* Validation error indicator */}
      {hasError && (
        <div className="absolute -top-1 -right-1">
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
      )}
    </div>
  );
}
