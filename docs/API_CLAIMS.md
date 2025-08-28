# Claims API Documentation

## Overview
The Claims API allows external systems to automatically create claim tickets in the ServiceDesk system. This API supports various claim types including reimbursements, insurance claims, expenses, damages, and losses.

## Authentication
The API supports two authentication methods:

### 1. API Key Authentication (Recommended for external systems)
Include your API key in one of these headers:
- `X-API-Key: YOUR_API_KEY`
- `Authorization: Bearer YOUR_API_KEY`

### 2. Session Authentication (For logged-in users)
Uses existing session cookies from the web application.

## Generate an API Key
Run the following command to generate a new API key:
```bash
npm run api:generate-claim-key
```

## API Endpoints

### Create Claim Ticket
**POST** `/api/public/claims`

Creates a new claim ticket in the system.

#### Request Body
```json
{
  // Required claim fields
  "claimType": "REIMBURSEMENT", // REIMBURSEMENT, INSURANCE, EXPENSE, DAMAGE, LOSS, OTHER
  "claimReason": "Business travel expenses for client meeting in Jakarta",
  "claimantName": "John Doe",
  "claimantEmail": "john.doe@example.com",
  
  // Optional claim fields  
  "claimAmount": 5000000,
  "claimCurrency": "IDR",
  "claimDate": "2024-01-15T10:00:00Z",
  "claimantPhone": "081234567890",
  "claimantDepartment": "Sales",
  "claimantBranchCode": "BR001",
  "referenceNumber": "REF-2024-001",
  "approverEmail": "manager@example.com",
  
  // Optional ticket customization
  "title": "Custom ticket title",
  "description": "Additional description",
  "priority": "HIGH", // LOW, MEDIUM, HIGH, CRITICAL
  "serviceId": "service-id-if-known",
  
  // Optional attachments (base64 encoded)
  "attachments": [
    {
      "filename": "receipt.pdf",
      "mimeType": "application/pdf",
      "size": 102400,
      "content": "base64_encoded_content",
      "description": "Hotel receipt"
    }
  ],
  
  // Optional metadata
  "metadata": {
    "costCenter": "CC-001",
    "project": "Project Alpha"
  }
}
```

#### Response (Success - 201)
```json
{
  "success": true,
  "data": {
    "ticketNumber": "CLM-2024-000001",
    "ticketId": "clm_abc123",
    "status": "PENDING_APPROVAL",
    "priority": "HIGH",
    "title": "REIMBURSEMENT Claim - John Doe - Rp5.000.000",
    "service": "General Claim Request",
    "branch": {
      "name": "Head Office",
      "code": "BR001"
    },
    "sla": {
      "responseHours": 4,
      "resolutionHours": 72,
      "expectedResponseBy": "2024-01-15T14:00:00Z",
      "expectedResolutionBy": "2024-01-18T10:00:00Z"
    },
    "trackingUrl": "http://localhost:3000/tickets/clm_abc123",
    "createdAt": "2024-01-15T10:00:00Z",
    "claimDetails": {
      "type": "REIMBURSEMENT",
      "amount": 5000000,
      "currency": "IDR",
      "referenceNumber": "REF-2024-001"
    }
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### Get Claim Status
**GET** `/api/public/claims?ticketNumber={ticketNumber}`

Retrieves the current status and details of a claim ticket.

#### Query Parameters
- `ticketNumber` (required): The claim ticket number (e.g., CLM-2024-000001)

#### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "ticketNumber": "CLM-2024-000001",
    "ticketId": "clm_abc123",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "title": "REIMBURSEMENT Claim - John Doe - Rp5.000.000",
    "description": "Full ticket description with claim details",
    "service": "General Claim Request",
    "createdBy": {
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "assignedTo": {
      "name": "Jane Smith",
      "email": "jane.smith@example.com"
    },
    "branch": {
      "name": "Head Office",
      "code": "BR001"
    },
    "claimDetails": {
      "type": "REIMBURSEMENT",
      "amount": "Rp5.000.000",
      "date": "2024-01-15T10:00:00Z",
      "referenceNumber": "REF-2024-001"
    },
    "sla": {
      "responseBreached": false,
      "resolutionBreached": false,
      "responseDeadline": "2024-01-15T14:00:00Z",
      "resolutionDeadline": "2024-01-18T10:00:00Z"
    },
    "timeline": {
      "created": "2024-01-15T10:00:00Z",
      "updated": "2024-01-15T11:30:00Z",
      "resolved": null,
      "closed": null
    },
    "comments": [
      {
        "content": "Claim has been approved by supervisor",
        "createdAt": "2024-01-15T11:30:00Z",
        "author": "Jane Smith"
      }
    ],
    "trackingUrl": "http://localhost:3000/tickets/clm_abc123"
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error: claimReason: String must contain at least 10 character(s)",
  "timestamp": "2024-01-15T10:00:00Z",
  "status": 400
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized. Provide API key or valid session",
  "timestamp": "2024-01-15T10:00:00Z",
  "status": 401
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions to create claim tickets",
  "timestamp": "2024-01-15T10:00:00Z",
  "status": 403
}
```

