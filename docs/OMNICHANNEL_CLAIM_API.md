# Omnichannel Claim API Documentation

## Overview
The Omnichannel Claim API allows external systems to create claim tickets with automatic KLAIM-OMNI ticket generation for transaction claims processing.

## Base URL
```
http://localhost:3002/api/omnichannel
```

## Authentication
All requests require an API key in the header:
```
X-API-Key: your_api_key_here
```

## Endpoints

### 1. Create Claim Ticket
Creates a claim ticket and automatically generates a KLAIM-OMNI ticket for transaction processing.

**Endpoint:** `POST /api/omnichannel/tickets`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "your_api_key_here"
}
```

## Payload Examples

### ATM Transaction Claim
```json
{
  "channel": "WHATSAPP",
  "channelReferenceId": "WA-CLAIM-123456",
  "serviceType": "CLAIM",
  "customer": {
    "name": "Ahmad Santoso",
    "email": "ahmad.santoso@example.com",
    "phone": "+6281234567890",
    "identifier": "CIF123456",
    "branchCode": "001"
  },
  "ticket": {
    "title": "Klaim Transaksi ATM - Pembelian Pulsa",
    "description": "Saya melakukan pembelian pulsa melalui ATM tetapi pulsa tidak masuk dan saldo terpotong",
    "priority": "HIGH",
    "category": "SERVICE_REQUEST",
    "metadata": {
      "namaNasabah": "Ahmad Santoso",
      "mediaTransaksi": "ATM",
      "jenisTransaksi": "PEMBELIAN",
      "nominal": 100000,
      "nomorRekening": "1234567890",
      "nomorKartu": "****1234",
      "claimDate": "2025-09-23T00:00:00Z",
      "claimReason": "Pulsa tidak masuk tetapi saldo terpotong",
      "atmId": "ATM001",
      "transactionId": "TRX-123456",
      "referenceNumber": "REF-123456"
    }
  }
}
```

### BSGTouch Transfer Claim
```json
{
  "channel": "EMAIL",
  "channelReferenceId": "EMAIL-CLAIM-789012",
  "serviceType": "CLAIM",
  "customer": {
    "name": "Siti Rahayu",
    "email": "siti.rahayu@example.com",
    "phone": "+6289876543210",
    "identifier": "CIF789012"
  },
  "ticket": {
    "description": "Transfer melalui BSGTouch gagal tetapi saldo sudah terpotong",
    "priority": "HIGH",
    "metadata": {
      "mediaTransaksi": "TOUCH",
      "jenisTransaksi": "TRANSFER",
      "nominal": 5000000,
      "nomorRekening": "9876543210",
      "nomorKartu": "****5678",
      "claimReason": "Transfer gagal, saldo terpotong"
    }
  }
}
```

### QRIS Payment Claim
```json
{
  "channel": "CHAT",
  "channelReferenceId": "CHAT-CLAIM-345678",
  "serviceType": "CLAIM",
  "customer": {
    "name": "Budi Pratama",
    "email": "budi@example.com"
  },
  "ticket": {
    "description": "Pembayaran melalui QRIS gagal",
    "metadata": {
      "mediaTransaksi": "QRIS",
      "nominal": 250000,
      "nomorRekening": "5555666677",
      "transactionId": "QRIS-987654"
    }
  }
}
```

### SMS Banking Payment Claim
```json
{
  "channel": "SMS",
  "channelReferenceId": "SMS-CLAIM-456789",
  "serviceType": "CLAIM",
  "customer": {
    "name": "Dewi Lestari",
    "phone": "+6281112223333"
  },
  "ticket": {
    "description": "Pembayaran tagihan PLN via SMS Banking gagal",
    "metadata": {
      "mediaTransaksi": "SMS",
      "jenisTransaksi": "PEMBAYARAN",
      "nominal": 750000,
      "nomorRekening": "9999888877"
    }
  }
}
```

### Debit Card Claim
```json
{
  "channel": "WHATSAPP",
  "channelReferenceId": "WA-CLAIM-234567",
  "serviceType": "CLAIM",
  "customer": {
    "name": "Andi Wijaya",
    "email": "andi@example.com",
    "phone": "+6281234567890"
  },
  "ticket": {
    "description": "Transaksi debit card di merchant gagal",
    "metadata": {
      "mediaTransaksi": "DEBIT",
      "nominal": 1500000,
      "nomorRekening": "1111222233",
      "nomorKartu": "****9876"
    }
  }
}
```

## Response Examples

### Success Response
```json
{
  "success": true,
  "ticketNumber": "1423",
  "ticketId": "cm3d8f7g0001f08l5gkqj9xyz",
  "status": "OPEN",
  "estimatedResolution": "2025-09-24T07:00:00.000Z",
  "trackingUrl": "/tickets/1423",
  "message": "Ticket created successfully",
  "metadata": {
    "createdAt": "2025-09-23T07:00:00.000Z",
    "assignedTo": null,
    "supportGroup": "Transaction Claims Team",
    "slaHours": 24,
    "klaimOmniTicket": "1424"
  }
}
```

### Error Response - Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": {
    "ticket.metadata.mediaTransaksi": "Media transaksi is required",
    "ticket.metadata.nominal": "Valid nominal amount is required"
  }
}
```

