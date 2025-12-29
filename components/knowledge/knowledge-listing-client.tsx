'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Filter, BookOpen, MessageSquare, Paperclip, Eye, Calendar, User, Edit, Send } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface KnowledgeArticle {
  id: string
  title: string
  slug: string
  summary?: string
  status: 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'ARCHIVED'
  tags: string[]
  views: number
  helpful: number
  notHelpful: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
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
  commentCount: number
  versionCount: number
  attachmentCount: number
}

interface Category {
  id: string
  name: string
  subcategories?: Subcategory[]
}

interface Subcategory {
  id: string
  name: string
  items?: Item[]
}

interface Item {
  id: string
  name: string
}

export default function KnowledgeListingClient() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })
  
  // Search and filter states
  const [search, setSearch] = useState(searchParams?.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('categoryId') || '')
  const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams?.get('subcategoryId') || '')
  const [selectedItem, setSelectedItem] = useState(searchParams?.get('itemId') || '')
  const [selectedStatus, setSelectedStatus] = useState(searchParams?.get('status') || '')
  const [sortBy, setSortBy] = useState(searchParams?.get('sortBy') || 'updatedAt')
  const [sortOrder, setSortOrder] = useState(searchParams?.get('sortOrder') || 'desc')

  // Fetch categories for filters
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  // Fetch articles with current filters
  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder
      })
      
      if (search) params.append('search', search)
      if (selectedCategory) params.append('categoryId', selectedCategory)
      if (selectedSubcategory) params.append('subcategoryId', selectedSubcategory)
      if (selectedItem) params.append('itemId', selectedItem)
      if (selectedStatus) params.append('status', selectedStatus)

      const response = await fetch(`/api/knowledge?${params}`)
      if (response.ok) {
        const data = await response.json()
        setArticles(data.articles || [])
        setPagination(data.pagination)
      } else {
        console.error('Failed to fetch articles')
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }, [search, selectedCategory, selectedSubcategory, selectedItem, selectedStatus, sortBy, sortOrder, pagination.page, pagination.limit])

  // Update URL when filters change
  const updateURL = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (selectedCategory) params.append('categoryId', selectedCategory)
    if (selectedSubcategory) params.append('subcategoryId', selectedSubcategory)
    if (selectedItem) params.append('itemId', selectedItem)
    if (selectedStatus) params.append('status', selectedStatus)
    if (sortBy !== 'updatedAt') params.append('sortBy', sortBy)
    if (sortOrder !== 'desc') params.append('sortOrder', sortOrder)

    const newURL = params.toString() ? `/knowledge?${params}` : '/knowledge'
    router.push(newURL)
  }, [search, selectedCategory, selectedSubcategory, selectedItem, selectedStatus, sortBy, sortOrder, router])

  // Reset to first page when filters change
  const resetToFirstPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  // Load initial data
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Fetch articles when dependencies change
  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  // Update URL when filters change
  useEffect(() => {
    updateURL()
  }, [updateURL])

  // Reset page when filters change
  useEffect(() => {
    resetToFirstPage()
  }, [search, selectedCategory, selectedSubcategory, selectedItem, selectedStatus, resetToFirstPage])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Published</Badge>
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>
      case 'UNDER_REVIEW':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Under Review</Badge>
      case 'ARCHIVED':
        return <Badge variant="destructive">Archived</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const canCreateArticle = session?.user?.role && ['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)

  // Check if user can edit an article
  const canEditArticle = (article: KnowledgeArticle) => {
    if (!session?.user) return false
    if (['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) return true
    return article.author.id === session.user.id
  }

  // Publish article handler
  const handlePublish = async (articleSlug: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const response = await fetch(`/api/knowledge/${articleSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' })
      })

      if (response.ok) {
        toast.success('Artikel berhasil dipublikasikan')
        fetchArticles() // Refresh the list
      } else {
        const error = await response.json()
        toast.error(error.error || 'Gagal mempublikasikan artikel')
      }
    } catch (error) {
      console.error('Error publishing article:', error)
      toast.error('Gagal mempublikasikan artikel')
    }
  }

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory)
  const selectedSubcategoryData = selectedCategoryData?.subcategories?.find(sub => sub.id === selectedSubcategory)

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filters
            </CardTitle>
            {canCreateArticle && (
              <Link href="/knowledge/create">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Article
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search articles by title, content, or summary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedCategory || 'all'} onValueChange={(value) => {
              const newValue = value === 'all' ? '' : value
              setSelectedCategory(newValue)
              setSelectedSubcategory('')
              setSelectedItem('')
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSubcategory || 'all'} onValueChange={(value) => {
              const newValue = value === 'all' ? '' : value
              setSelectedSubcategory(newValue)
              setSelectedItem('')
            }} disabled={!selectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select Subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                {selectedCategoryData?.subcategories?.map((subcategory) => (
                  <SelectItem key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedItem || 'all'} onValueChange={(value) => {
              const newValue = value === 'all' ? '' : value
              setSelectedItem(newValue)
            }} disabled={!selectedSubcategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select Item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {selectedSubcategoryData?.items?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {session?.user?.role !== 'USER' && (
              <Select value={selectedStatus || 'all'} onValueChange={(value) => {
                const newValue = value === 'all' ? '' : value
                setSelectedStatus(newValue)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Sort Options */}
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">Last Updated</SelectItem>
                <SelectItem value="createdAt">Created Date</SelectItem>
                <SelectItem value="publishedAt">Published Date</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="views">Views</SelectItem>
                <SelectItem value="helpful">Helpfulness</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest</SelectItem>
                <SelectItem value="asc">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {(search || selectedCategory || selectedSubcategory || selectedItem || selectedStatus) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch('')
                setSelectedCategory('')
                setSelectedSubcategory('')
                setSelectedItem('')
                setSelectedStatus('')
              }}
              size="sm"
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Articles List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600">
              {search || selectedCategory || selectedSubcategory || selectedItem || selectedStatus
                ? 'Try adjusting your search criteria or filters.'
                : 'No knowledge articles have been created yet.'}
            </p>
            {canCreateArticle && (
              <Link href="/knowledge/create">
                <Button className="mt-4">Create First Article</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Link
                        href={`/knowledge/${article.slug}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate"
                      >
                        {article.title}
                      </Link>
                      {getStatusBadge(article.status)}
                    </div>

                    {article.summary && (
                      <p className="text-gray-600 mb-3 line-clamp-2">{article.summary}</p>
                    )}

                    {/* Category breadcrumb */}
                    {(article.category || article.subcategory || article.item) && (
                      <div className="text-sm text-gray-500 mb-3">
                        {[article.category?.name, article.subcategory?.name, article.item?.name]
                          .filter(Boolean)
                          .join(' → ')}
                      </div>
                    )}

                    {/* Tags */}
                    {article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {article.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {article.author.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.views} views
                      </div>
                      {article.commentCount > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {article.commentCount} comments
                        </div>
                      )}
                      {article.attachmentCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          {article.attachmentCount} files
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {canEditArticle(article) && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {article.status !== 'PUBLISHED' && (
                        <Button
                          size="sm"
                          variant="default"
                          className="flex items-center gap-1.5"
                          onClick={(e) => handlePublish(article.slug, e)}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Publish
                        </Button>
                      )}
                      <Link href={`/knowledge/${article.slug}/edit`}>
                        <Button size="sm" variant="outline" className="flex items-center gap-1.5 w-full">
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                {[...Array(pagination.pages)].map((_, i) => {
                  const page = i + 1
                  return (
                    <Button
                      key={page}
                      variant={pagination.page === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page }))}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}