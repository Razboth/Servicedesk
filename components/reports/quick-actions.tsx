'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus,
  FileText,
  Calendar,
  Download,
  Upload,
  Settings,
  BarChart3,
  Database,
  Layout,
  Zap
} from 'lucide-react';

interface QuickActionsProps {
  userRole?: string;
  onRefresh?: () => void;
}

export function QuickActions({ userRole, onRefresh }: QuickActionsProps) {
  const router = useRouter();
  const [showNewReportDialog, setShowNewReportDialog] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportType, setReportType] = useState<'custom' | 'template'>('custom');

  const handleCreateReport = async () => {
    if (!reportTitle.trim()) return;

    try {
      const response = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reportTitle,
          description: reportDescription,
          type: reportType === 'custom' ? 'BUILDER' : 'QUERY',
          module: 'TICKETS',
          columns: ['id', 'title', 'status', 'priority', 'createdAt'],
          filters: [],
          groupBy: [],
          orderBy: { createdAt: 'desc' },
          isPublic: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShowNewReportDialog(false);
        setReportTitle('');
        setReportDescription('');
        
        // Navigate to the report builder
        router.push(`/reports/builder?id=${data.id}`);
      }
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  const canCreateReports = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole || '');
  const canScheduleReports = ['SUPER_ADMIN', 'ADMIN'].includes(userRole || '');

  return (
    <div className="flex items-center gap-2">
      {/* Create New Report */}
      {canCreateReports && (
        <Dialog open={showNewReportDialog} onOpenChange={setShowNewReportDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Report</DialogTitle>
              <DialogDescription>
                Start building a custom report with your specific requirements.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  placeholder="Monthly Performance Report"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this report will show..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Report Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={reportType === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReportType('custom')}
                    className="flex-1"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Custom Query
                  </Button>
                  <Button
                    type="button"
                    variant={reportType === 'template' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReportType('template')}
                    className="flex-1"
                  >
                    <Layout className="h-4 w-4 mr-2" />
                    From Template
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowNewReportDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateReport}
                disabled={!reportTitle.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Zap className="h-4 w-4 mr-2" />
                Create & Build
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => router.push('/reports/builder')}>
            <Database className="h-4 w-4 mr-2" />
            Report Builder
          </DropdownMenuItem>

          {canScheduleReports && (
            <DropdownMenuItem onClick={() => router.push('/reports/scheduler')}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Reports
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => router.push('/reports/templates')}>
            <Layout className="h-4 w-4 mr-2" />
            Browse Templates
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => document.getElementById('import-file')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import Report
            <input
              id="import-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Handle import logic here
                  console.log('Importing:', file.name);
                }
              }}
            />
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" />
            Export All Reports
          </DropdownMenuItem>

          {onRefresh && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRefresh}>
                <FileText className="h-4 w-4 mr-2" />
                Refresh Reports
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}