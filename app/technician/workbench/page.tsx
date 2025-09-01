'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TicketsDataTable } from '@/components/tickets/data-table/tickets-data-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Sparkles,
  User,
  Inbox,
  UserCheck,
  ClipboardList,
  Clock,
  AlertCircle,
  CheckCircle
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
            color: 'bg-blue-500',
            icon: <User className="h-4 w-4 text-white" />,
            trend: undefined
          },
          {
            label: 'Available',
            count: data.stats?.unassigned || 0,
            color: 'bg-orange-500',
            icon: <AlertCircle className="h-4 w-4 text-white" />,
            trend: undefined
          },
          {
            label: 'In Progress',
            count: data.stats?.inProgress || 0,
            color: 'bg-yellow-500',
            icon: <Clock className="h-4 w-4 text-white" />,
            trend: undefined
          },
          {
            label: 'Resolved Today',
            count: data.stats?.resolvedToday || 0,
            color: 'bg-green-500',
            icon: <CheckCircle className="h-4 w-4 text-white" />,
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
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-blue-400 to-indigo-400 dark:from-blue-800 dark:to-indigo-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 dark:from-purple-800 dark:to-pink-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400 to-teal-400 dark:from-cyan-800 dark:to-teal-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <div className="space-y-6">
          {/* Header */}
          <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Technician Workbench
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage and process your assigned tickets
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickStats.map((stat, index) => (
              <Card key={index} className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
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
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stat.label === 'My Tickets' && 'Currently assigned to you'}
                      {stat.label === 'Available' && 'Unassigned tickets'}
                      {stat.label === 'In Progress' && 'Active work items'}
                      {stat.label === 'Resolved Today' && 'Completed today'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs with Data Tables */}
          <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <Tabs defaultValue="my-tickets" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                  <TabsTrigger value="my-tickets" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    My Tickets
                  </TabsTrigger>
                  <TabsTrigger value="available-tickets" className="flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    Available Tickets
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="my-tickets" className="mt-0">
                  <TicketsDataTable 
                    ticketFilter="my-tickets"
                    hideHeader={true}
                  />
                </TabsContent>
                
                <TabsContent value="available-tickets" className="mt-0">
                  <TicketsDataTable 
                    ticketFilter="available-tickets"
                    hideHeader={true}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}