### Error Response - Authentication Error
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

## Enum Options

### Service Type
```typescript
enum OmnichannelServiceType {
  CLAIM = "CLAIM"  // Required for automatic KLAIM-OMNI creation
}
```

### Channel (Source)
```typescript
enum OmnichannelSource {
  WHATSAPP = "WHATSAPP"
  EMAIL = "EMAIL"
  CHAT = "CHAT"
  PHONE = "PHONE"
  SMS = "SMS"
  FACEBOOK = "FACEBOOK"
  INSTAGRAM = "INSTAGRAM"
  TWITTER = "TWITTER"
  TELEGRAM = "TELEGRAM"
  WEB_PORTAL = "WEB_PORTAL"
}
```

### Priority
```typescript
enum Priority {
  LOW = "LOW"
  MEDIUM = "MEDIUM"
  HIGH = "HIGH"
  CRITICAL = "CRITICAL"
}
```

### Category
```typescript
enum Category {
  INCIDENT = "INCIDENT"
  SERVICE_REQUEST = "SERVICE_REQUEST"
  CHANGE_REQUEST = "CHANGE_REQUEST"
  EVENT_REQUEST = "EVENT_REQUEST"
}
```

### Media Transaksi (Transaction Media)
```typescript
enum MediaTransaksi {
  ATM = "ATM"      // Requires jenisTransaksi
  QRIS = "QRIS"    // Does NOT require jenisTransaksi
  DEBIT = "DEBIT"  // Does NOT require jenisTransaksi
  TOUCH = "TOUCH"  // Requires jenisTransaksi
  SMS = "SMS"      // Requires jenisTransaksi
}
```

### Jenis Transaksi (Transaction Type)
```typescript
enum JenisTransaksi {
  PEMBELIAN = "PEMBELIAN"    // Purchase (prepaid, etc.)
  PEMBAYARAN = "PEMBAYARAN"  // Payment (bills, etc.)
  TRANSFER = "TRANSFER"      // Transfer (interbank, etc.)
}
```

## Required Fields by Media Type

### ATM Claims
- **Required:** `namaNasabah`, `mediaTransaksi`, `jenisTransaksi`, `nominal`
- **Optional:** `nomorRekening`, `nomorKartu`, `atmId`, `transactionId`, `referenceNumber`

### QRIS Claims
- **Required:** `mediaTransaksi`, `nominal`
- **Optional:** `nomorRekening`, `transactionId`
- **Note:** Does NOT require `jenisTransaksi`

### DEBIT Claims
- **Required:** `mediaTransaksi`, `nominal`
- **Optional:** `nomorRekening`, `nomorKartu`
- **Note:** Does NOT require `jenisTransaksi`

### TOUCH Claims
- **Required:** `mediaTransaksi`, `jenisTransaksi`, `nominal`
- **Optional:** `nomorRekening`, `nomorKartu`

### SMS Claims
- **Required:** `mediaTransaksi`, `jenisTransaksi`, `nominal`
- **Optional:** `nomorRekening`

## KLAIM-OMNI Ticket Generation

When a CLAIM ticket is created, the system automatically:

1. Creates the main omnichannel ticket
2. Generates a secondary KLAIM-OMNI ticket with:
   - Title format: `KLAIM - OMNI - {MediaTransaksi} - {JenisTransaksi}`
   - Category: Transaction Claims
   - Subcategory: Based on media and transaction type mapping
   - All claim metadata fields copied

### Subcategory Mapping Examples
- ATM + PEMBELIAN → "ATM - Prepaid Services"
- ATM + PEMBAYARAN → "ATM - Bill Payments"
- ATM + TRANSFER → "ATM - Inter-bank Transfer"
- TOUCH + PEMBELIAN → "BSGTouch - Prepaid"
- TOUCH + PEMBAYARAN → "BSGTouch - Payment"
- TOUCH + TRANSFER → "BSGTouch - Transfer"
- SMS + PEMBELIAN → "SMS Banking - Prepaid"
- SMS + PEMBAYARAN → "SMS Banking - Payment"
- SMS + TRANSFER → "SMS Banking - Transfer"
- QRIS → "BSGQRIS"
- DEBIT → "BSGDebit"

## Testing

Use the provided test script to verify the integration:

```bash
npx tsx scripts/test-omnichannel-claim.ts <API_KEY>
```

This will test all claim types and verify KLAIM-OMNI ticket creation.

## Rate Limits

- Default: 1000 requests per hour per API key
- Burst: Up to 50 requests per minute

## Notes

1. The `namaNasabah` field will automatically use `customer.name` if not explicitly provided
2. All monetary values (`nominal`) should be in IDR (Indonesian Rupiah)
3. Card numbers should be masked (e.g., "****1234")
4. Dates should be in ISO 8601 format
5. Both main ticket and KLAIM-OMNI ticket numbers are returned in the response