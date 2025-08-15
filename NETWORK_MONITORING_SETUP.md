# Network Monitoring System Setup Guide

## Overview
This guide walks through setting up the automated network monitoring system for Bank SulutGo ServiceDesk. The system provides real-time monitoring of branch and ATM network connectivity with automated incident management.

## ✅ Implementation Status

### ✅ Completed Components
- **Database Schema**: Extended with network monitoring tables (Branch IPs, NetworkMonitoringLog, NetworkIncident)
- **Standalone Monitoring Service**: Complete Node.js service with ping monitoring and incident management
- **API Endpoints**: Full REST API for network status, incidents, performance, and health
- **Safety Design**: All changes are backward compatible and optional

### ⏳ Pending Setup Steps
1. Database migration (requires PostgreSQL running)
2. Install monitoring service dependencies
3. Configure IP addresses for branches/ATMs
4. Enable monitoring per branch
5. Optional: Dashboard UI components

## 🚀 Quick Setup

### Step 1: Database Migration
```bash
# Start your PostgreSQL service first
# Then apply the schema changes
npx prisma db push

# Or create a proper migration
npx prisma migrate dev --name add-network-monitoring
```

### Step 2: Install Dependencies
```bash
cd network-monitor
npm install
```

### Step 3: Configure Network Entities
Update your database with IP addresses:

```sql
-- Add IP addresses to branches you want to monitor
UPDATE branches 
SET 
  "ipAddress" = '192.168.1.1',
  "backupIpAddress" = '192.168.1.2',  -- Optional
  "monitoringEnabled" = true 
WHERE code = 'MNDO001';

-- Add IP addresses to ATMs (monitoring is automatic if IP exists)
UPDATE atms 
SET "ipAddress" = '10.0.1.100' 
WHERE code = 'ATM001';
```

### Step 4: Test the System
```bash
# Test network monitoring service
cd network-monitor
node monitor.js test

# Check API endpoints
curl http://localhost:3000/api/monitoring/network/status
```

### Step 5: Start Monitoring (When Ready)
```bash
# Enable monitoring in config
# Edit network-monitor/config.js:
service: {
  enabled: true,  // Change from false to true
}

# Start the monitoring service
cd network-monitor
npm start
```

## 🔧 Configuration

### Branch Configuration
Each branch needs IP configuration in the database:
- `ipAddress`: Primary network IP to monitor
- `backupIpAddress`: Secondary IP (optional)
- `monitoringEnabled`: Must be `true` to enable monitoring

### Monitoring Thresholds
Edit `network-monitor/config.js` to customize:
```javascript
thresholds: {
  responseTime: {
    good: 100,       // < 100ms is good
    warning: 500,    // 100-500ms is warning  
    slow: 1000       // 500-1000ms is slow
  },
  packetLoss: {
    warning: 5,      // 5% packet loss triggers warning
    critical: 20     // 20% packet loss is critical
  }
}
```

### Monitoring Intervals
```javascript
intervals: {
  atm: 60000,        // Check ATMs every 1 minute
  branch: 300000,    // Check branches every 5 minutes
  health: 180000     // Health check every 3 minutes
}
```

## 🎯 Features

### Automated Incident Detection
- **Communication Offline**: Complete network failure
- **Slow Connection**: High latency or packet loss
- **Automatic Recovery**: Auto-resolves when connectivity restored

### Smart Alerting
- **Grace Period**: 5-minute delay prevents false alerts
- **Duplicate Prevention**: Won't create multiple tickets for same issue
- **Auto-Resolution**: Automatically closes tickets when problems resolve

### Performance Monitoring
- Response time tracking
- Packet loss monitoring
- Uptime percentage calculation
- Historical performance data

## 📊 API Endpoints

### Network Status
```bash
GET /api/monitoring/network/status
GET /api/monitoring/network/status?type=BRANCH
GET /api/monitoring/network/status?type=ATM
```

### Network Incidents
```bash
GET /api/monitoring/network/incidents
POST /api/monitoring/network/incidents
```

### Performance Metrics
```bash
GET /api/monitoring/network/performance?period=24h
GET /api/monitoring/network/performance?entityId=xxx&period=7d
```

### Health Overview
```bash
GET /api/monitoring/network/health
```

## 🔒 Security & Safety

### Backward Compatibility
- All database changes are additive (nullable fields)
- New tables don't affect existing functionality
- Monitoring is **disabled by default**
- Can be completely removed if needed

### Permissions
- Requires MANAGER, ADMIN, or TECHNICIAN role
- Branch isolation respected (managers see only their branch)
- System user created automatically for ticket creation

### Rollback Plan
If you need to remove the network monitoring:
```sql
-- Remove new tables
DROP TABLE "network_incidents";
DROP TABLE "network_monitoring_logs";

-- Remove new columns from branches
ALTER TABLE "branches" 
  DROP COLUMN "ipAddress",
  DROP COLUMN "backupIpAddress", 
  DROP COLUMN "monitoringEnabled";
```

## 🚨 Troubleshooting

### Common Issues

**Service won't start**
```bash
# Check database connection
node -e "const {PrismaClient} = require('@prisma/client'); new PrismaClient().user.findFirst().then(console.log).catch(console.error)"
```

**No monitoring data**
- Verify IP addresses are set in database
- Check `monitoringEnabled = true` for branches
- Ensure monitoring service is running

**Too many false alerts**
- Increase grace period in config.js
- Check network connectivity to monitored hosts
- Review ping thresholds

**Permission errors**
- Ensure ICMP ping is allowed
- Check firewall rules
- Verify network access to monitored IPs

### Debug Mode
```bash
NODE_ENV=development node monitor.js start
```

### Health Check
```bash
node monitor.js status
```

## 📈 Performance Impact

### Resource Usage
- **Memory**: ~50-100MB for monitoring service
- **CPU**: Minimal (I/O bound operations)
- **Database**: Small writes for logs (~1KB per check)
- **Network**: Minimal (32-byte ping packets)

### Scaling
- Current design handles ~1000 entities easily
- Monitoring intervals can be adjusted for scale
- Logs are automatically rotated and cleaned up

## 🎛️ Advanced Configuration

### Custom Thresholds Per Entity
Future enhancement - currently uses global thresholds

### External Monitoring Integration
The system supports external monitoring systems via:
```bash
POST /api/monitoring/network/incidents
{
  "entityType": "ATM",
  "entityId": "atm-id",
  "type": "COMMUNICATION_OFFLINE",
  "severity": "HIGH",
  "description": "Network timeout detected",
  "externalReferenceId": "EXT-12345"
}
```

### Notification Integration
Framework exists for email/Slack notifications (not yet implemented)

## 📝 Maintenance

### Daily Tasks (Automated)
- Log rotation and cleanup
- Old incident data cleanup
- Entity configuration refresh

### Weekly Tasks (Manual)
- Review performance trends
- Adjust thresholds if needed
- Check for new entities to monitor

### Monthly Tasks (Manual)
- Capacity planning review
- Update monitoring service if needed
- Review and improve incident response

## 🔮 Future Enhancements

Planned improvements:
- Web dashboard for network monitoring
- SNMP monitoring support  
- HTTP/HTTPS endpoint monitoring
- Mobile push notifications
- Advanced analytics and trending
- Integration with external monitoring tools

## 💬 Support

For issues with the network monitoring system:
1. Check logs in `network-monitor/logs/`
2. Review configuration in `config.js`
3. Test individual components with debug mode
4. Verify database connectivity and permissions

The system is designed to be **safe and optional** - it won't impact existing ServiceDesk functionality even if it encounters problems.