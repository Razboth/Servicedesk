// ManageEngine ServiceDesk Plus API Client

import https from 'https'
import { 
  ManageEngineConfig, 
  ManageEngineRequest, 
  ManageEngineNote,
  ManageEngineAttachment,
  ManageEngineListResponse,
  ManageEngineSingleResponse 
} from './types'

export class ManageEngineClient {
  private config: ManageEngineConfig
  private httpsAgent: https.Agent

  constructor(config: ManageEngineConfig) {
    this.config = config
    
    // Create HTTPS agent that allows self-signed certificates
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: !config.skipSSLVerification
    })
  }

  // Build API URL with authentication
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.config.baseUrl}/api/v3/${endpoint}`)
    
    // Add authentication
    url.searchParams.append('TECHNICIAN_KEY', this.config.apiKey)
    
    // Add any additional parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }
    
    return url.toString()
  }

  // Make API request
  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    params?: Record<string, string>,
    body?: any
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params)
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    // For self-signed certificates in Node.js environment
    if (typeof window === 'undefined' && this.config.skipSSLVerification) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    try {
      const response = await fetch(url, options)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`ManageEngine API error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      
      // Check for API-level errors
      // ManageEngine returns response_status as an array
      const statusObj = Array.isArray(data.response_status) 
        ? data.response_status[0] 
        : data.response_status
        
      if (statusObj && statusObj.status_code !== 2000) {
        const errorMsg = statusObj.messages?.[0]?.message || 'Unknown API error'
        throw new Error(`ManageEngine API error: ${errorMsg}`)
      }
      
      return data
    } catch (error) {
      console.error('ManageEngine API request failed:', error)
      throw error
    } finally {
      // Reset the environment variable
      if (typeof window === 'undefined' && this.config.skipSSLVerification) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      }
    }
  }

  // Test connection to ManageEngine
  async testConnection(): Promise<boolean> {
    try {
      console.log(`Testing connection to ${this.config.baseUrl}...`)
      
      // Try to fetch a small number of requests to test the connection
      const response = await this.makeRequest<ManageEngineListResponse<ManageEngineRequest>>(
        'requests',
        'GET',
        { 
          input_data: JSON.stringify({
            list_info: {
              row_count: 1,
              start_index: 1
            }
          })
        }
      )
      
      console.log('Connection test response:', response.response_status)
      // ManageEngine returns response_status as an array
      const statusObj = Array.isArray(response.response_status) 
        ? response.response_status[0] 
        : response.response_status
      return statusObj?.status_code === 2000
    } catch (error: any) {
      console.error('Connection test failed:', {
        message: error.message,
        baseUrl: this.config.baseUrl,
        apiKeyProvided: !!this.config.apiKey
      })
      return false
    }
  }

  // Get list of requests (tickets)
  async getRequests(
    startIndex: number = 1, 
    rowCount: number = 100,
    filters?: any
  ): Promise<ManageEngineListResponse<ManageEngineRequest>> {
    const inputData: any = {
      list_info: {
        row_count: rowCount,
        start_index: startIndex,
        sort_field: 'created_time',
        sort_order: 'desc'
      }
    }
    
    if (filters) {
      inputData.search_fields = filters
    }
    
    return await this.makeRequest<ManageEngineListResponse<ManageEngineRequest>>(
      'requests',
      'GET',
      { 
        input_data: JSON.stringify(inputData)
      }
    )
  }

  // Get single request details
  async getRequest(requestId: string): Promise<ManageEngineSingleResponse<ManageEngineRequest>> {
    return await this.makeRequest<ManageEngineSingleResponse<ManageEngineRequest>>(
      `requests/${requestId}`,
      'GET'
    )
  }

  // Get request notes (comments)
  async getRequestNotes(
    requestId: string,
    startIndex: number = 1,
    rowCount: number = 100
  ): Promise<ManageEngineListResponse<ManageEngineNote>> {
    const inputData = {
      list_info: {
        row_count: rowCount,
        start_index: startIndex,
        sort_field: 'created_time',
        sort_order: 'asc'
      }
    }
    
    return await this.makeRequest<ManageEngineListResponse<ManageEngineNote>>(
      `requests/${requestId}/notes`,
      'GET',
      { 
        input_data: JSON.stringify(inputData)
      }
    )
  }

  // Get request attachments
  async getRequestAttachments(
    requestId: string
  ): Promise<ManageEngineListResponse<ManageEngineAttachment>> {
    return await this.makeRequest<ManageEngineListResponse<ManageEngineAttachment>>(
      `requests/${requestId}/attachments`,
      'GET'
    )
  }

  // Download attachment
  async downloadAttachment(
    requestId: string, 
    attachmentId: string
  ): Promise<Buffer> {
    const url = this.buildUrl(`requests/${requestId}/attachments/${attachmentId}/download`)
    
    const options: RequestInit = {
      method: 'GET',
      headers: {
        'Accept': 'application/octet-stream'
      }
    }

    if (typeof window === 'undefined' && this.config.skipSSLVerification) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    try {
      const response = await fetch(url, options)
      
      if (!response.ok) {
        throw new Error(`Failed to download attachment: ${response.status}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } finally {
      if (typeof window === 'undefined' && this.config.skipSSLVerification) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      }
    }
  }

  // Get total count of requests
  async getTotalRequestCount(filters?: any): Promise<number> {
    const response = await this.getRequests(1, 1, filters)
    return response.list_info?.row_count || 0
  }

  // Fetch all requests in batches
  async *fetchAllRequests(
    batchSize: number = 100,
    filters?: any
  ): AsyncGenerator<ManageEngineRequest[], void, unknown> {
    let startIndex = 1
    let hasMore = true
    
    while (hasMore) {
      const response = await this.getRequests(startIndex, batchSize, filters)
      
      if (response.requests && response.requests.length > 0) {
        yield response.requests
      }
      
      hasMore = response.list_info?.has_more_rows || false
      startIndex += batchSize
      
      // Add a small delay between batches to avoid overwhelming the API
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }
}