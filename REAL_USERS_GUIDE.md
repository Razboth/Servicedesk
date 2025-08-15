# Bank SulutGo ServiceDesk - Real Users Guide

This document contains the login credentials and organizational structure for real Bank SulutGo employees in the ServiceDesk system.

## 🏢 Organizational Structure

### Branch Distribution
Users are distributed across Bank SulutGo branches based on their roles and operational needs:

- **KC001** - Kantor Pusat Manado (Head Office)
- **KCP002** - Kantor Cabang Pembantu Tomohon
- **KCP003** - Kantor Cabang Pembantu Bitung
- **KCP004** - Kantor Cabang Pembantu Kotamobagu
- **KCP005** - Kantor Cabang Pembantu Airmadidi
- **KCP006** - Kantor Cabang Pembantu Tondano
- **KCP007** - Kantor Cabang Pembantu Langowan
- **KCP008** - Kantor Cabang Pembantu Tahuna

---

## 👥 MANAGERS (Branch-Level Access)

Managers can view and manage tickets from their assigned branch, approve user requests, and oversee branch operations.

### 🔵 Excelsis Maramis
- **Email:** `excelsis.maramis@banksulutgo.co.id`
- **Password:** `password123`
- **Position:** Branch Manager
- **Role:** MANAGER
- **Access Level:** Can view all tickets from assigned branch
- **Responsibilities:**
  - Branch operations oversight
  - Ticket approval and escalation
  - Resource allocation decisions
  - Staff management

### 🔵 Shirke Heslin  
- **Email:** `shirke.heslin@banksulutgo.co.id`
- **Password:** `password123`
- **Position:** Operations Manager
- **Role:** MANAGER
- **Access Level:** Can view all tickets from assigned branch
- **Responsibilities:**
  - Daily operations management
  - Process improvement initiatives
  - Workflow optimization
  - Operational risk management

### 🔵 Cecep Juarsa
- **Email:** `cecep.juarsa@banksulutgo.co.id`
- **Password:** `password123`
- **Position:** Credit Manager
- **Role:** MANAGER
- **Access Level:** Can view all tickets from assigned branch
- **Responsibilities:**
  - Credit operations oversight
  - Loan processing systems
  - Risk assessment tools
  - Credit policy implementation

### 🔵 Erwin Lapian
- **Email:** `erwin.lapian@banksulutgo.co.id`
- **Password:** `password123`
- **Position:** Risk Management Manager
- **Role:** MANAGER
- **Access Level:** Can view all tickets from assigned branch
- **Responsibilities:**
  - Risk monitoring systems
  - Compliance management
  - Security incident oversight
  - Regulatory reporting tools

---

## 👤 REGULAR USERS (Personal Access Only)

Regular users can create tickets, view their own submissions, and track resolution progress. Their tickets require manager approval.

### 🟢 Gugah Wijaya
- **Email:** `gugah.wijaya@banksulutgo.co.id`
- **Password:** `password123`
- **Position:** Customer Service Officer
- **Role:** USER
- **Access Level:** Personal tickets only
- **Common Ticket Types:**
  - Customer complaint systems
  - CRM issues
  - Phone system problems
  - Customer service tools

### 🟢 Frigia Pasla
- **Email:** `frigia.pasla@banksulutgo.co.id`
- **Password:** `password123`
- **Position:** Teller
- **Role:** USER
- **Access Level:** Personal tickets only
- **Common Ticket Types:**
  - Teller terminal issues
  - Cash counting machines
  - Receipt printers
  - Core banking access

### 🟢 Daniel Niode
- **Email:** `danielniode@banksulutgo.co.id`
- **Password:** `password123`
- **Position:** Account Officer
- **Role:** USER
- **Access Level:** Personal tickets only
- **Common Ticket Types:**
  - Account management systems
  - Customer database access
  - Mobile banking tools
  - Report generation issues

### 🟢 Yosua Van Beuren
- **Email:** `yosua.vanbeuren@banksulutgo.co.id`
- **Password:** `password123`
- **Position:** Customer Relationship Officer
- **Role:** USER
- **Access Level:** Personal tickets only
- **Common Ticket Types:**
  - CRM system access
  - Email communication tools
  - Customer portfolio systems
  - Marketing automation tools

### 🟢 Gilby Koloay
- **Email:** `gilby.koloay@banksulutgo.co.id`
- **Password:** `password123`
- **Position:** Administrative Staff
- **Role:** USER
- **Access Level:** Personal tickets only
- **Common Ticket Types:**
  - Document management systems
  - File server access
  - Office equipment issues
  - Administrative software

---

## 🎫 Sample Tickets Created

The following sample tickets have been created to demonstrate realistic business scenarios:

### 1. **ATM Card Issue - Customer Complaint**
- **Creator:** Gugah Wijaya (Customer Service)
- **Priority:** HIGH
- **Category:** INCIDENT
- **Description:** Customer reports ATM card malfunction affecting access to funds

