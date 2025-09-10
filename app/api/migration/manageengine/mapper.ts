// Data mapper for ManageEngine to our system

import { 
  ManageEngineRequest, 
  ManageEngineNote,
  StatusMapping,
  PriorityMapping,
  MigrationConfig 
} from './types'
import { prisma } from '@/lib/prisma'
import { 
  TicketStatus, 
  TicketPriority,
  TicketCategory,
  Prisma
} from '@prisma/client'

// Default status mapping
const defaultStatusMapping: StatusMapping = {
  'Open': 'OPEN',
  'Pending': 'PENDING',
  'In Progress': 'IN_PROGRESS',
  'On Hold': 'PENDING',
  'Resolved': 'RESOLVED',
  'Closed': 'CLOSED',
  'Cancelled': 'CANCELLED',
  // Additional common statuses
  'New': 'OPEN',
  'Assigned': 'OPEN',
  'Waiting for Customer': 'PENDING',
  'Waiting for Third Party': 'PENDING_VENDOR',
  'Completed': 'RESOLVED'
}

// Default priority mapping
const defaultPriorityMapping: PriorityMapping = {
  'Low': 'LOW',
  'Normal': 'MEDIUM',
  'Medium': 'MEDIUM',
  'High': 'HIGH',
  'Urgent': 'CRITICAL',
  'Critical': 'EMERGENCY',
  // Additional variations
  '1': 'LOW',
  '2': 'MEDIUM',
  '3': 'HIGH',
  '4': 'CRITICAL',
  '5': 'EMERGENCY'
}

export class DataMapper {
  private config: MigrationConfig
  private userCache: Map<string, string> = new Map() // ManageEngine ID -> Our User ID
  private branchCache: Map<string, string> = new Map() // Site name -> Branch ID
  private serviceCache: Map<string, string> = new Map() // Category key -> Service ID
  private defaultUserId?: string
  private defaultBranchId?: string
  private defaultServiceId?: string

  constructor(config?: Partial<MigrationConfig>) {
    this.config = {
      batchSize: 100,
      delayBetweenBatches: 1000,
      fieldMappings: [],
      statusMapping: defaultStatusMapping,
      priorityMapping: defaultPriorityMapping,
      downloadAttachments: true,
      createPlaceholderUsers: true,
      createPlaceholderBranches: true,
      skipExisting: true,
      ...config
    }
  }

  // Initialize mapper with default entities
  async initialize() {
    // Get or create default user for unmapped requesters
    const defaultUser = await prisma.user.findFirst({
      where: { username: 'legacy_system' }
    })
    
    if (defaultUser) {
      this.defaultUserId = defaultUser.id
    } else if (this.config.createPlaceholderUsers) {
      const created = await prisma.user.create({
        data: {
          username: 'legacy_system',
          email: 'legacy@system.local',
          name: 'Legacy System User',
          role: 'USER',
          isActive: false,
          password: null,
          mustChangePassword: false
        }
      })
      this.defaultUserId = created.id
    }

    // Get or create default branch
    const defaultBranch = await prisma.branch.findFirst({
      where: { code: 'LEGACY' }
    })
    
    if (defaultBranch) {
      this.defaultBranchId = defaultBranch.id
    } else if (this.config.createPlaceholderBranches) {
      const created = await prisma.branch.create({
        data: {
          code: 'LEGACY',
          name: 'Legacy Branch',
          address: 'Imported from ManageEngine',
          isActive: false
        }
      })
      this.defaultBranchId = created.id
    }

    // Get or create default service
    const defaultService = await prisma.service.findFirst({
      where: { name: 'Legacy Ticket' }
    })
    
    if (defaultService) {
      this.defaultServiceId = defaultService.id
    } else {
      // First, ensure we have a category
      let category = await prisma.serviceCategory.findFirst({
        where: { name: 'GENERAL' }
      })
      
      if (!category) {
        category = await prisma.serviceCategory.create({
          data: {
            name: 'GENERAL',
            description: 'General category',
            isActive: true
          }
        })
      }
      
      const created = await prisma.service.create({
        data: {
          name: 'Legacy Ticket',
          description: 'Imported from ManageEngine ServiceDesk Plus',
          categoryId: category.id,
          isActive: false,
          requiresApproval: false
        }
      })
      this.defaultServiceId = created.id
    }
  }

