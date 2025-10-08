# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Bank SulutGo ServiceDesk is an ITIL v4-compliant service management system built with Next.js 15, TypeScript, and PostgreSQL. It's a comprehensive IT ticketing and service management platform designed for Bank SulutGo's multi-branch operations, featuring role-based access control, SLA management, ATM monitoring, and multi-level approval workflows.

## Development Commands

### Essential Commands
```bash
# Development
npm run dev              # Start development server (http://localhost:3000)
npm run dev:https        # Start development server with HTTPS
npm run build           # Build for production
npm run start           # Start production server
npm run start:https     # Start production server with HTTPS
npm run lint            # Run ESLint
npm run type-check      # Check TypeScript types

# Database Operations
npm run db:generate     # Generate Prisma client after schema changes
npm run db:push         # Push schema changes to database
npm run db:migrate      # Create and apply migrations
npm run db:studio       # Open Prisma Studio GUI
npm run db:seed         # Seed database with initial data

# Additional Database Seeds
npm run db:seed:consolidated  # Run consolidated seed with all data
npm run db:seed:idempotent   # Run idempotent seed (safe to run multiple times)
npm run db:seed:validate     # Validate seed data integrity
npm run db:seed:cleanup      # Clean up duplicate entries
npm run db:seed:soc          # Seed SOC-related data
npm run db:seed:network      # Seed network monitoring info
npm run db:seed:atm-claims   # Seed ATM claim templates (TypeScript)
npm run db:seed:atm-claims:js # Seed ATM claim templates (JavaScript)
npm run db:schema:update     # Update schema constraints

# API Key Management
npm run api:generate-claim-key  # Generate API key for ATM claims

# Monitoring Commands
npm run monitoring:start     # Start monitoring service
npm run monitoring:stop      # Stop monitoring service
npm run monitoring:status    # Check monitoring status
npm run monitoring:setup     # Initial monitoring setup

# Security
npm run security:audit       # Run security audit
npm run security:audit:fix   # Fix security vulnerabilities
npm run security:check       # Run custom security checks

# PM2 Process Management (Production)
npm run pm2:start        # Start production server with PM2
npm run pm2:start:dev    # Start development server with PM2
npm run pm2:stop         # Stop PM2 process
npm run pm2:restart      # Restart PM2 process
npm run pm2:reload       # Reload PM2 process (zero downtime)
npm run pm2:delete       # Delete PM2 process
npm run pm2:logs         # View PM2 logs
npm run pm2:status       # Check PM2 status
npm run pm2:monitor      # Open PM2 monitoring
npm run pm2:setup        # Build and start with PM2
npm run pm2:save         # Save PM2 process list
npm run pm2:startup      # Generate PM2 startup script

# Certificate Generation
npm run cert:generate    # Generate SSL certificates for HTTPS
```

