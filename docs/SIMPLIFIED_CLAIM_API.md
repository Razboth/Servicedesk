# Simplified Claim API Documentation

## Overview
The Simplified Claim API provides a streamlined way to create KLAIM-OMNI tickets for transaction claims. Each API call creates a single ticket assigned to the OMNICHANNEL branch with all claim information properly formatted in the description.

## Base URL
```
http://localhost:3002/api/omnichannel/claims
```

## Authentication
All requests require an API key in the header:
```
X-API-Key: your_api_key_here
```

## Endpoints

### 1. Create KLAIM-OMNI Ticket
Creates a single KLAIM-OMNI ticket in the OMNICHANNEL branch.

**Method:** `POST`
**URL:** `/api/omnichannel/claims`
**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "your_api_key_here"
}
```

#### Required Fields
| Field | Type | Description |
|-------|------|-------------|
| `namaNasabah` | string | Customer name |
| `mediaTransaksi` | enum | Transaction media type |
| `nominal` | number | Transaction amount (in IDR) |

#### Optional Fields
| Field | Type | Description |
|-------|------|-------------|
| `jenisTransaksi` | enum | Transaction type (required for ATM, TOUCH, SMS) |
| `nomorRekening` | string | Account number |
| `nomorKartu` | string | Card number (masked format: ****1234) |
| `claimReason` | string | Reason for claim |
| `claimDate` | string | Date of claim (ISO 8601 format) |
| `transactionId` | string | Transaction ID |
| `referenceNumber` | string | Reference number |
| `atmId` | string | ATM ID (for ATM transactions) |
| `description` | string | Detailed description of the issue |

## Payload Examples

### 1. ATM Transaction Claim
```json
{
  "namaNasabah": "Ahmad Santoso",
  "mediaTransaksi": "ATM",
  "jenisTransaksi": "PEMBELIAN",
  "nominal": 100000,
  "nomorRekening": "1234567890",
  "nomorKartu": "****1234",
  "claimReason": "Pulsa tidak masuk tetapi saldo terpotong",
  "atmId": "ATM001",
  "transactionId": "TRX-123456",
  "referenceNumber": "REF-123456",
  "description": "Saya melakukan pembelian pulsa melalui ATM tetapi pulsa tidak masuk"
}
```

### 2. BSGTouch Transfer Claim
```json
{
  "namaNasabah": "Siti Rahayu",
  "mediaTransaksi": "TOUCH",
  "jenisTransaksi": "TRANSFER",
  "nominal": 5000000,
  "nomorRekening": "9876543210",
  "nomorKartu": "****5678",
  "claimReason": "Transfer gagal, saldo terpotong",
  "description": "Transfer melalui BSGTouch gagal tetapi saldo sudah terpotong"
}
```

### 3. QRIS Payment Claim
```json
{
  "namaNasabah": "Budi Pratama",
  "mediaTransaksi": "QRIS",
  "nominal": 250000,
  "nomorRekening": "5555666677",
  "transactionId": "QRIS-987654",
  "description": "Pembayaran melalui QRIS gagal"
}
```

### 4. SMS Banking Payment Claim
```json
{
  "namaNasabah": "Dewi Lestari",
  "mediaTransaksi": "SMS",
  "jenisTransaksi": "PEMBAYARAN",
  "nominal": 750000,
  "nomorRekening": "9999888877",
  "description": "Pembayaran tagihan PLN via SMS Banking gagal"
}
```

### 5. Debit Card Claim
```json
{
  "namaNasabah": "Andi Wijaya",
  "mediaTransaksi": "DEBIT",
  "nominal": 1500000,
  "nomorRekening": "1111222233",
  "nomorKartu": "****9876",
  "description": "Transaksi debit card di merchant gagal"
}
```

## Response Examples

### Success Response
```json
{
  "success": true,
  "ticketNumber": "1445",
  "ticketId": "cm3d8f7g0001f08l5gkqj9xyz",
  "status": "OPEN",
  "estimatedResolution": "2025-09-24T08:00:00.000Z",
  "trackingUrl": "/tickets/1445",
  "message": "KLAIM-OMNI ticket created successfully"
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": {
    "namaNasabah": "Nama nasabah is required",
    "nominal": "Nominal must be positive"
  }
}
```

### Server Error Response
```json
{
  "success": false,
  "error": "System user not found"
}
```

## Enum Options

### Media Transaksi
| Value | Description | Requires jenisTransaksi |
|-------|-------------|-------------------------|
| `ATM` | ATM transactions | Yes |
| `QRIS` | QRIS payments | No |
| `DEBIT` | Debit card transactions | No |
| `TOUCH` | BSGTouch transactions | Yes |
| `SMS` | SMS Banking transactions | Yes |

### Jenis Transaksi
| Value | Description | Used With |
|-------|-------------|-----------|
| `PEMBELIAN` | Purchase (prepaid, pulsa, etc.) | ATM, TOUCH, SMS |
| `PEMBAYARAN` | Payment (bills, etc.) | ATM, TOUCH, SMS |
| `TRANSFER` | Transfer (interbank, etc.) | ATM, TOUCH, SMS |

## Ticket Details

### Branch Assignment
All tickets created through this API are automatically assigned to:
- **Branch**: OMNICHANNEL
- **Branch Code**: OMNI

### Ticket Title Format
The ticket title follows this pattern:
```
KLAIM - OMNI - {MediaTransaksi} - {JenisTransaksi}
```

Examples:
- `KLAIM - OMNI - ATM - PEMBELIAN`
- `KLAIM - OMNI - TOUCH - TRANSFER`
- `KLAIM - OMNI - QRIS` (no jenis transaksi)
- `KLAIM - OMNI - DEBIT` (no jenis transaksi)
- `KLAIM - OMNI - SMS - PEMBAYARAN`

### Ticket Description Format
The ticket description is automatically formatted with the following sections:

```
=== DETAIL KLAIM ===
Nama Nasabah: {namaNasabah}
Media Transaksi: {mediaTransaksi}
Jenis Transaksi: {jenisTransaksi atau N/A}
Nominal: Rp {nominal dalam format Indonesia}
Nomor Rekening: {nomorRekening atau -}
Nomor Kartu: {nomorKartu atau -}

