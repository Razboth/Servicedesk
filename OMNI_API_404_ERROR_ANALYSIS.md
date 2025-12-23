# Omni/Sociomile API 404 Error Analysis
**Date**: 2025-12-22
**Investigator**: Error Detective Agent
**Status**: SERVER-SIDE ISSUE CONFIRMED

## Executive Summary
The Omni/Sociomile API endpoint is returning HTTP 404 (Not Found) errors. This is a **server-side routing issue** on the Sociomile/Lumoshive API, not a client-side implementation problem.

## Error Details

### Error Response
```json
{
  "status": false,
  "message": "",
  "errors": {
    "file": "/home/deployhq/api/test/vendor/laravel/lumen-framework/src/Concerns/RoutesRequests.php",
    "message": "",
    "line": 229
  }
}
```

### HTTP Status
- **Response Code**: 404 Not Found
- **Framework**: Laravel Lumen (PHP micro-framework)
- **Environment**: Test/Development (`/home/deployhq/api/test/`)
- **Error Location**: RoutesRequests.php:229 (Lumen's route handler)

## Root Cause Analysis

### 1. Lumen Framework Error
Line 229 in `RoutesRequests.php` is where Lumen throws a `NotFoundHttpException` when a route is not registered. This indicates:

**The route `/bank-sulut/create` does not exist in the Lumen application's route definitions.**

### 2. Evidence
- **API Base URL Works**: `https://api-sm.s45.in/` returns HTTP 200
- **Specific Endpoint Fails**: `https://api-sm.s45.in/bank-sulut/create` returns HTTP 404
- **Consistent Across Methods**: Both query parameter and header authentication return same error
- **URL Variations Tested**: `/bank-sulut/create`, `/api/bank-sulut/create` - all fail

### 3. Testing Results

#### Test 1: Minimal Payload (Our Implementation)
```bash
curl -X POST "https://api-sm.s45.in/bank-sulut/create?client_secret_key=B24d5b9c371171869a17a1c178bbf9e6" \
  -H "Content-Type: application/json" \
  -d '{
    "namaNasabah": "Test Customer",
    "ticketType": "helpdesk",
    "content": "Test ticket",
    "connectID": "test@example.com",
    "mediaTransaksi": "BRANCH_PORTAL",
    "nominal": 100000,
    "branchCode": "001",
    "branchName": "Test Branch",
    "atmName": "N/A",
    "atmId": "N/A",
    "nomorTicketHelpdesk": 12345,
    "noRegPengaduanCabang": 12345
  }'
```
**Result**: HTTP 404

#### Test 2: Header Authentication
```bash
curl -X POST "https://api-sm.s45.in/bank-sulut/create" \
  -H "Content-Type: application/json" \
  -H "client-secret-key: B24d5b9c371171869a17a1c178bbf9e6" \
  -d '{...}'
```
**Result**: HTTP 404

#### Test 3: Alternative Path
```bash
curl -X POST "https://api-sm.s45.in/api/bank-sulut/create?client_secret_key=..."
```
**Result**: HTTP 404

## API Documentation Analysis

### Expected Endpoint (from documentation)
- **URL**: `https://api-sm.s45.in/bank-sulut/create?client_secret_key={token}`
- **Method**: POST
- **Token**: B24d5b9c371171869a17a1c178bbf9e6
- **Documentation Date**: November 20, 2025
- **Status**: Approved
- **Project**: Sociomile Integration

### Documentation vs Reality
The API documentation from Lumoshive (dated Nov 20, 2025) specifies this endpoint, but the actual API server does not have this route registered.

## Our Implementation Review

### Current Implementation (/Users/razboth/Documents/Project/Servicedesk/lib/services/omni.service.ts)

**Status**: CORRECT ✓

Our implementation follows the API documentation exactly:

```typescript
const OMNI_API_URL = process.env.OMNI_API_URL || 'https://api-sm.s45.in/bank-sulut/create';
const OMNI_API_TOKEN = process.env.OMNI_API_TOKEN || '';

const url = `${OMNI_API_URL}?client_secret_key=${OMNI_API_TOKEN}`;

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});
```

**Key Points**:
1. Correct URL format
2. Correct authentication method (query parameter)
3. Correct HTTP method (POST)
4. Correct headers (Content-Type: application/json)
5. Correct payload structure (matches API spec)

### Environment Configuration

**Status**: CORRECT ✓

```env
OMNI_ENABLED=true
OMNI_API_URL="https://api-sm.s45.in/bank-sulut/create"
OMNI_API_TOKEN="B24d5b9c371171869a17a1c178bbf9e6"
```

### Payload Mapping

**Status**: CORRECT ✓

The `mapTicketToOmniPayload()` function correctly maps all required and optional fields according to the API specification.

## Possible Reasons for 404

### 1. Endpoint Not Deployed (MOST LIKELY)
The API endpoint documented on November 20, 2025 has not been deployed to the test server yet. The error path `/home/deployhq/api/test/` suggests this is a test/staging environment.

### 2. Route Not Registered
The Lumen application on the server is missing the route definition for `/bank-sulut/create`.

### 3. Incorrect Base Path
The actual endpoint might be on a different path or subdomain that was not communicated in the documentation.

### 4. Environment Mismatch
The documentation might be for a production environment, while we're testing against a staging/test environment that doesn't have the latest code.

### 5. API Still in Development
Given the documentation is from November 2025 and we're testing in December 2025, the API might still be under development.

## Recommendations

### Immediate Actions

1. **Contact Lumoshive/Sociomile Team**
   - Contact: Ghifari Yoga (Project Manager) - per API documentation
   - Request: Confirmation that the endpoint is deployed and accessible
   - Provide: This error analysis and test results

2. **Verify Environment**
   - Ask if `https://api-sm.s45.in` is the correct base URL
   - Confirm if there's a different URL for production vs testing
   - Request access to API status/health endpoint

3. **Request Route List**
   - Ask for a complete list of available routes
   - Verify the exact path and method for ticket creation

4. **Check Authentication**
   - Confirm the token `B24d5b9c371171869a17a1c178bbf9e6` is active
   - Verify if additional headers or authentication is required

### Alternative Solutions

#### Option 1: Wait for Deployment
Keep our implementation as-is and wait for Sociomile to deploy the endpoint.

**Pros**: No code changes needed
**Cons**: Unknown timeline

#### Option 2: Disable Omni Integration Temporarily
```env
OMNI_ENABLED=false
```

**Pros**: Tickets continue to work normally
**Cons**: No Sociomile integration

#### Option 3: Mock Integration for Testing
Create a mock endpoint for development/testing purposes.

### Code Changes (None Required)

Our implementation is correct according to the API specification. No changes are needed on our side.

## Timeline of Investigation

1. **Initial Error**: Omni service returns 404 on ticket creation
2. **Log Analysis**: Confirmed error coming from Laravel Lumen framework
3. **cURL Testing**: Verified 404 across multiple request variations
4. **Documentation Review**: Confirmed our implementation matches spec
5. **Server Analysis**: Identified server-side routing issue
6. **Conclusion**: Server-side issue, not client-side

## Monitoring Queries

### Detect Omni API Failures
```bash
# Search for Omni failures in logs
pm2 logs bsg-servicedesk --lines 1000 | grep "\[Omni\] Failed"

# Count failure rate
pm2 logs bsg-servicedesk --lines 1000 --nostream | grep -c "\[Omni\] Failed"
```

### Check for Successful Responses
```bash
# Search for successful Omni calls
pm2 logs bsg-servicedesk --lines 1000 | grep "\[Omni\] Ticket created successfully"
```

## Prevention Strategies

1. **API Health Check**
   - Add a health check endpoint ping before sending tickets
   - Log API availability status

2. **Graceful Degradation**
   - Continue ticket creation even if Omni fails (current implementation)
   - Log failures for retry later

3. **Retry Mechanism**
   - Implement exponential backoff for failed requests
   - Queue failed tickets for retry when endpoint becomes available

4. **Monitoring Dashboard**
   - Track Omni integration success/failure rate
   - Alert on prolonged failures

## Contact Information

**API Provider**: Lumoshive (Sociomile)
**Project Manager**: Ghifari Yoga
**Tech Lead**: Syahrul Aswan
**Documentation**: IES/TECH/FRM/253/XI/2025 Rev 00

## Conclusion

**This is a server-side issue with the Sociomile/Lumoshive API, not a client-side implementation problem.**

The endpoint `/bank-sulut/create` is not registered in the Lumen application running at `https://api-sm.s45.in`. Our implementation is correct and matches the API specification exactly.

**Next Step**: Contact Lumoshive team to request:
1. Confirmation of endpoint deployment status
2. Correct base URL for testing
3. Expected timeline for endpoint availability
4. Alternative endpoint if available

---

**Files Analyzed**:
- `/Users/razboth/Documents/Project/Servicedesk/lib/services/omni.service.ts`
- `/Users/razboth/Documents/Project/Servicedesk/3. [API] - Lumoshive API Docs - BSG Helpdesk dan Omnix (1).pdf`
- `/Users/razboth/.pm2/logs/bsg-servicedesk-error.log`
- `/Users/razboth/.pm2/logs/bsg-servicedesk-out.log`

**Error Pattern**:
```regex
\[Omni\] Failed to create ticket: \{[\s\S]*?status: false[\s\S]*?errors:[\s\S]*?RoutesRequests\.php
```

**Success Pattern**:
```regex
\[Omni\] Ticket created successfully: \{[\s\S]*?ticketId:[\s\S]*?ticket_number:
```
