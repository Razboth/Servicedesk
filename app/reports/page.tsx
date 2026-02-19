'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Filter
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
  category?: string
  lastRun?: string
  executionCount?: number
  createdBy?: string
  isFavorite?: boolean
  isScheduled?: boolean
}

// Report categories for better organization
const REPORT_CATEGORIES = {
  ESSENTIAL: 'Essential Reports',
  OPERATIONS: 'Operations & Monitoring',
  ANALYTICS: 'Analytics & Insights',
  PERFORMANCE: 'Performance & SLA',
  INFRASTRUCTURE: 'Infrastructure & ATM',
  COMPLIANCE: 'Compliance & Security',
  TEAM: 'Team & Management',
  BUSINESS: 'Business Intelligence'
}

// Standard pre-built reports with categories
const standardReports: Report[] = [
  // Essential Reports
  {
    title: 'All Tickets Master Report',
    description: 'Comprehensive view of all tickets with advanced filtering and export',
    href: '/reports/tickets/all-tickets',
    icon: FileText,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.ESSENTIAL,
    badge: 'Most Used',
    lastRun: 'Live'
  },
  {
    title: 'Monthly Summary Report',
    description: 'Monthly ticket statistics with category breakdown, claimed/unclaimed analysis, and duration metrics',
    href: '/reports/monthly',
    icon: Calendar,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.ESSENTIAL,
    badge: 'Popular',
    lastRun: 'Live'
  },
  {
    title: 'Executive Summary Report',
    description: 'Comprehensive monthly executive report with KPIs, SLA compliance, charts, top performers, and PDF export',
    href: '/reports/executive-summary',
    icon: BarChart3,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.ESSENTIAL,
    badge: 'New',
    lastRun: 'Live'
  },
  // Service Reports
  {
    title: 'Service Status Breakdown',
    description: 'Ticket count by status for each service per category with totals and subtotals',
    href: '/reports/services/status-breakdown',
    icon: PieChart,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.ANALYTICS,
    lastRun: 'Live'
  },
  {
    title: 'Service Performance Analytics',
    description: 'Comprehensive service metrics, resolution rates, and performance trends',
    href: '/reports/services/performance',
    icon: TrendingUp,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.PERFORMANCE
  },
  {
    title: 'Service Usage Insights',
    description: 'Usage patterns, peak times, growth trends, and demand analysis',
    href: '/reports/services/usage',
    icon: Users,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.ANALYTICS
  },
  {
    title: 'Service SLA Compliance',
    description: 'SLA breach analysis, compliance rates, and service level monitoring',
    href: '/reports/services/sla-compliance',
    icon: Shield,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.PERFORMANCE
  },
  // Technician Reports
  {
    title: 'My Performance Dashboard',
    description: 'Personal KPIs, response times, and SLA compliance tracking',
    href: '/reports/technician/performance',
    icon: Target,
    type: 'standard',
    roles: ['TECHNICIAN'],
    category: REPORT_CATEGORIES.PERFORMANCE,
    badge: 'Personal'
  },
  {
    title: 'Technical Issue Intelligence',
    description: 'Error patterns, knowledge discovery, and solution effectiveness',
    href: '/reports/technician/technical-issues',
    icon: AlertTriangle,
    type: 'standard',
    roles: ['TECHNICIAN'],
    category: REPORT_CATEGORIES.ANALYTICS
  },
  {
    title: 'Task Execution Report',
    description: 'Task performance, completion times, and efficiency trends',
    href: '/reports/technician/task-execution',
    icon: CheckCircle,
    type: 'standard',
    roles: ['TECHNICIAN'],
    category: REPORT_CATEGORIES.PERFORMANCE
  },
  // Manager Reports
  {
    title: 'Team Performance Analytics',
    description: 'Technician comparison, workload balance, and training needs',
    href: '/reports/manager/team-performance',
    icon: Users,
    type: 'standard',
    roles: ['MANAGER'],
    category: REPORT_CATEGORIES.TEAM
  },
  {
    title: 'Branch Operations Report',
    description: 'Branch health, geographic analysis, and resource utilization',
    href: '/reports/manager/branch-operations',
    icon: Building,
    type: 'standard',
    roles: ['MANAGER'],
    category: REPORT_CATEGORIES.OPERATIONS
  },
  {
    title: 'Approval Workflow Analytics',
    description: 'Approval efficiency, bottlenecks, and workflow optimization',
    href: '/reports/manager/approval-workflow',
    icon: Clock,
    type: 'standard',
    roles: ['MANAGER'],
    category: REPORT_CATEGORIES.TEAM
  },
  // Admin Reports
  {
    title: 'Service Catalog Performance',
    description: 'Service popularity, efficiency metrics, and optimization opportunities',
    href: '/reports/admin/service-catalog',
    icon: Settings,
    type: 'standard',
    roles: ['ADMIN'],
    category: REPORT_CATEGORIES.BUSINESS
  },
  {
    title: 'SLA & Performance Excellence',
    description: 'SLA compliance, performance benchmarking, and improvement insights',
    href: '/reports/admin/sla-performance',
    icon: TrendingUp,
    type: 'standard',
    roles: ['ADMIN'],
    category: REPORT_CATEGORIES.PERFORMANCE
  },
  {
    title: 'User & Access Analytics',
    description: 'User engagement, role effectiveness, and system adoption patterns',
    href: '/reports/admin/user-analytics',
    icon: Shield,
    type: 'standard',
    roles: ['ADMIN'],
    category: REPORT_CATEGORIES.COMPLIANCE
  },
  // Infrastructure Reports
  {
    title: 'ATM Infrastructure Intelligence',
    description: 'ATM health, incident correlation, and maintenance optimization',
    href: '/reports/infrastructure/atm-intelligence',
    icon: Monitor,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.INFRASTRUCTURE,
    badge: 'Real-time',
    lastRun: 'Live'
  },
  {
    title: 'ATM Technical Issues Report',
    description: 'Monthly report for ATM technical issues with detailed ATM metrics, availability, and downtime analysis',
    href: '/reports/atm-technical-issues',
    icon: Monitor,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN', 'MANAGER_IT'],
    category: REPORT_CATEGORIES.INFRASTRUCTURE,
    lastRun: 'Live'
  },
  {
    title: 'ATM Discrepancy Resolution Report',
    description: 'Comprehensive report for ATM discrepancy resolution requests with custom fields and transaction amounts',
    href: '/reports/atm-discrepancy',
    icon: AlertTriangle,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN', 'MANAGER_IT'],
    category: REPORT_CATEGORIES.INFRASTRUCTURE,
    lastRun: 'Live'
  },
  {
    title: 'Perpanjangan Waktu Operasional',
    description: 'Laporan permintaan perpanjangan waktu operasional cabang dengan detail nomor surat, jam selesai, dan alasan',
    href: '/reports/operational-extension',
    icon: Clock,
    type: 'standard',
    roles: ['USER', 'TECHNICIAN', 'MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.OPERATIONS,
    lastRun: 'Live'
  },
  {
    title: 'Pembukaan Operasional Hari Libur',
    description: 'Rekap permintaan pembukaan operasional cabang pada hari libur',
    href: '/reports/holiday-branch-operation',
    icon: Calendar,
    type: 'standard',
    roles: ['USER', 'TECHNICIAN', 'MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.OPERATIONS,
    lastRun: 'Live'
  },
  // Compliance Reports
  {
    title: 'Security & Compliance Dashboard',
    description: 'Security incidents, change management, and audit trail tracking',
    href: '/reports/compliance/security',
    icon: Shield,
    type: 'standard',
    roles: ['ADMIN'],
    category: REPORT_CATEGORIES.COMPLIANCE
  },
  {
    title: 'Data Quality & System Health',
    description: 'Data integrity, system performance, and reliability metrics',
    href: '/reports/compliance/system-health',
    icon: PieChart,
    type: 'standard',
    roles: ['ADMIN'],
    category: REPORT_CATEGORIES.COMPLIANCE
  },
  // Analytics Reports
  {
    title: 'Requests by Status',
    description: 'Analysis of ticket distribution across different status categories',
    href: '/reports/analytics/requests-by-status',
    icon: Activity,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.ANALYTICS
  },
  {
    title: 'Requests by Priority',
    description: 'Analysis of ticket distribution and performance by priority levels',
    href: '/reports/analytics/requests-by-priority',
    icon: AlertTriangle,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.ANALYTICS
  },
  {
    title: 'Requests by Category',
    description: 'Service category performance and subcategory analysis',
    href: '/reports/analytics/requests-by-category',
    icon: Layout,
    type: 'standard',
    roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.ANALYTICS
  },
  {
    title: 'Requests by Technician',
    description: 'Individual technician performance metrics and rankings',
    href: '/reports/analytics/requests-by-technician',
    icon: Users,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.TEAM
  },
  {
    title: 'Requests by Support Group',
    description: 'Analysis of ticket distribution and performance across support groups',
    href: '/reports/analytics/requests-by-group',
    icon: Users,
    type: 'standard',
    roles: ['MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.TEAM
  },
  // Security Reports
  {
    title: 'Security Analyst Tickets',
    description: 'Dedicated report for security analyst tickets with advanced filtering',
    href: '/reports/security-analyst',
    icon: Shield,
    type: 'standard',
    roles: ['SECURITY_ANALYST', 'ADMIN'],
    category: REPORT_CATEGORIES.COMPLIANCE,
    lastRun: 'Live'
  },
  {
    title: 'Transaction Claims Report',
    description: 'Track and analyze transaction claim tickets with detailed filtering',
    href: '/reports/transaction-claims',
    icon: FileText,
    type: 'standard',
    roles: ['USER', 'TECHNICIAN', 'MANAGER', 'ADMIN'],
    category: REPORT_CATEGORIES.OPERATIONS,
    lastRun: 'Live'
  }
]

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [customReports, setCustomReports] = useState<Report[]>([])
  const [favorites, setFavorites] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [showAllStats, setShowAllStats] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

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
        const customReportsList = data.map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description || 'Custom report',
          href: `/reports/view/${r.id}`,
          icon: Zap,
          type: 'custom' as const,
          roles: [],
          category: 'Custom Reports',
          lastRun: r.lastExecutedAt ? new Date(r.lastExecutedAt).toRelativeString() : 'Never',
          executionCount: r.executionCount || 0,
          createdBy: r.creator?.name,
          isFavorite: r.isFavorite,
          isScheduled: r.schedules?.length > 0
        }))
        setCustomReports(customReportsList)

        // Filter favorites
        setFavorites(customReportsList.filter((r: Report) => r.isFavorite))
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

  // Combine all reports
  const allReports = [...availableStandardReports, ...customReports]

  // Filter and group reports
  const filteredReports = useMemo(() => {
    let reports = allReports

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      reports = reports.filter(r =>
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.category?.toLowerCase().includes(term)
      )
    }

    // Group by category
    const grouped: Record<string, Report[]> = {}
    reports.forEach(report => {
      const category = report.category || 'Other Reports'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(report)
    })

    return grouped
  }, [allReports, searchTerm])

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const ReportCard = ({ report }: { report: Report }) => {
    const Icon = report.icon

    return (
      <Link href={report.href} className="group">
        <Card className="h-full border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/15 transition-colors shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                    {report.title}
                  </CardTitle>
                  {report.isFavorite && (
                    <Star className="h-4 w-4 text-warning fill-warning shrink-0" />
                  )}
                </div>
                <CardDescription className="text-xs line-clamp-2">
                  {report.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between gap-2">
              {report.badge && (
                <Badge variant="secondary" className="text-xs">
                  {report.badge}
                </Badge>
              )}
              {report.lastRun && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                  <Clock className="h-3 w-3" />
                  {report.lastRun}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Access insights and create custom analytics"
        icon={<BarChart3 className="h-6 w-6" />}
        action={
          <Link href="/reports/builder">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Report
            </Button>
          </Link>
        }
      />

      {/* Key Metrics - Condensed */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? '-' : dashboardStats?.overview?.totalTickets || 0}
                </p>
                <p className="text-xs text-muted-foreground">Total Tickets</p>
              </div>
              <FileText className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? '-' : dashboardStats?.overview?.openTickets || 0}
                </p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? '-' : dashboardStats?.overview?.resolvedTickets || 0}
                </p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-foreground">
                  {isLoading ? '-' : dashboardStats?.performance?.slaCompliance || 0}%
                </p>
                <p className="text-xs text-muted-foreground">SLA</p>
              </div>
              <Target className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expandable additional stats */}
      {showAllStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <Card className="border-info/20 bg-gradient-to-br from-info/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-foreground">
                    {dashboardStats?.overview?.inProgressTickets || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
                <Activity className="h-7 w-7 text-info/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {dashboardStats?.performance?.avgResolutionTime || '0.0 hours'}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Resolution</p>
                </div>
                <Clock className="h-7 w-7 text-warning/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/40 bg-gradient-to-br from-muted/20 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-foreground">{allReports.length}</p>
                  <p className="text-xs text-muted-foreground">Available Reports</p>
                </div>
                <BarChart3 className="h-7 w-7 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toggle stats button */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAllStats(!showAllStats)}
          className="text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          {showAllStats ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show More Metrics
            </>
          )}
        </Button>
      </div>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-warning fill-warning" />
            <h2 className="text-sm font-semibold text-foreground">Favorite Reports</h2>
            <Badge variant="secondary" className="text-xs">{favorites.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.slice(0, 3).map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reports by name, description, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Access Links */}
      {!searchTerm && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => setSearchTerm('essential')}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Essential
          </Badge>
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => setSearchTerm('atm')}
          >
            <Monitor className="h-3 w-3 mr-1" />
            ATM Reports
          </Badge>
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => setSearchTerm('performance')}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Performance
          </Badge>
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => setSearchTerm('analytics')}
          >
            <PieChart className="h-3 w-3 mr-1" />
            Analytics
          </Badge>
        </div>
      )}

      {/* Categorized Reports */}
      <div className="space-y-6">
        {Object.entries(filteredReports).map(([category, reports]) => (
          <div key={category}>
            <div
              className="flex items-center justify-between mb-4 cursor-pointer group"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {category}
                </h2>
                <Badge variant="secondary" className="text-xs">{reports.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {collapsedCategories[category] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>

            {!collapsedCategories[category] && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {reports.map((report, index) => (
                  <ReportCard key={report.id || `${category}-${index}`} report={report} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {Object.keys(filteredReports).length === 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No reports found</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
            {searchTerm
              ? `No reports match "${searchTerm}". Try different search terms.`
              : 'No reports available for your role.'
            }
          </p>
          {searchTerm && (
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* Custom Reports CTA */}
      {customReports.length === 0 && !searchTerm && (
        <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-8 text-center">
            <Zap className="mx-auto h-12 w-12 text-primary/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Create Custom Reports</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Build personalized reports tailored to your specific needs with our intuitive report builder
            </p>
            <Link href="/reports/builder">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Report
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
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
