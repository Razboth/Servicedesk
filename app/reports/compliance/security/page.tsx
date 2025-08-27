'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExportButton } from '@/components/reports/export-button';
import { ReportCharts } from '@/components/reports/report-charts';
import { Shield, AlertTriangle, Lock, Users, Calendar, MapPin } from 'lucide-react';

interface SecurityComplianceData {
  summary: {
    totalSecurityIncidents: number;
    criticalIncidents: number;
    avgResponseTime: number;
    complianceScore: number;
    securityScore: number;
    riskLevel: string;
  };
  incidentAnalysis: {
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    trends: Array<{ date: string; incidents: number; critical: number }>;
  };
  responseAnalysis: {
    avgResponseTime: number;
    avgResolutionTime: number;
    responseTimeByType: Record<string, number>;
    slaCompliance: number;
    escalationRate: number;
  };
  accessCompliance: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    privilegedUsers: number;
    accessViolations: number;
    roleCompliance: Record<string, {
      total: number;
      compliant: number;
      violations: number;
    }>;
  };
  auditTrail: {
    totalAuditEvents: number;
    criticalEvents: number;
    auditByCategory: Record<string, number>;
    complianceGaps: Array<{
      category: string;
      severity: string;
      count: number;
      description: string;
    }>;
  };
  changeManagement: {
    totalChanges: number;
    approvedChanges: number;
    emergencyChanges: number;
    changeCompliance: number;
    changesByType: Record<string, number>;
    changeRisks: Array<{
      type: string;
      risk: string;
      count: number;
    }>;
  };
  regionalSecurity: Record<string, {
    incidents: number;
    criticalIncidents: number;
    avgResponseTime: number;
    complianceScore: number;
    riskLevel: string;
  }>;
  insights: {
    topSecurityRisks: Array<{ risk: string; severity: string; frequency: number; impact: string }>;
    complianceGaps: Array<{ area: string; currentScore: number; targetScore: number; priority: string }>;
    securityTrends: Array<{ metric: string; trend: string; change: number }>;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export default function SecurityComplianceReport() {
  const { data: session } = useSession();
  const [data, setData] = useState<SecurityComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });
      
      const response = await fetch(`/api/reports/compliance/security?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching security compliance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;
    
    const exportData = {
      reportTitle: 'Security & Compliance Report',
      dateRange: `${startDate} to ${endDate}`,
      ...data,
      generatedAt: new Date().toISOString()
    };

    if (format === 'xlsx') {
      console.log('Exporting to Excel:', exportData);
    } else if (format === 'pdf') {
      console.log('Exporting to PDF:', exportData);
    } else if (format === 'csv') {
      console.log('Exporting to CSV:', exportData);
    }
  };

  useEffect(() => {
    if (session?.user && session.user.role === 'ADMIN') {
      fetchData();
    }
  }, [session, startDate, endDate]);

  if (!session) {
    return <div className="p-6">Please log in to view this report.</div>;
  }

  if (session.user.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            Only administrators can view security compliance reports.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">Error loading report: {error}</div>
          <Button onClick={fetchData}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6">No data available</div>;
  }

  const chartData = {
    incidentTrends: data.incidentAnalysis.trends.map(item => ({
      date: item.date,
      incidents: item.incidents,
      critical: item.critical
    })),
    incidentsByType: Object.entries(data.incidentAnalysis.byType).map(([type, count]) => ({
      name: type,
      value: count
    })),
    incidentsBySeverity: Object.entries(data.incidentAnalysis.bySeverity).map(([severity, count]) => ({
      name: severity,
      value: count
    })),
    auditByCategory: Object.entries(data.auditTrail.auditByCategory).map(([category, count]) => ({
      name: category,
      value: count
    }))
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security & Compliance Report</h1>
          <p className="text-gray-600 mt-1">
            Security incidents, compliance monitoring, and risk assessment
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButton 
            onExport={handleExport} 
            reportName="Security & Compliance Report"
            disabled={!data} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchData} className="w-full">
                Update Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalSecurityIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.criticalIncidents} critical incidents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(data.summary.complianceScore)}`}>
              {data.summary.complianceScore.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall compliance rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(data.summary.securityScore)}`}>
              {data.summary.securityScore.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Security posture rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(data.summary.riskLevel)}`}>
              {data.summary.riskLevel}
            </div>
            <p className="text-xs text-muted-foreground">
              Current risk assessment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Security Incident Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.incidentTrends}
              type="line"
              title="Daily Security Incidents"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.incidentsByType}
              type="pie"
              title="Security Incident Categories"
            />
          </CardContent>
        </Card>
      </div>

      {/* Access Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>Access Control Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{data.accessCompliance.totalUsers}</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.accessCompliance.activeUsers}</div>
              <div className="text-sm text-gray-500">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{data.accessCompliance.privilegedUsers}</div>
              <div className="text-sm text-gray-500">Privileged Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{data.accessCompliance.accessViolations}</div>
              <div className="text-sm text-gray-500">Access Violations</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium">Role Compliance</h4>
            {Object.entries(data.accessCompliance.roleCompliance).map(([role, compliance], index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{role}</div>
                  <div className="text-sm text-gray-500">{compliance.total} total users</div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="font-bold text-green-600">{compliance.compliant}</div>
                    <div className="text-xs text-gray-500">compliant</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-red-600">{compliance.violations}</div>
                    <div className="text-xs text-gray-500">violations</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">
                      {((compliance.compliant / compliance.total) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">compliance rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Change Management */}
      <Card>
        <CardHeader>
          <CardTitle>Change Management Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{data.changeManagement.totalChanges}</div>
              <div className="text-sm text-gray-500">Total Changes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.changeManagement.approvedChanges}</div>
              <div className="text-sm text-gray-500">Approved Changes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{data.changeManagement.emergencyChanges}</div>
              <div className="text-sm text-gray-500">Emergency Changes</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getComplianceColor(data.changeManagement.changeCompliance)}`}>
                {data.changeManagement.changeCompliance.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Compliance Rate</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Change Risks</h4>
            {data.changeManagement.changeRisks.map((risk, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{risk.type}</div>
                  <div className="text-sm text-gray-500">{risk.count} occurrences</div>
                </div>
                <Badge variant={getRiskBadge(risk.risk)}>
                  {risk.risk} Risk
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regional Security */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Security Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.regionalSecurity).slice(0, 10).map(([region, security], index) => (
              <div key={index} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">{region}</span>
                  </div>
                  <Badge variant={getRiskBadge(security.riskLevel)}>
                    {security.riskLevel} Risk
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold">{security.incidents}</div>
                    <div className="text-gray-500">incidents</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-red-600">{security.criticalIncidents}</div>
                    <div className="text-gray-500">critical</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{security.avgResponseTime.toFixed(1)}h</div>
                    <div className="text-gray-500">response time</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${getComplianceColor(security.complianceScore)}`}>
                      {security.complianceScore.toFixed(1)}%
                    </div>
                    <div className="text-gray-500">compliance</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail & Compliance Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-2xl font-bold">{data.auditTrail.totalAuditEvents}</div>
              <div className="text-sm text-gray-500">
                {data.auditTrail.criticalEvents} critical events
              </div>
            </div>
            <ReportCharts 
              data={chartData.auditByCategory}
              type="bar"
              title="Audit Events by Category"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.auditTrail.complianceGaps.slice(0, 5).map((gap, index) => (
                <div key={index} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{gap.category}</div>
                    <Badge variant={getRiskBadge(gap.severity)}>
                      {gap.severity}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">{gap.description}</div>
                  <div className="text-xs text-gray-500 mt-1">{gap.count} occurrences</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Security Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.topSecurityRisks.slice(0, 5).map((risk, index) => (
                <div key={index} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{risk.risk}</div>
                    <Badge variant={getRiskBadge(risk.severity)}>
                      {risk.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      Frequency: <span className="font-bold">{risk.frequency}</span>
                    </div>
                    <div>
                      Impact: <span className="font-bold">{risk.impact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.securityTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{trend.metric}</div>
                    <div className="text-sm text-gray-500">{trend.trend} trend</div>
                  </div>
                  <div className={`text-right font-bold ${
                    trend.change > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Immediate Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.immediate.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-600">Short-term Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.shortTerm.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">Long-term Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.longTerm.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}