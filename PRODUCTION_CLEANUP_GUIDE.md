# Production Server Complete Cleanup Guide

## ⚠️ **CRITICAL: READ ENTIRE GUIDE BEFORE PROCEEDING**

This guide will help you safely run the comprehensive custom fields cleanup on your production Bank SulutGo ServiceDesk server. This operation will remove ALL custom fields from ALL services.

---

## 📋 **Pre-Cleanup Checklist**

### **1. MANDATORY: Create Full Database Backup**
```bash
# PostgreSQL backup (adjust credentials/host as needed)
pg_dump -h localhost -U postgres -d servicedesk > backup_before_cleanup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -la backup_before_cleanup_*.sql
```

### **2. Stop All PM2 Processes**
```bash
# Stop the ServiceDesk application
npm run pm2:stop

# Stop monitoring services if running
pm2 stop all

# Verify all stopped
pm2 status
```

### **3. Verify Environment**
```bash
# Check you're on the production server
hostname
pwd
whoami

# Confirm database connection
npm run db:studio
# (Press Ctrl+C after confirming it connects)
```

### **4. Update Application to Latest Version**
```bash
# Pull latest changes (if needed)
git pull origin main

# Install any new dependencies
npm install

# Rebuild application
npm run build
```

---

## 🚨 **SAFETY PROTOCOL**

### **Phase 1: Assessment & Dry Run**

#### **Step 1: Assess Current State**
```bash
# Run comprehensive dry run to see EVERYTHING that will be affected
npx tsx scripts/cleanup-service-fields.ts --all --dry-run

# Save the output for records
npx tsx scripts/cleanup-service-fields.ts --all --dry-run > cleanup_assessment_$(date +%Y%m%d_%H%M%S).log 2>&1
```

#### **Step 2: Review Assessment**
```bash
# Review the log file
cat cleanup_assessment_*.log

# Look for:
# - Total number of services affected
# - Total custom fields to be removed
# - Services with high field counts
# - Any error messages
```

#### **Step 3: Identify High-Risk Services** (Optional)
```bash
# Check specific high-impact services individually
npx tsx scripts/cleanup-service-fields.ts --service-name "ATM" --dry-run
npx tsx scripts/cleanup-service-fields.ts --service-name "Banking" --dry-run
npx tsx scripts/cleanup-service-fields.ts --service-name "Core" --dry-run
```

---

## 🔧 **EXECUTION PHASE**

### **Phase 2: Full Production Cleanup**

#### **Step 4: Final Backup Verification**
```bash
# Verify backup exists and is recent
ls -la backup_before_cleanup_*.sql

# Check backup size (should be substantial if you have data)
du -h backup_before_cleanup_*.sql
```

#### **Step 5: Execute Complete Cleanup**
```bash
# CRITICAL: This will clean ALL services
# You will be prompted to type "CONFIRM" - only proceed if you're certain
npx tsx scripts/cleanup-service-fields.ts --all

# When prompted, type exactly: CONFIRM
```

#### **Step 6: Monitor Execution**
The script will show progress like:
```
🧹 Service Fields Cleanup Tool
===============================
📋 Finding all services...
📊 Found 150 service(s) to process:

🔧 Processing: ATM Klaim Service
   ID: clm123...
   Direct Fields: 15
   Field Templates: 8
   🗑️  Removing 15 direct ServiceFields...
   ✅ Deleted 15 ServiceFields
   🗑️  Removing 8 ServiceFieldTemplate links...
   ✅ Deleted 8 ServiceFieldTemplate links
   ✨ Service "ATM Klaim Service" cleanup complete
```

---

## ✅ **POST-CLEANUP VERIFICATION**

### **Phase 3: Verification & Restart**

#### **Step 7: Verify Cleanup Results**
```bash
# Check the cleanup summary in the script output
# Should show something like:
# 📊 Cleanup Summary:
#    Services processed: 150
#    Total ServiceFields removed: 1,250
#    Total ServiceFieldTemplates removed: 890
```

#### **Step 8: Restart Application**
```bash
# Start the application
npm run pm2:start

# Verify it started successfully
pm2 status
pm2 logs --lines 50

# Should see:
# ✅ Prisma client connected successfully
# ✅ Socket.io server initialized
# 🏦 Bank SulutGo ServiceDesk Server Started
```

#### **Step 9: Web Interface Verification**
1. **Open browser** and navigate to your ServiceDesk URL
2. **Login as ADMIN** or SUPER_ADMIN
3. **Go to Admin → Services**
4. **Check a few services** that previously had custom fields:
   - Click "Manage Fields"
   - Verify the fields are gone
   - Check both "Active Fields" and "Custom Fields" tabs
   - Should show "No fields configured yet"

#### **Step 10: Quick Function Test**
1. **Create a test ticket** to ensure basic functionality works
2. **Try viewing existing tickets** to ensure no data corruption
3. **Test service catalog** to ensure services still work
4. **Check reports** to ensure no UI breaks

---

## 🆘 **EMERGENCY ROLLBACK PROCEDURE**

### **If Something Goes Wrong:**

