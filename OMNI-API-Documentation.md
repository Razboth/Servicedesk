# OMNI API Documentation
## Bank SulutGo ServiceDesk Omnichannel Integration

**Version:** 1.0
**Last Updated:** 2024-12-19
**Base URL:** `https://your-domain.com/api/omnichannel`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Types](#data-types)
5. [Error Handling](#error-handling)
6. [Webhooks](#webhooks)
7. [Use Cases](#use-cases)
8. [Best Practices](#best-practices)

---

## Overview

The OMNI API (Omnichannel Integration API) enables external systems to create, manage, and track support tickets in the Bank SulutGo ServiceDesk system. The API supports multiple channels including WhatsApp, Email, Chat, Phone, SMS, and social media platforms.

### Key Features

- **Multi-channel Support**: Accept tickets from various communication channels
- **Simplified Claims API**: Streamlined endpoint for transaction claims (KLAIM-OMNI)
- **Full Ticket Management**: Complete ticket lifecycle management
- **Real-time Status Updates**: Track ticket progress and updates
- **SLA Tracking**: Automatic SLA calculation and monitoring
- **Webhook Support**: Receive real-time notifications on ticket changes
- **Attachment Handling**: Support for file uploads
- **Idempotency**: Prevent duplicate ticket creation

### Supported Channels

- WhatsApp
- Email
- Live Chat
- Phone
- SMS
- Facebook Messenger
- Instagram
- Twitter
- Telegram
- Web Portal

---

## Authentication

All API requests require authentication using API keys. Include your API key in the request headers:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### API Key Permissions

API keys can have different permission levels:
- `omnichannel:create` - Create tickets and claims
- `omnichannel:read` - Read ticket status and details
- `omnichannel:update` - Update tickets (add comments, attachments)

---

## API Endpoints

### 1. Create Simplified Claim (KLAIM-OMNI)

**Endpoint:** `POST /api/omnichannel/claims`

Simplified endpoint for creating transaction claims that automatically generates KLAIM-OMNI tickets.

#### Request Headers
```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

#### Request Body
```json
{
  "namaNasabah": "John Doe",
  "mediaTransaksi": "ATM",
  "jenisTransaksi": "PEMBELIAN",
  "nominal": 500000,
  "nomorRekening": "1234567890",
  "nomorKartu": "****1234",
  "claimReason": "Transaction failed but amount was deducted",
  "claimDate": "2024-12-19T10:30:00Z",
  "transactionId": "TXN123456789",
  "referenceNumber": "REF987654321",
  "atmId": "ATM001",
  "description": "ATM transaction failed but money was debited from account"
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `namaNasabah` | string | Yes | Customer name |
| `mediaTransaksi` | enum | Yes | Transaction medium: `ATM`, `QRIS`, `DEBIT`, `TOUCH`, `SMS` |
| `jenisTransaksi` | enum | Conditional | Transaction type: `PEMBELIAN`, `PEMBAYARAN`, `TRANSFER` (required for ATM, TOUCH, SMS) |
| `nominal` | number | Yes | Transaction amount (max: 1,000,000,000) |
| `nomorRekening` | string | No | Account number |
| `nomorKartu` | string | No | Card number (masked) |
| `claimReason` | string | No | Reason for the claim |
| `claimDate` | string | No | Date of claim (ISO 8601 format) |
| `transactionId` | string | No | Transaction ID |
| `referenceNumber` | string | No | Reference number |
| `atmId` | string | No | ATM identifier |
| `description` | string | No | Additional description |

#### Success Response (201)
```json
{
  "success": true,
  "ticketNumber": "12345",
  "ticketId": "cm123456789",
  "status": "OPEN",
  "estimatedResolution": "2024-12-22T10:30:00Z",
  "trackingUrl": "/tickets/12345",
  "message": "KLAIM-OMNI ticket created successfully"
}
```

#### Error Response (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "namaNasabah": "Nama nasabah is required",
    "nominal": "Nominal must be positive"
  }
}
```

---

### 2. Create Full Ticket

**Endpoint:** `POST /api/omnichannel/tickets`

Complete endpoint for creating tickets with full customization options.

#### Request Body
```json
{
  "channel": "WHATSAPP",
  "channelReferenceId": "wa_msg_123456",
  "serviceType": "TECHNICAL_SUPPORT",
  "customer": {
    "name": "Jane Smith",
    "email": "jane.smith@email.com",
    "phone": "+628123456789",
    "identifier": "CIF123456",
    "branchCode": "001",
    "department": "Personal Banking",
    "preferredLanguage": "id"
  },
  "ticket": {
    "title": "Mobile Banking Login Issue",
    "description": "Unable to login to mobile banking app. Getting error code 500.",
    "priority": "HIGH",
    "category": "INCIDENT",
    "metadata": {
      "errorCode": "ERR_500",
      "deviceType": "Android",
      "applicationVersion": "2.1.5",
      "urgencyReason": "Need to transfer salary today",
      "customFields": {
        "customerSegment": "Premium",
        "lastSuccessfulLogin": "2024-12-18T15:30:00Z"
      }
    }
  },
  "attachments": [
    {
      "filename": "error_screenshot.png",
      "mimeType": "image/png",
      "size": 245760,
      "content": "iVBORw0KGgoAAAANSUhEUgAA...", // base64 encoded
      "description": "Screenshot of error message"
    }
  ],
  "integration": {
    "webhookUrl": "https://your-system.com/webhook",
    "apiVersion": "1.0",
    "partnerId": "PARTNER_001",
    "requestId": "req_123456789" // For idempotency
  }
}
```

#### Field Descriptions

**Channel Information**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `channel` | enum | Yes | Communication channel (see [Data Types](#data-types)) |
| `channelReferenceId` | string | No | External reference ID from the channel |

**Service Type**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceType` | enum | Yes | Type of service request (see [Data Types](#data-types)) |

**Customer Information**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer.name` | string | Yes | Customer full name |
| `customer.email` | string | No | Customer email address |
| `customer.phone` | string | No | Customer phone number |
| `customer.identifier` | string | No | CIF, Account Number, or other unique ID |
| `customer.branchCode` | string | No | Branch code where customer is registered |
| `customer.department` | string | No | Customer department/segment |
| `customer.preferredLanguage` | string | No | Preferred language code (id, en) |

**Ticket Details**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ticket.title` | string | No | Ticket title (auto-generated if not provided) |
| `ticket.description` | string | Yes | Detailed description of the issue |
| `ticket.priority` | enum | No | Priority level: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `ticket.category` | enum | No | Ticket category: `INCIDENT`, `SERVICE_REQUEST`, `CHANGE_REQUEST`, `EVENT_REQUEST` |
| `ticket.metadata` | object | No | Additional service-specific data |

#### Success Response (201)
```json
{
  "success": true,
  "ticketNumber": "12346",
  "ticketId": "cm123456790",
  "status": "OPEN",
  "estimatedResolution": "2024-12-20T16:00:00Z",
  "trackingUrl": "/tickets/12346",
  "message": "Ticket created successfully",
  "metadata": {
    "createdAt": "2024-12-19T10:30:00Z",
    "assignedTo": "IT Support Team",
    "supportGroup": "Technical Support",
    "slaHours": 24
  }
}
```

---

### 3. Get Ticket Status

**Endpoint:** `GET /api/omnichannel/tickets`

Check ticket status using ticket number or channel reference ID.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticketNumber` | string | Either this or `channelReferenceId` | Internal ticket number |
| `channelReferenceId` | string | Either this or `ticketNumber` | External channel reference |

#### Example Request
```http
GET /api/omnichannel/tickets?ticketNumber=12346
Authorization: Bearer YOUR_API_KEY
```

#### Success Response (200)
```json
{
  "ticketNumber": "12346",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "createdAt": "2024-12-19T10:30:00Z",
  "updatedAt": "2024-12-19T14:22:00Z",
  "resolvedAt": null,
  "closedAt": null,
  "currentAssignee": "John Tech",
  "lastComment": {
    "content": "We are investigating the login issue. Please try clearing app cache.",
    "author": "John Tech",
    "timestamp": "2024-12-19T14:22:00Z"
  },
  "sla": {
    "responseDeadline": "2024-12-19T16:30:00Z",
    "resolutionDeadline": "2024-12-20T10:30:00Z",
    "isBreached": false
  }
}
```

---

### 4. Get Detailed Ticket Information

**Endpoint:** `GET /api/omnichannel/tickets/{ticketNumber}`

Get comprehensive ticket information including comments, attachments, and metadata.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticketNumber` | string | Yes | Ticket number or channel reference ID |

#### Example Request
```http
GET /api/omnichannel/tickets/12346
Authorization: Bearer YOUR_API_KEY
```

#### Success Response (200)
```json
{
  "ticketNumber": "12346",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "createdAt": "2024-12-19T10:30:00Z",
  "updatedAt": "2024-12-19T14:22:00Z",
  "resolvedAt": null,
  "closedAt": null,
  "currentAssignee": "John Tech",
  "service": {
    "name": "Mobile Banking Support",
    "supportGroup": "Technical Support"
  },
  "branch": {
    "name": "Kantor Pusat",
    "code": "001"
  },
  "comments": [
    {
      "content": "We are investigating the login issue. Please try clearing app cache.",
      "author": "John Tech",
      "timestamp": "2024-12-19T14:22:00Z",
      "isFromSupport": true
    },
    {
      "content": "I tried clearing cache but still having the same issue.",
      "author": "Jane Smith",
      "timestamp": "2024-12-19T14:45:00Z",
      "isFromSupport": false
    }
  ],
  "attachments": [
    {
      "filename": "error_screenshot.png",
      "size": 245760,
      "uploadedAt": "2024-12-19T10:30:00Z"
    }
  ],
  "sla": {
    "responseDeadline": "2024-12-19T16:30:00Z",
    "resolutionDeadline": "2024-12-20T10:30:00Z",
    "isBreached": false
  },
  "metadata": {
    "errorCode": "ERR_500",
    "deviceType": "Android",
    "applicationVersion": "2.1.5"
  }
}
```

---

### 5. Update Ticket

**Endpoint:** `PATCH /api/omnichannel/tickets/{ticketNumber}`

Update ticket by adding comments, attachments, or changing status.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticketNumber` | string | Yes | Ticket number or channel reference ID |

#### Request Body Examples

**Add Comment**
```json
{
  "action": "ADD_COMMENT",
  "comment": "I have restarted my phone and cleared all app data, but the issue persists."
}
```

**Update Status**
```json
{
  "action": "UPDATE_STATUS",
  "status": "CANCELLED"
}
```

**Add Attachment**
```json
{
  "action": "ADD_ATTACHMENT",
  "attachments": [
    {
      "filename": "system_logs.txt",
      "mimeType": "text/plain",
      "size": 1024,
      "content": "VGhpcyBpcyBhIHNhbXBsZSBsb2cgZmlsZQ==" // base64
    }
  ]
}
```

#### Success Response (200)
```json
{
  "success": true,
  "ticketNumber": "12346",
  "action": "ADD_COMMENT",
  "result": {
    "comment": {
      "id": "cm123456791",
      "content": "[Via Omnichannel] I have restarted my phone and cleared all app data, but the issue persists.",
      "author": "Jane Smith",
      "timestamp": "2024-12-19T15:30:00Z"
    }
  },
  "message": "Ticket updated successfully"
}
```

---

## Data Types

### Channel Sources (OmnichannelSource)
```
WHATSAPP, EMAIL, CHAT, PHONE, SMS,
FACEBOOK, INSTAGRAM, TWITTER, TELEGRAM, WEB_PORTAL
```

### Service Types (OmnichannelServiceType)
```
// Financial Services
CLAIM, REIMBURSEMENT, DISPUTE

// Customer Service
COMPLAINT, INQUIRY, FEEDBACK

// Technical Support
TECHNICAL_SUPPORT, ACCOUNT_ISSUE, CARD_ISSUE,
ATM_ISSUE, MOBILE_BANKING, INTERNET_BANKING

// General
GENERAL_REQUEST, OTHER
```

### Priority Levels
```
LOW, MEDIUM, HIGH, CRITICAL
```

### Ticket Categories
```
INCIDENT, SERVICE_REQUEST, CHANGE_REQUEST, EVENT_REQUEST
```

### Ticket Statuses
```
OPEN, IN_PROGRESS, RESOLVED, CLOSED, ON_HOLD, CANCELLED, PENDING
```

### Media Transaksi (for Claims)
```
ATM, QRIS, DEBIT, TOUCH, SMS
```

### Jenis Transaksi (for Claims)
```
PEMBELIAN, PEMBAYARAN, TRANSFER
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (invalid API key) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field1": "Field specific error message",
    "field2": "Another field error"
  }
}
```

### Common Error Messages

**Authentication Errors**
- `"Unauthorized"` - Missing or invalid API key
- `"Insufficient permissions to create omnichannel tickets"` - API key lacks required permissions

**Validation Errors**
- `"Validation failed"` - Request body validation failed
- `"Either ticketNumber or channelReferenceId is required"` - Missing required query parameter
- `"Ticket not found"` - Invalid ticket number or reference ID

**Business Logic Errors**
- `"Cannot update closed or resolved tickets"` - Attempting to update finalized tickets
- `"System user not found"` - Internal configuration issue
- `"Claim service not found"` - Service configuration missing

---

## Webhooks

Configure webhook URLs to receive real-time notifications about ticket changes.

### Webhook Events
- `TICKET_CREATED` - New ticket created
- `STATUS_CHANGED` - Ticket status updated
- `COMMENT_ADDED` - New comment added
- `TICKET_RESOLVED` - Ticket marked as resolved
- `TICKET_CLOSED` - Ticket closed

### Webhook Payload Format
```json
{
  "event": "STATUS_CHANGED",
  "ticketNumber": "12346",
  "channelReferenceId": "wa_msg_123456",
  "timestamp": "2024-12-19T15:30:00Z",
  "data": {
    "oldStatus": "OPEN",
    "newStatus": "IN_PROGRESS",
    "assignedTo": "John Tech"
  }
}
```

### Webhook Security

Webhooks include a signature header for verification:
```http
X-Webhook-Signature: a1b2c3d4e5f6...
```

Verify the signature using HMAC-SHA256 with your webhook secret:
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');
```

---

## Use Cases

### 1. Simple Transaction Claim
When a customer reports a failed ATM transaction via WhatsApp:

```json
POST /api/omnichannel/claims
{
  "namaNasabah": "Ahmad Suryanto",
  "mediaTransaksi": "ATM",
  "jenisTransaksi": "PEMBAYARAN",
  "nominal": 150000,
  "nomorKartu": "****5678",
  "claimReason": "ATM tidak mengeluarkan uang tetapi saldo terpotong",
  "atmId": "ATM_JKT_001",
  "description": "Transaksi pembayaran di ATM gagal, uang tidak keluar tapi saldo berkurang"
}
```

### 2. Technical Support Ticket
Customer experiencing mobile banking issues:

```json
POST /api/omnichannel/tickets
{
  "channel": "EMAIL",
  "serviceType": "MOBILE_BANKING",
  "customer": {
    "name": "Sarah Johnson",
    "email": "sarah.j@email.com",
    "identifier": "CIF789123"
  },
  "ticket": {
    "title": "Cannot access mobile banking",
    "description": "App crashes every time I try to check balance",
    "priority": "MEDIUM",
    "metadata": {
      "deviceType": "iPhone 14",
      "applicationVersion": "3.2.1",
      "errorCode": "APP_CRASH_001"
    }
  }
}
```

### 3. Customer Complaint
Formal complaint submission:

```json
POST /api/omnichannel/tickets
{
  "channel": "WEB_PORTAL",
  "serviceType": "COMPLAINT",
  "customer": {
    "name": "Robert Kim",
    "email": "robert.kim@email.com",
    "branchCode": "015"
  },
  "ticket": {
    "title": "Poor service at branch",
    "description": "Long waiting time and unprofessional staff behavior",
    "priority": "HIGH",
    "category": "SERVICE_REQUEST",
    "metadata": {
      "incidentDate": "2024-12-18",
      "branchVisited": "015",
      "staffInvolved": "Not specified"
    }
  }
}
```

---

## Best Practices

### 1. API Usage
- **Use HTTPS**: Always use secure connections in production
- **Rate Limiting**: Respect rate limits to avoid service interruption
- **Error Handling**: Implement proper error handling and retry logic
- **Logging**: Log all API interactions for debugging and audit purposes

### 2. Idempotency
- Use `integration.requestId` to prevent duplicate ticket creation
- Store request IDs for at least 24 hours
- Implement client-side retry with same request ID

### 3. Data Security
- **Mask Sensitive Data**: Always mask card numbers, account numbers
- **API Key Security**: Store API keys securely, rotate regularly
- **Data Validation**: Validate all input data before sending
- **Audit Trail**: Maintain logs of all API activities

### 4. Performance
- **Batch Operations**: Group multiple operations when possible
- **Compression**: Use gzip compression for large payloads
- **Caching**: Cache frequently accessed data
- **Async Processing**: Use webhooks for real-time updates instead of polling

### 5. Error Recovery
- **Exponential Backoff**: Implement exponential backoff for retries
- **Circuit Breaker**: Use circuit breaker pattern for external dependencies
- **Fallback Options**: Provide fallback mechanisms for critical operations
- **Monitoring**: Implement comprehensive monitoring and alerting

### 6. Testing
- **Test Environment**: Use dedicated test environment for development
- **Mock Data**: Use realistic but non-sensitive test data
- **Edge Cases**: Test error conditions and edge cases
- **Load Testing**: Verify performance under expected load

---

## Support

For technical support and API questions:
- **Email**: api-support@banksulutgo.co.id
- **Documentation**: Check this document for updates
- **Status Page**: Monitor API status at status.banksulutgo.co.id

---

## Changelog

### Version 1.0 (2024-12-19)
- Initial release
- Claims API endpoint
- Full ticket management
- Webhook support
- Comprehensive error handling

---

*This documentation is maintained by the Bank SulutGo IT Team. For technical issues or questions, please contact our support team.*