# ATM Claim API - Comprehensive Documentation

**Version:** 1.0
**Last Updated:** 2025-01-27
**Endpoint:** `/api/tickets/atm-claim`

## Overview

The ATM Claim API enables external systems (particularly ATM terminals and monitoring systems) to programmatically create claim tickets for ATM-related incidents in the Bank SulutGo ServiceDesk system. This endpoint follows ITIL v4 best practices and integrates seamlessly with the bank's incident management workflow.

## Business Context

### ATM Claim Process Flow

1. **Incident Detection**: ATM malfunction or customer complaint occurs
2. **Claim Submission**: Automated or manual claim creation via API
3. **Auto-Routing**: Ticket automatically routed to the ATM's owner branch
4. **Investigation**: Branch team investigates using system verification tools
5. **Resolution**: Ticket resolved with appropriate customer compensation
6. **Closure**: Audit trail maintained for compliance

### Integration Points

- **ATM Terminal Systems**: Real-time incident reporting
- **Core Banking System**: Transaction verification
- **Branch Management**: Automated workflow routing
- **Monitoring Systems**: Proactive claim generation
- **Customer Service**: Call center integration

---

## Endpoint Specification

### HTTP Method and URL
```
POST /api/tickets/atm-claim
```

### Base URLs
- **Development**: `http://localhost:3000/api/tickets/atm-claim`
- **Production**: `https://servicedesk.banksulutgo.co.id/api/tickets/atm-claim`

### Content Type
```
Content-Type: application/json
```

---

## Authentication & Authorization

### API Key Requirements

The endpoint requires a valid API key with specific permissions. API keys are managed through the ServiceDesk administration panel.

#### Headers (Choose one method)

**Method 1: X-API-Key Header (Recommended)**
```http
X-API-Key: sk_live_abcd1234567890efghijklmnopqrstuvwxyz
```

**Method 2: Authorization Bearer Token**
```http
Authorization: Bearer sk_live_abcd1234567890efghijklmnopqrstuvwxyz
```

### Required Permissions

The API key must have the following permission:
- `tickets:create:atm-claim` - Specific permission for ATM claim ticket creation

### Optional Permissions (for enhanced functionality)
- `tickets:create` - General ticket creation
- `atm:read` - ATM information access
- `tickets:read` - Ticket status checking

### API Key Generation

To generate an API key for ATM claims:

```bash
# Using the provided script
npm run api:generate-claim-key

# Or manually via the admin interface
# Navigate to: /admin/api-keys → Create New Key
# Set permissions: ["tickets:create:atm-claim", "atm:read"]
# Set description: "ATM System Integration Key"
```

---

## Request Schema

### Required Headers
```http
Content-Type: application/json
X-API-Key: sk_live_your_api_key_here
```

### Request Body Structure

```json
{
  // ATM Information (Required)
  "atm_code": "string",                    // ATM terminal code

  // Transaction Details (Required)
  "transaction_date": "ISO8601 datetime", // Transaction timestamp
  "transaction_amount": "number",          // Amount in Rupiah
  "card_last_4": "string",                // Last 4 digits of card

  // Customer Information (Required)
  "customer_name": "string",               // Full customer name
  "customer_account": "string",            // Account number
  "customer_phone": "string",              // Phone number

  // Claim Details (Required)
  "claim_type": "enum",                    // Type of claim
  "claim_description": "string",           // Detailed description
  "reporting_channel": "enum",             // Reporting channel

  // Optional Fields
  "transaction_ref": "string",             // Transaction reference
  "customer_email": "string",              // Customer email
  "evidence_file": {                       // File attachment
    "filename": "string",
    "originalName": "string",
    "mimeType": "string",
    "size": "number",
    "content": "base64_string"
  }
}
```

---

## Field Specifications

### Required Fields

#### ATM Information

| Field | Type | Format | Description | Validation | Example |
|-------|------|--------|-------------|------------|---------|
| `atm_code` | string | Alphanumeric | ATM terminal identifier | Must exist in ATM registry | `"0126"` |

