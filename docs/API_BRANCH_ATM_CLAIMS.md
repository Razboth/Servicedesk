# Branch ATM Claims API Documentation

## Overview
The Branch ATM Claims API provides endpoints for managing ATM-related claims at the branch level. This system enables branch staff to process claims, perform verifications, assign tasks, and facilitate inter-branch communication.

## Authentication
All endpoints require authentication via NextAuth session. The user must have one of the following roles:
- `MANAGER` - Full access to all branch operations
- `ADMIN` - System-wide access
- `USER` - Branch staff/CS/Teller access
- `AGENT` - Limited branch operations access

## Base URL
```
https://your-domain.com/api/branch/atm-claims
```

---

## Endpoints

### 1. List ATM Claims
**GET** `/api/branch/atm-claims`

Retrieves a list of ATM claims for the user's branch.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by claim status (OPEN, IN_PROGRESS, RESOLVED, etc.) |
| priority | string | No | Filter by priority (LOW, MEDIUM, HIGH, URGENT) |
| source | string | No | Filter by source: 'internal' (same branch) or 'external' (other branches) |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 10) |
| search | string | No | Search by ticket number or customer name |

#### Response
```json
{
  "claims": [
    {
      "id": "claim-id",
      "ticketNumber": "CLM-20241228-0001",
      "title": "ATM Claim - CASH_NOT_DISPENSED - ATM-001234",
      "description": "Customer claim details...",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "createdAt": "2024-12-28T10:30:00Z",
      "branch": {
        "name": "Cabang Manado",
        "code": "001"
      },
      "createdBy": {
        "name": "John Doe",
        "email": "john@bank.com",
        "branch": {
          "name": "Cabang Tomohon",
          "code": "002"
        }
      },
      "atmClaimVerification": {
        "verifiedAt": "2024-12-28T14:00:00Z",
        "recommendation": "APPROVE"
      },
      "branchAssignments": [
        {
          "id": "assignment-id",
          "status": "IN_PROGRESS",
          "assignedTo": {
            "name": "Jane Smith"
          }
        }
      ],
      "_count": {
        "comments": 5,
        "attachments": 2
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  },
  "statistics": {
    "total": 25,
    "byStatus": [
      { "status": "OPEN", "_count": 10 },
      { "status": "IN_PROGRESS", "_count": 8 },
      { "status": "RESOLVED", "_count": 7 }
    ],
    "pendingVerifications": 12,
    "fromOtherBranches": 5
  }
}
```

#### Status Codes
- `200 OK` - Successfully retrieved claims
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User lacks required role
- `400 Bad Request` - User has no branch assigned

---

### 2. Create ATM Claim
**POST** `/api/branch/atm-claims`

Creates a new ATM claim for a customer.

#### Request Body
```json
{
  "atmCode": "ATM-001234",
  "customerName": "John Customer",
  "customerAccount": "1234567890",
  "customerPhone": "081234567890",
  "customerEmail": "customer@email.com",
  "transactionAmount": 500000,
  "transactionDate": "2024-12-28T10:00:00Z",
  "transactionRef": "REF123456",
  "cardLast4": "1234",
  "claimType": "CASH_NOT_DISPENSED",
  "claimDescription": "Customer attempted withdrawal but cash was not dispensed..."
}
```

#### Claim Types
- `CARD_CAPTURED` - Card retained by ATM
- `CASH_NOT_DISPENSED` - Money not dispensed
- `WRONG_AMOUNT` - Incorrect amount dispensed
- `DOUBLE_DEBIT` - Duplicate charges
- `TIMEOUT` - Transaction timeout
- `OTHER` - Other issues

#### Response
```json
{
  "success": true,
  "ticket": {
    "id": "ticket-id",
    "ticketNumber": "CLM-20241228-0001",
    "title": "ATM Claim - CASH_NOT_DISPENSED - ATM-001234",
    "status": "OPEN",
    "priority": "HIGH",
    "createdById": "user-id",
    "branchId": "branch-id"
  },
  "routing": {
    "isInterBranch": true,
    "fromBranch": "Cabang Tomohon",
    "toBranch": "Cabang Manado"
  }
}
```

#### Status Codes
- `201 Created` - Claim successfully created
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - ATM code not found
- `400 Bad Request` - Invalid request data

---

### 3. Get/Update Verification Checklist
**GET** `/api/branch/atm-claims/{ticketId}/verify`

Retrieves the verification checklist for a claim.

#### Response
```json
{
  "verification": {
    "id": "verification-id",
    "ticketId": "ticket-id",
    "journalChecked": true,
    "journalFindings": "Transaction found in journal...",
    "ejTransactionFound": true,
    "ejReferenceNumber": "EJ123456",
    "amountMatches": true,
    "cashOpening": 10000000,
    "cashDispensed": 500000,
    "cashRemaining": 9500000,
    "cashVariance": 0,
    "cctvReviewed": true,
    "cctvFindings": "Customer visible at ATM...",
    "debitSuccessful": false,
    "reversalCompleted": null,
    "recommendation": "APPROVE",
    "recommendationNotes": "All verifications passed...",
    "verifiedAt": "2024-12-28T14:00:00Z",
    "verifiedBy": {
      "name": "Verifier Name"
    }
  },
  "progress": 85
}
```

