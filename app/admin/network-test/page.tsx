'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Wifi, WifiOff, Activity, Globe, Clock, AlertTriangle } from 'lucide-react';

interface PingResult {
  success: boolean;
  branch?: any;
  atm?: any;
  results?: any[];
  result?: any;
  error?: string;
}

export default function NetworkTestPage() {
  const { data: session } = useSession();
  const [isPinging, setIsPinging] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<'branch' | 'atm' | null>(null);
  const [results, setResults] = useState<PingResult | null>(null);

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 px-4 py-8">
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Access denied. This page is only available to administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const testBranchPing = async () => {
    setIsPinging(true);
    setSelectedEntity('branch');
    setResults(null);

    try {
      // Get first branch with network config
      const branchesRes = await fetch('/api/admin/branches?limit=5');
      const branchesData = await branchesRes.json();
      
      const branchWithIP = branchesData.branches?.find((b: any) => b.ipAddress);
      
      if (!branchWithIP) {
        toast.error('No branches with IP addresses found');
        return;
      }

      // Test ping
      const response = await fetch('/api/monitoring/branches/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: branchWithIP.id })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ping failed');
      }

      setResults(data);
      toast.success('Branch ping test completed');
    } catch (error) {
      console.error('Ping error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to ping branch');
    } finally {
      setIsPinging(false);
    }
  };

  const testATMPing = async () => {
    setIsPinging(true);
    setSelectedEntity('atm');
    setResults(null);

    try {
      // Get first ATM with IP
      const atmsRes = await fetch('/api/admin/atms?limit=5');
      const atmsData = await atmsRes.json();
      
      const atmWithIP = atmsData.atms?.find((a: any) => a.ipAddress);
      
      if (!atmWithIP) {
        toast.error('No ATMs with IP addresses found');
        return;
      }

      // Test ping
      const response = await fetch('/api/monitoring/atms/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atmId: atmWithIP.id })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ping failed');
      }

      setResults(data);
      toast.success('ATM ping test completed');
    } catch (error) {
      console.error('Ping error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to ping ATM');
    } finally {
      setIsPinging(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return <Wifi className="h-5 w-5 text-green-500" />;
      case 'OFFLINE':
        return <WifiOff className="h-5 w-5 text-red-500" />;
      case 'SLOW':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ONLINE: 'bg-green-100 text-green-800',
      OFFLINE: 'bg-red-100 text-red-800',
      SLOW: 'bg-yellow-100 text-yellow-800',
      ERROR: 'bg-orange-100 text-orange-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Network Monitoring Test
        </h1>
        <p className="text-gray-600 mt-2">
          Test network connectivity to branches and ATMs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Test Branch Network</CardTitle>
            <CardDescription>
              Ping the first available branch with network configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testBranchPing}
              disabled={isPinging}
              className="w-full"
            >
              {isPinging && selectedEntity === 'branch' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Test Branch Ping
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Test ATM Network</CardTitle>
            <CardDescription>
              Ping the first available ATM with IP address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testATMPing}
              disabled={isPinging}
              className="w-full"
            >
              {isPinging && selectedEntity === 'atm' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Wifi className="mr-2 h-4 w-4" />
                  Test ATM Ping
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Ping Results</CardTitle>
            <CardDescription>
              Network connectivity test results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.branch && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">Branch: {results.branch.name}</h3>
              </div>
            )}
            
            {results.atm && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">ATM: {results.atm.code} - {results.atm.name}</h3>
              </div>
            )}

            {results.results && results.results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.ipAddress}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.ipType}
                    </Badge>
                  </div>
                  <Badge className={getStatusBadge(result.status)}>
                    {result.status}
                  </Badge>
                </div>

                {result.networkMedia && (
                  <div className="text-sm text-gray-600 mb-2">
                    Network: {result.networkMedia}
                    {result.networkVendor && ` (${result.networkVendor})`}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {result.responseTimeMs !== null && (
                    <div>
                      <span className="text-gray-500">Response Time:</span>
                      <span className="ml-2 font-medium">{result.responseTimeMs}ms</span>
                    </div>
                  )}
                  {result.packetLoss !== null && (
                    <div>
                      <span className="text-gray-500">Packet Loss:</span>
                      <span className="ml-2 font-medium">{result.packetLoss}%</span>
                    </div>
                  )}
                  {result.packetsTransmitted && (
                    <div>
                      <span className="text-gray-500">Packets:</span>
                      <span className="ml-2 font-medium">
                        {result.packetsReceived}/{result.packetsTransmitted}
                      </span>
                    </div>
                  )}
                  {result.avgRtt && (
                    <div>
                      <span className="text-gray-500">Avg RTT:</span>
                      <span className="ml-2 font-medium">{result.avgRtt.toFixed(2)}ms</span>
                    </div>
                  )}
                </div>

                {result.errorMessage && (
                  <Alert className="mt-3 bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {result.errorMessage}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}

            {results.result && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.result.status)}
                    <span className="font-medium">{results.result.ipAddress}</span>
                  </div>
                  <Badge className={getStatusBadge(results.result.status)}>
                    {results.result.status}
                  </Badge>
                </div>

                {results.result.networkMedia && (
                  <div className="text-sm text-gray-600 mb-2">
                    Network: {results.result.networkMedia}
                    {results.result.networkVendor && ` (${results.result.networkVendor})`}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {results.result.responseTimeMs !== null && (
                    <div>
                      <span className="text-gray-500">Response Time:</span>
                      <span className="ml-2 font-medium">{results.result.responseTimeMs}ms</span>
                    </div>
                  )}
                  {results.result.packetLoss !== null && (
                    <div>
                      <span className="text-gray-500">Packet Loss:</span>
                      <span className="ml-2 font-medium">{results.result.packetLoss}%</span>
                    </div>
                  )}
                </div>

                {results.result.errorMessage && (
                  <Alert className="mt-3 bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {results.result.errorMessage}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}