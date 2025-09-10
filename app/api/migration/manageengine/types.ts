// ManageEngine ServiceDesk Plus API Types

export interface ManageEngineConfig {
  baseUrl: string // e.g., "https://127.0.0.1:8081"
  apiKey: string
  technician: string // Technician username for API access
  skipSSLVerification?: boolean // For self-signed certificates
}

// ManageEngine Request (Ticket) structure
export interface ManageEngineRequest {
  id: string
  subject: string
  description?: string
  status: {
    name: string
    id: string
  }
  priority: {
    name: string
    id: string
  }
  requester: {
    name: string
    email?: string
    id: string
  }
  technician?: {
    name: string
    email?: string
    id: string
  }
  site?: {
    name: string
    id: string
  }
  category?: {
    name: string
    id: string
  }
  subcategory?: {
    name: string
    id: string
  }
  item?: {
    name: string
    id: string
  }
  created_time: {
    value: string // Timestamp
    display_value: string
  }
  due_by_time?: {
    value: string
    display_value: string
  }
  resolved_time?: {
    value: string
    display_value: string
  }
  closed_time?: {
    value: string
    display_value: string
  }
  resolution?: string
  udf_fields?: Record<string, any> // User-defined fields
  attachments?: ManageEngineAttachment[]
}

export interface ManageEngineAttachment {
  id: string
  name: string
  size: number
  content_type: string
  created_time: {
    value: string
    display_value: string
  }
}

export interface ManageEngineNote {
  id: string
  description: string
  created_by: {
    name: string
    email?: string
    id: string
  }
  created_time: {
    value: string
    display_value: string
  }
  is_public: boolean
}

// API Response structures
export interface ManageEngineListResponse<T> {
  requests?: T[]
  notes?: T[]
  attachments?: T[]
  response_status: Array<{
    status_code: number
    status: string
    messages?: Array<{
      message: string
      type: string
    }>
  }> | {
    status_code: number
    status: string
    messages?: Array<{
      message: string
      type: string
    }>
  }
  list_info?: {
    has_more_rows: boolean
    row_count: number
    start_index: number
  }
}

export interface ManageEngineSingleResponse<T> {
  request?: T
  note?: T
  attachment?: T
  response_status: Array<{
    status_code: number
    status: string
    messages?: Array<{
      message: string
      type: string
    }>
  }> | {
    status_code: number
    status: string
    messages?: Array<{
      message: string
      type: string
    }>
  }
}

// Field mapping configuration
export interface FieldMapping {
  sourceField: string
  targetField: string
  transformer?: (value: any) => any
}

export interface StatusMapping {
  [manageEngineStatus: string]: 'OPEN' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'
}

export interface PriorityMapping {
  [manageEnginePriority: string]: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY'
}

export interface MigrationConfig {
  batchSize: number
  delayBetweenBatches: number // milliseconds
  fieldMappings: FieldMapping[]
  statusMapping: StatusMapping
  priorityMapping: PriorityMapping
  downloadAttachments: boolean
  createPlaceholderUsers: boolean
  createPlaceholderBranches: boolean
  skipExisting: boolean // Skip if legacyTicketId already exists
}

export interface MigrationProgress {
  batchId: string
  currentBatch: number
  totalBatches: number
  processedCount: number
  totalCount: number
  errorCount: number
  errors: Array<{
    ticketId: string
    error: string
    timestamp: Date
  }>
}