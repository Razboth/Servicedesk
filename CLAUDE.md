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
```

### Testing Individual Features
```bash
# No test suite configured yet - add tests using your preferred framework
# Consider: Jest, Vitest, or Playwright for E2E testing
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes with server components
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 (Beta) with role-based access control
- **UI**: Tailwind CSS + Radix UI components + custom components
- **Forms**: React Hook Form + Zod validation

### Key Architectural Patterns

1. **Authentication & Authorization**
   - NextAuth.js handles authentication via `/app/api/auth/[...nextauth]/route.ts`
   - Role-based access control with roles: SUPER_ADMIN, ADMIN, MANAGER, TECHNICIAN, AGENT, USER
   - Session management via `@/components/providers/session-provider.tsx`
   - Protected routes check session and roles before rendering

2. **Database Architecture**
   - Prisma schema at `/prisma/schema.prisma` defines all models
   - Key models: User, Ticket, Branch, ServiceCatalogItem, SLA, ATM
   - Audit logging built into critical operations
   - Soft deletes using `isActive` flags on most models

3. **API Structure**
   - RESTful API routes in `/app/api/`
   - Consistent error handling and response format
   - Admin routes protected with role checks
   - Common patterns: GET (list/read), POST (create), PUT (update), DELETE

4. **Component Architecture**
   - Server Components by default for better performance
   - Client Components marked with 'use client' for interactivity
   - Reusable UI components in `/components/ui/`
   - Feature-specific components organized by domain

5. **State Management**
   - Server state: React Query for API data fetching and caching
   - Client state: Zustand for global client state (if needed)
   - Form state: React Hook Form for complex forms

6. **Ticket Workflow**
   - Tickets follow status progression: OPEN → IN_PROGRESS → RESOLVED → CLOSED
   - Priority levels: LOW, MEDIUM, HIGH, URGENT
   - Assignment to technicians based on branch and availability
   - SLA tracking with response and resolution times

## Environment Configuration

Required environment variables (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL for auth callbacks
- `NEXTAUTH_SECRET`: Secret key for JWT signing
- Email configuration for notifications
- File upload settings and limits

## Important Implementation Details

1. **Import System**: The admin import feature (`/app/admin/import/`) allows CSV bulk imports with rollback capability. Handle with care as it affects multiple database tables.

2. **Real-time Features**: Socket.io is configured but not fully implemented. Future real-time notifications can leverage the existing setup.

3. **File Paths**: All file operations use absolute paths. The codebase uses TypeScript path aliases (@ prefix) defined in `tsconfig.json`.

4. **Authentication Flow**: 
   - Sign in at `/auth/signin`
   - Session checked in middleware
   - API routes verify session before processing

5. **Database Relationships**:
   - Users belong to Branches
   - Tickets are created by Users and assigned to Technicians
   - Service items belong to Categories with tier-based organization
   - Comprehensive audit logging tracks all changes

## Development Guidelines

- Always run `npm run type-check` before committing
- Use Prisma Studio (`npm run db:studio`) to inspect database during development
- Follow existing patterns for API routes and components
- Maintain TypeScript strict mode compliance
- Use server components by default, client components only when necessary
- Implement proper error boundaries for better error handling
- Add loading states for better UX