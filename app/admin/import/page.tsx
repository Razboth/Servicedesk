'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Upload, FileText, CheckCircle, XCircle, AlertCircle, Download,
  Database, Users, MapPin, Wrench, Layers, Tag, FolderTree,
  RefreshCw, History, Plus, ArrowUpDown, Trash2, Eye
} from 'lucide-react';

interface ImportResult {
  success: boolean;
  message: string;
  importLogId?: string;
  importMode?: string;
  results?: {
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
  error?: string;
  details?: string;
}

interface ImportLog {
  id: string;
  entityType: string;
  importMode: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  processedRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  createdBy: { name: string; username: string };
}

interface PreviewRow {
  rowNumber: number;
  action: 'create' | 'update' | 'skip' | 'error';
  data: Record<string, any>;
  errors: string[];
  existingRecord?: Record<string, any>;
}

interface PreviewResult {
  totalRows: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
  errors: number;
  rows: PreviewRow[];
}

interface EntityConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  columns: string[];
  example: string[];
  endpoint: string;
  color: string;
}

const entityConfigs: EntityConfig[] = [
  {
    id: 'atms',
    name: 'ATMs',
    icon: <Database className="h-4 w-4" />,
    description: 'Import ATM locations with network details, brand, and serial numbers',
    columns: ['code', 'name', 'branchCode', 'ipAddress', 'location', 'latitude', 'longitude', 'networkMedia', 'networkVendor', 'atmBrand', 'atmType', 'atmCategory', 'serialNumber', 'notes', 'isActive'],
    example: ['ATM001', 'ATM Manado Plaza', 'MND01', '192.168.2.1', 'Manado Plaza Lt. 1', '-1.4851', '124.8451', 'M2M', 'Indosat', 'Diebold Nixdorf', 'Pro Cash 2050xe', 'ATM', 'SN123456', 'Corner ATM', 'true'],
    endpoint: '/api/admin/import/atms',
    color: 'blue'
  },
  {
    id: 'branches',
    name: 'Branches',
    icon: <MapPin className="h-4 w-4" />,
    description: 'Import branch locations and network information',
    columns: ['code', 'name', 'address', 'city', 'province', 'ipAddress', 'backupIpAddress', 'latitude', 'longitude', 'monitoringEnabled', 'networkMedia', 'networkVendor', 'isActive'],
    example: ['MND01', 'Manado Main Branch', 'Jl. Sam Ratulangi No. 1', 'Manado', 'Sulawesi Utara', '192.168.1.1', '192.168.1.2', '-1.4748', '124.8421', 'true', 'VSAT', 'Telkom', 'true'],
    endpoint: '/api/admin/import/branches',
    color: 'green'
  },
  {
    id: 'users',
    name: 'Users',
    icon: <Users className="h-4 w-4" />,
    description: 'Import user accounts and roles',
    columns: ['username', 'email', 'name', 'password', 'phone', 'role', 'branchCode', 'supportGroupCode', 'isActive', 'updatePassword'],
    example: ['john.doe', 'john.doe@banksulutgo.co.id', 'John Doe', 'TempPass123!', '+62812345678', 'USER', 'MND01', 'IT-L1', 'true', 'false'],
    endpoint: '/api/admin/import/users',
    color: 'purple'
  },
  {
    id: 'services',
    name: 'Services',
    icon: <Wrench className="h-4 w-4" />,
    description: 'Import service catalog with categorization',
    columns: ['name', 'description', 'priority', 'slaHours', 'responseHours', 'resolutionHours', 'requiresApproval', 'defaultItilCategory', 'isActive'],
    example: ['Password Reset', 'Reset user password', 'MEDIUM', '24', '4', '24', 'true', 'SERVICE_REQUEST', 'true'],
    endpoint: '/api/admin/import/services',
    color: 'orange'
  },
  {
    id: 'categories',
    name: 'Categories',
    icon: <FolderTree className="h-4 w-4" />,
    description: 'Import tier 1 categories',
    columns: ['name', 'description', 'isActive', 'order'],
    example: ['Hardware', 'Hardware related services', 'true', '1'],
    endpoint: '/api/admin/import/categories',
    color: 'cyan'
  },
  {
    id: 'subcategories',
    name: 'Subcategories',
    icon: <Tag className="h-4 w-4" />,
    description: 'Import tier 2 subcategories',
    columns: ['categoryId', 'name', 'description', 'isActive', 'order'],
    example: ['category_id', 'ATM Hardware', 'ATM components', 'true', '1'],
    endpoint: '/api/admin/import/subcategories',
    color: 'teal'
  },
  {
    id: 'items',
    name: 'Items',
    icon: <Tag className="h-4 w-4" />,
    description: 'Import tier 3 items',
    columns: ['subcategoryId', 'name', 'description', 'isActive', 'order'],
    example: ['subcategory_id', 'Cash Dispenser', 'ATM cash unit', 'true', '1'],
    endpoint: '/api/admin/import/items',
    color: 'indigo'
  },
  {
    id: 'field-templates',
    name: 'Field Templates',
    icon: <Layers className="h-4 w-4" />,
    description: 'Import reusable field templates',
    columns: ['name', 'label', 'description', 'type', 'isRequired', 'placeholder', 'helpText', 'defaultValue', 'options', 'category', 'isActive'],
    example: ['user_email', 'User Email', 'Email address', 'EMAIL', 'true', 'user@example.com', 'Enter valid email', '', '', 'Contact Info', 'true'],
    endpoint: '/api/admin/import/field-templates',
    color: 'pink'
  }
];