**Business Rules:**
- ATM code must be registered in the system
- Determines automatic routing to owner branch
- Links to ATM location and branch information

#### Transaction Details

| Field | Type | Format | Description | Validation | Example |
|-------|------|--------|-------------|------------|---------|
| `transaction_date` | string | ISO 8601 | Transaction timestamp | Valid datetime format | `"2024-03-15T10:30:00Z"` |
| `transaction_amount` | number | Integer | Amount in Rupiah | Min: 50,000, Max: 50,000,000 | `2500000` |
| `card_last_4` | string | Numeric | Last 4 digits of ATM card | Exactly 4 digits | `"5678"` |

**Business Rules:**
- Transaction date cannot be in the future
- Amount limits align with ATM withdrawal limits
- Card digits used for verification purposes

#### Customer Information

| Field | Type | Format | Description | Validation | Example |
|-------|------|--------|-------------|------------|---------|
| `customer_name` | string | Text | Full customer name | 2-100 characters | `"Budi Santoso"` |
| `customer_account` | string | Alphanumeric | Bank account number | 10-20 characters | `"1234567890"` |
| `customer_phone` | string | Numeric | Mobile phone number | Indonesian format | `"081234567890"` |

**Business Rules:**
- Customer name must match bank records for verification
- Account number validated against core banking system
- Phone number used for claim status updates

#### Claim Details

| Field | Type | Format | Description | Validation | Example |
|-------|------|--------|-------------|------------|---------|
| `claim_type` | string | Enum | Type of ATM claim | See claim types below | `"CASH_NOT_DISPENSED"` |
| `claim_description` | string | Text | Detailed incident description | 20-2000 characters | `"Detailed chronology..."` |
| `reporting_channel` | string | Enum | How claim was reported | See channels below | `"BRANCH"` |

### Optional Fields

| Field | Type | Format | Description | Example |
|-------|------|--------|-------------|---------|
| `transaction_ref` | string | Alphanumeric | Transaction reference number | `"REF20240315103000"` |
| `customer_email` | string | Email | Customer email address | `"customer@example.com"` |
| `evidence_file` | object | File attachment | Supporting documentation | See file structure below |

### Enumerations

#### Claim Types (`claim_type`)

| Value | Label | Description | SLA Hours |
|-------|-------|-------------|-----------|
| `CARD_CAPTURED` | Kartu Tertelan | Card retained by ATM | 4 |
| `CASH_NOT_DISPENSED` | Uang Tidak Keluar | Cash not dispensed after debit | 2 |
| `WRONG_AMOUNT` | Nominal Tidak Sesuai | Incorrect amount dispensed | 4 |
| `DOUBLE_DEBIT` | Terdebet Ganda | Double debit on account | 24 |
| `TIMEOUT` | Transaksi Timeout | Transaction timeout issues | 8 |
| `OTHER` | Lainnya | Other ATM-related issues | 24 |

#### Reporting Channels (`reporting_channel`)

| Value | Label | Description |
|-------|-------|-------------|
| `BRANCH` | Walk-in Cabang | Customer reported at branch |
| `CALL_CENTER` | Call Center | Reported via phone |
| `EMAIL` | Email | Email-based reporting |
| `MOBILE` | Mobile Banking | Mobile app reporting |

#### File Attachment Structure (`evidence_file`)

```json
{
  "filename": "struk_atm.jpg",           // Required: File name
  "originalName": "Struk ATM - Original.jpg", // Optional: Original file name
  "mimeType": "image/jpeg",              // Required: MIME type
  "size": 524288,                       // Required: File size in bytes
  "content": "base64_encoded_content"    // Required: Base64 encoded file
}
```

**Supported File Types:**
- Images: `image/jpeg`, `image/png`, `image/gif`
- Documents: `application/pdf`
- Maximum size: 10MB

---

## Response Formats

### Success Response (HTTP 201)

