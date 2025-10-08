'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TicketWizard } from '@/components/tickets/modern/ticket-wizard'
import { ModernTicketList } from '@/components/tickets/modern/modern-ticket-list'
import { 
  Plus, 
  List, 
  Grid3X3, 
  BarChart3, 
  Filter,
  Search,
  Moon,
  Sun,
  Sparkles,
  Clock,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  HourglassIcon,
  ThumbsUp,
  CheckCheck,
  ThumbsDown
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useTheme } from 'next-themes'

interface QuickStat {
  label: string
  count: number
  color: string
  icon: React.ReactNode
  trend?: number
}

export default function ModernTicketsPage() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [showWizard, setShowWizard] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'inbox'>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [quickStats, setQuickStats] = useState<QuickStat[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadQuickStats()
  }, [])

  const loadQuickStats = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/tickets?stats=true')
      if (response.ok) {
        const data = await response.json()
        setQuickStats([
          {
            label: 'Open',
            count: data.stats?.open || 0,
            color: 'bg-blue-500',
            icon: <Clock className="w-4 h-4 text-white" />,
            trend: undefined
          },
          {
            label: 'Pending',
            count: data.stats?.pending || 0,
            color: 'bg-yellow-500',
            icon: <HourglassIcon className="w-4 h-4 text-white" />,
            trend: undefined
          },
          {
            label: 'Approved',
            count: data.stats?.approved || 0,
            color: 'bg-emerald-500',
            icon: <ThumbsUp className="w-4 h-4 text-white" />,
            trend: undefined
          },
          {
            label: 'In Progress',
            count: data.stats?.inProgress || 0,
            color: 'bg-orange-500',
            icon: <Play className="w-4 h-4 text-white" />,
            trend: undefined
          },
          {
            label: 'On Hold',
            count: data.stats?.onHold || 0,
            color: 'bg-purple-500',
            icon: <Pause className="w-4 h-4 text-white" />,
            trend: undefined
          },
          {
            label: 'Resolved',
            count: data.stats?.resolved || 0,
            color: 'bg-teal-500',
            icon: <CheckCheck className="w-4 h-4 text-white" />,
            trend: undefined
          },
          {
            label: 'Closed',
            count: data.stats?.closed || 0,
            color: 'bg-green-500',
            icon: <CheckCircle className="w-4 h-4 text-white" />,
            trend: undefined
          },
          {
            label: 'Rejected',
            count: data.stats?.rejected || 0,
            color: 'bg-red-500',
            icon: <ThumbsDown className="w-4 h-4 text-white" />,
            trend: undefined
          },
          {
            label: 'Cancelled',
            count: data.stats?.cancelled || 0,
            color: 'bg-gray-500',
            icon: <XCircle className="w-4 h-4 text-white" />,
            trend: undefined
          }
        ])
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Required</h2>
            <p className="text-gray-600 dark:text-gray-400">Please sign in to access the modern ticket interface.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-card/80 dark:bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Modern Tickets</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enhanced Experience</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Quick search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-card/50 dark:bg-card/50 border-border"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-8 w-8 px-0"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              {/* Create Ticket */}
              <Button 
                onClick={() => setShowWizard(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
          {quickStats.map((stat, index) => (
            <Card key={index} className="bg-card/70 dark:bg-card/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
                  </div>
                  <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center shadow-lg`}>
                    {stat.icon}
                  </div>
                </div>
                {stat.trend && (
                  <div className="mt-2 flex items-center">
                    <span className={`text-xs font-medium ${stat.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trend > 0 ? '+' : ''}{stat.trend}%
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">vs last week</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="tickets" className="space-y-6">
          <TabsList className="bg-card/70 dark:bg-card/70 backdrop-blur-sm border border-border">
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              All Tickets
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-6">
            <ModernTicketList 
              viewMode={viewMode}
              searchTerm={searchTerm}
              onCreateTicket={() => setShowWizard(true)}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-card/70 dark:bg-card/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Ticket Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Analytics dashboard coming soon...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Ticket Creation Wizard */}
      {showWizard && (
        <TicketWizard 
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false)
            loadQuickStats()
          }}
        />
      )}
    </div>
  )
}