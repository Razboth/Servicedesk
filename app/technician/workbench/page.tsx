'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModernTicketList } from '@/components/tickets/modern/modern-ticket-list'
import { 
  Search,
  Moon,
  Sun,
  Sparkles,
  User,
  Inbox,
  UserCheck,
  ClipboardList,
  Grid3X3,
  Table,
  Clock,
  AlertCircle,
  CheckCircle
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

export default function TechnicianWorkbenchPage() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('my-tickets')
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'inbox'>('table')
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
            label: 'My Tickets',
            count: data.stats?.assigned || 0,
            color: 'bg-blue-100 dark:bg-blue-900/50',
            icon: <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
            trend: undefined
          },
          {
            label: 'Available',
            count: data.stats?.unassigned || 0,
            color: 'bg-orange-100 dark:bg-orange-900/50',
            icon: <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
            trend: undefined
          },
          {
            label: 'In Progress',
            count: data.stats?.inProgress || 0,
            color: 'bg-yellow-100 dark:bg-yellow-900/50',
            icon: <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />,
            trend: undefined
          },
          {
            label: 'Resolved Today',
            count: data.stats?.resolvedToday || 0,
            color: 'bg-green-100 dark:bg-green-900/50',
            icon: <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />,
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  const handleClaimTicket = (ticketId: string) => {
    // Refresh stats when a ticket is claimed
    loadQuickStats()
  }

  const handleUpdateStatus = (ticketId: string) => {
    // Navigate to the ticket detail page for status update
    router.push(`/tickets/${ticketId}`)
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
            <p className="text-gray-600 dark:text-gray-400">Please sign in to access the technician workbench.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user is a technician or security analyst
  if (!session?.user?.role || !['TECHNICIAN', 'SECURITY_ANALYST'].includes(session.user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <main className="w-full py-4 sm:py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Technician Workbench</h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage and process your assigned tickets</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
                {/* Search */}
                <div className="hidden lg:block relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Quick search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-48 bg-white/[0.5] dark:bg-gray-800/[0.5] border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* View Mode Toggle - Hidden on mobile */}
                <div className="hidden sm:flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border shadow-sm">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="h-7 px-2"
                    title="Cards View"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-7 px-2"
                    title="Table View"
                  >
                    <Table className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'inbox' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('inbox')}
                    className="h-7 px-2"
                    title="Inbox View"
                  >
                    <Inbox className="h-4 w-4" />
                  </Button>
                </div>

                {/* Mobile View Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const modes: ('cards' | 'table' | 'inbox')[] = ['cards', 'table', 'inbox'];
                    const currentIndex = modes.indexOf(viewMode);
                    const nextIndex = (currentIndex + 1) % modes.length;
                    setViewMode(modes[nextIndex]);
                  }}
                  className="sm:hidden h-8 w-8 px-0"
                  title={`Current: ${viewMode}`}
                >
                  {viewMode === 'cards' && <Grid3X3 className="h-4 w-4" />}
                  {viewMode === 'table' && <Table className="h-4 w-4" />}
                  {viewMode === 'inbox' && <Inbox className="h-4 w-4" />}
                </Button>

                {/* Theme Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="hidden xs:block h-8 w-8 px-0"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {quickStats.map((stat, index) => (
              <Card key={index} className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center`}>
                    {stat.icon}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.count}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.label === 'My Tickets' && 'Currently assigned to you'}
                    {stat.label === 'Available' && 'Unassigned tickets'}
                    {stat.label === 'In Progress' && 'Active work items'}
                    {stat.label === 'Resolved Today' && 'Completed today'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tab Navigation */}
          <div className="w-full">
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => handleTabChange('my-tickets')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'my-tickets'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <User className="h-4 w-4" />
                  My Tickets
                </button>
                <button
                  onClick={() => handleTabChange('available-tickets')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'available-tickets'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Inbox className="h-4 w-4" />
                  Available Tickets
                </button>
              </nav>
            </div>
            
            {activeTab === 'my-tickets' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">My Assigned Tickets</h2>
                  <Badge variant="outline">Assigned to you</Badge>
                </div>
                
                <ModernTicketList 
                  viewMode={viewMode}
                  searchTerm={searchTerm}
                  onCreateTicket={() => {}} // Empty function since no create button
                  ticketFilter="my-tickets" // Filter for assigned tickets
                  onClaimTicket={handleClaimTicket}
                  onUpdateStatus={handleUpdateStatus}
                />
              </div>
            )}
            
            {activeTab === 'available-tickets' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Available Tickets</h2>
                  <Badge variant="outline">Unassigned tickets</Badge>
                </div>
                
                <ModernTicketList 
                  viewMode={viewMode}
                  searchTerm={searchTerm}
                  onCreateTicket={() => {}} // Empty function since no create button
                  ticketFilter="available-tickets" // Filter for unassigned tickets
                  onClaimTicket={handleClaimTicket}
                  enableBulkActions={true} // Enable bulk selection for available tickets
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}