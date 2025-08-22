'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

interface CleanupResult {
  success: boolean;
  message: string;
  details?: Record<string, number>;
  totalDeleted?: number;
  error?: string;
}

export default function DatabaseCleanupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);

  const handleCleanup = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to connect to server',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Database Cleanup</h1>
        <p className="text-gray-600 mt-2">
          Remove all data from the database except user accounts
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Warning: Destructive Operation
          </CardTitle>
          <CardDescription>
            This action will permanently delete all data from the following tables:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
            <div>• Tickets & Comments</div>
            <div>• Services & Categories</div>
            <div>• ATM Monitoring</div>
            <div>• SLA Templates</div>
            <div>• Task Templates</div>
            <div>• Vendors</div>
            <div>• Branches</div>
            <div>• Knowledge Articles</div>
            <div>• Audit Logs</div>
          </div>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800 font-medium">
              ✓ User accounts, sessions, and authentication data will be preserved
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 mb-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isLoading ? 'Cleaning...' : 'Clean Database'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all data from the database except user accounts.
                <br /><br />
                <strong>This includes:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All tickets and their comments</li>
                  <li>All services and categories</li>
                  <li>All ATM monitoring data</li>
                  <li>All SLA templates and tracking</li>
                  <li>All task templates</li>
                  <li>All vendor information</li>
                  <li>All branches</li>
                  <li>All knowledge articles</li>
                  <li>All audit logs</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCleanup}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, delete all data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {result && (
        <Card className={result.success ? 'border-green-200' : 'border-red-200'}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${
              result.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {result.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              {result.success ? 'Cleanup Successful' : 'Cleanup Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{result.message}</p>
            
            {result.success && result.details && (
              <div>
                <h4 className="font-medium mb-2">Deleted Records:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {Object.entries(result.details).map(([table, count]) => (
                    <div key={table} className="flex justify-between">
                      <span className="capitalize">{table.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
                </div>
                {result.totalDeleted && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between font-medium">
                      <span>Total Deleted:</span>
                      <span className="font-mono">{result.totalDeleted}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!result.success && result.error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {result.error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}