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
  DragOverEvent,
} from '@dnd-kit/core';
import { Moon, Sun, Coffee, Calendar, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ShiftDropZone, DraggableAssignmentChip } from './shift-drop-zone';

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
  onAssignmentUpdate?: (assignmentId: string, newStaffProfileId: string, skipRefresh?: boolean) => Promise<void>;
  onAssignmentCreate?: (staffId: string, shiftType: string, date: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  editable?: boolean;
  validationErrors?: Record<string, string>;
  skipDndContext?: boolean; // If true, assumes parent provides DndContext
  showWeekendNights?: boolean; // If true, shows weekend night shift slots (for shift builder)
}

// Helper function to get shift slots for a day
function getDayShiftSlots(date: Date, isWeekend: boolean, showWeekendNights: boolean = true): Array<{ type: string; maxSlots: number; isRequired: boolean }> {
  const dayOfWeek = date.getDay();
  const slots: Array<{ type: string; maxSlots: number; isRequired: boolean }> = [];

  if (isWeekend) {
    // Saturday
    if (dayOfWeek === 6) {
      slots.push({ type: 'SATURDAY_DAY', maxSlots: 2, isRequired: true });
      if (showWeekendNights) {
        slots.push({ type: 'SATURDAY_NIGHT', maxSlots: 1, isRequired: false });
      }
    }
    // Sunday
    else if (dayOfWeek === 0) {
      slots.push({ type: 'SUNDAY_DAY', maxSlots: 2, isRequired: true });
      if (showWeekendNights) {
        slots.push({ type: 'SUNDAY_NIGHT', maxSlots: 1, isRequired: false });
      }
    }
  } else {
    // Weekday night shift (only one slot)
    slots.push({ type: 'NIGHT', maxSlots: 1, isRequired: false });
  }

  // ON_CALL can be assigned any day (weekday or weekend)
  slots.push({ type: 'ON_CALL', maxSlots: 1, isRequired: false });

  return slots;
}

