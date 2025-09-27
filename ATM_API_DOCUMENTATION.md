# ATM API Documentation
**Bank SulutGo ServiceDesk - ATM Management Endpoints**

*Last Updated: 2025-09-27*
*Version: 1.0*

## Overview

The Bank SulutGo ServiceDesk ATM API provides comprehensive endpoints for managing ATM data, monitoring, and status tracking across all branch locations. This documentation covers all ATM-related endpoints including listing, details, monitoring, and management operations.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://servicedesk.sulutgokepri.com/api`

## Authentication

All ATM endpoints require authentication via NextAuth.js session cookies. Authentication is enforced at the middleware level and verified in each endpoint.

### Session Requirements
- **Session Cookie**: Automatically handled by NextAuth.js
- **CSRF Protection**: Built-in CSRF protection via NextAuth.js
- **Role-Based Access**: Different endpoints require specific user roles

## Standard Response Format

All API responses follow this consistent structure:

### Success Response
```json
{
  "success": true,
  "data": { /* actual response data */ },
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional error details",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## ATM Data Model

### Core ATM Fields
- **id**: `string` - Unique CUID identifier
- **code**: `string` - Unique ATM code (e.g., "ATM001")
- **name**: `string` - ATM display name
- **branchId**: `string` - Associated branch CUID
- **ipAddress**: `string?` - ATM IP address for monitoring
- **location**: `string?` - Physical location description
- **latitude**: `number?` - GPS latitude coordinate
- **longitude**: `number?` - GPS longitude coordinate
- **networkMedia**: `enum?` - Network connection type: `VSAT`, `M2M`, `FO`
- **networkVendor**: `string?` - Network provider name
- **isActive**: `boolean` - Active status (default: true)
- **createdAt**: `DateTime` - Creation timestamp
- **updatedAt**: `DateTime` - Last update timestamp

### Related Data Models
- **Branch**: Associated branch information
- **ATMIncident**: Incident records for this ATM
- **ATMMonitoringLog**: Network monitoring logs
- **NetworkIncident**: Network-related incidents

### Status Enums
```typescript
enum ATMStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  WARNING = "WARNING",
  ERROR = "ERROR",
  MAINTENANCE = "MAINTENANCE"
}

enum NetworkMedia {
  VSAT = "VSAT",
  M2M = "M2M",
  FO = "FO"
}

