'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Shield, 
  Lock, 
  Unlock, 
  RotateCcw, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Clock,
  Users,
  Activity
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  loginAttempts: number
  lockedAt: string | null
  lastLoginAttempt: string | null
  lastActivity: string | null
  createdAt: string
  branch: { name: string; code: string } | null
}

interface LoginAttempt {
  email: string
  success: boolean
  attemptedAt: string
  ipAddress: string | null
  lockTriggered: boolean
}

interface AccountStats {
  totalUsers: number
  lockedAccounts: number
  recentFailures: number
  activeUsers: number
}

interface AccountData {
  users: User[]
  recentAttempts: LoginAttempt[]
  stats: AccountStats
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function SecurityDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lockedOnly, setLockedOnly] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Check if user has admin role
  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Super admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/accounts?locked=${lockedOnly}`)
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch account data:', error)
      toast.error('Failed to load account data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [lockedOnly])

  const handleAccountAction = async (action: string, user: User) => {
    try {
      setActionLoading(true)
      const response = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: user.id
        })
      })

      if (!response.ok) throw new Error('Action failed')

      toast.success(`Account ${action} successful`)
      fetchData() // Refresh data
      setSelectedUser(null)
    } catch (error) {
      console.error('Account action failed:', error)
      toast.error(`Failed to ${action} account`)
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const isLocked = (user: User) => {
    return user.lockedAt && user.loginAttempts >= 5
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage user account security
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="locked-filter"
            checked={lockedOnly}
            onCheckedChange={setLockedOnly}
          />
          <Label htmlFor="locked-filter">Show locked accounts only</Label>
        </div>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locked Accounts</CardTitle>
              <Lock className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data.stats.lockedAccounts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Failures</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{data.stats.recentFailures}</div>
              <p className="text-xs text-muted-foreground">Last hour</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>
            Manage user account security and access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.users && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Login Attempts</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.branch ? (
                          <div>
                            <div className="font-medium">{user.branch.name}</div>
                            <div className="text-xs text-muted-foreground">{user.branch.code}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No branch</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={user.isActive ? 'default' : 'destructive'}>
                            {user.isActive ? 'Active' : 'Disabled'}
                          </Badge>
                          {isLocked(user) && (
                            <Badge variant="destructive">
                              <Lock className="h-3 w-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${user.loginAttempts >= 3 ? 'text-red-600' : 'text-gray-600'}`}>
                            {user.loginAttempts}/5
                          </div>
                          {user.lastLoginAttempt && (
                            <div className="text-xs text-muted-foreground">
                              {formatDate(user.lastLoginAttempt)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(user.lastActivity)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {isLocked(user) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-green-600">
                                  <Unlock className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Unlock Account</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to unlock the account for {user.email}? 
                                    This will reset their failed login attempts and allow them to log in again.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleAccountAction('unlock', user)}
                                    disabled={actionLoading}
                                  >
                                    {actionLoading ? 'Unlocking...' : 'Unlock Account'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          
                          {user.loginAttempts > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAccountAction('reset_attempts', user)}
                              disabled={actionLoading}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant={user.isActive ? "destructive" : "default"}
                            onClick={() => handleAccountAction(user.isActive ? 'disable' : 'enable', user)}
                            disabled={actionLoading}
                          >
                            {user.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Login Attempts */}
      {data?.recentAttempts && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Login Attempts</CardTitle>
            <CardDescription>
              Login attempts in the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Lock Triggered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentAttempts.slice(0, 20).map((attempt, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{attempt.email}</TableCell>
                      <TableCell>
                        <Badge variant={attempt.success ? 'default' : 'destructive'}>
                          {attempt.success ? 'Success' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(attempt.attemptedAt)}</TableCell>
                      <TableCell>{attempt.ipAddress || 'Unknown'}</TableCell>
                      <TableCell>
                        {attempt.lockTriggered && (
                          <Badge variant="destructive">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}