### Testing Commands
```bash
# Single test execution (no test framework currently configured)
# Manual testing recommended through UI with different user roles
# Use database seeds to create test data
npm run db:seed:idempotent  # Safe test data creation
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes with server components
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 (Beta) with role-based access control
- **UI**: Tailwind CSS + Radix UI components + custom components
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Query for server state, Zustand for client state
- **Real-time**: Socket.io (configured but not fully implemented)
- **Monitoring**: Custom network monitoring for branches and ATMs
- **Charts**: Chart.js and Recharts for data visualization
- **Reports**: jsPDF for PDF generation, XLSX for Excel exports

### Key Architectural Patterns

1. **Authentication & Authorization**
   - NextAuth.js handles authentication via `/app/api/auth/[...nextauth]/route.ts`
   - Role-based access control with roles: SUPER_ADMIN, ADMIN, MANAGER, TECHNICIAN, AGENT, USER
   - Session management via `@/components/providers/session-provider.tsx`
   - Account lockout after 5 failed attempts (30-minute lockout duration)
   - Protected routes check session and roles before rendering
   - Security headers applied via middleware

2. **Database Architecture**
   - Prisma schema at `/prisma/schema.prisma` defines all models
   - Key models: User, Ticket, Branch, Service, SupportGroup, ATM, FieldTemplate
   - Three-tier service categorization (Category → Subcategory → Item)
   - Audit logging via AuditLog model for critical operations
   - Soft deletes using `isActive` flags on most models
   - Support for custom fields via FieldTemplate and ServiceField models
   - Import/rollback capability via ImportLog tracking

3. **API Structure**
   - RESTful API routes in `/app/api/`
   - Consistent error handling and response format
   - Admin routes protected with role checks
   - Common patterns: GET (list/read), POST (create), PUT (update), DELETE
   - Specialized endpoints for reports, monitoring, and approval workflows

4. **Component Architecture**
   - Server Components by default for better performance
   - Client Components marked with 'use client' for interactivity
   - Reusable UI components in `/components/ui/`
   - Feature-specific components organized by domain (tickets, admin, reports, etc.)
   - Provider components for session, sidebar, and security contexts

5. **Ticket Management System**
   - Tickets follow status progression: OPEN → IN_PROGRESS → RESOLVED → CLOSED
   - Priority levels: LOW, MEDIUM, HIGH, URGENT
   - Assignment to technicians based on support groups and branch
   - SLA tracking with response and resolution times
   - Multi-level approval workflow for certain services
   - Task templates for standardized ticket workflows
   - File attachments support with upload limits

6. **Network Monitoring**
   - Real-time monitoring for ATMs and branch networks
   - Support for multiple network media types (VSAT, M2M, FO)
   - Incident tracking and alert management
   - Ping results and performance metrics storage

## Environment Configuration

Required environment variables (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string (format: postgresql://username:password@localhost:5432/servicedesk)
- `NEXTAUTH_URL`: Application URL for auth callbacks (default: http://localhost:3000)
- `NEXTAUTH_SECRET`: Secret key for JWT signing
- `NODE_ENV`: Environment (development/production)
- `EMAIL_SERVER_*`: SMTP configuration for notifications
- `UPLOAD_MAX_SIZE`: Maximum file upload size (default: 10MB)
- `UPLOAD_ALLOWED_TYPES`: Allowed MIME types for uploads
- `ENCRYPTION_KEY`: 32-character encryption key
- `JWT_SECRET`: JWT signing secret
- `MONITORING_ENABLED`: Enable/disable monitoring features

## Important Implementation Details

1. **Import System**: The admin import feature (`/app/admin/import/`) allows CSV bulk imports with rollback capability via ImportLog tracking. Handle with care as it affects multiple database tables.

2. **Field Templates**: Dynamic custom fields system for services using FieldTemplate model. Supports text, number, select, checkbox, date, and file types.

3. **File Paths**: All file operations use absolute paths. The codebase uses TypeScript path aliases (@ prefix) defined in `tsconfig.json`.

4. **Authentication Flow**: 
   - Sign in at `/auth/signin`
   - Session checked in middleware (simplified for stability)
   - API routes verify session before processing
   - Login attempts tracked in LoginAttempt table

5. **Database Relationships**:
   - Users belong to Branches and optionally to SupportGroups
   - Tickets are created by Users and assigned to Technicians
   - Services linked to ServiceCategories and SupportGroups
   - ATMs belong to Branches with monitoring capabilities
   - Comprehensive audit logging tracks all changes

6. **Report System**: Extensive reporting capabilities across multiple domains:
   - Admin reports (service catalog, SLA performance, user analytics)
   - Business reports (customer experience, operational excellence)
   - Infrastructure reports (ATM intelligence, technical trends)
   - Manager reports (approval workflow, branch operations, team performance)
   - Technician reports (performance, task execution, technical issues)
   - Compliance reports (security, system health)

7. **API Keys System**: The system includes an API key management system for external integrations:
   - API keys can be created with specific permissions (READ, WRITE, DELETE, ADMIN)
   - Keys are scoped to specific services (TICKET_STATUS, ATM_CLAIMS, etc.)
   - Rate limiting and IP restrictions can be applied
   - Keys can be revoked and have expiration dates

## Legacy Import System

### ManageEngine ServiceDesk Plus Integration
- **Scripts Location**: `scripts/import-manageengine-tickets.js` and `scripts/reimport-legacy-comments.js`
- **API Documentation**: Available at https://127.0.0.1:8081/SetUpWizard.do?forwardTo=apidoc
- **Import Workflow**: Main import script handles tickets, users, and comments with comprehensive branch mapping
- **Branch Mapping**: 250+ branch mappings from creator names to branch codes (e.g., "Cabang Utama" → "001")
- **Comment Import**: Separate endpoint `/api/v3/requests/{ticket_number}/notes` with known API Error 4000 issues
- **Rate Limiting**: ManageEngine API has 100 requests per call limit, requires pagination
- **Rollback Capability**: ImportLog model tracks all imports for potential rollback operations

### Legacy Import Commands
```bash
# Main import with all options
node scripts/import-manageengine-tickets.js --url=https://127.0.0.1:8081 --api-key=YOUR_KEY --import-comments --verbose