**POST** `/api/branch/atm-claims/{ticketId}/verify`

Updates the verification checklist.

#### Request Body
```json
{
  "journalChecked": true,
  "journalFindings": "Transaction confirmed in journal",
  "ejTransactionFound": true,
  "ejReferenceNumber": "EJ123456",
  "amountMatches": true,
  "cashOpening": 10000000,
  "cashDispensed": 500000,
  "cashRemaining": 9500000,
  "cashVariance": 0,
  "cctvReviewed": true,
  "cctvFindings": "Customer visible at ATM during transaction",
  "cctvEvidenceUrl": "https://cctv.bank.com/evidence/123",
  "debitSuccessful": false,
  "reversalCompleted": null,
  "recommendation": "APPROVE",
  "recommendationNotes": "All verifications confirm the claim is valid"
}
```

#### Recommendations
- `APPROVE` - Approve the claim
- `REJECT` - Reject the claim
- `ESCALATE` - Escalate to HO/IT
- `NEED_MORE_INFO` - Request additional information

---

### 4. Manage Branch Assignments
**GET** `/api/branch/atm-claims/{ticketId}/assign`

Retrieves all task assignments for a claim.

#### Response
```json
{
  "assignments": [
    {
      "id": "assignment-id",
      "taskType": "JOURNAL_CHECK",
      "description": "Verify ATM journal for transaction",
      "status": "IN_PROGRESS",
      "assignedTo": {
        "id": "user-id",
        "name": "Jane Smith",
        "email": "jane@bank.com"
      },
      "assignedBy": {
        "name": "Manager Name"
      },
      "createdAt": "2024-12-28T10:00:00Z",
      "startedAt": "2024-12-28T10:30:00Z",
      "completedAt": null,
      "dueDate": "2024-12-29T17:00:00Z",
      "completionNotes": null
    }
  ]
}
```

**POST** `/api/branch/atm-claims/{ticketId}/assign`

Creates a new task assignment.

#### Request Body
```json
{
  "assignedToId": "user-id",
  "taskType": "JOURNAL_CHECK",
  "description": "Please verify the ATM journal for this transaction",
  "dueDate": "2024-12-29T17:00:00Z"
}
```

#### Task Types
- `JOURNAL_CHECK` - Journal verification
- `EJ_ANALYSIS` - Electronic journal analysis
- `CASH_COUNT` - Cash reconciliation
- `CCTV_REVIEW` - CCTV review
- `CORE_BANKING` - Core banking check
- `CUSTOMER_CONTACT` - Customer contact
- `ATM_VENDOR` - ATM vendor coordination
- `DOCUMENTATION` - Documentation
- `GENERAL` - General task

**PUT** `/api/branch/atm-claims/{ticketId}/assign`

Updates task assignment status.

#### Request Body
```json
{
  "assignmentId": "assignment-id",
  "status": "COMPLETED",
  "completionNotes": "Journal verified, transaction confirmed"
}
```

#### Assignment Status
- `PENDING` - Not started
- `IN_PROGRESS` - Being worked on
- `COMPLETED` - Successfully completed
- `CANCELLED` - Cancelled

---

### 5. Inter-Branch Communication
**GET** `/api/branch/atm-claims/{ticketId}/collaborate`

Retrieves communication messages for a claim.

#### Response
```json
{
  "messages": [
    {
      "id": "message-id",
      "messageType": "QUESTION",
      "subject": "Need clarification on transaction",
      "content": "Can you confirm if the customer...",
      "fromUser": {
        "id": "user-id",
        "name": "John Doe",
        "email": "john@bank.com",
        "branch": {
          "name": "Cabang Tomohon",
          "code": "002"
        }
      },
      "toBranch": {
        "name": "Cabang Manado",
        "code": "001"
      },
      "isRead": true,
      "readBy": ["user-id-1", "user-id-2"],
      "createdAt": "2024-12-28T11:00:00Z",
      "attachments": []
    }
  ]
}
```

**POST** `/api/branch/atm-claims/{ticketId}/collaborate`

Sends a new communication message.

#### Request Body
```json
{
  "messageType": "INFORMATION",
  "subject": "Update on verification",
  "content": "We have completed the journal verification...",
  "toBranchId": "branch-id"
}
```

#### Message Types
- `QUESTION` - Question requiring response
- `INFORMATION` - Informational update
- `REQUEST` - Request for action
- `UPDATE` - Status update
- `ESCALATION` - Escalation notice
- `RESOLUTION` - Resolution information

**PUT** `/api/branch/atm-claims/{ticketId}/collaborate`

Marks messages as read.

#### Request Body
```json
{
  "messageIds": ["message-id-1", "message-id-2"]
}
```

---

## Supporting Endpoints

### Get ATM Details
**GET** `/api/atms/lookup?code={atmCode}`

Looks up ATM information by code.