=== INFORMASI TRANSAKSI ===
Tanggal Klaim: {claimDate atau current timestamp}
Alasan Klaim: {claimReason atau -}
ID Transaksi: {transactionId atau -}
No. Referensi: {referenceNumber atau -}
ATM ID: {atmId jika ada}

=== DESKRIPSI MASALAH ===
{description atau 'Klaim transaksi bermasalah'}
```

## Business Rules

### Media Type Requirements
- **ATM**: Requires `jenisTransaksi` field
- **TOUCH**: Requires `jenisTransaksi` field
- **SMS**: Requires `jenisTransaksi` field
- **QRIS**: Does NOT require `jenisTransaksi`
- **DEBIT**: Does NOT require `jenisTransaksi`

### Priority Assignment
Priority is automatically calculated based on nominal amount:
- **HIGH**: Nominal ≥ 10,000,000 IDR
- **MEDIUM**: Nominal < 10,000,000 IDR

### Service and Category Assignment
The system automatically:
1. Attempts to find the appropriate service in the Transaction Claims category
2. Maps to the correct subcategory based on media and transaction type
3. Falls back to a general claim service if specific service not found

### Subcategory Mapping
| Media + Transaction | Subcategory |
|---------------------|-------------|
| ATM + PEMBELIAN | ATM - Prepaid Services |
| ATM + PEMBAYARAN | ATM - Bill Payments |
| ATM + TRANSFER | ATM - Inter-bank Transfer |
| TOUCH + PEMBELIAN | BSGTouch - Prepaid |
| TOUCH + PEMBAYARAN | BSGTouch - Payment |
| TOUCH + TRANSFER | BSGTouch - Transfer |
| SMS + PEMBELIAN | SMS Banking - Prepaid |
| SMS + PEMBAYARAN | SMS Banking - Payment |
| SMS + TRANSFER | SMS Banking - Transfer |
| QRIS | BSGQRIS |
| DEBIT | BSGDebit |

## Testing

Use the provided test script:
```bash
npx tsx scripts/test-simplified-claim-api.ts <API_KEY>
```

## Rate Limits
- Maximum 1000 requests per hour per API key
- Burst limit: 50 requests per minute

## Important Notes
1. **Single Ticket Creation**: Each API call creates only ONE KLAIM-OMNI ticket (no duplicates)
2. **OMNI Branch**: All tickets are assigned to the OMNICHANNEL branch
3. **Complete Information**: All payload data is included in the ticket description
4. **Automatic Formatting**: Description is automatically structured for easy reading
5. **System User**: Tickets are created by the omnichannel_system user
6. **SLA Tracking**: Automatic SLA assignment based on service configuration
7. **Monetary Values**: All nominal values should be in IDR (Indonesian Rupiah)
8. **Card Security**: Card numbers must be masked (e.g., "****1234")
9. **Date Format**: Dates should be in ISO 8601 format
10. **No Customer Object**: No need to provide customer data separately - just namaNasabah

## Error Codes
| Code | Description |
|------|-------------|
| 400 | Validation failed |
| 401 | Invalid API key |
| 403 | Insufficient permissions |
| 500 | Server error (e.g., OMNI branch not found, system user not found) |

## Migration Note
This API replaces the previous `/api/omnichannel/tickets` endpoint for claim creation. The new endpoint:
- Requires less data (no channel, service type, or customer object)
- Creates cleaner ticket titles (KLAIM - OMNI format)
- Assigns to dedicated OMNICHANNEL branch
- Prevents duplicate ticket creation