```json
{
  "success": true,
  "message": "Ticket klaim ATM berhasil dibuat: 2024001234",
  "ticket": {
    "id": "cm_ticket_id_here",
    "ticketNumber": "2024001234",
    "title": "Klaim ATM - Uang Tidak Keluar - 0126",
    "description": "**Informasi Klaim ATM**\n- Jenis Klaim: Uang Tidak Keluar\n- ATM: 0126 - Mobil Kas Keliling\n- Tanggal Transaksi: 15/03/2024, 10:30:00\n- Nominal: Rp 2.500.000\n\n**Informasi Nasabah**\n- Nama: Budi Santoso\n- No. Rekening: 1234567890\n- No. HP: 081234567890\n- Email: budi.santoso@example.com\n- Kartu ATM (4 digit): ****5678\n\n**Kronologi Kejadian**\nSaya melakukan penarikan tunai sebesar Rp 2.500.000 namun uang tidak keluar dari mesin ATM...\n\n**Informasi Pelaporan**\n- Channel: Walk-in Cabang\n- Cabang Pelapor: CABANG UTAMA\n- Cabang Pemilik ATM: CABANG UTAMA\n- No. Referensi: REF20240315103000",
    "status": "PENDING_APPROVAL",
    "priority": "HIGH",
    "createdAt": "2024-03-15T10:30:00Z",
    "service": {
      "name": "Penarikan Tunai Internal - ATM Claim",
      "requiresApproval": true
    },
    "createdBy": {
      "name": "ATM System User",
      "email": "atm-system@banksulutgo.co.id",
      "role": "AGENT"
    },
    "branch": {
      "name": "CABANG UTAMA",
      "code": "001"
    },
    "fieldValues": [
      {
        "field": {
          "name": "atm_code",
          "label": "Kode ATM / Terminal ID",
          "type": "SELECT"
        },
        "value": "0126"
      },
      {
        "field": {
          "name": "transaction_amount",
          "label": "Nominal Transaksi (Rp)",
          "type": "NUMBER"
        },
        "value": "2500000"
      }
      // ... additional field values
    ],
    "attachments": [
      {
        "id": "attachment_id",
        "filename": "struk_atm_20240315.jpg",
        "originalName": "Struk ATM - 15 Maret 2024.jpg",
        "mimeType": "image/jpeg",
        "size": 524288,
        "createdAt": "2024-03-15T10:30:00Z"
      }
    ],
    "approvals": [
      {
        "status": "PENDING",
        "reason": "Awaiting manager approval",
        "createdAt": "2024-03-15T10:30:00Z"
      }
    ]
  },
  "routing": {
    "reportingBranch": "CABANG UTAMA",
    "ownerBranch": "CABANG UTAMA",
    "routedTo": "CABANG UTAMA",
    "atm": {
      "code": "0126",
      "location": "Mobil Kas Keliling"
    }
  },
  "approval": {
    "status": "PENDING",
    "reason": "Awaiting manager approval",
    "requiresApproval": true
  },
  "timestamp": "2024-03-15T10:30:00Z"
}
```

### Error Responses

#### Bad Request (HTTP 400)
```json
{
  "error": "Missing required fields: customer_phone, claim_type",
  "timestamp": "2024-03-15T10:30:00Z",
  "status": 400
}
```

#### Unauthorized (HTTP 401)
```json
{
  "error": "No API key provided. Include in Authorization header as \"Bearer YOUR_KEY\" or in X-API-Key header",
  "timestamp": "2024-03-15T10:30:00Z",
  "status": 401
}
```

#### Forbidden (HTTP 403)
```json
{
  "error": "Insufficient permissions to create ATM claim tickets",
  "timestamp": "2024-03-15T10:30:00Z",
  "status": 403
}
```

#### Not Found (HTTP 404)
```json
{
  "error": "ATM with code INVALID123 not found",
  "timestamp": "2024-03-15T10:30:00Z",
  "status": 404
}
```

#### Internal Server Error (HTTP 500)
```json
{
  "error": "Failed to create ATM claim ticket",
  "timestamp": "2024-03-15T10:30:00Z",
  "status": 500
}
```

---

## Integration Examples

### 1. Basic ATM Claim (Minimal Fields)

