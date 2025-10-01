'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Moon, Sun, Coffee, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

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

interface DraggableShiftCalendarProps {
  year: number;
  month: number;
  assignments: ShiftAssignment[];
  holidays: Array<{
    date: string;
    name: string;
  }>;
  onAssignmentUpdate: (assignmentId: string, newStaffProfileId: string) => Promise<void>;
  editable?: boolean;
}

const shiftTypeConfig = {
  NIGHT: { label: 'Night', icon: Moon, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
  SATURDAY_DAY: { label: 'Sat Day', icon: Sun, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  SUNDAY_DAY: { label: 'Sun Day', icon: Sun, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  OFF: { label: 'Off', icon: Coffee, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  LEAVE: { label: 'Leave', icon: Calendar, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  HOLIDAY: { label: 'Holiday', icon: Calendar, color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
};

function DroppableDay({
  day,
  date,
  dateStr,
  assignments,
  isWeekend,
  holiday,
  children,
}: {
  day: number;
  date: Date;
  dateStr: string;
  assignments: ShiftAssignment[];
  isWeekend: boolean;
  holiday?: { name: string };
  children: React.ReactNode;
}) {
  return (
    <div
      data-day={day}
      data-date={dateStr}
      className={`min-h-32 p-2 border rounded-lg ${
        isWeekend ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
      } ${holiday ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}
    >
      <div className="font-semibold text-sm mb-1">{day}</div>
      {holiday && (
        <div className="text-xs text-red-600 dark:text-red-400 mb-1">
          {holiday.name}
        </div>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DraggableShiftChip({ assignment, editable }: { assignment: ShiftAssignment; editable: boolean }) {
  const config = shiftTypeConfig[assignment.shiftType as keyof typeof shiftTypeConfig];
  const Icon = config?.icon || Clock;

  return (
    <div
      draggable={editable && assignment.shiftType !== 'OFF' && assignment.shiftType !== 'LEAVE' && assignment.shiftType !== 'HOLIDAY'}
      onDragStart={(e) => {
        if (!editable) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('application/json', JSON.stringify({
          assignmentId: assignment.id,
          staffProfileId: assignment.staffProfile.id,
          staffName: assignment.staffProfile.user.name,
          shiftType: assignment.shiftType,
          sourceDate: assignment.date,
        }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`text-xs p-1.5 rounded ${config?.color} ${
        editable && assignment.shiftType !== 'OFF' && assignment.shiftType !== 'LEAVE' && assignment.shiftType !== 'HOLIDAY'
          ? 'cursor-move hover:opacity-80 transition-opacity'
          : 'cursor-default'
      }`}
      title={`${assignment.staffProfile.user.name} - ${config?.label}${editable ? ' (Drag to reassign)' : ''}`}
    >
      <div className="flex items-center gap-1">
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate font-medium">{assignment.staffProfile.user.name.split(' ')[0]}</span>
      </div>
    </div>
  );
}

export function DraggableShiftCalendar({
  year,
  month,
  assignments,
  holidays,
  onAssignmentUpdate,
  editable = false,
}: DraggableShiftCalendarProps) {
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  // Group assignments by date
  const assignmentsByDate = assignments.reduce((acc, assignment) => {
    const date = new Date(assignment.date).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(assignment);
    return acc;
  }, {} as Record<string, ShiftAssignment[]>);

  const handleDragOver = (e: React.DragEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDay: number, targetDateStr: string) => {
    if (!editable || updating) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json'));

    if (data.sourceDate === targetDateStr) {
      toast.info('Staff is already assigned to this date');
      return;
    }

    // Find target assignment with same shift type on target date
    const targetAssignments = assignmentsByDate[targetDateStr] || [];
    const targetAssignment = targetAssignments.find(a => a.shiftType === data.shiftType);

    if (!targetAssignment) {
      toast.error('No matching shift type found on target date');
      return;
    }

    // Swap: update both assignments
    setUpdating(true);
    try {
      // Update target to source's staff
      await onAssignmentUpdate(targetAssignment.id, data.staffProfileId);
      toast.success(`Swapped ${data.staffName} to ${targetDateStr}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update assignment');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Drag & Drop:</strong> Drag a staff name to another date with the same shift type to swap assignments.
            OFF, LEAVE, and HOLIDAY shifts cannot be moved.
          </p>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-sm text-gray-600 dark:text-gray-400 p-2">
            {day}
          </div>
        ))}

        {/* Empty cells for first week */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="p-2" />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month - 1, day);
          const dateStr = date.toISOString().split('T')[0];
          const dayAssignments = assignmentsByDate[dateStr] || [];
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const holiday = holidays.find(h =>
            new Date(h.date).toISOString().split('T')[0] === dateStr
          );

          return (
            <div
              key={day}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day, dateStr)}
            >
              <DroppableDay
                day={day}
                date={date}
                dateStr={dateStr}
                assignments={dayAssignments}
                isWeekend={isWeekend}
                holiday={holiday}
              >
                {dayAssignments.map(assignment => (
                  <DraggableShiftChip
                    key={assignment.id}
                    assignment={assignment}
                    editable={editable}
                  />
                ))}
              </DroppableDay>
            </div>
          );
        })}
      </div>
    </div>
  );
}
