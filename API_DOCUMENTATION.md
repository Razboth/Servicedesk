# Bank SulutGo ServiceDesk - Complete API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Authentication & User Management](#authentication--user-management)
  - [Tickets](#tickets)
  - [ATM Claims](#atm-claims)
  - [Branch Management](#branch-management)
  - [ATM Management](#atm-management)
  - [Categories & Services](#categories--services)
  - [Reports](#reports)
  - [Monitoring](#monitoring)
  - [Vendors](#vendors)
  - [Admin Operations](#admin-operations)
  - [Knowledge Base](#knowledge-base)
  - [Notifications](#notifications)
  - [PC Assets](#pc-assets)

---

## Overview
Bank SulutGo ServiceDesk API provides comprehensive endpoints for IT service management, following ITIL v4 best practices. The API supports ticket management, ATM monitoring, asset tracking, and multi-branch operations.

## Authentication

### Methods
1. **Session Authentication** (Web Application)
   - Uses NextAuth.js session cookies
   - Automatic for logged-in users

2. **API Key Authentication** (External Systems)
   ```
   X-API-Key: YOUR_API_KEY
   Authorization: Bearer YOUR_API_KEY
   ```

### User Roles
- `SUPER_ADMIN` - Full system access
- `ADMIN` - Administrative operations
- `MANAGER` - Branch management
- `TECHNICIAN` - Technical support
- `AGENT` - Service desk agent
- `USER` - End user

## Base URL
```
Production: https://servicedesk.banksulutgo.co.id
Development: http://localhost:4000
```

## Error Handling
All errors follow this format:
```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## API Endpoints

### Authentication & User Management

#### Login
**POST** `/api/auth/signin`
```json
{
  "email": "user@banksulutgo.co.id",
  "password": "password123"
}
```

#### Logout
**POST** `/api/auth/signout`

#### Forgot Password
**POST** `/api/auth/forgot-password`
```json
{
  "email": "user@banksulutgo.co.id"
}
```

#### Reset Password
**POST** `/api/auth/reset-password`
```json
{
  "token": "reset_token",
  "password": "new_password"
}
```

#### Change Password
**POST** `/api/auth/change-password`
```json
{
  "currentPassword": "current_password",
  "newPassword": "new_password"
}
```

#### Get User Profile
**GET** `/api/user/profile`

#### Update User Profile
**PUT** `/api/user/profile`
```json
{
  "name": "Updated Name",
  "phone": "081234567890"
}
```

---

### Tickets

#### List Tickets
**GET** `/api/tickets`

Query Parameters:
- `page` (number) - Page number
- `limit` (number) - Items per page
- `status` - OPEN, IN_PROGRESS, RESOLVED, CLOSED
- `priority` - LOW, MEDIUM, HIGH, URGENT
- `search` - Search term
- `assignedToMe` (boolean) - Filter assigned tickets
- `createdByMe` (boolean) - Filter created tickets

#### Create Ticket
**POST** `/api/tickets`
```json
{
  "title": "Printer not working",
  "description": "HP LaserJet printer showing error",
  "priority": "MEDIUM",
  "categoryId": "category-id",
  "subcategoryId": "subcategory-id",
  "itemId": "item-id",
  "serviceId": "service-id",
  "branchId": "branch-id",
  "attachments": ["file-id-1", "file-id-2"],
  "customFields": {
    "field1": "value1"
  }
}
```

#### Get Ticket Details
**GET** `/api/tickets/{id}`

#### Update Ticket
**PUT** `/api/tickets/{id}`
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "priority": "HIGH"
}
```

#### Update Ticket Status
**PUT** `/api/tickets/{id}/status`
```json
{
  "status": "IN_PROGRESS",
  "comment": "Working on this issue"
}
```

#### Assign Ticket
**POST** `/api/tickets/{id}/assign`
```json
{
  "technicianId": "technician-id",
  "supportGroupId": "group-id",
  "notes": "Assigning to specialist"
}
```

#### Claim Ticket (Technician)
**POST** `/api/tickets/{id}/claim`

#### Bulk Claim Tickets
**POST** `/api/tickets/bulk-claim`
```json
{
  "ticketIds": ["ticket-id-1", "ticket-id-2"]
}
```

#### Add Comment
**POST** `/api/tickets/{id}/comments`
```json
{
  "content": "Comment text",
  "isInternal": false,
  "attachments": ["file-id"]
}
```

#### Get Comments
**GET** `/api/tickets/{id}/comments`

#### Update Comment
**PUT** `/api/tickets/{id}/comments/{commentId}`

#### Delete Comment
**DELETE** `/api/tickets/{id}/comments/{commentId}`

#### Get Ticket Tasks
**GET** `/api/tickets/{id}/tasks`

#### Create Task
**POST** `/api/tickets/{id}/tasks`
```json
{
  "title": "Task title",
  "description": "Task description",
  "assignedToId": "user-id",
  "dueDate": "2024-12-31T23:59:59Z"
}
```

#### Update Task
**PUT** `/api/tickets/{id}/tasks/{taskId}`
```json
{
  "status": "COMPLETED",
  "completedAt": "2024-12-28T15:30:00Z"
}
```

#### Batch Update Ticket Status
**POST** `/api/tickets/batch-status`
```json
{
  "ticketIds": ["id1", "id2"],
  "status": "RESOLVED",
  "comment": "Bulk resolved"
}
```

#### Batch Update by Ticket Numbers
**POST** `/api/tickets/batch-status-by-number`
```json
{
  "ticketNumbers": ["TKT-001", "TKT-002"],
  "status": "CLOSED"
}
```

#### Bulk Assign Tickets
**POST** `/api/tickets/bulk/assign`
```json
{
  "ticketIds": ["id1", "id2"],
  "technicianId": "tech-id",
  "supportGroupId": "group-id"
}
```

#### Get Related Knowledge Articles
**GET** `/api/tickets/{id}/related-knowledge`

#### Download Attachment
**GET** `/api/tickets/{id}/attachments/{attachmentId}/download`

#### Preview Attachment
**GET** `/api/tickets/{id}/attachments/{attachmentId}/preview`

---

### ATM Claims

#### Create ATM Claim (Public)
**POST** `/api/public/claims`
```json
{
  "claimType": "REIMBURSEMENT",
  "claimReason": "ATM did not dispense cash",
  "claimantName": "Customer Name",
  "claimantEmail": "customer@email.com",
  "claimAmount": 500000,
  "claimCurrency": "IDR",
  "claimDate": "2024-12-28T10:00:00Z",
  "claimantPhone": "081234567890",
  "claimantBranchCode": "001",
  "referenceNumber": "ATM-REF-001",
  "atmId": "ATM001234",
  "atmLocation": "Manado City Mall",
  "transactionDate": "2024-12-28T09:30:00Z",
  "cardNumber": "****1234",
  "attachments": ["receipt.jpg", "screenshot.png"]
}
```

#### Create ATM Claim (Internal)
**POST** `/api/tickets/atm-claim`
```json
{
  "atmId": "ATM001234",
  "issueType": "CASH_NOT_DISPENSED",
  "amount": 500000,
  "customerName": "John Doe",
  "customerPhone": "081234567890",
  "customerEmail": "john@email.com",
  "cardNumber": "****1234",
  "transactionDate": "2024-12-28T09:30:00Z",
  "description": "Customer complaint details"
}
```

#### List Branch ATM Claims
**GET** `/api/branch/atm-claims`

Query Parameters:
- `status` - Claim status
- `priority` - Priority level
- `source` - internal/external
- `page` - Page number
- `limit` - Items per page
- `search` - Search term

#### Get ATM Claim Details
**GET** `/api/branch/atm-claims/{id}`

#### Verify ATM Claim
**POST** `/api/branch/atm-claims/{id}/verify`
```json
{
  "verificationStatus": "VERIFIED",
  "verificationNotes": "Checked with bank records",
  "verifiedAmount": 500000,
  "attachments": ["proof.pdf"]
}
```

#### Assign ATM Claim
**POST** `/api/branch/atm-claims/{id}/assign`
```json
{
  "assigneeId": "user-id",
  "assignmentNotes": "Please handle this urgent claim"
}
```

#### Collaborate on ATM Claim
**POST** `/api/branch/atm-claims/{id}/collaborate`
```json
{
  "targetBranchId": "branch-id",
  "message": "Need assistance with this claim",
  "attachments": ["document.pdf"]
}
```

#### Add Journal Entry
**POST** `/api/branch/atm-claims/{id}/journal`
```json
{
  "content": "Journal entry text",
  "type": "NOTE",
  "attachments": ["file-id"]
}
```

#### Upload Attachment
**POST** `/api/branch/atm-claims/{id}/upload`
```json
{
  "files": ["multipart/form-data"]
}
```

#### Get Claim Attachments
**GET** `/api/branch/atm-claims/{id}/attachments`

---

### Branch Management

#### List Branches
**GET** `/api/branches`

#### Get Branch Details
**GET** `/api/branches/{id}`

#### Get Branch Users
**GET** `/api/branches/{id}/users`

#### Create Branch (Admin)
**POST** `/api/admin/branches`
```json
{
  "code": "BR001",
  "name": "Cabang Manado",
  "address": "Jl. Sam Ratulangi No. 1",
  "city": "Manado",
  "province": "Sulawesi Utara",
  "postalCode": "95111",
  "phone": "0431-123456",
  "email": "manado@banksulutgo.co.id",
  "isActive": true
}
```

#### Update Branch (Admin)
**PUT** `/api/admin/branches/{id}`

#### Delete Branch (Admin)
**DELETE** `/api/admin/branches/{id}`

---

### ATM Management

#### List ATMs
**GET** `/api/admin/atms`

Query Parameters:
- `branchId` - Filter by branch
- `status` - ACTIVE/INACTIVE
- `search` - Search term

#### Get ATM Details
**GET** `/api/admin/atms/{id}`

#### Create ATM
**POST** `/api/admin/atms`
```json
{
  "atmId": "ATM001234",
  "location": "Manado City Mall",
  "branchId": "branch-id",
  "ipAddress": "192.168.1.100",
  "status": "ACTIVE",
  "type": "CRM",
  "vendor": "NCR",
  "model": "SelfServ 22",
  "installedDate": "2024-01-01"
}
```

#### Update ATM
**PUT** `/api/admin/atms/{id}`

#### Delete ATM
**DELETE** `/api/admin/atms/{id}`

#### Lookup ATM
**GET** `/api/atms/lookup?atmId=ATM001234`

---

### Categories & Services

#### List Categories
**GET** `/api/categories`

#### Get Category Details
**GET** `/api/tier-categories/{id}`

#### List Subcategories
**GET** `/api/subcategories`

#### List Items
**GET** `/api/items`

#### List Services
**GET** `/api/services`

#### Get Service Details
**GET** `/api/services/{id}`

#### Get Service Categories
**GET** `/api/services/categories`

#### Get Popular Services
**GET** `/api/services/popular`

#### Get Recent Services
**GET** `/api/services/recent`

#### Get Favorite Services
**GET** `/api/services/favorites`

#### Toggle Favorite Category
**POST** `/api/categories/favorites/{categoryId}`

---

### Reports

#### Admin Reports

##### Service Catalog Report
**GET** `/api/reports/admin/service-catalog`

##### SLA Performance Report
**GET** `/api/reports/admin/sla-performance`

##### User Analytics Report
**GET** `/api/reports/admin/user-analytics`

##### Device Analytics Report
**GET** `/api/reports/admin/device-analytics`

#### Business Reports

##### Customer Experience Report
**GET** `/api/reports/business/customer-experience`

##### Operational Excellence Report
**GET** `/api/reports/business/operational-excellence`

#### Infrastructure Reports

##### ATM Intelligence Report
**GET** `/api/reports/infrastructure/atm-intelligence`

##### Technical Trends Report
**GET** `/api/reports/infrastructure/technical-trends`

#### Manager Reports

##### Approval Workflow Report
**GET** `/api/reports/manager/approval-workflow`

##### Branch Operations Report
**GET** `/api/reports/manager/branch-operations`

##### Team Performance Report
**GET** `/api/reports/manager/team-performance`

#### Technician Reports

##### Technician Performance Report
**GET** `/api/reports/technician/performance`

##### Task Execution Report
**GET** `/api/reports/technician/task-execution`

##### Technical Issues Report
**GET** `/api/reports/technician/technical-issues`

##### Tickets Summary Report
**GET** `/api/reports/technician/tickets-summary`

#### Compliance Reports

##### Security Report
**GET** `/api/reports/compliance/security`

##### System Health Report
**GET** `/api/reports/compliance/system-health`

#### Analytics Reports

##### Tickets by Status
**GET** `/api/reports/analytics/requests-by-status`

##### Tickets by Priority
**GET** `/api/reports/analytics/requests-by-priority`

##### Tickets by Category
**GET** `/api/reports/analytics/requests-by-category`

##### Tickets by Department
**GET** `/api/reports/analytics/requests-by-department`

##### Tickets by Technician
**GET** `/api/reports/analytics/requests-by-technician`

##### Tickets by Created Date
**GET** `/api/reports/analytics/requests-by-created-date`

##### Priority Health Report
**GET** `/api/reports/analytics/priority-health`

#### Query Parameters for Reports:
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `branchId` - Filter by branch
- `format` - Output format (json/pdf/excel)

---

### Monitoring

#### ATM Monitoring

##### Get ATM Status
**GET** `/api/monitoring/atms/status`

##### Ping ATM
**POST** `/api/monitoring/atms/ping`
```json
{
  "atmId": "ATM001234"
}
```

##### Get ATM Metrics
**GET** `/api/monitoring/atms/metrics`

##### Get ATM Incidents
**GET** `/api/monitoring/atms/incidents`

#### Branch Monitoring

##### Ping Branch Network
**POST** `/api/monitoring/branches/ping`
```json
{
  "branchId": "branch-id"
}
```

#### Network Monitoring

##### Get Network Status
**GET** `/api/monitoring/network/status`

##### Get Network Health
**GET** `/api/monitoring/network/health`

##### Get Network Performance
**GET** `/api/monitoring/network/performance`

##### Get Network Incidents
**GET** `/api/monitoring/network/incidents`

##### Create Incident Ticket
**POST** `/api/incidents/{id}/create-ticket`
```json
{
  "priority": "HIGH",
  "assignToGroupId": "network-team-id"
}
```

#### Monitoring Control

##### Start/Stop Monitoring
**POST** `/api/monitoring/control`
```json
{
  "action": "start",
  "target": "atm",
  "targetId": "ATM001234"
}
```

---

### Vendors

#### List Vendors
**GET** `/api/vendors`

#### Get Vendor Details
**GET** `/api/vendors/{id}`

#### Create Vendor
**POST** `/api/vendors`
```json
{
  "name": "NCR Corporation",
  "code": "NCR001",
  "contactPerson": "John Smith",
  "email": "john@ncr.com",
  "phone": "021-5551234",
  "address": "Jakarta",
  "services": ["ATM Maintenance", "Hardware Support"],
  "contractStart": "2024-01-01",
  "contractEnd": "2024-12-31",
  "slaResponseTime": 4,
  "slaResolutionTime": 24
}
```

#### Update Vendor
**PUT** `/api/vendors/{id}`

#### Delete Vendor
**DELETE** `/api/vendors/{id}`

#### Get Vendor Tickets
**GET** `/api/vendors/{id}/tickets`

#### Get Vendor Ticket Details
**GET** `/api/vendors/{id}/tickets/{ticketId}`

#### Update Vendor Ticket
**PUT** `/api/vendors/{id}/tickets/{ticketId}`
```json
{
  "vendorStatus": "IN_PROGRESS",
  "vendorNotes": "Technician dispatched",
  "estimatedResolution": "2024-12-29T10:00:00Z"
}
```

---

### Admin Operations

#### User Management

##### List Users
**GET** `/api/admin/users`

##### Get User Details
**GET** `/api/admin/users/{id}`

##### Create User
**POST** `/api/admin/users`
```json
{
  "email": "newuser@banksulutgo.co.id",
  "name": "New User",
  "password": "TempPassword123!",
  "role": "USER",
  "branchId": "branch-id",
  "phone": "081234567890",
  "isActive": true
}
```

##### Update User
**PUT** `/api/admin/users/{id}`

##### Toggle User Active Status
**POST** `/api/admin/users/{id}/toggle-active`

##### Unlock User Account
**POST** `/api/admin/users/{id}/unlock`

#### Support Groups

##### List Support Groups
**GET** `/api/admin/support-groups`

##### Create Support Group
**POST** `/api/admin/support-groups`
```json
{
  "name": "Network Team",
  "description": "Network infrastructure support",
  "email": "network@banksulutgo.co.id",
  "isActive": true
}
```

##### Update Support Group
**PUT** `/api/admin/support-groups/{id}`

##### Delete Support Group
**DELETE** `/api/admin/support-groups/{id}`

#### Service Management

##### List Services
**GET** `/api/admin/services`

##### Create Service
**POST** `/api/admin/services`
```json
{
  "name": "Password Reset",
  "description": "Reset user password",
  "categoryId": "category-id",
  "subcategoryId": "subcategory-id",
  "itemId": "item-id",
  "supportGroupId": "group-id",
  "slaResponseTime": 1,
  "slaResolutionTime": 4,
  "priority": "MEDIUM",
  "requiresApproval": false,
  "isActive": true
}
```

##### Update Service
**PUT** `/api/admin/services/{id}`

##### Delete Service
**DELETE** `/api/admin/services/{id}`

##### Get Service Field Templates
**GET** `/api/admin/services/{id}/field-templates`

##### Add Field Template to Service
**POST** `/api/admin/services/{id}/field-templates`
```json
{
  "fieldTemplateId": "template-id",
  "isRequired": true,
  "displayOrder": 1
}
```

#### Field Templates

##### List Field Templates
**GET** `/api/admin/field-templates`

##### Create Field Template
**POST** `/api/admin/field-templates`
```json
{
  "name": "Employee ID",
  "label": "Employee ID",
  "type": "TEXT",
  "required": true,
  "placeholder": "Enter your employee ID",
  "validation": "^[0-9]{6}$",
  "options": null,
  "defaultValue": "",
  "helpText": "6-digit employee number"
}
```

##### Update Field Template
**PUT** `/api/admin/field-templates/{id}`

##### Delete Field Template
**DELETE** `/api/admin/field-templates/{id}`

#### Task Templates

##### List Task Templates
**GET** `/api/task-templates`

##### Create Task Template
**POST** `/api/task-templates`
```json
{
  "name": "Standard Maintenance",
  "description": "Regular maintenance tasks",
  "tasks": [
    {
      "title": "Check system logs",
      "description": "Review system logs for errors",
      "order": 1,
      "estimatedMinutes": 15
    },
    {
      "title": "Run diagnostics",
      "description": "Execute diagnostic tools",
      "order": 2,
      "estimatedMinutes": 30
    }
  ],
  "serviceIds": ["service-id-1", "service-id-2"]
}
```

##### Update Task Template
**PUT** `/api/task-templates/{id}`

##### Delete Task Template
**DELETE** `/api/task-templates/{id}`

#### API Key Management

##### List API Keys
**GET** `/api/admin/api-keys`

##### Create API Key
**POST** `/api/admin/api-keys`
```json
{
  "name": "External System Integration",
  "description": "API key for external system",
  "permissions": ["READ", "WRITE"],
  "services": ["TICKET_STATUS", "ATM_CLAIMS"],
  "expiresAt": "2025-12-31T23:59:59Z",
  "ipWhitelist": ["192.168.1.0/24"],
  "rateLimit": 1000
}
```

##### Revoke API Key
**DELETE** `/api/admin/api-keys/{id}`

#### Import Operations

##### Import Users
**POST** `/api/admin/import/users`
```
Content-Type: multipart/form-data
file: users.csv
```

##### Import Branches
**POST** `/api/admin/import/branches`

##### Import ATMs
**POST** `/api/admin/import/atms`

##### Import Categories
**POST** `/api/admin/import/categories`

##### Import Services
**POST** `/api/admin/import/services`

##### Undo Import
**POST** `/api/admin/import/undo`
```json
{
  "importId": "import-id"
}
```

#### System Operations

##### Database Cleanup
**POST** `/api/admin/cleanup`
```json
{
  "target": "old_tickets",
  "daysOld": 365,
  "dryRun": true
}
```

##### Get Activity Logs
**GET** `/api/admin/activity-logs`

Query Parameters:
- `userId` - Filter by user
- `action` - Filter by action type
- `startDate` - Start date
- `endDate` - End date

##### Get Login Attempts
**GET** `/api/auth/login-attempts`

---

### Knowledge Base

#### List Knowledge Articles
**GET** `/api/knowledge`

Query Parameters:
- `search` - Search term
- `category` - Category filter
- `tags` - Tag filter (comma-separated)
- `status` - DRAFT/PUBLISHED/ARCHIVED

#### Get Article Details
**GET** `/api/knowledge/{id}`

#### Create Article
**POST** `/api/knowledge`
```json
{
  "title": "How to Reset Password",
  "content": "Article content in markdown",
  "category": "User Guide",
  "tags": ["password", "security", "authentication"],
  "status": "DRAFT",
  "attachments": ["file-id"]
}
```

#### Update Article
**PUT** `/api/knowledge/{id}`

#### Delete Article
**DELETE** `/api/knowledge/{id}`

#### Get Article Comments
**GET** `/api/knowledge/{id}/comments`

#### Add Article Comment
**POST** `/api/knowledge/{id}/comments`
```json
{
  "content": "Great article!",
  "rating": 5
}
```

#### Article Feedback
**POST** `/api/knowledge/{id}/feedback`
```json
{
  "helpful": true,
  "feedback": "This solved my problem"
}
```

#### Get Article Attachments
**GET** `/api/knowledge/{id}/attachments`

#### Download Article Attachment
**GET** `/api/knowledge/{id}/attachments/{attachmentId}/download`

---

### Notifications

#### Get User Notifications
**GET** `/api/notifications`

Query Parameters:
- `unreadOnly` - Show only unread (boolean)
- `type` - Filter by type
- `limit` - Number of notifications

#### Mark Notifications as Read
**POST** `/api/notifications/mark-read`
```json
{
  "notificationIds": ["id1", "id2"]
}
```

#### Get Ticket Notifications
**GET** `/api/notifications/tickets`

---

### PC Assets

#### List PC Assets
**GET** `/api/admin/pc-assets`

Query Parameters:
- `branchId` - Filter by branch
- `type` - DESKTOP/LAPTOP/SERVER
- `status` - ACTIVE/INACTIVE/MAINTENANCE

#### Get PC Asset Details
**GET** `/api/admin/pc-assets/{id}`

#### Create PC Asset
**POST** `/api/admin/pc-assets`
```json
{
  "assetTag": "PC-2024-001",
  "hostname": "PC-MANADO-001",
  "type": "DESKTOP",
  "brand": "Dell",
  "model": "OptiPlex 7090",
  "serialNumber": "DLL123456",
  "processor": "Intel Core i7-11700",
  "memory": "16GB DDR4",
  "storage": "512GB NVMe SSD",
  "operatingSystem": "Windows 11 Pro",
  "branchId": "branch-id",
  "userId": "assigned-user-id",
  "purchaseDate": "2024-01-15",
  "warrantyExpiry": "2027-01-15",
  "status": "ACTIVE"
}
```

#### Update PC Asset
**PUT** `/api/admin/pc-assets/{id}`

#### Delete PC Asset
**DELETE** `/api/admin/pc-assets/{id}`

#### Get Service Logs
**GET** `/api/admin/pc-assets/{id}/service-logs`

#### Bulk Import PC Assets
**POST** `/api/admin/pc-assets/bulk-import`
```
Content-Type: multipart/form-data
file: assets.csv
```

#### OS License Management

##### List OS Licenses
**GET** `/api/admin/os-licenses`

##### Create OS License
**POST** `/api/admin/os-licenses`
```json
{
  "licenseKey": "XXXXX-XXXXX-XXXXX-XXXXX",
  "product": "Windows 11 Pro",
  "vendor": "Microsoft",
  "purchaseDate": "2024-01-01",
  "expiryDate": "2025-01-01",
  "seats": 100,
  "usedSeats": 45,
  "cost": 15000000
}
```

##### Update OS License
**PUT** `/api/admin/os-licenses/{id}`

##### Delete OS License
**DELETE** `/api/admin/os-licenses/{id}`

#### Office License Management

##### List Office Licenses
**GET** `/api/admin/office-licenses`

##### Create Office License
**POST** `/api/admin/office-licenses`
```json
{
  "licenseKey": "XXXXX-XXXXX-XXXXX-XXXXX",
  "product": "Microsoft Office 365",
  "plan": "Business Premium",
  "purchaseDate": "2024-01-01",
  "expiryDate": "2025-01-01",
  "seats": 200,
  "usedSeats": 150,
  "cost": 25000000
}
```

##### Update Office License
**PUT** `/api/admin/office-licenses/{id}`

##### Delete Office License
**DELETE** `/api/admin/office-licenses/{id}`

#### Antivirus License Management

##### List Antivirus Licenses
**GET** `/api/admin/pc-assets/antivirus-licenses`

##### Create Antivirus License
**POST** `/api/admin/pc-assets/antivirus-licenses`
```json
{
  "licenseKey": "AV-XXXXX-XXXXX",
  "product": "Kaspersky Endpoint Security",
  "vendor": "Kaspersky",
  "purchaseDate": "2024-01-01",
  "expiryDate": "2025-01-01",
  "seats": 300,
  "usedSeats": 250,
  "cost": 18000000
}
```

##### Update Antivirus License
**PUT** `/api/admin/pc-assets/antivirus-licenses/{id}`

##### Delete Antivirus License
**DELETE** `/api/admin/pc-assets/antivirus-licenses/{id}`

---

### File Upload

#### Upload File
**POST** `/api/upload`
```
Content-Type: multipart/form-data
file: [binary data]
```

Response:
```json
{
  "id": "file-id",
  "filename": "document.pdf",
  "size": 1024000,
  "mimeType": "application/pdf",
  "url": "/api/files/document.pdf"
}
```

#### Download File
**GET** `/api/files/{filename}`

---

### Dashboard & Analytics

#### Get Dashboard Data
**GET** `/api/dashboard`

Response includes:
- Ticket statistics
- SLA metrics
- Recent activities
- Performance indicators

#### Manager Dashboard
**GET** `/api/manager/dashboard`

#### Security Dashboard
**GET** `/api/security/dashboard`

---

### Approvals

#### List Pending Approvals
**GET** `/api/approvals`

Query Parameters:
- `status` - PENDING/APPROVED/REJECTED
- `type` - Approval type

#### Approve/Reject Request
**POST** `/api/approvals/{id}`
```json
{
  "action": "APPROVE",
  "comments": "Approved for processing"
}
```

---

### Testing & Debug

#### Test Database Connection
**GET** `/api/test-db`

#### Get Client IP
**GET** `/api/test-ip`

#### Debug Session
**GET** `/api/debug/session`

---

## WebSocket Events

Connect to: `wss://servicedesk.banksulutgo.co.id/socket.io`

### Events

#### Client → Server

##### Join Room
```javascript
socket.emit('join', { ticketId: 'ticket-id' });
```

##### Leave Room
```javascript
socket.emit('leave', { ticketId: 'ticket-id' });
```

##### Send Message
```javascript
socket.emit('message', {
  ticketId: 'ticket-id',
  content: 'Message content'
});
```

#### Server → Client

##### Ticket Updated
```javascript
socket.on('ticket:updated', (data) => {
  // Handle ticket update
});
```

##### New Comment
```javascript
socket.on('comment:new', (data) => {
  // Handle new comment
});
```

##### Status Changed
```javascript
socket.on('status:changed', (data) => {
  // Handle status change
});
```

##### User Typing
```javascript
socket.on('user:typing', (data) => {
  // Show typing indicator
});
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Default**: 100 requests per minute
- **Search endpoints**: 30 requests per minute
- **Report generation**: 10 requests per minute
- **File uploads**: 20 requests per hour

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1735388400
```

---

## Pagination

All list endpoints support pagination:

```
GET /api/tickets?page=1&limit=20
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Filtering & Sorting

Most list endpoints support:

### Filtering
```
GET /api/tickets?status=OPEN&priority=HIGH&branchId=BR001
```

### Sorting
```
GET /api/tickets?sortBy=createdAt&sortOrder=desc
```

### Search
```
GET /api/tickets?search=printer&searchFields=title,description
```

---

## Webhook Integration

Configure webhooks for real-time notifications:

### Webhook Events
- `ticket.created`
- `ticket.updated`
- `ticket.status_changed`
- `ticket.assigned`
- `ticket.resolved`
- `ticket.closed`
- `comment.added`
- `approval.required`
- `approval.completed`
- `atm.offline`
- `atm.online`

### Webhook Payload
```json
{
  "event": "ticket.created",
  "timestamp": "2024-12-28T10:30:00Z",
  "data": {
    // Event-specific data
  }
}
```

---

## API Versioning

The API uses URL versioning. Current version: v1 (implied, not in URL).

Future versions will be accessed via:
```
/api/v2/tickets
```

---

## SDK & Client Libraries

### JavaScript/TypeScript
```javascript
import { ServiceDeskClient } from '@banksulutgo/servicedesk-sdk';

const client = new ServiceDeskClient({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://servicedesk.banksulutgo.co.id'
});

const tickets = await client.tickets.list({
  status: 'OPEN',
  priority: 'HIGH'
});
```

### cURL Examples

#### Create Ticket
```bash
curl -X POST https://servicedesk.banksulutgo.co.id/api/tickets \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Printer Issue",
    "description": "Printer not working",
    "priority": "MEDIUM"
  }'
```

#### Get Ticket Status
```bash
curl https://servicedesk.banksulutgo.co.id/api/tickets/TKT-001 \
  -H "X-API-Key: YOUR_API_KEY"
```

---

## Support & Resources

- **API Status**: https://status.banksulutgo.co.id
- **Developer Portal**: https://developers.banksulutgo.co.id
- **Support Email**: it-support@banksulutgo.co.id
- **Documentation**: https://docs.banksulutgo.co.id/servicedesk

---

## Changelog

### Version 2.4.2 (Current)
- Added password reset functionality
- Improved ATM claim processing
- Enhanced reporting capabilities
- Fixed Prisma client initialization issues

### Version 2.4.1
- Added vendor management
- Improved PC asset tracking
- Enhanced security features

### Version 2.4.0
- Initial public API release
- ITIL v4 compliance
- Multi-branch support

---

*Last Updated: December 28, 2024*