  // Map ManageEngine status to our status
  private mapStatus(meStatus: string): TicketStatus {
    const mapped = this.config.statusMapping[meStatus]
    if (mapped) return mapped
    
    // Try case-insensitive match
    const lowercaseStatus = meStatus.toLowerCase()
    for (const [key, value] of Object.entries(this.config.statusMapping)) {
      if (key.toLowerCase() === lowercaseStatus) {
        return value
      }
    }
    
    // Default to OPEN if no mapping found
    return 'OPEN'
  }

  // Map ManageEngine priority to our priority
  private mapPriority(mePriority: string): TicketPriority {
    const mapped = this.config.priorityMapping[mePriority]
    if (mapped) return mapped
    
    // Try case-insensitive match
    const lowercasePriority = mePriority.toLowerCase()
    for (const [key, value] of Object.entries(this.config.priorityMapping)) {
      if (key.toLowerCase() === lowercasePriority) {
        return value
      }
    }
    
    // Default to MEDIUM if no mapping found
    return 'MEDIUM'
  }

  // Get or create user based on ManageEngine requester/technician
  private async getOrCreateUser(meUser: { id: string; name: string; email?: string }): Promise<string> {
    // Check cache first
    if (this.userCache.has(meUser.id)) {
      return this.userCache.get(meUser.id)!
    }

    // Try to find by email
    if (meUser.email) {
      const existing = await prisma.user.findUnique({
        where: { email: meUser.email }
      })
      
      if (existing) {
        this.userCache.set(meUser.id, existing.id)
        return existing.id
      }
    }

    // Try to find by name (username)
    const username = meUser.email?.split('@')[0] || meUser.name.toLowerCase().replace(/\s+/g, '.')
    const existing = await prisma.user.findUnique({
      where: { username }
    })
    
    if (existing) {
      this.userCache.set(meUser.id, existing.id)
      return existing.id
    }

    // Create placeholder user if configured
    if (this.config.createPlaceholderUsers) {
      try {
        const created = await prisma.user.create({
          data: {
            username: `me_${meUser.id}`,
            email: meUser.email || `me_${meUser.id}@legacy.local`,
            name: meUser.name,
            role: 'USER',
            isActive: false,
            password: null,
            mustChangePassword: false
          }
        })
        this.userCache.set(meUser.id, created.id)
        return created.id
      } catch (error) {
        console.error('Failed to create placeholder user:', error)
      }
    }

    // Return default user ID
    return this.defaultUserId!
  }

  // Get or create branch based on ManageEngine site
  private async getOrCreateBranch(meSite?: { id: string; name: string }): Promise<string | null> {
    if (!meSite) return this.defaultBranchId || null

    // Check cache first
    if (this.branchCache.has(meSite.name)) {
      return this.branchCache.get(meSite.name)!
    }

    // Try to find by name
    const existing = await prisma.branch.findFirst({
      where: { 
        OR: [
          { name: meSite.name },
          { code: meSite.name.toUpperCase().substring(0, 10) }
        ]
      }
    })
    
    if (existing) {
      this.branchCache.set(meSite.name, existing.id)
      return existing.id
    }

    // Create placeholder branch if configured
    if (this.config.createPlaceholderBranches) {
      try {
        const code = `ME_${meSite.id}`.substring(0, 10)
        const created = await prisma.branch.create({
          data: {
            code,
            name: meSite.name,
            address: 'Imported from ManageEngine',
            isActive: false
          }
        })
        this.branchCache.set(meSite.name, created.id)
        return created.id
      } catch (error) {
        console.error('Failed to create placeholder branch:', error)
      }
    }

    return this.defaultBranchId || null
  }

