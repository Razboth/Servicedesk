# Bank SulutGo ServiceDesk API Endpoints Reference

## Complete API Endpoint Documentation

This document provides detailed documentation for all API endpoints in the Bank SulutGo ServiceDesk application. Each endpoint includes request/response formats, authentication requirements, and usage examples.

---

## Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [Ticket Management APIs](#ticket-management-apis)
3. [Admin Management APIs](#admin-management-apis)
4. [Monitoring APIs](#monitoring-apis)
5. [Report Generation APIs](#report-generation-apis)
6. [Public APIs](#public-apis)
7. [Manager APIs](#manager-apis)
8. [Branch APIs](#branch-apis)
9. [Service Management APIs](#service-management-apis)
10. [File Management APIs](#file-management-apis)

---

## Authentication APIs

### POST `/api/auth/[...nextauth]`
NextAuth.js dynamic route handling authentication operations.

**Authentication**: None (public endpoint)

**Operations**:
- `signin`: Authenticate user
- `signout`: End session
- `session`: Get current session
- `csrf`: Get CSRF token

**Example - Sign In**:
```bash
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123",
    "csrfToken": "token_here"
  }'
```

---

### POST `/api/auth/change-password`
Change the authenticated user's password.

**Authentication**: Required (Session)

**Request Body**:
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Response - Success (200)**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Response - Error (400)**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "Current password is incorrect"
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "currentPassword": "oldpass123",
    "newPassword": "newpass456"
  }'
```

---

### POST `/api/auth/forgot-password`
Initiate password reset process.

**Authentication**: None

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response - Success (200)**:
```json
{
  "success": true,
  "message": "Password reset instructions sent to email if account exists"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@banksulutgo.co.id"}'
```

---

### POST `/api/auth/reset-password`
Reset password using token from email.

**Authentication**: None

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "newPassword": "string"
}
```

**Response - Success (200)**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### GET `/api/auth/activity`
Get authentication activity logs for the current user.

**Authentication**: Required (Session)

**Query Parameters**:
- `limit`: Number of records (default: 50)
- `offset`: Skip records for pagination

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "string",
        "action": "LOGIN",
        "timestamp": "2024-01-01T00:00:00Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "success": true
      }
    ],
    "total": 100
  }
}
```

---

### GET `/api/auth/login-attempts`
Get login attempt history (admin only).

**Authentication**: Required (Session, Admin role)

**Query Parameters**:
- `userId`: Filter by user ID
- `status`: success or failed
- `startDate`: Filter from date
- `endDate`: Filter to date

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "attempts": [
      {
        "id": "string",
        "username": "user123",
        "timestamp": "2024-01-01T00:00:00Z",
        "ipAddress": "192.168.1.1",
        "success": false,
        "reason": "Invalid password"
      }
    ]
  }
}
```

---

## Ticket Management APIs

### GET `/api/tickets`
List tickets with filtering and pagination.

**Authentication**: Required (Session or API Key)

**Query Parameters**:
- `status`: Comma-separated values (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- `priority`: Comma-separated values (LOW, MEDIUM, HIGH, URGENT, CRITICAL)
- `assignedTo`: Technician ID
- `branchId`: Branch ID
- `categoryId`: Service category ID
- `page`: Page number (default: 1)
- `limit`: Items per page (max: 200, default: 10)
- `search`: Search in title/description
- `sortBy`: Sort field (createdAt, priority, status)
- `sortOrder`: asc or desc
- `slaStatus`: within, at_risk, or breached
- `includeConfidential`: Include confidential tickets (boolean)
- `createdAfter`: ISO date string
- `createdBefore`: ISO date string

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "clxxx...",
        "ticketNumber": "TKT-2024-00001",
        "title": "Network Issue at Branch",
        "description": "Internet connection down",
        "status": "OPEN",
        "priority": "HIGH",
        "category": "INCIDENT",
        "issueClassification": "NETWORK_ISSUE",
        "createdAt": "2024-01-01T08:00:00Z",
        "updatedAt": "2024-01-01T08:00:00Z",
        "createdBy": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "assignedTo": {
          "id": "tech_id",
          "name": "Tech Support",
          "email": "tech@example.com"
        },
        "branch": {
          "id": "branch_id",
          "name": "Cabang Utama",
          "code": "001"
        },
        "service": {
          "id": "service_id",
          "name": "Network Support",
          "code": "NET-001"
        },
        "slaStatus": "within",
        "responseTime": 2,
        "resolutionTime": null,
        "slaResponseHours": 4,
        "slaResolutionHours": 24
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 250,
      "totalPages": 25
    },
    "stats": {
      "open": 45,
      "inProgress": 60,
      "resolved": 80,
      "closed": 65
    }
  }
}
```

**Example - Get High Priority Open Tickets**:
```bash
curl -X GET "http://localhost:3000/api/tickets?status=OPEN&priority=HIGH,URGENT&sortBy=priority" \
  -H "Cookie: next-auth.session-token=..."
```

---

### POST `/api/tickets`
Create a new ticket.

**Authentication**: Required (Session or API Key)

**Request Body**:
```json
{
  "title": "Printer not working",
  "description": "The printer in accounting department is showing error",
  "serviceId": "service_id",
  "priority": "MEDIUM",
  "category": "INCIDENT",
  "issueClassification": "HARDWARE_FAILURE",
  "categoryId": "category_id",
  "subcategoryId": "subcategory_id",
  "itemId": "item_id",
  "branchId": "branch_id",
  "fieldValues": [
    {
      "fieldId": "field_1",
      "value": "HP LaserJet 1020"
    }
  ],
  "attachments": [
    {
      "filename": "error_screenshot.png",
      "mimeType": "image/png",
      "size": 102400,
      "content": "base64_encoded_image_data"
    }
  ],
  "isConfidential": false,
  "securityClassification": "LOW"
}
```

**Response - Success (201)**:
```json
{
  "success": true,
  "data": {
    "id": "ticket_id",
    "ticketNumber": "TKT-2024-00002",
    "status": "OPEN",
    "priority": "MEDIUM",
    "createdAt": "2024-01-01T09:00:00Z",
    "slaResponseTime": "2024-01-01T13:00:00Z",
    "slaResolutionTime": "2024-01-02T09:00:00Z"
  },
  "message": "Ticket created successfully"
}
```

**Example - Create Ticket with API Key**:
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "title": "ATM Cash Out",
    "description": "ATM terminal out of cash",
    "serviceId": "atm_service_id",
    "priority": "HIGH"
  }'
```

---

### GET `/api/tickets/[id]`
Get detailed information about a specific ticket.

**Authentication**: Required (Session or API Key)

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "id": "ticket_id",
    "ticketNumber": "TKT-2024-00001",
    "title": "Network Issue",
    "description": "Complete network failure",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "category": "INCIDENT",
    "createdAt": "2024-01-01T08:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z",
    "resolvedAt": null,
    "closedAt": null,
    "createdBy": { /* user object */ },
    "assignedTo": { /* technician object */ },
    "branch": { /* branch object */ },
    "service": { /* service object */ },
    "comments": [
      {
        "id": "comment_id",
        "content": "Working on the issue",
        "createdAt": "2024-01-01T09:00:00Z",
        "createdBy": { /* user object */ }
      }
    ],
    "attachments": [
      {
        "id": "attachment_id",
        "filename": "screenshot.png",
        "mimeType": "image/png",
        "size": 51200
      }
    ],
    "tasks": [
      {
        "id": "task_id",
        "title": "Check router",
        "completed": true
      }
    ],
    "auditLogs": [
      {
        "action": "STATUS_CHANGE",
        "oldValue": "OPEN",
        "newValue": "IN_PROGRESS",
        "timestamp": "2024-01-01T09:00:00Z",
        "user": { /* user object */ }
      }
    ]
  }
}
```

---

### PUT `/api/tickets/[id]/status`
Update ticket status.

**Authentication**: Required (Session)

**Request Body**:
```json
{
  "status": "IN_PROGRESS",
  "comment": "Starting investigation",
  "resolutionDetails": "Issue resolved by restarting service"
}
```

**Business Rules**:
- OPEN → IN_PROGRESS: Requires assignment
- IN_PROGRESS → RESOLVED: Requires resolution details
- RESOLVED → CLOSED: May require approval for high priority
- Cannot skip status levels

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "id": "ticket_id",
    "status": "IN_PROGRESS",
    "updatedAt": "2024-01-01T10:00:00Z"
  },
  "message": "Status updated successfully"
}
```

