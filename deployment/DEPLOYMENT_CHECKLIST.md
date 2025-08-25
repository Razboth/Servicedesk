# Deployment Checklist for Windows Server

## Pre-Deployment Phase

### Server Requirements
- [ ] Windows Server 2019/2022 installed and updated
- [ ] Minimum 8GB RAM available
- [ ] Minimum 50GB disk space available
- [ ] Network connectivity configured
- [ ] Administrator access available

### Software Installation
- [ ] PostgreSQL 15+ installed
- [ ] Node.js 20+ installed
- [ ] Git installed
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] PM2 Windows Startup installed (`npm install -g pm2-windows-startup`)

### Network Configuration
- [ ] Port 3000 available for application
- [ ] Port 5432 available for PostgreSQL
- [ ] Firewall rules configured
- [ ] DNS/IP address configured for external access

## Database Setup Phase

### PostgreSQL Configuration
- [ ] PostgreSQL service running
- [ ] Database created: `servicedesk_database`
- [ ] User created: `servicedesk_user`
- [ ] Password set and documented securely
- [ ] Permissions granted to user
- [ ] Connection tested with psql

### Database Import
- [ ] Database backup file available
- [ ] Schema imported successfully
- [ ] Initial data imported
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Schema synchronized (`npx prisma db push`)

## Application Setup Phase

### Code Deployment
- [ ] Repository cloned to `C:\ServiceDesk`
- [ ] All files transferred successfully
- [ ] Correct branch checked out
- [ ] Latest updates pulled

### Dependencies Installation
- [ ] `npm install` completed without errors
- [ ] All required packages installed
- [ ] No security vulnerabilities (or documented if accepted)

### Environment Configuration
- [ ] `.env.production` created from template
- [ ] DATABASE_URL configured correctly
- [ ] NEXTAUTH_URL set to server IP/domain
- [ ] NEXTAUTH_SECRET generated (32+ characters)
- [ ] Email settings configured (if needed)
- [ ] All environment variables verified

### Build Process
- [ ] `npm run build` completed successfully
- [ ] No build errors or warnings
- [ ] Build output verified in `.next` folder

## Service Configuration Phase

### PM2 Setup
- [ ] ecosystem.config.js created
- [ ] Application started with PM2
- [ ] PM2 process saved (`pm2 save`)
- [ ] PM2 startup configured
- [ ] Logs directory created

### Windows Service
- [ ] PM2 Windows service installed
- [ ] Service starts automatically on boot
- [ ] Service recovery options configured
- [ ] Task Scheduler jobs created (if needed)

### Monitoring Setup
- [ ] Network monitoring configured
- [ ] IP addresses assigned to branches/ATMs
- [ ] Monitoring intervals set
- [ ] Test ping performed

## Testing Phase

### Application Testing
- [ ] Application accessible on port 3000
- [ ] Login page loads correctly
- [ ] Can login with admin credentials
- [ ] Main dashboard displays
- [ ] Database connection verified

### Feature Testing
- [ ] Create test ticket
- [ ] View reports
- [ ] Check user management
- [ ] Test file uploads
- [ ] Verify email notifications (if configured)

### Network Monitoring Testing
- [ ] Monitoring service starts
- [ ] Network status page loads
- [ ] Ping results displayed
- [ ] Incidents created for failures

## Security Configuration

### Access Control
- [ ] Admin password changed from default
- [ ] User accounts created
- [ ] Role permissions verified
- [ ] Session timeout configured

### Network Security
- [ ] Firewall rules active
- [ ] Unnecessary ports closed
- [ ] SSL certificate installed (if applicable)
- [ ] HTTPS redirect configured (if applicable)

### Backup Configuration
- [ ] Backup script tested
- [ ] Backup schedule created
- [ ] Backup retention policy set
- [ ] Restore process tested

## Documentation Phase

### System Documentation
- [ ] Server IP/domain documented
- [ ] Port numbers documented
- [ ] Admin credentials stored securely
- [ ] Database credentials stored securely

### Operational Procedures
- [ ] Startup procedure documented
- [ ] Shutdown procedure documented
- [ ] Backup procedure documented
- [ ] Recovery procedure documented

### Contact Information
- [ ] Technical support contacts listed
- [ ] Escalation procedures defined
- [ ] Vendor contacts documented

## Go-Live Phase

### Final Checks
- [ ] All test data removed
- [ ] Production data verified
- [ ] Performance acceptable
- [ ] Error logs clean

### Monitoring
- [ ] PM2 monitoring active (`pm2 monit`)
- [ ] Log files being generated
- [ ] Disk space adequate
- [ ] CPU/Memory usage normal

### Handover
- [ ] Administrator trained
- [ ] Documentation provided
- [ ] Support contact established
- [ ] Maintenance schedule agreed

## Post-Deployment

### First Day
- [ ] Monitor application logs
- [ ] Check for any errors
- [ ] Verify all features working
- [ ] User feedback collected

### First Week
- [ ] Daily backups verified
- [ ] Performance metrics reviewed
- [ ] Security logs checked
- [ ] Any issues documented and resolved

### First Month
- [ ] Monthly maintenance performed
- [ ] Database optimization checked
- [ ] Log files rotated
- [ ] Security updates applied

## Rollback Plan

If deployment fails:
1. [ ] Stop PM2 service
2. [ ] Restore database from backup
3. [ ] Revert code changes
4. [ ] Document failure reasons
5. [ ] Plan remediation
6. [ ] Schedule re-deployment

## Sign-off

- **Deployed By**: _____________________  Date: __________
- **Verified By**: _____________________  Date: __________
- **Approved By**: _____________________  Date: __________

## Notes

_Use this space for deployment-specific notes, issues encountered, or special configurations:_

---

---

---