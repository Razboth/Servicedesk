'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, Save, Eye, Plus, X, BookOpen, Tag, Calendar, Layers, Upload, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { VisibilitySettings } from './visibility-settings'

type KnowledgeVisibility = 'EVERYONE' | 'BY_ROLE' | 'BY_BRANCH' | 'PRIVATE';

const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
  summary: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  itemId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'PUBLISHED']).default('DRAFT'),
  expiresAt: z.string().optional(),
  visibility: z.enum(['EVERYONE', 'BY_ROLE', 'BY_BRANCH', 'PRIVATE']).default('EVERYONE'),
  visibleToRoles: z.array(z.string()).default([]),
  visibleToBranches: z.array(z.string()).default([])
})

type FormData = z.infer<typeof createArticleSchema>

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

export default function KnowledgeCreateForm() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(createArticleSchema),
    defaultValues: {
      tags: [],
      status: 'DRAFT',
      visibility: 'EVERYONE',
      visibleToRoles: [],
      visibleToBranches: []
    }
  })

  const watchedFields = watch(['categoryId', 'subcategoryId', 'tags', 'visibility', 'visibleToRoles', 'visibleToBranches'])
  const [categoryId, subcategoryId, tags, visibility, visibleToRoles, visibleToBranches] = watchedFields

  // Fetch categories for the dropdown
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

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          tags: tags || [],
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
          visibility: visibility || 'EVERYONE',
          visibleToRoles: visibleToRoles || [],
          visibleToBranches: visibleToBranches || []
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create article')
      }

      const article = await response.json()

      // Upload attachments if any
      if (attachments.length > 0) {
        setUploadingAttachments(true)
        try {
          for (const file of attachments) {
            const formData = new FormData()
            formData.append('file', file)

            await fetch(`/api/knowledge/${article.id}/attachments`, {
              method: 'POST',
              body: formData
            })
          }
        } catch (error) {
          console.error('Error uploading attachments:', error)
          toast.error('Article created but some attachments failed to upload')
        } finally {
          setUploadingAttachments(false)
        }
      }

      toast.success('Knowledge article created successfully!')
      router.push(`/knowledge/${article.id}`)
    } catch (error) {
      console.error('Error creating article:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create article')
    } finally {
      setLoading(false)
    }
  }

  // Handle adding tags
  const addTag = () => {
    if (newTag.trim() && !tags?.includes(newTag.trim())) {
      const updatedTags = [...(tags || []), newTag.trim()]
      setValue('tags', updatedTags)
      setNewTag('')
    }
  }

  // Handle removing tags
  const removeTag = (tagToRemove: string) => {
    const updatedTags = tags?.filter(tag => tag !== tagToRemove) || []
    setValue('tags', updatedTags)
  }

  // Handle Enter key for tags
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const selectedCategory = categories.find(cat => cat.id === categoryId)
  const selectedSubcategory = selectedCategory?.subcategories?.find(sub => sub.id === subcategoryId)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <Link href="/knowledge">
          <Button variant="outline" type="button" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Knowledge Base
          </Button>
        </Link>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isSubmitting || loading}
            className="flex-1 sm:flex-initial"
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || loading}
            className="flex items-center gap-2 flex-1 sm:flex-initial"
          >
            {isSubmitting || loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting || loading ? 'Creating...' : 'Create Article'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                Article Content
              </CardTitle>
              <CardDescription className="text-sm">
                Write your knowledge article with clear and helpful information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter a descriptive title for your article"
                  className={`h-11 ${errors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary" className="text-sm font-medium">
                  Summary
                </Label>
                <Textarea
                  id="summary"
                  {...register('summary')}
                  placeholder="Brief summary of the article (optional)"
                  rows={3}
                  className={errors.summary ? 'border-red-500' : ''}
                />
                {errors.summary && (
                  <p className="text-sm text-red-500">{errors.summary.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm font-medium">
                  Content <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="content"
                  {...register('content')}
                  placeholder="Write your article content here. You can use markdown formatting for better presentation."
                  rows={14}
                  className={`font-mono text-sm ${errors.content ? 'border-red-500' : ''}`}
                />
                {errors.content && (
                  <p className="text-sm text-red-500">{errors.content.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Tip: You can use markdown formatting (e.g., **bold**, *italic*, # headings)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-primary" />
                Attachments
              </CardTitle>
              <CardDescription className="text-sm">
                Upload supporting documents, images, or files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.xlsx,.xls,.ppt,.pptx"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setAttachments(prev => [...prev, ...files])
                  }}
                  className="hidden"
                />
                <Label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <span className="text-sm font-medium text-foreground">Click to upload files</span>
                  <span className="text-xs text-muted-foreground mt-1">or drag and drop</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-3">
                  Supported formats: PDF, DOC, DOCX, TXT, Images (PNG, JPG, GIF), Excel, PowerPoint
                </p>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Selected Files ({attachments.length})
                  </Label>
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAttachments(prev => prev.filter((_, i) => i !== index))
                          }}
                          className="flex-shrink-0 hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column on large screens */}
        <div className="space-y-6">
          {/* Article Settings */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5 text-primary" />
                Article Settings
              </CardTitle>
              <CardDescription className="text-sm">
                Configure publication and expiration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value: 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED') => setValue('status', value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt" className="text-sm font-medium">
                  Expiration Date (Optional)
                </Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  {...register('expiresAt')}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty if article doesn't expire
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Category Selection */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="h-5 w-5 text-primary" />
                Categorization
              </CardTitle>
              <CardDescription className="text-sm">
                Organize your article by category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Select
                  value={categoryId || 'none'}
                  onValueChange={(value) => {
                    const newValue = value === 'none' ? undefined : value
                    setValue('categoryId', newValue)
                    setValue('subcategoryId', undefined)
                    setValue('itemId', undefined)
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCategory && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Subcategory</Label>
                  <Select
                    value={subcategoryId || 'none'}
                    onValueChange={(value) => {
                      const newValue = value === 'none' ? undefined : value
                      setValue('subcategoryId', newValue)
                      setValue('itemId', undefined)
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select Subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Subcategory</SelectItem>
                      {selectedCategory.subcategories?.map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedSubcategory && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Item</Label>
                  <Select
                    value={watch('itemId') || 'none'}
                    onValueChange={(value) => {
                      const newValue = value === 'none' ? undefined : value
                      setValue('itemId', newValue)
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select Item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Item</SelectItem>
                      {selectedSubcategory.items?.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="h-5 w-5 text-primary" />
                Tags
              </CardTitle>
              <CardDescription className="text-sm">
                Add keywords to improve searchability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="Type a tag and press Enter"
                  className="flex-1 h-10"
                />
                <Button
                  type="button"
                  onClick={addTag}
                  size="sm"
                  disabled={!newTag.trim()}
                  className="h-10 px-4"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {tags && tags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Active Tags ({tags.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1.5 px-3 py-1.5"
                      >
                        <span className="text-sm">{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Tags help users find your article more easily through search
              </p>
            </CardContent>
          </Card>

          {/* Visibility Settings */}
          <VisibilitySettings
            visibility={(visibility as KnowledgeVisibility) || 'EVERYONE'}
            visibleToRoles={visibleToRoles || []}
            visibleToBranches={visibleToBranches || []}
            onChange={(settings) => {
              setValue('visibility', settings.visibility)
              setValue('visibleToRoles', settings.visibleToRoles)
              setValue('visibleToBranches', settings.visibleToBranches)
            }}
            disabled={isSubmitting || loading}
          />
        </div>
      </div>
    </form>
  )
}