---

### POST `/api/tickets/[id]/assign`
Assign ticket to a technician.

**Authentication**: Required (Session, Manager or Admin role)

**Request Body**:
```json
{
  "technicianId": "technician_user_id",
  "reassignmentReason": "Specialized expertise required"
}
```

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "id": "ticket_id",
    "assignedTo": {
      "id": "technician_id",
      "name": "Tech Support",
      "email": "tech@example.com"
    },
    "assignedAt": "2024-01-01T10:00:00Z"
  }
}
```

---

### POST `/api/tickets/[id]/comments`
Add comment to a ticket.

**Authentication**: Required (Session)

**Request Body**:
```json
{
  "content": "Updated the firmware, testing now",
  "isInternal": false,
  "attachments": [
    {
      "filename": "test_results.pdf",
      "mimeType": "application/pdf",
      "size": 204800,
      "content": "base64_encoded_pdf"
    }
  ]
}
```

**Response - Success (201)**:
```json
{
  "success": true,
  "data": {
    "id": "comment_id",
    "content": "Updated the firmware, testing now",
    "createdAt": "2024-01-01T11:00:00Z",
    "createdBy": {
      "id": "user_id",
      "name": "Technician Name"
    },
    "attachments": [
      {
        "id": "attachment_id",
        "filename": "test_results.pdf"
      }
    ]
  }
}
```

---

### POST `/api/tickets/bulk/assign`
Assign multiple tickets to a technician.

**Authentication**: Required (Session, Manager or Admin role)

**Request Body**:
```json
{
  "ticketIds": ["ticket1", "ticket2", "ticket3"],
  "technicianId": "technician_id",
  "reason": "Batch assignment for efficiency"
}
```

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "assigned": 3,
    "failed": 0,
    "results": [
      {
        "ticketId": "ticket1",
        "success": true
      },
      {
        "ticketId": "ticket2",
        "success": true
      },
      {
        "ticketId": "ticket3",
        "success": true
      }
    ]
  }
}
```