### 404 Not Found
```json
{
  "error": "Ticket not found",
  "timestamp": "2024-01-15T10:00:00Z",
  "status": 404
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create claim ticket",
  "timestamp": "2024-01-15T10:00:00Z",
  "status": 500
}
```

## Priority Auto-Assignment
The system automatically assigns priority based on claim amount:
- **CRITICAL**: >= 100,000,000 IDR
- **HIGH**: >= 50,000,000 IDR
- **MEDIUM**: >= 10,000,000 IDR
- **LOW**: < 10,000,000 IDR

You can override this by specifying the `priority` field in the request.

## Claim Types
- `REIMBURSEMENT`: For expense reimbursements
- `INSURANCE`: For insurance claims
- `EXPENSE`: For expense reports
- `DAMAGE`: For damage claims (marked as confidential)
- `LOSS`: For loss claims (marked as confidential)
- `OTHER`: For other claim types

## Example Usage

### cURL
```bash
# Create a claim
curl -X POST http://localhost:3000/api/public/claims \
  -H "X-API-Key: sk_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "claimType": "REIMBURSEMENT",
    "claimAmount": 5000000,
    "claimReason": "Business travel expenses for client meeting",
    "claimantName": "John Doe",
    "claimantEmail": "john.doe@example.com"
  }'

# Check status
curl -X GET "http://localhost:3000/api/public/claims?ticketNumber=CLM-2024-000001" \
  -H "X-API-Key: sk_live_YOUR_API_KEY"
```

### JavaScript/Fetch
```javascript
// Create a claim
const response = await fetch('http://localhost:3000/api/public/claims', {
  method: 'POST',
  headers: {
    'X-API-Key': 'sk_live_YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    claimType: 'REIMBURSEMENT',
    claimAmount: 5000000,
    claimReason: 'Business travel expenses for client meeting',
    claimantName: 'John Doe',
    claimantEmail: 'john.doe@example.com'
  })
});

const result = await response.json();
console.log('Ticket created:', result.data.ticketNumber);
```

### Python
```python
import requests

# Create a claim
response = requests.post(
    'http://localhost:3000/api/public/claims',
    headers={
        'X-API-Key': 'sk_live_YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'claimType': 'REIMBURSEMENT',
        'claimAmount': 5000000,
        'claimReason': 'Business travel expenses for client meeting',
        'claimantName': 'John Doe',
        'claimantEmail': 'john.doe@example.com'
    }
)

result = response.json()
print(f"Ticket created: {result['data']['ticketNumber']}")
```

## Rate Limiting
API keys are subject to rate limiting. Each API call updates the usage counter and last used timestamp.

## Security Notes
1. Keep your API key secure and never expose it in client-side code
2. Use HTTPS in production to prevent API key interception
3. Rotate API keys regularly
4. Monitor API usage through the audit logs