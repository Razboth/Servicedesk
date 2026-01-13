# ATM Status API Documentation

## Overview

The ATM Status API provides endpoints for external monitoring systems to submit ATM operational status updates and retrieve current ATM status information. This API is designed for integration with network monitoring servers and ATM management systems to track real-time health metrics and connectivity status.

The API supports:
- Submitting ATM status updates with network metrics
- Querying current ATM status and ping results
- Automatic tracking of uptime/downtime metrics
- Status change detection and notification
- Comprehensive monitoring log storage

## Base URL

```
https://your-domain.com/api/public/atm-status
```

## Authentication

All endpoints require API key authentication. The API key must be passed in either the `X-API-Key` header or the `Authorization` header with Bearer token format.

### Authentication Methods

**Option 1: X-API-Key Header (Recommended)**
```bash
curl -H "X-API-Key: your_api_key_here" \
  https://your-domain.com/api/public/atm-status?atmCode=ATM001
```

**Option 2: Authorization Header (Bearer Token)**
```bash
curl -H "Authorization: Bearer your_api_key_here" \
  https://your-domain.com/api/public/atm-status?atmCode=ATM001
```

### API Key Permissions

Your API key must have one of the following permissions:
- `atm:status` - Permission to read/write ATM status data
- `atm:*` - Wildcard permission for all ATM operations
- `*` - Full access to all endpoints

If your key lacks the required permission, the API will return a 403 Forbidden response.

### Creating API Keys

API keys are created through the admin panel and must be associated with an active user account. Each key tracks:
- Usage statistics (request count, last used timestamp)
- Expiration date (optional)
- Active/inactive status
- Linked user association

## Endpoints

### POST /api/public/atm-status

Submit an ATM status update with operational metrics.

#### Request

**Method:** POST
**Content-Type:** application/json

#### Request Body

```json
{
  "atmCode": "ATM001",
  "status": "ONLINE",
  "ipAddress": "192.168.1.100",
  "responseTimeMs": 45,
  "packetLoss": 0,
  "networkStatus": "ONLINE",
  "errorMessage": null,
  "metrics": {
    "minRtt": 40,
    "maxRtt": 50,
    "avgRtt": 45,
    "mdev": 5,
    "packetsTransmitted": 10,
    "packetsReceived": 10
  }
}
```

