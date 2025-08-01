'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/import', {
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

  const handleUndo = async () => {
    if (!confirm('Are you sure you want to delete all imported data? This action cannot be undone.')) {
      return;
    }

    setIsUndoing(true);
    try {
      const response = await fetch('/api/admin/import/undo', {
        method: 'POST',
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Import Service Catalog</h1>
        <p className="text-gray-600 mt-2">
          Import services from CSV file. The file should contain columns: SERVICE CATALOG, SERVICE NAME, SLA, RESPONSE TIME, RESOLUTION TIME
        </p>
      </div>

      <div className="grid gap-6">
        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Select a CSV file to import service catalog data. The file should use semicolon (;) as delimiter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={importing}
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
                disabled={!file || importing || isUndoing}
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
                disabled={importing || isUndoing}
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
                    Clear All Data
                  </>
                )}
              </Button>
              
              {(file || result) && (
                <Button variant="outline" onClick={resetImport} disabled={importing || isUndoing}>
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

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
                Import Results
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

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Format Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p><strong>Required columns (semicolon separated):</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><Badge variant="outline">SERVICE CATALOG</Badge> - The category name for the service</li>
                <li><Badge variant="outline">SERVICE NAME</Badge> - The name of the service</li>
                <li><Badge variant="outline">SLA</Badge> - Service Level Agreement time</li>
                <li><Badge variant="outline">RESPONSE TIME</Badge> - Expected response time</li>
                <li><Badge variant="outline">RESOLUTION TIME</Badge> - Expected resolution time</li>
              </ul>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium mb-2">Example CSV format:</p>
                <code className="text-xs">
                  SERVICE CATALOG;SERVICE NAME;SLA;RESPONSE TIME;RESOLUTION TIME<br/>
                  ATM;Pendaftaran Terminal Baru;5 Days;30 Mins;5 Days<br/>
                  User;Reset Password;1 Day;60 Mins;1 Day
                </code>
              </div>
              
              <div className="mt-4 space-y-1">
                <p><strong>Time format support:</strong></p>
                <ul className="list-disc list-inside text-xs ml-4 space-y-1">
                  <li>Days: "5 Days", "1 Day", "7 Hk"</li>
                  <li>Hours: "4 Hrs", "1 Hour"</li>
                  <li>Minutes: "30 Mins", "60 Minutes"</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}