---

### POST `/api/tickets/atm-claim`
Create ATM transaction claim ticket.

**Authentication**: Required (Session or API Key)

**Request Body**:
```json
{
  "atmId": "atm_terminal_id",
  "claimType": "CASH_DISCREPANCY",
  "amount": 500000,
  "transactionDate": "2024-01-01T14:30:00Z",
  "accountNumber": "1234567890",
  "customerName": "John Doe",
  "customerPhone": "08123456789",
  "description": "ATM dispensed less cash than requested",
  "referenceNumber": "TRX20240101143000",
  "attachments": [
    {
      "filename": "receipt.jpg",
      "mimeType": "image/jpeg",
      "size": 512000,
      "content": "base64_encoded_image"
    }
  ]
}
```

**Response - Success (201)**:
```json
{
  "success": true,
  "data": {
    "ticketNumber": "ATM-2024-00001",
    "status": "OPEN",
    "priority": "HIGH",
    "estimatedResolution": "2024-01-03T00:00:00Z",
    "claimId": "claim_id"
  }
}
```

---

## Admin Management APIs

### GET `/api/admin/users`
List all users with filtering.

**Authentication**: Required (Session, Admin role)

**Query Parameters**:
- `search`: Search by name, email, phone
- `role`: Filter by role (comma-separated)
- `branchId`: Filter by branch
- `supportGroupId`: Filter by support group
- `status`: active or inactive
- `page`: Page number
- `limit`: Items per page

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "username": "johndoe",
        "name": "John Doe",
        "email": "john@banksulutgo.co.id",
        "phone": "08123456789",
        "role": "TECHNICIAN",
        "isActive": true,
        "loginAttempts": 0,
        "lockedAt": null,
        "lastActivity": "2024-01-01T15:00:00Z",
        "createdAt": "2023-01-01T00:00:00Z",
        "branch": {
          "id": "branch_id",
          "name": "Cabang Utama",
          "code": "001"
        },
        "supportGroup": {
          "id": "group_id",
          "name": "IT Support",
          "code": "ITS"
        },
        "_count": {
          "createdTickets": 45,
          "assignedTickets": 120
        }
      }
    ],
    "total": 150,
    "page": 1,
    "totalPages": 15
  }
}
```

---

### POST `/api/admin/users`
Create new user account.

**Authentication**: Required (Session, Admin role)

**Request Body**:
```json
{
  "username": "newuser",
  "name": "New User",
  "email": "newuser@banksulutgo.co.id",
  "password": "SecureP@ssw0rd",
  "role": "TECHNICIAN",
  "branchId": "branch_id",
  "supportGroupId": "group_id",
  "phone": "08123456789",
  "mustChangePassword": true
}
```

**Validation Rules**:
- Username: 3-50 characters, alphanumeric and underscore only
- Email: Valid email format, must be unique
- Password: Minimum 8 characters, must contain uppercase, lowercase, number
- Phone: Valid Indonesian phone number format

**Response - Success (201)**:
```json
{
  "success": true,
  "data": {
    "id": "new_user_id",
    "username": "newuser",
    "email": "newuser@banksulutgo.co.id",
    "role": "TECHNICIAN",
    "createdAt": "2024-01-01T16:00:00Z"
  },
  "message": "User created successfully"
}
```

---

### GET `/api/admin/services`
List all services with categorization.

**Authentication**: Required (Session, Admin role)

**Query Parameters**:
- `categoryId`: Filter by tier 1 category
- `subcategoryId`: Filter by tier 2 category
- `itemId`: Filter by tier 3 category
- `supportGroupId`: Filter by support group
- `isActive`: true or false
- `search`: Search in name or description

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "service_id",
        "name": "Password Reset",
        "code": "SVC-001",
        "description": "Reset user password",
        "tier1Category": {
          "id": "cat_id",
          "name": "User Management"
        },
        "tier2Category": {
          "id": "subcat_id",
          "name": "Access Control"
        },
        "tier3Category": {
          "id": "item_id",
          "name": "Credentials"
        },
        "supportGroup": {
          "id": "group_id",
          "name": "IT Security"
        },
        "priority": "MEDIUM",
        "slaResponseHours": 2,
        "slaResolutionHours": 8,
        "requiresApproval": false,
        "isActive": true,
        "fieldTemplates": [
          {
            "id": "field_id",
            "label": "User ID",
            "name": "userId",
            "type": "text",
            "required": true
          }
        ]
      }
    ],
    "total": 75
  }
}
```