#### Request Body Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| atmCode | string | Yes | Unique identifier for the ATM. Must exist in the system. |
| status | enum | Yes | Operational status of the ATM. See [ATM Status Values](#atm-status-values). |
| ipAddress | string | No | IP address of the ATM (IPv4 or IPv6). If not provided, uses the ATM's registered IP. |
| responseTimeMs | number | No | Network response time in milliseconds. Used for monitoring performance. |
| packetLoss | number | No | Packet loss percentage (0-100). Indicates network reliability. |
| networkStatus | enum | No | Network connectivity status. See [Network Status Values](#network-status-values). If omitted, derived from ATM status. |
| errorMessage | string \| null | No | Error description if ATM is in error state. Use null for no error. |
| metrics | object | No | Additional network metrics. See [Metrics Object](#metrics-object). |

#### Field Validation Rules

- **atmCode**: Must be non-empty string, minimum 1 character
- **status**: Must be one of: `ONLINE`, `OFFLINE`, `WARNING`, `ERROR`, `MAINTENANCE`
- **responseTimeMs**: Must be a positive number
- **packetLoss**: Must be a number between 0 and 100 (inclusive)
- **networkStatus**: Must be one of: `ONLINE`, `OFFLINE`, `SLOW`, `TIMEOUT`, `ERROR`

#### Example Requests

**Healthy ATM Status**
```bash
curl -X POST https://your-domain.com/api/public/atm-status \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "atmCode": "ATM001",
    "status": "ONLINE",
    "ipAddress": "192.168.1.100",
    "responseTimeMs": 45,
    "packetLoss": 0,
    "networkStatus": "ONLINE"
  }'
```

**ATM with Network Issues**
```bash
curl -X POST https://your-domain.com/api/public/atm-status \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "atmCode": "ATM002",
    "status": "WARNING",
    "ipAddress": "192.168.1.101",
    "responseTimeMs": 250,
    "packetLoss": 15,
    "networkStatus": "SLOW",
    "errorMessage": "High latency detected - response time above threshold"
  }'
```

**ATM Offline with Error Details**
```bash
curl -X POST https://your-domain.com/api/public/atm-status \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "atmCode": "ATM003",
    "status": "OFFLINE",
    "networkStatus": "OFFLINE",
    "errorMessage": "No response to ping - network unreachable",
    "ipAddress": "192.168.1.102"
  }'
```

**Detailed Metrics Update**
```bash
curl -X POST https://your-domain.com/api/public/atm-status \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "atmCode": "ATM004",
    "status": "ONLINE",
    "ipAddress": "192.168.1.103",
    "responseTimeMs": 52,
    "packetLoss": 2,
    "networkStatus": "ONLINE",
    "metrics": {
      "minRtt": 40,
      "maxRtt": 65,
      "avgRtt": 52,
      "mdev": 8,
      "packetsTransmitted": 10,
      "packetsReceived": 10
    }
  }'
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "atmId": "clh4k9z2x0001qz0b8q2k9z2x",
  "atmCode": "ATM001",
  "atmName": "ATM Cabang Utama",
  "status": "ONLINE",
  "networkStatus": "ONLINE",
  "logId": "clh4k9z2x0002qz0b8q2k9z2x",
  "networkMonitoringLogId": "clh4k9z2x0003qz0b8q2k9z2x",
  "pingResultId": "clh4k9z2x0004qz0b8q2k9z2x",
  "statusChanged": false,
  "timestamp": "2024-01-13T10:30:45.123Z"
}
```

#### Success Response Fields

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Always true for successful requests |
| atmId | string | System ID of the ATM |
| atmCode | string | The ATM code that was updated |
| atmName | string | Human-readable name of the ATM |
| status | string | The ATM operational status (as submitted) |
| networkStatus | string | The derived or submitted network status |
| logId | string | ID of the ATMMonitoringLog record created |
| networkMonitoringLogId | string | ID of the NetworkMonitoringLog record created/updated |
| pingResultId | string | ID of the NetworkPingResult record created (null if no ping data) |
| statusChanged | boolean | Whether this update represents a status change from previous check |
| timestamp | ISO 8601 | Server timestamp of when the update was processed |

#### Error Responses

**401 Unauthorized - Missing or Invalid API Key**
```json
{
  "error": "No API key provided. Include in Authorization header as \"Bearer YOUR_KEY\" or in X-API-Key header",
  "timestamp": "2024-01-13T10:30:45.123Z",
  "status": 401
}
```

**403 Forbidden - Insufficient Permissions**
```json
{
  "error": "Insufficient permissions. Required: atm:status",
  "timestamp": "2024-01-13T10:30:45.123Z",
  "status": 403
}
```

**400 Bad Request - Validation Error**
```json
{
  "error": "Validation failed",
  "errors": {
    "atmCode": ["ATM code is required"],
    "status": ["Invalid enum value. Expected 'ONLINE' | 'OFFLINE' | 'WARNING' | 'ERROR' | 'MAINTENANCE'"],
    "packetLoss": ["Number must be less than or equal to 100"]
  },
  "timestamp": "2024-01-13T10:30:45.123Z",
  "status": 400
}
```

**400 Bad Request - Invalid JSON**
```json
{
  "error": "Invalid JSON body",
  "timestamp": "2024-01-13T10:30:45.123Z",
  "status": 400
}
```

**404 Not Found - ATM Code Does Not Exist**
```json
{
  "error": "ATM with code 'ATM999' not found",
  "timestamp": "2024-01-13T10:30:45.123Z",
  "status": 404
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "timestamp": "2024-01-13T10:30:45.123Z",
  "status": 500
}
```

---

### GET /api/public/atm-status

Retrieve the current status of an ATM including latest monitoring data and ping results.

#### Request

**Method:** GET
**Query Parameters:** Required

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| atmCode | string | Yes | The ATM code to query. Must exist in the system. |

#### Example Requests

**Query Single ATM Status**
```bash
curl -H "X-API-Key: your_api_key_here" \
  "https://your-domain.com/api/public/atm-status?atmCode=ATM001"
```

**Using Authorization Header**
```bash
curl -H "Authorization: Bearer your_api_key_here" \
  "https://your-domain.com/api/public/atm-status?atmCode=ATM002"
```

**With Query String Encoding (Special Characters)**
```bash
curl -H "X-API-Key: your_api_key_here" \
  "https://your-domain.com/api/public/atm-status?atmCode=ATM-BRANCH-001"
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "atm": {
    "id": "clh4k9z2x0001qz0b8q2k9z2x",
    "code": "ATM001",
    "name": "ATM Cabang Utama",
    "ipAddress": "192.168.1.100",
    "networkMedia": "VSAT",
    "networkVendor": "Viasat",
    "location": "Jl. Sudirman No. 1",
    "isActive": true,
    "branch": {
      "name": "Cabang Utama",
      "code": "001"
    }
  },
  "currentStatus": {
    "status": "ONLINE",
    "responseTime": 45,
    "errorMessage": null,
    "checkedAt": "2024-01-13T10:30:45.123Z"
  },
  "latestPing": {
    "status": "ONLINE",
    "responseTimeMs": 45,
    "packetLoss": 0,
    "avgRtt": 45,
    "checkedAt": "2024-01-13T10:30:45.123Z"
  },
  "timestamp": "2024-01-13T10:31:00.456Z"
}
```

#### Response Fields

**ATM Object**

| Field | Type | Description |
|-------|------|-------------|
| id | string | System ID of the ATM |
| code | string | Unique ATM identifier |
| name | string | Human-readable name |
| ipAddress | string | IP address of the ATM |
| networkMedia | string | Network type: VSAT, M2M, FO (Fiber Optic), etc. |
| networkVendor | string | Network provider name |
| location | string | Physical location description |
| isActive | boolean | Whether ATM is active in system |
| branch | object | Branch information (name, code) |

**Current Status Object**

| Field | Type | Description |
|-------|------|-------------|
| status | string | Latest ATM operational status |
| responseTime | number | Response time in milliseconds from latest check |
| errorMessage | string \| null | Error description if any |
| checkedAt | ISO 8601 | Timestamp of the latest status check |

**Latest Ping Object**

| Field | Type | Description |
|-------|------|-------------|
| status | string | Network status from latest ping |
| responseTimeMs | number | Round-trip time in milliseconds |
| packetLoss | number | Packet loss percentage |
| avgRtt | number | Average round-trip time |
| checkedAt | ISO 8601 | Timestamp of latest ping check |

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Invalid API key",
  "timestamp": "2024-01-13T10:30:45.123Z",
  "status": 401
}
```

**403 Forbidden**
```json
{
  "error": "Insufficient permissions. Required: atm:status",
  "timestamp": "2024-01-13T10:30:45.123Z",
  "status": 403
}
```

**400 Bad Request - Missing Required Parameter**
```json
{
  "error": "atmCode query parameter is required",
  "timestamp": "2024-01-13T10:30:45.123Z",
  "status": 400
}
```

**404 Not Found - ATM Does Not Exist**
```json
{
  "error": "ATM with code 'ATM999' not found",
  "timestamp": "2024-01-13T10:30:45.123Z",
  "status": 404
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "timestamp": "2024-01-13T10:30:45.123Z",
  "status": 500
}
```

---

## Enumerations

### ATM Status Values

These are the valid status values for the `status` field in POST requests:

| Value | Description |
|-------|-------------|
| ONLINE | ATM is operational and responding normally |
| OFFLINE | ATM is not responding or unreachable |
| WARNING | ATM has degraded performance or minor issues |
| ERROR | ATM has critical errors or failures |
| MAINTENANCE | ATM is intentionally taken offline for maintenance |

### Network Status Values

These are the valid values for the `networkStatus` field:

| Value | Description |
|-------|-------------|
| ONLINE | Network connection is healthy and stable |
| OFFLINE | Network connection is down or unavailable |
| SLOW | Network has high latency or reduced throughput |
| TIMEOUT | Network requests are timing out |
| ERROR | Network has errors or connection failures |

**Status Mapping:** If `networkStatus` is not provided in the POST request, it is automatically derived:
- `ONLINE` → ONLINE
- `OFFLINE` → OFFLINE
- `WARNING` → SLOW
- `ERROR` → ERROR
- `MAINTENANCE` → OFFLINE

### Network Media Types

The `networkMedia` field can contain:

| Value | Description |
|-------|-------------|
| VSAT | Very Small Aperture Terminal satellite connection |
| M2M | Machine-to-Machine mobile connection |
| FO | Fiber Optic direct connection |
| MPLS | Multi-Protocol Label Switching |
| LEASED_LINE | Dedicated leased line |
| 4G | 4G/LTE mobile connection |
| 5G | 5G mobile connection |

---

## Metrics Object

The optional `metrics` object allows you to submit detailed network diagnostic data. All fields are optional.

### Metrics Fields

| Field | Type | Description |
|-------|------|-------------|
| minRtt | number | Minimum round-trip time (milliseconds) |
| maxRtt | number | Maximum round-trip time (milliseconds) |
| avgRtt | number | Average round-trip time (milliseconds) |
| mdev | number | Standard deviation of round-trip times (milliseconds) |
| packetsTransmitted | number | Total packets sent |
| packetsReceived | number | Total packets successfully received |

These fields are typically populated from ping/ICMP diagnostic output.

---

## HTTP Status Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 200 | OK | Request successful, status returned or updated |
| 400 | Bad Request | Invalid JSON, missing required fields, validation error, or missing query parameter |
| 401 | Unauthorized | Missing API key or invalid credentials |
| 403 | Forbidden | API key lacks required permissions |
| 404 | Not Found | ATM code does not exist in system |
| 500 | Internal Server Error | Server error processing request |

---

## Rate Limiting

Rate limiting is applied per API key based on the key's configuration. Requests that exceed limits will receive appropriate error responses. Contact your administrator to increase rate limits if needed.

---

## Data Storage and Retention

When you submit ATM status updates via POST:

1. **ATMMonitoringLog** - Stores the raw status check result
2. **NetworkMonitoringLog** - Stores aggregated network status and uptime/downtime metrics
3. **NetworkPingResult** - Stores detailed ping diagnostic data (created only if IP address or ping data provided)

The system automatically:
- Tracks status changes and when they occurred
- Calculates uptime and downtime duration
- Records the timestamp each check was performed
- Stores the previous status for change detection

---

## Integration Examples

### Python

```python
import requests
import json
from datetime import datetime

API_KEY = "your_api_key_here"
BASE_URL = "https://your-domain.com/api/public/atm-status"

def submit_atm_status(atm_code, status, ip_address=None, response_time=None):
    """Submit ATM status update"""
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "atmCode": atm_code,
        "status": status,
        "ipAddress": ip_address,
        "responseTimeMs": response_time
    }

    response = requests.post(BASE_URL, headers=headers, json=payload)
    return response.json()

def get_atm_status(atm_code):
    """Retrieve current ATM status"""
    headers = {"X-API-Key": API_KEY}
    params = {"atmCode": atm_code}

    response = requests.get(BASE_URL, headers=headers, params=params)
    return response.json()

# Example usage
result = submit_atm_status("ATM001", "ONLINE", "192.168.1.100", 45)
print(json.dumps(result, indent=2))

status = get_atm_status("ATM001")
print(json.dumps(status, indent=2))
```

### JavaScript/Node.js

```javascript
const fetch = require('node-fetch');

const API_KEY = 'your_api_key_here';
const BASE_URL = 'https://your-domain.com/api/public/atm-status';

async function submitAtmStatus(atmCode, status, data = {}) {
  const payload = {
    atmCode,
    status,
    ...data
  };

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response.json();
}

async function getAtmStatus(atmCode) {
  const response = await fetch(`${BASE_URL}?atmCode=${atmCode}`, {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY
    }
  });

  return response.json();
}

