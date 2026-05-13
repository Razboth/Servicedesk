# Bank SulutGo ServiceDesk

An ITIL v4-compliant IT Service Management (ITSM) system built for Bank SulutGo, designed to streamline IT operations, ticket management, and infrastructure monitoring.

## Features

### Ticket Management
- **Multi-tier ticket system** with customizable categories and priorities
- **SLA tracking** with automatic escalation
- **Workflow automation** with approval processes
- **Custom fields** per service category
- **File attachments** and comment threads
- **Ticket lifecycle management** (Open → In Progress → Resolved → Closed)

### User Roles
| Role | Description |
|------|-------------|
| `USER` | Create and track own tickets |
| `TECHNICIAN` | Handle and resolve tickets |
| `SUPERVISOR` | Oversee team operations |
| `MANAGER` | Branch and team management |
| `ADMIN` | System administration |
| `SECURITY_ANALYST` | Security monitoring and SOC |

### Infrastructure Management
- **ATM Monitoring** - Track ATM status, alarms, and technical issues
- **Branch Network Monitoring** - Real-time network status across branches
- **PC Asset Management** - Hardware inventory with QR codes
- **Server Metrics** - P20T daily checklists and server monitoring
- **License Management** - OS, Office, and Antivirus license tracking

### Reporting & Analytics
- **Branch Reports** - Ticket statistics per branch
- **Quarterly Reports** - Comprehensive trend analysis
- **SLA Performance** - Response and resolution time tracking
- **Technician Performance** - Individual and team metrics
- **ATM Intelligence** - ATM issue patterns and analysis
- **Custom Report Builder** - Create and save custom reports

### Knowledge Management (KMS)
- Article creation with rich text editor
- Version control and collaboration
- Category-based organization
- Search and feedback system

### Security Features
- **Session management** with concurrent session limits
- **Audit logging** for compliance
- **Password policies** with expiration
- **Role-based access control (RBAC)**
- **API key management** for integrations

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Next.js 15, React 18, TypeScript |
| **Database** | PostgreSQL with Prisma ORM |
| **Authentication** | NextAuth.js v5 |
| **UI Components** | Radix UI, Tailwind CSS, shadcn/ui |
| **Charts** | Recharts, Chart.js |
| **PDF/Excel** | jsPDF, xlsx |
| **Real-time** | Socket.IO |
| **Maps** | Leaflet, React-Leaflet |

## Prerequisites

- Node.js >= 20.0.0
- PostgreSQL database
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Razboth/Servicedesk.git
   cd Servicedesk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/servicedesk"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Setup database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Scripts

### Development
```bash
npm run dev          # Start development server
npm run dev:https    # Start with HTTPS
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database
```

### PM2 Production
```bash
npm run pm2:start    # Start with PM2
npm run pm2:stop     # Stop PM2 process
npm run pm2:restart  # Restart PM2 process
npm run pm2:logs     # View logs
npm run pm2:status   # Check status
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── admin/             # Admin modules
│   ├── api/               # API routes
│   ├── manager/           # Manager dashboard
│   ├── reports/           # Reporting modules
│   ├── security/          # Security analyst tools
│   ├── technician/        # Technician workspace
│   └── tickets/           # Ticket management
├── components/            # Reusable UI components
├── lib/                   # Utilities and helpers
├── prisma/                # Database schema and seeds
├── public/                # Static assets
└── scripts/               # Utility scripts
```

## API Documentation

The system provides RESTful APIs for:
- Ticket CRUD operations
- User management
- ATM claim integrations
- Monitoring webhooks
- Report generation

API authentication uses either session-based auth or API keys for external integrations.

## Docker Deployment

```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth.js secret key |
| `NEXTAUTH_URL` | Application URL |
| `SMTP_HOST` | Email server host |
| `SMTP_PORT` | Email server port |
| `SMTP_USER` | Email username |
| `SMTP_PASSWORD` | Email password |

## License

Proprietary - Bank SulutGo

## Contributing

Internal development team only. Please follow the established coding standards and submit pull requests for review.

---

Built with Next.js by Bank SulutGo IT Division