```bash
curl -X POST https://servicedesk.banksulutgo.co.id/api/tickets/atm-claim \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_your_api_key_here" \
  -d '{
    "atm_code": "0126",
    "transaction_date": "2024-03-15T10:30:00Z",
    "transaction_amount": 1000000,
    "card_last_4": "1234",
    "customer_name": "Ahmad Wijaya",
    "customer_account": "9876543210",
    "customer_phone": "082345678901",
    "claim_type": "CARD_CAPTURED",
    "claim_description": "Kartu ATM tertelan saat melakukan transaksi penarikan tunai. Transaksi gagal dan kartu tidak keluar setelah menunggu 5 menit.",
    "reporting_channel": "CALL_CENTER"
  }'
```

### 2. Complete ATM Claim (All Fields)

```bash
curl -X POST https://servicedesk.banksulutgo.co.id/api/tickets/atm-claim \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_your_api_key_here" \
  -d '{
    "atm_code": "0126",
    "transaction_date": "2024-03-15T10:30:00Z",
    "transaction_amount": 2500000,
    "transaction_ref": "REF20240315103000",
    "card_last_4": "5678",
    "customer_name": "Budi Santoso",
    "customer_account": "1234567890",
    "customer_phone": "081234567890",
    "customer_email": "budi.santoso@example.com",
    "claim_type": "CASH_NOT_DISPENSED",
    "claim_description": "Saya melakukan penarikan tunai sebesar Rp 2.500.000 pada tanggal 15 Maret 2024 pukul 10:30 WIB di ATM lokasi Mobil Kas Keliling. Transaksi berhasil dan saldo terpotong namun uang tidak keluar dari mesin ATM. Saya sudah menunggu beberapa saat tetapi uang tidak keluar. Struk transaksi terlampir sebagai bukti.",
    "reporting_channel": "BRANCH",
    "evidence_file": {
      "filename": "struk_atm_20240315.jpg",
      "originalName": "Struk ATM - 15 Maret 2024.jpg",
      "mimeType": "image/jpeg",
      "size": 524288,
      "content": "/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/..."
    }
  }'
```

### 3. JavaScript/Node.js Integration

```javascript
const axios = require('axios');

class ATMClaimAPI {
  constructor(apiKey, baseURL = 'https://servicedesk.banksulutgo.co.id') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      timeout: 30000 // 30 second timeout
    });
  }

  async createClaim(claimData) {
    try {
      // Validate required fields
      const required = [
        'atm_code', 'transaction_date', 'transaction_amount',
        'card_last_4', 'customer_name', 'customer_account',
        'customer_phone', 'claim_type', 'claim_description',
        'reporting_channel'
      ];

      const missing = required.filter(field => !claimData[field]);
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }

      // Ensure proper date format
      if (claimData.transaction_date && typeof claimData.transaction_date === 'string') {
        claimData.transaction_date = new Date(claimData.transaction_date).toISOString();
      }

      const response = await this.client.post('/api/tickets/atm-claim', claimData);
      return response.data;
    } catch (error) {
      if (error.response) {
        // API returned an error response
        throw new Error(`API Error ${error.response.status}: ${error.response.data.error}`);
      } else if (error.request) {
        // Request made but no response received
        throw new Error('Network error: No response from API');
      } else {
        // Something else happened
        throw error;
      }
    }
  }

  async getSchema() {
    try {
      const response = await this.client.get('/api/tickets/atm-claim');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get schema: ${error.message}`);
    }
  }
}

// Usage example
async function example() {
  const atmAPI = new ATMClaimAPI('sk_live_your_api_key_here');

  try {
    const claimData = {
      atm_code: "0126",
      transaction_date: new Date().toISOString(),
      transaction_amount: 1000000,
      card_last_4: "1234",
      customer_name: "Test Customer",
      customer_account: "1234567890",
      customer_phone: "081234567890",
      customer_email: "test@example.com",
      claim_type: "CASH_NOT_DISPENSED",
      claim_description: "Test claim for integration",
      reporting_channel: "BRANCH"
    };

    const result = await atmAPI.createClaim(claimData);
    console.log('Claim created successfully:', result.ticket.ticketNumber);

  } catch (error) {
    console.error('Error creating claim:', error.message);
  }
}
```

### 4. Python Integration

```python
import requests
import json
from datetime import datetime
import base64