export function DraggableShiftCalendar({
  year,
  month,
  assignments,
  holidays,
  onAssignmentUpdate,
  onAssignmentCreate,
  onRefresh,
  editable = false,
  validationErrors = {},
  skipDndContext = false,
  showWeekendNights = true,
}: DraggableShiftCalendarProps) {
  const [activeItem, setActiveItem] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  // Group assignments by date
  const assignmentsByDate = assignments.reduce((acc, assignment) => {
    const date = new Date(assignment.date).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(assignment);
    return acc;
  }, {} as Record<string, ShiftAssignment[]>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(event.active.data.current);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || !editable || updating) {
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) {
      return;
    }

    try {
      setUpdating(true);

      // Case 1: Dragging from staff pool to shift slot
      if (activeData.type === 'staff' && overData.type === 'shift-slot') {
        if (onAssignmentCreate) {
          await onAssignmentCreate(activeData.staffId, overData.shiftType, overData.date);
          // Format date properly for display (parse ISO string and format as locale date)
          const displayDate = new Date(overData.date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
          toast.success(`Assigned ${activeData.staffName} to ${overData.shiftType} on ${displayDate}`);
        } else {
          toast.error('Assignment creation not available');
        }
      }

      // Case 2: Dragging existing assignment to another shift slot (swap or move)
      else if (activeData.type === 'assignment' && overData.type === 'shift-slot') {
        const targetAssignment = overData.currentAssignment;

        // If target has an assignment, swap them
        if (targetAssignment && onAssignmentUpdate) {
          const sourceStaffId = activeData.staffId;
          const targetStaffId = targetAssignment.staffProfile.id;

          if (sourceStaffId === targetStaffId) {
            toast.info('Cannot swap with the same staff member');
            return;
          }

          // Perform swap including OFF days (H+1)
          await onAssignmentUpdate(activeData.assignmentId, targetStaffId, true);
          await onAssignmentUpdate(targetAssignment.id, sourceStaffId, true);

          // Find and swap associated OFF days (day after shift)
          const sourceDate = new Date(activeData.sourceDate);
          const targetDate = new Date(targetAssignment.date);

          const sourceNextDay = new Date(sourceDate);
          sourceNextDay.setDate(sourceNextDay.getDate() + 1);
          const sourceNextDayStr = sourceNextDay.toISOString().split('T')[0];

          const targetNextDay = new Date(targetDate);
          targetNextDay.setDate(targetNextDay.getDate() + 1);
          const targetNextDayStr = targetNextDay.toISOString().split('T')[0];

          const sourceOffDay = assignments.find(a =>
            new Date(a.date).toISOString().split('T')[0] === sourceNextDayStr &&
            a.staffProfile.id === sourceStaffId &&
            a.shiftType === 'OFF'
          );

          const targetOffDay = assignments.find(a =>
            new Date(a.date).toISOString().split('T')[0] === targetNextDayStr &&
            a.staffProfile.id === targetStaffId &&
            a.shiftType === 'OFF'
          );

          // Swap OFF days independently
          if (sourceOffDay) {
            await onAssignmentUpdate(sourceOffDay.id, targetStaffId, true);
          }
          if (targetOffDay) {
            await onAssignmentUpdate(targetOffDay.id, sourceStaffId, true);
          }

          if (onRefresh) {
            await onRefresh();
          }

          const offDayMsg = (sourceOffDay || targetOffDay) ? ' (including OFF days)' : '';
          toast.success(`Swapped ${activeData.staffName} with ${targetAssignment.staffProfile.user.name}${offDayMsg}`);
        }
        // Empty slot - just reassign
        else if (!targetAssignment && onAssignmentUpdate) {
          await onAssignmentUpdate(activeData.assignmentId, activeData.staffId);
          toast.success(`Moved ${activeData.staffName} to ${overData.date}`);
        }
      }
    } catch (error: any) {
      console.error('Drag error:', error);
      toast.error(error.message || 'Failed to update assignment');
    } finally {
      setUpdating(false);
    }
  };

  const calendarContent = (
    <div className="space-y-4">
        {editable && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Drag & Drop Builder:</strong>
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 mt-2 ml-4 space-y-1">
              <li>• <strong>Drag staff from pool</strong> to empty shift slots to assign</li>
              <li>• <strong>Drag assignment to another</strong> to swap staff members</li>
              <li>• <strong>OFF days are auto-managed</strong> when swapping</li>
              <li>• OFF, LEAVE, and HOLIDAY shifts cannot be moved</li>
            </ul>
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

            // Check if this date is actually in the current month (to handle calendar grid edge cases)
            const isCurrentMonth = date.getMonth() + 1 === month;

            // Get shift slots for this day
            const shiftSlots = getDayShiftSlots(date, isWeekend, showWeekendNights);

            return (
              <div
                key={day}
                className={`min-h-32 p-2 border rounded-lg ${
                  isWeekend ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
                } ${holiday ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}
                ${!isCurrentMonth ? 'opacity-50' : ''}`}
              >
                <div className="font-semibold text-sm mb-1">{day}</div>
                {holiday && (
                  <div className="text-xs text-red-600 dark:text-red-400 mb-1">
                    {holiday.name}
                  </div>
                )}

                <div className="space-y-1">
                  {/* Render shift drop zones */}
                  {shiftSlots.map((slot, slotIndex) => {
                    // Get all assignments for this shift type
                    const slotAssignments = dayAssignments.filter(a => a.shiftType === slot.type);
                    const validationKey = `${dateStr}-${slot.type}`;

                    // Create multiple drop zones for shifts with maxSlots > 1
                    return Array.from({ length: slot.maxSlots }).map((_, dropZoneIndex) => {
                      const assignment = slotAssignments[dropZoneIndex];
                      const dropZoneId = `${dateStr}-${slot.type}-${dropZoneIndex}`;

                      return (
                        <ShiftDropZone
                          key={dropZoneId}
                          id={dropZoneId}
                          shiftType={slot.type}
                          date={date.toDateString()}
                          dateStr={dateStr}
                          assignment={assignment}
                          editable={editable && isCurrentMonth}
                          maxSlots={slot.maxSlots}
                          slotIndex={dropZoneIndex}
                          isRequired={slot.isRequired}
                          validationError={validationErrors[validationKey]}
                        />
                      );
                    });
                  }).flat()}

                  {/* Render other assignments (OFF, LEAVE, HOLIDAY) */}
                  {dayAssignments
                    .filter(a => ['OFF', 'LEAVE', 'HOLIDAY'].includes(a.shiftType))
                    .map(assignment => (
                      <DraggableAssignmentChip
                        key={assignment.id}
                        assignment={assignment}
                        editable={false}
                      />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );

  // If parent provides DndContext, render without wrapping
  if (skipDndContext) {
    return calendarContent;
  }

  // Otherwise, provide our own DndContext (for backward compatibility)
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {calendarContent}
      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem && (
          <div className="bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg p-3 shadow-2xl">
            <p className="font-medium text-sm">
              {activeItem.type === 'staff' ? activeItem.staffName : activeItem.staffName}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {activeItem.type === 'staff' ? 'New Assignment' : activeItem.shiftType}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