---

### POST `/api/admin/import`
Import data from CSV file.

**Authentication**: Required (Session, Admin role)

**Request Body**:
```json
{
  "type": "services",
  "csvContent": "base64_encoded_csv_content",
  "options": {
    "skipValidation": false,
    "updateExisting": true,
    "dryRun": false,
    "delimiter": ",",
    "encoding": "utf-8"
  }
}
```

**Import Types**:
- `services`: Service catalog
- `users`: User accounts
- `branches`: Branch information
- `categories`: Service categories
- `supportGroups`: Support groups

**CSV Format for Services**:
```csv
Tier_1_Category,Tier_2_SubCategory,Tier_3_Service_Type,Service_Name,SLA_Days,Priority
IT Services,Hardware,Desktop,Computer Repair,2,MEDIUM
IT Services,Software,Installation,Software Install,1,LOW
```

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "importId": "import_id",
    "type": "services",
    "processed": 50,
    "created": 45,
    "updated": 3,
    "failed": 2,
    "errors": [
      {
        "row": 15,
        "error": "Invalid priority value"
      }
    ],
    "summary": {
      "totalRows": 50,
      "successRate": 96.0
    }
  }
}
```

---

### GET `/api/admin/api-keys`
List all API keys.

**Authentication**: Required (Session, Admin role)

**Response - Success (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "key_id",
      "name": "ATM Integration",
      "key": "bsg_ak_**********************",
      "description": "API key for ATM claim submissions",
      "permissions": ["claims:create", "tickets:read"],
      "isActive": true,
      "expiresAt": "2024-12-31T23:59:59Z",
      "lastUsedAt": "2024-01-01T10:00:00Z",
      "usageCount": 150,
      "createdAt": "2023-01-01T00:00:00Z",
      "createdBy": {
        "id": "admin_id",
        "name": "Admin User"
      },
      "linkedUser": null,
      "isExpired": false
    }
  ]
}
```

---

### POST `/api/admin/api-keys`
Create new API key.

**Authentication**: Required (Session, Admin role)

**Request Body**:
```json
{
  "name": "External System Integration",
  "description": "API key for third-party ticket creation",
  "permissions": ["tickets:create", "tickets:read", "tickets:update"],
  "expiresIn": 365,
  "linkedUserId": null,
  "ipRestrictions": ["192.168.1.0/24"],
  "rateLimit": 1000
}
```