// Example usage
submitAtmStatus('ATM001', 'ONLINE', {
  ipAddress: '192.168.1.100',
  responseTimeMs: 45,
  packetLoss: 0
}).then(result => console.log(JSON.stringify(result, null, 2)));

getAtmStatus('ATM001').then(status => console.log(JSON.stringify(status, null, 2)));
```

### cURL Batch Script

```bash
#!/bin/bash

API_KEY="your_api_key_here"
BASE_URL="https://your-domain.com/api/public/atm-status"

# Update multiple ATM statuses
declare -a ATMS=("ATM001" "ATM002" "ATM003")
declare -a STATUSES=("ONLINE" "WARNING" "OFFLINE")
declare -a IPS=("192.168.1.100" "192.168.1.101" "192.168.1.102")

for i in "${!ATMS[@]}"; do
  curl -X POST "$BASE_URL" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"atmCode\": \"${ATMS[$i]}\",
      \"status\": \"${STATUSES[$i]}\",
      \"ipAddress\": \"${IPS[$i]}\",
      \"responseTimeMs\": 50
    }"

  echo ""
done

# Query all ATM statuses
for atm in "${ATMS[@]}"; do
  echo "Checking status for $atm..."
  curl -H "X-API-Key: $API_KEY" \
    "$BASE_URL?atmCode=$atm"
  echo ""
