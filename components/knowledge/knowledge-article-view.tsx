'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  MoreHorizontal,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  User,
  Tag,
  MessageSquare,
  Paperclip,
  Clock,
  AlertTriangle,
  History,
  Globe,
  Users,
  Building2,
  Lock
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'

type KnowledgeVisibility = 'EVERYONE' | 'BY_ROLE' | 'BY_BRANCH' | 'PRIVATE';

interface KnowledgeArticle {
  id: string
  title: string
  slug: string
  content: string
  summary?: string
  status: 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'ARCHIVED'
  tags: string[]
  views: number
  helpful: number
  notHelpful: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
  expiresAt?: string
  isActive: boolean
  authorId: string
  visibility: KnowledgeVisibility
  visibleToRoles: string[]
  author: {
    id: string
    name: string
    email: string
    role: string
  }
  category?: {
    id: string
    name: string
  }
  subcategory?: {
    id: string
    name: string
  }
  item?: {
    id: string
    name: string
  }
  visibleBranches?: Array<{
    id: string
    branch: {
      id: string
      name: string
      code: string
    }
  }>
  versions: Array<{
    id: string
    version: number
    changeNotes: string
    createdAt: string
    author: {
      name: string
    }
  }>
  comments: Array<{
    id: string
    content: string
    createdAt: string
    user: {
      id: string
      name: string
      role: string
    }
    replies: Array<{
      id: string
      content: string
      createdAt: string
      user: {
        id: string
        name: string
        role: string
      }
    }>
  }>
  attachments: Array<{
    id: string
    filename: string
    originalName: string
    size: number
    mimeType: string
    createdAt: string
    uploader: {
      name: string
    }
  }>
  feedbackCount: number
}

interface Props {
  articleId: string
}

