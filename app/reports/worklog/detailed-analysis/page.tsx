'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Clock, Users, CheckCircle, TrendingUp, Download,
  Activity, Target, Zap, Calendar, FileText
} from 'lucide-react';

interface TechnicianWorklog {
  id: string;
  name: string;
  email: string;
  branch: string;
  branchCode: string;
  totalTasks: number;
  recentTasks: number;
  weeklyTasks: number;
  dailyTasks: number;
  totalHoursLogged: number;
  recentHoursLogged: number;
  weeklyHoursLogged: number;
  avgHoursPerTask: number;
  efficiency: number;
  efficiencyTasks: number;
  taskByCategory: Record<string, number>;
  taskByService: Record<string, number>;
  taskByPriority: Record<string, number>;
  avgCompletionByCategory: Array<{
    category: string;
    count: number;
    avgMinutes: number;
  }>;
  dailyWorklog: Array<{
    date: string;
    taskCount: number;
    minutesLogged: number;
    hoursLogged: number;
  }>;
  productivity: {
    tasksPerDay: number;
    hoursPerDay: number;
    avgTaskDuration: number;
  };
}

interface TaskTypeAnalysis {
  id: string;
  name: string;
  description?: string;
  category?: string;
  estimatedMinutes: number;
  estimatedHours: number;
  totalTasks: number;
  recentTasks: number;
  weeklyTasks: number;
  totalHours: number;
  avgMinutes: number;
  avgHours: number;
  minMinutes: number;
  maxMinutes: number;
  efficiency: number;
  completionRate: number;
  items: Array<{
    id: string;
    name: string;
    description?: string;
    isRequired: boolean;
  }>;
  priorityDistribution: Record<string, number>;
  serviceDistribution: Record<string, number>;
  branchDistribution: Record<string, number>;
  topTechnicians: Array<{
    name: string;
    email: string;
    branch: string;
    taskCount: number;
    totalMinutes: number;
    avgMinutes: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    taskCount: number;
    totalMinutes: number;
    avgMinutes: number;
  }>;
}

interface WorklogData {
  summary: {
    totalTechnicians: number;
    activeTechnicians: number;
    totalTasksCompleted: number;
    totalHoursLogged: number;
    avgTasksPerTechnician: number;
    avgHoursPerTechnician: number;
    avgEfficiency: number;
  };
  technicians: TechnicianWorklog[];
  topPerformers: {
    byTasks: TechnicianWorklog[];
    byHours: TechnicianWorklog[];
    byEfficiency: TechnicianWorklog[];
  };
  categoryStats: Record<string, any>;
}

interface TaskTypeData {
  summary: {
    totalTaskTypes: number;
    activeTaskTypes: number;
    totalTasksCompleted: number;
    totalHoursLogged: number;
    avgTasksPerType: number;
    avgHoursPerType: number;
    avgEfficiency: number;
  };
  taskTypes: TaskTypeAnalysis[];
  categoryAnalysis: Record<string, any>;
  mostUsedTaskTypes: TaskTypeAnalysis[];
  mostEfficientTaskTypes: TaskTypeAnalysis[];
}

const COLORS = ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'];

const tabConfig = [
  { id: 'technician', label: 'Technician', icon: Users },
  { id: 'tasktype', label: 'Task Type', icon: FileText },
  { id: 'productivity', label: 'Productivity', icon: Activity },
  { id: 'efficiency', label: 'Efficiency', icon: Zap },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
];

