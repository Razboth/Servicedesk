'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter
} from 'recharts';
import { 
  Users, Activity, Clock, TrendingUp, Download, 
  UserCheck, UserX, AlertTriangle, MessageCircle, Calendar
} from 'lucide-react';

interface UserActivity {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  branch: string;
  branchCode: string;
  createdAt: Date;
  lastLogin: Date | null;
  totalTickets: number;
  recentTickets: number;
  weeklyTickets: number;
  dailyTickets: number;
  totalComments: number;
  recentComments: number;
  weeklyComments: number;
  totalLogins: number;
  recentLogins: number;
  weeklyLogins: number;
  failedLogins: number;
  activityScore: number;
  avgTicketsPerWeek: number;
  avgCommentsPerTicket: number;
  daysSinceLastActivity: number;
  recentTicketTrend: number;
  serviceUsage: Record<string, number>;
  categoryUsage: Record<string, number>;
  priorityUsage: Record<string, number>;
  isActive: boolean;
  activityLevel: 'High' | 'Medium' | 'Low' | 'Inactive';
}

interface ReportData {
  summary: {
    totalUsers: number;
    activeUsers: number;
    highActivityUsers: number;
    inactiveUsers: number;
    avgActivityScore: number;
    avgTicketsPerUser: number;
    activityRate: number;
  };
  users: UserActivity[];
  mostActiveUsers: UserActivity[];
  recentlyInactiveUsers: UserActivity[];
  roleAnalysis: Record<string, any>;
  branchAnalysis: Record<string, any>;
}

const COLORS = ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'];
const ACTIVITY_COLORS = {
  'High': '#22c55e',
  'Medium': '#f59e0b', 
  'Low': '#ef4444',
  'Inactive': '#6b7280'
};