**Response - Success (201)**:
```json
{
  "success": true,
  "data": {
    "id": "new_key_id",
    "name": "External System Integration",
    "key": "bsg_ak_1234567890abcdef1234567890abcdef",
    "permissions": ["tickets:create", "tickets:read", "tickets:update"],
    "expiresAt": "2025-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "API key created. Save the key securely - it won't be shown again."
}
```

---

## Monitoring APIs

### GET `/api/monitoring/network/status`
Get real-time network status for branches and ATMs.

**Authentication**: Required (Session)

**Query Parameters**:
- `type`: branch, atm, or all
- `status`: ONLINE, OFFLINE, DEGRADED
- `mediaType`: VSAT, M2M, FO, DSL
- `includeMetrics`: Include performance metrics (boolean)

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "branches": [
      {
        "id": "branch_id",
        "code": "001",
        "name": "Cabang Utama",
        "status": "ONLINE",
        "mediaType": "FO",
        "ipAddress": "10.1.1.1",
        "lastPing": "2024-01-01T16:00:00Z",
        "responseTime": 15,
        "packetLoss": 0,
        "uptime": 99.98,
        "metrics": {
          "avgResponseTime": 20,
          "maxResponseTime": 45,
          "minResponseTime": 12,
          "availability": 99.95
        }
      }
    ],
    "atms": [
      {
        "id": "atm_id",
        "terminalId": "ATM001",
        "status": "ONLINE",
        "location": "Cabang Utama Lobby",
        "lastPing": "2024-01-01T16:00:00Z",
        "responseTime": 25,
        "serviceStatus": {
          "cash": "OK",
          "printer": "OK",
          "cardReader": "OK",
          "network": "OK"
        }
      }
    ],
    "summary": {
      "totalBranches": 80,
      "onlineBranches": 78,
      "offlineBranches": 2,
      "totalATMs": 150,
      "onlineATMs": 145,
      "offlineATMs": 5,
      "overallHealth": 96.5
    },
    "timestamp": "2024-01-01T16:00:00Z"
  }
}
```

---

### POST `/api/monitoring/branches/ping`
Perform ping test on branches.

**Authentication**: Required (Session, Technician role or higher)

**Request Body**:
```json
{
  "branchIds": ["branch1", "branch2"],
  "count": 4,
  "timeout": 5000,
  "packetSize": 32
}
```

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "branchId": "branch1",
        "branchName": "Cabang Utama",
        "ipAddress": "10.1.1.1",
        "status": "SUCCESS",
        "packets": {
          "sent": 4,
          "received": 4,
          "lost": 0,
          "lossPercentage": 0
        },
        "timing": {
          "min": 12,
          "max": 18,
          "avg": 15,
          "stddev": 2.1
        },
        "timestamp": "2024-01-01T16:05:00Z"
      }
    ],
    "summary": {
      "tested": 2,
      "successful": 2,
      "failed": 0
    }
  }
}
```

---

### GET `/api/monitoring/atms/incidents`
Get ATM incidents and alerts.

**Authentication**: Required (Session)

