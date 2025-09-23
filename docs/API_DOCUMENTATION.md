# Bank SulutGo ServiceDesk API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Enum Definitions](#enum-definitions)
4. [API Endpoints](#api-endpoints)
   - [Authentication & Session](#authentication--session)
   - [Ticket Management](#ticket-management)
   - [Admin Operations](#admin-operations)
   - [Reporting & Analytics](#reporting--analytics)
   - [Network Monitoring](#network-monitoring)
   - [Knowledge Base](#knowledge-base)
   - [File Management](#file-management)

## Overview

### Base URL
```
Development: http://localhost:3000/api
Production: https://servicedesk.banksulutgo.co.id/api
```

### Common Headers
```json
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Cookie": "next-auth.session-token=<session_token>"
}
```

### Response Format
All API responses follow this structure:
```json
{
  "data": {},      // Response data (for successful requests)
  "error": "",     // Error message (for failed requests)
  "status": 200    // HTTP status code
}
```

### Error Codes
- `400` - Bad Request: Invalid input or validation error
- `401` - Unauthorized: Authentication required
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource doesn't exist
- `500` - Internal Server Error: Server-side error

## Enum Definitions

### User Roles
```typescript
enum UserRole {
  USER = "USER",
  TECHNICIAN = "TECHNICIAN",
  MANAGER = "MANAGER",
  ADMIN = "ADMIN",
  SECURITY_ANALYST = "SECURITY_ANALYST",
  SUPER_ADMIN = "SUPER_ADMIN"  // Used in code but not in schema
}
```

### Ticket Category (ITIL Classification)
```typescript
enum TicketCategory {
  INCIDENT = "INCIDENT",
  SERVICE_REQUEST = "SERVICE_REQUEST",
  CHANGE_REQUEST = "CHANGE_REQUEST",
  EVENT_REQUEST = "EVENT_REQUEST"
}
```

### Ticket Status
```typescript
enum TicketStatus {
  OPEN = "OPEN",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  IN_PROGRESS = "IN_PROGRESS",
  PENDING_VENDOR = "PENDING_VENDOR",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED",
  PENDING = "PENDING"
}
```

### Ticket Priority
```typescript
enum TicketPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
  EMERGENCY = "EMERGENCY"
}
```

### Issue Classification
```typescript
enum IssueClassification {
  HUMAN_ERROR = "HUMAN_ERROR",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  HARDWARE_FAILURE = "HARDWARE_FAILURE",
  NETWORK_ISSUE = "NETWORK_ISSUE",
  SECURITY_INCIDENT = "SECURITY_INCIDENT",
  DATA_ISSUE = "DATA_ISSUE",
  PROCESS_GAP = "PROCESS_GAP",
  EXTERNAL_FACTOR = "EXTERNAL_FACTOR"
}
```

### Field Types (for dynamic fields)
```typescript
enum FieldType {
  TEXT = "TEXT",
  TEXTAREA = "TEXTAREA",
  EMAIL = "EMAIL",
  PHONE = "PHONE",
  NUMBER = "NUMBER",
  DATE = "DATE",
  DATETIME = "DATETIME",
  SELECT = "SELECT",
  MULTISELECT = "MULTISELECT",
  RADIO = "RADIO",
  CHECKBOX = "CHECKBOX",
  FILE = "FILE",
  URL = "URL"
}
```

### Approval Status
```typescript
enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}
```

### ATM Status
```typescript
enum ATMStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  WARNING = "WARNING",
  ERROR = "ERROR",
  MAINTENANCE = "MAINTENANCE"
}
```

### Network Media Types
```typescript
enum NetworkMedia {
  VSAT = "VSAT",
  M2M = "M2M",
  FO = "FO"
}
```

### Network Status
```typescript
enum NetworkStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  SLOW = "SLOW",
  TIMEOUT = "TIMEOUT",
  ERROR = "ERROR"
}
```

### Knowledge Article Status
```typescript
enum KnowledgeStatus {
  DRAFT = "DRAFT",
  UNDER_REVIEW = "UNDER_REVIEW",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
  EXPIRED = "EXPIRED"
}
```

### Report Types
```typescript
enum ReportType {
  TABULAR = "TABULAR",
  MATRIX = "MATRIX",
  METRICS = "METRICS",
  QUERY = "QUERY"
}
```

### Export Formats
```typescript
enum ExportFormat {
  PDF = "PDF",
  EXCEL = "EXCEL",
  CSV = "CSV",
  HTML = "HTML"
}
```

## API Endpoints

---

## Authentication & Session

### POST /api/auth/signin
**Description:** User login
**Authentication:** None
**Request Body:**
```json
{
  "username": "john.doe",
  "password": "SecurePass123!",
  "remember": true
}
```
**Response:**
```json
{
  "user": {
    "id": "cuid123",
    "email": "john@bank.com",
    "name": "John Doe",
    "role": "TECHNICIAN",
    "branchId": "branch123"
  },
  "session": {
    "token": "jwt_token_here",
    "expires": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/auth/signout
**Description:** User logout
**Authentication:** Required
**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### POST /api/auth/change-password
**Description:** Change user password
**Authentication:** Required
**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!",
  "confirmPassword": "NewPass456!"
}
```
**Response:**
```json
{
  "message": "Password changed successfully",
  "mustChangePassword": false
}
```

### POST /api/auth/forgot-password
**Description:** Request password reset
**Authentication:** None
**Request Body:**
```json
{
  "email": "user@bank.com"
}
```
**Response:**
```json
{
  "message": "Password reset email sent if account exists"
}
```

### GET /api/auth/activity
**Description:** Get user activity logs
**Authentication:** Required
**Query Parameters:**
- `limit` (number): Number of records (default: 50)
- `offset` (number): Skip records

**Response:**
```json
{
  "activities": [
    {
      "id": "log123",
      "action": "LOGIN",
      "timestamp": "2024-01-01T10:00:00Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "total": 100
}
```

---

## Ticket Management

### GET /api/tickets
**Description:** List tickets with filtering
**Authentication:** Required
**Query Parameters:**
- `status` (TicketStatus): Filter by status
- `priority` (TicketPriority): Filter by priority
- `assignedTo` (string): Filter by assignee ID
- `branchId` (string): Filter by branch
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search in title/description
- `sortBy` (string): Sort field (ticketNumber, title, priority, status, createdAt, updatedAt)
- `sortOrder` (string): asc or desc
- `includeConfidential` (boolean): Include confidential tickets
- `filter` (string): "my-tickets" or "available-tickets"
- `categoryId` (string): Filter by category

**Response:**
```json
{
  "tickets": [
    {
      "id": "ticket123",
      "ticketNumber": "INC-2024-0001",
      "title": "Network Issue at Branch 001",
      "description": "Internet connection is down",
      "status": "OPEN",
      "priority": "HIGH",
      "category": "INCIDENT",
      "issueClassification": "NETWORK_ISSUE",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z",
      "createdBy": {
        "id": "user123",
        "name": "John Doe",
        "email": "john@bank.com"
      },
      "assignedTo": {
        "id": "tech123",
        "name": "Jane Tech",
        "email": "jane@bank.com"
      },
      "service": {
        "id": "service123",
        "name": "Network Support",
        "slaHours": 4
      },
      "branch": {
        "id": "branch123",
        "name": "Cabang Utama",
        "code": "001"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### POST /api/tickets
**Description:** Create a new ticket
**Authentication:** Required
**Request Body:**
```json
{
  "title": "Printer not working",
  "description": "The printer in the main office is showing error code E02",
  "serviceId": "service123",
  "priority": "MEDIUM",
  "justification": "Needed for daily reports",
  "category": "INCIDENT",
  "issueClassification": "HARDWARE_FAILURE",
  "categoryId": "cat123",
  "subcategoryId": "subcat123",
  "itemId": "item123",
  "fieldValues": [
    {
      "fieldId": "field1",
      "value": "HP LaserJet Pro"
    },
    {
      "fieldId": "field2",
      "value": "E02"
    }
  ],
  "attachments": [
    {
      "filename": "error_screenshot.png",
      "mimeType": "image/png",
      "size": 102400,
      "content": "base64_encoded_content_here"
    }
  ],
  "isConfidential": false,
  "securityClassification": "LOW"
}
```
**Response:**
```json
{
  "ticket": {
    "id": "newticket123",
    "ticketNumber": "INC-2024-0002",
    "title": "Printer not working",
    "status": "OPEN",
    "priority": "MEDIUM",
    "createdAt": "2024-01-01T11:00:00Z"
  },
  "message": "Ticket created successfully"
}
```

### GET /api/tickets/[id]
**Description:** Get ticket details
**Authentication:** Required
**Path Parameters:**
- `id` (string): Ticket ID or ticket number

**Response:**
```json
{
  "id": "ticket123",
  "ticketNumber": "INC-2024-0001",
  "title": "Network Issue at Branch 001",
  "description": "Internet connection is down",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "category": "INCIDENT",
  "issueClassification": "NETWORK_ISSUE",
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T11:00:00Z",
  "resolvedAt": null,
  "closedAt": null,
  "slaTracking": {
    "responseDeadline": "2024-01-01T12:00:00Z",
    "resolutionDeadline": "2024-01-01T14:00:00Z",
    "isResponseBreached": false,
    "isResolutionBreached": false
  },
  "comments": [
    {
      "id": "comment123",
      "content": "Working on the issue",
      "isInternal": false,
      "createdAt": "2024-01-01T10:30:00Z",
      "user": {
        "name": "Jane Tech",
        "role": "TECHNICIAN"
      }
    }
  ],
  "attachments": [
    {
      "id": "attach123",
      "filename": "network_log.txt",
      "mimeType": "text/plain",
      "size": 2048,
      "uploadedAt": "2024-01-01T10:15:00Z"
    }
  ],
  "tasks": [
    {
      "id": "task123",
      "title": "Check router configuration",
      "status": "COMPLETED",
      "completedAt": "2024-01-01T10:45:00Z"
    }
  ],
  "approvals": [
    {
      "id": "approval123",
      "status": "APPROVED",
      "approvedBy": {
        "name": "Manager Name"
      },
      "approvedAt": "2024-01-01T10:20:00Z",
      "comments": "Approved for immediate action"
    }
  ]
}
```

### PATCH /api/tickets/[id]
**Description:** Update ticket status or details
**Authentication:** Required
**Path Parameters:**
- `id` (string): Ticket ID

**Request Body:**
```json
{
  "status": "RESOLVED",
  "priority": "CRITICAL",
  "assignedToId": "tech456",
  "resolutionNotes": "Replaced faulty router"
}
```
**Response:**
```json
{
  "ticket": {
    "id": "ticket123",
    "status": "RESOLVED",
    "priority": "CRITICAL"
  },
  "message": "Ticket updated successfully"
}
```

### POST /api/tickets/[id]/comments
**Description:** Add comment to ticket
**Authentication:** Required
**Path Parameters:**
- `id` (string): Ticket ID

**Request Body:**
```json
{
  "content": "Checked the router, found configuration issue",
  "isInternal": false,
  "attachments": [
    {
      "filename": "config.txt",
      "mimeType": "text/plain",
      "size": 1024,
      "content": "base64_content"
    }
  ]
}
```
**Response:**
```json
{
  "comment": {
    "id": "comment456",
    "content": "Checked the router, found configuration issue",
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

### POST /api/tickets/[id]/assign
**Description:** Assign ticket to technician
**Authentication:** Required (ADMIN, MANAGER)
**Path Parameters:**
- `id` (string): Ticket ID

**Request Body:**
```json
{
  "assignedToId": "tech789",
  "notes": "Assigning to network specialist"
}
```
**Response:**
```json
{
  "message": "Ticket assigned successfully",
  "assignedTo": {
    "id": "tech789",
    "name": "Network Specialist"
  }
}
```

### POST /api/tickets/[id]/claim
**Description:** Claim an unassigned ticket
**Authentication:** Required (TECHNICIAN)
**Path Parameters:**
- `id` (string): Ticket ID

**Response:**
```json
{
  "message": "Ticket claimed successfully"
}
```

### DELETE /api/tickets/[id]/claim
**Description:** Release a claimed ticket
**Authentication:** Required
**Path Parameters:**
- `id` (string): Ticket ID

**Response:**
```json
{
  "message": "Ticket released successfully"
}
```

### POST /api/tickets/bulk/assign
**Description:** Bulk assign tickets
**Authentication:** Required (ADMIN, MANAGER)
**Request Body:**
```json
{
  "ticketIds": ["ticket1", "ticket2", "ticket3"],
  "assignedToId": "tech123"
}
```
**Response:**
```json
{
  "assigned": 3,
  "failed": 0,
  "message": "Tickets assigned successfully"
}
```

---

## Admin Operations

### Services Management

#### GET /api/admin/services
**Description:** Get all services
**Authentication:** Required (ADMIN)
**Response:**
```json
{
  "services": [
    {
      "id": "service123",
      "name": "Network Support",
      "description": "Network connectivity issues",
      "priority": "HIGH",
      "slaHours": 4,
      "requiresApproval": false,
      "isConfidential": false,
      "defaultTitle": "Network Support",
      "defaultItilCategory": "INCIDENT",
      "defaultIssueClassification": "NETWORK_ISSUE",
      "supportGroup": {
        "id": "group123",
        "name": "IT Network Team"
      },
      "tier1Category": {
        "id": "cat1",
        "name": "Infrastructure"
      },
      "_count": {
        "tickets": 45,
        "fieldTemplates": 3
      }
    }
  ]
}
```

#### POST /api/admin/services
**Description:** Create new service
**Authentication:** Required (ADMIN)
**Request Body:**
```json
{
  "name": "Database Support",
  "description": "Database related issues and requests",
  "helpText": "Use this for any database problems",
  "tier1CategoryId": "cat123",
  "tier2SubcategoryId": "subcat123",
  "tier3ItemId": "item123",
  "supportGroupId": "group456",
  "priority": "HIGH",
  "estimatedHours": 2,
  "slaHours": 8,
  "requiresApproval": true,
  "isConfidential": false,
  "defaultTitle": "Database Issue",
  "defaultItilCategory": "INCIDENT",
  "defaultIssueClassification": "SYSTEM_ERROR"
}
```

### User Management

#### GET /api/admin/users
**Description:** Get all users
**Authentication:** Required (ADMIN)
**Query Parameters:**
- `role` (UserRole): Filter by role
- `branchId` (string): Filter by branch
- `isActive` (boolean): Filter active/inactive
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "users": [
    {
      "id": "user123",
      "email": "john@bank.com",
      "name": "John Doe",
      "username": "john.doe",
      "role": "TECHNICIAN",
      "isActive": true,
      "branchId": "branch123",
      "branch": {
        "name": "Cabang Utama",
        "code": "001"
      },
      "supportGroup": {
        "name": "IT Helpdesk"
      },
      "lastActivity": "2024-01-01T10:00:00Z",
      "loginAttempts": 0,
      "lockedAt": null
    }
  ],
  "total": 50
}
```

#### POST /api/admin/users
**Description:** Create new user
**Authentication:** Required (ADMIN)
**Request Body:**
```json
{
  "email": "newuser@bank.com",
  "name": "New User",
  "username": "new.user",
  "password": "TempPass123!",
  "role": "USER",
  "branchId": "branch123",
  "supportGroupId": null,
  "phone": "+6281234567890",
  "mustChangePassword": true,
  "emailNotifyOnTicketCreated": true,
  "emailNotifyOnTicketAssigned": true,
  "emailNotifyOnTicketUpdated": true,
  "emailNotifyOnTicketResolved": true,
  "emailNotifyOnComment": true
}
```

#### PATCH /api/admin/users/[id]
**Description:** Update user details
**Authentication:** Required (ADMIN)
**Path Parameters:**
- `id` (string): User ID

**Request Body:**
```json
{
  "name": "Updated Name",
  "role": "MANAGER",
  "branchId": "branch456",
  "supportGroupId": "group789",
  "isActive": true
}
```

#### POST /api/admin/users/[id]/unlock
**Description:** Unlock a locked user account
**Authentication:** Required (ADMIN)
**Path Parameters:**
- `id` (string): User ID

**Response:**
```json
{
  "message": "User account unlocked successfully"
}
```

#### POST /api/admin/users/[id]/toggle-active
**Description:** Toggle user active status
**Authentication:** Required (ADMIN)
**Path Parameters:**
- `id` (string): User ID

**Response:**
```json
{
  "user": {
    "id": "user123",
    "isActive": false
  },
  "message": "User status updated"
}
```

### Branch Management

#### GET /api/admin/branches
**Description:** Get all branches
**Authentication:** Required (ADMIN)
**Response:**
```json
{
  "branches": [
    {
      "id": "branch123",
      "name": "Cabang Utama",
      "code": "001",
      "address": "Jl. Sudirman No. 1",
      "city": "Gorontalo",
      "province": "Gorontalo",
      "isActive": true,
      "latitude": -0.5435,
      "longitude": 123.0638,
      "_count": {
        "users": 25,
        "tickets": 150,
        "atms": 5
      }
    }
  ]
}
```

#### POST /api/admin/branches
**Description:** Create new branch
**Authentication:** Required (ADMIN)
**Request Body:**
```json
{
  "name": "Cabang Baru",
  "code": "099",
  "address": "Jl. New Street No. 1",
  "city": "Manado",
  "province": "Sulawesi Utara",
  "latitude": 1.4748,
  "longitude": 124.8421,
  "phone": "0431-123456",
  "email": "cabang099@bank.com",
  "managerName": "Branch Manager",
  "isActive": true
}
```

### ATM Management

#### GET /api/admin/atms
**Description:** Get all ATMs
**Authentication:** Required (ADMIN)
**Query Parameters:**
- `branchId` (string): Filter by branch
- `status` (ATMStatus): Filter by status
- `networkMedia` (NetworkMedia): Filter by network type

**Response:**
```json
{
  "atms": [
    {
      "id": "atm123",
      "atmId": "ATM001",
      "location": "Cabang Utama Lobby",
      "branchId": "branch123",
      "branch": {
        "name": "Cabang Utama",
        "code": "001"
      },
      "ipAddress": "192.168.1.100",
      "status": "ONLINE",
      "networkMedia": "FO",
      "lastPingTime": "2024-01-01T12:00:00Z",
      "responseTime": 25,
      "isActive": true
    }
  ]
}
```

#### POST /api/admin/atms
**Description:** Create new ATM
**Authentication:** Required (ADMIN)
**Request Body:**
```json
{
  "atmId": "ATM099",
  "location": "Mall Center",
  "branchId": "branch123",
  "ipAddress": "192.168.1.199",
  "networkMedia": "VSAT",
  "status": "ONLINE",
  "isActive": true
}
```

### Support Groups

#### GET /api/admin/support-groups
**Description:** Get all support groups
**Authentication:** Required (ADMIN)
**Response:**
```json
{
  "supportGroups": [
    {
      "id": "group123",
      "name": "IT Helpdesk",
      "code": "IT_HELPDESK",
      "description": "First level support",
      "email": "helpdesk@bank.com",
      "isActive": true,
      "_count": {
        "users": 10,
        "services": 25
      }
    }
  ]
}
```

#### POST /api/admin/support-groups
**Description:** Create support group
**Authentication:** Required (ADMIN)
**Request Body:**
```json
{
  "name": "Network Team",
  "code": "NETWORK_TEAM",
  "description": "Network infrastructure support",
  "email": "network@bank.com",
  "managerUserId": "user456",
  "isActive": true
}
```

### Field Templates

#### GET /api/admin/field-templates
**Description:** Get all field templates
**Authentication:** Required (ADMIN)
**Response:**
```json
{
  "fieldTemplates": [
    {
      "id": "field123",
      "name": "Asset Tag",
      "label": "Asset Tag Number",
      "type": "TEXT",
      "required": true,
      "placeholder": "Enter asset tag",
      "helpText": "The asset tag from the device label",
      "options": null,
      "validation": {
        "pattern": "^AST-\\d{6}$",
        "message": "Must be in format AST-XXXXXX"
      },
      "defaultValue": null,
      "order": 1
    }
  ]
}
```

#### POST /api/admin/field-templates
**Description:** Create field template
**Authentication:** Required (ADMIN)
**Request Body:**
```json
{
  "name": "Error Code",
  "label": "Error Code",
  "type": "SELECT",
  "required": true,
  "placeholder": "Select error code",
  "helpText": "The error code displayed on screen",
  "options": ["E01", "E02", "E03", "E99"],
  "validation": null,
  "defaultValue": "E01",
  "order": 2
}
```

### Category Management

#### GET /api/admin/tier-categories
**Description:** Get tier 1 categories
**Authentication:** Required (ADMIN)
**Response:**
```json
{
  "categories": [
    {
      "id": "cat123",
      "name": "Infrastructure",
      "description": "IT Infrastructure services",
      "isActive": true,
      "_count": {
        "subcategories": 5,
        "services": 15
      }
    }
  ]
}
```

#### GET /api/admin/tier-categories/subcategories
**Description:** Get tier 2 subcategories
**Authentication:** Required (ADMIN)
**Query Parameters:**
- `categoryId` (string): Filter by parent category

**Response:**
```json
{
  "subcategories": [
    {
      "id": "subcat123",
      "name": "Network",
      "description": "Network related services",
      "categoryId": "cat123",
      "category": {
        "name": "Infrastructure"
      },
      "_count": {
        "items": 3,
        "services": 8
      }
    }
  ]
}
```

#### GET /api/admin/tier-categories/items
**Description:** Get tier 3 items
**Authentication:** Required (ADMIN)
**Query Parameters:**
- `subcategoryId` (string): Filter by parent subcategory

**Response:**
```json
{
  "items": [
    {
      "id": "item123",
      "name": "Router",
      "description": "Router related issues",
      "subcategoryId": "subcat123",
      "subcategory": {
        "name": "Network"
      },
      "_count": {
        "services": 3
      }
    }
  ]
}
```

---

## Reporting & Analytics

### Admin Reports

#### GET /api/reports/admin/sla-performance
**Description:** SLA performance analytics
**Authentication:** Required (ADMIN)
**Query Parameters:**
- `startDate` (ISO date): Start date
- `endDate` (ISO date): End date
- `branchId` (string): Filter by branch
- `supportGroupId` (string): Filter by support group

**Response:**
```json
{
  "summary": {
    "totalTickets": 500,
    "responseBreaches": 25,
    "resolutionBreaches": 40,
    "complianceRate": 87.5,
    "averageResponseTime": 2.5,
    "averageResolutionTime": 6.8
  },
  "byPriority": {
    "CRITICAL": {
      "total": 50,
      "breached": 5,
      "complianceRate": 90
    },
    "HIGH": {
      "total": 150,
      "breached": 20,
      "complianceRate": 86.7
    }
  },
  "byService": [
    {
      "serviceName": "Network Support",
      "total": 100,
      "breached": 10,
      "avgResponseTime": 1.5,
      "avgResolutionTime": 4.2
    }
  ],
  "trend": [
    {
      "date": "2024-01-01",
      "total": 20,
      "breached": 2,
      "complianceRate": 90
    }
  ]
}
```

#### GET /api/reports/admin/user-analytics
**Description:** User performance analytics
**Authentication:** Required (ADMIN)
**Query Parameters:**
- `startDate` (ISO date): Start date
- `endDate` (ISO date): End date
- `userId` (string): Filter by user
- `role` (UserRole): Filter by role

**Response:**
```json
{
  "summary": {
    "totalUsers": 100,
    "activeUsers": 85,
    "avgTicketsPerUser": 12.5,
    "avgResolutionTime": 4.2
  },
  "byUser": [
    {
      "userId": "user123",
      "name": "John Doe",
      "role": "TECHNICIAN",
      "ticketsAssigned": 45,
      "ticketsResolved": 40,
      "avgResolutionTime": 3.5,
      "slaComplianceRate": 95
    }
  ],
  "byRole": {
    "TECHNICIAN": {
      "count": 30,
      "avgTickets": 20,
      "avgResolutionTime": 4.0
    },
    "MANAGER": {
      "count": 10,
      "avgApprovals": 50,
      "avgApprovalTime": 0.5
    }
  }
}
```

#### GET /api/reports/admin/service-catalog
**Description:** Service catalog performance
**Authentication:** Required (ADMIN)
**Response:**
```json
{
  "services": [
    {
      "id": "service123",
      "name": "Network Support",
      "category": "Infrastructure",
      "totalTickets": 150,
      "openTickets": 10,
      "avgResolutionTime": 4.5,
      "slaComplianceRate": 92,
      "satisfactionScore": 4.5,
      "usage": {
        "daily": 5,
        "weekly": 35,
        "monthly": 150
      }
    }
  ],
  "summary": {
    "totalServices": 50,
    "activeServices": 45,
    "totalTickets": 2500,
    "avgSlaCompliance": 89.5
  }
}
```

### Ticket Analytics

#### GET /api/reports/analytics/requests-by-status
**Description:** Ticket distribution by status
**Authentication:** Required
**Query Parameters:**
- `startDate` (ISO date): Start date
- `endDate` (ISO date): End date

**Response:**
```json
{
  "data": {
    "OPEN": 45,
    "IN_PROGRESS": 120,
    "RESOLVED": 200,
    "CLOSED": 500,
    "PENDING_APPROVAL": 10,
    "PENDING_VENDOR": 5
  },
  "total": 880
}
```

#### GET /api/reports/analytics/requests-by-priority
**Description:** Ticket distribution by priority
**Authentication:** Required
**Response:**
```json
{
  "data": {
    "CRITICAL": 10,
    "HIGH": 50,
    "MEDIUM": 200,
    "LOW": 620
  },
  "total": 880
}
```

#### GET /api/reports/analytics/requests-by-category
**Description:** Ticket distribution by ITIL category
**Authentication:** Required
**Response:**
```json
{
  "data": {
    "INCIDENT": 400,
    "SERVICE_REQUEST": 350,
    "CHANGE_REQUEST": 100,
    "EVENT_REQUEST": 30
  },
  "total": 880
}
```

### Branch Performance

#### GET /api/reports/branch/detailed-performance
**Description:** Detailed branch performance metrics
**Authentication:** Required (MANAGER, ADMIN)
**Query Parameters:**
- `branchId` (string): Branch ID
- `startDate` (ISO date): Start date
- `endDate` (ISO date): End date

**Response:**
```json
{
  "branch": {
    "id": "branch123",
    "name": "Cabang Utama",
    "code": "001"
  },
  "metrics": {
    "totalTickets": 250,
    "openTickets": 15,
    "avgResolutionTime": 5.2,
    "slaCompliance": 88.5,
    "customerSatisfaction": 4.2
  },
  "ticketsByCategory": {
    "INCIDENT": 100,
    "SERVICE_REQUEST": 120,
    "CHANGE_REQUEST": 25,
    "EVENT_REQUEST": 5
  },
  "topIssues": [
    {
      "classification": "NETWORK_ISSUE",
      "count": 45,
      "percentage": 18
    }
  ],
  "technicians": [
    {
      "name": "John Technician",
      "resolved": 40,
      "avgTime": 4.5
    }
  ]
}
```

---

## Network Monitoring

### ATM Monitoring

#### GET /api/monitoring/atms/status
**Description:** Get ATM status overview
**Authentication:** Required
**Query Parameters:**
- `branchId` (string): Filter by branch

**Response:**
```json
{
  "summary": {
    "total": 250,
    "online": 230,
    "offline": 15,
    "warning": 3,
    "maintenance": 2
  },
  "atms": [
    {
      "atmId": "ATM001",
      "location": "Cabang Utama",
      "status": "ONLINE",
      "lastPing": "2024-01-01T12:00:00Z",
      "responseTime": 25,
      "uptime": 99.5
    }
  ]
}
```

#### POST /api/monitoring/atms/ping
**Description:** Ping ATM for status check
**Authentication:** Required (ADMIN, TECHNICIAN)
**Request Body:**
```json
{
  "atmId": "ATM001"
}
```
**Response:**
```json
{
  "atmId": "ATM001",
  "status": "ONLINE",
  "responseTime": 28,
  "timestamp": "2024-01-01T12:05:00Z"
}
```

#### GET /api/monitoring/atms/incidents
**Description:** Get ATM incidents
**Authentication:** Required
**Query Parameters:**
- `atmId` (string): Filter by ATM
- `status` (IncidentStatus): Filter by status
- `severity` (IncidentSeverity): Filter by severity

**Response:**
```json
{
  "incidents": [
    {
      "id": "incident123",
      "atmId": "ATM001",
      "type": "NETWORK_DOWN",
      "severity": "HIGH",
      "status": "OPEN",
      "description": "ATM offline for 30 minutes",
      "startTime": "2024-01-01T11:30:00Z",
      "endTime": null,
      "ticketId": "ticket456"
    }
  ]
}
```

### Network Health

#### GET /api/monitoring/network/health
**Description:** Network health overview
**Authentication:** Required
**Response:**
```json
{
  "overall": "HEALTHY",
  "metrics": {
    "avgResponseTime": 35,
    "packetLoss": 0.1,
    "availability": 99.9
  },
  "byMedia": {
    "FO": {
      "status": "HEALTHY",
      "avgResponseTime": 20,
      "availability": 99.99
    },
    "VSAT": {
      "status": "WARNING",
      "avgResponseTime": 150,
      "availability": 98.5
    },
    "M2M": {
      "status": "HEALTHY",
      "avgResponseTime": 45,
      "availability": 99.5
    }
  }
}
```

#### GET /api/monitoring/network/performance
**Description:** Network performance metrics
**Authentication:** Required
**Query Parameters:**
- `period` (string): "daily", "weekly", "monthly"

**Response:**
```json
{
  "performance": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "avgResponseTime": 32,
      "minResponseTime": 15,
      "maxResponseTime": 250,
      "packetLoss": 0.05,
      "availability": 99.95
    }
  ],
  "summary": {
    "avgResponseTime": 35,
    "p95ResponseTime": 120,
    "p99ResponseTime": 200,
    "overallAvailability": 99.9
  }
}
```

---

## Knowledge Base

### GET /api/knowledge
**Description:** List knowledge articles
**Authentication:** Required
**Query Parameters:**
- `status` (KnowledgeStatus): Filter by status
- `categoryId` (string): Filter by category
- `search` (string): Search in title/content
- `tags` (string[]): Filter by tags

**Response:**
```json
{
  "articles": [
    {
      "id": "kb123",
      "title": "How to Reset Router",
      "summary": "Step-by-step guide for router reset",
      "status": "PUBLISHED",
      "category": {
        "name": "Network"
      },
      "tags": ["network", "router", "troubleshooting"],
      "views": 1250,
      "helpful": 95,
      "notHelpful": 5,
      "author": {
        "name": "John Expert"
      },
      "publishedAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 150
}
```

### POST /api/knowledge
**Description:** Create knowledge article
**Authentication:** Required (TECHNICIAN, ADMIN)
**Request Body:**
```json
{
  "title": "Troubleshooting Printer Issues",
  "summary": "Common printer problems and solutions",
  "content": "Full HTML content here...",
  "categoryId": "cat123",
  "tags": ["printer", "troubleshooting", "hardware"],
  "status": "DRAFT",
  "relatedServices": ["service123", "service456"],
  "attachments": [
    {
      "filename": "printer_manual.pdf",
      "mimeType": "application/pdf",
      "size": 2048000,
      "content": "base64_content"
    }
  ]
}
```

### GET /api/knowledge/[id]
**Description:** Get knowledge article details
**Authentication:** Required
**Path Parameters:**
- `id` (string): Article ID

**Response:**
```json
{
  "id": "kb123",
  "title": "How to Reset Router",
  "summary": "Step-by-step guide for router reset",
  "content": "<h2>Steps</h2><ol><li>Locate reset button...</li></ol>",
  "status": "PUBLISHED",
  "category": {
    "id": "cat123",
    "name": "Network"
  },
  "tags": ["network", "router", "troubleshooting"],
  "views": 1250,
  "helpful": 95,
  "notHelpful": 5,
  "author": {
    "id": "user123",
    "name": "John Expert"
  },
  "collaborators": [
    {
      "user": {
        "name": "Jane Reviewer"
      },
      "role": "EDITOR"
    }
  ],
  "versions": [
    {
      "version": 2,
      "updatedBy": "Jane Editor",
      "updatedAt": "2024-01-01T12:00:00Z",
      "changeNotes": "Updated screenshots"
    }
  ],
  "relatedArticles": [
    {
      "id": "kb456",
      "title": "Network Troubleshooting Guide"
    }
  ],
  "attachments": [
    {
      "id": "attach123",
      "filename": "router_manual.pdf",
      "size": 1024000
    }
  ]
}
```

### POST /api/knowledge/[id]/feedback
**Description:** Submit feedback for article
**Authentication:** Required
**Path Parameters:**
- `id` (string): Article ID

**Request Body:**
```json
{
  "isHelpful": true,
  "comment": "Very clear instructions, helped solve my issue"
}
```

---

## File Management

### POST /api/upload
**Description:** Upload file
**Authentication:** Required
**Request Body:**
```json
{
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "size": 1048576,
  "content": "base64_encoded_file_content"
}
```
**Response:**
```json
{
  "filename": "user123_1704110400000_a1b2c3d4_document.pdf",
  "originalName": "document.pdf",
  "mimeType": "application/pdf",
  "size": 1048576,
  "uploadedAt": "2024-01-01T12:00:00Z"
}
```

### GET /api/files/[filename]
**Description:** Download/view file
**Authentication:** Required
**Path Parameters:**
- `filename` (string): Secure filename

**Response:** Binary file data with appropriate headers

### GET /api/tickets/[id]/attachments/[attachmentId]/download
**Description:** Download ticket attachment
**Authentication:** Required
**Path Parameters:**
- `id` (string): Ticket ID
- `attachmentId` (string): Attachment ID

**Response:** Binary file data

### GET /api/tickets/[id]/attachments/[attachmentId]/preview
**Description:** Preview ticket attachment
**Authentication:** Required
**Path Parameters:**
- `id` (string): Ticket ID
- `attachmentId` (string): Attachment ID

**Response:** File preview (images shown inline, PDFs with viewer)

---

## Notification System

### GET /api/notifications
**Description:** Get user notifications
**Authentication:** Required
**Query Parameters:**
- `unreadOnly` (boolean): Show only unread
- `type` (NotificationType): Filter by type
- `limit` (number): Number of notifications

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif123",
      "type": "TICKET_ASSIGNED",
      "title": "New ticket assigned",
      "message": "Ticket INC-2024-0001 has been assigned to you",
      "data": {
        "ticketId": "ticket123",
        "ticketNumber": "INC-2024-0001"
      },
      "isRead": false,
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "unreadCount": 5,
  "total": 25
}
```

### POST /api/notifications/mark-read
**Description:** Mark notifications as read
**Authentication:** Required
**Request Body:**
```json
{
  "notificationIds": ["notif123", "notif456"],
  "markAll": false
}
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)",
  "code": "ERROR_CODE (optional)",
  "status": 400
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `AUTH_REQUIRED` - Authentication required
- `PERMISSION_DENIED` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Resource already exists
- `SLA_BREACH` - SLA deadline exceeded
- `QUOTA_EXCEEDED` - Rate limit or quota exceeded
- `DEPENDENCY_ERROR` - Related resource conflict
- `INTERNAL_ERROR` - Server error

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Authentication endpoints**: 5 requests per minute
- **File uploads**: 10 requests per minute, 100MB per hour
- **Report generation**: 10 requests per minute
- **General endpoints**: 100 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704110400
```

---

## Webhooks (Future Implementation)

Webhook events will be available for:
- Ticket status changes
- SLA breaches
- Approval requests
- ATM status changes
- Critical incidents

---

## API Versioning

The API uses URL versioning. Current version is v1 (implicit).
Future versions will use: `/api/v2/endpoints`

---

## Support

For API support, contact:
- Email: api-support@banksulutgo.co.id
- Internal Portal: ServiceDesk API Documentation
- Slack: #api-support channel

---

*Last Updated: January 2024*
*Version: 1.0.0*