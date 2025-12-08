'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { 
  Plus,
  Search,
  FileText,
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
  Activity,
  Calendar,
  Star,
  Zap,
  Layout,
  Filter,
  Download,
  RefreshCw,
  ChevronRight,
  Sparkles,
  ArrowUpRight
} from 'lucide-react'

interface Report {
  id?: string
  title: string
  description: string
  href: string
  icon: any
  type: 'standard' | 'custom' | 'template'
  roles: string[]
  badge?: string
  lastRun?: string
  executionCount?: number
  createdBy?: string
  isFavorite?: boolean
  isScheduled?: boolean
}

// Standard pre-built reports
const standardReports: Report[] = [
  // Essential Reports - NEW
  {
    title: 'All Tickets Master Report',
    description: 'Comprehensive view of all tickets with advanced filtering and export',
    href: '/reports/tickets/all-tickets',
    icon: FileText,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Essential',
    lastRun: 'Live'
  },
  {
    title: 'Daily Operations Report',
    description: 'Real-time operational snapshot with critical incidents and technician workload',
    href: '/reports/operations/daily',
    icon: Activity,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Daily',
    lastRun: 'Live'
  },
  {
    title: 'Monthly Summary Report',
    description: 'Monthly ticket statistics with category breakdown, claimed/unclaimed analysis, and duration metrics',
    href: '/reports/monthly',
    icon: Calendar,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Monthly',
    lastRun: 'Live'
  },
  // Service Reports - NEW
  {
    title: 'Service Status Breakdown',
    description: 'Ticket count by status for each service per category with totals and subtotals',
    href: '/reports/services/status-breakdown',
    icon: PieChart,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'New',
    lastRun: 'Live'
  },
  {
    title: 'Service Performance Analytics',
    description: 'Comprehensive service metrics, resolution rates, and performance trends',
    href: '/reports/services/performance',
    icon: TrendingUp,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    badge: 'New',
    lastRun: 'Live'
  },
  {
    title: 'Service Usage Insights',
    description: 'Usage patterns, peak times, growth trends, and demand analysis',
    href: '/reports/services/usage',
    icon: Users,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    badge: 'New',
    lastRun: 'Live'
  },
  {
    title: 'Service SLA Compliance',
    description: 'SLA breach analysis, compliance rates, and service level monitoring',
    href: '/reports/services/sla-compliance',
    icon: Shield,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    badge: 'New',
    lastRun: 'Live'
  },
  // Technician Reports
  {
    title: 'My Performance Dashboard',
    description: 'Personal KPIs, response times, and SLA compliance tracking',
    href: '/reports/technician/performance',
    icon: Target,
    type: 'standard',
    roles: ['TECHNICIAN'],
    badge: 'Personal',
    lastRun: '2 hours ago'
  },
  {
    title: 'Technical Issue Intelligence',
    description: 'Error patterns, knowledge discovery, and solution effectiveness',
    href: '/reports/technician/technical-issues',
    icon: AlertTriangle,
    type: 'standard',
    roles: ['TECHNICIAN'],
    badge: 'Analytics'
  },
  {
    title: 'Task Execution Report',
    description: 'Task performance, completion times, and efficiency trends',
    href: '/reports/technician/task-execution',
    icon: CheckCircle,
    type: 'standard',
    roles: ['TECHNICIAN']
  },
  {
    title: 'Monthly Ticket Report',
    description: 'Category-based ticket counts by status for monthly reporting',
    href: '/reports/technician/monthly',
    icon: Calendar,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Monthly'
  },
  // Manager Reports
  {
    title: 'Team Performance Analytics',
    description: 'Technician comparison, workload balance, and training needs',
    href: '/reports/manager/team-performance',
    icon: Users,
    type: 'standard',
    roles: ['MANAGER'],
    badge: 'Team'
  },
  {
    title: 'Branch Operations Report',
    description: 'Branch health, geographic analysis, and resource utilization',
    href: '/reports/manager/branch-operations',
    icon: Building,
    type: 'standard',
    roles: ['MANAGER']
  },
  {
    title: 'Approval Workflow Analytics',
    description: 'Approval efficiency, bottlenecks, and workflow optimization',
    href: '/reports/manager/approval-workflow',
    icon: Clock,
    type: 'standard',
    roles: ['MANAGER']
  },
  // Admin Reports
  {
    title: 'Service Catalog Performance',
    description: 'Service popularity, efficiency metrics, and optimization opportunities',
    href: '/reports/admin/service-catalog',
    icon: Settings,
    type: 'standard',
    roles: ['ADMIN'],
    badge: 'Strategic'
  },
  {
    title: 'SLA & Performance Excellence',
    description: 'SLA compliance, performance benchmarking, and improvement insights',
    href: '/reports/admin/sla-performance',
    icon: TrendingUp,
    type: 'standard',
    roles: ['ADMIN']
  },
  {
    title: 'User & Access Analytics',
    description: 'User engagement, role effectiveness, and system adoption patterns',
    href: '/reports/admin/user-analytics',
    icon: Shield,
    type: 'standard',
    roles: ['ADMIN']
  },
  // Infrastructure Reports
  {
    title: 'ATM Infrastructure Intelligence',
    description: 'ATM health, incident correlation, and maintenance optimization',
    href: '/reports/infrastructure/atm-intelligence',
    icon: Monitor,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Real-time',
    lastRun: 'Live'
  },
  // Operational Reports
  {
    title: 'ATM Issues Summary',
    description: 'Comprehensive ATM problem tracking with location and priority analysis',
    href: '/reports/operational/atm-issues',
    icon: AlertTriangle,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Operational'
  },
  {
    title: 'Open & On-Hold Tickets 2024',
    description: 'Monitor and manage tickets requiring immediate attention',
    href: '/reports/operational/open-onhold-tickets',
    icon: Clock,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Critical'
  },
  {
    title: 'Technical Problem Trends',
    description: 'System errors, hardware failures, and network issue patterns',
    href: '/reports/infrastructure/technical-trends',
    icon: Activity,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
  },
  // Business Intelligence
  {
    title: 'Operational Excellence Report',
    description: 'Resource planning, cost analysis, and strategic planning insights',
    href: '/reports/business/operational-excellence',
    icon: BarChart3,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    badge: 'Strategic'
  },
  {
    title: 'Customer Experience Analytics',
    description: 'Service quality, response time impact, and customer satisfaction',
    href: '/reports/business/customer-experience',
    icon: BookOpen,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN']
  },
  // Compliance Reports
  {
    title: 'Security & Compliance Dashboard',
    description: 'Security incidents, change management, and audit trail tracking',
    href: '/reports/compliance/security',
    icon: Shield,
    type: 'standard',
    roles: ['ADMIN'],
    badge: 'Security'
  },
  {
    title: 'Data Quality & System Health',
    description: 'Data integrity, system performance, and reliability metrics',
    href: '/reports/compliance/system-health',
    icon: PieChart,
    type: 'standard',
    roles: ['ADMIN']
  },
  // Analytics Reports
  {
    title: 'Requests by Status',
    description: 'Analysis of ticket distribution across different status categories',
    href: '/reports/analytics/requests-by-status',
    icon: Activity,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Analytics'
  },
  {
    title: 'Requests by Priority',
    description: 'Analysis of ticket distribution and performance by priority levels',
    href: '/reports/analytics/requests-by-priority',
    icon: AlertTriangle,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Analytics'
  },
  {
    title: 'Requests by Category',
    description: 'Service category performance and subcategory analysis',
    href: '/reports/analytics/requests-by-category',
    icon: Layout,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Analytics'
  },
  {
    title: 'Requests by Technician',
    description: 'Individual technician performance metrics and rankings',
    href: '/reports/analytics/requests-by-technician',
    icon: Users,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    badge: 'Performance'
  },
  {
    title: 'Requests by Support Group',
    description: 'Analysis of ticket distribution and performance across support groups',
    href: '/reports/analytics/requests-by-group',
    icon: Users,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    badge: 'Team'
  },
  {
    title: 'Requests by Created Date',
    description: 'Analysis of ticket creation patterns and temporal distribution',
    href: '/reports/analytics/requests-by-created-date',
    icon: Calendar,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Trends'
  },
  {
    title: 'Requests by Department',
    description: 'Analysis of ticket distribution and performance across departments',
    href: '/reports/analytics/requests-by-department',
    icon: Building,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    badge: 'Organizational'
  },
  // Security Reports
  {
    title: 'Security Analyst Tickets',
    description: 'Dedicated report for security analyst tickets with advanced filtering',
    href: '/reports/security-analyst',
    icon: Shield,
    type: 'standard',
    roles: ['SECURITY_ANALYST', 'ADMIN'],
    badge: 'Security',
    lastRun: 'Live'
  },
  {
    title: 'Transaction Claims Report',
    description: 'Track and analyze transaction claim tickets with detailed filtering',
    href: '/reports/transaction-claims',
    icon: FileText,
    type: 'standard',
    roles: ['USER', 'TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Claims',
    lastRun: 'Live'
  },
  // ATM Service Reports
  {
    title: 'ATM Technical Issues Report',
    description: 'Monthly report for ATM technical issues with detailed ATM metrics, availability, and downtime analysis',
    href: '/reports/atm-technical-issues',
    icon: Monitor,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN', 'MANAGER_IT'],
    badge: 'ATM',
    lastRun: 'Live'
  },
  {
    title: 'ATM Discrepancy Resolution Report',
    description: 'Comprehensive report for ATM discrepancy resolution requests with custom fields and transaction amounts',
    href: '/reports/atm-discrepancy',
    icon: AlertTriangle,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN', 'MANAGER_IT'],
    badge: 'ATM',
    lastRun: 'Live'
  },
  // Operational Reports
  {
    title: 'Perpanjangan Waktu Operasional',
    description: 'Laporan permintaan perpanjangan waktu operasional cabang dengan detail nomor surat, jam selesai, dan alasan',
    href: '/reports/operational-extension',
    icon: Clock,
    type: 'standard',
    roles: ['USER', 'TECHNICIAN', 'MANAGER', 'ADMIN'],
    badge: 'Operasional',
    lastRun: 'Live'
  }
]

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [customReports, setCustomReports] = useState<Report[]>([])
  const [templates, setTemplates] = useState<Report[]>([])
  const [favorites, setFavorites] = useState<Report[]>([])
  const [scheduled, setScheduled] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardStats, setDashboardStats] = useState<any>(null)

  useEffect(() => {
    if (session) {
      loadReports()
    }
  }, [session])

  const loadReports = async () => {
    try {
      setIsLoading(true)
      
      // Load dashboard statistics
      const statsResponse = await fetch('/api/reports/dashboard')
      if (statsResponse.ok) {
        const stats = await statsResponse.json()
        setDashboardStats(stats)
      }
      
      // Load custom reports
      const customResponse = await fetch('/api/reports/custom')
      if (customResponse.ok) {
        const data = await customResponse.json()
        setCustomReports(data.map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description || 'Custom report',
          href: `/reports/view/${r.id}`,
          icon: FileText,
          type: 'custom' as const,
          roles: [],
          lastRun: r.lastExecutedAt ? new Date(r.lastExecutedAt).toRelativeString() : 'Never',
          executionCount: r.executionCount || 0,
          createdBy: r.creator?.name,
          isFavorite: r.isFavorite,
          isScheduled: r.schedules?.length > 0
        })))
        
        // Filter favorites
        setFavorites(data.filter((r: any) => r.isFavorite))
        
        // Filter scheduled
        setScheduled(data.filter((r: any) => r.schedules?.length > 0))
      }
      
      // Load templates
      const templateResponse = await fetch('/api/reports/templates')
      if (templateResponse.ok) {
        const data = await templateResponse.json()
        const templateList: Report[] = []
        Object.values(data).forEach((categoryTemplates: any) => {
          categoryTemplates.forEach((t: any) => {
            templateList.push({
              id: t.id,
              title: t.name,
              description: t.description,
              href: `/reports/templates/${t.id}`,
              icon: Layout,
              type: 'template' as const,
              roles: [],
              badge: 'Template'
            })
          })
        })
        setTemplates(templateList)
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  // Filter standard reports based on user role
  const availableStandardReports = standardReports.filter(report => 
    report.roles.includes(session.user?.role || '')
  )

  // Combine all reports for "All" tab
  const allReports = [
    ...availableStandardReports,
    ...customReports,
    ...templates
  ]

  // Filter reports based on search
  const filterReports = (reports: Report[]) => {
    if (!searchTerm) return reports
    const term = searchTerm.toLowerCase()
    return reports.filter(r => 
      r.title.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term)
    )
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'custom': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'template': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'custom': return <Zap className="h-3 w-3" />
      case 'template': return <Layout className="h-3 w-3" />
      default: return <BarChart3 className="h-3 w-3" />
    }
  }

  const ReportCard = ({ report }: { report: Report }) => {
    const Icon = report.icon
    
    return (
      <Link href={report.href}>
        <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                {report.isFavorite && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                )}
                {report.isScheduled && (
                  <Calendar className="h-4 w-4 text-green-600" />
                )}
                <Badge variant="outline" className={`text-xs ${getTypeColor(report.type)}`}>
                  <span className="flex items-center gap-1">
                    {getTypeIcon(report.type)}
                    {report.type}
                  </span>
                </Badge>
              </div>
            </div>
            <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-1">
              {report.title}
            </CardTitle>
            <CardDescription className="text-sm line-clamp-2 mt-1">
              {report.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                {report.lastRun && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {report.lastRun}
                  </span>
                )}
                {report.executionCount !== undefined && report.executionCount > 0 && (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    {report.executionCount} runs
                  </span>
                )}
              </div>
              {report.badge && (
                <Badge variant="secondary" className="text-xs">
                  {report.badge}
                </Badge>
              )}
            </div>
            {report.createdBy && (
              <p className="text-xs text-muted-foreground mt-2">
                Created by {report.createdBy}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    )
  }

  const tabCounts = {
    all: allReports.length,
    standard: availableStandardReports.length,
    custom: customReports.length,
    templates: templates.length,
    scheduled: scheduled.length,
    favorites: favorites.length
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Reports Center"
        description="Access standard reports or create your own custom analytics"
        icon={<BarChart3 className="h-6 w-6" />}
        action={
          <div className="flex items-center gap-3">
            <Link href="/reports/monthly">
              <Button
                variant="outline"
                size="default"
                className="border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Monthly Summary
              </Button>
            </Link>
            <Link href="/reports/builder">
              <Button
                size="default"
                className="bg-gradient-to-r from-brown-400 to-brown-500 dark:from-brown-200 dark:to-brown-300 text-white dark:text-brown-950 hover:from-brown-500 hover:to-brown-600 dark:hover:from-brown-300 dark:hover:to-brown-400"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Report
              </Button>
            </Link>
          </div>
        }
      />

        {/* Quick Stats - Ticket Analytics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {isLoading && !dashboardStats ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-gray-200/20 bg-gradient-to-br from-gray-100/5 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mb-2"></div>
                      <div className="h-3 w-20 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Actual data
            <>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {dashboardStats?.overview?.totalTickets || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Tickets</p>
                </div>
                <FileText className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {dashboardStats?.overview?.openTickets || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Open Tickets</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {dashboardStats?.overview?.inProgressTickets || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {dashboardStats?.overview?.resolvedTickets || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">
                    {dashboardStats?.performance?.avgResolutionTime || '0.0 hours'}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Resolution</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {dashboardStats?.performance?.slaCompliance || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">SLA Compliance</p>
                </div>
                <Target className="h-8 w-8 text-purple-500/20" />
              </div>
            </CardContent>
          </Card>
            </>
          )}
        </div>

        {/* Report Collections Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-slate-500/20 bg-gradient-to-br from-slate-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{tabCounts.all}</p>
                  <p className="text-xs text-muted-foreground">Available Reports</p>
                </div>
                <BarChart3 className="h-8 w-8 text-slate-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{tabCounts.custom}</p>
                  <p className="text-xs text-muted-foreground">Custom Reports</p>
                </div>
                <Zap className="h-8 w-8 text-indigo-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{tabCounts.scheduled}</p>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                </div>
                <Calendar className="h-8 w-8 text-emerald-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{tabCounts.favorites}</p>
                  <p className="text-xs text-muted-foreground">Favorites</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="text-xs">
              {tabCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="standard" className="gap-2">
            Standard
            <Badge variant="secondary" className="text-xs">
              {tabCounts.standard}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            Custom
            <Badge variant="secondary" className="text-xs">
              {tabCounts.custom}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            Templates
            <Badge variant="secondary" className="text-xs">
              {tabCounts.templates}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            Scheduled
            <Badge variant="secondary" className="text-xs">
              {tabCounts.scheduled}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-2">
            Favorites
            <Badge variant="secondary" className="text-xs">
              {tabCounts.favorites}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* All Reports */}
        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filterReports(allReports).map((report, index) => (
              <ReportCard key={report.id || index} report={report} />
            ))}
          </div>
          {filterReports(allReports).length === 0 && (
            <EmptyState 
              title="No reports found"
              description="Try adjusting your search terms"
              icon={Search}
            />
          )}
        </TabsContent>

        {/* Standard Reports */}
        <TabsContent value="standard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filterReports(availableStandardReports).map((report, index) => (
              <ReportCard key={index} report={report} />
            ))}
          </div>
          {filterReports(availableStandardReports).length === 0 && (
            <EmptyState 
              title="No standard reports found"
              description="Standard reports are pre-built analytics for your role"
              icon={BarChart3}
            />
          )}
        </TabsContent>

        {/* Custom Reports */}
        <TabsContent value="custom">
          {customReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterReports(customReports).map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <EmptyState 
              title="No custom reports yet"
              description="Create your first custom report to analyze data your way"
              icon={Zap}
              action={
                <Link href="/reports/builder">
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Custom Report
                  </Button>
                </Link>
              }
            />
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterReports(templates).map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <EmptyState 
              title="No templates available"
              description="Report templates will appear here once configured"
              icon={Layout}
            />
          )}
        </TabsContent>

        {/* Scheduled Reports */}
        <TabsContent value="scheduled">
          {scheduled.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterReports(scheduled).map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <EmptyState 
              title="No scheduled reports"
              description="Schedule reports to run automatically and receive them via email"
              icon={Calendar}
            />
          )}
        </TabsContent>

        {/* Favorites */}
        <TabsContent value="favorites">
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterReports(favorites).map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <EmptyState 
              title="No favorite reports"
              description="Star reports to add them to your favorites for quick access"
              icon={Star}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ 
  title, 
  description, 
  icon: Icon,
  action 
}: { 
  title: string
  description: string
  icon: any
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">{description}</p>
      {action}
    </div>
  )
}

// Add this extension to Date prototype for relative time
declare global {
  interface Date {
    toRelativeString(): string
  }
}

Date.prototype.toRelativeString = function() {
  const now = new Date()
  const diff = now.getTime() - this.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}