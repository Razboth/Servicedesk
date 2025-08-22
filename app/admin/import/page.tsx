'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, Database, Users, MapPin, Wrench, Layers, Tag, FolderTree } from 'lucide-react';

interface ImportResult {
  success: boolean;
  message: string;
  results?: {
    processed: number;
    created: number;
    updated: number;
    errors: string[];
  };
  error?: string;
  details?: string;
}

interface EntityConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  columns: string[];
  example: string[];
  endpoint: string;
}

const entityConfigs: EntityConfig[] = [
  {
    id: 'services',
    name: 'Services',
    icon: <Wrench className="h-4 w-4" />,
    description: 'Import service catalog with 3-tier categorization',
    columns: ['name', 'description', 'categoryId', 'tier1CategoryId', 'tier2SubcategoryId', 'tier3ItemId', 'priority', 'slaHours', 'responseHours', 'resolutionHours', 'requiresApproval', 'defaultTitle', 'defaultItilCategory', 'defaultIssueClassification'],
    example: ['Password Reset', 'Reset user password', 'cat123', 'tier1_123', 'tier2_456', 'tier3_789', 'MEDIUM', '24', '4', '24', 'true', 'Password Reset Request', 'SERVICE_REQUEST', 'HUMAN_ERROR'],
    endpoint: '/api/admin/import/services'
  },
  {
    id: 'branches',
    name: 'Branches',
    icon: <MapPin className="h-4 w-4" />,
    description: 'Import branch locations and network information',
    columns: ['name', 'code', 'address', 'city', 'province', 'ipAddress', 'backupIpAddress', 'monitoringEnabled', 'networkMedia', 'networkVendor', 'isActive'],
    example: ['Manado Main Branch', 'MND01', 'Jl. Sam Ratulangi No. 1', 'Manado', 'Sulawesi Utara', '192.168.1.1', '192.168.1.2', 'true', 'VSAT', 'Telkom', 'true'],
    endpoint: '/api/admin/import/branches'
  },
  {
    id: 'users',
    name: 'Users',
    icon: <Users className="h-4 w-4" />,
    description: 'Import user accounts and roles',
    columns: ['username', 'email', 'name', 'phone', 'role', 'branchId', 'supportGroupId', 'isActive'],
    example: ['john.doe', 'john.doe@banksulutgo.co.id', 'John Doe', '+62812345678', 'USER', 'branch_id', 'support_group_id', 'true'],
    endpoint: '/api/admin/import/users'
  },
  {
    id: 'atms',
    name: 'ATMs',
    icon: <Database className="h-4 w-4" />,
    description: 'Import ATM locations and network details',
    columns: ['code', 'name', 'branchId', 'ipAddress', 'location', 'latitude', 'longitude', 'networkMedia', 'networkVendor', 'isActive'],
    example: ['ATM001', 'ATM Manado Plaza', 'branch_id', '192.168.2.1', 'Manado Plaza Lt. 1', '-1.4851', '124.8451', 'M2M', 'Indosat', 'true'],
    endpoint: '/api/admin/import/atms'
  },
  {
    id: 'field-templates',
    name: 'Field Templates',
    icon: <Layers className="h-4 w-4" />,
    description: 'Import reusable field templates for services',
    columns: ['name', 'label', 'description', 'type', 'isRequired', 'placeholder', 'helpText', 'defaultValue', 'options', 'category', 'isActive'],
    example: ['user_email', 'User Email', 'Email address of the user', 'EMAIL', 'true', 'user@example.com', 'Enter valid email address', '', '', 'Contact Info', 'true'],
    endpoint: '/api/admin/import/field-templates'
  },
  {
    id: 'categories',
    name: 'Categories (Tier 1)',
    icon: <FolderTree className="h-4 w-4" />,
    description: 'Import tier 1 categories for 3-tier structure',
    columns: ['name', 'description', 'isActive', 'order'],
    example: ['Hardware', 'Hardware related services', 'true', '1'],
    endpoint: '/api/admin/import/categories'
  },
  {
    id: 'subcategories',
    name: 'Subcategories (Tier 2)',
    icon: <Tag className="h-4 w-4" />,
    description: 'Import tier 2 subcategories for 3-tier structure',
    columns: ['categoryId', 'name', 'description', 'isActive', 'order'],
    example: ['category_id', 'ATM Hardware', 'ATM hardware components', 'true', '1'],
    endpoint: '/api/admin/import/subcategories'
  },
  {
    id: 'items',
    name: 'Items (Tier 3)',
    icon: <Tag className="h-4 w-4" />,
    description: 'Import tier 3 items for 3-tier structure',
    columns: ['subcategoryId', 'name', 'description', 'isActive', 'order'],
    example: ['subcategory_id', 'Cash Dispenser', 'ATM cash dispensing unit', 'true', '1'],
    endpoint: '/api/admin/import/items'
  }
];

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState('services');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const getCurrentEntity = () => entityConfigs.find(e => e.id === activeTab)!;

  const handleImport = async () => {
    if (!file) return;

    const entity = getCurrentEntity();
    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entity.id);

      const response = await fetch(entity.endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
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
          error: 'Failed to export data',
          details: 'Export request failed'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to export data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleUndo = async () => {
    const entity = getCurrentEntity();
    if (!confirm(`Are you sure you want to delete all ${entity.name.toLowerCase()} data? This action cannot be undone.`)) {
      return;
    }

    setIsUndoing(true);
    try {
      const response = await fetch(`${entity.endpoint}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to clear data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsUndoing(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setResult(null);
  };

  const currentEntity = getCurrentEntity();

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Import/Export Data</h1>
        <p className="text-gray-600 mt-2">
          Import and export data for branches, users, ATMs, services, field templates, and categories in CSV or Excel format.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          {entityConfigs.map((entity) => (
            <TabsTrigger key={entity.id} value={entity.id} className="flex items-center gap-1 text-xs">
              {entity.icon}
              <span className="hidden sm:inline">{entity.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {entityConfigs.map((entity) => (
          <TabsContent key={entity.id} value={entity.id} className="space-y-6">
            {/* Entity Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {entity.icon}
                  {entity.name}
                </CardTitle>
                <CardDescription>{entity.description}</CardDescription>
              </CardHeader>
            </Card>

            {/* Import/Export Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Import Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Import {entity.name}
                  </CardTitle>
                  <CardDescription>
                    Upload a CSV or Excel file to import {entity.name.toLowerCase()}. Column names should match database fields.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">File (CSV or Excel)</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      disabled={importing || exporting || isUndoing}
                    />
                  </div>

                  {file && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleImport}
                      disabled={!file || importing || exporting || isUndoing}
                      className="flex items-center gap-2"
                    >
                      {importing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Import
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="destructive"
                      onClick={handleUndo}
                      disabled={importing || exporting || isUndoing}
                      className="flex items-center gap-2"
                    >
                      {isUndoing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Clearing...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          Clear All
                        </>
                      )}
                    </Button>
                    
                    {(file || result) && (
                      <Button variant="outline" onClick={resetImport} disabled={importing || exporting || isUndoing}>
                        Reset
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Export Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export {entity.name}
                  </CardTitle>
                  <CardDescription>
                    Download current {entity.name.toLowerCase()} data as CSV or Excel file.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Export all {entity.name.toLowerCase()} data with proper column headers for re-import.
                    </p>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleExport('csv')}
                        disabled={importing || exporting || isUndoing}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {exporting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Export CSV
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => handleExport('excel')}
                        disabled={importing || exporting || isUndoing}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {exporting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Export Excel
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Results Section */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {result.success ? 'Success' : 'Error'} - {currentEntity.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.success ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">{result.message}</p>
                </div>
                
                {result.results && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{result.results.processed}</div>
                      <div className="text-sm text-blue-800">Processed</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{result.results.created}</div>
                      <div className="text-sm text-green-800">Created</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{result.results.updated}</div>
                      <div className="text-sm text-yellow-800">Updated</div>
                    </div>
                  </div>
                )}
                
                {result.results?.errors && result.results.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Warnings/Errors:</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.results.errors.map((error, index) => (
                        <div key={index} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded border">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">{result.error}</p>
                  {result.details && (
                    <p className="text-red-600 text-sm mt-1">{result.details}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Format Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {currentEntity.name} Format Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-4">
            <div>
              <p className="font-medium mb-2">Required Columns:</p>
              <div className="flex flex-wrap gap-1">
                {currentEntity.columns.map((column, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {column}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium mb-2">Example CSV Row:</p>
              <code className="text-xs break-all">
                {currentEntity.columns.join(';')}<br/>
                {currentEntity.example.join(';')}
              </code>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">File Format Notes:</p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                <li>CSV files should use semicolon (;) as delimiter</li>
                <li>Excel files (.xlsx, .xls) are supported</li>
                <li>First row should contain column headers</li>
                <li>Column names must match database field names exactly</li>
                <li>Boolean values should be 'true' or 'false'</li>
                <li>Date values should be in ISO format (YYYY-MM-DD)</li>
                <li>Empty cells will be treated as NULL/empty values</li>
              </ul>
            </div>
            
            {currentEntity.id === 'services' && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium mb-2">Service-Specific Notes:</p>
                <ul className="list-disc list-inside text-xs space-y-1 ml-4">
                  <li>Priority: LOW, MEDIUM, HIGH, CRITICAL, EMERGENCY</li>
                  <li>defaultItilCategory: INCIDENT, SERVICE_REQUEST, CHANGE_REQUEST, EVENT_REQUEST</li>
                  <li>defaultIssueClassification: HUMAN_ERROR, SYSTEM_ERROR, HARDWARE_FAILURE, NETWORK_ISSUE, SECURITY_INCIDENT, DATA_ISSUE, PROCESS_GAP, EXTERNAL_FACTOR</li>
                  <li>Time values (slaHours, responseHours, resolutionHours) should be in hours</li>
                </ul>
              </div>
            )}
            
            {currentEntity.id === 'users' && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium mb-2">User-Specific Notes:</p>
                <ul className="list-disc list-inside text-xs space-y-1 ml-4">
                  <li><strong>username</strong>: Must be unique (required)</li>
                  <li><strong>email</strong>: Must be unique and valid format (required)</li>
                  <li><strong>name</strong>: Full name of the user (required)</li>
                  <li><strong>password</strong>: Plain text password, will be automatically hashed (required, min 8 characters)</li>
                  <li><strong>role</strong>: USER, TECHNICIAN, MANAGER, ADMIN, or SECURITY_ANALYST (defaults to USER)</li>
                  <li><strong>updatePassword</strong>: Set to "true" or "1" to update password for existing users (optional, defaults to false)</li>
                  <li><strong>branchId</strong> and <strong>supportGroupId</strong>: Should reference existing records (optional)</li>
                  <li><strong>isActive</strong>: Set to "false" to deactivate user (optional, defaults to true)</li>
                </ul>
                <p className="text-xs mt-2 text-amber-600">
                  <strong>⚠️ Security Note:</strong> Passwords in CSV/Excel files are in plain text. Ensure files are handled securely and deleted after import.
                </p>
              </div>
            )}
            
            {(currentEntity.id === 'branches' || currentEntity.id === 'atms') && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium mb-2">Network-Specific Notes:</p>
                <ul className="list-disc list-inside text-xs space-y-1 ml-4">
                  <li>networkMedia: VSAT, M2M, FO</li>
                  <li>networkVendor: Any string (e.g., "Telkom", "Indosat")</li>
                  <li>IP addresses should be in valid IPv4 format</li>
                  <li>latitude/longitude should be decimal degrees</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}