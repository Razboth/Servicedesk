'use client';

import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Moon, Sun, Server, AlertCircle, GripVertical, Calendar } from 'lucide-react';
import { useState, useMemo } from 'react';

interface StaffProfile {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  canWorkNightShift: boolean;
  canWorkWeekendDay: boolean;
  hasServerAccess: boolean;
  hasSabbathRestriction: boolean;
  isActive: boolean;
  maxNightShiftsPerMonth: number;
  minDaysBetweenNightShifts: number;
}

interface StaffAssignmentStats {
  nightCount: number;
  weekendCount: number;
  offCount: number;
  totalAssignments: number;
}

interface StaffPoolSidebarProps {
  staff: StaffProfile[];
  assignmentStats?: Record<string, StaffAssignmentStats>;
  onStaffSelect?: (staffId: string) => void;
}

function DraggableStaffCard({
  staff,
  stats,
  onClick,
}: {
  staff: StaffProfile;
  stats?: StaffAssignmentStats;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `staff-${staff.id}`,
    data: {
      type: 'staff',
      staffId: staff.id,
      staffName: staff.user.name,
      canWorkNightShift: staff.canWorkNightShift,
      canWorkWeekendDay: staff.canWorkWeekendDay,
      hasServerAccess: staff.hasServerAccess,
      hasSabbathRestriction: staff.hasSabbathRestriction,
    },
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
        group relative p-3 rounded-lg border-2 transition-all cursor-move
        ${isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-105'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
        }
      `}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm truncate">{staff.user.name}</h4>
            {stats && stats.totalAssignments > 0 && (
              <Badge variant="outline" className="text-xs">
                {stats.totalAssignments}
              </Badge>
            )}
          </div>

          {/* Capabilities */}
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {staff.canWorkNightShift && (
              <Badge variant="outline" className="text-xs bg-indigo-50 dark:bg-indigo-900/30">
                <Moon className="w-3 h-3 mr-1" />
                Night
              </Badge>
            )}
            {staff.canWorkWeekendDay && (
              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30">
                <Sun className="w-3 h-3 mr-1" />
                Weekend
              </Badge>
            )}
            {staff.hasServerAccess && (
              <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/30">
                <Server className="w-3 h-3 mr-1" />
                Server
              </Badge>
            )}
            {staff.hasSabbathRestriction && (
              <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-900/30">
                <AlertCircle className="w-3 h-3 mr-1" />
                Sabbath
              </Badge>
            )}
          </div>

          {/* Assignment Stats */}
          {stats && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-600 dark:text-gray-400">
              {stats.nightCount > 0 && (
                <span className="flex items-center gap-1">
                  <Moon className="w-3 h-3" />
                  {stats.nightCount}
                </span>
              )}
              {stats.weekendCount > 0 && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {stats.weekendCount}
                </span>
              )}
              {stats.offCount > 0 && (
                <span className="flex items-center gap-1">
                  OFF: {stats.offCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drag Indicator */}
      <div className={`
        absolute inset-0 border-2 border-dashed rounded-lg pointer-events-none transition-opacity
        ${isDragging ? 'opacity-100 border-blue-400' : 'opacity-0'}
      `} />
    </div>
  );
}

export function StaffPoolSidebar({
  staff,
  assignmentStats = {},
  onStaffSelect,
}: StaffPoolSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCapability, setFilterCapability] = useState<'all' | 'night' | 'weekend' | 'server'>('all');

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      // Search filter
      const matchesSearch = s.user.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Capability filter
      let matchesCapability = true;
      switch (filterCapability) {
        case 'night':
          matchesCapability = s.canWorkNightShift;
          break;
        case 'weekend':
          matchesCapability = s.canWorkWeekendDay;
          break;
        case 'server':
          matchesCapability = s.hasServerAccess;
          break;
      }

      return matchesSearch && matchesCapability && s.isActive;
    });
  }, [staff, searchQuery, filterCapability]);

  const activeStaff = staff.filter(s => s.isActive);
  const nightShiftStaff = activeStaff.filter(s => s.canWorkNightShift);
  const weekendStaff = activeStaff.filter(s => s.canWorkWeekendDay);
  const serverAccessStaff = activeStaff.filter(s => s.hasServerAccess);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GripVertical className="w-5 h-5 text-gray-400" />
          Staff Pool
        </CardTitle>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="text-xs">
            <span className="text-gray-600 dark:text-gray-400">Total: </span>
            <span className="font-semibold">{activeStaff.length}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-600 dark:text-gray-400">Night: </span>
            <span className="font-semibold">{nightShiftStaff.length}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-600 dark:text-gray-400">Weekend: </span>
            <span className="font-semibold">{weekendStaff.length}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-600 dark:text-gray-400">Server: </span>
            <span className="font-semibold">{serverAccessStaff.length}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
        {/* Search */}
        <Input
          type="text"
          placeholder="Search staff..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />

        {/* Filter Buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => setFilterCapability('all')}
            className={`text-xs px-2 py-1 rounded ${
              filterCapability === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterCapability('night')}
            className={`text-xs px-2 py-1 rounded ${
              filterCapability === 'night'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Moon className="w-3 h-3" />
          </button>
          <button
            onClick={() => setFilterCapability('weekend')}
            className={`text-xs px-2 py-1 rounded ${
              filterCapability === 'weekend'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Sun className="w-3 h-3" />
          </button>
          <button
            onClick={() => setFilterCapability('server')}
            className={`text-xs px-2 py-1 rounded ${
              filterCapability === 'server'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Server className="w-3 h-3" />
          </button>
        </div>

        {/* Staff List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No staff found</p>
            </div>
          ) : (
            filteredStaff.map((s) => (
              <DraggableStaffCard
                key={s.id}
                staff={s}
                stats={assignmentStats[s.id]}
                onClick={() => onStaffSelect?.(s.id)}
              />
            ))
          )}
        </div>

        {/* Drag Hint */}
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
          💡 Drag staff members onto calendar days to assign shifts
        </div>
      </CardContent>
    </Card>
  );
}
