'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getTicketUrlId } from '@/lib/utils/ticket-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { LockedInput } from '@/components/ui/locked-input'
import { 
  X, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Search,
  Star,
  StarOff,
  Eye,
  Clock,
  AlertTriangle,
  AlertCircle,
  FileText,
  Building2,
  Tag,
  Zap,
  Upload,
  Loader2,
  List
} from 'lucide-react'
import { toast } from 'sonner'

interface Service {
  id: string
  name: string
  description: string
  category: {
    id: string
    name: string
    level: number
  }
  priority: string
  estimatedHours: number
  slaHours?: number
  requiresApproval: boolean
  supportGroups?: Array<{
    id: string
    name: string
  }>
  defaultTitle?: string | null
  defaultItilCategory?: string | null
  defaultIssueClassification?: string | null
  fieldTemplates?: any[]
  fields?: any[]
  tier1CategoryId?: string | null
  tier2SubcategoryId?: string | null
  tier3ItemId?: string | null
}

interface Category {
  id: string
  name: string
  description?: string
  level: number
  icon: string
  color: string
  children?: Category[]
  subcategories?: Category[]
  _count?: {
    services: number
    children: number
  }
}

interface FavoriteService {
  id: string
  name: string
  categoryName: string
  lastUsed: string
  favoriteRecordId?: string // For debugging - the actual favorite record ID
}


interface TicketPreview {
  title: string
  description: string
  service: Service | null
  priority: string
  estimatedSLA: string
  requiresApproval: boolean
}

// ATM Code Select Component
interface ATMCodeSelectProps {
  value: string
  onChange: (value: string, atmData?: { location?: string; branchName?: string }) => void
  placeholder?: string
}

function ATMCodeSelect({ value, onChange, placeholder }: ATMCodeSelectProps) {
  const [atmOptions, setAtmOptions] = useState<any[]>([])
  const [isLoadingAtms, setIsLoadingAtms] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  useEffect(() => {
    // Load ATM options
    fetch('/api/atms/lookup')
      .then(res => res.json())
      .then(data => {
        if (data.options && Array.isArray(data.options)) {
          setAtmOptions(data.options)
        }
        setIsLoadingAtms(false)
      })
      .catch(err => {
        console.error('Error loading ATMs:', err)
        setIsLoadingAtms(false)
      })
  }, [])
  
  // Filter options based on search term
  const filteredOptions = searchTerm 
    ? atmOptions.filter(atm => 
        atm.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        atm.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : atmOptions
  
  // Group by branch
  const ownBranchAtms = filteredOptions.filter(atm => atm.isOwnBranch)
  const otherBranchAtms = filteredOptions.filter(atm => !atm.isOwnBranch)
  
  if (isLoadingAtms) {
    return (
      <Select disabled>
        <SelectTrigger className="mt-2">
          <SelectValue placeholder="Loading ATMs..." />
        </SelectTrigger>
      </Select>
    )
  }
  
  return (
    <Select
      value={value || ''}
      onValueChange={(selectedValue) => {
        const selectedAtm = atmOptions.find(atm => atm.value === selectedValue)
        if (onChange) {
          onChange(selectedValue, selectedAtm ? {
            location: selectedAtm.location,
            branchName: selectedAtm.branchName
          } : undefined)
        }
      }}
    >
      <SelectTrigger className="mt-2">
        <SelectValue placeholder={placeholder || 'Select ATM...'} />
      </SelectTrigger>
      <SelectContent>
        {/* Search input */}
        <div className="px-2 pb-2">
          <Input
            placeholder="Search ATM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
          />
        </div>
        
        {/* Own Branch ATMs */}
        {ownBranchAtms.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
              Your Branch ATMs
            </div>
            {ownBranchAtms.slice(0, 50).map((atm) => (
              <SelectItem key={atm.value} value={atm.value}>
                {atm.label}
              </SelectItem>
            ))}
          </>
        )}
        
        {/* Other Branch ATMs */}
        {otherBranchAtms.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
              Other Branch ATMs
            </div>
            {otherBranchAtms.slice(0, 100).map((atm) => (
              <SelectItem key={atm.value} value={atm.value}>
                {atm.label} ({atm.branchName})
              </SelectItem>
            ))}
          </>
        )}
        
        {filteredOptions.length === 0 && (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            No ATMs found
          </div>
        )}
        
        {filteredOptions.length > 150 && (
          <div className="px-2 py-2 text-xs text-muted-foreground text-center">
            Showing first 150 results. Use search to find specific ATMs.
          </div>
        )}
      </SelectContent>
    </Select>
  )
}

interface TicketWizardProps {
  onClose: () => void
  onSuccess: () => void
}