**Query Parameters**:
- `atmId`: Filter by ATM
- `status`: OPEN, ACKNOWLEDGED, RESOLVED
- `severity`: LOW, MEDIUM, HIGH, CRITICAL
- `startDate`: From date
- `endDate`: To date
- `page`: Page number
- `limit`: Items per page

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "incidents": [
      {
        "id": "incident_id",
        "atmId": "atm_id",
        "terminalId": "ATM001",
        "type": "CASH_OUT",
        "severity": "HIGH",
        "status": "OPEN",
        "description": "ATM out of cash",
        "detectedAt": "2024-01-01T14:00:00Z",
        "acknowledgedAt": null,
        "resolvedAt": null,
        "ticket": {
          "id": "ticket_id",
          "ticketNumber": "ATM-2024-00005"
        },
        "metrics": {
          "downtime": 120,
          "affectedTransactions": 15,
          "estimatedLoss": 5000000
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    },
    "stats": {
      "open": 5,
      "acknowledged": 8,
      "resolved": 12
    }
  }
}
```

---

## Report Generation APIs

### GET `/api/reports/tickets/all-tickets`
Generate comprehensive ticket report.

**Authentication**: Required (Session)

**Query Parameters**:
- `startDate`: Report start date (ISO format)
- `endDate`: Report end date (ISO format)
- `status`: Filter by status (comma-separated)
- `priority`: Filter by priority (comma-separated)
- `branchId`: Filter by branch
- `technicianId`: Filter by technician
- `categoryId`: Filter by service category
- `format`: Response format (json, csv, pdf, excel)
- `groupBy`: Group results by (status, priority, branch, technician, category, date)
- `includeDetails`: Include full ticket details (boolean)
- `includeComments`: Include ticket comments (boolean)
- `includeSLA`: Include SLA metrics (boolean)

**Response - Success (200) JSON Format**:
```json
{
  "success": true,
  "data": {
    "reportMetadata": {
      "generatedAt": "2024-01-01T17:00:00Z",
      "generatedBy": "John Doe",
      "period": {
        "from": "2024-01-01T00:00:00Z",
        "to": "2024-01-31T23:59:59Z"
      },
      "filters": {
        "status": ["OPEN", "IN_PROGRESS"],
        "priority": ["HIGH", "CRITICAL"]
      }
    },
    "summary": {
      "totalTickets": 500,
      "openTickets": 100,
      "inProgressTickets": 150,
      "resolvedTickets": 200,
      "closedTickets": 50,
      "avgResolutionTime": 12.5,
      "avgResponseTime": 2.3,
      "slaCompliance": 92.5,
      "slaBreached": 37
    },
    "breakdown": {
      "byStatus": {
        "OPEN": 100,
        "IN_PROGRESS": 150,
        "RESOLVED": 200,
        "CLOSED": 50
      },
      "byPriority": {
        "LOW": 50,
        "MEDIUM": 200,
        "HIGH": 200,
        "CRITICAL": 50
      },
      "byCategory": {
        "INCIDENT": 300,
        "SERVICE_REQUEST": 150,
        "CHANGE_REQUEST": 50
      }
    },
    "trends": [
      {
        "date": "2024-01-01",
        "created": 20,
        "resolved": 15,
        "closed": 10,
        "avgResolutionTime": 10.5
      }
    ],
    "topIssues": [
      {
        "category": "Network Issues",
        "count": 75,
        "percentage": 15
      }
    ],
    "performance": {
      "technicians": [
        {
          "id": "tech_id",
          "name": "Tech Support",
          "resolved": 50,
          "avgResolutionTime": 8.5,
          "slaCompliance": 95
        }
      ],
      "branches": [
        {
          "id": "branch_id",
          "name": "Cabang Utama",
          "tickets": 45,
          "avgResolutionTime": 11.2
        }
      ]
    }
  }
}
```

**Response - CSV Format**:
```csv
Ticket Number,Title,Status,Priority,Created Date,Resolved Date,Resolution Time,SLA Status
TKT-2024-00001,Network Issue,RESOLVED,HIGH,2024-01-01 08:00,2024-01-01 16:00,8,WITHIN
TKT-2024-00002,Printer Error,OPEN,MEDIUM,2024-01-01 09:00,,,AT_RISK
```

---

### GET `/api/reports/admin/sla-performance`
Generate SLA performance report.

**Authentication**: Required (Session, Admin or Manager role)

**Query Parameters**:
- `period`: daily, weekly, monthly, yearly
- `startDate`: Start date
- `endDate`: End date
- `serviceId`: Filter by service
- `branchId`: Filter by branch
- `groupBy`: service, branch, technician, priority

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalTickets": 1000,
      "withinSLA": 920,
      "breachedSLA": 80,
      "complianceRate": 92.0,
      "avgResponseTime": 2.1,
      "avgResolutionTime": 18.5
    },
    "byService": [
      {
        "serviceId": "service_id",
        "serviceName": "Password Reset",
        "tickets": 150,
        "compliance": 95.3,
        "avgResponseTime": 1.5,
        "avgResolutionTime": 6.2,
        "breached": 7
      }
    ],
    "byPriority": {
      "CRITICAL": {
        "compliance": 98.5,
        "avgResponseTime": 0.5,
        "avgResolutionTime": 4.0
      },
      "HIGH": {
        "compliance": 94.2,
        "avgResponseTime": 1.2,
        "avgResolutionTime": 8.5
      }
    },
    "trends": [
      {
        "date": "2024-01-01",
        "compliance": 93.5,
        "tickets": 35,
        "breached": 2
      }
    ]
  }
}
```

