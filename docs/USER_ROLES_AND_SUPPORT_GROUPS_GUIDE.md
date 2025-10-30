# Bank SulutGo ServiceDesk: User Roles and Support Groups Guide

**Version:** 1.0
**Last Updated:** October 30, 2025
**System:** ITIL v4-compliant Service Management Platform

---

## Table of Contents

1. [Introduction](#introduction)
2. [User Roles Overview](#user-roles-overview)
3. [Detailed Role Descriptions](#detailed-role-descriptions)
   - [USER](#1-user)
   - [AGENT (Deprecated)](#2-agent-deprecated)
   - [TECHNICIAN](#3-technician)
   - [MANAGER](#4-manager)
   - [MANAGER_IT](#5-manager_it)
   - [SECURITY_ANALYST](#6-security_analyst)
   - [ADMIN](#7-admin)
4. [Support Groups](#support-groups)
5. [Role-Based Access Matrix](#role-based-access-matrix)
6. [Special Access Cases](#special-access-cases)
7. [Workflow Examples](#workflow-examples)
8. [Best Practices](#best-practices)

---

## Introduction

The Bank SulutGo ServiceDesk system implements a sophisticated role-based access control (RBAC) framework designed to support IT service management across 250+ branches. This guide provides comprehensive information about user roles, support groups, and their respective permissions and capabilities within the system.

### Key Concepts

- **User Roles**: Define what actions a user can perform and what areas of the system they can access
- **Support Groups**: Organizational units that handle specific types of services and tickets
- **Branch Assignment**: Users belong to specific branches, affecting their data visibility
- **Permission Levels**: Hierarchical access control ensuring data security and operational efficiency

---

## User Roles Overview

The system defines the following user roles, listed from lowest to highest privilege level:

| Role | Code | Primary Function | Typical Users |
|------|------|------------------|---------------|
| **USER** | `USER` | Create and track personal tickets | Regular employees, branch staff |
| **AGENT** | `AGENT` | Limited service desk operations (deprecated) | Former call center agents |
| **TECHNICIAN** | `TECHNICIAN` | Resolve tickets and perform technical work | IT support staff, technical specialists |
| **MANAGER** | `MANAGER` | Oversee branch operations and approvals | Branch managers, department heads |
| **MANAGER_IT** | `MANAGER_IT` | IT management with shift scheduling | IT managers, shift coordinators |
| **SECURITY_ANALYST** | `SECURITY_ANALYST` | Security incident management | SOC analysts, security team |
| **ADMIN** | `ADMIN` | System configuration and administration | System administrators |

**Note**: The `SUPER_ADMIN` role mentioned in some code is not actively used in the Prisma schema. `ADMIN` is the highest privilege level in production.

---

## Detailed Role Descriptions

### 1. USER

**Description**: Regular end-users who require IT services and support.

#### Primary Responsibilities
- Submit service requests and incident reports
- Track their own tickets
- Provide additional information when requested
- Confirm ticket resolution

#### Access Permissions

**Dashboard Access**
- ✅ View personal ticket statistics
- ✅ View branch-level summary data
- ❌ Cannot view organization-wide statistics

**Ticket Management**
- ✅ Create new tickets for themselves
- ✅ View their own created tickets
- ✅ Comment on their own tickets
- ✅ Upload attachments to their tickets
- ✅ View ticket status and updates
- ❌ Cannot view other users' tickets
- ❌ Cannot assign or claim tickets
- ❌ Cannot change ticket status
- ❌ Cannot see confidential tickets (unless explicitly granted)

**Knowledge Base**
- ✅ Search and view published knowledge articles
- ✅ Provide feedback on articles
- ❌ Cannot create or edit articles

**Reports**
- ❌ No access to reporting features

**Admin Functions**
- ❌ No admin panel access
- ❌ Cannot manage users or configurations

#### Special Cases

**Call Center Users**: Users assigned to the `CALL_CENTER` support group have enhanced visibility:
- ✅ Can view ALL tickets in the Transaction Claims category
- ✅ Access to ATM Claims interface
- ✅ Can see transaction-related tickets across all branches

#### Typical Use Cases
1. Submit ticket for computer not working
2. Request software installation
3. Report network connectivity issues
4. Request access to business applications
5. Track resolution progress

#### Limitations
- Can only create tickets for themselves (except Call Center users)
- Cannot see organizational performance data
- No ability to work on or resolve tickets
- Limited to their branch's data visibility

---

### 2. AGENT (Deprecated)

**Description**: Legacy role for call center agents. Most AGENT users have been migrated to USER role with CALL_CENTER support group assignment.

#### Current Status
- **Deprecated**: This role is being phased out
- **Migration Path**: AGENT → USER with CALL_CENTER support group
- **Current Users**: Limited to legacy accounts not yet migrated

#### Access Permissions
- Similar to USER role but with limited capabilities
- Originally intended for front-line service desk operations
- Cannot access full Call Center features (those require CALL_CENTER support group)

#### Recommendation
If you still have AGENT role users, migrate them to:
- **USER role** with **CALL_CENTER support group** for call center operations
- **TECHNICIAN role** if they perform technical work

---

### 3. TECHNICIAN

**Description**: Technical staff responsible for resolving tickets and performing hands-on IT support work.

#### Primary Responsibilities
- Claim and work on tickets from their support group
- Resolve technical issues
- Update ticket status and document work performed
- Create knowledge base articles from solved issues
- Manage daily tasks and shift schedules

#### Access Permissions

**Dashboard Access**
- ✅ View tickets assigned to them or their support group
- ✅ View support group performance metrics
- ⚠️ Limited to their support group's data (with exceptions)

**Ticket Management**
- ✅ View tickets from their support group
- ✅ View tickets assigned to them
- ✅ View tickets they created
- ✅ Claim unassigned tickets from their support group
- ✅ Update ticket status (Open → In Progress → Resolved)
- ✅ Add work logs and comments
- ✅ Upload attachments and documentation
- ✅ Create tickets on behalf of users
- ✅ Link knowledge articles to tickets
- ⚠️ Can only claim APPROVED tickets (for services requiring approval)
- ❌ Cannot see tickets from other support groups (with special exceptions)
- ❌ Cannot override approvals

**Workbench**
- ✅ Access to Technician Workbench
- ✅ View "My Tickets" (assigned to them)
- ✅ View "Available Tickets" (unassigned in their group)
- ✅ Ticket claiming functionality
- ✅ Quick status updates

**Daily Tasks**
- ✅ Create and manage personal daily task lists
- ✅ Link tasks to tickets
- ✅ Track task completion
- ✅ View task history

**Shifts**
- ✅ View their assigned shifts
- ✅ Request shift swaps
- ✅ Submit leave requests
- ❌ Cannot create or modify shift schedules

**Knowledge Base**
- ✅ Create new knowledge articles
- ✅ Edit their own articles
- ✅ Submit articles for review
- ✅ Comment on articles
- ⚠️ Articles require approval before publishing

**Reports**
- ✅ View their own performance reports
- ✅ Access worklog reports
- ⚠️ Limited to their own data or support group data

**Legacy Tickets**
- ✅ Access to imported legacy tickets from ManageEngine
- ✅ View and comment on historical tickets

**Admin Functions**
- ❌ No admin panel access (except special cases)
- ⚠️ TECH_SUPPORT group: Can manage PC Assets and Office Licenses

#### Special Cases

**IT Helpdesk Technicians** (`IT_HELPDESK` support group):
- ✅ Full visibility on reports (no support group restrictions)
- ✅ Can see tickets for any IT service
- This is the largest support group handling ~239 of 240 services

**Call Center Technicians** (`CALL_CENTER` support group):
- ✅ Can see ALL Transaction Claims tickets (all branches)
- ✅ Access to ATM Claims interface
- ✅ No workbench access (not needed for their workflow)
- Focus on transaction disputes and claim intake

**Transaction Claims Support** (`TRANSACTION_CLAIMS_SUPPORT` group):
- ✅ Can see ALL Transaction Claims tickets
- ✅ Can see ALL ATM Claims tickets
- ⚠️ Read-only access with ability to comment
- ❌ Cannot claim or resolve these tickets (advisory role)

**TECH_SUPPORT Group**:
- ✅ Access to PC Assets management
- ✅ Access to Office License management
- Specialized hardware and software asset tracking

**Security-Related Technicians**:
- Can be assigned to handle security incidents
- Work alongside Security Analysts

#### Typical Use Cases

1. **Morning Routine**:
   - Check workbench for new tickets
   - Review assigned tickets
   - Claim high-priority unassigned tickets
   - Update daily task list

2. **Ticket Resolution**:
   - Claim ticket from available pool
   - Change status to "In Progress"
   - Perform technical work
   - Document resolution steps
   - Mark as "Resolved"
   - Create knowledge article if applicable

3. **Collaboration**:
   - Comment on complex tickets
   - Escalate to manager if needed
   - Consult knowledge base
   - Request information from ticket creator

4. **End of Day**:
   - Update all work logs
   - Complete daily tasks
   - Hand off unfinished work

#### Limitations

- Cannot see tickets outside their support group (except special cases)
- Cannot modify system configurations
- Cannot approve/reject tickets requiring managerial approval
- Cannot access other branches' data (branch-specific restrictions don't typically apply to technicians)
- Cannot force-close tickets without resolution

---

### 4. MANAGER

**Description**: Branch managers and department heads responsible for operational oversight, approvals, and team management.

#### Primary Responsibilities
- Approve or reject service requests
- Oversee branch ticket operations
- Manage branch users
- Monitor branch ATM status
- Review branch performance reports
- Assign tickets to technicians

#### Access Permissions

**Dashboard Access**
- ✅ View branch-level statistics
- ✅ View all tickets from their branch
- ✅ Monitor SLA compliance for their branch
- ❌ Cannot view other branches' detailed data

**Ticket Management**
- ✅ View ALL tickets from their branch
- ✅ Create tickets on behalf of branch users
- ✅ Assign tickets to technicians
- ✅ Reassign tickets between technicians
- ✅ View ticket history and audit logs
- ✅ Add comments to any branch ticket
- ❌ Cannot directly resolve tickets (technician function)
- ❌ Cannot see tickets from other branches

**Approvals**
- ✅ Approve/reject service requests requiring approval
- ✅ View pending approvals queue
- ✅ Add approval notes and justifications
- ✅ Bulk approve/reject multiple requests
- ⚠️ Can only approve tickets from their branch

**Branch User Management**
- ✅ Create new users in their branch
- ✅ Edit user profiles in their branch
- ✅ Activate/deactivate users
- ✅ Reset user passwords
- ✅ Assign roles: USER, TECHNICIAN, AGENT
- ❌ Cannot create or modify MANAGER roles
- ❌ Cannot create or modify ADMIN roles
- ❌ Cannot create SECURITY_ANALYST roles
- ❌ Cannot modify users from other branches

**ATM Management**
- ✅ View branch ATMs
- ✅ Update ATM information
- ✅ View ATM status and monitoring data
- ✅ Manage ATM claims from their branch
- ⚠️ Cannot see ATMs from other branches

**ATM Claims**
- ✅ Create ATM claims for branch ATMs
- ✅ Verify and process claims
- ✅ Upload supporting documents
- ✅ View claim status and history
- ✅ Add journal entries

**Knowledge Base**
- ✅ Create and edit knowledge articles
- ✅ Publish articles without additional approval
- ✅ Manage article categories
- ✅ Add collaborators to articles

**Reports**
- ✅ Branch performance reports
- ✅ Branch ticket analytics
- ✅ Team performance reports
- ✅ SLA compliance reports (branch-specific)
- ✅ Customer experience reports (branch)
- ✅ Approval workflow reports
- ⚠️ Limited to their branch's data

**Admin Functions**
- ❌ No system configuration access
- ❌ Cannot manage service catalog
- ❌ Cannot configure SLA rules
- ❌ Cannot manage support groups

#### Typical Use Cases

1. **Morning Routine**:
   - Review pending approvals
   - Check branch ticket status
   - Review overnight incidents
   - Check team workload

2. **Approval Workflow**:
   - Review service request details
   - Verify business justification
   - Check budget implications
   - Approve or reject with notes

3. **Team Management**:
   - Assign urgent tickets to available technicians
   - Balance workload across team
   - Add new branch employees to system
   - Deactivate departed employees

4. **Reporting**:
   - Generate monthly branch performance report
   - Review SLA compliance
   - Identify recurring issues
   - Report to senior management

5. **ATM Operations**:
   - Process ATM claims from branch customers
   - Verify ATM downtime incidents
   - Coordinate with ATM technicians

#### Limitations

- Cannot access data from other branches
- Cannot modify system-wide configurations
- Cannot create other managers or admins
- Cannot override technical closure requirements
- No access to organization-wide reports
- Cannot manage support groups

---

### 5. MANAGER_IT

**Description**: IT Manager role with all MANAGER capabilities plus shift management and IT-specific administrative functions.

#### Primary Responsibilities
- All MANAGER responsibilities
- Create and manage shift schedules for technicians
- Manage staff shift profiles and assignments
- Review and approve leave requests
- Handle shift swap requests
- Oversee IT operations across shifts

#### Access Permissions

**All MANAGER Permissions**, PLUS:

**Shift Management**
- ✅ Create shift schedules (daily, weekly, monthly)
- ✅ Assign technicians to shifts
- ✅ Modify shift timings
- ✅ Define shift patterns
- ✅ View shift coverage reports

**Staff Shift Profiles**
- ✅ Create staff shift profiles
- ✅ Define shift preferences
- ✅ Set shift eligibility
- ✅ Manage shift constraints

**Leave Management**
- ✅ View all leave requests
- ✅ Approve/reject leave requests
- ✅ View leave calendar
- ✅ Check leave balances
- ✅ Impact analysis on shift coverage

**Shift Swap Management**
- ✅ View shift swap requests
- ✅ Approve/reject swap requests
- ✅ Verify eligibility for swaps
- ✅ Maintain shift compliance

**Enhanced Visibility**
- ✅ 24/7 operations oversight
- ✅ Shift-based performance metrics
- ✅ Coverage gap identification

#### Typical Use Cases

1. **Schedule Planning**:
   - Create monthly shift schedule
   - Ensure 24/7 coverage
   - Balance workload across shifts
   - Account for holidays and leave

2. **Leave Approval**:
   - Review leave request
   - Check shift coverage impact
   - Approve if coverage adequate
   - Reject if insufficient coverage with explanation

3. **Shift Optimization**:
   - Analyze ticket volume by time of day
   - Adjust shift assignments accordingly
   - Ensure proper skill coverage per shift
   - Handle emergency call-ins

4. **Swap Management**:
   - Technician A requests to swap with Technician B
   - Verify both have required skills
   - Check shift compliance rules
   - Approve swap and update schedule

#### When to Assign This Role

Assign MANAGER_IT role to:
- IT Department Managers who handle shift scheduling
- Operations Managers overseeing 24/7 IT support
- Service Desk Managers with shift responsibilities
- Anyone needing both managerial approval powers and shift management

Do NOT assign to:
- Regular branch managers (use MANAGER)
- Business unit managers (use MANAGER)
- Managers who don't handle IT shift scheduling

---

### 6. SECURITY_ANALYST

**Description**: Security specialists focused on security incident management, threat analysis, and security monitoring.

#### Primary Responsibilities
- Monitor and respond to security incidents
- Analyze security-related tickets
- Coordinate security incident response
- Create security knowledge articles
- Work with SOC (Security Operations Center) data

#### Access Permissions

**Dashboard Access**
- ✅ View security-specific dashboard
- ✅ Monitor security incidents
- ✅ Track security ticket metrics
- ⚠️ Hybrid visibility (see below)

**Ticket Management**
- ✅ View ALL tickets created by other Security Analysts
- ✅ View tickets assigned to them
- ✅ View their own created tickets
- ✅ View tickets from their support group (if assigned)
- ✅ Claim security-related tickets
- ✅ Create security incident tickets
- ✅ Mark tickets as confidential
- ✅ Add security classification levels
- ✅ Record security findings
- ⚠️ Function similar to TECHNICIAN with security focus

**Confidential Tickets**
- ✅ Always see confidential tickets
- ✅ Create confidential security incidents
- ✅ Add security classifications (HIGH, MEDIUM, LOW)
- ✅ Access security findings data

**Security Operations**
- ✅ Access SOC Parser interface
- ✅ Parse security logs
- ✅ Create tickets from SOC findings
- ✅ Link security events to tickets
- ✅ View security trends

**Knowledge Base**
- ✅ Create security-focused articles
- ✅ Document security procedures
- ✅ Share threat intelligence (within policy)

**Reports**
- ✅ Security incident reports
- ✅ Security compliance reports
- ✅ Threat analysis reports
- ⚠️ Similar access level to TECHNICIAN for regular reports

**Admin Functions**
- ❌ No system administration access
- ❌ Cannot manage users (except security context)

#### Special Characteristics

**Hybrid Role Behavior**:
Security Analysts function like technicians but with special security-focused capabilities:
- Support group-based visibility (like technicians)
- Enhanced access to security-related data
- Cross-group visibility for security incidents
- Always bypass confidential ticket restrictions

**Collaboration**:
- Work closely with IT_HELPDESK and SECURITY_OPS support groups
- Can see all Security Analyst tickets for collaboration
- Share threat intelligence via internal channels

#### Typical Use Cases

1. **Security Incident Response**:
   - Receive SOC alert
   - Parse security log data
   - Create security incident ticket
   - Mark as confidential
   - Add security classification
   - Coordinate response with IT team

2. **Threat Analysis**:
   - Review security-related tickets
   - Identify patterns and trends
   - Document in knowledge base
   - Update security procedures

3. **Collaboration**:
   - View other analyst's security tickets
   - Share findings via comments
   - Escalate to ADMIN if system-wide issue
   - Create security awareness articles

#### Limitations

- Cannot access full admin panel
- Cannot modify system configurations
- Cannot see all tickets (only security-relevant or group-assigned)
- Cannot approve service requests (not a managerial role)
- Cannot manage users or branches

---

### 7. ADMIN

**Description**: System administrators with full access to configure and manage the ServiceDesk platform.

#### Primary Responsibilities
- Configure system settings
- Manage service catalog
- Configure SLA rules
- Manage all users and roles
- Manage branches and organizational structure
- Manage support groups
- Configure workflows and approval rules
- System monitoring and maintenance
- Import/export data
- Generate organization-wide reports

#### Access Permissions

**Dashboard Access**
- ✅ View organization-wide statistics
- ✅ Access all branches' data
- ✅ System health monitoring
- ✅ No restrictions on data visibility

**Ticket Management**
- ✅ View ALL tickets (all branches, all support groups)
- ✅ Create tickets for any user
- ✅ Modify any ticket
- ✅ Assign/reassign tickets
- ✅ Override ticket status
- ✅ Access all confidential tickets
- ✅ View complete audit trail
- ✅ Bulk operations on tickets

**User Management**
- ✅ Create users with any role
- ✅ Modify any user (including other admins)
- ✅ Reset passwords
- ✅ Unlock locked accounts
- ✅ View user activity logs
- ✅ Assign users to branches
- ✅ Assign users to support groups
- ✅ Deactivate/reactivate accounts
- ⚠️ Cannot create or modify SUPER_ADMIN (if exists)

**Branch Management**
- ✅ Create new branches
- ✅ Edit branch information
- ✅ Activate/deactivate branches
- ✅ Manage branch ATMs
- ✅ Import branch data
- ✅ Update branch coordinates for mapping

**Support Group Management**
- ✅ Create support groups
- ✅ Edit support group details
- ✅ Assign services to support groups
- ✅ Manage support group members
- ✅ Configure escalation paths
- ✅ Deactivate support groups

**Service Catalog Management**
- ✅ Create/edit/delete services
- ✅ Create service categories and subcategories
- ✅ Configure service items
- ✅ Define custom fields per service
- ✅ Set SLA rules per service
- ✅ Configure approval requirements
- ✅ Link services to support groups
- ✅ Manage field templates

**Field Templates**
- ✅ Create custom field templates
- ✅ Define field types (text, date, select, etc.)
- ✅ Configure field validation rules
- ✅ Link templates to services
- ✅ Manage field options

**SLA Management**
- ✅ Define SLA rules
- ✅ Configure response times
- ✅ Configure resolution times
- ✅ Set priority-based SLAs
- ✅ Configure escalation rules
- ✅ Monitor SLA compliance

**Approval Workflows**
- ✅ Configure services requiring approval
- ✅ Define approval levels
- ✅ Set approval rules
- ✅ Configure approval notifications
- ⚠️ Cannot approve on behalf of managers (business process)

**Knowledge Base**
- ✅ Full access to all articles
- ✅ Approve/reject articles
- ✅ Manage categories
- ✅ Manage article lifecycle
- ✅ Bulk operations

**ATM Management**
- ✅ Manage all ATMs across all branches
- ✅ Configure ATM monitoring
- ✅ View ATM status and incidents
- ✅ Import ATM data
- ✅ Create/edit ATM records

**Network Monitoring**
- ✅ Configure network monitoring
- ✅ Manage monitored entities
- ✅ Configure ping schedules
- ✅ Set alert thresholds
- ✅ Create tickets from monitoring alerts

**PC Assets & Licenses** (ADMIN + TECH_SUPPORT only)
- ✅ Manage PC asset inventory
- ✅ Track Office licenses
- ✅ Assign licenses to users
- ✅ Monitor license compliance

**Reports**
- ✅ All admin reports
- ✅ All business reports
- ✅ All infrastructure reports
- ✅ All compliance reports
- ✅ Custom report builder
- ✅ Export capabilities (PDF, Excel)
- ✅ No restrictions on data access

**Import/Export**
- ✅ Bulk import users
- ✅ Bulk import services
- ✅ Import legacy tickets
- ✅ Export all data
- ✅ Rollback imports
- ✅ View import logs

**System Configuration**
- ✅ Email notification settings
- ✅ SMTP configuration
- ✅ Security settings
- ✅ File upload limits
- ✅ System maintenance mode
- ✅ API key management
- ✅ Audit log configuration

**Security & Compliance**
- ✅ View audit logs
- ✅ Security audit reports
- ✅ User activity monitoring
- ✅ Device analytics
- ✅ Login attempt tracking
- ✅ Account lockout management

**API Management**
- ✅ Generate API keys
- ✅ Configure API permissions
- ✅ Set rate limits
- ✅ Revoke API keys
- ✅ Monitor API usage

#### Typical Use Cases

1. **Initial System Setup**:
   - Import branches from bank website
   - Import ATM data from CSV
   - Create support groups
   - Configure service catalog
   - Set up SLA rules
   - Create initial users

2. **Service Catalog Management**:
   - Add new IT service
   - Assign to appropriate support group
   - Configure custom fields
   - Set SLA parameters
   - Enable/disable approval requirement
   - Test service availability

3. **User Onboarding**:
   - Create new branch manager account
   - Assign to correct branch
   - Set role to MANAGER
   - Send welcome email with credentials
   - Verify access

4. **Troubleshooting**:
   - User reports cannot login
   - Check account status
   - Unlock if locked due to failed attempts
   - Reset password if needed
   - Check role assignments

5. **Reporting**:
   - Generate monthly organization-wide report
   - Analyze SLA compliance
   - Review support group performance
   - Identify bottlenecks
   - Present to executive management

6. **Data Migration**:
   - Import legacy tickets from ManageEngine
   - Verify import success
   - Rollback if issues detected
   - Audit import logs

7. **System Maintenance**:
   - Review audit logs
   - Check for security issues
   - Update service catalog
   - Optimize database
   - Configure new features

#### Limitations

Even ADMINs have some operational limitations:
- Cannot approve service requests on behalf of managers (business process)
- Should follow change management for production changes
- Cannot recover deleted data without database backup
- Should not modify active production tickets unless necessary

#### Best Practices for Admins

1. **Use Admin Powers Wisely**:
   - Don't modify tickets unless necessary
   - Let normal workflows proceed
   - Document major configuration changes

2. **Security First**:
   - Regularly review audit logs
   - Monitor failed login attempts
   - Keep API keys secure
   - Use strong passwords

3. **Change Management**:
   - Test configuration changes in dev environment
   - Document all changes
   - Communicate changes to users
   - Have rollback plans

4. **Data Integrity**:
   - Validate imports before rollback window closes
   - Maintain regular backups
   - Test restore procedures
   - Document data relationships

5. **User Support**:
   - Respond promptly to access issues
   - Provide training for new features
   - Create knowledge articles for common issues
   - Monitor system usage patterns

---

## Support Groups

Support groups are organizational units that handle specific types of services. They enable efficient ticket routing and workload management.

### What are Support Groups?

Support groups are teams of technicians organized by specialty or function. Each service in the catalog is linked to a support group, and tickets are automatically routed to the appropriate group based on the selected service.

### Core Support Groups

Based on the codebase analysis, here are the primary support groups:

| Support Group Code | Name | Description | Services Handled |
|-------------------|------|-------------|------------------|
| `IT_HELPDESK` | IT Helpdesk | General IT support and helpdesk services | ~239 of 240 total services - all general IT support, hardware, network, business applications (except KASDA) |
| `CALL_CENTER` | Call Center | Call center operations and transaction claims intake | Transaction claims, customer inquiries, ATM claim intake |
| `TRANSACTION_CLAIMS_SUPPORT` | Transaction Claims Support | Transaction claims processing and dispute resolution | All transaction-related claims and disputes, ATM claims (read-only/advisory) |
| `ATM_SUPPORT` | ATM Technical Support | ATM hardware and software support | ATM hardware issues, ATM software troubleshooting |
| `CARD_CENTER` | Card Center Support | ATM card and PIN management | Card issuance, PIN resets, card disputes |
| `NETWORK_INFRA` | Network Infrastructure | Network and infrastructure support | Network connectivity, VSAT, M2M, Fiber Optic |
| `CORE_BANKING` | Core Banking Support | Core banking system support | Core banking application issues |
| `SECURITY_OPS` | Security Operations | Cybersecurity and information security | Security incidents, SOC alerts, security analysis |
| `TECH_SUPPORT` | Technical Support | Specialized technical support | PC assets management, Office licenses |
| `MANAGER_IT` | IT Management | IT management and shift coordination | Escalations, shift management support |

### How Support Groups Work

#### 1. Service-to-Support-Group Mapping

```
Service → Support Group → Technicians
```

When a user creates a ticket:
1. User selects a service (e.g., "Network Connectivity Issue")
2. System identifies the service's support group (e.g., NETWORK_INFRA)
3. Ticket becomes visible to all technicians in that support group
4. Technicians can claim the ticket from their workbench

#### 2. Ticket Visibility Rules

**For Technicians**:
- See ALL tickets from their support group (unless unassigned and awaiting approval)
- See tickets assigned directly to them
- See tickets they created

**For Call Center Special Case**:
- CALL_CENTER technicians see ALL Transaction Claims tickets (all branches)
- This enables centralized claim processing

**For Transaction Claims Support Special Case**:
- See ALL Transaction Claims tickets (read-only with commenting)
- See ALL ATM Claims tickets (advisory role)
- Cannot claim or resolve (provide guidance only)

**For IT Helpdesk Special Case**:
- Handle the vast majority of services
- Full reporting visibility (no support group filter)
- Most general-purpose support group

#### 3. Assignment Logic

**Auto-Assignment**:
- Ticket is created → Automatically linked to service's support group
- Visible to all group members
- Appears in "Available Tickets" for claiming

**Manual Assignment**:
- Managers can assign tickets directly to specific technicians
- Admins can reassign across groups if needed
- Technicians claim tickets from available pool

**Escalation**:
- Services can have escalation groups configured
- Tickets can be escalated to management
- Urgent tickets may trigger special assignment rules

### Support Group Membership

#### Assigning Users to Support Groups

**Who can be assigned**:
- TECHNICIAN role (primary use case)
- SECURITY_ANALYST role (for security-related groups)
- USER role (special cases like CALL_CENTER)
- MANAGER_IT role (management oversight)

**Who manages assignments**:
- ADMIN: Can assign anyone to any group
- MANAGER: Cannot manage support groups
- Users cannot choose their own group

#### Single vs. Multiple Group Membership

- Each user can belong to **ONE** support group only
- The user's `supportGroupId` field determines their group
- Technicians without a group assignment can see ALL unassigned tickets (fallback)

### Support Group Best Practices

#### 1. Proper Service Mapping

Ensure services are mapped to the correct support group:
- Network issues → NETWORK_INFRA
- ATM hardware → ATM_SUPPORT
- Application issues → IT_HELPDESK (or specific app group)
- Security incidents → SECURITY_OPS

#### 2. Balanced Workload

- Monitor ticket distribution across groups
- Avoid overloading specific groups
- Cross-train technicians when possible
- IT_HELPDESK handles the most services (be aware of capacity)

#### 3. Clear Responsibilities

Document what each support group handles:
- Create support group charters
- Define service boundaries
- Document escalation paths
- Clarify advisory vs. action roles (like Transaction Claims Support)

#### 4. Skill-Based Assignment

- Assign technicians to groups matching their skills
- Technical specialists → specialized groups
- Generalists → IT_HELPDESK
- Security experts → SECURITY_OPS

#### 5. Call Center Special Configuration

The CALL_CENTER group has unique requirements:
- Members need USER or TECHNICIAN role
- Enable cross-branch visibility for Transaction Claims
- No workbench needed (different workflow)
- Focus on claim intake, not technical resolution

---

## Role-Based Access Matrix

### Feature Access by Role

| Feature / Function | USER | AGENT | TECHNICIAN | MANAGER | MANAGER_IT | SECURITY_ANALYST | ADMIN |
|-------------------|------|-------|------------|---------|------------|------------------|-------|
| **Dashboard** |
| View personal stats | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View branch stats | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| View org-wide stats | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Security dashboard | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Tickets** |
| Create own tickets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create for others | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View own tickets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View group tickets | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| View branch tickets | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| View all tickets | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Claim tickets | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Update status | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Resolve tickets | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Assign tickets | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Reassign tickets | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| View confidential | ❌ | ❌ | ❌ | ✅* | ✅* | ✅ | ✅ |
| Create confidential | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Workbench** |
| Access workbench | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| My Tickets view | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Available Tickets | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Approvals** |
| Submit for approval | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve/reject | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| View approval queue | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Daily Tasks** |
| Manage own tasks | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View others' tasks | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Shifts** |
| View own shifts | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Request shift swap | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create schedules | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Approve swaps | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Manage leave | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Knowledge Base** |
| View articles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create articles | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own articles | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit all articles | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Publish articles | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **ATM Claims** |
| Create claims | ✅* | ✅* | ✅ | ✅ | ✅ | ✅ | ✅ |
| Verify claims | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Upload documents | ✅* | ✅* | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all claims | ❌ | ❌ | ✅** | ❌ | ❌ | ❌ | ✅ |
| **Users** |
| View branch users | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Create branch users | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Edit branch users | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| View all users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create ADMIN | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reset passwords | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Branches** |
| View own branch | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage own branch | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Manage all branches | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **ATMs** |
| View branch ATMs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage branch ATMs | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Manage all ATMs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Reports** |
| Personal reports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Team reports | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Branch reports | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Organization reports | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Security reports | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Custom reports | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Admin Panel** |
| Service catalog | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Field templates | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| SLA configuration | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Support groups | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Import/export | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Audit logs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| API keys | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **PC Assets*** |
| View assets | ❌ | ❌ | ✅*** | ❌ | ❌ | ❌ | ✅ |
| Manage assets | ❌ | ❌ | ✅*** | ❌ | ❌ | ❌ | ✅ |
| Office licenses | ❌ | ❌ | ✅*** | ❌ | ❌ | ❌ | ✅ |
| **Monitoring** |
| View branch ATMs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View network status | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Configure monitoring | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Security/SOC** |
| SOC parser | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Security incidents | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Security findings | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

**Legend**:
- ✅ = Full access
- ✅* = Conditional access (see notes)
- ✅** = Special support group access
- ✅*** = TECH_SUPPORT group only
- ❌ = No access
- ⚠️ = Limited access

**Notes**:
- *Confidential tickets for MANAGER: Only if explicitly requesting with proper permissions
- *ATM Claims for USER: Only for their branch
- **All claims for TECHNICIAN: Only if in CALL_CENTER or TRANSACTION_CLAIMS_SUPPORT group
- ***PC Assets: Only technicians in TECH_SUPPORT support group + ADMIN

---

## Special Access Cases

### 1. Call Center Users and Technicians

**Support Group**: `CALL_CENTER`

**Special Access**:
- View ALL Transaction Claims tickets across all branches
- Access ATM Claims interface
- No workbench access (different workflow)
- Cannot claim tickets like regular technicians
- Focus on claim intake, not technical resolution

**Applicable Roles**:
- USER with CALL_CENTER support group
- TECHNICIAN with CALL_CENTER support group

**Use Case**: Centralized call center handling transaction dispute intake from customers across all branches.

### 2. Transaction Claims Support Group

**Support Group**: `TRANSACTION_CLAIMS_SUPPORT`

**Special Access**:
- View ALL Transaction Claims tickets (read-only)
- View ALL ATM Claims tickets (read-only)
- Can add comments and provide guidance
- **Cannot claim tickets** (advisory role only)
- **Cannot resolve tickets**
- Cross-branch visibility

**Applicable Roles**:
- TECHNICIAN with TRANSACTION_CLAIMS_SUPPORT support group

**Use Case**: Specialized team that provides guidance and oversight on transaction claims without directly handling resolution. They advise other technicians on proper claim processing.

### 3. IT Helpdesk Technicians

**Support Group**: `IT_HELPDESK`

**Special Access**:
- Handle ~239 of 240 services (vast majority)
- Full visibility on reports (no support group filter applied)
- Broadest technical support scope
- Standard technician capabilities

**Applicable Roles**:
- TECHNICIAN with IT_HELPDESK support group

**Use Case**: General-purpose IT support team handling most IT services across the organization.

### 4. TECH_SUPPORT Group

**Support Group**: `TECH_SUPPORT`

**Special Access**:
- Access to PC Assets management interface
- Access to Office License management interface
- Can manage hardware asset inventory
- Can assign and track Office licenses

**Applicable Roles**:
- TECHNICIAN with TECH_SUPPORT support group
- ADMIN (always has access)

**Use Case**: Specialized team managing hardware assets and software licensing compliance.

### 5. Branch-Scoped Access

**Affects**:
- MANAGER role
- MANAGER_IT role
- USER role

**Behavior**:
- Can only see data from their assigned branch
- Cannot view tickets from other branches
- Cannot manage users from other branches
- Cannot access other branches' ATMs
- ATM Claims limited to branch ATMs

**Exception**: ADMIN can see all branches

### 6. Confidential Tickets

**Who Can Always See**:
- ADMIN
- SECURITY_ANALYST

**Who Can Request Access**:
- MANAGER (with proper permissions)
- MANAGER_IT (with proper permissions)

**Who Cannot See**:
- USER
- TECHNICIAN (unless specifically granted)

**Use Case**: Sensitive security incidents, personnel issues, confidential business matters

### 7. Legacy Tickets

**Who Can Access**:
- TECHNICIAN
- MANAGER
- ADMIN

**Special Interface**: `/tickets/legacy`

**Purpose**: Access to historical tickets imported from ManageEngine ServiceDesk Plus

**Limitations**:
- Read-only for most users
- Limited editing capabilities
- Used for historical reference

### 8. Technicians Without Support Groups

**Behavior**:
- Can see ALL unassigned tickets (fallback)
- Not restricted by support group
- Can claim any unassigned ticket
- Status filter: Only OPEN and IN_PROGRESS tickets

**Use Case**: Catch-all for tickets that might not be properly assigned to groups, or for generalist technicians

---

## Workflow Examples

### Example 1: Standard Ticket Lifecycle

**Scenario**: Employee's computer won't boot

**Participants**:
- **Requester**: Sarah (USER, Branch 001)
- **Manager**: John (MANAGER, Branch 001)
- **Technician**: Mike (TECHNICIAN, IT_HELPDESK support group)

**Workflow**:

1. **Creation** (Sarah - USER):
   - Logs into ServiceDesk
   - Navigates to Dashboard → New Ticket
   - Selects Service: "Hardware Issue - Desktop"
   - Enters title: "Computer won't boot"
   - Provides description with details
   - Priority: HIGH (automatically suggested)
   - Submits ticket
   - Receives ticket number: SD-2025-00123

2. **Routing** (System):
   - Service "Hardware Issue - Desktop" is linked to IT_HELPDESK support group
   - Ticket automatically visible to all IT_HELPDESK technicians
   - Notification sent to Mike and other IT_HELPDESK members

3. **Claiming** (Mike - TECHNICIAN):
   - Views Technician Workbench
   - Sees ticket in "Available Tickets"
   - Clicks "Claim"
   - Ticket status: OPEN → IN_PROGRESS
   - Ticket now in his "My Tickets" section

4. **Resolution** (Mike - TECHNICIAN):
   - Contacts Sarah to troubleshoot
   - Determines hard drive failure
   - Replaces hard drive
   - Reinstalls OS and software
   - Documents work in ticket comments
   - Adds work log: 3 hours
   - Changes status to RESOLVED
   - Adds resolution notes

5. **Verification** (Sarah - USER):
   - Receives resolution notification
   - Verifies computer works
   - Can add feedback (optional)

6. **Closure** (System):
   - After 24 hours without issues, ticket automatically closed
   - OR Sarah can confirm resolution immediately

**Total Time**: 4 hours (within SLA)

### Example 2: Ticket Requiring Approval

**Scenario**: Employee requests new software installation

**Participants**:
- **Requester**: David (USER, Branch 045)
- **Manager**: Lisa (MANAGER, Branch 045)
- **Technician**: Kevin (TECHNICIAN, IT_HELPDESK support group)

**Workflow**:

1. **Creation** (David - USER):
   - Selects Service: "Software Installation Request"
   - Title: "Need Adobe Photoshop for marketing materials"
   - Justification: "Required for creating promotional materials"
   - Priority: MEDIUM
   - Submits ticket: SD-2025-00124

2. **Routing to Manager** (System):
   - Service requires managerial approval
   - Ticket status: OPEN → PENDING_APPROVAL
   - Notification sent to Lisa (Branch Manager)
   - NOT yet visible to technicians

3. **Manager Review** (Lisa - MANAGER):
   - Reviews ticket in Approvals queue
   - Checks if budget allows
   - Verifies business need
   - **Option A - Approve**:
     - Clicks "Approve"
     - Adds approval note: "Approved - marketing campaign budget"
     - Ticket status: PENDING_APPROVAL → APPROVED
     - Now visible to IT_HELPDESK technicians
   - **Option B - Reject**:
     - Clicks "Reject"
     - Adds reason: "Please use Canva instead - budget constraints"
     - Ticket status: PENDING_APPROVAL → REJECTED
     - Workflow ends

4. **If Approved - Technical Work** (Kevin - TECHNICIAN):
   - Sees approved ticket in Available Tickets
   - Claims ticket
   - Installs Adobe Photoshop
   - Configures licensing
   - Documents installation
   - Marks as RESOLVED

5. **Closure**:
   - David confirms software works
   - Ticket closed

**Total Time**:
- Approval: 2 hours
- Installation: 1 hour
- Total: 3 hours

### Example 3: ATM Claim Processing

**Scenario**: Customer reports ATM dispensed wrong amount

**Participants**:
- **Call Center**: Rita (USER, CALL_CENTER support group)
- **Branch Manager**: Ahmad (MANAGER, Branch 012)
- **Claims Specialist**: Siti (TECHNICIAN, TRANSACTION_CLAIMS_SUPPORT group)

**Workflow**:

1. **Claim Intake** (Rita - Call Center):
   - Receives customer call
   - Navigates to Branch → ATM Claims
   - Clicks "New Claim"
   - Fills out claim form:
     - ATM ID: ATM-012-001
     - Transaction amount: Rp 1,000,000
     - Dispensed amount: Rp 900,000
     - Discrepancy: Rp 100,000
     - Customer details
     - Transaction date/time
     - Reporting channel: CALL_CENTER
   - Submits claim
   - Claim number: ATM-2025-00001
   - Status: DRAFT

2. **Branch Verification** (Ahmad - MANAGER):
   - Reviews claim in ATM Claims interface
   - Checks ATM cassette count
   - Reviews CCTV footage
   - Uploads supporting documents
   - Adds verification notes
   - Clicks "Verify"
   - Status: DRAFT → PENDING_VERIFICATION
   - Creates journal entry documenting verification

3. **Claims Team Review** (Siti - Transaction Claims Support):
   - Can see ALL ATM claims (cross-branch)
   - Reviews claim details
   - Adds advisory comment:
     - "ATM cassette reconciliation shows shortage. Recommend approval."
     - "Ensure CCTV footage is preserved for audit."
   - Does NOT claim or resolve (advisory role only)

4. **Resolution** (Ahmad - MANAGER):
   - Considers Claims Team guidance
   - Approves claim for reimbursement
   - Status: PENDING_VERIFICATION → APPROVED
   - Adds final notes

5. **Customer Communication** (Rita - Call Center):
   - Can see claim status (Transaction Claims visibility)
   - Calls customer to inform of approval
   - Explains reimbursement timeline

**Total Time**:
- Intake: 15 minutes
- Verification: 2 days (waiting for reconciliation)
- Resolution: 30 minutes
- Total: 2 days

**Key Points**:
- Rita (Call Center) can see ALL transaction claims
- Siti (Claims Support) provides guidance but doesn't resolve
- Ahmad (Manager) has final approval authority for his branch
- Cross-functional collaboration enabled by special access rules

### Example 4: Security Incident Response

**Scenario**: SOC detects suspicious login activity

**Participants**:
- **Security Analyst**: James (SECURITY_ANALYST)
- **IT Admin**: Rachel (ADMIN)
- **Affected User**: Tom (USER, Branch 030)

**Workflow**:

1. **Detection** (James - SECURITY_ANALYST):
   - Reviews SOC alerts
   - Navigates to Security → SOC Parser
   - Identifies suspicious login from unusual location
   - Clicks "Create Security Incident"
   - Fills out incident form:
     - Title: "Unusual login activity - Tom's account"
     - Classification: SECURITY_INCIDENT
     - Security Classification: HIGH
     - Mark as Confidential: YES
     - Severity: HIGH
     - Affected user: Tom
     - Security findings: JSON data from SOC
   - Submits ticket: SD-2025-00125
   - Status: OPEN

2. **Initial Response** (James - SECURITY_ANALYST):
   - Claims ticket
   - Status: OPEN → IN_PROGRESS
   - Reviews login logs
   - Identifies compromised credentials
   - Adds comment with findings (visible to other Security Analysts)
   - Escalates to ADMIN for account lockout

3. **Remediation** (Rachel - ADMIN):
   - Can see confidential security ticket
   - Locks Tom's account immediately
   - Forces password reset
   - Reviews Tom's recent activity
   - Checks for data exfiltration
   - Documents actions in ticket

4. **User Communication** (James - SECURITY_ANALYST):
   - Contacts Tom (cannot see confidential ticket)
   - Explains security incident
   - Guides password reset process
   - Provides security awareness training

5. **Resolution** (James - SECURITY_ANALYST):
   - Confirms no data breach
   - Documents incident response steps
   - Creates knowledge article (internal only)
   - Marks ticket as RESOLVED
   - Adds post-incident report

6. **Closure** (Rachel - ADMIN):
   - Reviews incident response
   - Confirms all steps completed
   - Closes ticket
   - Files incident report for audit

**Total Time**:
- Detection to response: 15 minutes
- Remediation: 2 hours
- Total: 2 hours 15 minutes

**Key Points**:
- Confidential ticket invisible to regular users
- Security Analysts collaborate (can see each other's tickets)
- ADMIN has full access for remediation
- Affected user never sees the confidential details
- Security classification tracked

### Example 5: Shift Management

**Scenario**: IT Manager creates monthly shift schedule

**Participants**:
- **IT Manager**: Robert (MANAGER_IT)
- **Technicians**: 12 technicians across 3 shifts

**Workflow**:

1. **Schedule Planning** (Robert - MANAGER_IT):
   - Navigates to Manager → Shift Schedules
   - Clicks "Create Schedule"
   - Selects month: November 2025
   - Defines shift patterns:
     - Morning: 07:00 - 15:00
     - Afternoon: 15:00 - 23:00
     - Night: 23:00 - 07:00
   - Assigns technicians to shifts
   - Ensures 24/7 coverage
   - Considers skill distribution per shift
   - Saves schedule

2. **Leave Request** (Mike - TECHNICIAN):
   - Navigates to Technician → My Shifts
   - Clicks "Request Leave"
   - Selects dates: Nov 10-12
   - Reason: Family emergency
   - Submits request

3. **Leave Approval** (Robert - MANAGER_IT):
   - Receives leave request notification
   - Reviews shift coverage impact
   - Checks if other technicians can cover
   - **Option A - Approve**:
     - Clicks "Approve"
     - Automatically finds replacement (or assigns manually)
     - Updates shift schedule
   - **Option B - Reject**:
     - Clicks "Reject" with reason
     - Suggests alternative dates

4. **Shift Swap Request** (Kevin - TECHNICIAN):
   - Wants to swap Nov 15 night shift with Sarah
   - Navigates to Technician → My Shifts
   - Clicks "Request Swap"
   - Selects Sarah as swap partner
   - Sarah receives notification and accepts

5. **Swap Approval** (Robert - MANAGER_IT):
   - Reviews swap request
   - Verifies both have required skills
   - Checks no shift policy violations
   - Approves swap
   - Schedule automatically updated

6. **Monthly Review** (Robert - MANAGER_IT):
   - Reviews shift attendance
   - Analyzes ticket resolution by shift
   - Identifies peak hours
   - Adjusts next month's schedule accordingly

**Key Points**:
- Only MANAGER_IT can create and manage schedules
- Regular MANAGER cannot access shift management
- Technicians can view their own shifts and request changes
- Automated coverage checks prevent understaffing
- Approval workflow ensures oversight

---

## Best Practices

### For Users

1. **Create Clear Tickets**:
   - Use descriptive titles
   - Provide detailed descriptions
   - Include error messages or screenshots
   - Select the most accurate service
   - Choose appropriate priority

2. **Priority Guidelines**:
   - LOW: Convenience improvements, questions
   - MEDIUM: Issues that don't stop work (default)
   - HIGH: Issues preventing work
   - URGENT: Business-critical issues
   - CRITICAL: Complete outage affecting multiple users

3. **Track Your Tickets**:
   - Monitor ticket status regularly
   - Respond promptly to technician questions
   - Confirm resolution when issue is fixed
   - Provide feedback to help improve service

4. **Use Knowledge Base**:
   - Search before creating a ticket
   - Many common issues have self-service solutions
   - Save time for simple problems

### For Technicians

1. **Workbench Management**:
   - Check workbench regularly (every 30 minutes)
   - Claim tickets you can resolve
   - Don't hoard tickets - claim only what you can work on
   - Update ticket status promptly

2. **Documentation**:
   - Always add detailed work logs
   - Document troubleshooting steps
   - Include resolution details
   - This helps future tickets and knowledge base

3. **Communication**:
   - Keep ticket creator informed
   - Set expectations on resolution time
   - Ask clarifying questions early
   - Use internal notes for sensitive information

4. **Knowledge Sharing**:
   - Create knowledge articles from complex resolutions
   - Document workarounds
   - Share learnings with team
   - Link relevant KB articles to tickets

5. **SLA Awareness**:
   - Understand SLA targets for your services
   - Prioritize tickets nearing breach
   - Escalate if you can't meet SLA
   - Don't let tickets go stale

6. **Claiming Etiquette**:
   - Don't claim tickets you can't resolve
   - Claim appropriate to your skill level
   - Release if you can't work on it soon
   - Coordinate with team on complex issues

### For Managers

1. **Approval Timeliness**:
   - Review approval queue daily
   - Respond within 24 hours
   - Provide clear approval/rejection reasons
   - Don't bottleneck operational requests

2. **Team Oversight**:
   - Monitor team ticket workload
   - Identify technicians needing help
   - Redistribute work if unbalanced
   - Recognize high performers

3. **User Management**:
   - Keep user roster up to date
   - Deactivate departed employees promptly
   - Verify role assignments are correct
   - Don't give excessive permissions

4. **Branch Performance**:
   - Review branch reports weekly
   - Identify recurring issues
   - Address SLA breaches
   - Report trends to senior management

5. **Restricted Role Assignments**:
   - Do NOT assign MANAGER, ADMIN, or SECURITY_ANALYST roles
   - Those require ADMIN intervention
   - Focus on USER and TECHNICIAN assignments
   - Contact ADMIN for special role needs

### For IT Managers (MANAGER_IT)

1. **Shift Planning**:
   - Create schedules at least 2 weeks in advance
   - Ensure skill coverage on all shifts
   - Plan for holidays and peak periods
   - Maintain backup technicians

2. **Leave Management**:
   - Respond to leave requests within 48 hours
   - Consider coverage impact
   - Have contingency plans
   - Track leave balances

3. **Performance Monitoring**:
   - Review shift-based performance
   - Identify peak hours
   - Optimize technician assignment
   - Address shift-specific issues

### For Security Analysts

1. **Confidentiality**:
   - Mark security incidents as confidential
   - Use appropriate security classifications
   - Share threat intelligence responsibly
   - Follow incident disclosure policies

2. **Documentation**:
   - Document security findings thoroughly
   - Include IOCs (Indicators of Compromise)
   - Record remediation steps
   - Create post-incident reports

3. **Collaboration**:
   - Share findings with other Security Analysts
   - Coordinate with ADMIN for system changes
   - Work with technicians on remediation
   - Escalate serious threats immediately

4. **Knowledge Management**:
   - Create internal security KB articles
   - Document security procedures
   - Update threat intelligence
   - Don't share sensitive security details publicly

### For Admins

1. **Change Management**:
   - Test configuration changes in development
   - Document all changes
   - Communicate impacts to users
   - Have rollback plans

2. **Service Catalog Maintenance**:
   - Review services quarterly
   - Ensure accurate support group assignments
   - Update SLA targets based on performance
   - Deprecate unused services

3. **User Management**:
   - Audit user roles quarterly
   - Remove inactive accounts
   - Verify support group assignments
   - Monitor privileged accounts

4. **Support Group Balance**:
   - Monitor ticket distribution
   - Adjust service assignments if needed
   - Ensure no group is overloaded
   - IT_HELPDESK handles most services - watch capacity

5. **Security**:
   - Review audit logs regularly
   - Monitor failed login attempts
   - Investigate suspicious activity
   - Keep API keys secure

6. **Data Integrity**:
   - Validate imports before closing rollback window
   - Maintain regular backups
   - Test restore procedures
   - Document data relationships

7. **Communication**:
   - Announce system changes in advance
   - Provide training for new features
   - Create KB articles for common admin tasks
   - Be responsive to user access issues

### General Best Practices

1. **Communication**:
   - Use professional language
   - Be respectful in all interactions
   - Provide context in comments
   - Update stakeholders proactively

2. **Security**:
   - Use strong passwords
   - Don't share credentials
   - Lock screen when away
   - Report security concerns immediately
   - Be cautious with confidential data

3. **System Usage**:
   - Log out when finished
   - Don't share accounts
   - Report bugs to ADMIN
   - Provide feedback on usability

4. **Data Quality**:
   - Enter accurate information
   - Keep profiles up to date
   - Use correct categorization
   - Validate before submitting

5. **Continuous Improvement**:
   - Suggest system enhancements
   - Participate in training
   - Share best practices
   - Learn from tickets

---

## Common Mistakes to Avoid

### For All Users

1. ❌ **Sharing credentials** - Each user must have their own account
2. ❌ **Choosing wrong priority** - Understand priority guidelines
3. ❌ **Duplicate tickets** - Check if ticket already exists
4. ❌ **Closing browser without saving** - Use Save Draft feature
5. ❌ **Ignoring notifications** - Respond to ticket updates promptly

### For Technicians

1. ❌ **Claiming too many tickets** - Only claim what you can actively work on
2. ❌ **Not updating status** - Keep status current (In Progress, Pending, etc.)
3. ❌ **Poor documentation** - Future you (and others) need details
4. ❌ **Skipping knowledge base** - Use existing solutions
5. ❌ **Resolving without user confirmation** - Verify fix works
6. ❌ **Working outside support group** - Stay in your lane (exceptions: Call Center, Claims)

### For Managers

1. ❌ **Delayed approvals** - Approvals should be handled within 24 hours
2. ❌ **Assigning restricted roles** - Don't create ADMIN/MANAGER/SECURITY_ANALYST roles
3. ❌ **Managing other branches' users** - Limited to your branch
4. ❌ **Overriding technical decisions** - Trust technician expertise
5. ❌ **Approving without review** - Understand business impact

### For Security Analysts

1. ❌ **Not marking security incidents confidential** - Protect sensitive data
2. ❌ **Sharing threat details publicly** - Use internal channels
3. ❌ **Insufficient documentation** - Security requires detailed records
4. ❌ **Delaying incident response** - Security incidents are time-critical

### For Admins

1. ❌ **Making production changes without testing** - Always test first
2. ❌ **Not documenting changes** - Document everything
3. ❌ **Ignoring audit logs** - Monitor regularly
4. ❌ **Excessive permission granting** - Follow principle of least privilege
5. ❌ **Bulk changes without validation** - Verify data before import
6. ❌ **Neglecting backups** - Maintain backup strategy
7. ❌ **Not communicating changes** - Notify affected users

---

## Frequently Asked Questions

### General Questions

**Q: Can I change my own role?**
A: No. Only ADMINs can change user roles. Contact your administrator if you believe your role is incorrect.

**Q: Can I belong to multiple support groups?**
A: No. Each user can only belong to one support group. However, special access rules (like Call Center) can grant additional visibility.

**Q: Why can't I see tickets from other branches?**
A: Branch-scoped roles (USER, MANAGER, MANAGER_IT) are restricted to their own branch for data security and performance. Only ADMIN and TECHNICIAN roles (with exceptions) have cross-branch visibility.

**Q: What happens if I forget my password?**
A: Use the "Forgot Password" link on the login page, or contact your manager or admin for a password reset.

**Q: My account is locked. What do I do?**
A: Accounts lock after 5 failed login attempts. Contact your manager or admin to unlock your account. The lockout duration is 30 minutes, after which you can try again.

### Technician Questions

**Q: Why can't I see tickets from another support group?**
A: Technicians are restricted to their support group's tickets to manage workload and ensure proper routing. Exceptions exist for Call Center, Transaction Claims Support, and technicians without a support group assignment.

**Q: Can I claim a ticket from a different support group?**
A: No, except in special cases (Call Center, Transaction Claims Support, or if you have no support group assigned).

**Q: Why can't I claim a ticket that's OPEN?**
A: The ticket may be pending approval. You can only claim APPROVED tickets or tickets from services that don't require approval.

**Q: What if I claimed a ticket but can't resolve it?**
A: Release the ticket back to the available pool, add a comment explaining why, and optionally reassign to a more appropriate technician or escalate to your manager.

**Q: Do I need to access the Admin panel?**
A: No, unless you're in the TECH_SUPPORT group managing PC Assets or Office Licenses. Most technician work happens in the Workbench.

### Manager Questions

**Q: Can I create another manager for my branch?**
A: No. You can only create USER, TECHNICIAN, and AGENT roles. Contact an ADMIN to create MANAGER roles.

**Q: Why can't I resolve tickets?**
A: Ticket resolution is a technician function. Managers oversee operations and handle approvals, but don't perform technical work in the system.

**Q: Can I approve tickets from other branches?**
A: No. You can only approve tickets from your own branch.

**Q: Can I view other branches' reports?**
A: No. Manager reports are filtered to your branch only. ADMINs have organization-wide report access.

### Security Analyst Questions

**Q: Can I see all tickets?**
A: No. You see tickets from your support group, tickets assigned to you, and all tickets created by other Security Analysts. You always see confidential tickets.

**Q: Should all security incidents be confidential?**
A: Yes, most security incidents should be marked confidential to protect sensitive information. Use your judgment based on severity and sensitivity.

**Q: Can I create knowledge articles about security issues?**
A: Yes, but be cautious. Create internal-only articles for security procedures. Don't expose vulnerabilities or sensitive security details publicly.

### Admin Questions

**Q: Can I create a SUPER_ADMIN role?**
A: The SUPER_ADMIN role is not actively used in the production schema. ADMIN is the highest privilege level.

**Q: Can I delete tickets?**
A: The system uses soft deletes. You can mark records as inactive, but actual deletion requires database access and should be avoided.

**Q: How do I roll back a bad import?**
A: Use the Import Logs interface to view import history. Each import has a rollback option if executed within the rollback window.

**Q: Can I approve service requests on behalf of managers?**
A: Technically yes (you have access), but you should not. Approvals are a business process that should be handled by the appropriate manager.

### Support Group Questions

**Q: What's the difference between IT_HELPDESK and other technical groups?**
A: IT_HELPDESK is the general-purpose support group handling the vast majority of services (~239 of 240). Other groups are specialized (ATM, Network, Security, etc.).

**Q: Why does Call Center have special access?**
A: Call Center handles transaction claim intake from customers across all branches, so they need cross-branch visibility for Transaction Claims.

**Q: What is Transaction Claims Support group?**
A: A specialized advisory group that can see all transaction and ATM claims but cannot claim or resolve them. They provide guidance to other technicians.

**Q: Can a technician have no support group?**
A: Yes, but it's not recommended. Technicians without a support group can see ALL unassigned tickets, which can be overwhelming. Best practice is to assign every technician to a support group.

---

## Troubleshooting Common Access Issues

### Issue: "Unauthorized" or "Access Denied" errors

**Possible Causes**:
1. Session expired
2. Incorrect role for the feature
3. Branch mismatch
4. Support group restriction

**Solutions**:
1. Log out and log back in
2. Verify your role matches the required role
3. Contact admin if you believe you should have access
4. Check if feature is branch-specific

### Issue: Can't see tickets you expect to see

**For Technicians**:
1. Check if tickets are in your support group
2. Verify tickets don't require approval (pending)
3. Check if tickets are confidential
4. Ensure your support group assignment is correct

**For Managers**:
1. Verify tickets are from your branch
2. Check ticket status (managers see all statuses)
3. Ensure you're logged into correct account

**For Users**:
1. You can only see your own tickets
2. Exception: Call Center users see all Transaction Claims

### Issue: Can't create tickets

**Check**:
1. Are you logged in?
2. Is your account active?
3. Is the service catalog accessible?
4. Browser issues - try clearing cache

### Issue: Can't claim tickets

**For Technicians**:
1. Check if ticket requires approval and is pending
2. Verify ticket is in your support group
3. Ensure ticket isn't already assigned
4. Check if ticket status is OPEN or IN_PROGRESS

### Issue: Can't approve requests

**For Managers**:
1. Verify ticket is from your branch
2. Check ticket status is PENDING_APPROVAL
3. Ensure service actually requires approval
4. Verify you have MANAGER or MANAGER_IT role

### Issue: Can't access admin panel

**Check**:
1. Do you have ADMIN role?
2. Technicians in TECH_SUPPORT can access PC Assets/Licenses only
3. Other roles do not have admin access
4. Contact admin if you need access

---

## Appendix: Role Assignment Decision Tree

```
New User Needs Access - What Role?
│
├─ Will they create and track tickets ONLY?
│  └─ USER role
│     ├─ Call center staff? → Assign to CALL_CENTER support group
│     └─ Regular employee? → Assign to branch, no support group
│
├─ Will they resolve technical issues?
│  └─ TECHNICIAN role
│     ├─ General IT support? → IT_HELPDESK support group
│     ├─ ATM specialist? → ATM_SUPPORT support group
│     ├─ Network specialist? → NETWORK_INFRA support group
│     ├─ Security work? → SECURITY_OPS support group
│     ├─ Asset management? → TECH_SUPPORT support group
│     ├─ Call center tech? → CALL_CENTER support group
│     ├─ Claims advisory? → TRANSACTION_CLAIMS_SUPPORT support group
│     └─ Core banking? → CORE_BANKING support group
│
├─ Will they handle security incidents?
│  └─ SECURITY_ANALYST role
│     └─ Assign to SECURITY_OPS support group
│
├─ Will they manage branch operations?
│  └─ Is IT manager with shift scheduling?
│     ├─ Yes → MANAGER_IT role, assign to branch
│     └─ No → MANAGER role, assign to branch
│
└─ Will they configure the system?
   └─ ADMIN role (no branch or support group restriction)
```

---

## Appendix: Support Group Service Distribution

### Approximate Service Distribution

- **IT_HELPDESK**: ~239 services (99.6%)
  - All general IT support
  - Hardware issues (desktops, laptops, printers)
  - Software installations
  - Business applications
  - Network connectivity (user-facing)
  - Most business application issues

- **ATM_SUPPORT**: ~10-15 services
  - ATM hardware troubleshooting
  - ATM software issues
  - ATM cash loading supervision
  - ATM receipt printer issues

- **CARD_CENTER**: ~5-8 services
  - Card issuance
  - PIN resets
  - Card disputes
  - Card activation

- **NETWORK_INFRA**: ~15-20 services
  - Network infrastructure issues
  - VSAT connections
  - M2M networks
  - Fiber optic issues
  - Router/switch problems

- **CORE_BANKING**: ~5-10 services
  - Core banking application issues
  - Integration problems
  - Performance issues

- **SECURITY_OPS**: ~10-15 services
  - Security incidents
  - Malware/virus issues
  - Access control problems
  - Security policy violations

- **CALL_CENTER**: Special visibility
  - All transaction claims (cross-service)
  - ATM claims intake

- **TRANSACTION_CLAIMS_SUPPORT**: Special visibility
  - All transaction claims (advisory)
  - All ATM claims (advisory)

- **TECH_SUPPORT**: Asset management
  - PC asset tracking
  - Office license management

**Note**: The one service NOT handled by IT_HELPDESK is the KASDA system (handled by a specialized group).

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-30 | Initial comprehensive guide created | System Documentation Team |

---

## Feedback and Updates

This guide is a living document. If you find:
- Inaccurate information
- Missing details
- Confusing explanations
- Need for additional examples

Please contact the System Administration team to request updates.

---

**End of Document**
