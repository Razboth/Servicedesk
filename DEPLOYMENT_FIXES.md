# Deployment Fixes Guide

## Issue 1: API Keys Menu Not Visible in Sidebar

### Problem:
The API Keys menu item doesn't show up in the sidebar, but `/admin/api-keys` URL works.

### Cause:
The API Keys menu is only visible to users with ADMIN or SUPER_ADMIN roles.

### Solution:
1. Make sure your user account has ADMIN or SUPER_ADMIN role:
```sql
-- Check your user role
SELECT email, role FROM users WHERE email = 'your-email@example.com';

-- Update to ADMIN if needed
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

2. Or login with an admin account (default from seed):
- Email: `admin@banksulutgo.co.id`
- Password: `password123`

## Issue 2: ATM Claims Seed Not Running

### Problem:
Cannot run the ATM claims database seed.

### Commands to Run:
```bash
# Install dependencies first (if not already installed)
npm install

# Run the ATM claims seed
npm run db:seed:atm-claims

# Or run directly with npx
npx tsx prisma/seed-atm-claim-templates.ts

# If tsx is not found, install it globally
npm install -g tsx

# Then run
tsx prisma/seed-atm-claim-templates.ts
```

### Alternative: Run with Node.js
If tsx doesn't work on your server:
```bash
# Compile TypeScript first
npx tsc prisma/seed-atm-claim-templates.ts --outDir dist

# Run the compiled JavaScript
node dist/prisma/seed-atm-claim-templates.js
```

## Issue 3: Missing Dependencies

If you get module not found errors:
```bash
# Ensure all dependencies are installed
npm install
npm install --save-dev tsx typescript @types/node

# Install Prisma client
npx prisma generate
```

## Complete Deployment Steps

1. **Pull latest code**:
```bash
git pull origin main
```

2. **Install dependencies**:
```bash
npm install
```

3. **Generate Prisma Client**:
```bash
npx prisma generate
```

4. **Push database schema**:
```bash
npx prisma db push
```

5. **Run seeds in order**:
```bash
# Basic seed
npm run db:seed

# ATM claims seed
npm run db:seed:atm-claims

# Generate API key for testing
npx tsx scripts/create-api-key.ts
```

6. **Build application**:
```bash
npm run build
```

7. **Start production server**:
```bash
npm run start
# OR with PM2
npm run pm2:start
```

## Environment Variables Required

Make sure these are set in your `.env` file:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/servicedesk
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key-here
NODE_ENV=production
```

## Testing API Keys

1. **Create an API key**:
```bash
npx tsx scripts/create-api-key.ts
```

2. **Test the API**:
```bash
# Get ticket status
curl -X GET "https://your-domain.com/api/tickets/status?ticketNumber=TKT-001" \
  -H "X-API-Key: your-api-key-here"

# Create ATM claim
curl -X POST "https://your-domain.com/api/tickets/atm-claim" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "atm_code": "0126",
    "transaction_date": "2024-03-15T10:30:00Z",
    "transaction_amount": 2500000,
    "card_last_4": "5678",
    "customer_name": "Test User",
    "customer_account": "1234567890",
    "customer_phone": "081234567890",
    "claim_type": "CASH_NOT_DISPENSED",
    "claim_description": "Test claim",
    "reporting_channel": "BRANCH"
  }'
```

## Troubleshooting Common Errors

### Error: "tsx: command not found"
```bash
# Install tsx globally
npm install -g tsx

# Or use npx
npx tsx prisma/seed-atm-claim-templates.ts
```

### Error: "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### Error: "Database connection failed"
- Check DATABASE_URL in .env file
- Ensure PostgreSQL is running
- Check database credentials

### Error: "ECONNREFUSED" on production
- Check if the application is running on the correct port
- Verify firewall settings
- Check nginx/apache proxy configuration

## Checking Logs

```bash
# PM2 logs
pm2 logs bsg-servicedesk

# Or check system logs
journalctl -u servicedesk -f

# Check for TypeScript errors
npm run type-check
```