---

### GET `/api/reports/manager/team-performance`
Generate team performance report for managers.

**Authentication**: Required (Session, Manager role)

**Query Parameters**:
- `teamId`: Support group ID
- `period`: Period for report
- `includeIndividual`: Include individual technician metrics

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "team": {
      "id": "team_id",
      "name": "IT Support",
      "members": 12
    },
    "performance": {
      "totalTicketsHandled": 450,
      "avgResolutionTime": 10.5,
      "slaCompliance": 93.5,
      "customerSatisfaction": 4.2,
      "firstCallResolution": 78.5
    },
    "technicians": [
      {
        "id": "tech_id",
        "name": "John Technician",
        "ticketsResolved": 45,
        "avgResolutionTime": 9.2,
        "slaCompliance": 95.5,
        "rating": 4.5,
        "specializations": ["Network", "Hardware"]
      }
    ],
    "workload": {
      "distribution": {
        "INCIDENT": 60,
        "SERVICE_REQUEST": 30,
        "CHANGE_REQUEST": 10
      },
      "peakHours": [
        {
          "hour": 9,
          "tickets": 45
        },
        {
          "hour": 14,
          "tickets": 38
        }
      ]
    }
  }
}
```

---

## Public APIs

### POST `/api/public/claims`
Submit claims via external API.

**Authentication**: API Key required

**Headers**:
```
X-API-Key: your-api-key-here
Content-Type: application/json
```

**Request Body**:
```json
{
  "claimType": "REIMBURSEMENT",
  "claimAmount": 2500000,
  "claimCurrency": "IDR",
  "claimDate": "2024-01-01T10:30:00Z",
  "claimReason": "ATM did not dispense cash but account was debited",
  "claimantName": "Customer Name",
  "claimantEmail": "customer@email.com",
  "claimantPhone": "08123456789",
  "claimantDepartment": "Retail Banking",
  "claimantBranchCode": "001",
  "referenceNumber": "ATM/2024/01/001",
  "approverEmail": "manager@banksulutgo.co.id",
  "attachments": [
    {
      "filename": "transaction_receipt.pdf",
      "mimeType": "application/pdf",
      "size": 512000,
      "content": "base64_encoded_pdf_content",
      "description": "Transaction receipt from ATM"
    }
  ],
  "metadata": {
    "atmTerminalId": "ATM001",
    "transactionId": "TXN20240101103000",
    "cardNumber": "****1234"
  }
}
```

**Response - Success (201)**:
```json
{
  "success": true,
  "data": {
    "ticketNumber": "CLM-2024-00123",
    "status": "OPEN",
    "priority": "HIGH",
    "estimatedResolution": "2024-01-03T17:00:00Z",
    "trackingUrl": "https://servicedesk.banksulutgo.co.id/tickets/CLM-2024-00123"
  },
  "message": "Claim submitted successfully"
}
```

**Response - Error (400)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid claim data",
    "details": [
      {
        "field": "claimAmount",
        "message": "Amount must be positive"
      }
    ]
  }
}
```

---

## File Management APIs

### POST `/api/upload`
Upload file to the system.

**Authentication**: Required (Session)

**Request Body**:
```json
{
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "size": 1024000,
  "content": "base64_encoded_content"
}
```

**File Restrictions**:
- Maximum size: 50MB
- Allowed types: pdf, jpg, jpeg, png, gif, doc, docx, xls, xlsx, csv, txt, zip
- Virus scanning performed on all uploads

**Response - Success (200)**:
```json
{
  "success": true,
  "data": {
    "filename": "doc_20240101_160000_xyz.pdf",
    "originalName": "document.pdf",
    "mimeType": "application/pdf",
    "size": 1024000,
    "uploadedAt": "2024-01-01T16:00:00Z",
    "url": "/api/files/doc_20240101_160000_xyz.pdf"
  }
}
```

---

### GET `/api/files/[filename]`
Download file from the system.

**Authentication**: Required (Session)

**Response**: Binary file data with appropriate headers

**Example**:
```bash
curl -X GET http://localhost:3000/api/files/doc_20240101_160000_xyz.pdf \
  -H "Cookie: next-auth.session-token=..." \
  -o downloaded_file.pdf
```

---