enum IncidentSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}
```

---

## Endpoints

### 1. Admin ATM Management

#### `GET /api/admin/atms`
**List all ATMs with advanced filtering and pagination**

**Authentication**: Admin session required
**HTTP Method**: GET

##### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number for pagination |
| `limit` | integer | No | 20 | Items per page (max 100) |
| `search` | string | No | "" | Search in code, name, location |
| `branchId` | string | No | null | Filter by specific branch |
| `status` | string | No | null | Filter by status: `active`, `inactive` |
| `sortBy` | string | No | "code" | Sort field: `code`, `name`, `createdAt` |
| `sortOrder` | string | No | "asc" | Sort direction: `asc`, `desc` |

##### Response Structure
```json
{
  "atms": [
    {
      "id": "cluid_example",
      "code": "ATM001",
      "name": "ATM Kantor Pusat",
      "branchId": "branch_cluid",
      "ipAddress": "192.168.1.100",
      "location": "Lobby Utama Lt.1",
      "latitude": 1.4854,
      "longitude": 124.8407,
      "networkMedia": "FO",
      "networkVendor": "Telkom",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "branch": {
        "id": "branch_cluid",
        "name": "Kantor Pusat",
        "code": "001"
      },
      "_count": {
        "incidents": 2
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

##### Example Requests
```bash
# Get all ATMs
curl -X GET "http://localhost:3000/api/admin/atms" \
  -H "Cookie: authjs.session-token=your-session-token"

# Search and filter ATMs
curl -X GET "http://localhost:3000/api/admin/atms?search=ATM001&status=active&page=1&limit=10" \
  -H "Cookie: authjs.session-token=your-session-token"

# Filter by branch
curl -X GET "http://localhost:3000/api/admin/atms?branchId=branch_cluid&sortBy=name&sortOrder=desc" \
  -H "Cookie: authjs.session-token=your-session-token"
```

##### Error Responses
- **401 Unauthorized**: No session or insufficient permissions
- **500 Internal Server Error**: Database or server error

---

#### `POST /api/admin/atms`
**Create a new ATM**

**Authentication**: Admin session required
**HTTP Method**: POST

##### Request Body Schema
```json
{
  "code": "ATM002",           // Required: string, 1-20 chars, unique
  "name": "ATM Cabang Bitung", // Required: string, 1-100 chars
  "branchId": "branch_cluid", // Required: string, must exist
  "ipAddress": "192.168.1.101", // Optional: string
  "location": "Lobby Depan",  // Optional: string
  "latitude": 1.4444,         // Optional: number
  "longitude": 125.1234,      // Optional: number
  "networkMedia": "VSAT",     // Optional: enum
  "networkVendor": "Indosat", // Optional: string
  "isActive": true            // Optional: boolean, default true
}
```

##### Response
```json
{
  "id": "new_atm_cluid",
  "code": "ATM002",
  "name": "ATM Cabang Bitung",
  "branchId": "branch_cluid",
  "ipAddress": "192.168.1.101",
  "location": "Lobby Depan",
  "latitude": 1.4444,
  "longitude": 125.1234,
  "networkMedia": "VSAT",
  "networkVendor": "Indosat",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "branch": {
    "id": "branch_cluid",
    "name": "Cabang Bitung",
    "code": "002"
  }
}
```

##### Example Request
```bash
curl -X POST "http://localhost:3000/api/admin/atms" \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=your-session-token" \
  -d '{
    "code": "ATM002",
    "name": "ATM Cabang Bitung",
    "branchId": "branch_cluid",
    "ipAddress": "192.168.1.101",
    "location": "Lobby Depan",
    "networkMedia": "VSAT"
  }'
```

##### Error Responses
- **400 Bad Request**: Validation errors, duplicate code, or branch not found
- **401 Unauthorized**: No session or insufficient permissions
- **500 Internal Server Error**: Database or server error

---

#### `GET /api/admin/atms/[id]`
**Get detailed ATM information**

**Authentication**: Admin or Manager session required
**HTTP Method**: GET

##### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | ATM CUID identifier |

##### Response Structure
```json
{
  "id": "atm_cluid",
  "code": "ATM001",
  "name": "ATM Kantor Pusat",
  "branchId": "branch_cluid",
  "ipAddress": "192.168.1.100",
  "location": "Lobby Utama Lt.1",
  "latitude": 1.4854,
  "longitude": 124.8407,
  "networkMedia": "FO",
  "networkVendor": "Telkom",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "branch": {
    "id": "branch_cluid",
    "name": "Kantor Pusat",
    "code": "001",
    "city": "Manado"
  },
  "incidents": [
    {
      "id": "incident_cluid",
      "type": "NETWORK_DOWN",
      "severity": "HIGH",
      "description": "Network connectivity lost",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "monitoringLogs": [
    {
      "id": "log_cluid",
      "status": "ONLINE",
      "responseTime": 45.2,
      "errorMessage": null,
      "checkedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

##### Example Request
```bash
curl -X GET "http://localhost:3000/api/admin/atms/atm_cluid" \
  -H "Cookie: authjs.session-token=your-session-token"
```

##### Error Responses
- **401 Unauthorized**: No session, insufficient permissions, or branch access denied
- **404 Not Found**: ATM not found
- **500 Internal Server Error**: Database or server error

---

#### `PUT /api/admin/atms/[id]`
**Update ATM information**

**Authentication**: Admin session required
**HTTP Method**: PUT

##### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | ATM CUID identifier |

##### Request Body Schema
All fields are optional for updates:
```json
{
  "code": "ATM001_UPDATED",    // Optional: string, 1-20 chars, unique
  "name": "Updated ATM Name",  // Optional: string, 1-100 chars
  "branchId": "new_branch_id", // Optional: string, must exist
  "ipAddress": "192.168.1.200", // Optional: string
  "location": "New Location",  // Optional: string
  "latitude": 1.5000,          // Optional: number
  "longitude": 125.0000,       // Optional: number
  "networkMedia": "M2M",       // Optional: enum
  "networkVendor": "XL",       // Optional: string
  "isActive": false            // Optional: boolean
}
```

##### Response
Returns updated ATM object with same structure as GET response.

##### Example Request
```bash
curl -X PUT "http://localhost:3000/api/admin/atms/atm_cluid" \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=your-session-token" \
  -d '{
    "name": "ATM Kantor Pusat - Updated",
    "location": "Lobby Utama Lt.2",
    "networkMedia": "M2M"
  }'
```

##### Error Responses
- **400 Bad Request**: Validation errors, duplicate code, or branch not found
- **401 Unauthorized**: No session or insufficient permissions
- **404 Not Found**: ATM not found
- **500 Internal Server Error**: Database or server error

---

#### `DELETE /api/admin/atms/[id]`
**Permanently delete ATM**

**Authentication**: Admin session required
**HTTP Method**: DELETE

##### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | ATM CUID identifier |

##### Response
```json
{
  "success": true,
  "message": "ATM permanently deleted from database",
  "deletedId": "atm_cluid",
  "deletedName": "ATM Kantor Pusat (ATM001)"
}
```

##### Example Request
```bash
curl -X DELETE "http://localhost:3000/api/admin/atms/atm_cluid" \
  -H "Cookie: authjs.session-token=your-session-token"
```

##### Constraints
- Cannot delete ATMs with open incidents
- Creates audit log before deletion
- Cascades to delete related monitoring logs and incidents

##### Error Responses
- **400 Bad Request**: ATM has open incidents or foreign key constraints
- **401 Unauthorized**: No session or insufficient permissions
- **404 Not Found**: ATM not found or already deleted
- **500 Internal Server Error**: Database or server error

---

### 2. ATM Lookup Service

#### `GET /api/atms/lookup`
**Get ATMs for dropdown selection and search**

**Authentication**: Session required (permissive for claims)
**HTTP Method**: GET

##### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | No | Search for specific ATM by code |

##### Response Structure

**When searching by code:**
```json
{
  "id": "atm_cluid",
  "code": "ATM001",
  "name": "ATM Kantor Pusat",
  "location": "Lobby Utama Lt.1",
  "branch": {
    "id": "branch_cluid",
    "name": "Kantor Pusat",
    "code": "001"
  }
}
```

**When getting all ATMs:**
```json
{
  "options": [
    {
      "value": "ATM001",
      "label": "ATM001 - ATM Kantor Pusat",
      "atmId": "atm_cluid",
      "atmName": "ATM Kantor Pusat",
      "location": "Lobby Utama Lt.1",
      "branchId": "branch_cluid",
      "branchName": "Kantor Pusat",
      "branchCode": "001",
      "isOwnBranch": true,
      "displayInfo": "ATM001 - ATM Kantor Pusat (Kantor Pusat - Cabang Anda)"
    }
  ],
  "grouped": [
    {
      "label": "Kantor Pusat",
      "isOwnBranch": true,
      "options": [
        {
          "value": "ATM001",
          "label": "ATM001 - ATM Kantor Pusat",
          "atmId": "atm_cluid",
          "atmName": "ATM Kantor Pusat",
          "location": "Lobby Utama Lt.1",
          "branchId": "branch_cluid",
          "branchName": "Kantor Pusat",
          "branchCode": "001",
          "isOwnBranch": true
        }
      ]
    }
  ],
  "userBranch": {
    "id": "branch_cluid",
    "name": "Kantor Pusat"
  }
}
```

##### Example Requests
```bash
# Get all ATMs grouped by branch
curl -X GET "http://localhost:3000/api/atms/lookup" \
  -H "Cookie: authjs.session-token=your-session-token"

# Search for specific ATM
curl -X GET "http://localhost:3000/api/atms/lookup?code=ATM001" \
  -H "Cookie: authjs.session-token=your-session-token"
```

##### Error Responses
- **404 Not Found**: ATM code not found (when searching by code)
- **500 Internal Server Error**: Database or server error

---

### 3. Manager ATM Operations

#### `GET /api/manager/atms`
**Get ATMs for branch managers**

**Authentication**: Manager or Admin session required
**HTTP Method**: GET

##### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search in code, name, location |
| `status` | string | No | Filter: `operational`, `issues`, `inactive` |

##### Response Structure
```json
{
  "atms": [
    {
      "id": "atm_cluid",
      "code": "ATM001",
      "name": "ATM Kantor Pusat",
      "location": "Lobby Utama Lt.1",
      "ipAddress": "192.168.1.100",
      "isActive": true,
      "activeIncidents": 0,
      "_count": {
        "incidents": 2
      }
    }
  ],
  "branchInfo": {
    "name": "Kantor Pusat",
    "code": "001",
    "atmCount": 5,
    "activeATMs": 4
  }
}
```

##### Example Requests
```bash
# Get all ATMs for user's branch
curl -X GET "http://localhost:3000/api/manager/atms" \
  -H "Cookie: authjs.session-token=your-session-token"

# Filter operational ATMs
curl -X GET "http://localhost:3000/api/manager/atms?status=operational" \
  -H "Cookie: authjs.session-token=your-session-token"

# Search ATMs
curl -X GET "http://localhost:3000/api/manager/atms?search=ATM001" \
  -H "Cookie: authjs.session-token=your-session-token"
```

##### Error Responses
- **400 Bad Request**: No branch assigned to user
- **401 Unauthorized**: No session or insufficient permissions
- **500 Internal Server Error**: Database or server error

---

#### `GET /api/manager/atms/[id]`
**Get detailed ATM information for managers**

**Authentication**: Manager or Admin session required
**HTTP Method**: GET

##### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | ATM CUID identifier |

##### Response Structure
```json
{
  "id": "atm_cluid",
  "code": "ATM001",
  "name": "ATM Kantor Pusat",
  "branchId": "branch_cluid",
  "ipAddress": "192.168.1.100",
  "location": "Lobby Utama Lt.1",
  "latitude": 1.4854,
  "longitude": 124.8407,
  "networkMedia": "FO",
  "networkVendor": "Telkom",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "branch": {
    "id": "branch_cluid",
    "name": "Kantor Pusat",
    "code": "001"
  },
  "_count": {
    "incidents": 2
  },
  "incidents": [
    {
      "id": "incident_cluid",
      "type": "NETWORK_DOWN",
      "severity": "HIGH",
      "description": "Network connectivity lost",
      "status": "OPEN",
      "detectedAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "recentTickets": [
    {
      "id": "ticket_cluid",
      "title": "ATM001 Network Issue",
      "status": "OPEN",
      "priority": "HIGH",
      "createdAt": "2024-01-01T00:00:00Z",
      "createdBy": {
        "name": "John Doe"
      },
      "assignedTo": {
        "name": "Jane Smith"
      }
    }
  ]
}
```

##### Example Request
```bash
curl -X GET "http://localhost:3000/api/manager/atms/atm_cluid" \
  -H "Cookie: authjs.session-token=your-session-token"
```

##### Access Control
- Managers can only access ATMs from their assigned branch
- Admins can access all ATMs

##### Error Responses
- **400 Bad Request**: No branch assigned to user
- **401 Unauthorized**: No session, insufficient permissions, or branch access denied
- **404 Not Found**: ATM not found
- **500 Internal Server Error**: Database or server error

---

### 4. ATM Monitoring Endpoints

#### `GET /api/monitoring/atms/status`
**Get real-time ATM status with network health**

**Authentication**: Manager, Admin, or Technician session required
**HTTP Method**: GET

##### Response Structure
```json
{
  "atms": [
    {
      "id": "atm_cluid",
      "code": "ATM001",
      "location": "Lobby Utama Lt.1",
      "status": "OPERATIONAL", // OPERATIONAL, WARNING, DOWN, MAINTENANCE
      "lastPing": "2024-01-01T00:00:00Z",
      "uptime": 99.5,
      "cashLevel": 85,
      "paperLevel": 78,
      "branch": {
        "id": "branch_cluid",
        "name": "Kantor Pusat",
        "code": "001"
      },
      "recentIncidents": 0,
      "activeTickets": 1,
      "networkMedia": "FO",
      "networkVendor": "Telkom",
      "networkStatus": "ONLINE", // ONLINE, OFFLINE, SLOW, TIMEOUT, ERROR
      "responseTime": 45.2,
      "packetLoss": 0.0
    }
  ]
}
```

##### Status Calculation Logic
- **OPERATIONAL**: No critical incidents, good network health
- **WARNING**: Minor incidents, slow network, or low resources
- **DOWN**: Critical incidents or offline network
- **MAINTENANCE**: During maintenance windows

##### Example Request
```bash
curl -X GET "http://localhost:3000/api/monitoring/atms/status" \
  -H "Cookie: authjs.session-token=your-session-token"
```

##### Error Responses
- **401 Unauthorized**: No session or insufficient permissions
- **500 Internal Server Error**: Database or server error

---

#### `GET /api/monitoring/atms/metrics`
**Get ATM metrics and statistics**

**Authentication**: Manager, Admin, or Technician session required
**HTTP Method**: GET

##### Response Structure
```json
{
  "total": 150,
  "operational": 142,
  "warning": 6,
  "down": 2,
  "maintenance": 0,
  "avgUptime": 98.7,
  "totalIncidentsToday": 3,
  "totalIncidentsWeek": 15
}
```

##### Example Request
```bash
curl -X GET "http://localhost:3000/api/monitoring/atms/metrics" \
  -H "Cookie: authjs.session-token=your-session-token"
```

##### Error Responses
- **401 Unauthorized**: No session or insufficient permissions
- **500 Internal Server Error**: Database or server error

---

## Integration Guidelines

### External System Integration

#### 1. ATM Claim Submissions
For external systems submitting ATM claims:
- Use the `/api/atms/lookup?code=ATM_CODE` endpoint to validate ATM codes
- Submit claims via `/api/public/claims` with valid ATM codes
- API keys can be generated for automated claim submissions

#### 2. Monitoring Integrations
For network monitoring systems:
- Use `/api/monitoring/atms/status` for current status checks
- Implement webhook endpoints to receive incident notifications
- Monitor `/api/monitoring/atms/metrics` for trend analysis

#### 3. Branch Management Systems
For branch management integrations:
- Managers can use `/api/manager/atms` to get branch-specific ATM data
- Filter operational status to identify problematic ATMs
- Access detailed ATM information via `/api/manager/atms/[id]`

### Caching Recommendations

#### Client-Side Caching
- **ATM Lookup Data**: Cache for 5 minutes
- **Status Information**: Cache for 30 seconds
- **Metrics Data**: Cache for 2 minutes
- **ATM Details**: Cache for 1 minute

#### Server-Side Considerations
- Monitoring endpoints refresh network health data every 30 seconds
- Status calculations include recent incidents (24-hour window)
- Metrics aggregate data from multiple time periods

### Rate Limiting

Current implementation:
- No explicit rate limiting on ATM endpoints
- Protected by session authentication
- Database connection pooling prevents overload

Recommended limits for production:
- **Status endpoints**: 60 requests/minute
- **Lookup endpoints**: 120 requests/minute
- **Management endpoints**: 30 requests/minute

### Error Handling Best Practices

#### 1. Network Timeouts
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('/api/atms/lookup', {
    signal: controller.signal
  });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request timed out');
  }
}
```

#### 2. Session Expiration
```javascript
async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    // Redirect to login
    window.location.href = '/auth/signin';
    return;
  }

  return response;
}
```

#### 3. Retry Logic
```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      if (response.status >= 500 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Security Considerations

### 1. Data Access Control
- Managers can only access ATMs from their assigned branch
- Non-admin users cannot create, update, or delete ATMs
- Audit logs track all administrative actions

### 2. Input Validation
- All input data validated using Zod schemas
- SQL injection prevented by Prisma ORM
- XSS protection via Content Security Policy

### 3. Sensitive Data Handling
- IP addresses logged for monitoring purposes
- GPS coordinates stored for location services
- No sensitive authentication data exposed in responses

### 4. Session Security
- Secure session cookies with HttpOnly flag
- CSRF protection enabled by default
- Session timeout after inactivity

## Troubleshooting

### Common Issues

#### 1. "ATM not found" errors
- Verify ATM ID/code is correct
- Check if ATM is soft-deleted (isActive = false)
- Ensure user has access to the ATM's branch

#### 2. "Unauthorized" errors
- Verify session is valid and not expired
- Check user role permissions for the endpoint
- Ensure user is assigned to correct branch

#### 3. Slow response times
- Monitor database query performance
- Check network connectivity for monitoring endpoints
- Verify server resource utilization

#### 4. Inconsistent status data
- Network health data updates every 30 seconds
- Status calculations depend on recent incident data
- Consider caching implications for real-time data

### Support Information

For technical support or API integration assistance:
- **Development Team**: servicedesk-dev@sulutgokepri.com
- **Documentation Issues**: Create issue in project repository
- **Production Issues**: Contact system administrator

---

*This documentation is automatically updated with each release. For the latest version, check the project repository.*