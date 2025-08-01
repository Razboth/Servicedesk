# ServiceDesk6 - Deployment Guide

This package contains a complete ServiceDesk application with database dump for easy deployment on another machine.

## 📦 Package Contents

- **Source Code**: Complete Next.js application
- **Database Dump**: `servicedesk_database_dump.sql` - PostgreSQL database with sample data
- **Environment Configuration**: `.env.example` template
- **Dependencies**: `package.json` and `package-lock.json`

## 🚀 Setup Instructions

### Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v12 or higher)
3. **npm** or **yarn**

### Step 1: Extract and Install Dependencies

```bash
# Extract the zip file
unzip servicedesk6-deployment.zip
cd servicedesk6

# Install dependencies
npm install
```

### Step 2: Database Setup

```bash
# Create a new PostgreSQL database
createdb servicedesk6

# Restore the database from dump
psql -d servicedesk6 < servicedesk_database_dump.sql
```

### Step 3: Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your database connection
# Update DATABASE_URL to match your PostgreSQL setup
```

**Example .env.local:**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/servicedesk6?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

### Step 4: Run the Application

```bash
# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 👥 Default Users

The database includes these test users:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | admin123 |
| Manager | manager@company.com | manager123 |
| Technician | tech@company.com | tech123 |
| User | user@company.com | user123 |

## 🔧 Production Deployment

For production deployment:

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

3. **Environment variables:**
   - Set `NEXTAUTH_URL` to your production domain
   - Use a strong `NEXTAUTH_SECRET`
   - Configure production PostgreSQL database

## 📋 Features Included

- ✅ **User Authentication** (NextAuth.js)
- ✅ **Role-based Access Control** (Admin, Manager, Technician, User)
- ✅ **Ticket Management System**
- ✅ **Service Catalog**
- ✅ **Dashboard Analytics**
- ✅ **Technician Workbench**
- ✅ **Manager Approvals**
- ✅ **Responsive UI** (Tailwind CSS)

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Radix UI

## 📞 Support

If you encounter any issues during deployment, check:

1. **Database Connection**: Ensure PostgreSQL is running and accessible
2. **Environment Variables**: Verify all required variables are set
3. **Dependencies**: Run `npm install` to ensure all packages are installed
4. **Prisma**: Run `npx prisma generate` after database setup

## 🔄 Database Migration

If you need to update the database schema:

```bash
# Apply schema changes
npx prisma db push

# Generate new Prisma client
npx prisma generate
```

---

**Created with ❤️ using Trae AI**