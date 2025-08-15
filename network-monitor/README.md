# Bank SulutGo Network Monitor

Automated network monitoring service for Bank SulutGo ServiceDesk that provides real-time monitoring of branch and ATM network connectivity with automated incident management.

## Features

- **Real-time Network Monitoring**: Continuous ping monitoring for branches and ATMs
- **Automated Incident Detection**: Detects communication failures and performance issues
- **Auto-ticket Creation**: Automatically creates ServiceDesk tickets for network issues
- **Auto-resolution**: Automatically resolves tickets when connectivity is restored
- **Performance Monitoring**: Tracks response times, packet loss, and uptime
- **Grace Period Handling**: Prevents false alerts with configurable grace periods
- **Comprehensive Logging**: Detailed logging with rotation and multiple levels

## Installation

1. **Install Dependencies**:
   ```bash
   cd network-monitor
   npm install
   ```

2. **Configuration**:
   Edit `config.js` to customize monitoring settings:
   ```javascript
   module.exports = {
     service: {
       enabled: false,  // Set to true to enable monitoring
     },
     intervals: {
       atm: 60000,     // Monitor ATMs every 1 minute
       branch: 300000,  // Monitor branches every 5 minutes  
     }
   };
   ```

3. **Database Setup**:
   The service uses the same database as the main ServiceDesk application. Ensure the network monitoring tables are created by running the database migration.

## Usage

### Command Line Interface

```bash
# Start monitoring service
node monitor.js start

# Check service status
node monitor.js status

# Run a single test cycle
node monitor.js test

# Show help
node monitor.js help
```

### NPM Scripts

```bash
# Start production service
npm start

# Start development service with detailed logging
npm run dev

# Check status
npm run status

# Run test
npm run test
```

## Configuration

### Main Configuration (`config.js`)

- **Intervals**: How often to check each entity type
- **Thresholds**: Response time and packet loss thresholds
- **Incidents**: Auto-ticket creation and resolution settings
- **Service**: Enable/disable and startup options

### Entity Configuration

Network monitoring is configured per entity in the database:

**Branches**:
- Set `ipAddress` and optionally `backupIpAddress` 
- Set `monitoringEnabled = true` to enable monitoring

**ATMs**:
- Set `ipAddress` for the ATM
- Monitoring is automatic for all ATMs with IP addresses

## How It Works

### Monitoring Cycle

1. **Network Check**: Service pings each configured entity
2. **Status Evaluation**: Determines if service is ONLINE, SLOW, OFFLINE, or ERROR
3. **Incident Detection**: Compares current status with previous state
4. **Grace Period**: Waits for configurable time before creating incidents (prevents false alerts)
5. **Ticket Creation**: Creates ServiceDesk ticket for confirmed incidents
6. **Recovery Detection**: Monitors for service recovery
7. **Auto-Resolution**: Automatically resolves tickets when service recovers

### Status Types

- **ONLINE**: Response time < 100ms, minimal packet loss
- **SLOW**: Response time 100-1000ms or moderate packet loss  
- **OFFLINE**: No response from host
- **ERROR**: Network errors or high packet loss
- **TIMEOUT**: Response time > 1000ms

### Incident Types

- **COMMUNICATION_OFFLINE**: Complete loss of network connectivity
- **SLOW_CONNECTION**: Degraded performance (high latency/packet loss)
- **PACKET_LOSS**: Significant packet loss detected
- **HIGH_LATENCY**: Consistently slow response times
- **DNS_ISSUE**: DNS resolution problems
- **NETWORK_CONGESTION**: Network performance degradation

## Logging

The service provides comprehensive logging:

- **Console Output**: Real-time monitoring status (development)
- **File Logging**: Rotating log files in `/logs` directory
- **Error Logs**: Separate error log file
- **Performance Logs**: Network performance metrics
- **Daily Rotation**: Automatic log rotation and cleanup

### Log Files

- `combined.log`: All log entries
- `error.log`: Error-level entries only
- `monitoring-YYYY-MM-DD.log`: Daily monitoring activities
- `exceptions.log`: Unhandled exceptions
- `rejections.log`: Unhandled promise rejections

## Monitoring Dashboard Integration

The service provides data to the ServiceDesk web dashboard through API endpoints:

- `/api/monitoring/network/status`: Current network status
- `/api/monitoring/network/incidents`: Recent network incidents  
- `/api/monitoring/network/performance`: Performance metrics

## Database Schema

The service uses these additional tables:

- `network_monitoring_logs`: Historical monitoring data
- `network_incidents`: Network incident records
- Branch/ATM tables extended with IP address fields

## Security Considerations

- Service runs with database access permissions
- Creates tickets using system user account
- No external network access required (internal monitoring only)
- Logs may contain IP addresses (sensitive information)

## Troubleshooting

### Common Issues

1. **Service won't start**: Check database connection and configuration
2. **No monitoring**: Verify entities have IP addresses and monitoring enabled
3. **Too many false alerts**: Increase grace period times
4. **Performance issues**: Reduce monitoring frequency or entity count

### Debug Mode

Run with detailed debugging:
```bash
NODE_ENV=development npm run dev
```

### Health Checks

The service performs automatic health checks:
- Database connectivity
- Memory usage monitoring  
- Interval status verification

## Performance

- **Memory Usage**: ~50-100MB depending on entity count
- **CPU Usage**: Minimal (mostly I/O bound)
- **Network Impact**: Low (small ping packets)
- **Database Impact**: Minimal writes for logging

## Limitations

- Requires ICMP ping access to monitored hosts
- Grace periods may delay incident detection
- Auto-resolution depends on sustained connectivity
- Limited to IP-based monitoring (no application-level checks)

## Future Enhancements

- SNMP monitoring support
- HTTP/HTTPS endpoint monitoring
- Custom alert thresholds per entity
- Integration with external monitoring systems
- Mobile push notifications
- Performance trend analysis and reporting