export function TicketWizard({ onClose, onSuccess }: TicketWizardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Data state
  const [categories, setCategories] = useState<Category[]>([])
  const [favoriteServices, setFavoriteServices] = useState<FavoriteService[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [popularServices, setPopularServices] = useState<{
    user: Service[]
    branch: Service[]
    trending: Service[]
  }>({ user: [], branch: [], trending: [] })
  const [recentServices, setRecentServices] = useState<Service[]>([])
  
  // Form state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: 'INCIDENT',
    issueClassification: '',
    categoryId: '',
    subcategoryId: '',
    itemId: '',
    branchId: '',
    fieldValues: {} as Record<string, any>,
    isConfidential: false,
    securityClassification: '',
    securityFindings: ''
  })
  
  // Additional state for form features
  const [attachments, setAttachments] = useState<File[]>([])
  const [tierCategories, setTierCategories] = useState<any[]>([])
  const [tierSubcategories, setTierSubcategories] = useState<any[]>([])
  const [tierItems, setTierItems] = useState<any[]>([])

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showValidationWarnings, setShowValidationWarnings] = useState(false)
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceSearchTerm, setServiceSearchTerm] = useState('')
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showBranchPopular, setShowBranchPopular] = useState(false)
  const [showTrending, setShowTrending] = useState(false)
  
  // Global service search state
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [globalSearchResults, setGlobalSearchResults] = useState<Service[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)
  
  // Field locking state
  const [lockedFields, setLockedFields] = useState<Record<string, {
    isLocked: boolean
    source: 'default' | 'user' | 'service'
    canOverride: boolean
  }>>({})
  
  // Track if autofill is in progress
  const [isAutofilling, setIsAutofilling] = useState(false)

  const steps = [
    { number: 1, title: 'Category Selection', description: 'Choose your service category' },
    { number: 2, title: 'Service Selection', description: 'Select specific service' },
    { number: 3, title: 'Ticket Information', description: 'Provide details' },
    { number: 4, title: 'Review & Submit', description: 'Confirm your request' }
  ]

  useEffect(() => {
    loadCategories()
    loadFavoriteServices()
    loadTierCategories()
    loadPopularServices()
    loadRecentServices()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      // Debounce service search
      const timer = setTimeout(() => {
        loadServices(selectedCategory.id, serviceSearchTerm)
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [selectedCategory, serviceSearchTerm])

  // Debounced global search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchAllServices(globalSearchTerm)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [globalSearchTerm])

  // Autofill form data when service is selected
  useEffect(() => {
    const autofillServiceData = async () => {
      if (selectedService) {
        setIsAutofilling(true)
        console.log('🔧 Modern Autofill: Starting autofill for service:', selectedService.name)
        console.log('🔧 Modern Autofill: Service data:', selectedService)
        
        // Prepare form data with service defaults
        const updatedFormData = { ...formData }
        const updatedLockedFields = { ...lockedFields }
        
        // Auto-fill basic fields with lock information
        if (selectedService.defaultTitle) {
          updatedFormData.title = selectedService.defaultTitle
          updatedLockedFields.title = {
            isLocked: true,
            source: 'service',
            canOverride: true
          }
          console.log('🔧 Modern Autofill: Set default title:', selectedService.defaultTitle)
        }
        
        if (selectedService.defaultItilCategory) {
          updatedFormData.category = selectedService.defaultItilCategory as any
          updatedLockedFields.category = {
            isLocked: true,
            source: 'service',
            canOverride: true
          }
          console.log('🔧 Modern Autofill: Set default ITIL category:', selectedService.defaultItilCategory)
        }
        
        if (selectedService.defaultIssueClassification) {
          updatedFormData.issueClassification = selectedService.defaultIssueClassification as any
          updatedLockedFields.issueClassification = {
            isLocked: true,
            source: 'service',
            canOverride: true
          }
          console.log('🔧 Modern Autofill: Set default issue classification:', selectedService.defaultIssueClassification)
        }
        
        if (selectedService.priority) {
          updatedFormData.priority = selectedService.priority as any
          updatedLockedFields.priority = {
            isLocked: true,
            source: 'service',
            canOverride: true
          }
          console.log('🔧 Modern Autofill: Set default priority:', selectedService.priority)
        }
        
        // Handle field template default values
        const fieldValues: Record<string, any> = { ...formData.fieldValues }
        
        // Process fieldTemplates
        if (selectedService.fieldTemplates && selectedService.fieldTemplates.length > 0) {
          selectedService.fieldTemplates
            .filter((template: any) => template.isUserVisible)
            .forEach((template: any) => {
              const defaultValue = template.defaultValue || template.fieldTemplate.defaultValue || ''
              if (defaultValue) {
                fieldValues[template.fieldTemplate.name] = defaultValue
                console.log('🔧 Modern Autofill: Set field template default:', template.fieldTemplate.name, '=', defaultValue)
              }
              
              // Auto-fill reporting_branch for ATM claims with current user's branch
              if (template.fieldTemplate.name === 'reporting_branch' && session?.user) {
                // Get user's branch information
                fetch('/api/user/profile')
                  .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                  })
                  .then(data => {
                    if (data.branch) {
                      setFormData(prev => ({
                        ...prev,
                        fieldValues: {
                          ...prev.fieldValues,
                          reporting_branch: data.branch.name
                        }
                      }))
                    }
                  })
                  .catch(err => console.error('Failed to load user branch:', err))
              }
            })
        }
        
        // Process regular fields
        if (selectedService.fields && selectedService.fields.length > 0) {
          selectedService.fields
            .filter((field: any) => field.isUserVisible && field.defaultValue)
            .forEach((field: any) => {
              fieldValues[field.name] = field.defaultValue
              console.log('🔧 Modern Autofill: Set field default:', field.name, '=', field.defaultValue)
            })
        }
        
        updatedFormData.fieldValues = fieldValues
        
        // Handle 3-tier categorization
        let loadedSubcategories: any[] = []
        let loadedItems: any[] = []
        
        if (selectedService.tier1CategoryId) {
          updatedFormData.categoryId = selectedService.tier1CategoryId
          updatedLockedFields.categoryId = {
            isLocked: true,
            source: 'service',
            canOverride: true
          }
          console.log('🔧 Modern Autofill: Set tier1CategoryId:', selectedService.tier1CategoryId)
          
          // Load subcategories
          loadedSubcategories = await loadTierSubcategories(selectedService.tier1CategoryId)
          console.log('🔧 Modern Autofill: Loaded subcategories:', loadedSubcategories.length)
          
          if (selectedService.tier2SubcategoryId) {
            updatedFormData.subcategoryId = selectedService.tier2SubcategoryId
            updatedLockedFields.subcategoryId = {
              isLocked: true,
              source: 'service',
              canOverride: true
            }
            console.log('🔧 Modern Autofill: Set tier2SubcategoryId:', selectedService.tier2SubcategoryId)
            
            // Load items
            loadedItems = await loadTierItems(selectedService.tier2SubcategoryId)
            console.log('🔧 Modern Autofill: Loaded items:', loadedItems.length)
            
            if (selectedService.tier3ItemId) {
              updatedFormData.itemId = selectedService.tier3ItemId
              updatedLockedFields.itemId = {
                isLocked: true,
                source: 'service',
                canOverride: true
              }
              console.log('🔧 Modern Autofill: Set tier3ItemId:', selectedService.tier3ItemId)
            }
          }
        }
        
        // Update form data and field locks
        setFormData(updatedFormData)
        setLockedFields(updatedLockedFields)
        console.log('🔧 Modern Autofill: Updated form data:', updatedFormData)
        console.log('🔧 Modern Autofill: Updated locked fields:', updatedLockedFields)
        
        // Complete autofill with a small delay for smooth UX
        setTimeout(() => {
          setIsAutofilling(false)
        }, 500)
        
      } else if (formData.title || formData.description) {
        // Clear form when no service is selected
        console.log('🔧 Modern Autofill: Clearing form data')
        setFormData({
          title: '',
          description: '',
          priority: 'MEDIUM',
          category: 'INCIDENT',
          issueClassification: '',
          categoryId: '',
          subcategoryId: '',
          itemId: '',
          branchId: '',
          fieldValues: {},
          isConfidential: false,
          securityClassification: '',
          securityFindings: ''
        })
        setLockedFields({})
      }
    }
    
    autofillServiceData()
  }, [selectedService])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories?level=1&includeChildren=true')
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded categories:', data)
        // Extract categories array from response object
        const categoriesArray = data.categories || data || []
        // Transform categories to include visual information
        const transformedCategories = Array.isArray(categoriesArray) 
          ? categoriesArray.map((cat: any) => ({
              ...cat,
              icon: getCategoryIcon(cat.name),
              color: getCategoryColor(cat.name),
              subcategories: cat.children || cat.subcategories || []
            }))
          : []
        setCategories(transformedCategories)
      } else {
        console.error('Failed to load categories:', response.status)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadServices = async (categoryId: string, search?: string) => {
    try {
      setIsLoadingServices(true)
      const params = new URLSearchParams({ categoryId })
      if (search) {
        params.append('search', search)
      }
      
      const response = await fetch(`/api/services?${params}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded services:', data)
        setServices(data || [])
      } else {
        console.error('Failed to load services:', response.status)
      }
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setIsLoadingServices(false)
    }
  }

  const loadFavoriteServices = async () => {
    try {
      console.log('⭐ Loading favorites from API...')
      const response = await fetch('/api/services/favorites')
      console.log('⭐ Favorites API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('⭐ Raw favorites API data:', data)
        
        // Transform API response to match the component's expected format
        const transformedFavorites = data.map((fav: any) => ({
          id: fav.service.id,
          name: fav.service.name,
          categoryName: fav.service.category?.name || 'Unknown',
          lastUsed: fav.lastUsedAt || fav.createdAt,
          favoriteRecordId: fav.id // Keep the actual favorite record ID for debugging
        }))
        console.log('⭐ Transformed favorites:', transformedFavorites)
        setFavoriteServices(transformedFavorites)
      } else if (response.status !== 401) {
        console.log('⭐ API failed, using localStorage fallback')
        // Fallback to localStorage for compatibility
        const saved = localStorage.getItem('favoriteServices')
        if (saved) {
          setFavoriteServices(JSON.parse(saved))
        }
      }
    } catch (error) {
      console.error('⭐ Error loading favorites:', error)
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem('favoriteServices')
        if (saved) {
          setFavoriteServices(JSON.parse(saved))
        }
      } catch (localError) {
        console.error('⭐ Error loading from localStorage:', localError)
      }
    }
  }

  const saveFavoriteService = async (service: Service) => {
    try {
      const response = await fetch('/api/services/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: service.id })
      })
      
      if (response.ok) {
        // Immediately update local state for better UX
        const newFavorite: FavoriteService = {
          id: service.id,
          name: service.name,
          categoryName: service.category?.name || 'Unknown',
          lastUsed: new Date().toISOString()
        }
        const favorites = [...favoriteServices]
        const existingIndex = favorites.findIndex(f => f.id === service.id)
        
        if (existingIndex >= 0) {
          favorites[existingIndex] = newFavorite
        } else {
          favorites.unshift(newFavorite)
        }
        
        setFavoriteServices(favorites.slice(0, 10))
        
        // Also reload from API to ensure consistency
        await loadFavoriteServices()
        toast.success('Service added to favorites')
      } else if (response.status === 409) {
        // Service is already favorited - this is not an error
        console.log('Service is already in favorites:', service.name)
        toast.success('Service is already in your favorites')
        // Still reload to ensure consistency
        await loadFavoriteServices()
      } else {
        throw new Error(`API call failed with status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error saving favorite via API, falling back to localStorage:', error)
      
      // Fallback to localStorage
      try {
        const favorites = [...favoriteServices]
        const existingIndex = favorites.findIndex(f => f.id === service.id)
        
        const newFavorite: FavoriteService = {
          id: service.id,
          name: service.name,
          categoryName: service.category?.name || 'Unknown',
          lastUsed: new Date().toISOString()
        }

        if (existingIndex >= 0) {
          favorites[existingIndex] = newFavorite
        } else {
          favorites.unshift(newFavorite)
        }

        const limitedFavorites = favorites.slice(0, 10)
        setFavoriteServices(limitedFavorites)
        localStorage.setItem('favoriteServices', JSON.stringify(limitedFavorites))
        toast.success('Service added to favorites')
      } catch (localError) {
        console.error('Error saving to localStorage:', localError)
        toast.error('Failed to add to favorites')
      }
    }
  }

  const removeFavoriteService = async (serviceId: string) => {
    try {
      console.log('🗑️ Starting remove favorite for serviceId:', serviceId)
      console.log('🗑️ Current favoriteServices state:', favoriteServices)
      
      const url = `/api/services/favorites?serviceId=${serviceId}`
      console.log('🗑️ DELETE request URL:', url)
      
      const response = await fetch(url, {
        method: 'DELETE'
      })
      
      console.log('🗑️ API response status:', response.status)
      console.log('🗑️ API response ok:', response.ok)
      
      if (response.ok) {
        console.log('🗑️ API delete successful, updating local state')
        // Immediately update local state for better UX
        const filtered = favoriteServices.filter(f => f.id !== serviceId)
        console.log('🗑️ Filtered favorites:', filtered)
        setFavoriteServices(filtered)
        
        // Also reload from API to ensure consistency
        console.log('🗑️ Reloading favorites from API...')
        await loadFavoriteServices()
        toast.success('Service removed from favorites')
      } else if (response.status === 404) {
        console.log('🗑️ Service was not in favorites (404):', serviceId)
        // Service is not favorited - this is not an error
        // Still update local state to ensure consistency
        const filtered = favoriteServices.filter(f => f.id !== serviceId)
        setFavoriteServices(filtered)
        // Reload from API to sync state
        await loadFavoriteServices()
        toast.success('Service removed from favorites')
      } else {
        const errorText = await response.text()
        console.error('🗑️ API error response:', errorText)
        throw new Error(`API call failed with status: ${response.status}, response: ${errorText}`)
      }
    } catch (error) {
      console.error('🗑️ Error removing favorite via API, falling back to localStorage:', error)
      
      // Fallback to localStorage
      try {
        const filtered = favoriteServices.filter(f => f.id !== serviceId)
        setFavoriteServices(filtered)
        localStorage.setItem('favoriteServices', JSON.stringify(filtered))
        toast.success('Service removed from favorites')
      } catch (localError) {
        console.error('🗑️ Error removing from localStorage:', localError)
        toast.error('Failed to remove from favorites')
      }
    }
  }

  const isServiceFavorited = (serviceId: string): boolean => {
    return favoriteServices.some(fav => fav.id === serviceId)
  }

  const loadPopularServices = async () => {
    try {
      const response = await fetch('/api/services/popular?type=all')
      if (response.ok) {
        const data = await response.json()
        setPopularServices({
          user: data.user || [],
          branch: data.branch || [],
          trending: data.trending || []
        })
      }
    } catch (error) {
      console.error('Error loading popular services:', error)
    }
  }

  const loadRecentServices = async () => {
    try {
      console.log('🕒 Fetching recent services from API...')
      const response = await fetch('/api/services/recent?limit=15')
      console.log('🕒 Recent services API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🕒 Recent services API data:', data)
        console.log('🕒 Number of recent services:', data?.length || 0)
        setRecentServices(data || [])
      } else {
        console.error('🕒 Recent services API failed with status:', response.status)
        const errorText = await response.text()
        console.error('🕒 Error response:', errorText)
      }
    } catch (error) {
      console.error('🕒 Error loading recent services:', error)
    }
  }

  const searchAllServices = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setGlobalSearchResults([])
      return
    }

    try {
      setIsSearchingGlobal(true)
      console.log('🔍 Global Search: Searching for:', searchQuery)
      
      const response = await fetch(`/api/services?search=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setGlobalSearchResults(data || [])
        console.log('🔍 Global Search: Found', data?.length || 0, 'services')
      } else {
        console.error('Failed to search services:', response.status)
        setGlobalSearchResults([])
      }
    } catch (error) {
      console.error('Error searching services:', error)
      setGlobalSearchResults([])
    } finally {
      setIsSearchingGlobal(false)
    }
  }

  const loadTierCategories = async () => {
    try {
      const response = await fetch('/api/tier-categories')
      if (response.ok) {
        const data = await response.json()
        setTierCategories(data || [])
      }
    } catch (error) {
      console.error('Error loading tier categories:', error)
    }
  }

  const loadTierSubcategories = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/subcategories?categoryId=${categoryId}`)
      if (response.ok) {
        const data = await response.json()
        setTierSubcategories(data || [])
        return data || []
      }
      return []
    } catch (error) {
      console.error('Error loading tier subcategories:', error)
      return []
    }
  }

  const loadTierItems = async (subcategoryId: string) => {
    try {
      const response = await fetch(`/api/items?subcategoryId=${subcategoryId}`)
      if (response.ok) {
        const data = await response.json()
        setTierItems(data || [])
        return data || []
      }
      return []
    } catch (error) {
      console.error('Error loading tier items:', error)
      return []
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const maxSize = 10 * 1024 * 1024 // 10MB
    const validFiles: File[] = []

    for (const file of files) {
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`)
        continue
      }
      validFiles.push(file)
    }

    setAttachments(prev => [...prev, ...validFiles])
    event.target.value = '' // Reset input
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }


  const getCategoryIcon = (name: string): string => {
    const iconMap: { [key: string]: string } = {
      'Hardware': '💻',
      'Software': '🖥️',
      'Network': '🌐',
      'Security': '🔒',
      'Access': '🔑',
      'Email': '📧',
      'Facilities': '🏢',
      'Other': '📋'
    }
    return iconMap[name] || '📋'
  }

  const getCategoryColor = (name: string): string => {
    const colorMap: { [key: string]: string } = {
      'Hardware': 'from-blue-500 to-blue-600',
      'Software': 'from-green-500 to-green-600',
      'Network': 'from-amber-500 to-amber-600',
      'Security': 'from-red-500 to-red-600',
      'Access': 'from-yellow-500 to-yellow-600',
      'Email': 'from-amber-600 to-amber-700',
      'Facilities': 'from-gray-500 to-gray-600',
      'Other': 'from-teal-500 to-teal-600'
    }
    return colorMap[name] || 'from-gray-500 to-gray-600'
  }

  const selectServiceDirectly = async (service: any) => {
    try {
      console.log('🚀 Smart Discovery: Selecting service directly:', service.name)
      console.log('🚀 Smart Discovery: Service data:', service)
      
      // Find and set the category
      const serviceCategory = categories.find(cat => cat.id === service.category.id)
      if (serviceCategory) {
        setSelectedCategory(serviceCategory)
        console.log('📂 Smart Discovery: Set category:', serviceCategory.name)
      }

      // Initialize field values similar to the standard ticket form
      if (service.fields || service.fieldTemplates) {
        console.log('🔧 Smart Discovery: Initializing form fields')
        
        // Initialize all field values to prevent controlled/uncontrolled issues
        const allFields = [
          ...(service.fields || []),
          ...(service.fieldTemplates || []).map((template: any) => template.fieldTemplate)
        ].filter((field: any) => field && (field.isUserVisible || 
          (service.fieldTemplates && service.fieldTemplates.some((t: any) => t.fieldTemplate.id === field.id && t.isUserVisible))))

        console.log('🔧 Smart Discovery: Found', allFields.length, 'visible fields to initialize')
        
        // Initialize field values in formData to prevent controlled/uncontrolled issues
        const initialFieldValues: Record<string, any> = { ...formData.fieldValues }
        allFields.forEach((field: any) => {
          if (initialFieldValues[field.name] === undefined) {
            initialFieldValues[field.name] = ''
            console.log('🔧 Smart Discovery: Initialized field', field.name, 'with empty string')
          }
        })
        
        // Set field values in form data
        setFormData(prev => ({
          ...prev,
          fieldValues: initialFieldValues
        }))
      }
      
      // Set the selected service (this will trigger autofill with complete data)
      setSelectedService(service)
      console.log('🎯 Smart Discovery: Set service with complete data:', service.name)
      
      // Move to the next step (ticket information) 
      setCurrentStep(3)
      console.log('➡️ Smart Discovery: Advanced to step 3 (ticket information)')
      
      // Show success toast
      toast.success(`Selected ${service.name} - ready for ticket details!`)
    } catch (error) {
      console.error('Error selecting service directly:', error)
      toast.error('Failed to select service')
    }
  }

  // Validation function for current step
  const validateCurrentStep = () => {
    const errors: Record<string, string> = {}

    if (currentStep === 3) {
      // Validate required fields on details step
      if (!formData.title || formData.title.trim() === '') {
        errors.title = 'Title is required'
      }
      if (!formData.description || formData.description.trim() === '') {
        errors.description = 'Description is required'
      }

      // Validate custom fields
      if (selectedService?.fields) {
        for (const field of selectedService.fields) {
          if (field.isRequired && field.isUserVisible) {
            const fieldValue = formData.fieldValues[field.name]
            if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
              errors[field.name] = `${field.label || field.name} is required`
            }
          }
        }
      }

      // Validate template fields
      if (selectedService?.fieldTemplates) {
        for (const template of selectedService.fieldTemplates) {
          if (template.fieldTemplate.isRequired && template.isVisible) {
            const fieldValue = formData.fieldValues[template.fieldTemplate.name]
            if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
              errors[template.fieldTemplate.name] = `${template.fieldTemplate.label || template.fieldTemplate.name} is required`
            }
          }
        }
      }
    }

    return errors
  }

  const handleNextStep = () => {
    if (currentStep === 3) {
      // Validate before moving to review
      const errors = validateCurrentStep()
      setValidationErrors(errors)

      if (Object.keys(errors).length > 0) {
        setShowValidationWarnings(true)
        toast.error('Please fill in all required fields before proceeding')
        return
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
      setShowValidationWarnings(false)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setShowValidationWarnings(false)
      setValidationErrors({})
    }
  }

  // Helper function to check if all required fields are filled
  const areAllRequiredFieldsFilled = () => {
    if (!selectedService || !formData.title || !formData.description) {
      return false
    }
    
    // Check service fields
    if (selectedService.fields && selectedService.fields.length > 0) {
      for (const field of selectedService.fields) {
        if (field.isRequired) {
          const fieldValue = formData.fieldValues[field.name]
          if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
            return false
          }
        }
      }
    }
    
    // Check field templates
    if (selectedService.fieldTemplates && selectedService.fieldTemplates.length > 0) {
      for (const template of selectedService.fieldTemplates) {
        if (template.isRequired || template.fieldTemplate?.isRequired) {
          const fieldValue = formData.fieldValues[template.fieldTemplate.name]
          if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
            return false
          }
        }
      }
    }
    
    return true
  }

  const handleSubmit = async () => {
    if (!selectedService || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate required custom fields
    const missingRequiredFields: string[] = []
    
    // Check service fields
    if (selectedService.fields && selectedService.fields.length > 0) {
      for (const field of selectedService.fields) {
        if (field.isRequired) {
          const fieldValue = formData.fieldValues[field.name]
          if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
            missingRequiredFields.push(field.label || field.name)
          }
        }
      }
    }
    
    // Check field templates
    if (selectedService.fieldTemplates && selectedService.fieldTemplates.length > 0) {
      for (const template of selectedService.fieldTemplates) {
        if (template.isRequired || template.fieldTemplate?.isRequired) {
          const fieldValue = formData.fieldValues[template.fieldTemplate.name]
          if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
            missingRequiredFields.push(template.fieldTemplate.label || template.fieldTemplate.name)
          }
        }
      }
    }
    
    if (missingRequiredFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingRequiredFields.join(', ')}`)
      return
    }

    setIsLoading(true)
    
    try {
      // Process attachments
      const processedAttachments = []
      for (const file of attachments) {
        try {
          const base64Content = await convertFileToBase64(file)
          processedAttachments.push({
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            content: base64Content
          })
        } catch (error) {
          console.error('Error processing file:', file.name, error)
          toast.error(`Failed to process file: ${file.name}`)
        }
      }

      // Prepare field values with proper fieldId mapping
      const fieldValues: Array<{ fieldId: string; value: string }> = []
      if (selectedService && formData.fieldValues) {
        // Process field templates first (if they exist)
        if (selectedService.fieldTemplates && selectedService.fieldTemplates.length > 0) {
          selectedService.fieldTemplates
            .filter((template: any) => template.isUserVisible)
            .forEach((template: any) => {
              const value = formData.fieldValues[template.fieldTemplate.name]
              if (value !== undefined && value !== null && value !== '') {
                fieldValues.push({ fieldId: template.fieldTemplate.id, value: String(value) })
                console.log('🎯 Submit: Added field template value:', template.fieldTemplate.name, '=', value)
              }
            })
        }

        // Process regular service fields
        if (selectedService.fields && selectedService.fields.length > 0) {
          selectedService.fields
            .filter((field: any) => field.isUserVisible)
            .forEach((field: any) => {
              const value = formData.fieldValues[field.name]
              if (value !== undefined && value !== null && value !== '') {
                fieldValues.push({ fieldId: field.id, value: String(value) })
                console.log('🎯 Submit: Added service field value:', field.name, '=', value)
              }
            })
        }
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        serviceId: selectedService.id,
        priority: formData.priority,
        category: formData.category,
        issueClassification: formData.issueClassification || undefined,
        categoryId: formData.categoryId || undefined,
        subcategoryId: formData.subcategoryId || undefined,
        itemId: formData.itemId || undefined,
        branchId: formData.branchId || session?.user?.branchId,
        fieldValues: fieldValues.length > 0 ? fieldValues : undefined,
        attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
        isConfidential: formData.isConfidential,
        securityClassification: formData.securityClassification || undefined,
        securityFindings: formData.securityFindings || undefined
      }

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Ticket created successfully!')
        
        // Refresh recent services to update "Recently Used" (service usage is tracked automatically via API)
        try {
          await loadRecentServices()
        } catch (error) {
          console.log('Note: Could not refresh recent services:', error)
          // Don't show error to user as this is not critical
        }
        
        onSuccess()
        // Extract numeric part from ticket number for cleaner URLs
        let ticketNum = result.ticketNumber || result.id;
        if (ticketNum && ticketNum.includes('-')) {
          const parts = ticketNum.split('-');
          ticketNum = parseInt(parts[parts.length - 1]).toString();
        }
        router.push(`/tickets/${ticketNum}`)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast.error('Failed to create ticket')
    } finally {
      setIsLoading(false)
    }
  }

  const getTicketPreview = (): TicketPreview => {
    return {
      title: formData.title,
      description: formData.description,
      service: selectedService,
      priority: formData.priority,
      estimatedSLA: selectedService ? `${selectedService.slaHours || selectedService.estimatedHours} hours` : 'Not selected',
      requiresApproval: selectedService?.requiresApproval || false
    }
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-700 dark:to-orange-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create New Ticket</h2>
              <p className="text-amber-100 mt-1">Enhanced ticket creation experience</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="mt-6 flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                  step.number <= currentStep
                    ? 'border-white bg-white text-amber-700'
                    : 'border-amber-300 text-amber-300'
                }`}>
                  {step.number < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-bold">{step.number}</span>
                  )}
                </div>
                <div className="ml-3 hidden md:block">
                  <p className="text-sm font-medium text-white">{step.title}</p>
                  <p className="text-xs text-amber-100">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-8 h-px bg-amber-300 mx-4 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="h-[60vh] p-6 overflow-y-auto">
            {/* Step 1: Category Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Choose Service Category
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select the category that best describes your request, or search for a specific service
                  </p>
                </div>

                {/* Global Service Search */}
                <div className="bg-amber-50/50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                  <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-3 flex items-center">
                    <Search className="h-4 w-4 mr-1" />
                    Search All Services
                  </h4>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search for any service (e.g., 'password reset', 'olibs', 'account unlock')..."
                      value={globalSearchTerm}
                      onChange={(e) => setGlobalSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setGlobalSearchTerm('')
                        }
                      }}
                      className="pl-10 bg-white dark:bg-gray-800 border-amber-300/50 dark:border-amber-600/50 focus:ring-amber-500"
                    />
                    {globalSearchTerm && (
                      <button
                        onClick={() => setGlobalSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Global Search Results */}
                  {globalSearchTerm && (
                    <div className="mt-4">
                      {isSearchingGlobal ? (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-500" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">Searching all services...</p>
                        </div>
                      ) : globalSearchResults.length > 0 ? (
                        <div>
                          <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                            Found {globalSearchResults.length} service{globalSearchResults.length !== 1 ? 's' : ''}:
                          </p>
                          <div className="grid gap-2 max-h-60 overflow-y-auto">
                            {globalSearchResults.map((service) => (
                              <Card 
                                key={service.id}
                                className="cursor-pointer transition-all hover:shadow-md border-emerald-300 hover:border-emerald-500 bg-white dark:bg-gray-800"
                                onClick={() => selectServiceDirectly(service)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                        {service.name}
                                      </p>
                                      <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                                        {service.category.name} → {service.name}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                        {service.description}
                                      </p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs h-5">
                                          SLA: {service.slaHours || service.estimatedHours}h
                                        </Badge>
                                        {service.requiresApproval && (
                                          <Badge variant="secondary" className="text-xs h-5">
                                            Approval Required
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <Zap className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            No services found for "{globalSearchTerm}"
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Try different keywords or browse categories below
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Smart Service Discovery */}
                <div className="space-y-6 mb-8">
                  {/* Your Favorites */}
                  {favoriteServices.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                        <Star className="h-4 w-4 mr-1 text-yellow-500" />
                        Your Favorites
                        <span className="text-xs text-gray-500 ml-2">(Services you starred)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {favoriteServices.slice(0, 6).map((favorite) => (
                          <Card 
                            key={favorite.id} 
                            className="hover:shadow-md transition-all cursor-pointer border-yellow-200 hover:border-yellow-400"
                            onClick={async () => {
                              // For favorites, we need to load the full service details first
                              try {
                                const response = await fetch(`/api/services/${favorite.id}`)
                                if (response.ok) {
                                  const serviceData = await response.json()
                                  selectServiceDirectly(serviceData)
                                } else {
                                  toast.error('Service not found')
                                }
                              } catch (error) {
                                console.error('Error loading favorite service:', error)
                                toast.error('Failed to load service')
                              }
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{favorite.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{favorite.categoryName}</p>
                                  {favorite.lastUsed && (
                                    <span className="text-xs text-gray-400">
                                      {new Date(favorite.lastUsed).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      console.log('🚫 Remove button clicked for favorite:', favorite)
                                      console.log('🚫 Calling removeFavoriteService with ID:', favorite.id)
                                      removeFavoriteService(favorite.id)
                                    }}
                                    className="h-5 w-5 p-0 hover:bg-red-100"
                                    title="Remove from favorites"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recently Used Services - Dropdown */}
                  {recentServices.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-emerald-500" />
                        Recently Used
                        <span className="text-xs text-gray-500 ml-2">(Complete history - select to use)</span>
                      </h4>
                      <Select onValueChange={(serviceId) => {
                        const service = recentServices.find((s: any) => s.id === serviceId);
                        if (service) selectServiceDirectly(service);
                      }}>
                        <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-emerald-200 hover:border-emerald-400">
                          <SelectValue placeholder="Select from recently used services..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {recentServices.slice(0, 15).map((service: any) => (
                            <SelectItem 
                              key={service.id} 
                              value={service.id}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">{service.name}</span>
                                    {isServiceFavorited(service.id) && (
                                      <span title="Also in favorites">
                                        <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500 truncate">{service.category?.name || 'Unknown'}</span>
                                    <Badge variant="outline" className="text-xs h-4 px-1">
                                      {service.usageCount || 0}x
                                    </Badge>
                                    {service.lastUsed && (
                                      <span className="text-xs text-gray-400">
                                        {new Date(service.lastUsed).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Popular in Your Branch */}
                  {popularServices.branch.length > 0 && (
                    <div>
                      <Button
                        variant="ghost"
                        onClick={() => setShowBranchPopular(!showBranchPopular)}
                        className="w-full justify-between p-3 h-auto text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 mb-3"
                      >
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2 text-green-500" />
                          Popular in Your Branch ({popularServices.branch.length})
                        </div>
                        {showBranchPopular ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      
                      {showBranchPopular && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 transition-all duration-300 ease-in-out">
                          {popularServices.branch.slice(0, 6).map((service: any) => (
                            <Card 
                              key={service.id} 
                              className="hover:shadow-md transition-all cursor-pointer border-green-200 hover:border-green-400"
                              onClick={() => selectServiceDirectly(service)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{service.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{service.category.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs h-5">
                                        {service.usageCount || 0} uses
                                      </Badge>
                                      <span className="text-xs text-green-600">Branch popular</span>
                                    </div>
                                  </div>
                                  <Building2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trending Services */}
                  {popularServices.trending.length > 0 && (
                    <div>
                      <Button
                        variant="ghost"
                        onClick={() => setShowTrending(!showTrending)}
                        className="w-full justify-between p-3 h-auto text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 mb-3"
                      >
                        <div className="flex items-center">
                          <Zap className="h-4 w-4 mr-2 text-purple-500" />
                          Trending This Week ({popularServices.trending.length})
                        </div>
                        {showTrending ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      
                      {showTrending && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 transition-all duration-300 ease-in-out">
                          {popularServices.trending.slice(0, 6).map((service: any) => (
                            <Card 
                              key={service.id} 
                              className="hover:shadow-md transition-all cursor-pointer border-purple-200 hover:border-purple-400"
                              onClick={() => selectServiceDirectly(service)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{service.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{service.category.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs h-5">
                                        {service.usageCount || 0} this week
                                      </Badge>
                                      <span className="text-xs text-purple-600">Trending</span>
                                    </div>
                                  </div>
                                  <Zap className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}


                  {/* Show message if no smart suggestions available */}
                  {favoriteServices.length === 0 && recentServices.length === 0 && popularServices.branch.length === 0 && 
                   popularServices.trending.length === 0 && (
                    <div className="text-center py-6 bg-amber-50/50 dark:bg-amber-900/20 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                      <Zap className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        Welcome to Smart Service Discovery
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        As you create tickets, we'll show your most-used services and trending options here for quick access.
                      </p>
                    </div>
                  )}

                  <Separator className="my-6" />
                </div>


                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCategories.map((category) => (
                    <Card 
                      key={category.id}
                      className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                        selectedCategory?.id === category.id
                          ? 'border-emerald-500 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => {
                        setSelectedCategory(category)
                        setCurrentStep(2)
                        loadServices(category.id)
                      }}
                    >
                      <CardContent className="p-6 text-center">
                        <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-r ${category.color} rounded-full flex items-center justify-center text-2xl`}>
                          {category.icon}
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{category.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{category.description}</p>
                        <Badge variant="outline" className="mt-2">
                          {category._count?.services || 0} services
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Service Selection */}
            {currentStep === 2 && selectedCategory && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Select Service
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose the specific service for your request in <strong>{selectedCategory.name}</strong>
                  </p>
                </div>

                {/* Service Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search services..."
                    value={serviceSearchTerm}
                    onChange={(e) => setServiceSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setServiceSearchTerm('')
                      }
                    }}
                    className="pl-10 bg-white/[0.5] dark:bg-gray-800/[0.5] border-gray-300 dark:border-gray-600"
                  />
                  {serviceSearchTerm && (
                    <button
                      onClick={() => setServiceSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Add button to show all services */}
                <div className="mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsLoadingServices(true);
                      try {
                        // Load all services without category filter
                        const response = await fetch('/api/services');
                        if (response.ok) {
                          const data = await response.json();
                          setServices(data || []);
                        }
                      } catch (error) {
                        console.error('Error loading all services:', error);
                      } finally {
                        setIsLoadingServices(false);
                      }
                    }}
                    className="w-full"
                  >
                    <List className="h-4 w-4 mr-2" />
                    Show All Services (Manual Selection)
                  </Button>
                </div>

                <div className="grid gap-3">
                  {isLoadingServices ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">
                        {serviceSearchTerm ? 'Searching services...' : 'Loading services...'}
                      </p>
                    </div>
                  ) : services.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {serviceSearchTerm ? 'No services found' : 'No services available'}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        {serviceSearchTerm 
                          ? <>No services match &quot;{serviceSearchTerm}&quot;. Try a different search term.</>
                          : 'There are no services available in this category.'
                        }
                      </p>
                      {serviceSearchTerm && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setServiceSearchTerm('')}
                          className="mt-4"
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      {serviceSearchTerm && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Found {services.length} service{services.length !== 1 ? 's' : ''} matching &quot;{serviceSearchTerm}&quot;
                        </div>
                      )}
                      {services.map((service) => (
                      <Card 
                        key={service.id}
                        className={`cursor-pointer transition-all hover:shadow-md border ${
                          selectedService?.id === service.id
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                        onClick={() => setSelectedService(service)}
                      >
                        <CardContent className="p-4 relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isServiceFavorited(service.id)) {
                                removeFavoriteService(service.id)
                              } else {
                                saveFavoriteService(service)
                              }
                            }}
                            className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-yellow-100"
                          >
                            <Star className={`h-4 w-4 ${isServiceFavorited(service.id) ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                          </Button>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-8">
                              <h6 className="font-medium text-gray-900 dark:text-white">{service.name}</h6>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{service.description}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  SLA: {service.slaHours || service.estimatedHours}h
                                </Badge>
                                {service.requiresApproval && (
                                  <Badge variant="secondary" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Requires Approval
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  Priority: {service.priority}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Ticket Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Ticket Information
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Provide details for your {selectedService?.name} request
                  </p>
                </div>

                {/* Validation Warning Alert */}
                {showValidationWarnings && Object.keys(validationErrors).length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          Required fields are missing
                        </h3>
                        <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                          Please fill in all required fields marked with a red asterisk (*) before proceeding.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className={cn(
                    "border-emerald-200 dark:border-emerald-800",
                    showValidationWarnings && (validationErrors.title || validationErrors.description) && "border-red-500"
                  )}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Basic Information</span>
                        {showValidationWarnings && (validationErrors.title || validationErrors.description) && (
                          <span className="text-sm text-red-500 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Required fields missing
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <LockedInput
                          label="Title"
                          value={formData.title}
                          onChange={(value) => {
                            setFormData({ ...formData, title: value })
                            if (showValidationWarnings && value.trim()) {
                              setValidationErrors(prev => {
                                const newErrors = { ...prev }
                                delete newErrors.title
                                return newErrors
                              })
                            }
                          }}
                          placeholder="Brief description of your issue or request"
                          isLocked={lockedFields.title?.isLocked}
                          source={lockedFields.title?.source}
                          canOverride={lockedFields.title?.canOverride}
                          onUnlock={() => setLockedFields({
                            ...lockedFields,
                            title: { ...lockedFields.title!, isLocked: false }
                          })}
                          required={true}
                        />
                        {showValidationWarnings && validationErrors.title && (
                          <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {validationErrors.title}
                          </p>
                        )}
                      </div>

                      <div>
                        <LockedInput
                          type="textarea"
                          label="Description"
                          value={formData.description}
                          onChange={(value) => {
                            setFormData({ ...formData, description: value })
                            if (showValidationWarnings && value.trim()) {
                              setValidationErrors(prev => {
                                const newErrors = { ...prev }
                                delete newErrors.description
                                return newErrors
                              })
                            }
                          }}
                          placeholder="Provide detailed information about your request..."
                          isLocked={lockedFields.description?.isLocked}
                          source={lockedFields.description?.source}
                          canOverride={lockedFields.description?.canOverride}
                          onUnlock={() => setLockedFields({
                            ...lockedFields,
                            description: { ...lockedFields.description!, isLocked: false }
                          })}
                          required={true}
                        />
                        {showValidationWarnings && validationErrors.description && (
                          <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {validationErrors.description}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dynamic Fields - Service Fields */}
                  {selectedService && selectedService.fields && selectedService.fields.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Service Specific Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedService.fields
                          .filter((field: any) => field.isUserVisible)
                          .sort((a: any, b: any) => a.order - b.order)
                          .map((field: any) => (
                            <div key={field.id}>
                              <Label className="text-base font-medium">
                                {field.label}
                                {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              {field.type === 'TEXT' && (
                                <Input
                                  value={formData.fieldValues[field.name] || ''}
                                  onChange={(e) => {
                                    setFormData({
                                      ...formData,
                                      fieldValues: {
                                        ...formData.fieldValues,
                                        [field.name]: e.target.value
                                      }
                                    })
                                    if (showValidationWarnings && e.target.value.trim()) {
                                      setValidationErrors(prev => {
                                        const newErrors = { ...prev }
                                        delete newErrors[field.name]
                                        return newErrors
                                      })
                                    }
                                  }}
                                  placeholder={field.placeholder || ''}
                                  className={cn(
                                    "mt-2",
                                    showValidationWarnings && validationErrors[field.name] && "border-red-500"
                                  )}
                                />
                              )}
                              {field.type === 'TEXTAREA' && (
                                <Textarea
                                  value={formData.fieldValues[field.name] || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [field.name]: e.target.value
                                    }
                                  })}
                                  placeholder={field.placeholder || ''}
                                  className="mt-2"
                                />
                              )}
                              {field.type === 'NUMBER' && (
                                <Input
                                  type="number"
                                  value={formData.fieldValues[field.name] || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [field.name]: e.target.value
                                    }
                                  })}
                                  placeholder={field.placeholder || ''}
                                  className="mt-2"
                                  required={field.isRequired}
                                  step="any"
                                />
                              )}
                              {field.type === 'SELECT' && (
                                <Select
                                  value={formData.fieldValues[field.name] || ''}
                                  onValueChange={(value) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [field.name]: value
                                    }
                                  })}
                                >
                                  <SelectTrigger className="mt-2">
                                    <SelectValue placeholder={field.placeholder || 'Select option'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {field.options && typeof field.options === 'string' ? 
                                      field.options.split(',').map((option: string) => (
                                        <SelectItem key={option.trim()} value={option.trim()}>
                                          {option.trim()}
                                        </SelectItem>
                                      )) :
                                      field.options && Array.isArray(field.options) ?
                                        field.options.map((option: any) => (
                                          <SelectItem key={option.value || option} value={option.value || option}>
                                            {option.label || option}
                                          </SelectItem>
                                        )) : null
                                    }
                                  </SelectContent>
                                </Select>
                              )}
                              {field.type === 'CHECKBOX' && (
                                <div className="flex items-center space-x-2 mt-2">
                                  <Checkbox
                                    checked={formData.fieldValues[field.name] === 'true'}
                                    onCheckedChange={(checked) => setFormData({
                                      ...formData,
                                      fieldValues: {
                                        ...formData.fieldValues,
                                        [field.name]: checked ? 'true' : 'false'
                                      }
                                    })}
                                  />
                                  <Label>{field.label}</Label>
                                </div>
                              )}
                              {field.type === 'DATE' && (
                                <Input
                                  type="date"
                                  value={formData.fieldValues[field.name] || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [field.name]: e.target.value
                                    }
                                  })}
                                  className="mt-2"
                                  required={field.isRequired}
                                />
                              )}
                              {field.type === 'DATETIME' && (
                                <Input
                                  type="datetime-local"
                                  value={formData.fieldValues[field.name] || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [field.name]: e.target.value
                                    }
                                  })}
                                  className="mt-2"
                                  required={field.isRequired}
                                />
                              )}
                              {field.helpText && (
                                <p className="text-sm text-gray-500 mt-1">{field.helpText}</p>
                              )}
                              {showValidationWarnings && validationErrors[field.name] && (
                                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {validationErrors[field.name]}
                                </p>
                              )}
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Dynamic Fields - Field Templates */}
                  {selectedService && selectedService.fieldTemplates && selectedService.fieldTemplates.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Additional Service Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedService.fieldTemplates
                          .filter((template: any) => template.isUserVisible)
                          .sort((a: any, b: any) => a.order - b.order)
                          .map((template: any) => (
                            <div key={template.id}>
                              <Label className="text-base font-medium">
                                {template.fieldTemplate.label}
                                {template.isRequired && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              {(template.fieldTemplate.type === 'TEXT' || template.fieldTemplate.type === 'EMAIL' || template.fieldTemplate.type === 'URL' || template.fieldTemplate.type === 'PHONE') && (
                                <Input
                                  type={template.fieldTemplate.type === 'EMAIL' ? 'email' : template.fieldTemplate.type === 'URL' ? 'url' : template.fieldTemplate.type === 'PHONE' ? 'tel' : 'text'}
                                  value={formData.fieldValues[template.fieldTemplate.name] || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [template.fieldTemplate.name]: e.target.value
                                    }
                                  })}
                                  placeholder={template.fieldTemplate.placeholder || ''}
                                  className="mt-2"
                                />
                              )}
                              {template.fieldTemplate.type === 'TEXTAREA' && (
                                <Textarea
                                  value={formData.fieldValues[template.fieldTemplate.name] || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [template.fieldTemplate.name]: e.target.value
                                    }
                                  })}
                                  placeholder={template.fieldTemplate.placeholder || ''}
                                  className="mt-2"
                                />
                              )}
                              {template.fieldTemplate.type === 'NUMBER' && (
                                <Input
                                  type="number"
                                  value={formData.fieldValues[template.fieldTemplate.name] || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [template.fieldTemplate.name]: e.target.value
                                    }
                                  })}
                                  placeholder={template.fieldTemplate.placeholder || ''}
                                  className="mt-2"
                                  required={template.isRequired}
                                  step="any"
                                />
                              )}
                              {template.fieldTemplate.type === 'DATE' && (
                                <Input
                                  type="date"
                                  value={formData.fieldValues[template.fieldTemplate.name] || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [template.fieldTemplate.name]: e.target.value
                                    }
                                  })}
                                  className="mt-2"
                                  required={template.isRequired}
                                />
                              )}
                              {template.fieldTemplate.type === 'DATETIME' && (
                                <Input
                                  type="datetime-local"
                                  value={formData.fieldValues[template.fieldTemplate.name] || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [template.fieldTemplate.name]: e.target.value
                                    }
                                  })}
                                  className="mt-2"
                                  required={template.isRequired}
                                />
                              )}
                              {/* Special handling for ATM Code field - render native select */}
                              {template.fieldTemplate.name === 'atm_code' && template.fieldTemplate.type === 'SELECT' && (
                                <ATMCodeSelect
                                  value={formData.fieldValues[template.fieldTemplate.name] || ''}
                                  onChange={(value, atmData) => {
                                    setFormData({
                                      ...formData,
                                      fieldValues: {
                                        ...formData.fieldValues,
                                        [template.fieldTemplate.name]: value,
                                        // Auto-fill related ATM fields if available
                                        ...(atmData?.location && { atm_location: atmData.location }),
                                        ...(atmData?.branchName && { owner_branch: atmData.branchName })
                                      }
                                    })
                                  }}
                                  placeholder={template.fieldTemplate.placeholder || 'Select ATM'}
                                />
                              )}
                              {/* Regular SELECT/RADIO fields */}
                              {template.fieldTemplate.name !== 'atm_code' && (template.fieldTemplate.type === 'SELECT' || template.fieldTemplate.type === 'RADIO') && (
                                <div>
                                  {(
                                    <Select
                                      value={formData.fieldValues[template.fieldTemplate.name] || ''}
                                      onValueChange={(value) => setFormData({
                                        ...formData,
                                        fieldValues: {
                                          ...formData.fieldValues,
                                          [template.fieldTemplate.name]: value
                                        }
                                      })}
                                    >
                                      <SelectTrigger className="mt-2">
                                        <SelectValue placeholder={template.fieldTemplate.placeholder || 'Select option'} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {template.fieldTemplate.options && Array.isArray(template.fieldTemplate.options) 
                                          ? template.fieldTemplate.options.map((option: any, index: number) => {
                                              // Handle both object format {value, label} and string format
                                              const optionValue = typeof option === 'object' ? (option.value || '') : option;
                                              const optionLabel = typeof option === 'object' ? (option.label || option.value || '') : option;
                                              const optionKey = typeof option === 'object' ? (option.value || `option-${index}`) : option;
                                              
                                              return (
                                                <SelectItem key={optionKey} value={optionValue}>
                                                  {optionLabel}
                                                </SelectItem>
                                              );
                                            })
                                          : typeof template.fieldTemplate.options === 'string' 
                                            ? template.fieldTemplate.options.split(',').map((option: string) => (
                                                <SelectItem key={option.trim()} value={option.trim()}>
                                                  {option.trim()}
                                                </SelectItem>
                                              ))
                                            : null
                                        }
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              )}
                              {template.fieldTemplate.type === 'DATE' && (
                                <Input
                                  type="date"
                                  value={formData.fieldValues[template.fieldTemplate.name] || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [template.fieldTemplate.name]: e.target.value
                                    }
                                  })}
                                  className="mt-2"
                                />
                              )}
                              {template.fieldTemplate.type === 'DATETIME' && (
                                <Input
                                  type="datetime-local"
                                  value={formData.fieldValues[template.fieldTemplate.name] || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    fieldValues: {
                                      ...formData.fieldValues,
                                      [template.fieldTemplate.name]: e.target.value
                                    }
                                  })}
                                  className="mt-2"
                                />
                              )}
                              {template.fieldTemplate.type === 'CHECKBOX' && (
                                <div className="flex items-center space-x-2 mt-2">
                                  <Checkbox
                                    checked={formData.fieldValues[template.fieldTemplate.name] === 'true'}
                                    onCheckedChange={(checked) => setFormData({
                                      ...formData,
                                      fieldValues: {
                                        ...formData.fieldValues,
                                        [template.fieldTemplate.name]: checked ? 'true' : 'false'
                                      }
                                    })}
                                  />
                                  <Label>{template.fieldTemplate.label}</Label>
                                </div>
                              )}
                              {/* MULTISELECT field type */}
                              {template.fieldTemplate.type === 'MULTISELECT' && (
                                <div className="mt-2 space-y-2">
                                  {template.fieldTemplate.options && Array.isArray(template.fieldTemplate.options) && 
                                    template.fieldTemplate.options.map((option: any, index: number) => {
                                      const optionValue = typeof option === 'object' ? (option.value || '') : option;
                                      const optionLabel = typeof option === 'object' ? (option.label || option.value || '') : option;
                                      const currentValues = formData.fieldValues[template.fieldTemplate.name] 
                                        ? formData.fieldValues[template.fieldTemplate.name].split(',') 
                                        : [];
                                      const isChecked = currentValues.includes(optionValue);
                                      
                                      return (
                                        <div key={`${template.fieldTemplate.name}-${optionValue}-${index}`} className="flex items-center space-x-2">
                                          <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              let newValues = [...currentValues];
                                              if (checked) {
                                                if (!newValues.includes(optionValue)) {
                                                  newValues.push(optionValue);
                                                }
                                              } else {
                                                newValues = newValues.filter(v => v !== optionValue);
                                              }
                                              setFormData({
                                                ...formData,
                                                fieldValues: {
                                                  ...formData.fieldValues,
                                                  [template.fieldTemplate.name]: newValues.filter(v => v).join(',')
                                                }
                                              });
                                            }}
                                          />
                                          <Label>{optionLabel}</Label>
                                        </div>
                                      );
                                    })
                                  }
                                </div>
                              )}
                              {/* FILE field type */}
                              {template.fieldTemplate.type === 'FILE' && (
                                <div className="mt-2">
                                  <Input
                                    type="file"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        // Store file name for now, actual upload would happen on submit
                                        setFormData({
                                          ...formData,
                                          fieldValues: {
                                            ...formData.fieldValues,
                                            [template.fieldTemplate.name]: file.name
                                          }
                                        });
                                      }
                                    }}
                                    className="mt-2"
                                    accept={template.fieldTemplate.validation || '*'}
                                  />
                                  {formData.fieldValues[template.fieldTemplate.name] && (
                                    <p className="text-sm text-gray-500 mt-1">
                                      Selected: {formData.fieldValues[template.fieldTemplate.name]}
                                    </p>
                                  )}
                                </div>
                              )}
                              {template.helpText && (
                                <p className="text-sm text-gray-500 mt-1">{template.helpText}</p>
                              )}
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Classification and 3-Tier Categorization - Collapsible */}
                  <Accordion type="multiple" className="space-y-4">
                    {/* Classification */}
                    <AccordionItem value="classification" className="border rounded-lg bg-white dark:bg-gray-800/50">
                      <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-emerald-600" />
                          <span className="text-base font-medium">Classification</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-4">
                          <LockedInput
                            type="select"
                            label="Priority Level"
                            value={formData.priority}
                            onChange={(value) => setFormData({ ...formData, priority: value })}
                            options={[
                              { value: 'LOW', label: 'Low - General inquiry' },
                              { value: 'MEDIUM', label: 'Medium - Standard request' },
                              { value: 'HIGH', label: 'High - Business impact' },
                              { value: 'CRITICAL', label: 'Critical - System down' }
                            ]}
                            isLocked={lockedFields.priority?.isLocked}
                            source={lockedFields.priority?.source}
                            canOverride={lockedFields.priority?.canOverride}
                            onUnlock={() => setLockedFields({ 
                              ...lockedFields, 
                              priority: { ...lockedFields.priority!, isLocked: false } 
                            })}
                          />

                          <LockedInput
                            type="select"
                            label="ITIL Category"
                            value={formData.category}
                            onChange={(value) => setFormData({ ...formData, category: value })}
                            options={[
                              { value: 'INCIDENT', label: 'Incident' },
                              { value: 'SERVICE_REQUEST', label: 'Service Request' },
                              { value: 'CHANGE_REQUEST', label: 'Change Request' },
                              { value: 'EVENT_REQUEST', label: 'Event Request' }
                            ]}
                            isLocked={lockedFields.category?.isLocked}
                            source={lockedFields.category?.source}
                            canOverride={lockedFields.category?.canOverride}
                            onUnlock={() => setLockedFields({ 
                              ...lockedFields, 
                              category: { ...lockedFields.category!, isLocked: false } 
                            })}
                          />

                          <LockedInput
                            type="select"
                            label="Issue Classification"
                            value={formData.issueClassification}
                            onChange={(value) => setFormData({ ...formData, issueClassification: value })}
                            placeholder="Select classification (optional)"
                            options={[
                              { value: 'HUMAN_ERROR', label: 'Human Error' },
                              { value: 'SYSTEM_ERROR', label: 'System Error' },
                              { value: 'HARDWARE_FAILURE', label: 'Hardware Failure' },
                              { value: 'NETWORK_ISSUE', label: 'Network Issue' },
                              { value: 'SECURITY_INCIDENT', label: 'Security Incident' },
                              { value: 'DATA_ISSUE', label: 'Data Issue' },
                              { value: 'PROCESS_GAP', label: 'Process Gap' },
                              { value: 'EXTERNAL_FACTOR', label: 'External Factor' }
                            ]}
                            isLocked={lockedFields.issueClassification?.isLocked}
                            source={lockedFields.issueClassification?.source}
                            canOverride={lockedFields.issueClassification?.canOverride}
                            onUnlock={() => setLockedFields({ 
                              ...lockedFields, 
                              issueClassification: { ...lockedFields.issueClassification!, isLocked: false } 
                            })}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* 3-Tier Categorization */}
                    <AccordionItem value="categorization" className="border rounded-lg bg-white dark:bg-gray-800/50">
                      <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          <span className="text-base font-medium">3-Tier Categorization</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-4">
                          <LockedInput
                            type="select"
                            label="Category"
                            value={formData.categoryId}
                            onChange={(value) => {
                              setFormData({ 
                                ...formData, 
                                categoryId: value,
                                subcategoryId: '',
                                itemId: ''
                              })
                              if (value) loadTierSubcategories(value)
                            }}
                            placeholder="Select category (optional)"
                            options={tierCategories.map(cat => ({ value: cat.id, label: cat.name }))}
                            isLocked={lockedFields.categoryId?.isLocked}
                            source={lockedFields.categoryId?.source}
                            canOverride={lockedFields.categoryId?.canOverride}
                            onUnlock={() => setLockedFields({ 
                              ...lockedFields, 
                              categoryId: { ...lockedFields.categoryId!, isLocked: false } 
                            })}
                          />

                          <LockedInput
                            type="select"
                            label="Subcategory"
                            value={formData.subcategoryId}
                            onChange={(value) => {
                              setFormData({
                                ...formData,
                                subcategoryId: value,
                                itemId: ''
                              })
                              if (value) loadTierItems(value)
                            }}
                            placeholder="Select subcategory (optional)"
                            options={tierSubcategories.map(sub => ({ value: sub.id, label: sub.name }))}
                            isLocked={lockedFields.subcategoryId?.isLocked}
                            source={lockedFields.subcategoryId?.source}
                            canOverride={lockedFields.subcategoryId?.canOverride}
                            onUnlock={() => setLockedFields({ 
                              ...lockedFields, 
                              subcategoryId: { ...lockedFields.subcategoryId!, isLocked: false } 
                            })}
                          />

                          <LockedInput
                            type="select"
                            label="Item"
                            value={formData.itemId}
                            onChange={(value) => setFormData({ ...formData, itemId: value })}
                            placeholder="Select item (optional)"
                            options={tierItems.map(item => ({ value: item.id, label: item.name }))}
                            isLocked={lockedFields.itemId?.isLocked}
                            source={lockedFields.itemId?.source}
                            canOverride={lockedFields.itemId?.canOverride}
                            onUnlock={() => setLockedFields({ 
                              ...lockedFields, 
                              itemId: { ...lockedFields.itemId!, isLocked: false } 
                            })}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* Attachments */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Attachments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar,.csv,.xml,.json"
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <Upload className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Click to upload files or drag and drop
                          </span>
                          <span className="text-xs text-gray-500">
                            Maximum file size: 10MB
                          </span>
                        </label>
                      </div>

                      {/* Attachment List */}
                      {attachments.length > 0 && (
                        <div className="space-y-2">
                          <Label>Selected Files ({attachments.length})</Label>
                          <div className="space-y-2">
                            {attachments.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                                      <Upload className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttachment(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Review & Submit
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Please review your ticket before submitting
                  </p>
                </div>

                <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Ticket Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Title</Label>
                      <p className="text-gray-900 dark:text-white">{formData.title}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Service</Label>
                      <p className="text-gray-900 dark:text-white">{selectedService?.name}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Priority</Label>
                      <Badge className="ml-2">{formData.priority}</Badge>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</Label>
                      <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        {formData.description}
                      </p>
                    </div>

                    {/* Custom Fields Preview */}
                    {selectedService && formData.fieldValues && Object.keys(formData.fieldValues).length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 block">Service Specific Information</Label>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md space-y-3">
                          {/* Service Fields */}
                          {selectedService.fields && selectedService.fields
                            .filter((field: any) => field.isUserVisible && formData.fieldValues[field.name])
                            .map((field: any) => (
                              <div key={field.id} className="flex justify-between items-start">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {field.label}:
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white max-w-xs text-right">
                                  {field.type === 'CHECKBOX' 
                                    ? (formData.fieldValues[field.name] === 'true' ? 'Yes' : 'No')
                                    : field.type === 'DATE' && formData.fieldValues[field.name]
                                    ? new Date(formData.fieldValues[field.name]).toLocaleDateString()
                                    : field.type === 'DATETIME' && formData.fieldValues[field.name]
                                    ? new Date(formData.fieldValues[field.name]).toLocaleString()
                                    : formData.fieldValues[field.name]
                                  }
                                </span>
                              </div>
                            ))}
                          
                          {/* Field Templates */}
                          {selectedService.fieldTemplates && selectedService.fieldTemplates
                            .filter((template: any) => template.isUserVisible && formData.fieldValues[template.fieldTemplate.name])
                            .map((template: any) => (
                              <div key={template.id} className="flex justify-between items-start">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {template.fieldTemplate.label}:
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white max-w-xs text-right">
                                  {template.fieldTemplate.type === 'CHECKBOX' 
                                    ? (formData.fieldValues[template.fieldTemplate.name] === 'true' ? 'Yes' : 'No')
                                    : template.fieldTemplate.type === 'DATE' && formData.fieldValues[template.fieldTemplate.name]
                                    ? new Date(formData.fieldValues[template.fieldTemplate.name]).toLocaleDateString()
                                    : template.fieldTemplate.type === 'DATETIME' && formData.fieldValues[template.fieldTemplate.name]
                                    ? new Date(formData.fieldValues[template.fieldTemplate.name]).toLocaleString()
                                    : formData.fieldValues[template.fieldTemplate.name]
                                  }
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Category Information */}
                    {(formData.categoryId || formData.subcategoryId || formData.itemId) && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 block">Categorization</Label>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md space-y-2">
                          {formData.categoryId && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category:</span>
                              <span className="text-sm text-gray-900 dark:text-white">
                                {tierCategories.find(cat => cat.id === formData.categoryId)?.name || 'Unknown'}
                              </span>
                            </div>
                          )}
                          {formData.subcategoryId && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subcategory:</span>
                              <span className="text-sm text-gray-900 dark:text-white">
                                {tierSubcategories.find(sub => sub.id === formData.subcategoryId)?.name || 'Unknown'}
                              </span>
                            </div>
                          )}
                          {formData.itemId && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Item:</span>
                              <span className="text-sm text-gray-900 dark:text-white">
                                {tierItems.find(item => item.id === formData.itemId)?.name || 'Unknown'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Attachments Preview */}
                    {attachments.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 block">Attachments ({attachments.length})</Label>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                          <div className="space-y-2">
                            {attachments.map((file, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-gray-900 dark:text-white">{file.name}</span>
                                <span className="text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm">SLA: {selectedService?.slaHours || selectedService?.estimatedHours}h</span>
                      </div>
                      {selectedService?.requiresApproval && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">Requires Approval</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              Step {currentStep} of {steps.length}
            </div>

            {/* Debug: currentStep={currentStep}, steps.length={steps.length}, show next={currentStep < steps.length} */}
            {currentStep < steps.length ? (
              <Button
                onClick={handleNextStep}
                disabled={
                  (currentStep === 1 && !selectedCategory) ||
                  (currentStep === 2 && !selectedService) ||
                  (currentStep === 3 && (!formData.title || !formData.description))
                }
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !areAllRequiredFieldsFilled()}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Create Ticket
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}