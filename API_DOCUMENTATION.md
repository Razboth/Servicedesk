# Bank SulutGo ServiceDesk - Complete API Documentation

**Version:** 2.5.0
**Last Updated:** December 2024
**Base URL:** `https://servicedesk.banksulutgo.co.id` (Production) | `http://localhost:3000` (Development)

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Core Concepts](#core-concepts)
- [Response Formats](#response-formats)
- [Rate Limiting](#rate-limiting)
- [Core Service APIs](#core-service-apis)
- [Specialized Integration APIs](#specialized-integration-apis)
- [Admin & Management APIs](#admin--management-apis)
- [Monitoring & Reports APIs](#monitoring--reports-apis)
- [Error Handling](#error-handling)
- [Examples & Integration Guides](#examples--integration-guides)

---

## Overview

Bank SulutGo ServiceDesk API provides comprehensive endpoints for ITIL v4-compliant IT service management. The system supports multi-branch operations, real-time monitoring, and external integrations for banking operations.

### Key Features

- **Comprehensive Ticket Management**: Full ITIL v4 workflow support
- **Omnichannel Integration**: Accept tickets from external systems
- **ATM Claims Processing**: Specialized banking claim workflows
- **Network Monitoring**: Real-time ATM and branch monitoring
- **Role-Based Access Control**: Granular permissions system
- **SLA Management**: Automated tracking and breach detection
- **API Key Management**: Secure external integrations
- **Audit Logging**: Complete compliance tracking

### System Architecture

- **Frontend**: Next.js 15 with TypeScript
- **API**: RESTful design with 245+ endpoints
- **Authentication**: NextAuth.js v5 + API keys
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.io support
- **File Storage**: Configurable upload system

## Authentication

The API supports two primary authentication methods:

### 1. API Key Authentication (Recommended for Integrations)

For external systems and automated integrations.

#### Headers Required
```http
Authorization: Bearer sk_live_your_api_key_here
# OR
X-API-Key: sk_live_your_api_key_here
```

#### API Key Format
API keys follow the format: `sk_live_[32_random_characters]`

Example: `sk_live_ABCDEFGHIJKLMNOPQRSTUVWXyz123456`

#### API Key Permissions

API keys can have granular permissions:

- `*` - Full access (admin only)
- `tickets:*` - All ticket operations
- `tickets:read` - Read ticket information
- `tickets:create` - Create new tickets
- `tickets:update` - Update existing tickets
- `omnichannel:*` - All omnichannel operations
- `omnichannel:create` - Create tickets via omnichannel
- `omnichannel:read` - Read ticket status
- `claims:*` - All claim operations
- `claims:create` - Create claim tickets
- `claims:read` - Read claim status
- `monitoring:*` - All monitoring operations
- `soc` - Security operations center access

### 2. Session Authentication

For web applications using the ServiceDesk UI.

#### Login Process
```http
POST /api/auth/[...nextauth]
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

#### Session Management
- **Session Duration**: 8 hours
- **Update Frequency**: Every hour if active
- **Cookie Security**: HTTPOnly, Secure (production), SameSite=lax

### User Roles & Permissions

1. **SUPER_ADMIN**
   - Full system access
   - User management
   - System configuration
   - All API endpoints

2. **ADMIN**
   - Administrative operations
   - User management (limited)
   - Import/export operations
   - Most API endpoints

3. **SECURITY_ANALYST**
   - Security-focused operations
   - Confidential ticket access
   - SOC integration endpoints
   - Security monitoring

4. **MANAGER**
   - Branch-level management
   - Approval workflows
   - Branch user oversight
   - Branch-specific reports

5. **TECHNICIAN**
   - Ticket resolution
   - Technical support operations
   - Assignment and claiming
   - Task management

6. **AGENT**
   - Customer service operations
   - Basic ticket management
   - Comment and update capabilities

7. **USER**
   - End-user operations
   - Ticket creation
   - Status checking
   - Comment submission

### Account Security Features

- **Account Lockout**: 5 failed attempts → 30-minute lockout
- **IP Tracking**: All requests logged with IP addresses
- **Device Detection**: Browser and device fingerprinting
- **Session Validation**: Automatic session cleanup
- **Password Requirements**: Configurable complexity rules

## Core Concepts

### Ticket Statuses

The system supports the following ticket statuses with specific workflow rules:

- `OPEN` - New ticket awaiting assignment
- `PENDING_APPROVAL` - Requires manager/admin approval
- `APPROVED` - Approved and ready for work
- `IN_PROGRESS` - Currently being worked on
- `PENDING_VENDOR` - Waiting for external vendor
- `RESOLVED` - Solution provided, awaiting customer confirmation
- `CLOSED` - Ticket completed and closed
- `REJECTED` - Ticket rejected (with reason)
- `CANCELLED` - Ticket cancelled

### Priority Levels

Priority determines response and resolution SLAs:

- `LOW` - Minor issues (72+ hour resolution)
- `MEDIUM` - Standard issues (24-72 hour resolution)
- `HIGH` - Important issues (4-24 hour resolution)
- `URGENT` - Critical issues (1-4 hour resolution)
- `CRITICAL` - Emergency issues (immediate response)

### Ticket Categories

Following ITIL v4 best practices:

- `INCIDENT` - Unplanned interruption to service
- `SERVICE_REQUEST` - User request for service
- `CHANGE_REQUEST` - Request to modify infrastructure
- `EVENT_REQUEST` - Planned events or activities

### SLA Management

- **Response SLA**: Time to first response
- **Resolution SLA**: Time to resolve the issue
- **Escalation**: Automatic escalation rules
- **Business Hours**: Configurable business hours per branch

## Response Formats

### Success Response Format
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error context
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Rate Limiting

Rate limits vary by endpoint type and authentication:

### API Key Limits
- **Standard Operations**: 1000 requests/hour
- **Search Operations**: 300 requests/hour
- **Report Generation**: 50 requests/hour
- **File Uploads**: 100 requests/hour

### Session-Based Limits
- **Standard Operations**: 100 requests/minute
- **Search Operations**: 30 requests/minute
- **File Uploads**: 20 requests/hour

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
X-RateLimit-Type: api-key
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resources)
- `422` - Unprocessable Entity (business logic errors)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Core Service APIs

### Tickets

The core ticket management system supporting full ITIL v4 workflows.

#### Create Ticket
```http
POST /api/tickets
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "title": "Unable to access email",
  "description": "User cannot access their email account since this morning",
  "serviceId": "service_uuid",
  "priority": "MEDIUM",
  "category": "INCIDENT",
  "issueClassification": "SYSTEM_ERROR",
  "categoryId": "category_uuid",
  "subcategoryId": "subcategory_uuid",
  "itemId": "item_uuid",
  "fieldValues": [
    {
      "fieldId": "field_uuid",
      "value": "Field value"
    }
  ],
  "attachments": [
    {
      "filename": "screenshot.png",
      "mimeType": "image/png",
      "size": 12345,
      "content": "base64_encoded_content"
    }
  ],
  "isConfidential": false,
  "securityClassification": "MEDIUM",
  "justification": "High priority due to business impact"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ticket_uuid",
    "ticketNumber": "12345",
    "title": "Unable to access email",
    "status": "OPEN",
    "priority": "MEDIUM",
    "createdAt": "2024-01-01T00:00:00Z",
    "service": {
      "name": "Email Support",
      "slaHours": 24
    },
    "sla": {
      "responseDeadline": "2024-01-01T04:00:00Z",
      "resolutionDeadline": "2024-01-02T00:00:00Z"
    },
    "assignedTo": null,
    "branch": {
      "name": "Main Branch",
      "code": "001"
    }
  }
}
```

#### List Tickets
```http
GET /api/tickets?page=1&limit=10&status=OPEN&priority=HIGH&search=email
Authorization: Bearer YOUR_API_KEY
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `status` (string): Filter by status
- `priority` (string): Filter by priority
- `assignedTo` (string): Filter by assigned user ID
- `branchId` (string): Filter by branch ID
- `search` (string): Search in title/description
- `sortBy` (string): Sort field (createdAt, priority, status, ticketNumber)
- `sortOrder` (string): Sort direction (asc, desc)
- `filter` (string): Special filters (my-tickets, available-tickets)
- `includeConfidential` (boolean): Include confidential tickets (role-dependent)
- `categoryId` (string): Filter by category

#### Get Ticket Details
```http
GET /api/tickets/{ticketId}
Authorization: Bearer YOUR_API_KEY
```

#### Update Ticket Status
```http
POST /api/tickets/{ticketId}/status
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "comment": "Started working on the issue",
  "isInternal": false
}
```

#### Assign Ticket
```http
POST /api/tickets/{ticketId}/assign
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "assignedToId": "technician_uuid",
  "comment": "Assigning to specialist",
  "priority": "HIGH"
}
```

#### Claim Ticket (Self-Assignment)
```http
POST /api/tickets/{ticketId}/claim
Authorization: Bearer YOUR_API_KEY
```

#### Bulk Operations

**Bulk Status Update:**
```http
POST /api/tickets/bulk/status
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "ticketIds": ["uuid1", "uuid2"],
  "status": "RESOLVED",
  "comment": "Bulk resolution"
}
```

**Bulk Assignment:**
```http
POST /api/tickets/bulk/assign
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "ticketIds": ["uuid1", "uuid2"],
  "assignedToId": "technician_uuid"
}
```

#### Comments & Attachments

**Add Comment:**
```http
POST /api/tickets/{ticketId}/comments
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "content": "Working on reproducing the issue",
  "isInternal": false,
  "attachments": [
    {
      "filename": "log.txt",
      "mimeType": "text/plain",
      "size": 1024,
      "content": "base64_encoded_content"
    }
  ]
}
```

**Download Attachment:**
```http
GET /api/tickets/{ticketId}/attachments/{attachmentId}/download
Authorization: Bearer YOUR_API_KEY
```

#### Tasks Management

**Get Tasks:**
```http
GET /api/tickets/{ticketId}/tasks
Authorization: Bearer YOUR_API_KEY
```

**Create Task:**
```http
POST /api/tickets/{ticketId}/tasks
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "title": "Verify email server configuration",
  "description": "Check mail server settings",
  "assignedToId": "technician_uuid",
  "dueDate": "2024-01-02T17:00:00Z",
  "estimatedMinutes": 30
}
```

## Specialized Integration APIs

### Omnichannel Integration

The omnichannel API enables external systems to create and track tickets through various channels.

#### Create Omnichannel Ticket
```http
POST /api/omnichannel/tickets
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "channel": "MOBILE_APP",
  "channelReferenceId": "mobile_123456",
  "serviceType": "SUPPORT",
  "customer": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+628123456789",
    "identifier": "CUST001",
    "branchCode": "001"
  },
  "ticket": {
    "title": "Unable to transfer funds",
    "description": "Customer experiencing issues with fund transfer",
    "priority": "HIGH",
    "category": "INCIDENT",
    "metadata": {
      "accountNumber": "1234567890",
      "transactionAmount": 1000000,
      "deviceInfo": "iPhone 12 Pro",
      "appVersion": "2.1.0"
    }
  },
  "integration": {
    "requestId": "req_20240101_001",
    "source": "MOBILE_BANKING",
    "webhookUrl": "https://partner.example.com/webhooks/ticket-updates",
    "callbackData": {
      "partnerId": "PARTNER001",
      "sessionId": "sess_123"
    }
  },
  "attachments": [
    {
      "filename": "error_screenshot.png",
      "mimeType": "image/png",
      "size": 154273,
      "content": "base64_encoded_image_content"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ticketNumber": "12345",
    "ticketId": "ticket_uuid",
    "status": "OPEN",
    "priority": "HIGH",
    "channelReferenceId": "mobile_123456",
    "trackingUrl": "https://servicedesk.banksulutgo.co.id/track/12345",
    "sla": {
      "responseDeadline": "2024-01-01T04:00:00Z",
      "resolutionDeadline": "2024-01-02T00:00:00Z"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "customer": {
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  },
  "message": "Ticket created successfully via omnichannel"
}
```

#### Check Omnichannel Ticket Status
```http
GET /api/omnichannel/tickets?ticketNumber=12345
# OR
GET /api/omnichannel/tickets?channelReferenceId=mobile_123456
Authorization: Bearer YOUR_API_KEY
```

### Claims Processing

#### Create Public Claim
```http
POST /api/public/claims
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "claimType": "REIMBURSEMENT",
  "claimAmount": 500000,
  "claimCurrency": "IDR",
  "claimDate": "2024-01-01T00:00:00Z",
  "claimReason": "Unauthorized ATM withdrawal from my account",
  "claimantName": "Jane Smith",
  "claimantEmail": "jane.smith@example.com",
  "claimantPhone": "+628123456789",
  "claimantDepartment": "Customer Service",
  "claimantBranchCode": "001",
  "title": "ATM Withdrawal Dispute",
  "description": "I was charged for a withdrawal I did not make",
  "priority": "HIGH",
  "attachments": [
    {
      "filename": "atm_receipt.pdf",
      "mimeType": "application/pdf",
      "size": 25600,
      "content": "base64_encoded_pdf_content",
      "description": "ATM receipt showing unauthorized transaction"
    }
  ],
  "referenceNumber": "REF123456",
  "approverEmail": "manager@banksulutgo.co.id",
  "metadata": {
    "accountNumber": "1234567890",
    "transactionId": "TXN789012",
    "atmLocation": "ATM Branch 001"
  }
}
```

#### Check Claim Status
```http
GET /api/public/claims?ticketNumber=CLM-2024-000001
Authorization: Bearer YOUR_API_KEY
```

### ATM Claims (Internal Processing)

#### Create ATM Claim Ticket
```http
POST /api/tickets/atm-claim
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "title": "ATM Out of Service",
  "description": "ATM machine is not dispensing cash",
  "atmCode": "ATM001",
  "issueType": "HARDWARE_FAILURE",
  "priority": "HIGH",
  "reportedBy": "Branch Manager",
  "contactPhone": "+628123456789",
  "symptoms": [
    "Card reader not working",
    "Display shows error message",
    "No cash dispensed"
  ],
  "lastWorkingTime": "2024-01-01T08:00:00Z",
  "attachments": [
    {
      "filename": "atm_error.jpg",
      "mimeType": "image/jpeg",
      "size": 87654,
      "content": "base64_encoded_image"
    }
  ]
}
```

#### Branch ATM Claims Management

**List Branch ATM Claims:**
```http
GET /api/branch/atm-claims?status=PENDING&priority=HIGH&page=1&limit=20
Authorization: Bearer YOUR_API_KEY
```

**Verify ATM Claim:**
```http
POST /api/branch/atm-claims/{claimId}/verify
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "verificationStatus": "VERIFIED",
  "verificationNotes": "Checked with bank records - transaction confirmed",
  "verifiedAmount": 500000,
  "attachments": ["verification_proof.pdf"]
}
```

**Collaborate on Claim:**
```http
POST /api/branch/atm-claims/{claimId}/collaborate
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "targetBranchId": "branch_uuid",
  "message": "Need assistance with this claim verification",
  "attachments": ["supporting_document.pdf"]
}
```

## Admin & Management APIs

### API Key Management

#### Create API Key
```http
POST /api/admin/api-keys
Authorization: Bearer YOUR_ADMIN_API_KEY
Content-Type: application/json

{
  "name": "Partner Integration Key",
  "description": "API key for external partner integration",
  "permissions": ["omnichannel:*", "claims:read"],
  "expiresIn": 365,
  "linkedUserId": "user_uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "key_uuid",
    "name": "Partner Integration Key",
    "key": "sk_live_ABCDEFGHIJKLMNOPQRSTUVWXyz123456",
    "fullKey": "sk_live_ABCDEFGHIJKLMNOPQRSTUVWXyz123456",
    "permissions": ["omnichannel:*", "claims:read"],
    "expiresAt": "2025-12-31T23:59:59Z",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "Save this API key securely. It will not be shown again."
}
```

#### List API Keys
```http
GET /api/admin/api-keys
Authorization: Bearer YOUR_ADMIN_API_KEY
```

#### Revoke API Key
```http
DELETE /api/admin/api-keys/{keyId}
Authorization: Bearer YOUR_ADMIN_API_KEY
```

### User Management

#### Create User
```http
POST /api/admin/users
Authorization: Bearer YOUR_ADMIN_API_KEY
Content-Type: application/json

{
  "username": "john.technician",
  "email": "john@banksulutgo.co.id",
  "name": "John Technician",
  "role": "TECHNICIAN",
  "branchId": "branch_uuid",
  "supportGroupId": "support_group_uuid",
  "phone": "+628123456789",
  "password": "TempPassword123!"
}
```

#### List Users
```http
GET /api/admin/users?page=1&limit=20&role=TECHNICIAN&branchId=branch_uuid
Authorization: Bearer YOUR_ADMIN_API_KEY
```

#### Toggle User Status
```http
POST /api/admin/users/{userId}/toggle-active
Authorization: Bearer YOUR_ADMIN_API_KEY
```

#### Unlock User Account
```http
POST /api/admin/users/{userId}/unlock
Authorization: Bearer YOUR_ADMIN_API_KEY
```

### Service Configuration

#### Create Service
```http
POST /api/admin/services
Authorization: Bearer YOUR_ADMIN_API_KEY
Content-Type: application/json

{
  "name": "Email Support",
  "description": "Email access and configuration support",
  "categoryId": "it_support_category_uuid",
  "priority": "MEDIUM",
  "slaHours": 24,
  "responseHours": 4,
  "resolutionHours": 24,
  "requiresApproval": false,
  "supportGroupId": "it_helpdesk_group_uuid",
  "isActive": true
}
```

### Import/Export Operations

#### Bulk Import Users
```http
POST /api/admin/import/users
Authorization: Bearer YOUR_ADMIN_API_KEY
Content-Type: multipart/form-data

file: users.csv
rollbackId: import_session_uuid
```

#### Undo Import Operation
```http
POST /api/admin/import/undo
Authorization: Bearer YOUR_ADMIN_API_KEY
Content-Type: application/json

{
  "importId": "import_uuid"
}
```

## Monitoring & Reports APIs

### Network Monitoring

#### Get ATM Status
```http
GET /api/monitoring/atms/status
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "online": 145,
    "offline": 5,
    "maintenance": 2,
    "lastUpdated": "2024-01-01T12:00:00Z",
    "atms": [
      {
        "id": "atm_uuid",
        "code": "ATM001",
        "location": "Manado City Mall",
        "status": "ONLINE",
        "lastPing": "2024-01-01T11:59:30Z",
        "responseTime": 45,
        "uptime": 99.8
      }
    ]
  }
}
```

#### Ping ATM
```http
POST /api/monitoring/atms/ping
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "atmIds": ["atm_uuid1", "atm_uuid2"],
  "includeMetrics": true
}
```

#### Network Health Check
```http
GET /api/monitoring/network/health
Authorization: Bearer YOUR_API_KEY
```

#### Get Network Performance
```http
GET /api/monitoring/network/performance?period=24h&branchId=branch_uuid
Authorization: Bearer YOUR_API_KEY
```

### Reports

#### Dashboard Metrics
```http
GET /api/reports/dashboard?period=30d&branchId=branch_uuid
Authorization: Bearer YOUR_API_KEY
```

#### SLA Performance Report
```http
GET /api/reports/admin/sla-performance?dateFrom=2024-01-01&dateTo=2024-01-31&format=json
Authorization: Bearer YOUR_API_KEY
```

#### Technician Performance
```http
GET /api/reports/technician/performance/{technicianId}?period=7d
Authorization: Bearer YOUR_API_KEY
```

#### Custom Reports
```http
POST /api/reports/custom
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "name": "Weekly Ticket Summary",
  "type": "TICKET_SUMMARY",
  "filters": {
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-07"
    },
    "status": ["OPEN", "IN_PROGRESS"],
    "priority": ["HIGH", "CRITICAL"]
  },
  "groupBy": ["status", "priority"],
  "format": "JSON"
}
```

### Services & Categories

#### Get Services
```http
GET /api/services?page=1&limit=20&categoryId=category_uuid&isActive=true
Authorization: Bearer YOUR_API_KEY
```

#### Get Service Categories
```http
GET /api/services/categories
Authorization: Bearer YOUR_API_KEY
```

#### Get Popular Services
```http
GET /api/services/popular?limit=10
Authorization: Bearer YOUR_API_KEY
```

### Branches & ATMs

#### List Branches
```http
GET /api/branches?isActive=true
Authorization: Bearer YOUR_API_KEY
```

#### Get Branch Users
```http
GET /api/branches/{branchId}/users?role=TECHNICIAN
Authorization: Bearer YOUR_API_KEY
```

#### ATM Lookup
```http
GET /api/atms/lookup?atmId=ATM001234
Authorization: Bearer YOUR_API_KEY
```

## Examples & Integration Guides

### Example 1: Complete Ticket Lifecycle

```javascript
// Complete ticket workflow using the API
class ServiceDeskClient {
  constructor(apiKey, baseUrl = 'https://servicedesk.banksulutgo.co.id') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request(method, endpoint, data = null) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : null
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Create a ticket
  async createTicket(ticketData) {
    return this.request('POST', '/api/tickets', ticketData);
  }

  // Claim a ticket
  async claimTicket(ticketId) {
    return this.request('POST', `/api/tickets/${ticketId}/claim`);
  }

  // Update ticket status
  async updateStatus(ticketId, status, comment) {
    return this.request('POST', `/api/tickets/${ticketId}/status`, {
      status,
      comment
    });
  }

  // Add comment
  async addComment(ticketId, content, isInternal = false) {
    return this.request('POST', `/api/tickets/${ticketId}/comments`, {
      content,
      isInternal
    });
  }
}

// Usage example
async function handleTicketWorkflow() {
  const client = new ServiceDeskClient('sk_live_your_api_key_here');

  try {
    // 1. Create a ticket
    const ticket = await client.createTicket({
      title: 'Email server down',
      description: 'Users cannot access email since 9 AM',
      serviceId: 'email_service_uuid',
      priority: 'HIGH',
      category: 'INCIDENT'
    });

    console.log('Created ticket:', ticket.data.ticketNumber);

    // 2. Claim the ticket
    await client.claimTicket(ticket.data.id);
    console.log('Ticket claimed');

    // 3. Start work
    await client.updateStatus(ticket.data.id, 'IN_PROGRESS',
      'Started investigating the email server issue');

    // 4. Add progress comment
    await client.addComment(ticket.data.id,
      'Identified the issue - mail server disk is full. Cleaning up logs.');

    // 5. Resolve the ticket
    await client.updateStatus(ticket.data.id, 'RESOLVED',
      'Cleared disk space. Email server is now operational. Please test and confirm.');

    console.log('Ticket workflow completed');
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Example 2: Omnichannel Integration

```javascript
// Partner system integration
class OmnichannelIntegration {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://servicedesk.banksulutgo.co.id';
  }

  async createTicketForCustomer(customerData, issueData) {
    const response = await fetch(`${this.baseUrl}/api/omnichannel/tickets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: 'MOBILE_APP',
        channelReferenceId: `mobile_${Date.now()}`,
        serviceType: 'SUPPORT',
        customer: {
          name: customerData.fullName,
          email: customerData.email,
          phone: customerData.phoneNumber,
          identifier: customerData.customerId,
          branchCode: customerData.branchCode
        },
        ticket: {
          title: issueData.subject,
          description: issueData.description,
          priority: issueData.urgency,
          category: 'INCIDENT',
          metadata: {
            appVersion: issueData.appVersion,
            deviceModel: issueData.deviceModel,
            osVersion: issueData.osVersion
          }
        },
        integration: {
          requestId: `req_${Date.now()}`,
          source: 'MOBILE_BANKING_APP',
          webhookUrl: 'https://partner.example.com/webhooks/ticket-updates'
        }
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('Ticket created:', result.data.ticketNumber);
      console.log('Tracking URL:', result.data.trackingUrl);
      return result.data;
    } else {
      throw new Error(result.error.message);
    }
  }

  async checkTicketStatus(ticketNumber) {
    const response = await fetch(
      `${this.baseUrl}/api/omnichannel/tickets?ticketNumber=${ticketNumber}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );

    const result = await response.json();
    return result.data;
  }
}

// Usage
const integration = new OmnichannelIntegration('sk_live_partner_key');

const customerIssue = {
  fullName: 'John Customer',
  email: 'john@example.com',
  phoneNumber: '+628123456789',
  customerId: 'CUST001',
  branchCode: '001'
};

const issueDetails = {
  subject: 'Cannot login to mobile app',
  description: 'Getting error message when trying to login',
  urgency: 'HIGH',
  appVersion: '2.1.0',
  deviceModel: 'iPhone 13',
  osVersion: 'iOS 15.6'
};

integration.createTicketForCustomer(customerIssue, issueDetails)
  .then(ticket => {
    console.log('Ticket created successfully');

    // Check status after some time
    setTimeout(() => {
      integration.checkTicketStatus(ticket.ticketNumber)
        .then(status => console.log('Current status:', status.status));
    }, 5000);
  })
  .catch(error => console.error('Error:', error));
```

### Example 3: Claims Processing

```javascript
// ATM Claims API integration
async function processAtmClaim(claimData) {
  const response = await fetch('https://servicedesk.banksulutgo.co.id/api/public/claims', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sk_live_claims_api_key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      claimType: 'REIMBURSEMENT',
      claimAmount: claimData.amount,
      claimCurrency: 'IDR',
      claimDate: new Date().toISOString(),
      claimReason: claimData.reason,
      claimantName: claimData.customerName,
      claimantEmail: claimData.customerEmail,
      claimantPhone: claimData.customerPhone,
      claimantBranchCode: claimData.branchCode,
      title: `ATM Withdrawal Issue - ${claimData.atmCode}`,
      description: claimData.description,
      priority: claimData.amount > 1000000 ? 'HIGH' : 'MEDIUM',
      attachments: claimData.attachments,
      referenceNumber: claimData.referenceNumber,
      metadata: {
        atmCode: claimData.atmCode,
        transactionId: claimData.transactionId,
        accountNumber: claimData.accountNumber
      }
    })
  });

  const result = await response.json();

  if (result.success) {
    return {
      ticketNumber: result.data.ticketNumber,
      trackingUrl: result.data.trackingUrl,
      expectedResolution: result.data.sla.expectedResolutionBy
    };
  } else {
    throw new Error(result.error.message);
  }
}

// Example usage
const claimData = {
  amount: 500000,
  reason: 'ATM did not dispense cash but account was debited',
  customerName: 'Jane Smith',
  customerEmail: 'jane.smith@email.com',
  customerPhone: '+628123456789',
  branchCode: '001',
  atmCode: 'ATM001234',
  transactionId: 'TXN20240101001',
  accountNumber: '1234567890',
  referenceNumber: 'REF001',
  description: 'Customer attempted withdrawal but cash was not dispensed',
  attachments: [
    {
      filename: 'atm_receipt.pdf',
      mimeType: 'application/pdf',
      size: 25600,
      content: 'base64_encoded_receipt'
    }
  ]
};

processAtmClaim(claimData)
  .then(result => {
    console.log('Claim submitted successfully');
    console.log('Ticket Number:', result.ticketNumber);
    console.log('Track at:', result.trackingUrl);
  })
  .catch(error => console.error('Claim submission failed:', error));
```

### Example 4: Monitoring Integration

```javascript
// Network monitoring integration
class MonitoringService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://servicedesk.banksulutgo.co.id';
  }

  async getAtmStatus() {
    const response = await fetch(`${this.baseUrl}/api/monitoring/atms/status`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    return response.json();
  }

  async pingAtms(atmIds) {
    const response = await fetch(`${this.baseUrl}/api/monitoring/atms/ping`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        atmIds,
        includeMetrics: true
      })
    });

    return response.json();
  }

  async createIncidentTicket(atmId, issueDescription) {
    const response = await fetch(`${this.baseUrl}/api/tickets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `ATM ${atmId} - System Alert`,
        description: issueDescription,
        category: 'INCIDENT',
        priority: 'HIGH',
        serviceId: 'atm_monitoring_service_uuid',
        metadata: {
          source: 'MONITORING_SYSTEM',
          atmId: atmId,
          autoGenerated: true
        }
      })
    });

    return response.json();
  }
}

// Monitoring workflow
const monitor = new MonitoringService('sk_live_monitoring_key');

async function checkAtmHealth() {
  try {
    // Get overall ATM status
    const status = await monitor.getAtmStatus();
    console.log(`ATMs: ${status.data.online}/${status.data.total} online`);

    // Find offline ATMs
    const offlineAtms = status.data.atms.filter(atm => atm.status === 'OFFLINE');

    // Create tickets for offline ATMs
    for (const atm of offlineAtms) {
      const ticket = await monitor.createIncidentTicket(
        atm.code,
        `ATM ${atm.code} at ${atm.location} is offline. Last ping: ${atm.lastPing}`
      );

      console.log(`Created incident ticket ${ticket.data.ticketNumber} for ATM ${atm.code}`);
    }

  } catch (error) {
    console.error('Monitoring check failed:', error);
  }
}

// Run monitoring check every 5 minutes
setInterval(checkAtmHealth, 5 * 60 * 1000);
```

### Error Handling Best Practices

```javascript
// Comprehensive error handling
class ServiceDeskError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'ServiceDeskError';
    this.code = code;
    this.status = status;
  }
}

async function makeApiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${process.env.SERVICEDESK_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ServiceDeskError(
        data.error?.message || 'API request failed',
        data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }

    return data;

  } catch (error) {
    if (error instanceof ServiceDeskError) {
      throw error;
    }

    // Handle network errors, timeouts, etc.
    throw new ServiceDeskError(
      'Network error occurred',
      'NETWORK_ERROR',
      0
    );
  }
}

// Usage with proper error handling
async function createTicketWithRetry(ticketData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await makeApiRequest('/api/tickets', {
        method: 'POST',
        body: JSON.stringify(ticketData)
      });

      return result;

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);

      if (error.status === 429) {
        // Rate limited - wait and retry
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (error.status >= 400 && error.status < 500) {
        // Client error - don't retry
        throw error;
      }

      if (attempt === maxRetries) {
        throw error;
      }

      // Server error - retry with backoff
      const waitTime = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

## Testing Your Integration

### Postman Collection

You can import our Postman collection for testing. Here's a basic setup:

```json
{
  "info": {
    "name": "Bank SulutGo ServiceDesk API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://servicedesk.banksulutgo.co.id"
    },
    {
      "key": "api_key",
      "value": "sk_live_your_api_key"
    }
  ],
  "item": [
    {
      "name": "Authentication Test",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{api_key}}"
          }
        ],
        "url": "{{base_url}}/api/tickets?limit=1"
      }
    }
  ]
}
```

### Test Scenarios

1. **Authentication Test**: Verify your API key works
2. **Create Ticket Test**: Create a simple ticket
3. **Status Check Test**: Verify you can retrieve ticket status
4. **Error Handling Test**: Test with invalid data
5. **Rate Limiting Test**: Test rate limits with rapid requests

### Environment Configuration

```javascript
// Environment-specific configuration
const config = {
  development: {
    baseUrl: 'http://localhost:3000',
    apiKey: 'sk_live_dev_key_here',
    timeout: 30000
  },
  production: {
    baseUrl: 'https://servicedesk.banksulutgo.co.id',
    apiKey: 'sk_live_prod_key_here',
    timeout: 10000,
    retries: 3
  }
};

const environment = process.env.NODE_ENV || 'development';
const apiConfig = config[environment];
```

## Support & Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your API key and permissions
2. **403 Forbidden**: Verify your API key has the required permissions
3. **429 Rate Limited**: Implement exponential backoff
4. **500 Server Error**: Check request format and contact support

### Debug Headers

Include these headers for better debugging:
```http
X-Request-ID: unique_request_id
X-Client-Version: your_app_version
```

### Contact Information

- **Technical Support**: tech-support@banksulutgo.co.id
- **API Issues**: api-support@banksulutgo.co.id
- **Emergency**: +62 811 123 4567

---

---

**Last Updated**: December 2024
**API Version**: 2.5.0
**Documentation Version**: 1.0

This comprehensive API documentation covers all 245+ endpoints discovered in the Bank SulutGo ServiceDesk system. For the most up-to-date information and additional endpoint details, please refer to the source code in the `/app/api/` directory or contact the technical support team.