done
```

---

## Error Handling Best Practices

### Retry Logic

```python
import time

def submit_with_retry(atm_code, status, max_retries=3):
    """Submit with exponential backoff retry"""
    for attempt in range(max_retries):
        try:
            result = submit_atm_status(atm_code, status)
            if 'success' in result and result['success']:
                return result
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                print(f"Retry {attempt + 1}/{max_retries} after {wait_time}s")
                time.sleep(wait_time)
            else:
                raise

    return None
```

### Validation Before Submission

```python
def validate_status_update(atm_code, status):
    """Validate before submission"""
    valid_statuses = ['ONLINE', 'OFFLINE', 'WARNING', 'ERROR', 'MAINTENANCE']

    if not atm_code or len(atm_code) < 1:
        raise ValueError("ATM code must not be empty")

    if status not in valid_statuses:
        raise ValueError(f"Status must be one of {valid_statuses}")

    return True
```

---

## Common Use Cases

### Continuous Monitoring with Batch Updates

Submit aggregated ping results every 5 minutes:

```bash
#!/bin/bash
API_KEY="your_api_key_here"
BASE_URL="https://your-domain.com/api/public/atm-status"

while true; do
  # Ping ATM and capture metrics
  RESULT=$(ping -c 5 192.168.1.100 | tail -1)

  # Parse ping results (example)
  AVG_RTT=$(echo $RESULT | grep -oP 'avg = \K[^/]+')
  PACKET_LOSS=$(ping -c 5 192.168.1.100 | grep -oP '\d+(?=% packet loss)')

  curl -X POST "$BASE_URL" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"atmCode\": \"ATM001\",
      \"status\": \"ONLINE\",
      \"ipAddress\": \"192.168.1.100\",
      \"responseTimeMs\": $AVG_RTT,
      \"packetLoss\": $PACKET_LOSS,
      \"networkStatus\": \"ONLINE\",
      \"metrics\": {
        \"avgRtt\": $AVG_RTT,
        \"packetsTransmitted\": 5,
        \"packetsReceived\": 5
      }
    }"

  sleep 300  # Wait 5 minutes
