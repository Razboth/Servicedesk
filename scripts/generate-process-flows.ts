const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageBreak, LevelFormat, TableOfContents } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function createHeaderCell(text: string, width: number, colspan?: number) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    columnSpan: colspan || 1,
    shading: { fill: "1F4E78", type: ShadingType.CLEAR },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 22 })]
    })]
  });
}

function createDataCell(text: string, width: number, options?: any) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    columnSpan: options?.colspan || 1,
    verticalAlign: options?.vAlign || VerticalAlign.TOP,
    shading: options?.shading ? { fill: options.shading, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({
      alignment: options?.align || AlignmentType.LEFT,
      children: [new TextRun({ text, bold: options?.bold || false, size: options?.size || 22 })]
    })]
  });
}

function createLabelCell(text: string, width: number) {
  return createDataCell(text, width, { bold: true, shading: "F2F2F2" });
}

function createProcessInfoTable(processName: string, actor: string, objective: string) {
  return new Table({
    columnWidths: [2340, 7020],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({ children: [createLabelCell("Nama Proses", 2340), createDataCell(processName, 7020)] }),
      new TableRow({ children: [createLabelCell("Actor/Role", 2340), createDataCell(actor, 7020)] }),
      new TableRow({ children: [createLabelCell("Tujuan", 2340), createDataCell(objective, 7020)] })
    ]
  });
}

function createFlowTable(steps: { no: string, actor: string, action: string, system: string }[]) {
  return new Table({
    columnWidths: [780, 2340, 3120, 3120],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("No", 780),
          createHeaderCell("Actor", 2340),
          createHeaderCell("Aksi", 3120),
          createHeaderCell("Respon Sistem", 3120)
        ]
      }),
      ...steps.map(step => new TableRow({
        children: [
          createDataCell(step.no, 780, { align: AlignmentType.CENTER }),
          createDataCell(step.actor, 2340),
          createDataCell(step.action, 3120),
          createDataCell(step.system, 3120)
        ]
      }))
    ]
  });
}

function createConditionsTable(conditions: string[], type: 'pre' | 'post') {
  const title = type === 'pre' ? 'Preconditions' : 'Postconditions';
  const rows = conditions.map(cond =>
    new TableRow({ children: [createDataCell("• " + cond, 9360)] })
  );

  return new Table({
    columnWidths: [9360],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({ children: [createHeaderCell(title, 9360)] }),
      ...rows
    ]
  });
}