const importModes = [
  { id: 'CREATE_OR_UPDATE', name: 'Create or Update', description: 'Create new records and update existing ones', icon: <ArrowUpDown className="h-4 w-4" /> },
  { id: 'ADD_ONLY', name: 'Add Only', description: 'Only create new records, skip existing', icon: <Plus className="h-4 w-4" /> },
  { id: 'UPDATE_ONLY', name: 'Update Only', description: 'Only update existing records, skip new', icon: <RefreshCw className="h-4 w-4" /> },
  { id: 'REPLACE_ALL', name: 'Replace All', description: 'Clear all data and import fresh', icon: <Trash2 className="h-4 w-4" /> }
];

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState('atms');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState('CREATE_OR_UPDATE');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [history, setHistory] = useState<ImportLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const getCurrentEntity = () => entityConfigs.find(e => e.id === activeTab)!;

  // Fetch import history
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/import/history?limit=10');
      const data = await response.json();
      if (data.success) {
        setHistory(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setResult(null);
      setPreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setPreview(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    const entity = getCurrentEntity();
    setPreviewing(true);
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entity.id.toUpperCase());
      formData.append('importMode', importMode);
      formData.append('maxRows', '50');

      const response = await fetch('/api/admin/import/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setPreview(data.preview);
      } else {
        setResult({
          success: false,
          message: 'Preview failed',
          error: data.error,
          details: data.details
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Preview failed',
        error: 'Failed to preview file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    if (importMode === 'REPLACE_ALL') {
      const entity = getCurrentEntity();
      if (!confirm(`WARNING: This will delete ALL existing ${entity.name.toLowerCase()} before importing. Are you sure?`)) {
        return;
      }
    }

    const entity = getCurrentEntity();
    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entity.id);
      formData.append('importMode', importMode);

      const response = await fetch(entity.endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
      fetchHistory();
    } catch (error) {
      setResult({
        success: false,
        message: 'Import failed',
        error: 'Failed to import file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    const entity = getCurrentEntity();
    setExporting(true);

    try {
      const response = await fetch(`${entity.endpoint}?export=true&format=${format}`, {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entity.id}_export.${format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setResult({
          success: false,
          message: 'Export failed',
          error: 'Failed to export data'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Export failed',
        error: 'Failed to export data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setExporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setResult(null);
    setPreview(null);
  };

  const currentEntity = getCurrentEntity();

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 space-y-6">
      {/* Header Card */}
      <Card className="shadow-sm bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Import / Export Center</h1>
                <p className="text-muted-foreground mt-1">
                  Bulk import and export data for branches, users, ATMs, services, and more
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              {showHistory ? 'Hide History' : 'View History'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import History Panel */}
      {showHistory && history.length > 0 && (
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Imports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {history.map((log) => (
                <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={log.status === 'COMPLETED' ? 'default' : log.status === 'FAILED' ? 'destructive' : 'secondary'}>
                        {log.status}
                      </Badge>
                      <span className="font-medium">{log.entityType}</span>
                      <span className="text-sm text-muted-foreground">{log.fileName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="text-green-600">+{log.createdRows}</span>
                      <span className="text-blue-600">~{log.updatedRows}</span>
                      <span className="text-gray-500">-{log.skippedRows}</span>
                      {log.errorRows > 0 && <span className="text-red-600">!{log.errorRows}</span>}
                      <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entity Tabs - Underline Style */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
          {entityConfigs.map((entity) => (
            <button
              key={entity.id}
              onClick={() => {
                setActiveTab(entity.id);
                resetImport();
              }}
              className={cn(
                'whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === entity.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {entity.icon}
              {entity.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Import */}
        <div className="lg:col-span-2 space-y-6">
          {/* Import Mode Selector */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg">Import Mode</CardTitle>
              <CardDescription>Choose how to handle the imported data</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {importModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setImportMode(mode.id)}
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-all',
                      importMode === mode.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {mode.icon}
                      <span className="font-medium">{mode.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{mode.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload File
              </CardTitle>
              <CardDescription>Upload a CSV or Excel file to import {currentEntity.name.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
                  file && 'border-green-500 bg-green-50'
                )}
              >
                {file ? (
                  <div className="space-y-3">
                    <FileText className="h-12 w-12 mx-auto text-green-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setFile(null); setPreview(null); }}>
                      Change File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <p className="font-medium">Drop your file here, or click to browse</p>
                      <p className="text-sm text-muted-foreground">Supports CSV, XLSX, and XLS files</p>
                    </div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                      <Upload className="h-4 w-4" />
                      Choose File
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {file && (
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewing || importing}
                    className="flex-1"
                  >
                    {previewing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Previewing...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Import
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importing || previewing}
                    className="flex-1"
                  >
                    {importing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Now
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Results */}
          {preview && (
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg">Preview Results</CardTitle>
                <CardDescription>Review what will happen when you import</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{preview.toCreate}</div>
                    <div className="text-xs text-green-800">To Create</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{preview.toUpdate}</div>
                    <div className="text-xs text-blue-800">To Update</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{preview.toSkip}</div>
                    <div className="text-xs text-gray-800">To Skip</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{preview.errors}</div>
                    <div className="text-xs text-red-800">Errors</div>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                  {preview.rows.slice(0, 20).map((row) => (
                    <div key={row.rowNumber} className="p-2 flex items-center justify-between text-sm hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          row.action === 'create' ? 'default' :
                          row.action === 'update' ? 'secondary' :
                          row.action === 'skip' ? 'outline' : 'destructive'
                        } className="w-16 justify-center">
                          {row.action}
                        </Badge>
                        <span className="text-muted-foreground">Row {row.rowNumber}</span>
                        <span className="font-mono text-xs truncate max-w-[200px]">
                          {Object.values(row.data).slice(0, 2).join(' - ')}
                        </span>
                      </div>
                      {row.errors.length > 0 && (
                        <span className="text-xs text-red-600 truncate max-w-[200px]">{row.errors[0]}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {result && (
            <Card className={result.success ? 'border-green-200' : 'border-red-200'}>
              <CardHeader className={cn('border-b', result.success ? 'bg-green-50' : 'bg-red-50')}>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  {result.success ? 'Import Successful' : 'Import Failed'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {result.success && result.results ? (
                  <div className="space-y-4">
                    <p className="text-green-800 font-medium">{result.message}</p>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{result.results.processed}</div>
                        <div className="text-xs text-blue-800">Processed</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{result.results.created}</div>
                        <div className="text-xs text-green-800">Created</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{result.results.updated}</div>
                        <div className="text-xs text-yellow-800">Updated</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">{result.results.skipped || 0}</div>
                        <div className="text-xs text-gray-800">Skipped</div>
                      </div>
                    </div>
                    {result.results.errors && result.results.errors.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-yellow-800">Warnings/Errors:</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {result.results.errors.map((error, index) => (
                            <div key={index} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-red-800 font-medium">{result.error}</p>
                    {result.details && <p className="text-red-600 text-sm">{result.details}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Export & Info */}
        <div className="space-y-6">
          {/* Export Section */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export {currentEntity.name}
              </CardTitle>
              <CardDescription>Download current data</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                variant="outline"
                className="w-full"
              >
                {exporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export as CSV
              </Button>
              <Button
                onClick={() => handleExport('excel')}
                disabled={exporting}
                variant="outline"
                className="w-full"
              >
                {exporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export as Excel
              </Button>
            </CardContent>
          </Card>

          {/* Format Info */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Format Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Required Columns:</p>
                <div className="flex flex-wrap gap-1">
                  {currentEntity.columns.slice(0, 8).map((column, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {column}
                    </Badge>
                  ))}
                  {currentEntity.columns.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{currentEntity.columns.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium mb-1">Example Row:</p>
                <code className="text-xs break-all text-muted-foreground">
                  {currentEntity.example.slice(0, 4).join(';')}...
                </code>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• CSV files use semicolon (;) delimiter</p>
                <p>• Excel (.xlsx, .xls) supported</p>
                <p>• First row = column headers</p>
                <p>• Boolean: 'true' or 'false'</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