class ATMClaimAPI:
    def __init__(self, api_key, base_url='https://servicedesk.banksulutgo.co.id'):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        })

    def create_claim(self, claim_data):
        """Create an ATM claim ticket"""
        # Validate required fields
        required_fields = [
            'atm_code', 'transaction_date', 'transaction_amount',
            'card_last_4', 'customer_name', 'customer_account',
            'customer_phone', 'claim_type', 'claim_description',
            'reporting_channel'
        ]

        missing = [field for field in required_fields if field not in claim_data]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

        # Ensure proper date format
        if isinstance(claim_data.get('transaction_date'), datetime):
            claim_data['transaction_date'] = claim_data['transaction_date'].isoformat()

        try:
            response = self.session.post(
                f'{self.base_url}/api/tickets/atm-claim',
                json=claim_data,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")

    def encode_file(self, file_path):
        """Helper method to encode file as base64"""
        with open(file_path, 'rb') as file:
            encoded = base64.b64encode(file.read()).decode('utf-8')
            return encoded

# Usage example
def example():
    api = ATMClaimAPI('sk_live_your_api_key_here')

    claim_data = {
        'atm_code': '0126',
        'transaction_date': datetime.now().isoformat(),
        'transaction_amount': 1000000,
        'card_last_4': '1234',
        'customer_name': 'Test Customer',
        'customer_account': '1234567890',
        'customer_phone': '081234567890',
        'customer_email': 'test@example.com',
        'claim_type': 'CASH_NOT_DISPENSED',
        'claim_description': 'Test claim for integration',
        'reporting_channel': 'BRANCH'
    }

    try:
        result = api.create_claim(claim_data)
        print(f"Claim created: {result['ticket']['ticketNumber']}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    example()
```

### 5. PowerShell Integration (Windows)

```powershell
# ATM Claim API PowerShell Module
class ATMClaimAPI {
    [string]$ApiKey
    [string]$BaseURL
    [hashtable]$Headers

    ATMClaimAPI([string]$apiKey, [string]$baseURL = 'https://servicedesk.banksulutgo.co.id') {
        $this.ApiKey = $apiKey
        $this.BaseURL = $baseURL
        $this.Headers = @{
            'Content-Type' = 'application/json'
            'X-API-Key' = $this.ApiKey
        }
    }

    [PSCustomObject] CreateClaim([hashtable]$claimData) {
        # Validate required fields
        $requiredFields = @(
            'atm_code', 'transaction_date', 'transaction_amount',
            'card_last_4', 'customer_name', 'customer_account',
            'customer_phone', 'claim_type', 'claim_description',
            'reporting_channel'
        )

        $missing = $requiredFields | Where-Object { -not $claimData.ContainsKey($_) }
        if ($missing.Count -gt 0) {
            throw "Missing required fields: $($missing -join ', ')"
        }

        # Ensure proper date format
        if ($claimData.transaction_date -is [DateTime]) {
            $claimData.transaction_date = $claimData.transaction_date.ToString('yyyy-MM-ddTHH:mm:ssZ')
        }

        try {
            $uri = "$($this.BaseURL)/api/tickets/atm-claim"
            $body = $claimData | ConvertTo-Json -Depth 10

            $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $this.Headers -Body $body -TimeoutSec 30
            return $response
        }
        catch {
            throw "API request failed: $($_.Exception.Message)"
        }
    }

    [string] EncodeFile([string]$filePath) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        return [System.Convert]::ToBase64String($bytes)
    }
}

# Usage example
function New-ATMClaim {
    param(
        [string]$ApiKey = 'sk_live_your_api_key_here',
        [string]$ATMCode = '0126',
        [string]$CustomerName = 'Test Customer',
        [string]$CustomerAccount = '1234567890',
        [string]$CustomerPhone = '081234567890',
        [int]$Amount = 1000000,
        [string]$ClaimType = 'CASH_NOT_DISPENSED'
    )

    $api = [ATMClaimAPI]::new($ApiKey)

    $claimData = @{
        atm_code = $ATMCode
        transaction_date = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
        transaction_amount = $Amount
        card_last_4 = '1234'
        customer_name = $CustomerName
        customer_account = $CustomerAccount
        customer_phone = $CustomerPhone
        claim_type = $ClaimType
        claim_description = 'Test claim from PowerShell integration'
        reporting_channel = 'BRANCH'
    }

    try {
        $result = $api.CreateClaim($claimData)
        Write-Host "Claim created successfully: $($result.ticket.ticketNumber)" -ForegroundColor Green
        return $result
    }
    catch {
        Write-Error "Failed to create claim: $($_.Exception.Message)"
    }
}

# Example usage
# New-ATMClaim -ATMCode '0126' -CustomerName 'John Doe' -Amount 2500000
```

---

## Error Handling Best Practices

### Retry Logic

Implement exponential backoff for temporary failures:

```javascript
async function createClaimWithRetry(claimData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await atmAPI.createClaim(claimData);
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Only retry on server errors (5xx) or network errors
      if (error.response?.status >= 500 || !error.response) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Don't retry client errors (4xx)
      throw error;
    }
  }
}
```

### Validation Helpers

```javascript
function validateClaimData(data) {
  const errors = [];

  // ATM Code validation
  if (!data.atm_code || !/^[A-Z0-9]+$/.test(data.atm_code)) {
    errors.push('Invalid ATM code format');
  }

  // Amount validation
  if (!data.transaction_amount || data.transaction_amount < 50000 || data.transaction_amount > 50000000) {
    errors.push('Transaction amount must be between Rp 50,000 and Rp 50,000,000');
  }

  // Card validation
  if (!data.card_last_4 || !/^\d{4}$/.test(data.card_last_4)) {
    errors.push('Card last 4 digits must be exactly 4 numbers');
  }

  // Phone validation (Indonesian format)
  if (!data.customer_phone || !/^(08|628|\+628)\d{8,11}$/.test(data.customer_phone)) {
    errors.push('Invalid Indonesian phone number format');
  }

  return errors;
}
```

---

## Rate Limiting & Performance

### Rate Limits
- **Default**: 100 requests per minute per API key
- **Burst**: Up to 20 requests per 10 seconds
- **Daily**: 10,000 requests per day

### Performance Recommendations
1. **Batch Operations**: Group multiple claims when possible
2. **Caching**: Cache ATM information and service schemas
3. **Async Processing**: Use asynchronous requests for better throughput
4. **Connection Pooling**: Reuse HTTP connections

### Monitoring Headers

The API returns rate limiting information in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 60
```

