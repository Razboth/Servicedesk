# Omnichannel Integration API Documentation

## Overview
The Bank SulutGo ServiceDesk Omnichannel API provides a unified interface for external channels (WhatsApp, Email, Chat, etc.) to create and manage support tickets across all service types.

## Base URL
```
Production: https://servicedesk.banksulutgo.co.id/api/omnichannel
Development: http://localhost:3000/api/omnichannel
```

## Authentication
All requests must include an API key with appropriate permissions:

```http
Headers:
X-API-Key: your-api-key-here
Content-Type: application/json
```

### Required Permissions
- `omnichannel:create` - Create tickets
- `omnichannel:read` - Check ticket status
- `omnichannel:update` - Update tickets

## Service Types
The API supports the following service types:

### Financial Services
- `CLAIM` - Financial claims
- `REIMBURSEMENT` - Reimbursement requests
- `DISPUTE` - Transaction disputes

### Customer Service
- `COMPLAINT` - Customer complaints
- `INQUIRY` - General inquiries
- `FEEDBACK` - Customer feedback

### Technical Support
- `TECHNICAL_SUPPORT` - General technical issues
- `ACCOUNT_ISSUE` - Account access problems
- `CARD_ISSUE` - Card-related problems
- `ATM_ISSUE` - ATM-specific issues
- `MOBILE_BANKING` - Mobile banking app issues
- `INTERNET_BANKING` - Internet banking issues

### General
- `GENERAL_REQUEST` - General service requests
- `OTHER` - Other types of requests

## Channel Sources
Supported channel identifiers:
- `WHATSAPP`
- `EMAIL`
- `CHAT`
- `PHONE`
- `SMS`
- `FACEBOOK`
- `INSTAGRAM`
- `TWITTER`
- `TELEGRAM`
- `WEB_PORTAL`

## API Endpoints

### 1. Create Ticket
**Endpoint:** `POST /api/omnichannel/tickets`

**Description:** Creates a new ticket from any omnichannel source.

**Request Body:**
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

**Response (Success):**
```json
{
  "success": true,
  "ticketNumber": "INC-2024-0001",
  "ticketId": "cuid123456",
  "status": "OPEN",
  "estimatedResolution": "2024-01-15T14:30:00Z",
  "trackingUrl": "https://servicedesk.banksulutgo.co.id/tickets/INC-2024-0001",
  "message": "Ticket created successfully",
  "metadata": {
    "createdAt": "2024-01-15T10:30:00Z",
    "assignedTo": "Support Team",
    "supportGroup": "Transaction Claims Support",
    "slaHours": 4
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": {
    "customer.email": "Invalid email format",
    "ticket.metadata.claimAmount": "Claim amount is required"
  }
}
```

### 2. Check Ticket Status
**Endpoint:** `GET /api/omnichannel/tickets/[ticketNumber]`

**Description:** Get detailed status of a ticket.

**Example:** `GET /api/omnichannel/tickets/INC-2024-0001`

