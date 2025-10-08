'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TicketsDataTable } from '@/components/tickets/data-table/tickets-data-table'
import { TicketCards } from '@/components/tickets/ticket-cards'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  User,
  Inbox,
  UserCheck,
  ClipboardList,
  Clock,
  AlertCircle,
  CheckCircle,
  LayoutGrid,
  Table,
  RefreshCw
} from 'lucide-react'

interface QuickStat {
  label: string
  count: number
  color: string
  icon: React.ReactNode
  trend?: number
}

export default function TechnicianWorkbenchPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [quickStats, setQuickStats] = useState<QuickStat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  useEffect(() => {
    loadQuickStats()
  }, [])

  const loadQuickStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      const response = await fetch('/api/tickets?stats=true')
      if (response.ok) {
        const data = await response.json()
        setQuickStats([
          {
            label: 'My Tickets',
            count: data.stats?.assigned || 0,
            color: 'bg-blue-500/10 text-blue-500',
            icon: <User className="h-4 w-4" />,
            trend: undefined
          },
          {
            label: 'Available',
            count: data.stats?.unassigned || 0,
            color: 'bg-purple-500/10 text-purple-500',
            icon: <Inbox className="h-4 w-4" />,
            trend: undefined
          },
          {
            label: 'In Progress',
            count: data.stats?.inProgress || 0,
            color: 'bg-yellow-500/10 text-yellow-500',
            icon: <Clock className="h-4 w-4" />,
            trend: undefined
          },
          {
            label: 'Resolved Today',
            count: data.stats?.resolvedToday || 0,
            color: 'bg-green-500/10 text-green-500',
            icon: <CheckCircle className="h-4 w-4" />,
            trend: undefined
          }
        ])
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      setQuickStats([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }


  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4 bg-card dark:bg-card border border-border rounded-xl shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Required</h2>
            <p className="text-muted-foreground">Please sign in to access the technician workbench.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user is a technician or security analyst
  if (!session?.user?.role || !['TECHNICIAN', 'SECURITY_ANALYST'].includes(session.user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4 bg-card dark:bg-card border border-border rounded-xl shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center">
              <UserCheck className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This workbench is only accessible to technicians and security analysts.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="Technician Workbench"
          description="Manage and process your assigned tickets"
          icon={<ClipboardList className="h-6 w-6" />}
          action={
            <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-brown-400 dark:border-brown-600 text-brown-700 dark:text-brown-200">
              <Clock className="w-3 h-3 mr-1" />
              Live Updates
            </Badge>
          }
        />

        <div className="space-y-4 overflow-x-hidden">

          {/* Stats Section with Refresh */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Quick Overview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadQuickStats(true)}
                disabled={isRefreshing}
                className="h-7 px-2"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                <span className="ml-1.5 text-xs">Refresh</span>
              </Button>
            </div>

            {/* ReUI Style Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {isLoading ? (
              // Loading skeleton - ReUI style
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border border-gray-200 dark:border-gray-800 rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-5 w-12" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : quickStats.length > 0 ? (
              quickStats.map((stat, index) => (
                <Card
                  key={index}
                  className="bg-card dark:bg-card border border-border rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    // Navigate to appropriate view based on stat
                    if (stat.label === 'My Tickets') {
                      const myTicketsTab = document.querySelector('[value="my-tickets"]') as HTMLElement;
                      myTicketsTab?.click();
                    } else if (stat.label === 'Available') {
                      const availableTab = document.querySelector('[value="available-tickets"]') as HTMLElement;
                      availableTab?.click();
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${
                        stat.label === 'My Tickets'
                          ? 'bg-blue-100 dark:bg-blue-900/20'
                          : stat.label === 'Available'
                          ? 'bg-purple-100 dark:bg-purple-900/20'
                          : stat.label === 'In Progress'
                          ? 'bg-yellow-100 dark:bg-yellow-900/20'
                          : 'bg-green-100 dark:bg-green-900/20'
                      } flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <div className={
                          stat.label === 'My Tickets'
                            ? 'text-blue-600 dark:text-blue-400'
                            : stat.label === 'Available'
                            ? 'text-purple-600 dark:text-purple-400'
                            : stat.label === 'In Progress'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }>
                          {stat.icon}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stat.count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // No data state
              <Card className="col-span-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No statistics available</p>
                </CardContent>
              </Card>
            )}
            </div>
          </div>

          {/* Tabs with Data Tables/Cards - ReUI Style */}
          <Card className="bg-card dark:bg-card border border-border rounded-xl shadow-sm">
            <CardContent className="p-6">
              <Tabs defaultValue="my-tickets" className="w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <TabsList className="grid w-full sm:w-auto max-w-md grid-cols-2">
                    <TabsTrigger value="my-tickets" className="flex items-center gap-1 sm:gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">My Tickets</span>
                      <span className="sm:hidden">Mine</span>
                    </TabsTrigger>
                    <TabsTrigger value="available-tickets" className="flex items-center gap-1 sm:gap-2">
                      <Inbox className="h-4 w-4" />
                      <span className="hidden sm:inline">Available Tickets</span>
                      <span className="sm:hidden">Available</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* View Mode Toggle */}
                  <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'table' | 'cards')} className="shrink-0">
                    <ToggleGroupItem value="table" aria-label="Table view" className="px-2 sm:px-3">
                      <Table className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Table</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="cards" aria-label="Cards view" className="px-2 sm:px-3">
                      <LayoutGrid className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Cards</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                
                <TabsContent value="my-tickets" className="mt-0">
                  {viewMode === 'table' ? (
                    <TicketsDataTable
                      ticketFilter="my-tickets"
                      hideHeader={true}
                      enableBulkStatusUpdate={true}
                    />
                  ) : (
                    <TicketCards
                      ticketFilter="my-tickets"
                    />
                  )}
                </TabsContent>

                <TabsContent value="available-tickets" className="mt-0">
                  {viewMode === 'table' ? (
                    <TicketsDataTable
                      ticketFilter="available-tickets"
                      hideHeader={true}
                      showClaimButton={true}
                      enableBulkClaim={true}
                    />
                  ) : (
                    <TicketCards
                      ticketFilter="available-tickets"
                      showClaimButton={true}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}