# Bank SulutGo ServiceDesk

A comprehensive ITIL v4-compliant service management system built for Bank SulutGo to manage IT services across all branches.

## Features

### Core Functionality
- **Ticket Management**: Create, track, and resolve service requests and incidents
- **User Management**: Role-based access control with multiple user types
- **Branch Management**: Multi-branch support with location-specific services
- **Service Catalog**: Standardized IT services and request templates
- **SLA Management**: Service level agreement tracking and compliance
- **ATM Monitoring**: Real-time ATM status monitoring across branches
- **Approval Workflow**: Multi-level approval system for service requests
- **Knowledge Base**: Self-service documentation and solutions
- **Audit Logging**: Comprehensive activity tracking and compliance
- **Vendor Management**: External vendor and contract management

### Technical Features
- **Modern UI**: Built with Next.js 15, React 18, and Tailwind CSS
- **Type Safety**: Full TypeScript implementation
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with role-based access
- **Real-time Updates**: Live status updates and notifications
- **Responsive Design**: Mobile-first responsive interface
- **Performance**: Optimized for fast loading and smooth interactions

## Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Validation**: Zod schema validation
- **Forms**: React Hook Form
- **Maps**: Leaflet for branch locations
- **Email**: Nodemailer for notifications

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd servicedesk6
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update the `.env.local` file with your configuration:
   - Database connection string
   - NextAuth.js secret and URL
   - Email service credentials
   - Other service configurations

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Seed the database (optional)**
   ```bash
   npx prisma db seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
servicedesk6/
├── app/                    # Next.js 13+ app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
│   └── ui/               # Base UI components
├── lib/                  # Utility libraries
│   ├── auth.ts           # Authentication configuration
│   ├── prisma.ts         # Database client
│   └── utils.ts          # Helper functions
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Prisma schema
├── public/               # Static assets
└── types/                # TypeScript type definitions
```

## User Roles

- **SUPER_ADMIN**: Full system access and configuration
- **ADMIN**: Administrative access to most features
- **MANAGER**: Branch and team management capabilities
- **TECHNICIAN**: Technical support and resolution
- **AGENT**: Customer service and basic ticket handling
- **USER**: End users who can create tickets and requests

## Key Models

### Ticket Management
- **Ticket**: Core ticket entity with status, priority, and assignments
- **TicketComment**: Communication thread for each ticket
- **TicketAttachment**: File attachments and documentation

### User & Branch Management
- **User**: System users with roles and permissions
- **Branch**: Bank branch locations and details
- **Department**: Organizational departments

### Service Management
- **ServiceCatalogItem**: Available IT services
- **SLA**: Service level agreements and metrics
- **ApprovalWorkflow**: Multi-step approval processes

### Monitoring & Assets
- **ATM**: ATM machines and their status
- **ATMIncident**: ATM-specific incidents and issues
- **AuditLog**: System activity and change tracking

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

### Database Operations

- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema changes to database
- `npx prisma db pull` - Pull schema from existing database
- `npx prisma migrate dev` - Create and apply migrations

## Configuration

### Environment Variables

See `.env.example` for all required environment variables:

- **Database**: `DATABASE_URL`
- **Authentication**: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- **Email**: `EMAIL_SERVER_*` variables
- **Application**: `APP_NAME`, `APP_URL`
- **Security**: `ENCRYPTION_KEY`, `JWT_SECRET`

### Customization

- **Branding**: Update colors in `tailwind.config.ts`
- **Email Templates**: Modify templates in `lib/email/`
- **Business Logic**: Extend models in `prisma/schema.prisma`
- **UI Components**: Customize components in `components/ui/`

## Security Features

- **Authentication**: Secure login with NextAuth.js
- **Authorization**: Role-based access control
- **Data Validation**: Input validation with Zod
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **CSRF Protection**: Built-in Next.js CSRF protection
- **Audit Logging**: Comprehensive activity tracking

## Performance Optimizations

- **Server-Side Rendering**: Next.js SSR for fast initial loads
- **Code Splitting**: Automatic code splitting and lazy loading
- **Image Optimization**: Next.js Image component
- **Database Indexing**: Optimized database queries
- **Caching**: Strategic caching for frequently accessed data

## Compliance & Standards

- **ITIL v4**: Aligned with ITIL service management practices
- **Security**: Bank-grade security standards
- **Accessibility**: WCAG 2.1 compliance
- **Data Protection**: Privacy and data protection measures

## Support & Documentation

- **API Documentation**: Available at `/api/docs` (when implemented)
- **User Guide**: Comprehensive user documentation
- **Admin Guide**: System administration documentation
- **Developer Guide**: Technical implementation details

## License

This project is proprietary software developed for Bank SulutGo.

## Contributing

This is an internal project. Please follow the established development workflow and coding standards.