'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Ticket, 
  Users, 
  CreditCard, 
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface DashboardData {
  branch: {
    id: string;
    name: string;
    code: string;
  };
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalATMs: number;
    activeATMs: number;
    openTickets: number;
    pendingApprovals: number;
    resolvedToday: number;
    avgResolutionTime: number;
  };
  recentTickets: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    assignedTo?: {
      name: string;
    };
  }>;
  atmAlerts: Array<{
    id: string;
    atm: {
      code: string;
      name: string;
    };
    type: string;
    severity: string;
    createdAt: string;
  }>;
}

export default function ManagerDashboard() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/manager/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Failed to load dashboard</div>
      </div>
    );
  }

  const { branch, stats, recentTickets, atmAlerts } = dashboardData;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Branch Manager Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              {branch.name} ({branch.code})
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/manager/users">
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </Link>
            <Link href="/manager/atms">
              <Button variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Manage ATMs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Branch Users
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeUsers}</div>
            <p className="text-sm text-gray-600">of {stats.totalUsers} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                ATMs
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeATMs}</div>
            <p className="text-sm text-gray-600">of {stats.totalATMs} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Open Tickets
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.openTickets}</div>
            <p className="text-sm text-gray-600">
              {stats.pendingApprovals} pending assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Avg Resolution
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgResolutionTime}h</div>
            <p className="text-sm text-gray-600">
              {stats.resolvedToday} resolved today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Tickets</span>
              <Link href="/manager/tickets">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets.length === 0 ? (
                <p className="text-center py-4 text-gray-500">No recent tickets</p>
              ) : (
                recentTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Link href={`/tickets/${ticket.id}`} className="font-medium hover:underline">
                        {ticket.title}
                      </Link>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {ticket.assignedTo && (
                          <span>Assigned to: {ticket.assignedTo.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        ticket.priority === 'URGENT' ? 'destructive' :
                        ticket.priority === 'HIGH' ? 'warning' :
                        'secondary'
                      }>
                        {ticket.priority}
                      </Badge>
                      <Badge variant={
                        ticket.status === 'OPEN' ? 'default' :
                        ticket.status === 'IN_PROGRESS' ? 'warning' :
                        ticket.status === 'RESOLVED' ? 'success' :
                        'secondary'
                      }>
                        {ticket.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* ATM Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                ATM Alerts
              </span>
              <Link href="/manager/atms">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {atmAlerts.length === 0 ? (
                <p className="text-center py-4 text-gray-500">No active alerts</p>
              ) : (
                atmAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {alert.atm.name} ({alert.atm.code})
                      </div>
                      <div className="text-sm text-gray-600">
                        {alert.type} - {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant={
                      alert.severity === 'CRITICAL' ? 'destructive' :
                      alert.severity === 'HIGH' ? 'warning' :
                      'secondary'
                    }>
                      {alert.severity}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}