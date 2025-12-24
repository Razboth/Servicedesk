# BSG ServiceDesk Monitoring

This directory contains configuration files for integrating BSG ServiceDesk with Grafana monitoring stack (Loki + Prometheus).

## Architecture

```
ServiceDesk App → Structured JSON Logs → Loki → Grafana
                → /api/metrics endpoint → Prometheus → Grafana
```

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
# Monitoring
MONITORING_ENABLED=true
LOG_LEVEL=INFO
LOG_FORMAT=json
METRICS_ENABLED=true
SERVICE_NAME=servicedesk
```

### 2. Prometheus Configuration

Add the ServiceDesk scrape job to your Prometheus configuration:

```yaml
scrape_configs:
  - job_name: 'servicedesk'
    static_configs:
      - targets: ['your-servicedesk-host:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s
```

### 3. Loki Configuration

Configure Loki to collect logs from ServiceDesk stdout. Options:

**Option A: Docker/Container logs**
If running in Docker, use Loki's Docker driver or Promtail to collect container logs.

**Option B: Promtail with file logging**
Configure Promtail to collect logs from the application output file.

**Option C: Direct stdout collection**
If using PM2 or similar, configure log forwarding to Loki.

### 4. Grafana Dashboard

Import the dashboard from `grafana/dashboards/servicedesk.json`:

1. Open Grafana
2. Go to Dashboards → Import
3. Upload `servicedesk.json` or paste its contents
4. Select your Prometheus and Loki data sources
5. Click Import

## Available Metrics

### Ticket Metrics
- `servicedesk_tickets_created_total` - Total tickets created (by priority)
- `servicedesk_tickets_resolved_total` - Total tickets resolved (by priority)
- `servicedesk_tickets_closed_total` - Total tickets closed (by priority)
- `servicedesk_tickets_sla_breached_total` - Total SLA breaches
- `servicedesk_tickets_active` - Current active tickets (by status)
- `servicedesk_tickets_by_priority` - Tickets by priority (gauge)
- `servicedesk_ticket_resolution_hours` - Ticket resolution time histogram

### Auth Metrics
- `servicedesk_login_attempts_total` - Login attempts (success/failure)
- `servicedesk_password_changes_total` - Password changes

### API Metrics
- `servicedesk_http_requests_total` - HTTP requests (method, path, status)
- `servicedesk_http_errors_total` - HTTP errors
- `servicedesk_http_request_duration_seconds` - Request duration histogram

### Omni Integration Metrics
- `servicedesk_omni_tickets_sent_total` - Tickets sent to Omni
- `servicedesk_omni_tickets_failed_total` - Failed Omni sends
- `servicedesk_omni_status_updates_total` - Omni status updates

## Log Categories

Logs are structured JSON with these categories:

- `TICKET` - Ticket creation, updates, status changes, assignments
- `AUTH` - Login attempts, logouts, session activity
- `USER` - User management operations
- `SYSTEM` - Application health, startup, shutdown
- `API` - External API calls, errors
- `AUDIT` - Security-sensitive operations
- `OMNI` - Omni/Sociomile integration

## Loki Query Examples

```logql
# All ticket creations
{service="servicedesk"} |= "TICKET_CREATED"

# Failed logins
{service="servicedesk"} | json | action="LOGIN_FAILED"

# Errors in last hour
{service="servicedesk"} | json | level="ERROR"

# Specific user activity
{service="servicedesk"} | json | userId="user123"

# Omni integration issues
{service="servicedesk"} |= "OMNI" | json | level=~"WARN|ERROR"
```

## Dashboard Panels

The pre-built dashboard includes:

1. **Ticket Overview**
   - Tickets Created (24h)
   - Tickets Resolved (24h)
   - Active Tickets
   - SLA Breaches (24h)
   - Creation Rate by Priority
   - Tickets by Priority pie chart

2. **Authentication & Security**
   - Successful Logins (24h)
   - Failed Logins (24h)
   - Login Attempts Rate

3. **Omni Integration**
   - Omni Tickets Sent (24h)
   - Omni Failures (24h)

4. **Logs**
   - Application Logs
   - Error Logs
   - Authentication Logs

## Metrics Endpoint

Access metrics at: `GET /api/metrics`

Returns Prometheus text format:
```
# HELP servicedesk_tickets_created_total Total number of tickets created
# TYPE servicedesk_tickets_created_total counter
servicedesk_tickets_created_total{priority="HIGH"} 42
```

## Troubleshooting

1. **No metrics appearing**: Check `MONITORING_ENABLED=true` in environment
2. **Logs not in JSON**: Set `LOG_FORMAT=json`
3. **Missing data sources**: Ensure Prometheus and Loki data sources are configured in Grafana
4. **Empty dashboard**: Verify the scrape job is working with `curl http://localhost:3000/api/metrics`
