# Omnichannel API Payloads and Responses

## Table of Contents
- [1. Create Ticket](#1-create-ticket)
- [2. Get Ticket Details](#2-get-ticket-details)
- [3. Update Ticket](#3-update-ticket)
  - [3.1 Add Comment](#31-add-comment)
  - [3.2 Update Status](#32-update-status)
  - [3.3 Add Attachment](#33-add-attachment)
- [4. Batch Status Check](#4-batch-status-check)

---

## 1. Create Ticket

### Endpoint
```
POST /api/omnichannel/tickets
```

### Headers
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "your-api-key-here"
}
```

### Request Payload

#### Complete Example - ATM Card Claim
```json
{
  "channel": "WHATSAPP",
  "channelReferenceId": "WA-2024-001-XYZ",
  "serviceType": "CLAIM",

  "customer": {
    "name": "John Doe",
    "email": "john.doe@email.com",
    "phone": "+6281234567890",
    "identifier": "CIF123456",
    "branchCode": "001",
    "department": "Retail Banking",
    "preferredLanguage": "id"
  },

  "ticket": {
    "title": "ATM Card Claim Request",
    "description": "Customer's ATM card was retained by ATM machine at Mall location",
    "priority": "HIGH",
    "category": "SERVICE_REQUEST",

    "metadata": {
      "claimType": "ATM_CARD_RETAINED",
      "claimAmount": 500000,
      "claimCurrency": "IDR",
      "claimDate": "2024-01-15T10:30:00Z",
      "claimReason": "Card retained by ATM",
      "atmId": "ATM001",
      "transactionId": "TRX123456789",
      "referenceNumber": "REF-2024-001",

      "customFields": {
        "retentionTime": "10:30 AM",
        "witnessPresent": "Yes"
      }
    }
  },

  "attachments": [
    {
      "filename": "atm_receipt.jpg",
      "mimeType": "image/jpeg",
      "size": 102400,
      "content": "base64_encoded_image_content",
      "description": "ATM transaction receipt"
    }
  ],

  "integration": {
    "webhookUrl": "https://yourservice.com/webhook/ticket-updates",
    "apiVersion": "1.0",
    "partnerId": "PARTNER001",
    "requestId": "REQ-2024-001-UNIQUE"
  }
}
```

#### Minimal Example - General Inquiry
```json
{
  "channel": "EMAIL",
  "channelReferenceId": "EMAIL-2024-002",
  "serviceType": "INQUIRY",

  "customer": {
    "name": "Jane Smith",
    "email": "jane.smith@email.com"
  },

  "ticket": {
    "title": "Account Balance Inquiry",
    "description": "Customer wants to know about account balance and transaction history"
  }
}
```

#### Technical Support Example
```json
{
  "channel": "CHAT",
  "channelReferenceId": "CHAT-2024-003",
  "serviceType": "MOBILE_BANKING",

  "customer": {
    "name": "Ahmad Rahman",
    "email": "ahmad@email.com",
    "phone": "+6289876543210",
    "identifier": "CIF789012"
  },

  "ticket": {
    "title": "Cannot Login to Mobile Banking",
    "description": "Customer experiencing login issues with mobile banking app",
    "priority": "HIGH",

    "metadata": {
      "errorCode": "ERR_AUTH_001",
      "deviceType": "Android",
      "applicationVersion": "3.2.1",
      "lastLoginAttempt": "2024-01-15T09:00:00Z",
      "accountLocked": false
    }
  }
}
```

#### Complaint Example
```json
{
  "channel": "FACEBOOK",
  "channelReferenceId": "FB-2024-004",
  "serviceType": "COMPLAINT",

  "customer": {
    "name": "Budi Santoso",
    "email": "budi@email.com",
    "identifier": "CIF345678",
    "branchCode": "002"
  },

  "ticket": {
    "title": "Poor Service at Branch",
    "description": "Customer complaining about long waiting time and unprofessional staff",
    "priority": "MEDIUM",
    "category": "SERVICE_QUALITY",

    "metadata": {
      "complaintType": "SERVICE_QUALITY",
      "branchVisitDate": "2024-01-14",
      "waitingTime": "2 hours",
      "staffName": "Unknown"
    }
  }
}
```

### Success Response

#### Status Code: 200 OK
```json
{
  "success": true,
  "ticketNumber": "1408",
  "ticketId": "cuid123456",
  "status": "OPEN",
  "estimatedResolution": "2024-01-16T10:30:00Z",
  "trackingUrl": "https://servicedesk.banksulutgo.co.id/tickets/1408",
  "message": "Ticket created successfully",
  "metadata": {
    "createdAt": "2024-01-15T10:30:00Z",
    "assignedTo": "Support Team",
    "supportGroup": "Transaction Claims Support",
    "slaHours": 4
  }
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "error": "Validation failed",
  "errors": {
    "customer.email": "Invalid email format",
    "ticket.metadata.claimAmount": "Claim amount is required"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 400
}
```

#### Authentication Error (401)
```json
{
  "error": "Invalid API key",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 401
}
```

#### Permission Error (403)
```json
{
  "error": "Insufficient permissions to create omnichannel tickets",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 403
}
```

#### Server Error (500)
```json
{
  "error": "Failed to create ticket",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 500
}
```

---

## 2. Get Ticket Details

### Endpoint
```
GET /api/omnichannel/tickets/[ticketNumber]
```

### Headers
```json
{
  "X-API-Key": "your-api-key-here"
}
```

### Example Request
```
GET /api/omnichannel/tickets/1408
```

### Success Response

#### Status Code: 200 OK
```json
{
  "ticketNumber": "1408",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:00:00Z",
  "resolvedAt": null,
  "closedAt": null,
  "currentAssignee": "Jane Tech",
  "service": {
    "name": "ATM Card Services",
    "supportGroup": "Transaction Claims Support"
  },
  "branch": {
    "name": "Cabang Utama",
    "code": "001"
  },
  "lastComment": {
    "content": "We have retrieved your card and it will be available for pickup tomorrow",
    "author": "Support Agent",
    "timestamp": "2024-01-15T11:00:00Z"
  },
  "sla": {
    "responseDeadline": "2024-01-15T11:30:00Z",
    "resolutionDeadline": "2024-01-15T14:30:00Z",
    "isBreached": false
  },
  "comments": [
    {
      "content": "Ticket received and assigned to claims team",
      "author": "System",
      "timestamp": "2024-01-15T10:31:00Z",
      "isFromSupport": true
    },
    {
      "content": "We have retrieved your card",
      "author": "Support Agent",
      "timestamp": "2024-01-15T11:00:00Z",
      "isFromSupport": true
    }
  ],
  "attachments": [
    {
      "filename": "atm_receipt.jpg",
      "size": 102400,
      "uploadedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "metadata": {
    "omnichannelType": "CLAIM",
    "omnichannelData": {
      "claimType": "ATM_CARD_RETAINED",
      "claimAmount": 500000,
      "atmId": "ATM001"
    }
  }
}
```

### Error Responses

#### Not Found (404)
```json
{
  "error": "Ticket not found",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 404
}
```

---

## 3. Update Ticket

### Endpoint
```
PATCH /api/omnichannel/tickets/[ticketNumber]
```

### Headers
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "your-api-key-here"
}
```

### 3.1 Add Comment

#### Request Payload
```json
{
  "action": "ADD_COMMENT",
  "comment": "Customer provided additional information about the incident"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "ticketNumber": "1408",
  "action": "ADD_COMMENT",
  "result": {
    "comment": {
      "id": "comment123",
      "content": "[Via Omnichannel] Customer provided additional information about the incident",
      "author": "Customer",
      "timestamp": "2024-01-15T12:00:00Z"
    }
  },
  "message": "Ticket updated successfully"
}
```

### 3.2 Update Status

#### Request Payload
```json
{
  "action": "UPDATE_STATUS",
  "status": "CANCELLED"
}
```

**Note:** Only `CANCELLED` and `PENDING` status updates are allowed from omnichannel

#### Success Response (200 OK)
```json
{
  "success": true,
  "ticketNumber": "1408",
  "action": "UPDATE_STATUS",
  "result": {
    "status": "CANCELLED"
  },
  "message": "Ticket updated successfully"
}
```

### 3.3 Add Attachment

#### Request Payload
```json
{
  "action": "ADD_ATTACHMENT",
  "attachments": [
    {
      "filename": "additional_doc.pdf",
      "mimeType": "application/pdf",
      "size": 204800,
      "content": "base64_encoded_pdf_content"
    },
    {
      "filename": "photo.jpg",
      "mimeType": "image/jpeg",
      "size": 512000,
      "content": "base64_encoded_image_content"
    }
  ]
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "ticketNumber": "1408",
  "action": "ADD_ATTACHMENT",
  "result": {
    "attachments": [
      {
        "filename": "additional_doc.pdf",
        "size": 204800
      },
      {
        "filename": "photo.jpg",
        "size": 512000
      }
    ]
  },
  "message": "Ticket updated successfully"
}
```

### Error Responses

#### Invalid Action (400)
```json
{
  "error": "Invalid update data",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 400
}
```

#### Cannot Update Closed Ticket (400)
```json
{
  "error": "Cannot update closed or resolved tickets",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 400
}
```

---

## 4. Batch Status Check

### Endpoint
```
GET /api/omnichannel/tickets
```

### Headers
```json
{
  "X-API-Key": "your-api-key-here"
}
```

### Query Parameters
- `ticketNumber` - Check by ticket number
- `channelReferenceId` - Check by external channel reference

### Example Requests

#### By Ticket Number
```
GET /api/omnichannel/tickets?ticketNumber=1408
```

#### By Channel Reference
```
GET /api/omnichannel/tickets?channelReferenceId=WA-2024-001-XYZ
```

### Success Response

#### Status Code: 200 OK
```json
{
  "success": true,
  "ticketNumber": "1408",
  "status": "OPEN",
  "priority": "HIGH",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:00:00Z",
  "resolvedAt": null,
  "closedAt": null,
  "currentAssignee": "Jane Tech",
  "lastComment": {
    "content": "Working on your request",
    "author": "Support Agent",
    "timestamp": "2024-01-15T11:00:00Z"
  },
  "sla": {
    "responseDeadline": "2024-01-15T11:30:00Z",
    "resolutionDeadline": "2024-01-15T14:30:00Z",
    "isBreached": false
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### Error Responses

#### Missing Parameters (400)
```json
{
  "error": "Either ticketNumber or channelReferenceId is required",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 400
}
```

#### Not Found (404)
```json
{
  "error": "Ticket not found",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 404
}
```

---

## Service Types

The following service types are supported in the `serviceType` field:

| Service Type | Description | Priority Calculation |
|--------------|-------------|---------------------|
| `CLAIM` | Financial claims | Based on claim amount |
| `REIMBURSEMENT` | Reimbursement requests | Based on amount |
| `DISPUTE` | Transaction disputes | HIGH priority by default |
| `COMPLAINT` | Customer complaints | MEDIUM priority |
| `INQUIRY` | General inquiries | LOW priority |
| `FEEDBACK` | Customer feedback | LOW priority |
| `TECHNICAL_SUPPORT` | General technical issues | MEDIUM priority |
| `ACCOUNT_ISSUE` | Account access problems | HIGH priority |
| `CARD_ISSUE` | Card-related problems | HIGH priority |
| `ATM_ISSUE` | ATM-specific issues | HIGH priority |
| `MOBILE_BANKING` | Mobile banking app issues | MEDIUM priority |
| `INTERNET_BANKING` | Internet banking issues | MEDIUM priority |
| `GENERAL_REQUEST` | General service requests | MEDIUM priority |
| `OTHER` | Other types of requests | MEDIUM priority |

## Channel Sources

The following channels are supported in the `channel` field:

- `WHATSAPP` - WhatsApp messages
- `EMAIL` - Email communications
- `CHAT` - Live chat sessions
- `PHONE` - Phone calls
- `SMS` - Text messages
- `FACEBOOK` - Facebook messages/posts
- `INSTAGRAM` - Instagram messages
- `TWITTER` - Twitter/X messages
- `TELEGRAM` - Telegram messages
- `WEB_PORTAL` - Web portal submissions

## Priority Levels

Priorities can be set manually or are calculated automatically:

- `LOW` - Standard requests, general inquiries
- `MEDIUM` - Most service requests
- `HIGH` - Account issues, card problems, ATM issues
- `URGENT` - High-value claims, escalated issues
- `CRITICAL` - Very high amounts (≥100M IDR)

## Ticket Categories

The following categories can be used in `ticket.category`:

- `INCIDENT` - System or service incidents
- `SERVICE_REQUEST` - Service-related requests
- `INFORMATION_REQUEST` - Information inquiries
- `COMPLAINT` - Customer complaints
- `CHANGE_REQUEST` - Change requests

## Field Requirements by Service Type

### Claims (CLAIM)
**Required:**
- `customer.name`
- `customer.email`
- `ticket.metadata.claimType`
- `ticket.metadata.claimAmount`

**Optional:**
- `ticket.metadata.claimDate`
- `ticket.metadata.claimReason`
- `ticket.metadata.referenceNumber`

### Disputes (DISPUTE)
**Required:**
- `customer.name`
- `customer.identifier`
- `ticket.metadata.transactionId`

**Optional:**
- `ticket.metadata.disputeAmount`
- `ticket.metadata.disputeReason`

### ATM Issues (ATM_ISSUE)
**Required:**
- `customer.name`
- `ticket.metadata.atmId`

**Optional:**
- `ticket.metadata.transactionId`
- `ticket.metadata.errorCode`

### Account Issues (ACCOUNT_ISSUE)
**Required:**
- `customer.name`
- `customer.identifier`

**Optional:**
- `ticket.metadata.accountLocked`
- `ticket.metadata.cannotAccess`

### Mobile/Internet Banking
**Required:**
- `customer.name`
- `customer.email` or `customer.phone`

**Optional:**
- `ticket.metadata.errorCode`
- `ticket.metadata.deviceType`
- `ticket.metadata.applicationVersion`
- `ticket.metadata.browser`

## Webhook Events

If `integration.webhookUrl` is provided, the following events will be sent:

### Event Payload Structure
```json
{
  "event": "STATUS_CHANGED",
  "ticketNumber": "1408",
  "channelReferenceId": "WA-2024-001-XYZ",
  "timestamp": "2024-01-15T11:00:00Z",
  "data": {
    "oldStatus": "OPEN",
    "newStatus": "IN_PROGRESS",
    "comment": "Ticket assigned to technician"
  }
}
```

### Event Types
- `TICKET_CREATED` - Ticket successfully created
- `STATUS_CHANGED` - Status updated
- `COMMENT_ADDED` - New comment added
- `TICKET_RESOLVED` - Ticket resolved
- `TICKET_CLOSED` - Ticket closed

### Webhook Security
All webhooks include a signature header for verification:
```
X-Webhook-Signature: sha256_hash_of_payload
```

## Rate Limits

- Create ticket: 100 requests per minute per API key
- Status check: 500 requests per minute per API key
- Updates: 200 requests per minute per API key

## Best Practices

1. **Use Idempotency Keys**: Include `integration.requestId` to prevent duplicate tickets
2. **Compress Attachments**: Base64 encode and compress images before sending
3. **Batch Status Checks**: Use the batch endpoint for checking multiple tickets
4. **Handle Webhook Failures**: Implement retry logic for webhook processing
5. **Validate Before Sending**: Ensure required fields are present based on service type
6. **Use Channel Reference IDs**: Always include your system's reference for tracking

## Error Handling

All error responses follow this format:
```json
{
  "error": "Error message",
  "errors": {
    "field": "Specific field error"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 400
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Testing

### Test Environment
```
Base URL: http://localhost:3002/api/omnichannel
```

### Test API Key
Generate a test API key using:
```bash
npx tsx scripts/generate-omnichannel-api-key.ts
```

### Test Script
Run the test suite:
```bash
npx tsx scripts/test-omnichannel-api.ts YOUR_API_KEY
```

---

*Version: 1.0.0*
*Last Updated: January 2025*