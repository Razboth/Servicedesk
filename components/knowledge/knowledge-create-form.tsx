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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, Save, Eye, Plus, X, BookOpen, Tag, Calendar, Layers, Upload, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'

const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
  summary: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  itemId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'PUBLISHED']).default('DRAFT'),
  expiresAt: z.string().optional()
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
      status: 'DRAFT'
    }
  })

  const watchedFields = watch(['categoryId', 'subcategoryId', 'tags'])
  const [categoryId, subcategoryId, tags] = watchedFields

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
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined
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
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/knowledge" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Knowledge Base
          </Link>
        </Button>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isSubmitting || loading}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || loading}
            className="flex items-center gap-2"
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
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Article Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter article title"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  {...register('summary')}
                  placeholder="Brief summary of the article (optional)"
                  rows={2}
                  className={errors.summary ? 'border-red-500' : ''}
                />
                {errors.summary && (
                  <p className="text-sm text-red-500 mt-1">{errors.summary.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  {...register('content')}
                  placeholder="Write your article content here. You can use markdown formatting."
                  rows={12}
                  className={errors.content ? 'border-red-500' : ''}
                />
                {errors.content && (
                  <p className="text-sm text-red-500 mt-1">{errors.content.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Tip: You can use markdown formatting for better presentation
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Attachments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Upload Documents</Label>
                <div className="mt-2">
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
                    className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Click to upload or drag and drop
                  </Label>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Supported formats: PDF, DOC, DOCX, TXT, Images, Excel, PowerPoint
                </p>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files ({attachments.length})</Label>
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAttachments(prev => prev.filter((_, i) => i !== index))
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Article Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Article Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value: 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED') => setValue('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  {...register('expiresAt')}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty if article doesn't expire
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Category Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Categorization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={categoryId || 'none'}
                  onValueChange={(value) => {
                    const newValue = value === 'none' ? undefined : value
                    setValue('categoryId', newValue)
                    setValue('subcategoryId', undefined)
                    setValue('itemId', undefined)
                  }}
                >
                  <SelectTrigger>
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
                <div>
                  <Label>Subcategory</Label>
                  <Select
                    value={subcategoryId || 'none'}
                    onValueChange={(value) => {
                      const newValue = value === 'none' ? undefined : value
                      setValue('subcategoryId', newValue)
                      setValue('itemId', undefined)
                    }}
                  >
                    <SelectTrigger>
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
                <div>
                  <Label>Item</Label>
                  <Select
                    value={watch('itemId') || 'none'}
                    onValueChange={(value) => {
                      const newValue = value === 'none' ? undefined : value
                      setValue('itemId', newValue)
                    }}
                  >
                    <SelectTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="Add a tag"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={addTag}
                  size="sm"
                  disabled={!newTag.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-500">
                Tags help users find your article more easily
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}