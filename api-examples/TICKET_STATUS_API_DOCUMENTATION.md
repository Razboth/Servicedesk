# Ticket Status API Documentation

## Overview
API endpoints to check ticket status and retrieve ticket information using API key authentication.

## Authentication
All endpoints require API key authentication via one of these headers:
- `X-API-Key: <your_api_key>`
- `Authorization: Bearer <your_api_key>`

Required permission: `tickets:read`

---

## 1. Get Single Ticket Status

### Endpoint
`GET /api/tickets/status`

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticketNumber` | string | One required | Ticket number (e.g., "TKT-20240315-0001") |
| `ticketId` | string | One required | Ticket ID (e.g., "cmet...") |
| `includeDetails` | boolean | No | Include full ticket details (default: false) |
| `includeComments` | boolean | No | Include ticket comments (default: false) |
| `includeAttachments` | boolean | No | Include attachment info (default: false) |
| `includeFieldValues` | boolean | No | Include custom field values (default: false) |

### Examples

#### Simple Status Check
```bash
curl -X GET "http://localhost:3000/api/tickets/status?ticketNumber=TKT-20250827-0006" \
  -H "X-API-Key: sk_live_YOUR_API_KEY_HERE"
```

#### Full Details with Comments
```bash
curl -X GET "http://localhost:3000/api/tickets/status?ticketNumber=TKT-20250827-0006&includeDetails=true&includeComments=true" \
  -H "X-API-Key: sk_live_YOUR_API_KEY_HERE"
```

### Response (Simple)
```json
{
  "success": true,
  "data": {
    "ticketNumber": "TKT-20250827-0006",
    "status": "OPEN",
    "priority": "HIGH",
    "title": "Klaim ATM - Uang Tidak Keluar - 0126",
    "createdAt": "2025-08-27T12:32:52.089Z",
    "updatedAt": "2025-08-27T12:32:52.089Z",
    "resolvedAt": null,
    "closedAt": null,
    "assignedTo": null,
    "branch": {
      "name": "CABANG UTAMA",
      "code": "001"
    },
    "slaStatus": {
      "hoursElapsed": 2.5,
      "responseDeadline": "2025-08-27T14:32:52.089Z",
      "resolutionDeadline": "2025-08-28T12:32:52.089Z",
      "isResponseBreached": false,
      "isResolutionBreached": false
    }
  },
  "timestamp": "2025-08-27T15:00:00.000Z"
}
```

### Response (Detailed)
```json
{
  "success": true,
  "data": {
    "ticket": {
      "id": "cmetygsc9003phlkc3j9h4as0",
      "ticketNumber": "TKT-20250827-0006",
      "status": "OPEN",
      "priority": "HIGH",
      "title": "Klaim ATM - Uang Tidak Keluar - 0126",
      "description": "**Informasi Klaim ATM**\n- Jenis Klaim: Uang Tidak Keluar...",
      "category": "SERVICE_REQUEST",
      "issueClassification": "SYSTEM_ERROR",
      "createdAt": "2025-08-27T12:32:52.089Z",
      "updatedAt": "2025-08-27T12:32:52.089Z",
      "resolvedAt": null,
      "closedAt": null,
      "resolutionNotes": null,
      "service": {
        "name": "Penarikan Tunai Internal - ATM Claim",
        "slaHours": 24,
        "responseHours": 2,
        "resolutionHours": 24
      },
      "createdBy": {
        "name": "Razaan Yakub Firmansyah Botutihe",
        "email": "razaan.botutihe@banksulutgo.co.id"
      },
      "assignedTo": null,
      "branch": {
        "name": "CABANG UTAMA",
        "code": "001"
      },
      "supportGroup": {
        "name": "Branch Operations",
        "code": "BRANCH_OPS"
      },
      "fieldValues": [...],
      "comments": [...],
      "attachments": [...]
    },
    "slaStatus": {
      "hoursElapsed": 2.5,
      "responseDeadline": "2025-08-27T14:32:52.089Z",
      "resolutionDeadline": "2025-08-28T12:32:52.089Z",
      "isResponseBreached": false,
      "isResolutionBreached": false
    }
  },
  "timestamp": "2025-08-27T15:00:00.000Z"
}
```

---

## 2. Get Multiple Tickets Status (Batch)

### Endpoint
`POST /api/tickets/status`

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ticketNumbers` | string[] | No | Array of ticket numbers |
| `ticketIds` | string[] | No | Array of ticket IDs |
| `statuses` | string[] | No | Filter by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED) |
| `branchCode` | string | No | Filter by branch code |
| `dateFrom` | string | No | Filter tickets created from this date (ISO 8601) |
| `dateTo` | string | No | Filter tickets created until this date (ISO 8601) |
| `limit` | number | No | Maximum tickets to return (default: 50, max: 100) |

### Examples

#### Get Multiple Tickets by Number
```bash
curl -X POST "http://localhost:3000/api/tickets/status" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_YOUR_API_KEY_HERE" \
  -d '{
    "ticketNumbers": ["TKT-20250827-0001", "TKT-20250827-0002", "TKT-20250827-0003"]
  }'
```