## Response Status Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success - Request completed successfully |
| 201 | Created - New resource created successfully |
| 204 | No Content - Request successful, no content to return |
| 400 | Bad Request - Invalid request parameters or body |
| 401 | Unauthorized - Authentication required or invalid |
| 403 | Forbidden - Authenticated but insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists or state conflict |
| 413 | Payload Too Large - Request body exceeds size limit |
| 415 | Unsupported Media Type - Invalid file type or format |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error occurred |
| 503 | Service Unavailable - Service temporarily unavailable |

---

## Rate Limiting

### Session-based Requests
- Default: 100 requests per minute
- Burst: 20 requests per 10 seconds

### API Key Requests
- Default: 1000 requests per hour
- Configurable per key
- Headers returned:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

### Example Rate Limit Response
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704132000
Retry-After: 60

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please retry after 60 seconds."
  }
}
```

---

## Webhooks

### Webhook Events

The system can send webhooks for the following events:
- `ticket.created` - New ticket created
- `ticket.updated` - Ticket updated
- `ticket.assigned` - Ticket assigned to technician
- `ticket.resolved` - Ticket resolved
- `ticket.closed` - Ticket closed
- `sla.warning` - SLA warning threshold reached
- `sla.breached` - SLA breached

### Webhook Payload Format

```json
{
  "event": "ticket.created",
  "timestamp": "2024-01-01T16:00:00Z",
  "data": {
    "ticketId": "ticket_id",
    "ticketNumber": "TKT-2024-00001",
    "title": "Issue Title",
    "priority": "HIGH",
    "status": "OPEN",
    "url": "https://servicedesk.banksulutgo.co.id/tickets/TKT-2024-00001"
  },
  "metadata": {
    "webhookId": "webhook_id",
    "attempt": 1,
    "signature": "sha256_signature"
  }
}
```

### Webhook Security

Webhooks include HMAC-SHA256 signature in `X-Webhook-Signature` header for verification:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
}
```

---

## Error Handling Best Practices

### Client-Side Error Handling

```javascript
async function callAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`/api/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      switch (response.status) {
        case 401:
          // Redirect to login
          window.location.href = '/auth/signin';
          break;
        case 403:
          // Show permission error
          alert('You do not have permission for this action');
          break;
        case 429:
          // Handle rate limiting
          const retryAfter = response.headers.get('Retry-After');
          console.log(`Rate limited. Retry after ${retryAfter} seconds`);
          break;
        default:
          // Generic error handling
          console.error('API Error:', data.error);
      }
      throw new Error(data.error?.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
}
```

### API Key Usage Example

```javascript
const apiKey = 'bsg_ak_your_api_key_here';

async function createTicketWithAPIKey(ticketData) {
  const response = await fetch('/api/tickets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(ticketData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create ticket');
  }

  return response.json();
}
```

---

## Testing APIs

### Using cURL

```bash
# Get tickets with session authentication
curl -X GET "http://localhost:3000/api/tickets?status=OPEN&priority=HIGH" \
  -H "Cookie: next-auth.session-token=your-session-token"

# Create ticket with API key
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -H "X-API-Key: bsg_ak_your_api_key" \
  -d '{
    "title": "Test Ticket",
    "description": "This is a test",
    "serviceId": "service_id",
    "priority": "MEDIUM"
  }'

# Upload file
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "filename": "test.pdf",
    "mimeType": "application/pdf",
    "size": 1024,
    "content": "base64_content_here"
  }'
```

### Using Postman

1. Set up environment variables:
   - `base_url`: http://localhost:3000
   - `api_key`: your-api-key
   - `session_token`: your-session-token

2. Create requests with proper headers:
   - For session auth: Add cookie header with session token
   - For API key auth: Add X-API-Key header

3. Use Postman's test scripts for validation:
```javascript
pm.test("Status is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success flag", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
});
```

---

## API Versioning

Currently, all APIs are at version 1. Future versions will follow this pattern:
- `/api/v1/tickets` - Version 1 (current)
- `/api/v2/tickets` - Version 2 (future)

Deprecated endpoints will include `X-Deprecated` header with sunset date.

---

## Support & Documentation

- **API Status**: https://status.banksulutgo.co.id
- **Support Email**: servicedesk-api@banksulutgo.co.id
- **Internal Docs**: Available on corporate intranet
- **API Playground**: Available in development environment

---

*Last Updated: November 8, 2024*
*Version: 1.0.0*