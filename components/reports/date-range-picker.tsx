'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const predefinedRanges = [
  {
    label: 'Last 7 days',
    getValue: () => ({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    })
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    })
  },
  {
    label: 'Last 3 months',
    getValue: () => ({
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    })
  },
  {
    label: 'This year',
    getValue: () => ({
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date()
    })
  }
];

export function DateRangePicker({ value, onChange, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePredefinedRange = (range: DateRange) => {
    onChange(range);
    setIsOpen(false);
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', dateString: string) => {
    const newDate = new Date(dateString);
    if (!isNaN(newDate.getTime())) {
      onChange({
        ...value,
        [field]: newDate
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2"
      >
        <Calendar className="h-4 w-4" />
        <span>
          {formatDate(value.startDate)} - {formatDate(value.endDate)}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-4 space-y-4">
            {/* Predefined Ranges */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Select</h4>
              <div className="grid grid-cols-2 gap-2">
                {predefinedRanges.map((range) => (
                  <Button
                    key={range.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePredefinedRange(range.getValue())}
                    className="text-xs"
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Custom Range</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={value.startDate.toISOString().split('T')[0]}
                    onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={value.endDate.toISOString().split('T')[0]}
                    onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}