### 2. **Printer Not Working - Teller Station**
- **Creator:** Frigia Pasla (Teller)
- **Priority:** MEDIUM  
- **Category:** SERVICE REQUEST
- **Description:** Receipt printer failure affecting customer service

### 3. **Core Banking System Slow Response**
- **Creator:** Daniel Niode (Account Officer)
- **Priority:** HIGH
- **Category:** INCIDENT
- **Description:** System performance issues during peak hours

### 4. **Email Access Request - New Employee**
- **Creator:** Yosua Van Beuren (Customer Relationship)
- **Priority:** MEDIUM
- **Category:** SERVICE REQUEST
- **Description:** New employee onboarding requirements

### 5. **File Server Access Issue**
- **Creator:** Gilby Koloay (Administrative)
- **Priority:** MEDIUM
- **Category:** SERVICE REQUEST
- **Description:** Shared document access problems

---

## 🏢 Branch Isolation Policy

**STRICT BRANCH SEPARATION:** The ServiceDesk system enforces complete branch isolation to ensure data security and operational boundaries.

### How Branch Isolation Works:

1. **User Assignment**: Every user (managers and regular users) is assigned to exactly one branch
2. **Ticket Creation**: When users create tickets, they are automatically assigned to the user's branch
3. **Manager Visibility**: Managers can ONLY see tickets created by users from their own branch
4. **Approval Scope**: Managers can ONLY approve/reject tickets from users in their branch
5. **Cross-Branch Protection**: No manager can access tickets from other branches, regardless of role level

### Example Scenarios:

**✅ ALLOWED:**
- Manager from KC001 (Manado) can see tickets created by users from KC001 (Manado)
- Manager from KCP002 (Tomohon) can approve tickets from KCP002 users
- Users from KCP003 (Bitung) can only see their own tickets

**❌ BLOCKED:**
- Manager from KC001 (Manado) cannot see tickets from KCP002 (Tomohon) users
- Manager from KCP003 (Bitung) cannot approve tickets from KC001 (Manado) users
- Cross-branch ticket visibility is completely prevented

### Security Benefits:
- **Data Privacy**: Branch-sensitive information stays within branch boundaries
- **Operational Security**: Prevents unauthorized cross-branch access
- **Compliance**: Meets banking industry data segregation requirements
- **Clear Accountability**: Each branch manages only their own operations

---

## 🔐 Access Levels & Permissions

### Manager Capabilities:
- ✅ View ONLY tickets created by users from their own branch
- ✅ Approve or reject ticket requests from users in their branch only
- ✅ Assign tickets to technicians (from their branch users only)
- ✅ Escalate tickets to higher priority (branch-scoped)
- ✅ Add comments and updates to branch user tickets only
- ✅ Generate branch-level reports (isolated by branch)
- ❌ Cannot see tickets from users in other branches
- ❌ Cannot approve tickets from other branch managers or users

### User Capabilities:
- ✅ Create new service requests and incident tickets
- ✅ View only their own submitted tickets
- ✅ Track ticket status and resolution progress
- ✅ Add comments to their own tickets
- ✅ Upload attachments and documentation
- ❌ Cannot see other users' tickets
- ❌ Tickets require manager approval before processing

---

## 🚀 Quick Login Instructions

1. **Go to:** `http://localhost:3000/auth/signin`
2. **Select user:** Click the appropriate autofill button or enter credentials manually
3. **Use any email** from the lists above
4. **Password:** `password123` (same for all users)

### Manager Login Examples:
```
excelsis.maramis@banksulutgo.co.id / password123
shirke.heslin@banksulutgo.co.id / password123
cecep.juarsa@banksulutgo.co.id / password123
erwin.lapian@banksulutgo.co.id / password123
```

### User Login Examples:
```
gugah.wijaya@banksulutgo.co.id / password123
frigia.pasla@banksulutgo.co.id / password123  
danielniode@banksulutgo.co.id / password123
yosua.vanbeuren@banksulutgo.co.id / password123
gilby.koloay@banksulutgo.co.id / password123
```

---

## 📊 Testing Scenarios

### Branch Management Testing:
1. Login as a **Manager** (e.g., Excelsis Maramis)
2. View branch tickets and pending approvals
3. Approve/reject user requests
4. Assign tickets to IT technicians

### User Workflow Testing:
1. Login as a **User** (e.g., Gugah Wijaya)
2. Create a new service request
3. Check ticket status (should show "Pending Approval")
4. Switch to manager account to approve
5. Switch back to see approved status

### Cross-Branch Testing:
- Managers from different branches should only see their own branch tickets
- Users should only see their personal ticket submissions
- Test role-based access controls

---

## 📝 Notes

- All users are randomly distributed across Bank SulutGo branches
- Branch assignments are determined during seed script execution
- Realistic job titles and responsibilities based on banking industry standards
- Sample tickets represent common IT service requests in banking environment
- Password policy can be updated for production use (currently using simple passwords for testing)

---

*Last updated: Bank SulutGo ServiceDesk v1.0*  
*For technical support, contact IT Helpdesk team*