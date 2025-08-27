# ATM Claim API Documentation

## Endpoint
`POST /api/tickets/atm-claim`

## Authentication
The API requires authentication via API Key. You must include a valid API key in the request headers.

## Headers Required
```
Content-Type: application/json
X-API-Key: <your_api_key>
```

OR

```
Content-Type: application/json
Authorization: Bearer <your_api_key>
```

## Required Permissions
The API key must have the following permission:
- `tickets:create:atm-claim` - Permission to create ATM claim tickets

## Sample Payload

### Complete Example with All Fields
```json
{
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
    "content": "base64_encoded_image_content_here"
  }
}
```

### Minimal Required Fields Only
```json
{
  "atm_code": "0126",
  "transaction_date": "2024-03-15T10:30:00Z",
  "transaction_amount": 1000000,
  "card_last_4": "1234",
  "customer_name": "Ahmad Wijaya",
  "customer_account": "9876543210",
  "customer_phone": "082345678901",
  "claim_type": "CARD_CAPTURED",
  "claim_description": "Kartu ATM tertelan saat melakukan transaksi penarikan tunai.",
  "reporting_channel": "CALL_CENTER"
}
```

## Field Descriptions

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `atm_code` | string | ATM terminal code | "0126" |
| `transaction_date` | ISO 8601 datetime | Date and time of transaction | "2024-03-15T10:30:00Z" |
| `transaction_amount` | number | Transaction amount in Rupiah | 2500000 |
| `card_last_4` | string | Last 4 digits of ATM card | "5678" |
| `customer_name` | string | Customer full name | "Budi Santoso" |
| `customer_account` | string | Customer account number | "1234567890" |
| `customer_phone` | string | Customer phone number | "081234567890" |
| `claim_type` | enum | Type of claim | See claim types below |
| `claim_description` | string | Detailed description of the incident | "Detailed chronology..." |
| `reporting_channel` | enum | How the claim was reported | See channels below |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `transaction_ref` | string | Transaction reference number | "REF20240315103000" |
| `customer_email` | string | Customer email address | "customer@example.com" |
| `evidence_file` | object | File attachment (struk/evidence) | See file structure below |

### Claim Types (claim_type)
- `CARD_CAPTURED` - Kartu Tertelan
- `CASH_NOT_DISPENSED` - Uang Tidak Keluar
- `WRONG_AMOUNT` - Nominal Tidak Sesuai
- `DOUBLE_DEBIT` - Terdebet Ganda
- `TIMEOUT` - Transaksi Timeout
- `OTHER` - Lainnya

### Reporting Channels (reporting_channel)
- `BRANCH` - Walk-in Cabang
- `CALL_CENTER` - Call Center
- `EMAIL` - Email
- `MOBILE` - Mobile Banking

### File Structure (evidence_file)
```json
{
  "filename": "struk.jpg",
  "originalName": "Original File Name.jpg",
  "mimeType": "image/jpeg",
  "size": 524288,
  "content": "base64_encoded_content"
}
```

## Testing with cURL

### Create ATM Claim Ticket
```bash
# Create the claim ticket with API Key
curl -X POST http://localhost:3000/api/tickets/atm-claim \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_YOUR_API_KEY_HERE" \
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
    "claim_description": "Uang tidak keluar dari ATM setelah transaksi berhasil",
    "reporting_channel": "BRANCH"
  }'
```

## Testing with PowerShell (Windows)

```powershell
# Set your API Key
$apiKey = "sk_live_YOUR_API_KEY_HERE"

# Create ATM Claim
$claimData = @{
    atm_code = "0126"
    transaction_date = "2024-03-15T10:30:00Z"
    transaction_amount = 2500000
    transaction_ref = "REF20240315103000"
    card_last_4 = "5678"
    customer_name = "Budi Santoso"
    customer_account = "1234567890"
    customer_phone = "081234567890"
    customer_email = "budi.santoso@example.com"
    claim_type = "CASH_NOT_DISPENSED"
    claim_description = "Uang tidak keluar dari ATM"
    reporting_channel = "BRANCH"
}

$headers = @{
    "X-API-Key" = $apiKey
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/tickets/atm-claim" `
    -Method POST `
    -Headers $headers `
    -Body ($claimData | ConvertTo-Json) `
    -ContentType "application/json"

$response | ConvertTo-Json -Depth 10
```