done
```

### Alert on Status Change

Query ATM status and alert if changed:

```python
import requests
import json
from datetime import datetime

def check_and_alert_status_change(atm_code, previous_status=None):
    """Check ATM status and alert if changed"""
    try:
        status = get_atm_status(atm_code)

        if 'error' in status:
            print(f"Error checking {atm_code}: {status['error']}")
            return None

        current_status = status['atm']['currentStatus']['status']

        if previous_status and previous_status != current_status:
            print(f"ALERT: {atm_code} status changed from {previous_status} to {current_status}")
            # Send email, webhook, SMS, etc.

        return current_status

    except Exception as e:
        print(f"Exception checking {atm_code}: {e}")
        return None
```

---

## Support and Troubleshooting

### Common Errors and Solutions

**"Invalid API key"**
- Verify API key is correct and active
- Check for extra spaces in the header
- Ensure API key hasn't expired
- Confirm API key is associated with your account

**"Insufficient permissions"**
- Check that API key has `atm:status` or `atm:*` permission
- Contact admin to update key permissions

**"ATM with code 'X' not found"**
- Verify ATM code spelling and case sensitivity
- Confirm ATM exists in the system
- Check if ATM is marked as inactive

**"Validation failed" with field errors**
- Review the errors array for specific field issues
- Ensure all required fields are present
- Validate enum values match documentation
- Check number ranges (e.g., packetLoss 0-100)

**500 Internal Server Error**
- Wait a moment and retry
- Check server logs for details
- Contact system administrator if issue persists

---

## API Changelog

### Version 1.0 (Current)

- Initial release
- POST endpoint for submitting ATM status updates
- GET endpoint for retrieving ATM status
- Support for detailed network metrics
- Automatic uptime/downtime calculation
- Status change tracking

---

## Postman Collection

Import this collection into Postman for easy testing:

```json
{
  "info": {
    "name": "ATM Status API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Submit ATM Status",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "X-API-Key",
            "value": "{{api_key}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"atmCode\": \"ATM001\",\n  \"status\": \"ONLINE\",\n  \"ipAddress\": \"192.168.1.100\",\n  \"responseTimeMs\": 45,\n  \"packetLoss\": 0,\n  \"networkStatus\": \"ONLINE\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/public/atm-status",
          "host": ["{{base_url}}"],
          "path": ["api", "public", "atm-status"]
        }
      }
    },
    {
      "name": "Get ATM Status",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "X-API-Key",
            "value": "{{api_key}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/public/atm-status?atmCode=ATM001",
          "host": ["{{base_url}}"],
          "path": ["api", "public", "atm-status"],
          "query": [
            {
              "key": "atmCode",
              "value": "ATM001"
            }
          ]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "https://your-domain.com"
    },
    {
      "key": "api_key",
      "value": "your_api_key_here"
    }
  ]
}
```

---

## License and Support

For support inquiries, contact your system administrator or IT support team.