# Reimport comments for existing tickets
node scripts/reimport-legacy-comments.js --api-key=YOUR_KEY --batch-size=10

# Check branch mappings
node scripts/check-all-branches.js

# Generate complete branch mapping
node scripts/generate-complete-branch-mapping.js
```

### Known Import Issues
- **Comment Import**: API Error 4000 occurs consistently when accessing notes endpoint
- **Batch Processing**: Use small batch sizes (10-50) to avoid rate limiting
- **SSL Issues**: Use `--insecure` flag for self-signed certificates
- **Branch Mapping**: Ensure all 80+ active branches are mapped correctly

## Production Deployment

### PM2 Configuration
- **Main App**: `npm run pm2:start` (runs on port 3000)
- **Monitoring Service**: `npm run pm2:monitoring:start` (separate process)
- **Full Setup**: `npm run pm2:setup` (builds and starts)
- **HTTPS**: Configured via `ecosystem.config.js` with certificate management

### SSL/HTTPS Setup
- **Certificate Generation**: `npm run cert:generate`
- **Development HTTPS**: `npm run dev:https`
- **Production HTTPS**: `npm run start:https`
- **Port Configuration**: Avoids port 443 conflicts with Apache

### Monitoring System
- **Network Monitoring**: Separate PM2 service for ATM and branch monitoring
- **Ping Monitoring**: Scheduled ping checks for network entities
- **Alert Management**: Integration with incident tracking system
- **Monitoring Commands**: start/stop/status operations available

## Development Guidelines

- Always run `npm run type-check` and `npm run lint` before committing
- Use Prisma Studio (`npm run db:studio`) to inspect database during development
- Follow existing patterns for API routes and components
- Maintain TypeScript strict mode compliance
- Use server components by default, client components only when necessary
- Implement proper error boundaries for better error handling
- Add loading states for better UX
- Check for duplicate entries when seeding data (use idempotent seeds)
- Test changes across different user roles to ensure proper access control
- Verify SLA calculations when modifying ticket workflows
- Ensure audit logs are created for sensitive operations
- Always rebuild and restart after every commit
- Always commit every changes also rebuild and restart
- The default theme get from https://tweakcn.com/themes/cmf4zd6yp000004ib53oeciwk

## User Roles Hierarchy

- **SUPER_ADMIN**: Full system access and configuration
- **ADMIN**: Administrative access to most features
- **MANAGER**: Branch and team management capabilities
- **TECHNICIAN**: Technical support and resolution
- **AGENT**: Customer service and basic ticket handling
- **USER**: End users who can create tickets and requests

## Common Development Workflows

### Adding New Features
1. Create feature branch from main
2. Update database schema in `prisma/schema.prisma` if needed
3. Run `npm run db:push` to apply schema changes
4. Generate Prisma client: `npm run db:generate`
5. Implement API routes in `app/api/`
6. Create UI components and pages
7. Test with different user roles
8. Run type checking and linting
9. Build and test production build

### Database Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run db:push` for development
3. For production: `npm run db:migrate` to create migration files
4. Always run `npm run db:generate` after schema changes
5. Update seed scripts if needed
6. Test with `npm run db:studio`

### Debugging Issues
1. Check application logs: `npm run pm2:logs`
2. Monitor database with: `npm run db:studio`
3. Verify environment variables in `.env.local`
4. Check network monitoring status: `npm run monitoring:status`
5. Review audit logs in database for user actions
6. Test API endpoints individually
7. Verify user roles and permissions