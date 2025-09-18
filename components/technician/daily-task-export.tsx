'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Calendar, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/export-utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DailyTaskExportProps {
  selectedDate: string;
  onExport: (date: string) => Promise<any>;
  onClose: () => void;
}

export function DailyTaskExport({ selectedDate, onExport, onClose }: DailyTaskExportProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);

      const data = await onExport(selectedDate);

      if (data && data.data) {
        // Export to Excel with new format
        exportToExcel({
          data: data.data,
          filename: data.filename || `daily-tasks-${selectedDate}.xlsx`,
          title: `Daily Tasks Report - ${new Date(selectedDate).toLocaleDateString()}`,
          headers: [
            'Departemen',
            'Nama',
            'Role',
            'Date',
            'Hour',
            'Description',
            'Status',
            'Notes'
          ],
        });

        toast.success(`Exported ${data.data.length} tasks successfully`);
        onClose();
      } else {
        toast.error('No data to export');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export tasks');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Tasks</DialogTitle>
          <DialogDescription>
            Download your daily task list as an Excel spreadsheet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">
                Export date
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Export includes
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                <span>Task details</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                <span>Status tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                <span>Ticket info</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                <span>Notes</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={exporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="gap-2"
          >
            {exporting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}