#### Response
```json
{
  "id": "atm-id",
  "code": "ATM-001234",
  "location": "Mall Manado Town Square",
  "branch": {
    "id": "branch-id",
    "name": "Cabang Manado",
    "code": "001"
  }
}
```

### Get Branch Staff
**GET** `/api/branch/staff?branchId={branchId}`

Retrieves staff members for task assignment.

#### Response
```json
{
  "staff": [
    {
      "id": "user-id",
      "name": "Jane Smith",
      "email": "jane@bank.com",
      "role": "USER",
      "department": "Operations",
      "currentTasks": 3
    }
  ]
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

### Common Error Codes
- `400 Bad Request` - Invalid request parameters or body
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User lacks required permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Workflow Example

### Complete ATM Claim Processing Flow

1. **Customer reports issue to CS/Teller**
   ```bash
   POST /api/branch/atm-claims
   ```

2. **Branch staff views the claim**
   ```bash
   GET /api/branch/atm-claims?source=internal
   ```

3. **Manager assigns verification tasks**
   ```bash
   POST /api/branch/atm-claims/{ticketId}/assign
   ```

4. **Staff performs verification**
   ```bash
   POST /api/branch/atm-claims/{ticketId}/verify
   ```

5. **Inter-branch communication if needed**
   ```bash
   POST /api/branch/atm-claims/{ticketId}/collaborate
   ```

6. **Manager reviews and approves**
   ```bash
   POST /api/approvals
   {
     "ticketIds": ["ticket-id"],
     "action": "approve",
     "reason": "Verification complete"
   }
   ```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated requests

---

## Webhooks (Future Implementation)

Planned webhook events:
- `claim.created` - New claim created
- `claim.verified` - Verification completed
- `claim.approved` - Claim approved
- `claim.rejected` - Claim rejected
- `task.assigned` - Task assigned to staff
- `task.completed` - Task completed

---

## Testing

### Using cURL

#### Create a claim
```bash
curl -X POST https://your-domain.com/api/branch/atm-claims \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "atmCode": "ATM-001234",
    "customerName": "Test Customer",
    "customerAccount": "1234567890",
    "customerPhone": "081234567890",
    "transactionAmount": 500000,
    "transactionDate": "2024-12-28T10:00:00Z",
    "claimType": "CASH_NOT_DISPENSED",
    "claimDescription": "Test claim"
  }'
```

#### Get claims list
```bash
curl -X GET "https://your-domain.com/api/branch/atm-claims?status=OPEN&page=1" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Using JavaScript/Fetch

```javascript
// Create ATM claim
const createClaim = async () => {
  const response = await fetch('/api/branch/atm-claims', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      atmCode: 'ATM-001234',
      customerName: 'Test Customer',
      customerAccount: '1234567890',
      customerPhone: '081234567890',
      transactionAmount: 500000,
      transactionDate: new Date().toISOString(),
      claimType: 'CASH_NOT_DISPENSED',
      claimDescription: 'Customer attempted withdrawal but no cash dispensed'
    })
  });
  
  const data = await response.json();
  console.log('Claim created:', data);
};

// Get verification status
const getVerification = async (ticketId) => {
  const response = await fetch(`/api/branch/atm-claims/${ticketId}/verify`);
  const data = await response.json();
  console.log('Verification status:', data);
};
```

### Using Python

```python
import requests
import json

# Create ATM claim
def create_atm_claim(session_token):
    url = "https://your-domain.com/api/branch/atm-claims"
    headers = {
        "Content-Type": "application/json",
        "Cookie": f"next-auth.session-token={session_token}"
    }
    
    payload = {
        "atmCode": "ATM-001234",
        "customerName": "Test Customer",
        "customerAccount": "1234567890",
        "customerPhone": "081234567890",
        "transactionAmount": 500000,
        "transactionDate": "2024-12-28T10:00:00Z",
        "claimType": "CASH_NOT_DISPENSED",
        "claimDescription": "Test claim from Python"
    }
    
    response = requests.post(url, json=payload, headers=headers)
    return response.json()

# Get claims list
def get_claims(session_token, status="OPEN"):
    url = f"https://your-domain.com/api/branch/atm-claims?status={status}"
    headers = {
        "Cookie": f"next-auth.session-token={session_token}"
    }
    
    response = requests.get(url, headers=headers)
    return response.json()
```

---

## Migration Guide

For existing ATM claim tickets created through the regular ticket system:

1. Existing tickets with service name containing "ATM Claim" will be visible in the branch ATM claims interface
2. A migration script can be run to create `ATMClaimVerification` records for existing tickets
3. Branch assignments can be created for existing tickets to enable the new workflow

---

## Support

For API support and questions:
- Email: api-support@banksulutgo.id
- Documentation: https://docs.banksulutgo.id/api/branch-atm-claims
- Status Page: https://status.banksulutgo.id

---

## Changelog

### Version 1.0.0 (2024-12-28)
- Initial release of Branch ATM Claims API
- Support for claim creation, verification, assignment, and communication
- Inter-branch collaboration features
- Role-based access control