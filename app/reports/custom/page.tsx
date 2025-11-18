'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Play,
  Edit,
  Trash2,
  Star,
  StarOff,
  Download,
  Search,
  Calendar,
  User,
  Eye
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CustomReport {
  id: string
  title: string
  type: string
  module: string
  createdAt: string
  lastRunAt?: string
  runCount: number
  creator: {
    id: string
    name: string
    email: string
  }
  isFavorite: boolean
  isPublic: boolean
  _count: {
    executions: number
    favorites: number
  }
}

export default function CustomReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<CustomReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports/custom')

      if (!response.ok) {
        throw new Error('Failed to load reports')
      }

      const data = await response.json()
      setReports(data)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRunReport = (reportId: string) => {
    router.push(`/reports/view/${reportId}`)
  }

  const handleEditReport = (reportId: string) => {
    router.push(`/reports/builder/wizard?editId=${reportId}`)
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return
    }

    try {
      const response = await fetch(`/api/reports/custom/${reportId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadReports()
      }
    } catch (error) {
      console.error('Error deleting report:', error)
    }
  }

  const handleToggleFavorite = async (reportId: string, isFavorite: boolean) => {
    try {
      const response = await fetch(`/api/reports/custom/${reportId}/favorite`, {
        method: isFavorite ? 'DELETE' : 'POST'
      })

      if (response.ok) {
        loadReports()
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const filteredReports = reports.filter(report =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.module.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Custom Reports</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and execute your custom reports
              </p>
            </div>
            <Button onClick={() => router.push('/reports/builder')}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'No reports found matching your search.' : 'No custom reports yet. Create your first report!'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => router.push('/reports/builder')}
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Report
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Executions</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFavorite(report.id, report.isFavorite)}
                        >
                          {report.isFavorite ? (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ) : (
                            <StarOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {report.title}
                          {report.isPublic && (
                            <Badge variant="secondary" className="text-xs">
                              Public
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.type}</Badge>
                      </TableCell>
                      <TableCell>{report.module}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {report.creator.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          {report._count.executions}
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.lastRunAt ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(report.lastRunAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRunReport(report.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditReport(report.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReport(report.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  )
}