export default function WorklogDetailedAnalysisPage() {
  const [technicianData, setTechnicianData] = useState<WorklogData | null>(null);
  const [taskTypeData, setTaskTypeData] = useState<TaskTypeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('technician');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [techResponse, taskResponse] = await Promise.all([
        fetch('/api/reports/worklog/technician'),
        fetch('/api/reports/worklog/task-type')
      ]);

      if (!techResponse.ok || !taskResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [techResult, taskResult] = await Promise.all([
        techResponse.json(),
        taskResponse.json()
      ]);

      setTechnicianData(techResult);
      setTaskTypeData(taskResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = (type: 'technician' | 'tasktype') => {
    if (type === 'technician' && technicianData) {
      const csvData = technicianData.technicians.map(tech => ({
        Name: tech.name,
        Email: tech.email,
        Branch: tech.branch,
        'Total Tasks': tech.totalTasks,
        'Total Hours Logged': tech.totalHoursLogged,
        'Avg Hours Per Task': tech.avgHoursPerTask,
        'Efficiency (%)': tech.efficiency,
        'Weekly Tasks': tech.weeklyTasks,
        'Weekly Hours': tech.weeklyHoursLogged,
        'Tasks Per Day': tech.productivity.tasksPerDay.toFixed(1),
        'Hours Per Day': tech.productivity.hoursPerDay.toFixed(1)
      }));

      downloadCsv(csvData, `technician-worklog-${new Date().toISOString().split('T')[0]}.csv`);
    } else if (type === 'tasktype' && taskTypeData) {
      const csvData = taskTypeData.taskTypes.map(task => ({
        'Task Type': task.name,
        'Category': task.category || 'Uncategorized',
        'Total Tasks Completed': task.totalTasks,
        'Total Hours': task.totalHours,
        'Avg Hours': task.avgHours,
        'Estimated Hours': task.estimatedHours,
        'Efficiency (%)': task.efficiency,
        'Min Minutes': task.minMinutes,
        'Max Minutes': task.maxMinutes
      }));

      downloadCsv(csvData, `task-type-worklog-${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const downloadCsv = (data: any[], filename: string) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  if (!technicianData || !taskTypeData) return null;

  const techProductivityData = technicianData.technicians.map(tech => ({
    name: tech.name.length > 10 ? tech.name.substring(0, 10) + '...' : tech.name,
    fullName: tech.name,
    tasksPerDay: tech.productivity.tasksPerDay,
    hoursPerDay: tech.productivity.hoursPerDay,
    efficiency: tech.efficiency,
    totalTasks: tech.totalTasks
  }));

  const taskTypeEfficiencyData = taskTypeData.taskTypes
    .filter(t => t.efficiency > 0)
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 10)
    .map(task => ({
      name: task.name.length > 15 ? task.name.substring(0, 15) + '...' : task.name,
      fullName: task.name,
      efficiency: task.efficiency,
      totalTasks: task.totalTasks,
      avgHours: task.avgHours
    }));

  const categoryData = Object.entries(taskTypeData.categoryAnalysis).map(([category, stats]) => ({
    name: category,
    taskTypes: stats.taskTypes,
    totalTasks: stats.totalTasks,
    totalHours: stats.totalHours.toFixed(1),
    avgEfficiency: stats.avgEfficiency.toFixed(1)
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worklog Analysis Report</h1>
          <p className="text-muted-foreground">Comprehensive time tracking and productivity analysis</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportToCsv('technician')} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Technician
          </Button>
          <Button onClick={() => exportToCsv('tasktype')} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Task Types
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianData.summary.totalTechnicians}</div>
            <p className="text-xs text-muted-foreground">Active: {technicianData.summary.activeTechnicians}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianData.summary.totalTasksCompleted}</div>
            <p className="text-xs text-muted-foreground">Completed tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianData.summary.totalHoursLogged}</div>
            <p className="text-xs text-muted-foreground">Hours logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tasks/Tech</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianData.summary.avgTasksPerTechnician}</div>
            <p className="text-xs text-muted-foreground">Per technician</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours/Tech</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianData.summary.avgHoursPerTechnician}</div>
            <p className="text-xs text-muted-foreground">Per technician</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianData.summary.avgEfficiency}%</div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Types</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskTypeData.summary.totalTaskTypes}</div>
            <p className="text-xs text-muted-foreground">Active: {taskTypeData.summary.activeTaskTypes}</p>
          </CardContent>
        </Card>
      </div>

      <div className="w-full">
        <div className="border-b mb-6">
          <nav className="flex gap-6 overflow-x-auto" aria-label="Tabs">
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                    ${isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === 'technician' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers by Tasks Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={technicianData.topPerformers.byTasks.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalTasks" fill="#f59e0b" name="Total Tasks" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performers by Hours Logged</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={technicianData.topPerformers.byHours.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalHoursLogged" fill="#d97706" name="Hours Logged" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Individual Technician Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Individual Performance Details</h3>
              <div className="grid gap-4">
                {technicianData.technicians.slice(0, 10).map((tech) => (
                  <Card key={tech.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>{tech.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">{tech.name}</h4>
                            <p className="text-sm text-muted-foreground">{tech.email}</p>
                            <Badge variant="outline" className="mt-1">{tech.branch}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={tech.efficiency >= 80 ? "default" : "secondary"}>
                            {tech.efficiency}% Efficiency
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mt-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold">{tech.totalTasks}</div>
                          <div className="text-xs text-muted-foreground">Total Tasks</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">{tech.totalHoursLogged}</div>
                          <div className="text-xs text-muted-foreground">Total Hours</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">{tech.avgHoursPerTask}</div>
                          <div className="text-xs text-muted-foreground">Avg/Task</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-600">{tech.weeklyTasks}</div>
                          <div className="text-xs text-muted-foreground">This Week</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{tech.productivity.tasksPerDay.toFixed(1)}</div>
                          <div className="text-xs text-muted-foreground">Tasks/Day</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{tech.productivity.hoursPerDay.toFixed(1)}</div>
                          <div className="text-xs text-muted-foreground">Hours/Day</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{tech.productivity.avgTaskDuration.toFixed(0)}</div>
                          <div className="text-xs text-muted-foreground">Min/Task</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{tech.recentTasks}</div>
                          <div className="text-xs text-muted-foreground">Recent</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasktype' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Most Used Task Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={taskTypeData.mostUsedTaskTypes.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(label) => {
                          const task = taskTypeData.mostUsedTaskTypes.find(t => t.name === label);
                          return task?.name || label;
                        }}
                      />
                      <Bar dataKey="totalTasks" fill="#f59e0b" name="Tasks Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Task Category Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, totalTasks }) => `${name} (${totalTasks})`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalTasks"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Task Type Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Task Type Performance Details</h3>
              <div className="grid gap-4">
                {taskTypeData.taskTypes.slice(0, 10).map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{task.name}</h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {task.category && (
                              <Badge variant="outline">{task.category}</Badge>
                            )}
                            <Badge variant={task.efficiency >= 80 ? "default" : "secondary"}>
                              {task.efficiency}% Efficiency
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{task.totalTasks}</div>
                          <div className="text-xs text-muted-foreground">Total Completed</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">{task.estimatedHours}</div>
                          <div className="text-xs text-muted-foreground">Estimated</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">{task.avgHours}</div>
                          <div className="text-xs text-muted-foreground">Actual Avg</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-600">{Math.round(task.minMinutes)}</div>
                          <div className="text-xs text-muted-foreground">Min Minutes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-600">{Math.round(task.maxMinutes)}</div>
                          <div className="text-xs text-muted-foreground">Max Minutes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-600">{task.recentTasks}</div>
                          <div className="text-xs text-muted-foreground">Recent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-orange-600">{task.totalHours}</div>
                          <div className="text-xs text-muted-foreground">Total Hours</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'productivity' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Technician Productivity Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={techProductivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      labelFormatter={(label) => {
                        const tech = techProductivityData.find(t => t.name === label);
                        return tech?.fullName || label;
                      }}
                    />
                    <Bar yAxisId="left" dataKey="tasksPerDay" fill="#f59e0b" name="Tasks/Day" />
                    <Bar yAxisId="right" dataKey="hoursPerDay" fill="#d97706" name="Hours/Day" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'efficiency' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Most Efficient Task Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={taskTypeEfficiencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) => {
                        const task = taskTypeEfficiencyData.find(t => t.name === label);
                        return task?.fullName || label;
                      }}
                    />
                    <Bar dataKey="efficiency" fill="#22c55e" name="Efficiency %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Worklog Trend (Sample Technician)</CardTitle>
              </CardHeader>
              <CardContent>
                {technicianData.technicians[0] && (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={technicianData.technicians[0].dailyWorklog}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="taskCount" stroke="#f59e0b" name="Tasks" />
                      <Line yAxisId="right" type="monotone" dataKey="hoursLogged" stroke="#d97706" name="Hours" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
