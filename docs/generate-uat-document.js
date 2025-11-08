const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
        HeadingLevel, LevelFormat, PageBreak } = require('docx');
const fs = require('fs');

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal",
        run: { size: 32, bold: true, color: "1F4E78", font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal",
        run: { size: 28, bold: true, color: "2E75B5", font: "Arial" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal",
        run: { size: 24, bold: true, color: "5B9BD5", font: "Arial" },
        paragraph: { spacing: { before: 120, after: 80 }, outlineLevel: 2 } }
    ]
  },
  numbering: {
    config: [
      { reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "test-steps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    children: [
      // Cover Page
      new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER,
        spacing: { before: 2880 },
        children: [new TextRun({ text: "User Acceptance Testing (UAT)", bold: true, size: 56 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "Bank SulutGo ServiceDesk", size: 32, color: "1F4E78" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "Test Plan & Scenarios", size: 28, italics: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 960 },
        children: [new TextRun({ text: `Version 1.0 | ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 22 })] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Document Information
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Document Information")] }),
      new Table({
        columnWidths: [3120, 6240],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Document Title", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 6240, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("UAT Test Plan - ServiceDesk System")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Version", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 6240, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("1.0")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Project", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 6240, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Bank SulutGo ServiceDesk")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Scope", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 6240, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Authentication")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User CRUD Operations")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket Creation")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket Approval Workflow")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Technician Flow")] })
              ] })
          ] })
        ]
      }),

      new Paragraph({ spacing: { before: 240 } }),

      // Test Status Legend
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Status Legend")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "PASS", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Test executed successfully, all expected results achieved")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "FAIL", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Test failed, actual results do not match expected results")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFEB9C", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "BLOCKED", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Test cannot be executed due to dependencies or environment issues")] })] })
          ] })
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // MODULE 1: AUTHENTICATION
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Authentication Testing")] }),

      // Test Case 1.1
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 1.1: Successful Login")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("AUTH-001")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("High")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Preconditions", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User account exists in the system")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User is not currently logged in")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Account is active and not locked")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Navigate to login page (http://localhost:4000/auth/signin)")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Enter valid username")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Enter valid password")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Sign In" button')] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User redirected to dashboard immediately (< 2 seconds)")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Welcome message displays with correct user name")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Session created successfully with JWT token")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User sees appropriate menu items based on role")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Login attempt logged in audit trail")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("System timeout or network error")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Database connection failure")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("JWT token generation fails")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User stuck on loading screen")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Error message not displayed to user")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ spacing: { before: 240 } }),

      // Test Case 1.2
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 1.2: Failed Login - Invalid Credentials")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("AUTH-002")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("High")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Navigate to login page")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Enter valid username")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Enter incorrect password")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Sign In" button')] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun('Clear error message: "Invalid username or password"')] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Login attempt counter increments by 1")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Failed login logged in audit trail")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User remains on login page")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Password field cleared for security")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("No error message shown to user")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("System grants access despite wrong password")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Application crashes or shows white screen")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Failed attempt not logged")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Detailed error reveals system information")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ spacing: { before: 240 } }),

      // Test Case 1.3
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 1.3: Account Lockout After Failed Attempts")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("AUTH-003")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("High")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Attempt login with wrong password (attempt 1-4)")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Verify error message after each attempt")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Attempt login with wrong password (5th attempt)")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Attempt login with correct password")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("After 5 failed attempts, account locked for 30 minutes")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun('Clear message: "Account locked due to multiple failed login attempts"')] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Lockout time displayed to user")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Admin notified of lockout via system")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Account automatically unlocks after 30 minutes")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Account never locks despite multiple attempts")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Account locked permanently with no unlock mechanism")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User not informed why login is denied")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Lockout affects all users in the system")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Admin cannot manually unlock account")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ spacing: { before: 240 } }),

      // Test Case 1.4
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 1.4: Logout Functionality")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("AUTH-004")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("High")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Preconditions", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("User is successfully logged in")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Navigate to any page in the application")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Click user menu in top navigation")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Logout" button')] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Attempt to navigate back to previous page")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User redirected to login page (/auth/signin)")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Session destroyed completely")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("JWT token invalidated")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Browser back button does not restore session")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Logout action logged in audit trail")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User redirected to external domain (hd.bsg.id) - FIXED")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Session remains active after logout")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User can access protected pages without login")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Logout button unresponsive")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Error during logout process")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // MODULE 2: USER CRUD
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. User CRUD Operations Testing")] }),

      // Test Case 2.1
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 2.1: Create New User")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("USER-001")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("High")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Preconditions", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Logged in as ADMIN or SUPER_ADMIN")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Navigate to Admin > Users")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Add New User" button')] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Fill in all required fields: name, email, username, role, branch")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Set initial password")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Save" button')] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User created successfully with all correct attributes")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun('Success message: "User created successfully"')] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User appears in users list immediately")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Password hashed securely in database")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User can login with provided credentials")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Audit log entry created")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User created with duplicate email/username")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Password stored in plain text")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User created but cannot login")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Required fields validation not working")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User created with wrong role/branch")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Database error not handled gracefully")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ spacing: { before: 240 } }),

      // Test Case 2.2
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 2.2: Edit Existing User")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("USER-002")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Navigate to Admin > Users")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Click edit icon on any user row")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Modify name, role, or branch")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Update" button')] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Changes saved successfully")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Updated data reflected immediately")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User permissions updated if role changed")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Audit log records the change")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Changes not saved to database")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User loses access unexpectedly")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Active user sessions not updated")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Data corruption or partial update")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ spacing: { before: 240 } }),

      // Test Case 2.3
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 2.3: Deactivate User")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("USER-003")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Navigate to Admin > Users")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Deactivate" button for active user')] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Confirm deactivation")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Attempt to login as deactivated user")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User status changed to inactive")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Active sessions terminated immediately")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User cannot login")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User data preserved (soft delete)")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Tickets assigned to user remain intact")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User data permanently deleted")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("User can still login")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Assigned tickets become orphaned")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Cannot reactivate user")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // MODULE 3: TICKET CREATION
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Ticket Creation Testing")] }),

      // Test Case 3.1
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 3.1: Create Standard Ticket")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("TICKET-001")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("High")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Preconditions", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Logged in as USER, AGENT, or higher")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Navigate to "Create Ticket" or click "New Ticket" button')] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Select service category (e.g., Hardware Issues)")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Select specific service (e.g., Printer Issues)")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Set priority (e.g., Medium)")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Enter subject and detailed description")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Add attachment (optional)")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Submit" button')] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket created with unique ticket number (e.g., TK-2024-00123)")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Status automatically set to OPEN")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Auto-assigned to appropriate support group")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Email notification sent to requester with ticket details")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("SLA timer starts automatically")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Success message with ticket number displayed")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket appears in user's ticket list")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket creation fails without error message")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Duplicate ticket numbers generated")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket created but not visible to user")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("File attachment fails silently")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("SLA not calculated correctly")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket assigned to wrong support group")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Email notification not sent")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ spacing: { before: 240 } }),

      // Test Case 3.2
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 3.2: Create Ticket with Custom Fields")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("TICKET-002")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Create new ticket")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Select service with custom fields (e.g., Hardware Procurement)")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Fill required custom fields (Asset ID, Serial Number, etc.)")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Submit ticket")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Custom fields render correctly based on service")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Field validation works (required, format, etc.)")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Custom field data saved with ticket")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Data visible in ticket details")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Custom fields not displayed")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Validation not enforced")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Data not saved or corrupted")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Form submission fails")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // MODULE 4: TICKET APPROVAL
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. Ticket Approval Workflow Testing")] }),

      // Test Case 4.1
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 4.1: Single Level Approval")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("APPROVAL-001")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("High")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Preconditions", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Service configured for approval workflow")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Approver assigned to service")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Create ticket for service requiring approval")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Submit ticket")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Login as assigned approver")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Navigate to pending approvals")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Review ticket details")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Approve" button')] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Add approval comments")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket status changes from PENDING_APPROVAL to OPEN")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Approval record created with timestamp and comments")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket auto-assigned to appropriate support group")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Email notifications sent to requester and assigned technician")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("SLA timer starts after approval")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Approval logged in audit trail")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Approval doesn't change ticket status")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket assigned before approval")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Multiple approvers can approve same ticket")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Notifications not sent")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Approval comments not saved")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("SLA not calculated correctly")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ spacing: { before: 240 } }),

      // Test Case 4.2
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 4.2: Rejection Flow")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("APPROVAL-002")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Create ticket requiring approval")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Login as approver")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Reject" button')] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Enter rejection reason")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket status changes to REJECTED")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Rejection reason saved and visible")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Email sent to requester with reason")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket not assigned to technician")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Requester can view rejection reason")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Rejection without reason allowed")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket assigned despite rejection")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Requester not notified")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket permanently closed")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // MODULE 5: TECHNICIAN FLOW
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. Technician Flow Testing")] }),

      // Test Case 5.1
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 5.1: Ticket Assignment and Claim")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("TECH-001")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("High")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Preconditions", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Logged in as TECHNICIAN")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Unassigned ticket exists in support group")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Navigate to workbench or tickets list")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("View unassigned tickets")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Claim" button on a ticket')] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Confirm claim action")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket assigned to technician immediately")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket status changes to IN_PROGRESS")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket appears in technician's assigned tickets")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Email notification sent to requester")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Assignment logged in ticket history")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Other technicians cannot claim same ticket")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Multiple technicians claim same ticket")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket status not updated")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Assignment not saved")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Technician cannot view ticket after claiming")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Claim button remains active")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ spacing: { before: 240 } }),

      // Test Case 5.2
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 5.2: Add Comments and Updates")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("TECH-002")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Open assigned ticket")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Scroll to comments section")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Enter update or question for requester")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Optionally add attachment")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Add Comment" button')] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Comment added with timestamp and author name")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Attachment uploaded and linked to comment")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Email notification sent to requester")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Comment visible to all authorized users")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket updated timestamp refreshed")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Comment not saved")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Attachment fails without notification")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Comment saved but not visible")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Email notification not sent")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Wrong author attributed")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ spacing: { before: 240 } }),

      // Test Case 5.3
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Case 5.3: Resolve and Close Ticket")] }),
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test ID", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("TECH-003")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Steps", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Open ticket assigned to technician")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Complete task checklist if applicable")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun('Click "Resolve" button')] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Enter resolution notes")] }),
                new Paragraph({ numbering: { reference: "test-steps", level: 0 },
                  children: [new TextRun("Submit resolution")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "C6EFCE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Best Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket status changes to RESOLVED")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Resolution notes saved with timestamp")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("SLA compliance calculated and recorded")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Email sent to requester with resolution details")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Resolution time tracked")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Requester can close or reopen ticket")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Auto-close after 7 days if no response")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "FFC7CE", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Worst Case", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Ticket resolved without completing tasks")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Resolution notes not saved")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Status not updated")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("SLA not calculated")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Requester not notified")] }),
                new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
                  children: [new TextRun("Cannot reopen if needed")] })
              ] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Test Result", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 7020, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("[ ] PASS  [ ] FAIL  [ ] BLOCKED")] })] })
          ] })
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Test Summary Section
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Test Execution Summary")] }),

      new Table({
        columnWidths: [2340, 2340, 2340, 2340],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ tableHeader: true, children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "1F4E78", type: ShadingType.CLEAR },
              children: [new Paragraph({ alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Module", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "1F4E78", type: ShadingType.CLEAR },
              children: [new Paragraph({ alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Total Tests", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "1F4E78", type: ShadingType.CLEAR },
              children: [new Paragraph({ alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Passed", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "1F4E78", type: ShadingType.CLEAR },
              children: [new Paragraph({ alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Status", bold: true, color: "FFFFFF" })] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Authentication")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("4")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("_")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("Pending")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("User CRUD")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("3")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("_")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("Pending")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Ticket Creation")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("2")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("_")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("Pending")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Ticket Approval")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("2")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("_")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("Pending")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Technician Flow")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("3")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("_")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("Pending")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "E7E6E6", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "E7E6E6", type: ShadingType.CLEAR },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "14", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "E7E6E6", type: ShadingType.CLEAR },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "_", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
              shading: { fill: "E7E6E6", type: ShadingType.CLEAR },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "-", bold: true })] })] })
          ] })
        ]
      }),

      new Paragraph({ spacing: { before: 480 } }),

      // Sign-off Section
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Test Sign-off")] }),
      new Table({
        columnWidths: [3120, 3120, 3120],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Role", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Signature & Date", bold: true })] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Test Lead")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun("")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun("")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("QA Manager")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun("")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun("")] })] })
          ] }),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun("Project Manager")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun("")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA },
              children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun("")] })] })
          ] })
        ]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/Users/razboth/Documents/Project/Servicedesk/docs/UAT_TestPlan_ServiceDesk.docx", buffer);
  console.log("✅ UAT Document generated successfully!");
  console.log("📄 Location: /Users/razboth/Documents/Project/Servicedesk/docs/UAT_TestPlan_ServiceDesk.docx");
});
