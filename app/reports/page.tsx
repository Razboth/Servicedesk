'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Clock, 
  AlertTriangle,
  Building,
  Settings,
  Shield,
  Monitor,
  BookOpen,
  CheckCircle,
  PieChart,
  Activity
} from 'lucide-react';

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: any;
  category: string;
  roles: string[];
  badge?: string;
}

const reportCards: ReportCard[] = [
  // Technician Reports
  {
    title: 'My Performance Dashboard',
    description: 'Personal KPIs, response times, and SLA compliance tracking',
    href: '/reports/technician/performance',
    icon: Target,
    category: 'Personal Analytics',
    roles: ['TECHNICIAN'],
    badge: 'Personal'
  },
  {
    title: 'Technical Issue Intelligence',
    description: 'Error patterns, knowledge discovery, and solution effectiveness',
    href: '/reports/technician/technical-issues',
    icon: AlertTriangle,
    category: 'Technical Analysis',
    roles: ['TECHNICIAN'],
    badge: 'Learning'
  },
  {
    title: 'Task Execution Report',
    description: 'Task performance, completion times, and efficiency trends',
    href: '/reports/technician/task-execution',
    icon: CheckCircle,
    category: 'Task Management',
    roles: ['TECHNICIAN']
  },

  // Manager Reports
  {
    title: 'Team Performance Analytics',
    description: 'Technician comparison, workload balance, and training needs',
    href: '/reports/manager/team-performance',
    icon: Users,
    category: 'Team Management',
    roles: ['MANAGER'],
    badge: 'Team'
  },
  {
    title: 'Branch Operations Report',
    description: 'Branch health, geographic analysis, and resource utilization',
    href: '/reports/manager/branch-operations',
    icon: Building,
    category: 'Operations',
    roles: ['MANAGER']
  },
  {
    title: 'Approval Workflow Analytics',
    description: 'Approval efficiency, bottlenecks, and workflow optimization',
    href: '/reports/manager/approvals',
    icon: Clock,
    category: 'Process Management',
    roles: ['MANAGER']
  },

  // Admin Reports
  {
    title: 'Service Catalog Performance',
    description: 'Service popularity, efficiency metrics, and optimization opportunities',
    href: '/reports/admin/service-catalog',
    icon: Settings,
    category: 'Service Management',
    roles: ['ADMIN'],
    badge: 'Strategic'
  },
  {
    title: 'SLA & Performance Excellence',
    description: 'SLA compliance, performance benchmarking, and improvement insights',
    href: '/reports/admin/sla-performance',
    icon: TrendingUp,
    category: 'Performance',
    roles: ['ADMIN']
  },
  {
    title: 'User & Access Analytics',
    description: 'User engagement, role effectiveness, and system adoption patterns',
    href: '/reports/admin/user-analytics',
    icon: Shield,
    category: 'User Management',
    roles: ['ADMIN']
  },

  // Infrastructure Reports (Multiple Roles)
  {
    title: 'ATM Infrastructure Intelligence',
    description: 'ATM health, incident correlation, and maintenance optimization',
    href: '/reports/infrastructure/atm-intelligence',
    icon: Monitor,
    category: 'Infrastructure',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Infrastructure'
  },
  {
    title: 'Technical Problem Trends',
    description: 'System errors, hardware failures, and network issue patterns',
    href: '/reports/infrastructure/technical-trends',
    icon: Activity,
    category: 'Technical Analysis',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
  },

  // Business Intelligence (Manager & Admin)
  {
    title: 'Operational Excellence Report',
    description: 'Resource planning, cost analysis, and strategic planning insights',
    href: '/reports/business/operational-excellence',
    icon: BarChart3,
    category: 'Business Intelligence',
    roles: ['MANAGER', 'ADMIN'],
    badge: 'Strategic'
  },
  {
    title: 'Customer Experience Analytics',
    description: 'Service quality, response time impact, and customer satisfaction',
    href: '/reports/business/customer-experience',
    icon: BookOpen,
    category: 'Customer Analytics',
    roles: ['MANAGER', 'ADMIN']
  },

  // Compliance Reports (Admin only)
  {
    title: 'Security & Compliance Dashboard',
    description: 'Security incidents, change management, and audit trail tracking',
    href: '/reports/compliance/security',
    icon: Shield,
    category: 'Compliance',
    roles: ['ADMIN'],
    badge: 'Security'
  },
  {
    title: 'Data Quality & System Health',
    description: 'Data integrity, system performance, and reliability metrics',
    href: '/reports/compliance/system-health',
    icon: PieChart,
    category: 'System Health',
    roles: ['ADMIN']
  }
];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  // Filter reports based on user role
  const availableReports = reportCards.filter(report => 
    report.roles.includes(session.user?.role || '')
  );

  // Group reports by category
  const reportsByCategory = availableReports.reduce((acc, report) => {
    if (!acc[report.category]) {
      acc[report.category] = [];
    }
    acc[report.category].push(report);
    return acc;
  }, {} as Record<string, ReportCard[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Personal Analytics': return Target;
      case 'Technical Analysis': return AlertTriangle;
      case 'Task Management': return CheckCircle;
      case 'Team Management': return Users;
      case 'Operations': return Building;
      case 'Process Management': return Clock;
      case 'Service Management': return Settings;
      case 'Performance': return TrendingUp;
      case 'User Management': return Shield;
      case 'Infrastructure': return Monitor;
      case 'Business Intelligence': return BarChart3;
      case 'Customer Analytics': return BookOpen;
      case 'Compliance': return Shield;
      case 'System Health': return PieChart;
      default: return Activity;
    }
  };

  const getBadgeVariant = (badge?: string) => {
    switch (badge) {
      case 'Personal': return 'default';
      case 'Learning': return 'secondary';
      case 'Team': return 'outline';
      case 'Strategic': return 'destructive';
      case 'Infrastructure': return 'secondary';
      case 'Security': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Comprehensive analytics and insights for {session.user?.role?.toLowerCase()} role
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-sm">
                    {session.user?.role}
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    {availableReports.length} Reports Available
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Reports Grid by Category */}
          {Object.entries(reportsByCategory).map(([category, reports]) => {
            const CategoryIcon = getCategoryIcon(category);
            
            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CategoryIcon className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">{category}</h2>
                  <Badge variant="outline" className="text-xs">
                    {reports.length} report{reports.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reports.map((report) => {
                    const ReportIcon = report.icon;
                    
                    return (
                      <Link key={report.href} href={report.href}>
                        <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <ReportIcon className="h-5 w-5 text-blue-600" />
                                </div>
                                {report.badge && (
                                  <Badge variant={getBadgeVariant(report.badge)} className="text-xs">
                                    {report.badge}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <CardTitle className="text-lg text-gray-900">
                              {report.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-600">
                              {report.description}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* No Reports Available */}
          {availableReports.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reports available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Reports for your role are being configured. Please check back later.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}