export default function KnowledgeArticleView({ articleId }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [article, setArticle] = useState<KnowledgeArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null)

  // Fetch article data
  const fetchArticle = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/knowledge/${articleId}`)
      if (response.ok) {
        const data = await response.json()
        setArticle(data)
      } else if (response.status === 404) {
        toast.error('Article not found')
        router.push('/knowledge')
      } else if (response.status === 403) {
        toast.error('You do not have permission to view this article')
        router.push('/knowledge')
      } else {
        throw new Error('Failed to fetch article')
      }
    } catch (error) {
      console.error('Error fetching article:', error)
      toast.error('Failed to load article')
    } finally {
      setLoading(false)
    }
  }, [articleId, router])

  useEffect(() => {
    fetchArticle()
  }, [fetchArticle])

  // Handle article deletion
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/knowledge/${articleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Article deleted successfully')
        router.push('/knowledge')
      } else {
        throw new Error('Failed to delete article')
      }
    } catch (error) {
      console.error('Error deleting article:', error)
      toast.error('Failed to delete article')
    }
  }

  // Handle feedback submission
  const handleFeedback = async (type: 'helpful' | 'not-helpful') => {
    try {
      const response = await fetch(`/api/knowledge/${articleId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      })

      if (response.ok) {
        setFeedback(type)
        toast.success('Thank you for your feedback!')
        // Refresh article data to get updated counts
        fetchArticle()
      } else {
        throw new Error('Failed to submit feedback')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error('Failed to submit feedback')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h2>
        <p className="text-gray-600 mb-4">The article you're looking for doesn't exist or has been removed.</p>
        <Button asChild>
          <Link href="/knowledge">Back to Knowledge Base</Link>
        </Button>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Published</Badge>
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>
      case 'UNDER_REVIEW':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:border-yellow-400 dark:text-yellow-400">Under Review</Badge>
      case 'ARCHIVED':
        return <Badge variant="destructive">Archived</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getVisibilityBadge = (visibility: KnowledgeVisibility) => {
    switch (visibility) {
      case 'EVERYONE':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            <Globe className="h-3 w-3" />
            Semua Pengguna
          </Badge>
        )
      case 'BY_ROLE':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            <Users className="h-3 w-3" />
            Berdasarkan Role
          </Badge>
        )
      case 'BY_BRANCH':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
            <Building2 className="h-3 w-3" />
            Berdasarkan Cabang
          </Badge>
        )
      case 'PRIVATE':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700">
            <Lock className="h-3 w-3" />
            Pribadi
          </Badge>
        )
      default:
        return null
    }
  }

  const canEdit = session?.user?.role === 'ADMIN' || 
                 session?.user?.role === 'MANAGER' ||
                 article.authorId === session?.user?.id

  const canDelete = session?.user?.role === 'ADMIN' || 
                   session?.user?.role === 'MANAGER' ||
                   article.authorId === session?.user?.id

  const isExpired = article.expiresAt && new Date(article.expiresAt) < new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/knowledge" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Knowledge Base
          </Link>
        </Button>

        {(canEdit || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem asChild>
                  <Link href={`/knowledge/${articleId}/edit`} className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Article
                  </Link>
                </DropdownMenuItem>
              )}
              {canEdit && canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-red-600 flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Delete Article
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Article Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{article.title}</h1>
                {getStatusBadge(article.status)}
                {getVisibilityBadge(article.visibility)}
                {isExpired && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expired
                  </Badge>
                )}
              </div>
              
              {article.summary && (
                <p className="text-gray-600 text-lg mb-4">{article.summary}</p>
              )}

              {/* Category breadcrumb */}
              {(article.category || article.subcategory || article.item) && (
                <div className="text-sm text-gray-500 mb-4">
                  {[article.category?.name, article.subcategory?.name, article.item?.name]
                    .filter(Boolean)
                    .join(' → ')}
                </div>
              )}

              {/* Tags */}
              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {article.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Article Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pt-4 border-t">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>By {article.author.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {article.publishedAt 
                  ? `Published ${formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}`
                  : `Created ${formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}`
                }
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{article.views} views</span>
            </div>
            {article.versions.length > 1 && (
              <div className="flex items-center gap-1">
                <History className="h-4 w-4" />
                <span>Version {article.versions[0]?.version}</span>
              </div>
            )}
            {article.comments.length > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{article.comments.length} comments</span>
              </div>
            )}
            {article.attachments.length > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="h-4 w-4" />
                <span>{article.attachments.length} attachments</span>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Article Content */}
          <Card>
            <CardContent className="prose max-w-none p-6">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {article.content}
              </div>
            </CardContent>
          </Card>

          {/* Feedback Section */}
          <Card>
            <CardHeader>
              <CardTitle>Was this article helpful?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button
                  variant={feedback === 'helpful' ? 'default' : 'outline'}
                  onClick={() => handleFeedback('helpful')}
                  className="flex items-center gap-2"
                  disabled={feedback !== null}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Helpful ({article.helpful})
                </Button>
                <Button
                  variant={feedback === 'not-helpful' ? 'destructive' : 'outline'}
                  onClick={() => handleFeedback('not-helpful')}
                  className="flex items-center gap-2"
                  disabled={feedback !== null}
                >
                  <ThumbsDown className="h-4 w-4" />
                  Not Helpful ({article.notHelpful})
                </Button>
              </div>
              {feedback && (
                <p className="text-sm text-green-600 mt-2">
                  Thank you for your feedback!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          {article.comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments ({article.comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {article.comments.map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{comment.user.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {comment.user.role}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>

                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="ml-8 space-y-2">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{reply.user.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {reply.user.role}
                                </Badge>
                              </div>
                              <span className="text-sm text-gray-500">
                                {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-gray-700">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Article Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Artikel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Penulis:</span> {article.author.name}
              </div>
              <div>
                <span className="font-medium">Role:</span> {article.author.role}
              </div>
              <div>
                <span className="font-medium">Dibuat:</span> {format(new Date(article.createdAt), 'PPP')}
              </div>
              <div>
                <span className="font-medium">Terakhir Diperbarui:</span> {format(new Date(article.updatedAt), 'PPP')}
              </div>
              {article.publishedAt && (
                <div>
                  <span className="font-medium">Dipublikasikan:</span> {format(new Date(article.publishedAt), 'PPP')}
                </div>
              )}
              {article.expiresAt && (
                <div>
                  <span className="font-medium">Kedaluwarsa:</span> {format(new Date(article.expiresAt), 'PPP')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visibility Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Visibilitas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                {getVisibilityBadge(article.visibility)}
              </div>
              {article.visibility === 'BY_ROLE' && article.visibleToRoles.length > 0 && (
                <div>
                  <span className="font-medium block mb-1">Role yang dapat mengakses:</span>
                  <div className="flex flex-wrap gap-1">
                    {article.visibleToRoles.map(role => {
                      const roleLabels: Record<string, string> = {
                        'USER': 'Pengguna',
                        'TECHNICIAN': 'Teknisi',
                        'MANAGER': 'Manager',
                        'MANAGER_IT': 'Manager IT',
                        'ADMIN': 'Admin',
                        'SECURITY_ANALYST': 'Security Analyst'
                      };
                      return (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {roleLabels[role] || role}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              {article.visibility === 'BY_BRANCH' && article.visibleBranches && article.visibleBranches.length > 0 && (
                <div>
                  <span className="font-medium block mb-1">Cabang yang dapat mengakses:</span>
                  <div className="flex flex-wrap gap-1">
                    {article.visibleBranches.map(vb => (
                      <Badge key={vb.branch.id} variant="secondary" className="text-xs">
                        {vb.branch.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {article.visibility === 'PRIVATE' && (
                <p className="text-muted-foreground">
                  Hanya penulis dan kolaborator yang dapat melihat artikel ini.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Version History */}
          {article.versions.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Version History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {article.versions.slice(0, 5).map((version) => (
                  <div key={version.id} className="border-l-2 border-blue-500 pl-3">
                    <div className="font-medium text-sm">Version {version.version}</div>
                    <div className="text-xs text-gray-500 mb-1">
                      {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })} by {version.author.name}
                    </div>
                    <div className="text-sm text-gray-700">{version.changeNotes}</div>
                  </div>
                ))}
                {article.versions.length > 5 && (
                  <div className="text-sm text-gray-500">
                    +{article.versions.length - 5} more versions
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {article.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {article.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{attachment.originalName}</div>
                      <div className="text-xs text-gray-500">
                        {(attachment.size / 1024).toFixed(1)} KB • {attachment.uploader.name}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/knowledge/${articleId}/attachments/${attachment.id}/download`} download>
                        Download
                      </a>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}