const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, convertInchesToTwip, PageBreak, Packer } = require('docx');
const fs = require('fs');
const path = require('path');

// Helper function to create a section heading
function createHeading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text: text,
    heading: level,
    spacing: { before: 400, after: 200 },
  });
}

// Helper function to create a normal paragraph
function createParagraph(text, options = {}) {
  return new Paragraph({
    text: text,
    spacing: { before: 100, after: 100 },
    ...options,
  });
}

// Helper function to create a bullet point
function createBullet(text) {
  return new Paragraph({
    text: text,
    bullet: { level: 0 },
    spacing: { before: 50, after: 50 },
  });
}

// Create simple tables without complex styling
function createSimpleTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(row => new TableRow({
      children: row.map((cell, index) => new TableCell({
        children: [new Paragraph(cell.text || cell)],
        shading: cell.shading ? { fill: cell.shading } : undefined,
      })),
    })),
  });
}

const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          right: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1),
        },
      },
    },
    children: [
      // Title Page
      createParagraph('Bank SulutGo ServiceDesk', {
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
      }),
      createParagraph('DATA FLOW DIAGRAM', {
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      createParagraph('Technical Documentation', {
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      createParagraph(`Generated: ${new Date().toLocaleDateString()}`, {
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Document Information
      createHeading('Document Information', HeadingLevel.HEADING_1),

      createSimpleTable([
        [{ text: 'Document Title', shading: 'D3D3D3' }, 'Data Flow Diagram - ServiceDesk Application'],
        [{ text: 'Version', shading: 'D3D3D3' }, '1.0'],
        [{ text: 'Last Updated', shading: 'D3D3D3' }, 'November 2025'],
        [{ text: 'Application', shading: 'D3D3D3' }, 'Bank SulutGo ServiceDesk'],
        [{ text: 'Technology', shading: 'D3D3D3' }, 'Next.js 15, TypeScript, PostgreSQL, Prisma ORM'],
      ]),

      createParagraph(''),
      createHeading('Table of Contents', HeadingLevel.HEADING_2),
      createBullet('1. Overview'),
      createBullet('2. Context Diagram (Level 0)'),
      createBullet('3. Main System Processes (Level 1)'),
      createBullet('4. Ticket Management Subsystem (Level 2)'),
      createBullet('5. Network Monitoring Subsystem (Level 3)'),
      createBullet('6. Reporting Subsystem (Level 4)'),
      createBullet('7. Data Flow Summary by Feature'),
      createBullet('8. Data Store Catalog'),
      createBullet('9. Data Flow Characteristics'),
      createBullet('10. Security & Access Control'),

      new Paragraph({ children: [new PageBreak()] }),

      // 1. Overview
      createHeading('1. Overview', HeadingLevel.HEADING_1),
      createHeading('Purpose', HeadingLevel.HEADING_2),
      createParagraph('This document provides comprehensive data flow diagrams for the Bank SulutGo ServiceDesk application. It shows how data moves through the system across different functional areas and processes.'),

      createHeading('Document Structure', HeadingLevel.HEADING_2),
      createParagraph('The document follows a hierarchical approach to data flow modeling:'),
      createBullet('Level 0 (Context Diagram): Shows the system as a single process with external entities'),
      createBullet('Level 1 (Main Processes): Breaks down the system into 7 major functional areas'),
      createBullet('Level 2-4 (Detailed Views): Provides detailed views of critical subsystems'),

      new Paragraph({ children: [new PageBreak()] }),

      // 2. Context Diagram
      createHeading('2. Context Diagram (Level 0)', HeadingLevel.HEADING_1),
      createHeading('System Overview', HeadingLevel.HEADING_2),
      createParagraph('The Context Diagram shows the ServiceDesk system at its highest level, depicting how it interacts with external entities.'),

      createHeading('External Entities', HeadingLevel.HEADING_3),
      createSimpleTable([
        [{ text: 'Entity', shading: '4A90E2' }, { text: 'Description', shading: '4A90E2' }, { text: 'Data Flow', shading: '4A90E2' }],
        ['Users', 'Requesters, Technicians, Managers, Admins', 'Bidirectional'],
        ['ManageEngine', 'Legacy system for data import', 'Into ServiceDesk'],
        ['Email System', 'SMTP server for notifications', 'From ServiceDesk'],
        ['ATM Devices', 'Network monitoring targets', 'Into ServiceDesk'],
        ['Branch Networks', 'Branch infrastructure monitoring', 'Into ServiceDesk'],
        ['External APIs', 'Third-party system access', 'Bidirectional'],
      ]),

      createHeading('Key Data Flows', HeadingLevel.HEADING_3),
      createBullet('Users → ServiceDesk: Authentication requests, ticket creation/updates, report requests'),
      createBullet('ServiceDesk → Users: Ticket status updates, reports & analytics'),
      createBullet('ServiceDesk → Email System: Automated notifications and alerts'),
      createBullet('ServiceDesk → ATMs/Branches: Network monitoring (ping checks)'),
      createBullet('ManageEngine → ServiceDesk: Legacy ticket and user data import'),
      createBullet('External APIs ↔ ServiceDesk: API requests and responses'),

      new Paragraph({ children: [new PageBreak()] }),

      // 3. Main System Processes
      createHeading('3. Main System Processes (Level 1)', HeadingLevel.HEADING_1),
      createHeading('System Architecture', HeadingLevel.HEADING_2),
      createParagraph('The ServiceDesk system is divided into 7 major functional areas, each responsible for specific operations.'),

      createHeading('Major Processes', HeadingLevel.HEADING_3),
      createSimpleTable([
        [{ text: 'Process', shading: 'FF9999' }, { text: 'Description', shading: 'FF9999' }],
        ['P1.0 Authentication & Authorization', 'Handles user login, session management, role-based access control'],
        ['P2.0 Ticket Management', 'Core ticketing: create, assign, update, resolve, close tickets'],
        ['P3.0 Network Monitoring', 'Monitors ATMs and branches, detects incidents, creates alerts'],
        ['P4.0 Reporting & Analytics', 'Generates reports across all domains, exports to PDF/Excel'],
        ['P5.0 Knowledge Management', 'Manages articles, solutions, documentation for self-service'],
        ['P6.0 Admin Management', 'System config, user management, data imports, asset management'],
        ['P7.0 Approval Workflow', 'Multi-level approval process for specific services'],
      ]),

      createHeading('Primary Data Stores', HeadingLevel.HEADING_3),
      createBullet('D1: Users - User accounts, authentication, roles, branch assignments'),
      createBullet('D2: Tickets - All service requests, incidents, and their lifecycle'),
      createBullet('D3: Assets - ATMs, Branches, PC Assets with monitoring configuration'),
      createBullet('D4: Monitoring Data - Network status, ping results, incidents'),
      createBullet('D5: Report Templates - Pre-configured and custom report definitions'),
      createBullet('D6: Knowledge Base - Articles, solutions, documentation'),
      createBullet('D7: Audit Logs - All system changes and user actions'),

      new Paragraph({ children: [new PageBreak()] }),

      // 4. Ticket Management Subsystem
      createHeading('4. Ticket Management Subsystem (Level 2)', HeadingLevel.HEADING_1),
      createParagraph('The Ticket Management subsystem handles the complete lifecycle of service requests and incidents through 8 detailed processes.'),

      createSimpleTable([
        [{ text: 'Process', shading: '99CCFF' }, { text: 'Description', shading: '99CCFF' }],
        ['P2.1 Create Ticket', 'Creates new ticket with service selection, SLA assignment'],
        ['P2.2 Assign Ticket', 'Assigns ticket to technician based on support group'],
        ['P2.3 Update Status', 'Updates ticket status and checks SLA'],
        ['P2.4 Add Comments', 'Adds communication from users and technicians'],
        ['P2.5 Resolve Ticket', 'Marks ticket resolved with solution'],
        ['P2.6 Close Ticket', 'Final closure after resolution confirmation'],
        ['P2.7 Handle Attachments', 'Manages file uploads for evidence'],
        ['P2.8 SLA Monitoring', 'Tracks response and resolution times'],
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // 5. Network Monitoring Subsystem
      createHeading('5. Network Monitoring Subsystem (Level 3)', HeadingLevel.HEADING_1),
      createParagraph('The Network Monitoring subsystem continuously monitors ATMs and branch networks through 7 processes.'),

      createSimpleTable([
        [{ text: 'Process', shading: '99FF99' }, { text: 'Description', shading: '99FF99' }],
        ['P3.1 Configure Monitoring', 'Admin enables monitoring, sets IP addresses and coordinates'],
        ['P3.2 Ping/Status Check', 'Scheduled ping checks to ATMs and branches'],
        ['P3.3 Log Results', 'Records ping results, response times, packet loss'],
        ['P3.4 Detect Incidents', 'Analyzes status changes and creates incident records'],
        ['P3.5 Create Alert', 'Auto-creates tickets for critical incidents'],
        ['P3.6 Update Map View', 'Provides real-time map visualization'],
        ['P3.7 Generate Performance Report', 'Creates historical network performance reports'],
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // 6. Reporting Subsystem
      createHeading('6. Reporting Subsystem (Level 4)', HeadingLevel.HEADING_1),
      createParagraph('The Reporting subsystem provides comprehensive analytics and reporting across all system domains through 8 processes.'),

      createSimpleTable([
        [{ text: 'Process', shading: 'FFCC99' }, { text: 'Description', shading: 'FFCC99' }],
        ['P4.1 Select Report Type', 'User selects from pre-configured or custom templates'],
        ['P4.2 Set Parameters', 'User specifies filters: date range, branch, priority'],
        ['P4.3 Query Data', 'Queries multiple data stores based on requirements'],
        ['P4.4 Process & Aggregate', 'Aggregates data, calculates statistics'],
        ['P4.5 Format Report', 'Formats output with charts and tables'],
        ['P4.6 Export Report', 'Exports to PDF or Excel format'],
        ['P4.7 Save Custom Report', 'Saves user-defined report configurations'],
        ['P4.8 Schedule Auto-Report', 'Admin schedules recurring reports'],
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // 7. Data Flow Summary
      createHeading('7. Data Flow Summary by Feature', HeadingLevel.HEADING_1),

      createHeading('Authentication Flow', HeadingLevel.HEADING_2),
      createBullet('User submits login credentials (email/password)'),
      createBullet('P1.0 Auth Process queries D1 Users database'),
      createBullet('D1 Users returns user record with hashed password and role'),
      createBullet('P1.0 Auth Process validates credentials'),
      createBullet('P1.0 Auth Process generates JWT token with session data'),
      createBullet('P1.0 Auth Process logs login attempt to D7 Audit Logs'),
      createBullet('JWT token returned to user for subsequent requests'),

      createHeading('Ticket Creation Flow', HeadingLevel.HEADING_2),
      createBullet('Requester submits ticket details (service, priority, description)'),
      createBullet('P2.1 Create Ticket performs service lookup in D2.4 Services'),
      createBullet('D2.4 Services returns SLA configuration and support group'),
      createBullet('P2.1 Create Ticket creates new ticket record in D2.1 Tickets'),
      createBullet('P2.1 Create Ticket triggers auto-assignment'),
      createBullet('P2.1 Create Ticket sends notification to Email System'),
      createBullet('Confirmation returned to requester with ticket number'),

      createHeading('Network Monitoring Flow', HeadingLevel.HEADING_2),
      createBullet('Cron job triggers P3.2 Ping Check at scheduled interval'),
      createBullet('P3.2 Ping Check queries D3.1 Assets for monitored entities'),
      createBullet('P3.2 Ping Check sends ping requests to ATMs and Branches'),
      createBullet('P3.3 Log Status creates log entry in D4.1 Monitoring Logs'),
      createBullet('P3.4 Detect Incident creates incident if threshold exceeded'),
      createBullet('P3.5 Create Alert auto-creates ticket for critical incidents'),

      new Paragraph({ children: [new PageBreak()] }),

      // 8. Data Store Catalog
      createHeading('8. Data Store Catalog', HeadingLevel.HEADING_1),
      createParagraph('Complete reference of all data stores in the system:'),

      createSimpleTable([
        [{ text: 'Data Store', shading: 'D3D3D3' }, { text: 'Contains', shading: 'D3D3D3' }],
        ['D1: Users', 'User accounts, authentication, roles, branches'],
        ['D2: Tickets', 'All service requests and incidents'],
        ['D2.2: Comments', 'Ticket comments and communications'],
        ['D2.3: Attachments', 'File uploads linked to tickets'],
        ['D2.4: Services', 'Service catalog with SLA definitions'],
        ['D2.5: Support Groups', 'Technical support teams'],
        ['D2.6: Tasks', 'Checklist items for ticket resolution'],
        ['D2.7: SLA Config', 'SLA rules and breach thresholds'],
        ['D2.8: Approvals', 'Multi-level approval workflow'],
        ['D3: Assets', 'ATMs, Branches, PC Assets'],
        ['D4.1: Monitoring Logs', 'Status check results over time'],
        ['D4.2: Network Incidents', 'Network outages and issues'],
        ['D4.3: Ping Results', 'Detailed ping statistics'],
        ['D5: Report Templates', 'System and custom report definitions'],
        ['D6: Knowledge Base', 'Articles, solutions, documentation'],
        ['D7: Audit Logs', 'All system changes and actions'],
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // 9. Data Flow Characteristics
      createHeading('9. Data Flow Characteristics', HeadingLevel.HEADING_1),

      createHeading('Real-Time Flows', HeadingLevel.HEADING_2),
      createBullet('Network monitoring (ping checks every 5-30 minutes)'),
      createBullet('Ticket status updates (immediate propagation)'),
      createBullet('User authentication (synchronous validation)'),
      createBullet('SLA breach detection (continuous monitoring)'),

      createHeading('Batch Flows', HeadingLevel.HEADING_2),
      createBullet('Report generation (on-demand or scheduled)'),
      createBullet('Data import from legacy systems'),
      createBullet('Bulk email notifications'),
      createBullet('Database backups (daily scheduled)'),

      createHeading('Asynchronous Flows', HeadingLevel.HEADING_2),
      createBullet('Email notifications (queued and sent)'),
      createBullet('File uploads/downloads'),
      createBullet('Long-running reports'),
      createBullet('Background monitoring checks'),

      createHeading('Synchronous Flows', HeadingLevel.HEADING_2),
      createBullet('User login/authentication'),
      createBullet('Ticket CRUD operations'),
      createBullet('Search queries'),
      createBullet('API requests'),

      new Paragraph({ children: [new PageBreak()] }),

      // 10. Security & Access Control
      createHeading('10. Security & Access Control', HeadingLevel.HEADING_1),
      createParagraph('All data flows pass through the authentication layer (P1.0) which provides comprehensive security controls.'),

      createHeading('Role-Based Access Control', HeadingLevel.HEADING_2),
      createBullet('SUPER_ADMIN: Full system access'),
      createBullet('ADMIN: Administrative functions and all reports'),
      createBullet('MANAGER: Team and branch-level management'),
      createBullet('TECHNICIAN: Ticket assignment and resolution'),
      createBullet('AGENT: Limited ticket creation and viewing'),
      createBullet('USER: Basic ticket creation and status viewing'),

      createHeading('Security Features', HeadingLevel.HEADING_2),
      createBullet('Session validation for every request'),
      createBullet('Branch-based data filtering for non-admin users'),
      createBullet('Comprehensive audit logging to D7 Audit Logs'),
      createBullet('Rate limiting on API endpoints'),
      createBullet('IP address and user agent tracking'),

      new Paragraph({ children: [new PageBreak()] }),

      // Document Control
      createHeading('Document Control', HeadingLevel.HEADING_2),
      createSimpleTable([
        [{ text: 'Version', shading: 'E7E6E6' }, { text: 'Date', shading: 'E7E6E6' }, { text: 'Changes', shading: 'E7E6E6' }],
        ['1.0', 'Nov 2025', 'Initial dataflow diagram documentation'],
      ]),

      createParagraph(''),
      createParagraph('For visual Mermaid diagrams, refer to: /docs/DATAFLOW-DIAGRAM.md'),
      createParagraph(''),
      createParagraph('--- End of Document ---', { alignment: AlignmentType.CENTER }),
    ],
  }],
});

// Generate the document
Packer.toBuffer(doc).then(buffer => {
  const outputPath = path.join(__dirname, 'Dataflow_Diagram_ServiceDesk_v2.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log('✅ Simplified Dataflow Document generated successfully!');
  console.log(`📄 Location: ${outputPath}`);
}).catch(error => {
  console.error('❌ Error generating document:', error);
});