**Response:**
```json
{
  "ticketNumber": "INC-2024-0001",
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
    }
  ],
  "attachments": [
    {
      "filename": "atm_receipt.jpg",
      "size": 102400,
      "uploadedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 3. Update Ticket
**Endpoint:** `PATCH /api/omnichannel/tickets/[ticketNumber]`

**Description:** Add comments or update ticket status.

**Request Body (Add Comment):**
```json
{
  "action": "ADD_COMMENT",
  "comment": "Customer provided additional information about the incident"
}
```

**Request Body (Update Status):**
```json
{
  "action": "UPDATE_STATUS",
  "status": "CANCELLED"
}
```

**Request Body (Add Attachment):**
```json
{
  "action": "ADD_ATTACHMENT",
  "attachments": [
    {
      "filename": "additional_doc.pdf",
      "mimeType": "application/pdf",
      "size": 204800,
      "content": "base64_encoded_content"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "ticketNumber": "INC-2024-0001",
  "action": "ADD_COMMENT",
  "result": {
    "comment": {
      "id": "comment123",
      "content": "[Via Omnichannel] Customer provided additional information",
      "author": "Customer",
      "timestamp": "2024-01-15T12:00:00Z"
    }
  },
  "message": "Ticket updated successfully"
}
```

### 4. Batch Status Check
**Endpoint:** `GET /api/omnichannel/tickets`

**Description:** Check multiple tickets by ticket numbers or channel references.

**Query Parameters:**
- `ticketNumber` - Ticket number to check
- `channelReferenceId` - External channel reference

**Example:** `GET /api/omnichannel/tickets?channelReferenceId=WA-2024-001-XYZ`

## Service-Specific Requirements

### Claims (CLAIM)
**Required Fields:**
- `customer.name`
- `customer.email`
- `ticket.metadata.claimType`
- `ticket.metadata.claimAmount`

**Optional Fields:**
- `ticket.metadata.claimDate`
- `ticket.metadata.claimReason`
- `ticket.metadata.referenceNumber`

### Disputes (DISPUTE)
**Required Fields:**
- `customer.name`
- `customer.identifier`
- `ticket.metadata.transactionId`

**Optional Fields:**
- `ticket.metadata.disputeAmount`
- `ticket.metadata.disputeReason`

### ATM Issues (ATM_ISSUE)
**Required Fields:**
- `customer.name`
- `ticket.metadata.atmId`

**Optional Fields:**
- `ticket.metadata.transactionId`
- `ticket.metadata.errorCode`

### Account Issues (ACCOUNT_ISSUE)
**Required Fields:**
- `customer.name`
- `customer.identifier`

**Optional Fields:**
- `ticket.metadata.accountLocked`
- `ticket.metadata.cannotAccess`

## Priority Calculation
Priority is automatically calculated based on service type and metadata:

### Amount-based Priority (Claims/Disputes)
- `CRITICAL` - Amount ≥ 100,000,000 IDR
- `HIGH` - Amount ≥ 50,000,000 IDR
- `MEDIUM` - Amount ≥ 10,000,000 IDR
- `LOW` - Amount < 10,000,000 IDR

### Special Cases
- ATM Issues default to `HIGH` priority minimum
- Account access issues are `HIGH` priority
- Urgent/Escalated flags upgrade priority by one level

## Webhook Callbacks
If `integration.webhookUrl` is provided, the system will send status updates:

**Webhook Payload:**
```json
{
  "event": "STATUS_CHANGED",
  "ticketNumber": "INC-2024-0001",
  "channelReferenceId": "WA-2024-001-XYZ",
  "timestamp": "2024-01-15T11:00:00Z",
  "data": {
    "oldStatus": "OPEN",
    "newStatus": "IN_PROGRESS",
    "comment": "Ticket assigned to technician"
  }
}
```

**Webhook Events:**
- `TICKET_CREATED` - Ticket successfully created
- `STATUS_CHANGED` - Status updated
- `COMMENT_ADDED` - New comment added
- `TICKET_RESOLVED` - Ticket resolved
- `TICKET_CLOSED` - Ticket closed

**Webhook Signature Verification:**
All webhooks include a signature header for verification:
```
X-Webhook-Signature: sha256_hash_of_payload
```

## Idempotency
To prevent duplicate tickets, include a unique `integration.requestId`:
- Same `requestId` within 24 hours returns existing ticket
- Helps prevent duplicate submissions from network issues

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "errors": {
    "field": "Specific field error"
  }
}
```

### Common Error Codes
- `400` - Validation error or bad request
- `401` - Invalid API key
- `403` - Insufficient permissions
- `404` - Ticket not found
- `429` - Rate limit exceeded
- `500` - Server error

## Rate Limits
- Create ticket: 100 requests per minute
- Status check: 500 requests per minute
- Updates: 200 requests per minute

## Best Practices

1. **Always Include Customer Identifier**
   - Use CIF, Account Number, or consistent ID
   - Helps link tickets to correct customer

2. **Use Channel Reference ID**
   - Include your system's unique reference
   - Enables easy tracking across systems

3. **Implement Webhook Handlers**
   - Process status updates asynchronously
   - Verify webhook signatures

4. **Handle Attachments Efficiently**
   - Compress images before encoding
   - Limit total size to 10MB per attachment

5. **Set Appropriate Priority**
   - Let system calculate based on amount/type
   - Override only when necessary

6. **Use Idempotency Keys**
   - Prevent duplicate tickets
   - Include unique requestId for each submission

## Testing

### Test Environment
```
URL: http://localhost:3000/api/omnichannel
API Key: Request test key from admin
```

### Test Data
Use these test values in development:
- Customer ID: `TEST-CIF-001`
- Branch Code: `001`
- ATM ID: `ATM-TEST-001`

### Postman Collection
Download the Postman collection for easy testing:
[Download Collection](https://servicedesk.banksulutgo.co.id/docs/omnichannel-postman.json)

## Support

For API support and key requests:
- Email: api-support@banksulutgo.co.id
- Internal Portal: ServiceDesk API Documentation
- Slack: #omnichannel-integration

---

*Version: 1.0.0*
*Last Updated: January 2024*