#### Filter by Status and Date Range
```bash
curl -X POST "http://localhost:3000/api/tickets/status" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_YOUR_API_KEY_HERE" \
  -d '{
    "statuses": ["OPEN", "IN_PROGRESS"],
    "dateFrom": "2025-08-01T00:00:00Z",
    "dateTo": "2025-08-31T23:59:59Z",
    "branchCode": "001",
    "limit": 20
  }'
```

### Response
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "cmetygsc9003phlkc3j9h4as0",
        "ticketNumber": "TKT-20250827-0006",
        "title": "Klaim ATM - Uang Tidak Keluar - 0126",
        "status": "OPEN",
        "priority": "HIGH",
        "createdAt": "2025-08-27T12:32:52.089Z",
        "updatedAt": "2025-08-27T12:32:52.089Z",
        "resolvedAt": null,
        "closedAt": null,
        "service": {
          "name": "Penarikan Tunai Internal - ATM Claim",
          "responseHours": 2,
          "resolutionHours": 24
        },
        "assignedTo": null,
        "branch": {
          "name": "CABANG UTAMA",
          "code": "001"
        },
        "slaStatus": {
          "hoursElapsed": 2.5,
          "isResponseBreached": false,
          "isResolutionBreached": false
        }
      }
    ],
    "summary": {
      "total": 1,
      "byStatus": {
        "OPEN": 1,
        "IN_PROGRESS": 0,
        "RESOLVED": 0,
        "CLOSED": 0
      },
      "byPriority": {
        "HIGH": 1,
        "MEDIUM": 0,
        "LOW": 0
      },
      "slaBreached": 0
    }
  },
  "timestamp": "2025-08-27T15:00:00.000Z"
}
```

---

## Status Values

| Status | Description |
|--------|-------------|
| `OPEN` | Ticket baru dibuat |
| `PENDING_APPROVAL` | Menunggu persetujuan |
| `APPROVED` | Disetujui |
| `REJECTED` | Ditolak |
| `IN_PROGRESS` | Sedang dikerjakan |
| `ON_HOLD` | Ditunda |
| `ESCALATED` | Dieskalasi |
| `RESOLVED` | Selesai |
| `CLOSED` | Ditutup |
| `CANCELLED` | Dibatalkan |
| `REOPENED` | Dibuka kembali |

## Priority Values

| Priority | Description |
|----------|-------------|
| `LOW` | Prioritas rendah |
| `MEDIUM` | Prioritas sedang |
| `HIGH` | Prioritas tinggi |
| `URGENT` | Sangat mendesak |

## Error Responses

### Missing Parameters
```json
{
  "error": "Either ticketNumber or ticketId must be provided",
  "timestamp": "2025-08-27T15:00:00.000Z",
  "status": 400
}
```

### Ticket Not Found
```json
{
  "error": "Ticket not found",
  "timestamp": "2025-08-27T15:00:00.000Z",
  "status": 404
}
```

### Unauthorized
```json
{
  "error": "No API key provided. Include in Authorization header as \"Bearer YOUR_KEY\" or in X-API-Key header",
  "timestamp": "2025-08-27T15:00:00.000Z",
  "status": 401
}
```

### Insufficient Permissions
```json
{
  "error": "Insufficient permissions to read ticket status",
  "timestamp": "2025-08-27T15:00:00.000Z",
  "status": 403
}
```

---

## Testing Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const API_KEY = 'sk_live_YOUR_API_KEY_HERE';
const API_URL = 'http://localhost:3000/api/tickets/status';

// Get single ticket status
async function getTicketStatus(ticketNumber) {
  try {
    const response = await axios.get(API_URL, {
      params: {
        ticketNumber: ticketNumber,
        includeDetails: true
      },
      headers: {
        'X-API-Key': API_KEY
      }
    });
    
    console.log('Ticket Status:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Get multiple tickets
async function getMultipleTickets() {
  try {
    const response = await axios.post(API_URL, {
      statuses: ['OPEN', 'IN_PROGRESS'],
      limit: 10
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    });
    
    console.log('Tickets:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage
getTicketStatus('TKT-20250827-0006');
getMultipleTickets();
```

### PowerShell
```powershell
$apiKey = "sk_live_YOUR_API_KEY_HERE"
$headers = @{
    "X-API-Key" = $apiKey
}

# Get single ticket
$ticketNumber = "TKT-20250827-0006"
$response = Invoke-RestMethod `
    -Uri "http://localhost:3000/api/tickets/status?ticketNumber=$ticketNumber&includeDetails=true" `
    -Headers $headers `
    -Method GET

$response | ConvertTo-Json -Depth 10

# Get multiple tickets
$body = @{
    statuses = @("OPEN", "IN_PROGRESS")
    limit = 10
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:3000/api/tickets/status" `
    -Headers $headers `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$response | ConvertTo-Json -Depth 10
```

---

## Notes

1. **SLA Calculation**: SLA hours are calculated from ticket creation time
2. **Response Time Limit**: Comments are limited to last 10 when `includeComments=true`
3. **Batch Limit**: Maximum 100 tickets can be fetched in batch request
4. **Performance**: Use simple status check for better performance when full details aren't needed
5. **Permissions**: API key must have `tickets:read` permission