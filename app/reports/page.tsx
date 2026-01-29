'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  CheckCircle,
  PieChart,
  Activity,
  Calendar,
  ChevronRight,
  RefreshCw,
  Zap,
  Folder
} from 'lucide-react'

interface Report {
  title: string
  description: string
  href: string
  icon: any
  category: string
  roles: string[]
  badge?: string
}

// Organized reports by category
const reportCategories: Record<string, { icon: any; label: string; reports: Report[] }> = {
  essential: {
    icon: Zap,
    label: 'Essential Reports',
    reports: [
      {
        title: 'All Tickets Report',
        description: 'Comprehensive view of all tickets with advanced filtering',
        href: '/reports/tickets/all-tickets',
        icon: FileText,
        category: 'essential',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
        badge: 'Popular'
      },
      {
        title: 'Monthly Summary',
        description: 'Monthly statistics with category breakdown and metrics',
        href: '/reports/monthly',
        icon: Calendar,
        category: 'essential',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
      },
      {
        title: 'Daily Operations',
        description: 'Real-time operational snapshot and technician workload',
        href: '/reports/operations/daily',
        icon: Activity,
        category: 'essential',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
      }
    ]
  },
  analytics: {
    icon: BarChart3,
    label: 'Analytics',
    reports: [
      {
        title: 'By Status',
        description: 'Ticket distribution across status categories',
        href: '/reports/analytics/requests-by-status',
        icon: Activity,
        category: 'analytics',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
      },
      {
        title: 'By Priority',
        description: 'Distribution and performance by priority levels',
        href: '/reports/analytics/requests-by-priority',
        icon: AlertTriangle,
        category: 'analytics',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
      },
      {
        title: 'By Category',
        description: 'Service category performance analysis',
        href: '/reports/analytics/requests-by-category',
        icon: Folder,
        category: 'analytics',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
      },
      {
        title: 'By Technician',
        description: 'Individual technician performance metrics',
        href: '/reports/analytics/requests-by-technician',
        icon: Users,
        category: 'analytics',
        roles: ['MANAGER', 'ADMIN']
      },
      {
        title: 'By Support Group',
        description: 'Performance across support groups',
        href: '/reports/analytics/requests-by-group',
        icon: Users,
        category: 'analytics',
        roles: ['MANAGER', 'ADMIN']
      },
      {
        title: 'By Created Date',
        description: 'Ticket creation patterns and trends',
        href: '/reports/analytics/requests-by-created-date',
        icon: Calendar,
        category: 'analytics',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
      }
    ]
  },
  services: {
    icon: PieChart,
    label: 'Service Reports',
    reports: [
      {
        title: 'Status Breakdown',
        description: 'Ticket count by status for each service',
        href: '/reports/services/status-breakdown',
        icon: PieChart,
        category: 'services',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
      },
      {
        title: 'Performance Analytics',
        description: 'Service metrics and resolution rates',
        href: '/reports/services/performance',
        icon: TrendingUp,
        category: 'services',
        roles: ['MANAGER', 'ADMIN']
      },
      {
        title: 'Usage Insights',
        description: 'Usage patterns and demand analysis',
        href: '/reports/services/usage',
        icon: Users,
        category: 'services',
        roles: ['MANAGER', 'ADMIN']
      },
      {
        title: 'SLA Compliance',
        description: 'SLA breach analysis and compliance rates',
        href: '/reports/services/sla-compliance',
        icon: Shield,
        category: 'services',
        roles: ['MANAGER', 'ADMIN']
      }
    ]
  },
  operational: {
    icon: Settings,
    label: 'Operational',
    reports: [
      {
        title: 'ATM Issues Summary',
        description: 'ATM problem tracking with location analysis',
        href: '/reports/operational/atm-issues',
        icon: Monitor,
        category: 'operational',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
      },
      {
        title: 'Open & On-Hold Tickets',
        description: 'Tickets requiring immediate attention',
        href: '/reports/operational/open-onhold-tickets',
        icon: Clock,
        category: 'operational',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
        badge: 'Critical'
      },
      {
        title: 'Perpanjangan Waktu',
        description: 'Permintaan perpanjangan waktu operasional',
        href: '/reports/operational-extension',
        icon: Clock,
        category: 'operational',
        roles: ['USER', 'TECHNICIAN', 'MANAGER', 'ADMIN']
      },
      {
        title: 'Operasional Hari Libur',
        description: 'Pembukaan operasional pada hari libur',
        href: '/reports/holiday-branch-operation',
        icon: Calendar,
        category: 'operational',
        roles: ['USER', 'TECHNICIAN', 'MANAGER', 'ADMIN']
      }
    ]
  },
  atm: {
    icon: Monitor,
    label: 'ATM & Infrastructure',
    reports: [
      {
        title: 'ATM Technical Issues',
        description: 'ATM metrics, availability, and downtime analysis',
        href: '/reports/atm-technical-issues',
        icon: Monitor,
        category: 'atm',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN', 'MANAGER_IT']
      },
      {
        title: 'ATM Discrepancy',
        description: 'ATM discrepancy resolution with transaction amounts',
        href: '/reports/atm-discrepancy',
        icon: AlertTriangle,
        category: 'atm',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN', 'MANAGER_IT']
      },
      {
        title: 'ATM Intelligence',
        description: 'ATM health and maintenance optimization',
        href: '/reports/infrastructure/atm-intelligence',
        icon: Monitor,
        category: 'atm',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
      },
      {
        title: 'Technical Trends',
        description: 'System errors and network issue patterns',
        href: '/reports/infrastructure/technical-trends',
        icon: Activity,
        category: 'atm',
        roles: ['TECHNICIAN', 'MANAGER', 'ADMIN']
      }
    ]
  },
  team: {
    icon: Users,
    label: 'Team & Performance',
    reports: [
      {
        title: 'My Performance',
        description: 'Personal KPIs and SLA compliance tracking',
        href: '/reports/technician/performance',
        icon: Target,
        category: 'team',
        roles: ['TECHNICIAN']
      },
      {
        title: 'Team Performance',
        description: 'Technician comparison and workload balance',
        href: '/reports/manager/team-performance',
        icon: Users,
        category: 'team',
        roles: ['MANAGER']
      },
      {
        title: 'Task Execution',
        description: 'Task performance and efficiency trends',
        href: '/reports/technician/task-execution',
        icon: CheckCircle,
        category: 'team',
        roles: ['TECHNICIAN']
      },
      {
        title: 'Technical Issues',
        description: 'Error patterns and solution effectiveness',
        href: '/reports/technician/technical-issues',
        icon: AlertTriangle,
        category: 'team',
        roles: ['TECHNICIAN']
      }
    ]
  },
  management: {
    icon: Building,
    label: 'Management',
    reports: [
      {
        title: 'Branch Operations',
        description: 'Branch health and resource utilization',
        href: '/reports/manager/branch-operations',
        icon: Building,
        category: 'management',
        roles: ['MANAGER']
      },
      {
        title: 'Approval Workflow',
        description: 'Approval efficiency and bottlenecks',
        href: '/reports/manager/approval-workflow',
        icon: Clock,
        category: 'management',
        roles: ['MANAGER']
      },
      {
        title: 'Service Catalog',
        description: 'Service popularity and optimization',
        href: '/reports/admin/service-catalog',
        icon: Settings,
        category: 'management',
        roles: ['ADMIN']
      },
      {
        title: 'User Analytics',
        description: 'User engagement and system adoption',
        href: '/reports/admin/user-analytics',
        icon: Users,
        category: 'management',
        roles: ['ADMIN']
      }
    ]
  },
  compliance: {
    icon: Shield,
    label: 'Security & Compliance',
    reports: [
      {
        title: 'Security Dashboard',
        description: 'Security incidents and audit trail',
        href: '/reports/compliance/security',
        icon: Shield,
        category: 'compliance',
        roles: ['ADMIN']
      },
      {
        title: 'System Health',
        description: 'Data integrity and reliability metrics',
        href: '/reports/compliance/system-health',
        icon: Activity,
        category: 'compliance',
        roles: ['ADMIN']
      },
      {
        title: 'Security Analyst',
        description: 'Security analyst tickets with filtering',
        href: '/reports/security-analyst',
        icon: Shield,
        category: 'compliance',
        roles: ['SECURITY_ANALYST', 'ADMIN']
      },
      {
        title: 'Transaction Claims',
        description: 'Track and analyze transaction claims',
        href: '/reports/transaction-claims',
        icon: FileText,
        category: 'compliance',
        roles: ['USER', 'TECHNICIAN', 'MANAGER', 'ADMIN']
      }
    ]
  }
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session) {
      loadDashboardStats()
    }
  }, [session])

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/reports/dashboard')
      if (response.ok) {
        const stats = await response.json()
        setDashboardStats(stats)
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter reports based on user role
  const filterByRole = (reports: Report[]) => {
    return reports.filter(r => r.roles.includes(session?.user?.role || ''))
  }

  // Filter reports by search term
  const filterBySearch = (reports: Report[]) => {
    if (!searchTerm) return reports
    const term = searchTerm.toLowerCase()
    return reports.filter(r =>
      r.title.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term)
    )
  }

  // Get all available reports for current user
  const availableCategories = useMemo(() => {
    const categories: typeof reportCategories = {}

    Object.entries(reportCategories).forEach(([key, category]) => {
      const filteredReports = filterByRole(category.reports)
      if (filteredReports.length > 0) {
        categories[key] = { ...category, reports: filteredReports }
      }
    })

    return categories
  }, [session?.user?.role])

  // Get search results
  const searchResults = useMemo(() => {
    if (!searchTerm) return null

    const allReports = Object.values(availableCategories).flatMap(c => c.reports)
    return filterBySearch(allReports)
  }, [searchTerm, availableCategories])

  // Count total reports
  const totalReports = useMemo(() => {
    return Object.values(availableCategories).reduce((sum, c) => sum + c.reports.length, 0)
  }, [availableCategories])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalReports} reports available for your role
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/reports/monthly">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Monthly
            </Button>
          </Link>
          <Link href="/reports/builder">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Tickets</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? '-' : (dashboardStats?.overview?.totalTickets || 0).toLocaleString()}
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-destructive uppercase tracking-wide">Open</p>
                <p className="text-2xl font-bold text-destructive">
                  {isLoading ? '-' : (dashboardStats?.overview?.openTickets || 0).toLocaleString()}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[hsl(var(--success))] uppercase tracking-wide">Resolved</p>
                <p className="text-2xl font-bold text-[hsl(var(--success))]">
                  {isLoading ? '-' : (dashboardStats?.overview?.resolvedTickets || 0).toLocaleString()}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-[hsl(var(--success))]/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-primary uppercase tracking-wide">SLA Rate</p>
                <p className="text-2xl font-bold text-primary">
                  {isLoading ? '-' : `${dashboardStats?.performance?.slaCompliance || 0}%`}
                </p>
              </div>
              <Target className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults && (
        <Card>
          <CardHeader className="py-3 px-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Search Results</CardTitle>
                <Badge variant="secondary" className="text-xs">{searchResults.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {searchResults.length > 0 ? (
              <div className="divide-y divide-border">
                {searchResults.map((report, idx) => (
                  <ReportRow key={idx} report={report} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No reports found matching "{searchTerm}"</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Categories */}
      {!searchTerm && (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(availableCategories).map(([key, category]) => (
            <Card key={key}>
              <CardHeader className="py-3 px-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <category.icon className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{category.label}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{category.reports.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {category.reports.map((report, idx) => (
                    <ReportRow key={idx} report={report} compact />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ReportRow({ report, compact = false }: { report: Report; compact?: boolean }) {
  const Icon = report.icon

  return (
    <Link
      href={report.href}
      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium text-foreground group-hover:text-primary transition-colors ${compact ? 'text-sm' : ''}`}>
              {report.title}
            </p>
            {report.badge && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  report.badge === 'Critical' ? 'border-destructive/30 text-destructive bg-destructive/5' :
                  report.badge === 'Popular' ? 'border-primary/30 text-primary bg-primary/5' :
                  'border-border'
                }`}
              >
                {report.badge}
              </Badge>
            )}
          </div>
          {!compact && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {report.description}
            </p>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </Link>
  )
}
