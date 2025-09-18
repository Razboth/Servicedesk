'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
      <div className="min-h-screen flex items-center justify-center bg-cream-100 dark:bg-brown-950">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-cream-400 dark:bg-warm-dark-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-brown-400 dark:text-brown-200" />
            </div>
            <h2 className="text-2xl font-bold text-brown-900 dark:text-cream-200 mb-2">Access Required</h2>
            <p className="text-brown-600 dark:text-cream-300">Please sign in to access the technician workbench.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user is a technician or security analyst
  if (!session?.user?.role || !['TECHNICIAN', 'SECURITY_ANALYST'].includes(session.user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100 dark:bg-brown-950">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <UserCheck className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400">This workbench is only accessible to technicians and security analysts.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-brown-950">
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-cream-400/20 to-brown-400/20 dark:from-warm-dark-100/20 dark:to-brown-700/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-cream-300/20 to-cream-400/20 dark:from-warm-dark-200/20 dark:to-warm-dark-100/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-brown-300/20 to-brown-400/20 dark:from-brown-700/20 dark:to-brown-600/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

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

            {/* Compact Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {isLoading ? (
              // Loading skeleton
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-card/50 backdrop-blur-sm border rounded-lg p-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-md" />
                      <div className="flex-1">
                        <div className="h-3 bg-muted rounded w-20 mb-1" />
                        <div className="h-5 bg-muted rounded w-12" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : quickStats.length > 0 ? (
              quickStats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-card/50 backdrop-blur-sm border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
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
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${stat.color} rounded-md flex items-center justify-center`}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-lg font-semibold">{stat.count}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // No data state
              <div className="col-span-full text-center py-4 text-sm text-muted-foreground">
                No statistics available
              </div>
            )}
            </div>
          </div>

          {/* Tabs with Data Tables/Cards */}
          <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg overflow-hidden">
            <CardContent className="p-4 sm:p-6">
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