  // Get or create service based on ManageEngine category
  private async getOrCreateService(
    category?: { id: string; name: string },
    subcategory?: { id: string; name: string },
    item?: { id: string; name: string }
  ): Promise<string> {
    // Create a key for caching
    const cacheKey = `${category?.name || 'default'}_${subcategory?.name || ''}_${item?.name || ''}`
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey)!
    }

    // Try to find existing service
    if (category) {
      const existing = await prisma.service.findFirst({
        where: { 
          name: {
            contains: category.name,
            mode: 'insensitive'
          }
        }
      })
      
      if (existing) {
        this.serviceCache.set(cacheKey, existing.id)
        return existing.id
      }

      // Create new service based on category
      try {
        // Get or create service category
        let serviceCategory = await prisma.serviceCategory.findFirst({
          where: { name: category.name.toUpperCase().replace(/\s+/g, '_') }
        })
        
        if (!serviceCategory) {
          serviceCategory = await prisma.serviceCategory.create({
            data: {
              name: category.name.toUpperCase().replace(/\s+/g, '_'),
              description: `Imported from ManageEngine: ${category.name}`,
              isActive: false
            }
          })
        }

        const serviceName = item?.name || subcategory?.name || category.name
        const created = await prisma.service.create({
          data: {
            name: `[Legacy] ${serviceName}`,
            description: `Category: ${category.name}${subcategory ? `, Subcategory: ${subcategory.name}` : ''}${item ? `, Item: ${item.name}` : ''}`,
            categoryId: serviceCategory.id,
            isActive: false,
            requiresApproval: false
          }
        })
        
        this.serviceCache.set(cacheKey, created.id)
        return created.id
      } catch (error) {
        console.error('Failed to create service:', error)
      }
    }

    return this.defaultServiceId!
  }

  // Convert ManageEngine request to our ticket format
  async mapRequestToTicket(
    meRequest: ManageEngineRequest,
    batchId: string
  ): Promise<Prisma.TicketCreateInput> {
    // Check if already imported
    if (this.config.skipExisting) {
      const existing = await prisma.ticket.findFirst({
        where: {
          legacySystem: 'MANAGEENGINE',
          legacyTicketId: meRequest.id
        }
      })
      
      if (existing) {
        throw new Error(`Ticket ${meRequest.id} already imported`)
      }
    }

    // Map users
    const createdById = await this.getOrCreateUser(meRequest.requester)
    const assignedToId = meRequest.technician 
      ? await this.getOrCreateUser(meRequest.technician)
      : undefined

    // Map branch
    const branchId = await this.getOrCreateBranch(meRequest.site)

    // Map service
    const serviceId = await this.getOrCreateService(
      meRequest.category,
      meRequest.subcategory,
      meRequest.item
    )

    // Parse timestamps
    const createdAt = new Date(parseInt(meRequest.created_time.value))
    const resolvedAt = meRequest.resolved_time 
      ? new Date(parseInt(meRequest.resolved_time.value))
      : undefined
    const closedAt = meRequest.closed_time
      ? new Date(parseInt(meRequest.closed_time.value))
      : undefined

    // Build legacy data object with all original fields
    const legacyData = {
      originalId: meRequest.id,
      subject: meRequest.subject,
      description: meRequest.description,
      status: meRequest.status,
      priority: meRequest.priority,
      requester: meRequest.requester,
      technician: meRequest.technician,
      site: meRequest.site,
      category: meRequest.category,
      subcategory: meRequest.subcategory,
      item: meRequest.item,
      resolution: meRequest.resolution,
      udf_fields: meRequest.udf_fields,
      created_time: meRequest.created_time,
      due_by_time: meRequest.due_by_time,
      resolved_time: meRequest.resolved_time,
      closed_time: meRequest.closed_time
    }

    return {
      title: meRequest.subject,
      description: meRequest.description || 'No description provided',
      status: this.mapStatus(meRequest.status.name),
      priority: this.mapPriority(meRequest.priority.name),
      category: 'INCIDENT', // Default category
      resolutionNotes: meRequest.resolution,
      createdAt,
      resolvedAt,
      closedAt,
      
      // Legacy fields
      isLegacy: true,
      legacySystem: 'MANAGEENGINE',
      legacyTicketId: meRequest.id,
      legacyData: legacyData as any,
      importedAt: new Date(),
      importBatchId: batchId,
      
      // Relations
      service: { connect: { id: serviceId } },
      createdBy: { connect: { id: createdById } },
      assignedTo: assignedToId ? { connect: { id: assignedToId } } : undefined,
      branch: branchId ? { connect: { id: branchId } } : undefined
    }
  }

  // Map ManageEngine notes to our comments
  async mapNoteToComment(
    meNote: ManageEngineNote,
    ticketId: string
  ): Promise<Prisma.TicketCommentCreateInput> {
    const userId = await this.getOrCreateUser(meNote.created_by)
    const createdAt = new Date(parseInt(meNote.created_time.value))

    return {
      content: meNote.description,
      isInternal: !meNote.is_public,
      createdAt,
      ticket: { connect: { id: ticketId } },
      user: { connect: { id: userId } }
    }
  }
}