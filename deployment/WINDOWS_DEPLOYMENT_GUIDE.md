# Windows Server Deployment Guide for Bank SulutGo ServiceDesk

## Prerequisites

### Required Software
1. **Windows Server 2019/2022**
2. **Node.js 20.x or higher** - Download from https://nodejs.org/
3. **PostgreSQL 15 or higher** - Download from https://www.postgresql.org/download/windows/
4. **Git** - Download from https://git-scm.com/download/win
5. **PM2** (Process Manager) - Will be installed via npm
6. **IIS** (Optional, for reverse proxy) - Install via Server Manager

### Required Ports
- **3000**: Next.js Application
- **5432**: PostgreSQL Database
- **80/443**: Web Traffic (if using IIS)

## Step 1: Install PostgreSQL

1. Download PostgreSQL installer from https://www.postgresql.org/download/windows/
2. Run the installer with these settings:
   - Installation Directory: `C:\Program Files\PostgreSQL\15`
   - Data Directory: `C:\Program Files\PostgreSQL\15\data`
   - Password for postgres user: **[SECURE_PASSWORD]**
   - Port: **5432**
   - Locale: **Default**

3. Add PostgreSQL to System PATH:
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\15\bin", [EnvironmentVariableTarget]::Machine)
   ```

4. Verify installation:
   ```powershell
   psql --version
   ```

## Step 2: Create Database and User

1. Open PowerShell as Administrator
2. Connect to PostgreSQL:
   ```powershell
   psql -U postgres
   ```

3. Create database and user:
   ```sql
   -- Create database
   CREATE DATABASE servicedesk_database;
   
   -- Create application user
   CREATE USER servicedesk_user WITH PASSWORD 'YourSecurePassword123!';
   
   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE servicedesk_database TO servicedesk_user;
   
   -- Connect to the database
   \c servicedesk_database
   
   -- Grant schema permissions
   GRANT ALL ON SCHEMA public TO servicedesk_user;
   
   -- Exit
   \q
   ```

## Step 3: Install Node.js and Git

1. Download and install Node.js LTS from https://nodejs.org/
2. Download and install Git from https://git-scm.com/download/win
3. Verify installations:
   ```powershell
   node --version
   npm --version
   git --version
   ```

## Step 4: Clone and Setup Application

1. Create application directory:
   ```powershell
   mkdir C:\ServiceDesk
   cd C:\ServiceDesk
   ```

2. Clone the repository:
   ```powershell
   git clone https://github.com/Razboth/Servicedesk.git .
   ```

3. Install dependencies:
   ```powershell
   npm install
   ```

4. Install PM2 globally:
   ```powershell
   npm install -g pm2
   npm install -g pm2-windows-startup
   ```

## Step 5: Configure Environment

1. Create production environment file:
   ```powershell
   Copy-Item .env.example -Destination .env.production
   ```

2. Edit `.env.production` with your settings:
   ```env
   # Database
   DATABASE_URL="postgresql://servicedesk_user:YourSecurePassword123!@localhost:5432/servicedesk_database"
   
   # NextAuth
   NEXTAUTH_URL="http://your-server-ip:3000"
   NEXTAUTH_SECRET="generate-a-secure-random-string-here"
   
   # Environment
   NODE_ENV="production"
   
   # Optional: Email Configuration
   EMAIL_SERVER=""
   EMAIL_FROM=""
   ```

3. Generate NEXTAUTH_SECRET:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## Step 6: Setup Database Schema

1. Generate Prisma client:
   ```powershell
   npx prisma generate
   ```

2. Push schema to database:
   ```powershell
   npx prisma db push
   ```

3. Run database seeds:
   ```powershell
   npm run db:seed
   npm run db:seed:consolidated
   npm run monitoring:setup
   ```

## Step 7: Build Application

1. Build the Next.js application:
   ```powershell
   npm run build
   ```

2. Test the production build:
   ```powershell
   npm run start
   ```
   
   Visit http://localhost:3000 to verify it's working

## Step 8: Setup PM2 Process Manager

1. Create PM2 ecosystem file:
   ```powershell
   pm2 init
   ```

2. Configure `ecosystem.config.js`:
   ```javascript
   module.exports = {
     apps: [{
       name: 'servicedesk',
       script: 'npm',
       args: 'run start',
       cwd: 'C:\\ServiceDesk',
       instances: 1,
       autorestart: true,
       watch: false,
       max_memory_restart: '1G',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   };
   ```

3. Start application with PM2:
   ```powershell
   pm2 start ecosystem.config.js
   pm2 save
   ```

4. Setup PM2 to run on Windows startup:
   ```powershell
   pm2-startup install
   ```

## Step 9: Configure Windows Firewall

1. Open PowerShell as Administrator
2. Add firewall rules:
   ```powershell
   # Allow Node.js application
   New-NetFirewallRule -DisplayName "ServiceDesk App" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
   
   # Allow PostgreSQL (if remote access needed)
   New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow
   ```

## Step 10: Setup IIS as Reverse Proxy (Optional)

1. Install IIS with required modules:
   - Open Server Manager
   - Add Roles and Features
   - Select: Web Server (IIS)
   - Include: Application Request Routing (ARR) and URL Rewrite

2. Configure IIS:
   - Create new website pointing to `C:\ServiceDesk\public`
   - Setup reverse proxy to localhost:3000
   - Configure SSL certificate if available

3. Create `web.config` in application root:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <configuration>
     <system.webServer>
       <rewrite>
         <rules>
           <rule name="ReverseProxyInboundRule" stopProcessing="true">
             <match url="(.*)" />
             <action type="Rewrite" url="http://localhost:3000/{R:1}" />
           </rule>
         </rules>
       </rewrite>
     </system.webServer>
   </configuration>
   ```

## Step 11: Setup Monitoring Service

1. Start network monitoring:
   ```powershell
   npm run monitoring:start
   ```

2. Or create a Windows Task Scheduler job for monitoring

## Step 12: Backup Configuration

1. Setup automated database backups using Task Scheduler
2. Run backup script (see `backup-database.ps1`):
   ```powershell
   .\deployment\backup-database.ps1
   ```

## Maintenance Commands

### PM2 Management
```powershell
# View status
pm2 status

# View logs
pm2 logs servicedesk

# Restart application
pm2 restart servicedesk

# Stop application
pm2 stop servicedesk

# Monitor resources
pm2 monit
```

### Database Management
```powershell
# Backup database
.\deployment\backup-database.ps1

# Restore database
.\deployment\restore-database.ps1 backup-file.sql

# Update schema
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

### Application Updates
```powershell
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build

# Restart PM2
pm2 restart servicedesk
```

## Troubleshooting

### Port Already in Use
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID [PID] /F
```

### Database Connection Issues
1. Check PostgreSQL service:
   ```powershell
   Get-Service -Name postgresql*
   ```

2. Test connection:
   ```powershell
   psql -U servicedesk_user -d servicedesk_database -h localhost
   ```

### PM2 Not Starting
1. Check logs:
   ```powershell
   pm2 logs servicedesk --lines 100
   ```

2. Clear PM2:
   ```powershell
   pm2 delete all
   pm2 start ecosystem.config.js
   ```

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Generate secure NEXTAUTH_SECRET
- [ ] Configure Windows Firewall rules
- [ ] Setup SSL certificate for HTTPS
- [ ] Restrict database user permissions
- [ ] Enable Windows automatic updates
- [ ] Configure backup retention policy
- [ ] Setup monitoring alerts
- [ ] Review and harden IIS configuration
- [ ] Implement rate limiting

## Support

For issues or questions:
- Check application logs: `pm2 logs servicedesk`
- Check database logs: `C:\Program Files\PostgreSQL\15\data\log`
- Review Windows Event Viewer for system issues