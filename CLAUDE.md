# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bank SulutGo ServiceDesk is an ITIL v4-compliant service management system built with Next.js 15, TypeScript, and PostgreSQL. It's a comprehensive IT ticketing and service management platform designed for Bank SulutGo's multi-branch operations.

## Development Commands

### Essential Commands
```bash
# Development
npm run dev              # Start development server (http://localhost:3000)
npm run build           # Build for production
npm run start           # Start production server
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
npm run db:schema:update     # Update schema constraints

# Security
npm run security:audit       # Run security audit
npm run security:audit:fix   # Fix security vulnerabilities
npm run security:check       # Run custom security checks
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
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL for auth callbacks
- `NEXTAUTH_SECRET`: Secret key for JWT signing
- `NODE_ENV`: Environment (development/production)
- Email configuration for notifications (if needed)
- File upload settings and limits

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

## Development Guidelines

- Always run `npm run type-check` before committing
- Use Prisma Studio (`npm run db:studio`) to inspect database during development
- Follow existing patterns for API routes and components
- Maintain TypeScript strict mode compliance
- Use server components by default, client components only when necessary
- Implement proper error boundaries for better error handling
- Add loading states for better UX
- Check for duplicate entries when seeding data (use idempotent seeds)