---

## Security Considerations

### API Key Security
- Store API keys securely (environment variables, key vaults)
- Rotate keys regularly (recommended: every 90 days)
- Use least privilege permissions
- Monitor API key usage for anomalies

### Data Protection
- Customer data is encrypted at rest and in transit
- PII is masked in logs and audit trails
- Access is logged for compliance purposes
- Data retention follows banking regulations

### Network Security
- Use HTTPS for all requests (TLS 1.2+)
- Implement IP whitelisting if possible
- Monitor for suspicious request patterns
- Validate all input data

### Audit Logging

All API requests are logged with:
- Timestamp and request ID
- API key identifier (not the actual key)
- Request payload (PII masked)
- Response status and timing
- Source IP address

---

## Monitoring & Alerting

### Health Check Endpoint
```bash
GET /api/health/atm-claim
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "dependencies": {
    "database": "connected",
    "atm_registry": "available"
  }
}
```

### Metrics Available
- Request count and success rate
- Response time percentiles
- Error rate by type
- API key usage statistics
- ATM claim distribution by type and branch

### Alerting Conditions
- Error rate > 5% for 5 minutes
- Response time > 5 seconds for 10 requests
- API key usage spike (> 200% normal)
- Failed ATM lookups > 10%

---

## Testing & Validation

### Schema Validation Endpoint

To get the current field schema and validation rules:

```bash
GET /api/tickets/atm-claim
```

