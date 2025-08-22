'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  BookOpen, 
  ExternalLink, 
  Plus, 
  X, 
  FileText,
  Calendar,
  User,
  Eye,
  ThumbsUp,
  Link as LinkIcon,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface RelatedArticle {
  id: string
  title: string
  slug: string
  summary?: string
  status: 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED'
  views: number
  helpful: number
  notHelpful: number
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    role: string
  }
  category?: { id: string; name: string }
  subcategory?: { id: string; name: string }
  item?: { id: string; name: string }
  _count?: {
    comments: number
    attachments: number
    versions: number
  }
  linkedBy?: string
  linkedAt?: string
}

interface RelatedArticlesProps {
  ticketId: string
  canManageArticles?: boolean
}

export function RelatedArticles({ ticketId, canManageArticles = false }: RelatedArticlesProps) {
  const [loading, setLoading] = useState(true)
  const [suggestedArticles, setSuggestedArticles] = useState<RelatedArticle[]>([])
  const [linkedArticles, setLinkedArticles] = useState<RelatedArticle[]>([])
  const [categoryInfo, setCategoryInfo] = useState<any>(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RelatedArticle[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<RelatedArticle | null>(null)

  // Fetch related articles
  const fetchRelatedArticles = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tickets/${ticketId}/related-knowledge`)
      if (!response.ok) throw new Error('Failed to fetch related articles')
      
      const data = await response.json()
      setSuggestedArticles(data.suggested || [])
      setLinkedArticles(data.linked || [])
      setCategoryInfo(data.categoryInfo || null)
    } catch (error) {
      console.error('Error fetching related articles:', error)
      toast.error('Failed to load related articles')
    } finally {
      setLoading(false)
    }
  }

  // Search for articles to link
  const searchArticles = async () => {
    if (!searchQuery.trim()) return

    try {
      setSearchLoading(true)
      const response = await fetch(`/api/knowledge?search=${encodeURIComponent(searchQuery)}&limit=10`)
      if (!response.ok) throw new Error('Failed to search articles')
      
      const data = await response.json()
      setSearchResults(data.articles || [])
    } catch (error) {
      console.error('Error searching articles:', error)
      toast.error('Failed to search articles')
    } finally {
      setSearchLoading(false)
    }
  }

  // Link an article to the ticket
  const linkArticle = async (articleId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/related-knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to link article')
      }

      toast.success('Article linked successfully')
      setShowLinkDialog(false)
      setSearchQuery('')
      setSearchResults([])
      fetchRelatedArticles() // Refresh the list
    } catch (error: any) {
      console.error('Error linking article:', error)
      toast.error(error.message || 'Failed to link article')
    }
  }

  // Unlink an article from the ticket
  const unlinkArticle = async (articleId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/related-knowledge?articleId=${articleId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to unlink article')

      toast.success('Article unlinked successfully')
      fetchRelatedArticles() // Refresh the list
    } catch (error) {
      console.error('Error unlinking article:', error)
      toast.error('Failed to unlink article')
    }
  }

  useEffect(() => {
    fetchRelatedArticles()
  }, [ticketId])

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        searchArticles()
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(delaySearch)
  }, [searchQuery])

  if (loading) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    )
  }

  const ArticleCard = ({ article, isLinked = false }: { article: RelatedArticle; isLinked?: boolean }) => (
    <div className="border rounded-lg p-3 space-y-2 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <Link 
          href={`/knowledge/${article.id}`}
          target="_blank"
          className="flex-1 group"
        >
          <h4 className="font-medium text-sm group-hover:text-blue-600 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {article.title}
          </h4>
        </Link>
        <div className="flex items-center gap-1">
          {isLinked && canManageArticles && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => unlinkArticle(article.id)}
              title="Unlink article"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Link 
            href={`/knowledge/${article.id}`}
            target="_blank"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Open in new tab"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {article.summary && (
        <p className="text-xs text-gray-600 line-clamp-2">{article.summary}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {article.views}
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp className="h-3 w-3" />
          {article.helpful}
        </span>
        {article._count?.comments !== undefined && (
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {article._count.comments}
          </span>
        )}
      </div>

      {isLinked && article.linkedBy && (
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <LinkIcon className="h-3 w-3" />
          Linked by {article.linkedBy}
          {article.linkedAt && ` on ${format(new Date(article.linkedAt), 'MMM d, yyyy')}`}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {article.category && (
          <Badge variant="outline" className="text-xs">
            {article.category.name}
          </Badge>
        )}
        {article.subcategory && (
          <Badge variant="outline" className="text-xs">
            {article.subcategory.name}
          </Badge>
        )}
        {article.item && (
          <Badge variant="outline" className="text-xs">
            {article.item.name}
          </Badge>
        )}
      </div>
    </div>
  )

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Knowledge Base
          </h3>
          {canManageArticles && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowLinkDialog(true)}
              title="Link article"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Linked Articles */}
          {linkedArticles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Linked Articles</h4>
              <div className="space-y-2">
                {linkedArticles.map(article => (
                  <ArticleCard key={article.id} article={article} isLinked />
                ))}
              </div>
            </div>
          )}

          {/* Suggested Articles */}
          {suggestedArticles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Suggested Articles
                {categoryInfo && (
                  <span className="text-xs text-gray-500 ml-2">
                    Based on ticket categories
                  </span>
                )}
              </h4>
              <div className="space-y-2">
                {suggestedArticles.map(article => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          )}

          {/* No articles message */}
          {linkedArticles.length === 0 && suggestedArticles.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No related articles found</p>
              {canManageArticles && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowLinkDialog(true)}
                  className="mt-2"
                >
                  Link an article
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Link Article Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Knowledge Article</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search for articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={searchArticles}
                disabled={searchLoading || !searchQuery.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {searchLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(article => (
                  <div
                    key={article.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedArticle(article)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{article.title}</h4>
                        {article.summary && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {article.summary}
                          </p>
                        )}
                      </div>
                      {selectedArticle?.id === article.id && (
                        <Badge className="ml-2">Selected</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : searchQuery.trim() ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No articles found</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Enter a search term to find articles</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedArticle && linkArticle(selectedArticle.id)}
              disabled={!selectedArticle}
            >
              Link Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}