export default function UserActivityReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/user/activity');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    if (!data) return;

    const csvData = data.users.map(user => ({
      Name: user.name,
      Email: user.email,
      Role: user.role,
      Branch: user.branch,
      'Activity Level': user.activityLevel,
      'Activity Score': user.activityScore,
      'Total Tickets': user.totalTickets,
      'Recent Tickets (30d)': user.recentTickets,
      'Total Comments': user.totalComments,
      'Recent Comments (30d)': user.recentComments,
      'Total Logins': user.totalLogins,
      'Recent Logins (30d)': user.recentLogins,
      'Failed Logins': user.failedLogins,
      'Days Since Last Activity': user.daysSinceLastActivity,
      'Avg Tickets Per Week': user.avgTicketsPerWeek,
      'Avg Comments Per Ticket': user.avgCommentsPerTicket,
      'Last Login': user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `user-activity-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActivityBadgeColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-green-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-red-500';
      case 'Inactive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error loading report: {error}</p>
            <Button onClick={fetchData}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const activityLevelData = Object.entries(
    data.users.reduce((acc: any, user) => {
      acc[user.activityLevel] = (acc[user.activityLevel] || 0) + 1;
      return acc;
    }, {})
  ).map(([level, count]) => ({
    name: level,
    value: count as number,
    fill: ACTIVITY_COLORS[level as keyof typeof ACTIVITY_COLORS]
  }));

  const roleChartData = Object.entries(data.roleAnalysis).map(([role, stats]) => ({
    role,
    users: stats.count,
    activeUsers: stats.activeUsers,
    avgActivityScore: stats.avgActivityScore,
    avgTicketsPerUser: stats.avgTicketsPerUser,
    activityRate: stats.activityRate
  }));

  const branchChartData = Object.entries(data.branchAnalysis).map(([branch, stats]) => ({
    branch: branch.length > 15 ? branch.substring(0, 15) + '...' : branch,
    fullBranch: branch,
    users: stats.users,
    activeUsers: stats.activeUsers,
    avgActivityScore: stats.avgActivityScore,
    activityRate: stats.activityRate
  }));

  const activityScatterData = data.users.map(user => ({
    x: user.totalTickets,
    y: user.activityScore,
    name: user.name,
    role: user.role,
    activityLevel: user.activityLevel
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Activity Report</h1>
          <p className="text-muted-foreground">Comprehensive user engagement and activity analysis</p>
        </div>
        <Button onClick={exportToCsv} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalUsers}</div>
            <p className="text-xs text-muted-foreground">All system users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.summary.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Active in last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{data.summary.highActivityUsers}</div>
            <p className="text-xs text-muted-foreground">Score ≥ 70</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.summary.inactiveUsers}</div>
            <p className="text-xs text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.activityRate}%</div>
            <p className="text-xs text-muted-foreground">Overall engagement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Activity Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgActivityScore}</div>
            <p className="text-xs text-muted-foreground">Out of 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tickets/User</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgTicketsPerUser}</div>
            <p className="text-xs text-muted-foreground">Per user average</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="individual">Individual Users</TabsTrigger>
          <TabsTrigger value="roles">Role Analysis</TabsTrigger>
          <TabsTrigger value="branches">Branch Analysis</TabsTrigger>
          <TabsTrigger value="engagement">Engagement Patterns</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activityLevelData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activityLevelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.mostActiveUsers.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="activityScore" fill="#f59e0b" name="Activity Score" />
                    <Bar dataKey="recentTickets" fill="#d97706" name="Recent Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          <div className="grid gap-4">
            {data.users.slice(0, 20).map((user) => (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        {user.avatar ? (
                          <AvatarImage src={user.avatar} alt={user.name} />
                        ) : (
                          <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{user.role}</Badge>
                          <Badge variant="outline">{user.branch}</Badge>
                          <Badge className={getActivityBadgeColor(user.activityLevel)}>
                            {user.activityLevel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Activity Score: <strong>{user.activityScore}/100</strong>
                          </span>
                          {user.lastLogin && (
                            <span className="text-xs text-muted-foreground">
                              Last Login: {new Date(user.lastLogin).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {user.daysSinceLastActivity === 0 ? 'Active today' :
                         user.daysSinceLastActivity === 1 ? '1 day ago' :
                         user.daysSinceLastActivity <= 7 ? `${user.daysSinceLastActivity} days ago` :
                         user.daysSinceLastActivity <= 30 ? `${Math.floor(user.daysSinceLastActivity / 7)} weeks ago` :
                         `${Math.floor(user.daysSinceLastActivity / 30)} months ago`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{user.totalTickets}</div>
                      <div className="text-xs text-muted-foreground">Total Tickets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{user.recentTickets}</div>
                      <div className="text-xs text-muted-foreground">Recent (30d)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">{user.totalComments}</div>
                      <div className="text-xs text-muted-foreground">Comments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-600">{user.recentComments}</div>
                      <div className="text-xs text-muted-foreground">Recent (30d)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{user.totalLogins}</div>
                      <div className="text-xs text-muted-foreground">Total Logins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{user.recentLogins}</div>
                      <div className="text-xs text-muted-foreground">Recent (30d)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{user.failedLogins}</div>
                      <div className="text-xs text-muted-foreground">Failed Logins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{user.avgTicketsPerWeek}</div>
                      <div className="text-xs text-muted-foreground">Avg/Week</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity by Role</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={roleChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="role" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="#f59e0b" name="Total Users" />
                  <Bar dataKey="activeUsers" fill="#d97706" name="Active Users" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity by Branch</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={branchChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="branch" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => {
                      const branch = branchChartData.find(b => b.branch === label);
                      return branch?.fullBranch || label;
                    }}
                  />
                  <Bar dataKey="users" fill="#f59e0b" name="Total Users" />
                  <Bar dataKey="activeUsers" fill="#d97706" name="Active Users" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tickets vs Activity Score Correlation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={activityScatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" name="Total Tickets" />
                  <YAxis dataKey="y" name="Activity Score" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} 
                    formatter={(value, name) => [value, name === 'x' ? 'Total Tickets' : 'Activity Score']}
                    labelFormatter={(label) => `User: ${activityScatterData[label]?.name || 'Unknown'}`}
                  />
                  <Scatter dataKey="y" fill="#f59e0b" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Recently Inactive Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentlyInactiveUsers.slice(0, 10).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          ) : (
                            <AvatarFallback className="text-xs">{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.role} • {user.branch}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {user.daysSinceLastActivity} days ago
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.totalTickets} tickets total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-red-500" />
                  Users with Failed Logins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.users
                    .filter(u => u.failedLogins > 0)
                    .sort((a, b) => b.failedLogins - a.failedLogins)
                    .slice(0, 10)
                    .map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          ) : (
                            <AvatarFallback className="text-xs">{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive" className="text-xs">
                          {user.failedLogins} failed
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.totalLogins} successful
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}