Response includes:
- Service information
- Field definitions with validation rules
- Available ATM codes
- Example payload structure

### Test Environment

**Test API Base URL**: `https://test-servicedesk.banksulutgo.co.id`

Test data:
- Test ATM codes: `TEST001`, `TEST002`, `TEST003`
- Test customer accounts: Use accounts starting with `TEST`
- Test amounts: Use amounts ending in `999` (e.g., `1000999`)

### Integration Testing Checklist

- [ ] API key authentication works
- [ ] All required fields validated
- [ ] ATM code lookup functions
- [ ] Auto-routing to correct branch
- [ ] File uploads work correctly
- [ ] Error responses are handled
- [ ] Rate limiting respected
- [ ] Audit logs created

---

## Troubleshooting

### Common Issues

#### 1. "ATM with code XXX not found"
**Cause**: ATM code not registered in system
**Solution**: Verify ATM code exists or register new ATM

#### 2. "Insufficient permissions"
**Cause**: API key lacks required permissions
**Solution**: Update API key permissions to include `tickets:create:atm-claim`

#### 3. "Invalid API key"
**Cause**: Wrong key, expired key, or inactive key
**Solution**: Check key validity and expiration date

#### 4. "Missing required fields"
**Cause**: Request missing mandatory fields
**Solution**: Validate payload against required fields list

#### 5. Rate limit exceeded
**Cause**: Too many requests in short time
**Solution**: Implement backoff and respect rate limits

### Debugging Steps

1. **Verify API Key**: Test with health check endpoint
2. **Validate Payload**: Use schema endpoint to check structure
3. **Check Logs**: Review application logs for detailed errors
4. **Test Connectivity**: Verify network access to API
5. **Contact Support**: Provide request ID for investigation

### Support Information

- **Technical Support**: servicedesk-support@banksulutgo.co.id
- **API Documentation**: https://docs.servicedesk.banksulutgo.co.id
- **Status Page**: https://status.banksulutgo.co.id
- **Emergency Contact**: +62-xxx-xxx-xxxx (24/7)

---

## Appendices

### Appendix A: Complete Field Reference

| Field Name | Type | Required | Max Length | Pattern/Validation | Default |
|------------|------|----------|------------|-------------------|---------|
| atm_code | string | Yes | 20 | Must exist in ATM registry | - |
| transaction_date | string | Yes | - | ISO 8601 datetime | - |
| transaction_amount | number | Yes | - | 50,000 - 50,000,000 | - |
| transaction_ref | string | No | 50 | Alphanumeric | - |
| card_last_4 | string | Yes | 4 | Exactly 4 digits | - |
| customer_name | string | Yes | 100 | 2-100 characters | - |
| customer_account | string | Yes | 20 | 10-20 characters | - |
| customer_phone | string | Yes | 15 | Indonesian phone format | - |
| customer_email | string | No | 255 | Valid email format | - |
| claim_type | enum | Yes | - | See enum values | - |
| claim_description | string | Yes | 2000 | 20-2000 characters | - |
| reporting_channel | enum | Yes | - | See enum values | - |
| evidence_file | object | No | - | See file structure | - |

### Appendix B: HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 201 | Created | Claim ticket created successfully |
| 400 | Bad Request | Invalid request payload or missing fields |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | ATM code or service not found |
| 422 | Unprocessable Entity | Valid JSON but business rule violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error, contact support |
| 502 | Bad Gateway | Temporary service unavailable |
| 503 | Service Unavailable | Planned maintenance |

### Appendix C: Business Rules Summary

1. **ATM Routing**: Claims automatically routed to ATM owner branch
2. **SLA Assignment**: Based on claim type severity
3. **Approval Workflow**: High-value claims require manager approval
4. **Audit Compliance**: All actions logged for regulatory compliance
5. **Customer Communication**: Auto-notifications sent via SMS/email
6. **Integration Points**: Links with core banking for verification

---

**Document Version**: 1.0
**Last Updated**: 2025-01-27
**Next Review**: 2025-04-27

*This documentation is maintained by the Bank SulutGo IT ServiceDesk team. For updates or corrections, please contact the API development team.*