const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, convertInchesToTwip, PageBreak } = require('docx');
const fs = require('fs');
const path = require('path');

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
      new Paragraph({
        text: 'Bank SulutGo ServiceDesk',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: 'Data Flow Diagram',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: 'Technical Documentation',
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // Document Information
      new Paragraph({
        text: 'Document Information',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Document Title', bold: true })],
                shading: { fill: 'E7E6E6' },
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph('Data Flow Diagram - ServiceDesk Application')],
                width: { size: 70, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Version', bold: true })],
                shading: { fill: 'E7E6E6' },
              }),
              new TableCell({
                children: [new Paragraph('1.0')],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Last Updated', bold: true })],
                shading: { fill: 'E7E6E6' },
              }),
              new TableCell({
                children: [new Paragraph('November 2025')],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Application', bold: true })],
                shading: { fill: 'E7E6E6' },
              }),
              new TableCell({
                children: [new Paragraph('Bank SulutGo ServiceDesk')],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Technology Stack', bold: true })],
                shading: { fill: 'E7E6E6' },
              }),
              new TableCell({
                children: [new Paragraph('Next.js 15, TypeScript, PostgreSQL, Prisma ORM')],
              }),
            ],
          }),
        ],
      }),

      new Paragraph({ text: '', spacing: { before: 400 } }),

      // Table of Contents
      new Paragraph({
        text: 'Table of Contents',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      }),

      new Paragraph({ text: '1. Overview', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: '2. Context Diagram (Level 0)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: '3. Main System Processes (Level 1)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: '4. Ticket Management Subsystem (Level 2)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: '5. Network Monitoring Subsystem (Level 3)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: '6. Reporting Subsystem (Level 4)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: '7. Data Flow Summary by Feature', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: '8. Data Store Catalog', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: '9. Data Flow Characteristics', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: '10. Security & Access Control', numbering: { level: 0, reference: 'bullet-points' } }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 1. Overview
      new Paragraph({
        text: '1. Overview',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),

      new Paragraph({
        text: 'Purpose',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'This document provides comprehensive data flow diagrams for the Bank SulutGo ServiceDesk application. It shows how data moves through the system across different functional areas and processes.',
        spacing: { after: 200 },
      }),

      new Paragraph({
        text: 'Document Structure',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'The document follows a hierarchical approach to data flow modeling:',
        spacing: { after: 100 },
      }),

      new Paragraph({ text: 'Level 0 (Context Diagram): Shows the system as a single process with external entities', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Level 1 (Main Processes): Breaks down the system into 7 major functional areas', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Level 2-4 (Detailed Views): Provides detailed views of critical subsystems', numbering: { level: 0, reference: 'bullet-points' } }),

      new Paragraph({
        text: 'Note: This document contains textual descriptions of data flow diagrams. For visual Mermaid diagrams, please refer to the source markdown file (DATAFLOW-DIAGRAM.md) in the project repository.',
        spacing: { before: 200 },
        italics: true,
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 2. Context Diagram (Level 0)
      new Paragraph({
        text: '2. Context Diagram (Level 0)',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),

      new Paragraph({
        text: 'System Overview',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'The Context Diagram shows the ServiceDesk system at its highest level, depicting how it interacts with external entities.',
        spacing: { after: 200 },
      }),

      new Paragraph({
        text: 'External Entities',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Entity', bold: true })],
                shading: { fill: '4A90E2' },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Description', bold: true })],
                shading: { fill: '4A90E2' },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Data Flow Direction', bold: true })],
                shading: { fill: '4A90E2' },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Users')] }),
              new TableCell({ children: [new Paragraph('Requesters, Technicians, Managers, Admins')] }),
              new TableCell({ children: [new Paragraph('Bidirectional')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('ManageEngine ServiceDesk Plus')] }),
              new TableCell({ children: [new Paragraph('Legacy system for data import')] }),
              new TableCell({ children: [new Paragraph('Into ServiceDesk')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Email System')] }),
              new TableCell({ children: [new Paragraph('SMTP server for notifications')] }),
              new TableCell({ children: [new Paragraph('From ServiceDesk')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('ATM Devices')] }),
              new TableCell({ children: [new Paragraph('Network monitoring targets')] }),
              new TableCell({ children: [new Paragraph('Into ServiceDesk')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Branch Networks')] }),
              new TableCell({ children: [new Paragraph('Branch infrastructure monitoring')] }),
              new TableCell({ children: [new Paragraph('Into ServiceDesk')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('External API Consumers')] }),
              new TableCell({ children: [new Paragraph('Third-party systems accessing APIs')] }),
              new TableCell({ children: [new Paragraph('Bidirectional')] }),
            ],
          }),
        ],
      }),

      new Paragraph({
        text: 'Key Data Flows',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({ text: 'Users → ServiceDesk: Authentication requests, ticket creation/updates, report requests', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'ServiceDesk → Users: Ticket status updates, reports & analytics', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'ServiceDesk → Email System: Automated notifications and alerts', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'ServiceDesk → ATMs/Branches: Network monitoring (ping checks)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'ManageEngine → ServiceDesk: Legacy ticket and user data import', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'External APIs ↔ ServiceDesk: API requests and responses', numbering: { level: 0, reference: 'bullet-points' } }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 3. Main System Processes (Level 1)
      new Paragraph({
        text: '3. Main System Processes (Level 1)',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),

      new Paragraph({
        text: 'System Architecture',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'The ServiceDesk system is divided into 7 major functional areas, each responsible for specific operations. These processes interact with 7 primary data stores.',
        spacing: { after: 200 },
      }),

      new Paragraph({
        text: 'Major Processes',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Process', bold: true })],
                shading: { fill: 'FF9999' },
                width: { size: 25, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Description', bold: true })],
                shading: { fill: 'FF9999' },
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Primary Data Stores', bold: true })],
                shading: { fill: 'FF9999' },
                width: { size: 25, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P1.0 Authentication & Authorization')] }),
              new TableCell({ children: [new Paragraph('Handles user login, session management, role-based access control, and security')] }),
              new TableCell({ children: [new Paragraph('D1: Users, D7: Audit Logs')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P2.0 Ticket Management')] }),
              new TableCell({ children: [new Paragraph('Core ticketing system: create, assign, update, resolve, and close tickets')] }),
              new TableCell({ children: [new Paragraph('D2: Tickets, D1: Users')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P3.0 Network Monitoring')] }),
              new TableCell({ children: [new Paragraph('Monitors ATMs and branch networks, detects incidents, creates alerts')] }),
              new TableCell({ children: [new Paragraph('D3: Assets, D4: Monitoring Data')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P4.0 Reporting & Analytics')] }),
              new TableCell({ children: [new Paragraph('Generates reports across all domains, exports to PDF/Excel')] }),
              new TableCell({ children: [new Paragraph('D5: Report Templates, All Data Stores')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P5.0 Knowledge Management')] }),
              new TableCell({ children: [new Paragraph('Manages articles, solutions, and documentation for self-service')] }),
              new TableCell({ children: [new Paragraph('D6: Knowledge Base')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P6.0 Admin Management')] }),
              new TableCell({ children: [new Paragraph('System configuration, user management, data imports, asset management')] }),
              new TableCell({ children: [new Paragraph('D1: Users, D3: Assets, D7: Audit Logs')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P7.0 Approval Workflow')] }),
              new TableCell({ children: [new Paragraph('Multi-level approval process for specific services')] }),
              new TableCell({ children: [new Paragraph('D2: Tickets, D2.8: Approvals')] }),
            ],
          }),
        ],
      }),

      new Paragraph({
        text: 'Primary Data Stores',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({ text: 'D1: Users - User accounts, authentication, roles, branch assignments', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D2: Tickets - All service requests, incidents, and their lifecycle', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D3: Assets - ATMs, Branches, PC Assets with monitoring configuration', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D4: Monitoring Data - Network status, ping results, incidents', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D5: Report Templates - Pre-configured and custom report definitions', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D6: Knowledge Base - Articles, solutions, documentation', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D7: Audit Logs - All system changes and user actions', numbering: { level: 0, reference: 'bullet-points' } }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 4. Ticket Management Subsystem (Level 2)
      new Paragraph({
        text: '4. Ticket Management Subsystem (Level 2)',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),

      new Paragraph({
        text: 'Process Breakdown',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'The Ticket Management subsystem handles the complete lifecycle of service requests and incidents through 8 detailed processes.',
        spacing: { after: 200 },
      }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Process', bold: true })],
                shading: { fill: '99CCFF' },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Description', bold: true })],
                shading: { fill: '99CCFF' },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Key Data Flows', bold: true })],
                shading: { fill: '99CCFF' },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P2.1 Create Ticket')] }),
              new TableCell({ children: [new Paragraph('Creates new ticket with service selection, SLA assignment, and optional approval requirement')] }),
              new TableCell({ children: [new Paragraph('→ D2.4 Services, → D2.1 Tickets, → Email')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P2.2 Assign Ticket')] }),
              new TableCell({ children: [new Paragraph('Assigns ticket to technician based on support group and workload')] }),
              new TableCell({ children: [new Paragraph('→ D2.5 Support Groups, → D2.1 Tickets')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P2.3 Update Status')] }),
              new TableCell({ children: [new Paragraph('Updates ticket status (OPEN, IN_PROGRESS, RESOLVED, CLOSED) and checks SLA')] }),
              new TableCell({ children: [new Paragraph('→ D2.1 Tickets, → D2.7 SLA Config')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P2.4 Add Comments')] }),
              new TableCell({ children: [new Paragraph('Adds communication and updates from users and technicians')] }),
              new TableCell({ children: [new Paragraph('→ D2.2 Comments, → Email')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P2.5 Resolve Ticket')] }),
              new TableCell({ children: [new Paragraph('Marks ticket resolved with solution and generates task checklist')] }),
              new TableCell({ children: [new Paragraph('→ D2.1 Tickets, → D2.6 Tasks')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P2.6 Close Ticket')] }),
              new TableCell({ children: [new Paragraph('Final closure by requester or manager after resolution confirmation')] }),
              new TableCell({ children: [new Paragraph('→ D2.1 Tickets, → Email')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P2.7 Handle Attachments')] }),
              new TableCell({ children: [new Paragraph('Manages file uploads for evidence, screenshots, and documentation')] }),
              new TableCell({ children: [new Paragraph('→ D2.3 Attachments')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P2.8 SLA Monitoring')] }),
              new TableCell({ children: [new Paragraph('Tracks response and resolution times, generates alerts for breaches')] }),
              new TableCell({ children: [new Paragraph('← D2.7 SLA Config, → Email')] }),
            ],
          }),
        ],
      }),

      new Paragraph({
        text: 'Data Stores Used',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({ text: 'D2.1: Tickets - Core ticket information', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D2.2: Comments - Ticket communications', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D2.3: Attachments - File uploads', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D2.4: Services - Service catalog with SLA definitions', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D2.5: Support Groups - Technical teams', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D2.6: Tasks - Resolution checklist items', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D2.7: SLA Config - SLA rules and thresholds', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D2.8: Approvals - Multi-level approval records', numbering: { level: 0, reference: 'bullet-points' } }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 5. Network Monitoring Subsystem (Level 3)
      new Paragraph({
        text: '5. Network Monitoring Subsystem (Level 3)',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),

      new Paragraph({
        text: 'Monitoring Architecture',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'The Network Monitoring subsystem continuously monitors ATMs and branch networks, detecting incidents and generating alerts through 7 processes.',
        spacing: { after: 200 },
      }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Process', bold: true })],
                shading: { fill: '99FF99' },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Description', bold: true })],
                shading: { fill: '99FF99' },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Key Data Flows', bold: true })],
                shading: { fill: '99FF99' },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P3.1 Configure Monitoring')] }),
              new TableCell({ children: [new Paragraph('Admin enables monitoring, sets IP addresses and coordinates for assets')] }),
              new TableCell({ children: [new Paragraph('→ D3.1 Assets, ↔ D4.4 Monitor Config')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P3.2 Ping/Status Check')] }),
              new TableCell({ children: [new Paragraph('Scheduled ping checks to ATMs and branches, measures response time')] }),
              new TableCell({ children: [new Paragraph('← D3.1 Assets, → ATMs/Branches')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P3.3 Log Results')] }),
              new TableCell({ children: [new Paragraph('Records ping results, response times, and packet loss')] }),
              new TableCell({ children: [new Paragraph('→ D4.1 Monitoring Logs, → D4.3 Ping Results')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P3.4 Detect Incidents')] }),
              new TableCell({ children: [new Paragraph('Analyzes status changes and creates incident records for outages')] }),
              new TableCell({ children: [new Paragraph('← D4.1 Logs, → D4.2 Incidents')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P3.5 Create Alert')] }),
              new TableCell({ children: [new Paragraph('Auto-creates tickets for critical incidents and notifies technicians')] }),
              new TableCell({ children: [new Paragraph('← D4.2 Incidents, → D2 Tickets')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P3.6 Update Map View')] }),
              new TableCell({ children: [new Paragraph('Provides real-time map visualization with asset status and incidents')] }),
              new TableCell({ children: [new Paragraph('← D3.1 Assets, ← D4.1 Logs, ← D4.2 Incidents')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P3.7 Generate Performance Report')] }),
              new TableCell({ children: [new Paragraph('Creates historical reports on network performance and availability')] }),
              new TableCell({ children: [new Paragraph('← D4.1 Logs, ← D4.3 Ping Results')] }),
            ],
          }),
        ],
      }),

      new Paragraph({
        text: 'Data Stores Used',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({ text: 'D3.1: Assets - ATMs and Branches with IP addresses and coordinates', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D4.1: Monitoring Logs - Historical status check results', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D4.2: Network Incidents - Outage and performance issue records', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D4.3: Ping Results - Detailed ping statistics and response times', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D4.4: Monitor Config - Monitoring parameters and schedules', numbering: { level: 0, reference: 'bullet-points' } }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 6. Reporting Subsystem (Level 4)
      new Paragraph({
        text: '6. Reporting Subsystem (Level 4)',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),

      new Paragraph({
        text: 'Reporting Framework',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'The Reporting subsystem provides comprehensive analytics and reporting across all system domains through 8 processes.',
        spacing: { after: 200 },
      }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Process', bold: true })],
                shading: { fill: 'FFCC99' },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Description', bold: true })],
                shading: { fill: 'FFCC99' },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Key Data Flows', bold: true })],
                shading: { fill: 'FFCC99' },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P4.1 Select Report Type')] }),
              new TableCell({ children: [new Paragraph('User selects from pre-configured or custom report templates by role')] }),
              new TableCell({ children: [new Paragraph('← D5.1 Report Templates')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P4.2 Set Parameters')] }),
              new TableCell({ children: [new Paragraph('User specifies filters: date range, branch, priority, service, etc.')] }),
              new TableCell({ children: [new Paragraph('Parameters → P4.3 Query Data')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P4.3 Query Data')] }),
              new TableCell({ children: [new Paragraph('Queries multiple data stores based on report requirements')] }),
              new TableCell({ children: [new Paragraph('↔ D2 Tickets, D4 Monitoring, D3 Assets, D1 Users, D5.2 SLA Logs')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P4.4 Process & Aggregate')] }),
              new TableCell({ children: [new Paragraph('Aggregates data, calculates statistics, generates trends and metrics')] }),
              new TableCell({ children: [new Paragraph('Raw Data → Aggregated Results')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P4.5 Format Report')] }),
              new TableCell({ children: [new Paragraph('Formats output with charts, tables, and visual elements for presentation')] }),
              new TableCell({ children: [new Paragraph('Formatted Report → User')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P4.6 Export Report')] }),
              new TableCell({ children: [new Paragraph('Exports report to PDF or Excel format for distribution')] }),
              new TableCell({ children: [new Paragraph('PDF/Excel → User')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P4.7 Save Custom Report')] }),
              new TableCell({ children: [new Paragraph('Saves user-defined report configurations for future use')] }),
              new TableCell({ children: [new Paragraph('→ D5.3 Custom Reports')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('P4.8 Schedule Auto-Report')] }),
              new TableCell({ children: [new Paragraph('Admin schedules recurring reports with automatic email delivery')] }),
              new TableCell({ children: [new Paragraph('→ D5.4 Report Executions, → Email')] }),
            ],
          }),
        ],
      }),

      new Paragraph({
        text: 'Data Stores Used',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({ text: 'D5.1: Report Templates - System and custom report definitions', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D5.2: SLA Logs - Historical SLA performance metrics', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D5.3: Custom Reports - User-created report configurations', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'D5.4: Report Executions - Report run history and schedules', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Queries All Data Stores: Tickets, Users, Services, Monitoring, Assets, Approvals', numbering: { level: 0, reference: 'bullet-points' } }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 7. Data Flow Summary by Feature
      new Paragraph({
        text: '7. Data Flow Summary by Feature',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),

      new Paragraph({
        text: 'Authentication Flow',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: '1. User submits login credentials (email/password)\n2. P1.0 Auth Process queries D1 Users database\n3. D1 Users returns user record with hashed password and role\n4. P1.0 Auth Process validates credentials\n5. P1.0 Auth Process generates JWT token with session data\n6. P1.0 Auth Process logs login attempt to D7 Audit Logs\n7. JWT token returned to user for subsequent requests',
        spacing: { after: 200 },
      }),

      new Paragraph({
        text: 'Ticket Creation Flow',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: '1. Requester submits ticket details (service, priority, description)\n2. P2.1 Create Ticket performs service lookup in D2.4 Services\n3. D2.4 Services returns SLA configuration and support group\n4. P2.1 Create Ticket creates new ticket record in D2.1 Tickets\n5. P2.1 Create Ticket triggers auto-assignment to P2.2 Assign Ticket\n6. P2.1 Create Ticket sends notification request to Email System\n7. P2.1 Create Ticket creates audit entry in D7 Audit Logs\n8. Confirmation returned to requester with ticket number',
        spacing: { after: 200 },
      }),

      new Paragraph({
        text: 'Network Monitoring Flow',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: '1. Cron job triggers P3.2 Ping Check at scheduled interval\n2. P3.2 Ping Check queries D3.1 Assets for entities with monitoring enabled\n3. P3.2 Ping Check sends ping requests to ATMs and Branches\n4. ATMs/Branches respond with network status\n5. P3.2 Ping Check passes status data to P3.3 Log Status\n6. P3.3 Log Status creates log entry in D4.1 Monitoring Logs\n7. P3.3 Log Status stores detailed metrics in D4.3 Ping Results\n8. P3.3 Log Status triggers P3.4 Detect Incident for status analysis\n9. P3.4 Detect Incident creates incident record in D4.2 Incidents if threshold exceeded\n10. P3.4 Detect Incident triggers P3.5 Create Alert for critical incidents\n11. P3.5 Create Alert auto-creates ticket in D2.1 Tickets\n12. P3.5 Create Alert notifies assigned technician',
        spacing: { after: 200 },
      }),

      new Paragraph({
        text: 'Report Generation Flow',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: '1. User submits report request via P4.1 Select Report\n2. P4.1 Select Report queries D5.1 Templates for available reports\n3. User sets parameters via P4.2 Set Parameters (dates, filters, etc.)\n4. P4.2 Set Parameters passes criteria to P4.3 Query Data\n5. P4.3 Query Data performs multi-table queries across D2 Tickets, D4 Monitoring, D3 Assets\n6. Data stores return raw data to P4.3 Query Data\n7. P4.3 Query Data passes raw data to P4.4 Process Data\n8. P4.4 Process Data aggregates and calculates statistics\n9. P4.4 Process Data passes results to P4.5 Format Report\n10. P4.5 Format Report generates visual report with charts and tables\n11. Visual report displayed to user\n12. User optionally requests export via P4.6 Export\n13. P4.6 Export generates PDF or Excel file and returns to user',
        spacing: { after: 200 },
      }),

      new Paragraph({
        text: 'Approval Workflow Flow',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: '1. P2.1 Create Ticket checks service in D2.4 Services\n2. D2.4 Services indicates approval is required for this service\n3. P7.1 Initiate Approval creates approval record in D2.8 Approvals\n4. P7.1 Initiate Approval sends notification to Email System for Manager\n5. Manager receives email and submits decision via P7.2 Process Approval\n6. P7.2 Process Approval updates approval record in D2.8 Approvals\n7. If approved, P7.2 Process Approval releases ticket to P2.2 Assign Ticket\n8. If rejected, P7.2 Process Approval updates ticket status to CANCELLED\n9. P7.2 Process Approval sends notification to Email System for Requester\n10. Requester receives approval/rejection notification',
        spacing: { after: 200 },
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 8. Data Store Catalog
      new Paragraph({
        text: '8. Data Store Catalog',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),

      new Paragraph({
        text: 'Complete Data Store Reference',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Data Store', bold: true })],
                shading: { fill: 'D3D3D3' },
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Contains', bold: true })],
                shading: { fill: 'D3D3D3' },
                width: { size: 40, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Key Fields', bold: true })],
                shading: { fill: 'D3D3D3' },
                width: { size: 40, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D1: Users')] }),
              new TableCell({ children: [new Paragraph('User accounts, authentication, roles, branches')] }),
              new TableCell({ children: [new Paragraph('id, email, password, role, branchId, isActive')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D2: Tickets')] }),
              new TableCell({ children: [new Paragraph('All service requests and incidents')] }),
              new TableCell({ children: [new Paragraph('id, ticketNumber, status, priority, serviceId, assignedToId')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D2.2: Comments')] }),
              new TableCell({ children: [new Paragraph('Ticket comments and communications')] }),
              new TableCell({ children: [new Paragraph('id, ticketId, userId, content, createdAt')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D2.3: Attachments')] }),
              new TableCell({ children: [new Paragraph('File uploads linked to tickets')] }),
              new TableCell({ children: [new Paragraph('id, ticketId, filename, path, size, mimeType')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D2.4: Services')] }),
              new TableCell({ children: [new Paragraph('Service catalog with SLA definitions')] }),
              new TableCell({ children: [new Paragraph('id, name, categoryId, tier1CategoryId, slaResponseMinutes')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D2.5: Support Groups')] }),
              new TableCell({ children: [new Paragraph('Technical support teams')] }),
              new TableCell({ children: [new Paragraph('id, name, description, members')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D2.6: Tasks')] }),
              new TableCell({ children: [new Paragraph('Checklist items for ticket resolution')] }),
              new TableCell({ children: [new Paragraph('id, ticketId, description, completed, completedBy')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D2.7: SLA Config')] }),
              new TableCell({ children: [new Paragraph('SLA rules and breach thresholds')] }),
              new TableCell({ children: [new Paragraph('id, serviceId, responseMinutes, resolutionMinutes')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D2.8: Approvals')] }),
              new TableCell({ children: [new Paragraph('Multi-level approval workflow')] }),
              new TableCell({ children: [new Paragraph('id, ticketId, level, approverId, status, decision')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D3: Assets')] }),
              new TableCell({ children: [new Paragraph('ATMs, Branches, PC Assets')] }),
              new TableCell({ children: [new Paragraph('id, type, name, code, ipAddress, latitude, longitude')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D4.1: Monitoring Logs')] }),
              new TableCell({ children: [new Paragraph('Status check results over time')] }),
              new TableCell({ children: [new Paragraph('id, entityType, entityId, status, responseTimeMs, checkedAt')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D4.2: Network Incidents')] }),
              new TableCell({ children: [new Paragraph('Network outages and issues')] }),
              new TableCell({ children: [new Paragraph('id, entityType, entityId, status, severity, createdAt')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D4.3: Ping Results')] }),
              new TableCell({ children: [new Paragraph('Detailed ping statistics')] }),
              new TableCell({ children: [new Paragraph('id, entityId, responseTime, packetLoss, timestamp')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D4.4: Monitor Config')] }),
              new TableCell({ children: [new Paragraph('Monitoring parameters and schedules')] }),
              new TableCell({ children: [new Paragraph('id, checkInterval, alertThresholds, enabled')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D5.1: Report Templates')] }),
              new TableCell({ children: [new Paragraph('System and custom report definitions')] }),
              new TableCell({ children: [new Paragraph('id, name, type, query, parameters, module')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D5.2: SLA Logs')] }),
              new TableCell({ children: [new Paragraph('Historical SLA performance data')] }),
              new TableCell({ children: [new Paragraph('id, ticketId, responseTime, resolutionTime, breached')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D5.3: Custom Reports')] }),
              new TableCell({ children: [new Paragraph('User-created reports')] }),
              new TableCell({ children: [new Paragraph('id, userId, name, config, isShared')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D5.4: Report Executions')] }),
              new TableCell({ children: [new Paragraph('Report run history and schedules')] }),
              new TableCell({ children: [new Paragraph('id, reportId, executedAt, parameters, result')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D6: Knowledge Base')] }),
              new TableCell({ children: [new Paragraph('Articles, solutions, documentation')] }),
              new TableCell({ children: [new Paragraph('id, title, content, categoryId, views, helpful')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('D7: Audit Logs')] }),
              new TableCell({ children: [new Paragraph('All system changes and actions')] }),
              new TableCell({ children: [new Paragraph('id, userId, action, entity, oldValue, newValue, timestamp')] }),
            ],
          }),
        ],
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 9. Data Flow Characteristics
      new Paragraph({
        text: '9. Data Flow Characteristics',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),

      new Paragraph({
        text: 'Real-Time Flows',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'These data flows occur immediately in response to user actions or system events:',
        spacing: { after: 100 },
      }),

      new Paragraph({ text: 'Network monitoring (ping checks every 5-30 minutes)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Ticket status updates (immediate propagation)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'User authentication (synchronous validation)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'SLA breach detection (continuous monitoring)', numbering: { level: 0, reference: 'bullet-points' } }),

      new Paragraph({
        text: 'Batch Flows',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'These data flows are processed in groups at scheduled intervals:',
        spacing: { after: 100 },
      }),

      new Paragraph({ text: 'Report generation (on-demand or scheduled)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Data import from legacy systems (manual trigger)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Bulk email notifications (grouped by event)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Database backups (daily scheduled)', numbering: { level: 0, reference: 'bullet-points' } }),

      new Paragraph({
        text: 'Asynchronous Flows',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'These data flows occur in the background without blocking user interactions:',
        spacing: { after: 100 },
      }),

      new Paragraph({ text: 'Email notifications (queued and sent)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'File uploads/downloads (background transfer)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Long-running reports (background processing)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Background monitoring checks (scheduled jobs)', numbering: { level: 0, reference: 'bullet-points' } }),

      new Paragraph({
        text: 'Synchronous Flows',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'These data flows require immediate response and block until completed:',
        spacing: { after: 100 },
      }),

      new Paragraph({ text: 'User login/authentication (wait for validation)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Ticket CRUD operations (immediate confirmation)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Search queries (wait for results)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'API requests (wait for response)', numbering: { level: 0, reference: 'bullet-points' } }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 10. Security & Access Control
      new Paragraph({
        text: '10. Security & Access Control Data Flows',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),

      new Paragraph({
        text: 'Authentication Layer',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'All data flows pass through the authentication layer (P1.0) which provides comprehensive security controls:',
        spacing: { after: 200 },
      }),

      new Paragraph({
        text: '1. Session Validation',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'Every request validates the user session or JWT token to ensure the user is authenticated and authorized.',
        spacing: { after: 100 },
      }),

      new Paragraph({
        text: '2. Role-Based Access Control',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'Permissions are checked based on user roles:',
        spacing: { after: 100 },
      }),

      new Paragraph({ text: 'SUPER_ADMIN: Full system access', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'ADMIN: Administrative functions and all reports', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'MANAGER: Team and branch-level management', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'TECHNICIAN: Ticket assignment and resolution', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'AGENT: Limited ticket creation and viewing', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'USER: Basic ticket creation and status viewing', numbering: { level: 0, reference: 'bullet-points' } }),

      new Paragraph({
        text: '3. Branch-Based Data Filtering',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'Non-admin users can only access data related to their assigned branch, ensuring data isolation between branches.',
        spacing: { after: 100 },
      }),

      new Paragraph({
        text: '4. Audit Logging',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'All access attempts and data modifications are logged to D7 Audit Logs with:',
        spacing: { after: 100 },
      }),

      new Paragraph({ text: 'User ID and timestamp', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Action performed (CREATE, READ, UPDATE, DELETE)', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Entity and entity ID affected', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'Old and new values for updates', numbering: { level: 0, reference: 'bullet-points' } }),
      new Paragraph({ text: 'IP address and user agent', numbering: { level: 0, reference: 'bullet-points' } }),

      new Paragraph({
        text: '5. Rate Limiting',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'API endpoints enforce rate limiting to prevent abuse and ensure system stability. Limits vary by endpoint and user role.',
        spacing: { after: 100 },
      }),

      new Paragraph({
        text: 'Security Data Flow Pattern',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Paragraph({
        text: 'Every secured data flow follows this pattern:',
        spacing: { after: 100 },
      }),

      new Paragraph({
        text: '1. User/External System → Request with JWT Token\n2. P1.0 Authentication Layer → Validate Token\n3. P1.0 Authentication Layer → Check Role Permissions\n4. P1.0 Authentication Layer → Apply Branch Filter (if applicable)\n5. P1.0 Authentication Layer → Log Access to D7 Audit Logs\n6. If Authorized → Forward to Target Process\n7. Target Process → Execute Operation\n8. Target Process → Return Results\n9. P1.0 Authentication Layer → Filter Sensitive Data\n10. Filtered Results → User/External System',
        spacing: { after: 200 },
      }),

      // Final page
      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({
        text: 'Document Control',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: 'Version', bold: true })],
                shading: { fill: 'E7E6E6' },
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Date', bold: true })],
                shading: { fill: 'E7E6E6' },
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Changes', bold: true })],
                shading: { fill: 'E7E6E6' },
                width: { size: 40, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ text: 'Author', bold: true })],
                shading: { fill: 'E7E6E6' },
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('1.0')] }),
              new TableCell({ children: [new Paragraph('Nov 2025')] }),
              new TableCell({ children: [new Paragraph('Initial dataflow diagram documentation')] }),
              new TableCell({ children: [new Paragraph('ServiceDesk Team')] }),
            ],
          }),
        ],
      }),

      new Paragraph({ text: '', spacing: { before: 400 } }),

      new Paragraph({
        text: 'For the most up-to-date information and visual Mermaid diagrams, please refer to:',
        spacing: { after: 100 },
        italics: true,
      }),

      new Paragraph({
        text: '/docs/DATAFLOW-DIAGRAM.md in the project repository',
        italics: true,
      }),

      new Paragraph({ text: '', spacing: { before: 200 } }),

      new Paragraph({
        text: '--- End of Document ---',
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
      }),
    ],
  }],
});

// Generate the document
const Packer = require('docx').Packer;

Packer.toBuffer(doc).then(buffer => {
  const outputPath = path.join(__dirname, 'Dataflow_Diagram_ServiceDesk.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log('✅ Dataflow Diagram Document generated successfully!');
  console.log(`📄 Location: ${outputPath}`);
});
