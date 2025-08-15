'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from './date-range-picker';
import { Filter, X, ChevronDown } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ReportFilters {
  dateRange: DateRange;
  selectedFilters: Record<string, string[]>;
}

interface ReportFiltersProps {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  filterGroups: FilterGroup[];
  isLoading?: boolean;
  className?: string;
}

export function ReportFilters({ 
  filters, 
  onChange, 
  filterGroups, 
  isLoading = false,
  className = '' 
}: ReportFiltersProps) {
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  const toggleDropdown = (groupId: string) => {
    const newOpenDropdowns = new Set(openDropdowns);
    if (newOpenDropdowns.has(groupId)) {
      newOpenDropdowns.delete(groupId);
    } else {
      newOpenDropdowns.add(groupId);
    }
    setOpenDropdowns(newOpenDropdowns);
  };

  const handleFilterChange = (groupId: string, value: string, checked: boolean) => {
    const group = filterGroups.find(g => g.id === groupId);
    if (!group) return;

    let newSelectedFilters = { ...filters.selectedFilters };
    
    if (!newSelectedFilters[groupId]) {
      newSelectedFilters[groupId] = [];
    }

    if (group.multiSelect) {
      if (checked) {
        newSelectedFilters[groupId] = [...newSelectedFilters[groupId], value];
      } else {
        newSelectedFilters[groupId] = newSelectedFilters[groupId].filter(v => v !== value);
      }
    } else {
      newSelectedFilters[groupId] = checked ? [value] : [];
    }

    onChange({
      ...filters,
      selectedFilters: newSelectedFilters
    });
  };

  const clearFilter = (groupId: string, value?: string) => {
    let newSelectedFilters = { ...filters.selectedFilters };
    
    if (value) {
      newSelectedFilters[groupId] = newSelectedFilters[groupId]?.filter(v => v !== value) || [];
    } else {
      newSelectedFilters[groupId] = [];
    }

    onChange({
      ...filters,
      selectedFilters: newSelectedFilters
    });
  };

  const clearAllFilters = () => {
    onChange({
      ...filters,
      selectedFilters: {}
    });
  };

  const getActiveFilterCount = () => {
    return Object.values(filters.selectedFilters).reduce((sum, values) => sum + values.length, 0);
  };

  const getFilterLabel = (groupId: string, value: string): string => {
    const group = filterGroups.find(g => g.id === groupId);
    const option = group?.options.find(o => o.value === value);
    return option?.label || value;
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdowns(new Set());
    };

    if (openDropdowns.size > 0) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdowns]);

  return (
    <div className={`bg-white border rounded-lg p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="text-xs">
              {getActiveFilterCount()} active
            </Badge>
          )}
        </div>
        {getActiveFilterCount() > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <DateRangePicker
          value={filters.dateRange}
          onChange={(dateRange) => onChange({ ...filters, dateRange })}
        />
      </div>

      {/* Filter Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filterGroups.map((group) => (
          <div key={group.id} className="relative">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              {group.label}
            </label>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown(group.id);
                }}
                className="w-full justify-between text-left"
                disabled={isLoading}
              >
                <span className="truncate">
                  {filters.selectedFilters[group.id]?.length > 0
                    ? `${filters.selectedFilters[group.id].length} selected`
                    : 'Select...'}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>

              {openDropdowns.has(group.id) && (
                <div className="absolute top-full left-0 mt-1 w-full max-w-xs bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                  {group.options.map((option) => {
                    const isSelected = filters.selectedFilters[group.id]?.includes(option.value) || false;
                    
                    return (
                      <label
                        key={option.value}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type={group.multiSelect ? 'checkbox' : 'radio'}
                          name={group.id}
                          checked={isSelected}
                          onChange={(e) => handleFilterChange(group.id, option.value, e.target.checked)}
                          className="mr-2"
                        />
                        <span className="flex-1 text-sm">{option.label}</span>
                        {option.count !== undefined && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({option.count})
                          </span>
                        )}
                      </label>
                    );
                  })}
                  {group.options.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No options available
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Active Filter Tags */}
      {getActiveFilterCount() > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">Active Filters</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters.selectedFilters).map(([groupId, values]) =>
              values.map((value) => (
                <Badge
                  key={`${groupId}-${value}`}
                  variant="secondary"
                  className="text-xs flex items-center space-x-1"
                >
                  <span>{getFilterLabel(groupId, value)}</span>
                  <button
                    onClick={() => clearFilter(groupId, value)}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}