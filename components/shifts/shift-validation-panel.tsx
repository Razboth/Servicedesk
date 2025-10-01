'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface StaffStats {
  name: string;
  nightCount: number;
  weekendCount: number;
  offCount: number;
  maxNightShifts: number;
}

interface ShiftValidationPanelProps {
  validationResult?: ValidationResult;
  staffStats?: Record<string, StaffStats>;
  totalAssignments: number;
}

export function ShiftValidationPanel({
  validationResult,
  staffStats,
  totalAssignments,
}: ShiftValidationPanelProps) {
  const hasErrors = validationResult && validationResult.errors.length > 0;
  const hasWarnings = validationResult && validationResult.warnings.length > 0;
  const isValid = validationResult?.isValid ?? true;

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {isValid && !hasWarnings ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                Valid Schedule
              </>
            ) : hasErrors ? (
              <>
                <AlertCircle className="w-5 h-5 text-red-500" />
                Validation Errors
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Warnings
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Assignments:</span>
              <Badge variant="outline">{totalAssignments}</Badge>
            </div>
            {validationResult && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Errors:</span>
                  <Badge variant={hasErrors ? 'destructive' : 'outline'}>
                    {validationResult.errors.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Warnings:</span>
                  <Badge variant={hasWarnings ? 'default' : 'outline'} className="bg-yellow-500">
                    {validationResult.warnings.length}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {hasErrors && (
        <Card className="border-red-300 dark:border-red-700">
          <CardHeader>
            <CardTitle className="text-lg text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Errors ({validationResult.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {validationResult.errors.map((error, index) => (
                <li key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <Card className="border-yellow-300 dark:border-yellow-700">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Warnings ({validationResult.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {validationResult.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-yellow-600 dark:text-yellow-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Staff Statistics */}
      {staffStats && Object.keys(staffStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Staff Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(staffStats).map(([staffId, stats]) => (
                <div key={staffId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{stats.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {stats.nightCount + stats.weekendCount}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                      <span>{stats.nightCount}/{stats.maxNightShifts} nights</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span>{stats.weekendCount} weekends</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                      <span>{stats.offCount} off</span>
                    </div>
                  </div>
                  {stats.nightCount >= stats.maxNightShifts && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Max night shifts reached</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Validation Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Max 5 night shifts per staff per month</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Min 3 days between night shifts</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>OFF day required after night shift</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Weekend: 2 day staff required</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Server access coverage on weekends</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Sabbath restrictions honored</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