#### **Immediate Actions:**
```bash
# 1. Stop the application immediately
npm run pm2:stop

# 2. Restore from backup
psql -h localhost -U postgres -d servicedesk < backup_before_cleanup_YYYYMMDD_HHMMSS.sql

# 3. Restart application
npm run pm2:start

# 4. Verify restoration worked
# Check in web interface that fields are back
```

#### **Partial Rollback (If Needed):**
If you need to restore only specific services:
```bash
# Extract specific table data from backup
pg_restore --table=service_field_templates backup_file.sql
pg_restore --table=service_fields backup_file.sql
```

---

## 📊 **EXPECTED RESULTS**

### **What Should Happen:**
- ✅ All custom fields removed from all services
- ✅ Both ServiceField and ServiceFieldTemplate entries deleted
- ✅ Services remain functional but with no custom fields
- ✅ Tickets and other data remain intact
- ✅ No more "reappearing fields" issue

### **What Should NOT Happen:**
- ❌ Tickets should not be deleted
- ❌ Services should not be deleted
- ❌ Users should not be affected
- ❌ Application should not crash
- ❌ Database corruption

---

## 🔍 **MONITORING & VALIDATION**

### **Post-Cleanup Monitoring (First 24 Hours):**

#### **Check Application Logs:**
```bash
# Monitor for any errors
pm2 logs --lines 100

# Check for database errors
tail -f logs/application.log
```

#### **Database Health Check:**
```bash
# Check database connections
npm run db:studio

# Run basic queries to ensure data integrity
npx tsx -e "
import { prisma } from './lib/prisma.js';
(async () => {
  const serviceCount = await prisma.service.count();
  const ticketCount = await prisma.ticket.count();
  const userCount = await prisma.user.count();
  console.log(\`Services: \${serviceCount}, Tickets: \${ticketCount}, Users: \${userCount}\`);
  await prisma.\$disconnect();
})();"
```

#### **User Experience Validation:**
1. **Test ticket creation** across different services
2. **Verify no missing fields** that were actually needed
3. **Check service catalog browsing**
4. **Validate existing ticket viewing**

---

## 📝 **DOCUMENTATION & REPORTING**

### **Create Cleanup Report:**
```bash
# Create a summary report
cat > cleanup_report_$(date +%Y%m%d).md << EOF
# Production Cleanup Report - $(date)

## Pre-Cleanup State:
- Database backup: backup_before_cleanup_$(date +%Y%m%d_*)
- Services analyzed: [COUNT FROM DRY RUN]
- Fields to remove: [COUNT FROM DRY RUN]

## Cleanup Execution:
- Start time: $(date)
- Script used: cleanup-service-fields.ts --all
- Confirmation provided: Yes

## Results:
- Services processed: [FILL FROM OUTPUT]
- ServiceFields removed: [FILL FROM OUTPUT]
- ServiceFieldTemplates removed: [FILL FROM OUTPUT]
- Execution time: [CALCULATE]

## Post-Cleanup Verification:
- Application restart: ✅
- Web interface: ✅
- Basic functionality: ✅
- No errors in logs: ✅

## Notes:
[ANY ISSUES OR OBSERVATIONS]
EOF
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues & Solutions:**

#### **Script Fails with Permission Error:**
```bash
# Check file permissions
chmod +x scripts/cleanup-service-fields.ts

# Run with explicit tsx
npx tsx scripts/cleanup-service-fields.ts --all
```

#### **Database Connection Error:**
```bash
# Check database is running
sudo systemctl status postgresql

# Verify connection string
echo $DATABASE_URL

# Test connection
npm run db:studio
```

#### **Application Won't Start After Cleanup:**
```bash
# Check PM2 logs
pm2 logs --lines 50

# Clear PM2 cache
pm2 kill
npm run pm2:start

# Check for build issues
npm run build
```

#### **Some Services Still Have Fields:**
```bash
# Check specific services
npx tsx scripts/cleanup-service-fields.ts --service-name "ServiceName" --dry-run

# Clean individual service if needed
npx tsx scripts/cleanup-service-fields.ts --service-name "ServiceName"
```

---

## 📞 **SUPPORT CONTACTS**

### **If You Need Help:**
1. **Check this guide first** - most issues are covered
2. **Review the script logs** for specific error messages
3. **Have backup ready** for quick restoration if needed
4. **Document any issues** for future reference

### **Emergency Escalation:**
- If application is completely broken: **Restore from backup immediately**
- If partial issues: **Document and proceed with targeted fixes**
- If data corruption suspected: **Stop all operations and investigate**

---

## ✨ **SUCCESS CRITERIA**

### **Cleanup is Successful When:**
- ✅ Script completes without errors
- ✅ Application starts and runs normally
- ✅ Web interface loads and is functional
- ✅ Users can create tickets without issues
- ✅ No custom fields appear in any service
- ✅ No "reappearing fields" issues occur
- ✅ All existing tickets remain accessible
- ✅ No database errors in logs

---

**Remember: Take your time, follow each step carefully, and always have your backup ready. The cleanup is designed to be safe, but production environments require extra caution.**

**Good luck! 🍀**