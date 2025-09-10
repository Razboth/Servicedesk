# Ticket Status API Endpoints

## Overview
These endpoints allow you to update ticket status programmatically, either for individual tickets or in batch.

## Authentication
- **Session-based**: Use PUT method with active session (for web app users)
- **API Key**: Use PATCH method with API key in headers (for external integrations)

---

## 1. Individual Ticket Status Update

### Endpoint
```
PUT /api/tickets/{ticketId}/status    (Session auth)
PATCH /api/tickets/{ticketId}/status  (API key auth)
```

### Request Body
```json
{
  "status": "IN_PROGRESS",  // Required: OPEN, PENDING, IN_PROGRESS, RESOLVED, CLOSED, etc.
  "reason": "Starting work on this ticket",  // Optional: Reason for status change
  "resolutionNotes": "Fixed by restarting service"  // Optional: Notes when resolving
}
```

### Response (Success)
```json
{
  "success": true,
  "ticket": {
    "id": "ticket-id",
    "ticketNumber": "TKT-2025-001234",
    "status": "IN_PROGRESS",
    "title": "Ticket title",
    // ... other ticket fields
  },
  "message": "Ticket status updated to IN_PROGRESS"
}
```

### Permissions
- **ADMIN/SUPER_ADMIN**: Can update any ticket
- **MANAGER**: Can update tickets in their branch
- **TECHNICIAN**: Can update tickets assigned to them
- **USER/AGENT**: Can only cancel their own tickets

---

## 2. Batch Status Update

### Endpoint
```
PUT /api/tickets/batch-status    (Session auth)
PATCH /api/tickets/batch-status  (API key auth)
```

### Request Body
```json
{
  "ticketIds": ["ticket-id-1", "ticket-id-2", "ticket-id-3"],  // Max 100 tickets
  "status": "RESOLVED",
  "reason": "Bulk resolution after system fix",  // Optional
  "resolutionNotes": "System issue resolved"  // Optional
}
```

### Response (Success)
```json
{
  "success": true,
  "updated": 3,
  "requested": 3,
  "skipped": 0,
  "message": "Successfully updated 3 ticket(s) to RESOLVED"
}
```

### Permissions
- **ADMIN/SUPER_ADMIN**: Can batch update any tickets
- **MANAGER**: Can batch update tickets in their branch only
- Other roles cannot perform batch updates

---

## 3. Get Ticket Status (Existing)

### Endpoint
```
GET /api/tickets/status?ticketNumber=TKT-2025-001234
GET /api/tickets/status?ticketId=ticket-id
```

### Query Parameters
- `ticketNumber` or `ticketId` (one required)
- `includeDetails=true` - Include full ticket details
- `includeComments=true` - Include last 10 comments
- `includeAttachments=true` - Include attachment info
- `includeFieldValues=true` - Include custom field values

### Response
```json
{
  "success": true,
  "data": {
    "ticketNumber": "TKT-2025-001234",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "title": "Ticket title",
    "slaStatus": {
      "hoursElapsed": 2.5,
      "isResponseBreached": false,
      "isResolutionBreached": false
    }
  }
}
```

---

## Status Values

### Available Statuses
- `OPEN` - Newly created ticket
- `PENDING` - Waiting for information
- `PENDING_APPROVAL` - Awaiting manager approval
- `APPROVED` - Approved by manager
- `REJECTED` - Rejected by manager
- `IN_PROGRESS` - Being worked on
- `PENDING_VENDOR` - Waiting for vendor
- `RESOLVED` - Issue resolved
- `CLOSED` - Ticket closed
- `CANCELLED` - Ticket cancelled

### Status Transition Rules
- Cannot change from `CLOSED` to `OPEN` or `IN_PROGRESS` directly
- Cannot change from `RESOLVED` to `PENDING_APPROVAL`
- Cannot reactivate `CANCELLED` tickets

---

## API Key Authentication

For API key authentication, include the following header:
```
X-API-Key: your-api-key-here
```

API keys must have `tickets:write` permission to update ticket status.

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request data",
  "details": [...]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "You do not have permission to update this ticket status"
}
```

### 404 Not Found
```json
{
  "error": "Ticket not found"
}
```

---

## Examples

### cURL - Update Single Ticket Status (API Key)
```bash
curl -X PATCH https://servicedesk.banksulutgo.co.id/api/tickets/ticket-id/status \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "RESOLVED",
    "resolutionNotes": "Issue fixed by restarting the service"
  }'
```

### JavaScript - Batch Update (Session)
```javascript
const response = await fetch('/api/tickets/batch-status', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ticketIds: ['id1', 'id2', 'id3'],
    status: 'CLOSED',
    reason: 'Monthly closure of resolved tickets'
  })
});
```

### Python - Get Ticket Status
```python
import requests

headers = {'X-API-Key': 'your-api-key'}
params = {'ticketNumber': 'TKT-2025-001234', 'includeDetails': 'true'}
response = requests.get(
    'https://servicedesk.banksulutgo.co.id/api/tickets/status',
    headers=headers,
    params=params
)
print(response.json())
```