## Testing with JavaScript/Node.js

```javascript
const axios = require('axios');

const API_KEY = 'sk_live_YOUR_API_KEY_HERE';

async function createATMClaim() {
  // Create claim
  const claimData = {
    atm_code: "0126",
    transaction_date: new Date().toISOString(),
    transaction_amount: 2500000,
    transaction_ref: "REF" + Date.now(),
    card_last_4: "5678",
    customer_name: "Budi Santoso",
    customer_account: "1234567890",
    customer_phone: "081234567890",
    customer_email: "budi.santoso@example.com",
    claim_type: "CASH_NOT_DISPENSED",
    claim_description: "Uang tidak keluar dari ATM setelah transaksi",
    reporting_channel: "BRANCH"
  };

  const response = await axios.post('http://localhost:3000/api/tickets/atm-claim', 
    claimData,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    }
  );

  console.log('ATM Claim created:', response.data);
}

createATMClaim().catch(console.error);
```

## Expected Success Response

```json
{
  "success": true,
  "data": {
    "message": "Ticket klaim ATM berhasil dibuat: TKT-20240315-0001",
    "ticket": {
      "id": "cmet...",
      "ticketNumber": "TKT-20240315-0001",
      "title": "Klaim ATM - Uang Tidak Keluar - 0126",
      "description": "**Informasi Klaim ATM**\n- Jenis Klaim: Uang Tidak Keluar...",
      "service": {
        "name": "Penarikan Tunai Internal - ATM Claim"
      },
      "createdBy": {
        "name": "Branch Employee",
        "email": "user@banksulutgo.co.id"
      },
      "branch": {
        "name": "CABANG UTAMA",
        "code": "CB001"
      },
      "fieldValues": [...],
      "attachments": [...]
    },
    "routing": {
      "reportingBranch": "CABANG UTAMA",
      "ownerBranch": "CABANG UTAMA",
      "routedTo": "CABANG UTAMA",
      "atm": {
        "code": "0126",
        "location": "Mobil Kas Keliling"
      }
    }
  },
  "timestamp": "2024-03-15T10:30:00Z"
}
```

## Error Responses

### Missing Required Fields
```json
{
  "error": "Missing required fields: customer_phone, claim_type",
  "timestamp": "2024-03-15T10:30:00Z",
  "status": 400
}
```

### Invalid ATM Code
```json
{
  "error": "ATM with code INVALID123 not found",
  "timestamp": "2024-03-15T10:30:00Z",
  "status": 404
}
```

### Unauthorized (No API Key)
```json
{
  "error": "No API key provided. Include in Authorization header as \"Bearer YOUR_KEY\" or in X-API-Key header",
  "timestamp": "2024-03-15T10:30:00Z",
  "status": 401
}
```

### Invalid API Key
```json
{
  "error": "Invalid API key",
  "timestamp": "2024-03-15T10:30:00Z",
  "status": 401
}
```

### Insufficient Permissions
```json
{
  "error": "Insufficient permissions to create ATM claim tickets",
  "timestamp": "2024-03-15T10:30:00Z",
  "status": 403
}
```

## Notes

1. **Auto-routing**: The ticket will automatically be routed to the branch that owns the ATM
2. **Auto-population**: The following fields are automatically filled:
   - `atm_location` - Based on selected ATM
   - `owner_branch` - Branch that owns the ATM
   - `reporting_branch` - Branch of the user creating the ticket
3. **File Upload**: The `evidence_file` should contain base64 encoded content
4. **Date Format**: Use ISO 8601 format for dates (YYYY-MM-DDTHH:mm:ssZ)
5. **Amount**: Transaction amount should be in Rupiah without decimal points