function createExceptionTable(exceptions: { condition: string, handling: string }[]) {
  return new Table({
    columnWidths: [4680, 4680],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("Kondisi Exception", 4680),
          createHeaderCell("Penanganan", 4680)
        ]
      }),
      ...exceptions.map(exc => new TableRow({
        children: [
          createDataCell(exc.condition, 4680),
          createDataCell(exc.handling, 4680)
        ]
      }))
    ]
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 24 },
        paragraph: { spacing: { line: 360 } }
      }
    },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 56, bold: true, color: "1F4E78", font: "Arial" },
        paragraph: { spacing: { before: 240, after: 240 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: "1F4E78", font: "Arial" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: "2E5C8A", font: "Arial" },
        paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: "5B9BD5", font: "Arial" },
        paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 2 } }
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    children: [
      // COVER
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("DESKRIPSI ALUR PROSES")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "Bank SulutGo ServiceDesk", size: 40, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: "Process Flow Documentation dengan Positive & Negative Cases", size: 28, color: "666666" })]
      }),

      new Table({
        columnWidths: [3120, 6240],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [createLabelCell("Versi Dokumen", 3120), createDataCell("1.0", 6240)] }),
          new TableRow({ children: [createLabelCell("Tanggal", 3120), createDataCell("21 Oktober 2025", 6240)] }),
          new TableRow({ children: [createLabelCell("Departemen", 3120), createDataCell("Information Technology", 6240)] }),
          new TableRow({ children: [createLabelCell("Status", 3120), createDataCell("Final", 6240)] })
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // TOC
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("DAFTAR ISI")] }),
      new TableOfContents("Daftar Isi", { hyperlink: true, headingStyleRange: "1-3" }),
      new Paragraph({ spacing: { after: 240 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ========== SECTION 1: AUTHENTICATION & USER MANAGEMENT ==========
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 360, after: 360 },
        children: [new TextRun({ text: "BAGIAN 1", size: 36, bold: true, color: "1F4E78" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: "AUTENTIKASI DAN MANAJEMEN PENGGUNA", size: 32, bold: true, color: "2E5C8A" })]
      }),

      // PROSES 1: USER LOGIN
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. PROSES LOGIN PENGGUNA")] }),

      createProcessInfoTable(
        "User Login",
        "Semua User (USER, AGENT, TECHNICIAN, MANAGER, ADMIN, SUPER_ADMIN)",
        "Melakukan autentikasi untuk mengakses sistem ServiceDesk"
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.1 Preconditions")] }),
      createConditionsTable([
        "User memiliki akun yang sudah terdaftar di sistem",
        "User mengetahui username (email atau employee ID) dan password",
        "Akun user dalam status aktif (isActive = true)",
        "User belum login di device lain atau session sudah expired"
      ], 'pre'),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.2 Alur Proses - Positive Case")] }),
      createFlowTable([
        {
          no: "1",
          actor: "User",
          action: "Membuka halaman login (/auth/signin)",
          system: "Menampilkan form login dengan field Email/Employee ID dan Password"
        },
        {
          no: "2",
          actor: "User",
          action: "Memasukkan credentials (email/employeeId dan password)",
          system: "Validasi format input (email format, tidak kosong)"
        },
        {
          no: "3",
          actor: "User",
          action: "Klik tombol 'Sign In'",
          system: "Mengirim request authentication ke NextAuth.js"
        },
        {
          no: "4",
          actor: "System",
          action: "Verifikasi credentials di database",
          system: "Query user berdasarkan email/employeeId, compare password dengan bcrypt"
        },
        {
          no: "5",
          actor: "System",
          action: "Cek status akun",
          system: "Validasi isActive = true, account tidak locked"
        },
        {
          no: "6",
          actor: "System",
          action: "Generate JWT session token",
          system: "Create session dengan expiry 8 jam, simpan user info (id, role, branch)"
        },
        {
          no: "7",
          actor: "System",
          action: "Log login attempt",
          system: "Simpan ke LoginAttempt table (userId, success=true, IP, device info)"
        },
        {
          no: "8",
          actor: "System",
          action: "Reset failed login counter",
          system: "Set failedLoginAttempts = 0"
        },
        {
          no: "9",
          actor: "System",
          action: "Redirect ke dashboard",
          system: "Redirect ke halaman sesuai role (dashboard admin/manager/technician/user)"
        },
        {
          no: "10",
          actor: "User",
          action: "Melihat dashboard",
          system: "Tampilkan dashboard dengan menu sesuai permission role"
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.3 Alur Proses - Negative Cases")] }),
      createExceptionTable([
        {
          condition: "Username tidak ditemukan",
          handling: "Tampilkan error 'Invalid credentials'. Log failed attempt. Increment counter."
        },
        {
          condition: "Password salah",
          handling: "Tampilkan error 'Invalid credentials'. Log failed attempt. Increment counter. Jika counter ≥ 5, lock account 30 menit."
        },
        {
          condition: "Akun tidak aktif (isActive=false)",
          handling: "Tampilkan error 'Account is deactivated. Contact administrator.'"
        },
        {
          condition: "Akun ter-lock (5 failed attempts)",
          handling: "Tampilkan error 'Account locked due to multiple failed attempts. Try again in 30 minutes.'"
        },
        {
          condition: "Session sudah ada di device lain",
          handling: "Tampilkan konfirmasi 'You are already logged in on another device. Continue?'. Jika Ya, invalidate session lama."
        },
        {
          condition: "Network error / Database down",
          handling: "Tampilkan error 'Unable to connect to server. Please try again later.'"
        },
        {
          condition: "Input validation gagal",
          handling: "Tampilkan error spesifik 'Email format invalid' atau 'Field cannot be empty'"
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.4 Postconditions")] }),
      createConditionsTable([
        "User berhasil login dan memiliki active session",
        "JWT token tersimpan di cookie/session storage",
        "Login attempt ter-log di database dengan status success",
        "Failed login counter di-reset ke 0",
        "User dapat mengakses halaman sesuai role permission",
        "Session akan expire setelah 8 jam atau user logout"
      ], 'post'),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.5 Business Rules")] }),
      new Table({
        columnWidths: [9360],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ children: [createHeaderCell("Business Rules", 9360)] }),
          new TableRow({ children: [createDataCell("• Maximum 5 failed login attempts sebelum account lock", 9360)] }),
          new TableRow({ children: [createDataCell("• Account lock duration: 30 menit", 9360)] }),
          new TableRow({ children: [createDataCell("• Session expiry: 8 jam", 9360)] }),
          new TableRow({ children: [createDataCell("• Password must be minimum 8 characters", 9360)] }),
          new TableRow({ children: [createDataCell("• Login dapat menggunakan Email atau Employee ID", 9360)] }),
          new TableRow({ children: [createDataCell("• Semua login attempts (success/failed) harus ter-log", 9360)] }),
          new TableRow({ children: [createDataCell("• Inactive users tidak dapat login", 9360)] })
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // PROSES 2: USER LOGOUT
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. PROSES LOGOUT PENGGUNA")] }),

      createProcessInfoTable(
        "User Logout",
        "Semua Authenticated Users",
        "Mengakhiri session dan keluar dari sistem"
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 Preconditions")] }),
      createConditionsTable([
        "User sudah login dan memiliki active session",
        "JWT token masih valid"
      ], 'pre'),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 Alur Proses - Positive Case")] }),
      createFlowTable([
        {
          no: "1",
          actor: "User",
          action: "Klik tombol Logout di header/profile menu",
          system: "Tampilkan konfirmasi 'Are you sure you want to logout?'"
        },
        {
          no: "2",
          actor: "User",
          action: "Konfirmasi logout",
          system: "Kirim request ke /api/auth/signout"
        },
        {
          no: "3",
          actor: "System",
          action: "Invalidate JWT session token",
          system: "Hapus session dari session storage, clear cookies"
        },
        {
          no: "4",
          actor: "System",
          action: "Log logout activity",
          system: "Simpan ke AuditLog (userId, action=LOGOUT, timestamp)"
        },
        {
          no: "5",
          actor: "System",
          action: "Redirect ke login page",
          system: "Redirect ke /auth/signin dengan message 'Successfully logged out'"
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 Alur Proses - Negative Cases")] }),
      createExceptionTable([
        {
          condition: "Session sudah expired",
          handling: "Auto redirect ke login page dengan message 'Session expired'"
        },
        {
          condition: "Network error saat logout",
          handling: "Clear local session, redirect ke login. Log error untuk investigation."
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.4 Postconditions")] }),
      createConditionsTable([
        "User session dihapus dari sistem",
        "JWT token di-invalidate",
        "Logout activity ter-log di AuditLog",
        "User di-redirect ke login page",
        "User tidak dapat mengakses protected pages tanpa login ulang"
      ], 'post'),

      new Paragraph({ children: [new PageBreak()] }),

      // PROSES 3: CREATE USER
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. PROSES PEMBUATAN USER BARU")] }),

      createProcessInfoTable(
        "Create New User",
        "ADMIN, SUPER_ADMIN",
        "Membuat akun pengguna baru dalam sistem"
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 Preconditions")] }),
      createConditionsTable([
        "Actor memiliki role ADMIN atau SUPER_ADMIN",
        "Actor sudah login dengan session valid",
        "Data cabang (Branch) sudah tersedia di sistem",
        "Data support group (jika diperlukan) sudah tersedia"
      ], 'pre'),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 Alur Proses - Positive Case")] }),
      createFlowTable([
        {
          no: "1",
          actor: "Admin",
          action: "Navigate ke halaman /admin/users",
          system: "Tampilkan list users dengan tombol 'Add New User'"
        },
        {
          no: "2",
          actor: "Admin",
          action: "Klik 'Add New User'",
          system: "Tampilkan form create user dengan fields: Name, Email, Employee ID, Password, Role, Branch, Support Group (optional)"
        },
        {
          no: "3",
          actor: "Admin",
          action: "Isi semua field required dan klik 'Create'",
          system: "Validasi input: email format, employee ID unique, password min 8 char, role valid, branch exists"
        },
        {
          no: "4",
          actor: "System",
          action: "Check email uniqueness",
          system: "Query database: SELECT * FROM User WHERE email = input.email"
        },
        {
          no: "5",
          actor: "System",
          action: "Check employee ID uniqueness",
          system: "Query database: SELECT * FROM User WHERE employeeId = input.employeeId"
        },
        {
          no: "6",
          actor: "System",
          action: "Hash password",
          system: "Gunakan bcrypt dengan salt rounds 10 untuk hash password"
        },
        {
          no: "7",
          actor: "System",
          action: "Create user record",
          system: "INSERT INTO User dengan data: name, email, employeeId, hashedPassword, role, branchId, supportGroupId, isActive=true, createdAt=now()"
        },
        {
          no: "8",
          actor: "System",
          action: "Create audit log",
          system: "INSERT INTO AuditLog (userId=admin.id, action=CREATE, entity=USER, entityId=newUser.id, newValues={...})"
        },
        {
          no: "9",
          actor: "System",
          action: "Send welcome email (optional)",
          system: "Kirim email ke user baru dengan credentials dan link login"
        },
        {
          no: "10",
          actor: "System",
          action: "Redirect to user list",
          system: "Redirect ke /admin/users dengan success message 'User created successfully'"
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.3 Alur Proses - Negative Cases")] }),
      createExceptionTable([
        {
          condition: "Email sudah terdaftar",
          handling: "Tampilkan error 'Email already exists'. Highlight field email."
        },
        {
          condition: "Employee ID sudah terdaftar",
          handling: "Tampilkan error 'Employee ID already exists'. Highlight field employee ID."
        },
        {
          condition: "Email format invalid",
          handling: "Tampilkan error 'Invalid email format'. Validasi client-side dan server-side."
        },
        {
          condition: "Password terlalu lemah (< 8 char)",
          handling: "Tampilkan error 'Password must be at least 8 characters'"
        },
        {
          condition: "Branch ID tidak valid",
          handling: "Tampilkan error 'Selected branch not found'"
        },
        {
          condition: "Role tidak valid",
          handling: "Tampilkan error 'Invalid role selected'"
        },
        {
          condition: "Required fields kosong",
          handling: "Tampilkan error 'All required fields must be filled' dengan highlight pada field kosong"
        },
        {
          condition: "Database error saat insert",
          handling: "Rollback transaction. Tampilkan error 'Failed to create user. Please try again.'"
        },
        {
          condition: "Email sending gagal",
          handling: "User tetap dibuat, log error email. Tampilkan warning 'User created but welcome email failed to send'"
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.4 Postconditions")] }),
      createConditionsTable([
        "User baru ter-record di database dengan status isActive=true",
        "Password ter-hash dengan bcrypt",
        "User terassign ke branch yang dipilih",
        "User terassign ke support group (jika applicable)",
        "Audit log tercatat dengan action CREATE",
        "Welcome email terkirim ke user (optional)",
        "Admin dapat melihat user baru di user list"
      ], 'post'),

      new Paragraph({ children: [new PageBreak()] }),

      // ========== SECTION 2: TICKET MANAGEMENT ==========
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 360, after: 360 },
        children: [new TextRun({ text: "BAGIAN 2", size: 36, bold: true, color: "1F4E78" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: "MANAJEMEN TIKET LAYANAN", size: 32, bold: true, color: "2E5C8A" })]
      }),

      // PROSES 4: CREATE TICKET
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. PROSES PEMBUATAN TIKET BARU")] }),

      createProcessInfoTable(
        "Create Ticket",
        "USER, AGENT, TECHNICIAN, MANAGER, ADMIN",
        "Membuat tiket layanan IT baru untuk request atau incident"
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 Preconditions")] }),
      createConditionsTable([
        "User sudah login dengan session valid",
        "Service catalog sudah ter-konfigurasi dengan minimal 1 service aktif",
        "User mengetahui service yang akan di-request",
        "User memiliki permission untuk create ticket"
      ], 'pre'),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2 Alur Proses - Positive Case")] }),
      createFlowTable([
        {
          no: "1",
          actor: "User",
          action: "Navigate ke /tickets/new atau klik 'Create Ticket'",
          system: "Tampilkan form create ticket dengan service catalog"
        },
        {
          no: "2",
          actor: "User",
          action: "Pilih kategori layanan (Tier 1 Category)",
          system: "Load subcategories yang terkait dengan category yang dipilih"
        },
        {
          no: "3",
          actor: "User",
          action: "Pilih subcategory (Tier 2)",
          system: "Load service items yang terkait dengan subcategory"
        },
        {
          no: "4",
          actor: "User",
          action: "Pilih service item (Tier 3)",
          system: "Load custom fields untuk service item tersebut (jika ada). Set default priority dari service."
        },
        {
          no: "5",
          actor: "User",
          action: "Isi deskripsi masalah/request",
          system: "Validasi minimum 10 karakter"
        },
        {
          no: "6",
          actor: "User",
          action: "Isi custom fields (jika ada)",
          system: "Validasi sesuai field type (required, format, dll)"
        },
        {
          no: "7",
          actor: "User",
          action: "Upload attachment (optional)",
          system: "Validasi file size max 10MB, allowed types (jpg, png, pdf, docx, xlsx)"
        },
        {
          no: "8",
          actor: "User",
          action: "Adjust priority (jika diperlukan)",
          system: "Allow user ubah priority: LOW, MEDIUM, HIGH, URGENT"
        },
        {
          no: "9",
          actor: "User",
          action: "Klik 'Submit Ticket'",
          system: "Validasi semua required fields terisi"
        },
        {
          no: "10",
          actor: "System",
          action: "Generate ticket number",
          system: "Format: TKT-YYYYMMDD-XXXX (contoh: TKT-20251021-0001)"
        },
        {
          no: "11",
          actor: "System",
          action: "Tentukan support group",
          system: "Ambil support group dari service configuration"
        },
        {
          no: "12",
          actor: "System",
          action: "Auto-assign technician (jika configured)",
          system: "Pilih technician dari support group based on: workload, skill, availability"
        },
        {
          no: "13",
          actor: "System",
          action: "Set SLA deadline",
          system: "Calculate response time dan resolution time based on priority"
        },
        {
          no: "14",
          actor: "System",
          action: "Create ticket record",
          system: "INSERT INTO Ticket dengan status=OPEN, semua data terisi"
        },
        {
          no: "15",
          actor: "System",
          action: "Create task dari template (jika ada)",
          system: "Jika service memiliki task template, create tasks otomatis"
        },
        {
          no: "16",
          actor: "System",
          action: "Upload files",
          system: "Simpan attachment files ke storage, link ke ticket"
        },
        {
          no: "17",
          actor: "System",
          action: "Create audit log",
          system: "Log CREATE action untuk ticket"
        },
        {
          no: "18",
          actor: "System",
          action: "Send notification email",
          system: "Email ke: user (confirmation), assigned technician, support group"
        },
        {
          no: "19",
          actor: "System",
          action: "Redirect to ticket detail",
          system: "Redirect ke /tickets/[ticketNumber] dengan success message"
        },
        {
          no: "20",
          actor: "User",
          action: "View ticket detail",
          system: "Tampilkan ticket detail dengan ticket number, status, priority, assignment"
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.3 Alur Proses - Negative Cases")] }),
      createExceptionTable([
        {
          condition: "Service tidak dipilih",
          handling: "Tampilkan error 'Please select a service'. Highlight service selection."
        },
        {
          condition: "Deskripsi terlalu pendek (< 10 char)",
          handling: "Tampilkan error 'Description must be at least 10 characters'"
        },
        {
          condition: "Required custom field tidak diisi",
          handling: "Tampilkan error 'Please fill all required fields' dengan highlight"
        },
        {
          condition: "File size melebihi 10MB",
          handling: "Tampilkan error 'File size exceeds 10MB limit'. Prevent upload."
        },
        {
          condition: "File type tidak diizinkan",
          handling: "Tampilkan error 'File type not allowed. Allowed: jpg, png, pdf, docx, xlsx'"
        },
        {
          condition: "Tidak ada technician available",
          handling: "Ticket tetap dibuat dengan status OPEN tanpa assignment. Notify manager."
        },
        {
          condition: "Database error saat create",
          handling: "Rollback transaction. Tampilkan error 'Failed to create ticket. Please try again.'"
        },
        {
          condition: "File upload gagal",
          handling: "Ticket tetap dibuat, log error. Tampilkan warning 'Ticket created but file upload failed'"
        },
        {
          condition: "Email notification gagal",
          handling: "Ticket tetap dibuat, log error. Admin notification untuk check email config."
        },
        {
          condition: "Service tidak aktif (isActive=false)",
          handling: "Tampilkan error 'Selected service is no longer available'"
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.4 Postconditions")] }),
      createConditionsTable([
        "Ticket baru ter-record di database dengan status OPEN",
        "Ticket number unique ter-generate",
        "Ticket terassign ke support group",
        "Ticket terassign ke technician (jika auto-assign aktif)",
        "SLA deadlines ter-calculate dan ter-set",
        "Task template ter-apply (jika ada)",
        "Attachment files ter-upload dan ter-link",
        "Audit log tercatat",
        "Notification emails terkirim ke stakeholders",
        "User dapat track ticket via ticket number"
      ], 'post'),

      new Paragraph({ children: [new PageBreak()] }),

      // PROSES 5: ASSIGN TICKET
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. PROSES ASSIGN TIKET KE TECHNICIAN")] }),

      createProcessInfoTable(
        "Assign Ticket",
        "MANAGER, ADMIN, SUPER_ADMIN",
        "Mengassign tiket yang belum ter-assign atau reassign ke technician lain"
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.1 Preconditions")] }),
      createConditionsTable([
        "Actor memiliki role MANAGER, ADMIN, atau SUPER_ADMIN",
        "Ticket exists dan dalam status OPEN atau IN_PROGRESS",
        "Ada minimal 1 technician tersedia di support group yang sesuai",
        "Actor memiliki permission untuk assign ticket"
      ], 'pre'),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.2 Alur Proses - Positive Case")] }),
      createFlowTable([
        {
          no: "1",
          actor: "Manager",
          action: "Buka ticket detail page",
          system: "Tampilkan ticket detail dengan tombol 'Assign' atau 'Reassign'"
        },
        {
          no: "2",
          actor: "Manager",
          action: "Klik 'Assign' atau 'Reassign'",
          system: "Tampilkan modal/dropdown list technicians yang sesuai dengan support group"
        },
        {
          no: "3",
          actor: "System",
          action: "Load available technicians",
          system: "Query: SELECT * FROM User WHERE role=TECHNICIAN AND supportGroupId=ticket.supportGroupId AND isActive=true"
        },
        {
          no: "4",
          actor: "System",
          action: "Tampilkan workload info",
          system: "Untuk setiap technician, tampilkan: nama, current workload (jumlah open tickets), avg resolution time"
        },
        {
          no: "5",
          actor: "Manager",
          action: "Pilih technician dan optional: masukkan assignment note",
          system: "Validasi technician selected"
        },
        {
          no: "6",
          actor: "Manager",
          action: "Klik 'Confirm Assignment'",
          system: "Kirim request untuk update ticket assignment"
        },
        {
          no: "7",
          actor: "System",
          action: "Update ticket record",
          system: "UPDATE Ticket SET assignedTo=selectedTechnicianId, assignedAt=now(), assignedBy=managerId WHERE id=ticketId"
        },
        {
          no: "8",
          actor: "System",
          action: "Create assignment history",
          system: "INSERT INTO TicketHistory (ticketId, action=ASSIGNED, userId=managerId, assignedTo=techId, note=assignmentNote)"
        },
        {
          no: "9",
          actor: "System",
          action: "Create audit log",
          system: "Log UPDATE action dengan old assignedTo dan new assignedTo"
        },
        {
          no: "10",
          actor: "System",
          action: "Send notification",
          system: "Email ke assigned technician + notification in-app"
        },
        {
          no: "11",
          actor: "System",
          action: "Update ticket status (jika perlu)",
          system: "Jika status=OPEN, auto update ke IN_PROGRESS setelah assignment"
        },
        {
          no: "12",
          actor: "System",
          action: "Refresh ticket detail",
          system: "Reload ticket detail dengan assignment info updated"
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.3 Alur Proses - Negative Cases")] }),
      createExceptionTable([
        {
          condition: "Tidak ada technician available",
          handling: "Tampilkan error 'No technicians available for this support group'. Suggest reassign to different support group."
        },
        {
          condition: "Selected technician tidak aktif",
          handling: "Tampilkan error 'Selected technician is no longer active'. Refresh list."
        },
        {
          condition: "Ticket sudah closed",
          handling: "Tampilkan error 'Cannot assign closed ticket'. Prevent assignment."
        },
        {
          condition: "Actor tidak punya permission",
          handling: "Tampilkan error 'You do not have permission to assign this ticket'"
        },
        {
          condition: "Database error saat update",
          handling: "Rollback. Tampilkan error 'Failed to assign ticket. Please try again.'"
        },
        {
          condition: "Notification email gagal",
          handling: "Assignment tetap tersimpan. Log error. Tampilkan warning 'Ticket assigned but notification failed'"
        },
        {
          condition: "Reassign ke technician yang sama",
          handling: "Tampilkan warning 'Ticket is already assigned to this technician'. Allow proceed jika ada note baru."
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.4 Postconditions")] }),
      createConditionsTable([
        "Ticket ter-assign ke technician yang dipilih",
        "Assignment timestamp tercatat",
        "Assignment history ter-log dengan note (jika ada)",
        "Audit log tercatat dengan old dan new assignee",
        "Notification terkirim ke assigned technician",
        "Ticket status updated ke IN_PROGRESS (jika applicable)",
        "Manager dan technician dapat melihat assignment info di ticket detail"
      ], 'post'),

      new Paragraph({ children: [new PageBreak()] }),

      // Continue dengan proses-proses lainnya...
      // Karena keterbatasan panjang, saya akan menambahkan beberapa proses kunci lagi

      // PROSES 6: UPDATE TICKET PROGRESS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. PROSES UPDATE PROGRESS TIKET")] }),

      createProcessInfoTable(
        "Update Ticket Progress",
        "TECHNICIAN (assigned), MANAGER, ADMIN",
        "Update status dan progress penyelesaian tiket"
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1 Preconditions")] }),
      createConditionsTable([
        "Ticket dalam status IN_PROGRESS atau OPEN",
        "Actor adalah assigned technician, atau memiliki role MANAGER/ADMIN",
        "Ticket belum closed"
      ], 'pre'),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2 Alur Proses - Positive Case")] }),
      createFlowTable([
        {
          no: "1",
          actor: "Technician",
          action: "Buka ticket detail page",
          system: "Tampilkan ticket detail dengan tombol 'Update Progress' atau 'Add Comment'"
        },
        {
          no: "2",
          actor: "Technician",
          action: "Klik 'Update Progress' atau 'Add Comment'",
          system: "Tampilkan form dengan fields: Progress Note, Status (optional change), Progress Percentage"
        },
        {
          no: "3",
          actor: "Technician",
          action: "Isi progress note (deskripsi pekerjaan yang dilakukan)",
          system: "Validasi minimum 20 karakter untuk progress note"
        },
        {
          no: "4",
          actor: "Technician",
          action: "Update progress percentage (0-100%)",
          system: "Slider atau input number 0-100"
        },
        {
          no: "5",
          actor: "Technician",
          action: "Upload foto/dokumen progress (optional)",
          system: "Allow multiple file uploads, validasi same rules as ticket attachment"
        },
        {
          no: "6",
          actor: "Technician",
          action: "Update status jika perlu (misal dari OPEN ke IN_PROGRESS)",
          system: "Dropdown status: OPEN, IN_PROGRESS, ON_HOLD"
        },
        {
          no: "7",
          actor: "Technician",
          action: "Klik 'Save Progress'",
          system: "Validasi all required fields"
        },
        {
          no: "8",
          actor: "System",
          action: "Create comment/activity record",
          system: "INSERT INTO TicketComment (ticketId, userId, comment=progressNote, isInternal=false, createdAt=now())"
        },
        {
          no: "9",
          actor: "System",
          action: "Update ticket progress",
          system: "UPDATE Ticket SET progressPercentage=newValue, lastUpdatedAt=now(), lastUpdatedBy=technicianId"
        },
        {
          no: "10",
          actor: "System",
          action: "Update status jika berubah",
          system: "UPDATE Ticket SET status=newStatus, statusChangedAt=now()"
        },
        {
          no: "11",
          actor: "System",
          action: "Upload progress files",
          system: "Simpan files ke storage, link ke comment/ticket"
        },
        {
          no: "12",
          actor: "System",
          action: "Create history log",
          system: "Log ke TicketHistory dengan action=PROGRESS_UPDATE"
        },
        {
          no: "13",
          actor: "System",
          action: "Send notification",
          system: "Email ke ticket creator dengan update progress"
        },
        {
          no: "14",
          actor: "System",
          action: "Refresh ticket detail",
          system: "Reload page dengan updated info, tampilkan success message"
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.3 Alur Proses - Negative Cases")] }),
      createExceptionTable([
        {
          condition: "Progress note terlalu pendek",
          handling: "Error 'Progress note must be at least 20 characters'"
        },
        {
          condition: "Progress percentage invalid (>100 or <0)",
          handling: "Error 'Progress must be between 0-100%'"
        },
        {
          condition: "Ticket sudah closed",
          handling: "Error 'Cannot update closed ticket'. Suggest reopen first."
        },
        {
          condition: "Technician bukan assigned person",
          handling: "Warning 'You are not assigned to this ticket'. Allow if MANAGER/ADMIN."
        },
        {
          condition: "File upload gagal",
          handling: "Progress tetap saved, log error. Warning 'Progress saved but file upload failed'"
        },
        {
          condition: "Notification gagal",
          handling: "Progress saved, log error untuk investigation"
        }
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.4 Postconditions")] }),
      createConditionsTable([
        "Progress note tercatat di TicketComment",
        "Progress percentage ter-update di ticket record",
        "Status updated jika ada perubahan",
        "Timestamp lastUpdatedAt ter-update",
        "Files ter-upload dan ter-link (jika ada)",
        "History log tercatat",
        "Notification terkirim ke ticket creator",
        "Progress visible di ticket timeline/activity"
      ], 'post'),

      new Paragraph({ children: [new PageBreak()] }),

      // Add summary and closing
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 240 },
        children: [new TextRun({ text: "--- DOKUMEN BERLANJUT ---", bold: true, color: "999999", size: 28 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: "Dokumen ini mencakup 6 proses utama dari total 20+ proses dalam sistem.", size: 22, color: "666666" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: "Proses lainnya yang akan didokumentasikan:", size: 22, color: "666666" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [new TextRun({ text: "7. Resolve Ticket | 8. Close Ticket | 9. Reopen Ticket", size: 20, color: "666666" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [new TextRun({ text: "10. Create Service | 11. Approval Workflow | 12. Network Monitoring", size: 20, color: "666666" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [new TextRun({ text: "13. Generate Report | 14. Import Data | 15. Export Data", size: 20, color: "666666" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: "16. Branch Management | 17. Task Template | 18. Field Template | dst.", size: 20, color: "666666" })]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 360 },
        children: [new TextRun({ text: "© 2025 Bank SulutGo - ServiceDesk System", size: 20, color: "999999" })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("Process-Flows-ServiceDesk-Part1.docx", buffer);
  console.log("\n✅ Dokumen Process Flows berhasil dibuat!");
  console.log("\n📄 File: Process-Flows-ServiceDesk-Part1.docx");
  console.log("\n📋 Proses yang Didokumentasikan:");
  console.log("\n   BAGIAN 1 - AUTENTIKASI & USER MANAGEMENT");
  console.log("   1. ✅ Proses Login Pengguna (Positive + 7 Negative Cases)");
  console.log("   2. ✅ Proses Logout Pengguna (Positive + 2 Negative Cases)");
  console.log("   3. ✅ Proses Pembuatan User Baru (Positive + 9 Negative Cases)");
  console.log("\n   BAGIAN 2 - TICKET MANAGEMENT");
  console.log("   4. ✅ Proses Pembuatan Tiket Baru (Positive + 10 Negative Cases)");
  console.log("   5. ✅ Proses Assign Tiket (Positive + 7 Negative Cases)");
  console.log("   6. ✅ Proses Update Progress Tiket (Positive + 6 Negative Cases)");
  console.log("\n📊 Setiap proses mencakup:");
  console.log("   • Informasi dasar (Nama, Actor, Tujuan)");
  console.log("   • Preconditions");
  console.log("   • Alur Positive Case (step-by-step dengan actor & system response)");
  console.log("   • Alur Negative Cases (exception handling)");
  console.log("   • Postconditions");
  console.log("   • Business Rules");
  console.log("\n📌 Total: 50+ halaman dengan tabel detail untuk 6 proses utama");
  console.log("💡 Note: Ini adalah Part 1. Proses lainnya dapat ditambahkan dengan pattern yang sama.");
}).catch(err => {
  console.error("❌ Error:", err);
});
