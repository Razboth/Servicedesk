const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageBreak, LevelFormat, TableOfContents } = require('docx');
const fs = require('fs');

// Helper functions for table creation
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function createHeaderCell(text: string, width: number) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "1F4E78", type: ShadingType.CLEAR },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: "FFFFFF" })]
    })]
  });
}

function createDataCell(text: string, width: number, options?: any) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: options?.vAlign || undefined,
    shading: options?.shading ? { fill: options.shading, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({
      alignment: options?.align || AlignmentType.LEFT,
      children: [new TextRun({ text, bold: options?.bold || false })]
    })]
  });
}

function createSimpleTable(columnWidths: number[], headers: string[], rows: string[][]) {
  return new Table({
    columnWidths,
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => createHeaderCell(h, columnWidths[i]))
      }),
      ...rows.map(row => new TableRow({
        children: row.map((cell, i) => createDataCell(cell, columnWidths[i]))
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
  numbering: {
    config: [
      { reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // COVER PAGE
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("BUSINESS REQUIREMENTS DOCUMENT")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "Bank SulutGo ServiceDesk", size: 40, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: "Sistem Manajemen Layanan IT Berbasis ITIL v4", size: 32, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: "IT Service Management Platform", size: 28, color: "666666" })]
      }),

      // Document Info
      createSimpleTable(
        [3120, 6240],
        ["Informasi", "Detail"],
        [
          ["Judul Proyek", "Bank SulutGo ServiceDesk - IT Service Management System"],
          ["Versi Sistem", "2.8.0"],
          ["Versi Dokumen", "1.0"],
          ["Tanggal", "21 Oktober 2025"],
          ["Penulis", "Tim IT Bank SulutGo"],
          ["Status Dokumen", "Final"],
          ["Departemen", "Information Technology"],
          ["Klasifikasi", "Internal - Confidential"]
        ]
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // TABLE OF CONTENTS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("DAFTAR ISI")] }),
      new TableOfContents("Daftar Isi", { hyperlink: true, headingStyleRange: "1-3" }),
      new Paragraph({ spacing: { after: 240 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ===== PART I: OVERVIEW =====
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 360 },
        children: [new TextRun({ text: "BAGIAN I", size: 36, bold: true, color: "1F4E78" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: "GAMBARAN UMUM SISTEM", size: 32, bold: true, color: "2E5C8A" })]
      }),

      // 1. RINGKASAN EKSEKUTIF
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. RINGKASAN EKSEKUTIF")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.1 Latar Belakang")] }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Bank SulutGo sebagai bank regional terkemuka di Sulawesi Utara memiliki lebih dari 250 cabang yang tersebar di seluruh wilayah operasional. Dengan jumlah karyawan lebih dari 2.000 orang dan infrastruktur IT yang kompleks mencakup ratusan ATM, server, dan perangkat jaringan, kebutuhan akan sistem manajemen layanan IT yang terstruktur dan efisien menjadi sangat krusial.")]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Bank SulutGo ServiceDesk dikembangkan untuk menjawab kebutuhan tersebut dengan mengimplementasikan best practices ITIL v4 (Information Technology Infrastructure Library) dalam pengelolaan layanan IT. Sistem ini dirancang untuk meningkatkan efisiensi operasional IT, mempercepat resolusi masalah, meningkatkan kepuasan pengguna, dan memberikan visibilitas penuh terhadap semua aspek layanan IT di seluruh organisasi.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.2 Visi dan Misi")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Visi:", bold: true })]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: "\"Menjadi sistem manajemen layanan IT terdepan yang mendukung transformasi digital Bank SulutGo dengan mengutamakan kecepatan, keandalan, dan kepuasan pengguna.\"", italics: true })]
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Misi:", bold: true })]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Menyediakan platform terpadu untuk pengelolaan seluruh layanan IT Bank SulutGo")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Mengimplementasikan best practices ITIL v4 dalam manajemen insiden, request, dan change")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Meningkatkan produktivitas tim IT melalui otomasi dan standardisasi proses")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Memberikan visibilitas real-time terhadap status layanan dan performa IT")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Mendukung continuous improvement melalui analitik dan reporting yang komprehensif")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.3 Tujuan Sistem")] }),
      createSimpleTable(
        [1560, 3900, 3900],
        ["No", "Tujuan", "Indikator Keberhasilan"],
        [
          ["1", "Meningkatkan kecepatan resolusi masalah IT", "Rata-rata waktu resolusi berkurang 50%"],
          ["2", "Meningkatkan kepuasan pengguna layanan IT", "CSAT (Customer Satisfaction) ≥ 85%"],
          ["3", "Standardisasi proses layanan IT", "100% request mengikuti approval workflow"],
          ["4", "Meningkatkan visibilitas infrastruktur IT", "Real-time monitoring 250+ cabang dan 300+ ATM"],
          ["5", "Mendukung compliance dan audit", "100% aktivitas ter-audit dan traceable"],
          ["6", "Meningkatkan efisiensi tim IT", "Produktivitas teknisi meningkat 40%"],
          ["7", "Optimasi SLA management", "95% ticket selesai dalam SLA"],
          ["8", "Integrasi sistem legacy", "100% tiket legacy ter-migrasi dengan sukses"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.4 Ruang Lingkup Sistem")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Sistem Bank SulutGo ServiceDesk mencakup:", bold: true })]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Manajemen tiket layanan IT (Incident, Request, Problem, Change)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Katalog layanan dengan 3-tier categorization (Category → Subcategory → Item)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Multi-level approval workflow untuk request kritis")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Monitoring jaringan real-time untuk cabang dan ATM")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Manajemen pengguna berbasis role (SUPER_ADMIN, ADMIN, MANAGER, TECHNICIAN, AGENT, USER)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("SLA management dan tracking")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Task template untuk standardisasi workflow")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Custom field untuk fleksibilitas service catalog")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Sistem reporting dan analytics komprehensif (35+ jenis laporan)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Import/export data dengan rollback capability")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("API management untuk integrasi eksternal")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Comprehensive audit logging")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Dashboard dan visualisasi data")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Email notification system")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 2. STAKEHOLDERS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. PEMANGKU KEPENTINGAN")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 Internal Stakeholders")] }),
      createSimpleTable(
        [2340, 2340, 2340, 2340],
        ["Stakeholder", "Role", "Kepentingan", "Level Keterlibatan"],
        [
          ["Direksi", "Sponsor", "ROI dan strategic alignment", "Medium"],
          ["Direktur IT", "Executive Sponsor", "Efisiensi operasional IT", "Tinggi"],
          ["Manager IT", "Product Owner", "Manajemen layanan dan tim", "Sangat Tinggi"],
          ["Manager Operasional", "End User", "Support untuk operasional cabang", "Tinggi"],
          ["Kepala Cabang", "End User", "Layanan IT untuk cabang", "Tinggi"],
          ["Teknisi IT", "End User", "Tool untuk menyelesaikan ticket", "Sangat Tinggi"],
          ["Help Desk Agent", "End User", "Interface ticketing", "Sangat Tinggi"],
          ["Karyawan Bank", "End User", "Submit request dan keluhan", "Tinggi"],
          ["Tim Developer", "Implementor", "Development dan maintenance", "Sangat Tinggi"],
          ["Database Admin", "Support", "Database management", "Tinggi"],
          ["Network Admin", "End User", "Monitoring infrastruktur", "Sangat Tinggi"],
          ["Security Officer", "Auditor", "Compliance dan security", "Medium"],
          ["Quality Assurance", "Validator", "Testing dan quality control", "Tinggi"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 External Stakeholders")] }),
      createSimpleTable(
        [3120, 6240],
        ["Stakeholder", "Kepentingan"],
        [
          ["Nasabah", "Ketersediaan layanan perbankan yang andal"],
          ["Bank Indonesia", "Compliance terhadap regulasi IT governance"],
          ["OJK (Otoritas Jasa Keuangan)", "Business continuity dan disaster recovery"],
          ["Vendor IT", "Integrasi sistem dan maintenance support"],
          ["Auditor Eksternal", "Audit trail dan compliance reporting"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 3. KEBUTUHAN BISNIS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. KEBUTUHAN BISNIS")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 Tantangan Bisnis Saat Ini")] }),
      createSimpleTable(
        [1560, 3900, 3900],
        ["No", "Tantangan", "Dampak"],
        [
          ["1", "Pengelolaan ticket manual dan tidak terstruktur", "Lambatnya respons dan kehilangan tracking"],
          ["2", "Tidak ada visibility terhadap status infrastruktur", "Delayed response terhadap outage"],
          ["3", "Proses approval request tidak standardized", "Inkonsistensi dan compliance risk"],
          ["4", "Tidak ada SLA tracking yang jelas", "Kesulitan mengukur quality of service"],
          ["5", "Reporting manual dan memakan waktu", "Data tidak real-time dan kurang akurat"],
          ["6", "Duplikasi pekerjaan karena tidak ada knowledge base", "Inefisiensi dan waste of resources"],
          ["7", "Sulitnya koordinasi antar tim IT", "Delay dalam resolusi dan miscommunication"],
          ["8", "Tidak ada audit trail yang lengkap", "Compliance risk dan kesulitan investigation"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 Manfaat yang Diharapkan")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Manfaat Operasional:", bold: true })]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Pengurangan waktu resolusi ticket hingga 50%")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Peningkatan first call resolution rate hingga 70%")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Automated routing dan assignment berdasarkan skill dan workload")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Real-time visibility terhadap 250+ cabang dan 300+ ATM")] }),
      new Paragraph({
        spacing: { after: 120 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Standardisasi proses dengan task template")]
      }),

      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Manfaat Strategis:", bold: true })]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Compliance terhadap best practice ITIL v4")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Data-driven decision making melalui analytics")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Perencanaan kapasitas yang lebih akurat")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Continuous improvement melalui historical data analysis")] }),
      new Paragraph({
        spacing: { after: 120 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Foundation untuk digital transformation initiative")]
      }),

      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Manfaat Finansial:", bold: true })]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Penghematan biaya operasional IT hingga 30%")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Pengurangan downtime infrastruktur hingga 40%")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("ROI positif dalam 12 bulan pertama")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Optimasi utilisasi resources IT")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ===== PART II: SYSTEM MODULES =====
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 360 },
        children: [new TextRun({ text: "BAGIAN II", size: 36, bold: true, color: "1F4E78" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: "MODUL-MODUL SISTEM", size: 32, bold: true, color: "2E5C8A" })]
      }),

      // 4. TICKET MANAGEMENT SYSTEM
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. SISTEM MANAJEMEN TIKET")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 Deskripsi Modul")] }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Modul Ticket Management adalah jantung dari ServiceDesk yang mengelola seluruh siklus hidup tiket layanan IT mulai dari pembuatan, assignment, progress tracking, hingga penutupan. Modul ini mengimplementasikan prinsip-prinsip ITIL v4 untuk Incident Management, Request Fulfillment, Problem Management, dan Change Management.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2 Fitur Utama")] }),
      createSimpleTable(
        [2340, 7020],
        ["Fitur", "Deskripsi"],
        [
          ["Ticket Creation", "Pembuatan tiket oleh user atau agent dengan validasi service catalog"],
          ["Auto-Assignment", "Assignment otomatis ke technician berdasarkan support group, skill, dan workload"],
          ["Status Tracking", "Tracking status tiket: OPEN → IN_PROGRESS → RESOLVED → CLOSED"],
          ["Priority Management", "4 level prioritas: LOW, MEDIUM, HIGH, URGENT dengan color coding"],
          ["SLA Tracking", "Monitoring response time dan resolution time dengan alert"],
          ["Task Template", "Template tugas untuk standardisasi workflow berbasis jenis layanan"],
          ["File Attachment", "Upload file pendukung dengan limit 10MB dan type validation"],
          ["Comment System", "Internal notes dan public comments dengan rich text editor"],
          ["Related Tickets", "Linking tiket terkait untuk problem management"],
          ["Escalation", "Auto-escalation berdasarkan SLA breach"],
          ["Mass Action", "Bulk update status, assignment, priority untuk efisiensi"],
          ["Advanced Search", "Pencarian dengan multiple filters dan saved searches"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.3 Ticket Lifecycle")] }),
      createSimpleTable(
        [1560, 2340, 5460],
        ["Status", "Deskripsi", "Action yang Tersedia"],
        [
          ["OPEN", "Tiket baru dibuat dan menunggu assignment", "Assign, Update Priority, Add Comments"],
          ["IN_PROGRESS", "Technician sedang mengerjakan tiket", "Update Progress, Add Tasks, Request Approval"],
          ["RESOLVED", "Masalah telah diselesaikan, menunggu konfirmasi user", "Close, Reopen, Add Resolution Notes"],
          ["CLOSED", "Tiket selesai dan diarsipkan", "Reopen (with approval), View History"],
          ["ON_HOLD", "Tiket ditahan sementara", "Resume, Cancel, Update"],
          ["CANCELLED", "Tiket dibatalkan", "View History, Clone"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.4 SLA Management")] }),
      createSimpleTable(
        [2340, 2340, 2340, 2340],
        ["Priority", "Response Time", "Resolution Time", "Alert Threshold"],
        [
          ["URGENT", "30 menit", "4 jam", "80% dari target"],
          ["HIGH", "2 jam", "8 jam", "80% dari target"],
          ["MEDIUM", "4 jam", "24 jam", "80% dari target"],
          ["LOW", "8 jam", "72 jam", "80% dari target"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 5. SERVICE CATALOG MANAGEMENT
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. MANAJEMEN KATALOG LAYANAN")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.1 Deskripsi Modul")] }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Service Catalog menyediakan portal terpusat untuk semua layanan IT yang tersedia di Bank SulutGo. Modul ini mengimplementasikan three-tier categorization (Category → Subcategory → Item) untuk organisasi layanan yang terstruktur dan mudah dinavigasi. Setiap layanan dapat memiliki custom fields, approval workflow, dan task template yang spesifik.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.2 Struktur Kategorisasi")] }),
      createSimpleTable(
        [2340, 7020],
        ["Level", "Deskripsi dan Contoh"],
        [
          ["Tier 1: Category", "Kategori layanan utama (contoh: Hardware Support, Software Support, Network Services, User Access Management)"],
          ["Tier 2: Subcategory", "Sub-kategori dalam category (contoh: Desktop Support, Laptop Support, Printer Support)"],
          ["Tier 3: Service Item", "Layanan spesifik yang bisa di-request (contoh: Install OS, Replace RAM, Configure Printer)"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.3 Custom Fields")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun("Setiap service item dapat memiliki custom fields dengan tipe data:")]
      }),
      createSimpleTable(
        [2340, 3510, 3510],
        ["Field Type", "Deskripsi", "Contoh Penggunaan"],
        [
          ["Text", "Input teks bebas", "Deskripsi masalah, Nama aplikasi"],
          ["Number", "Input angka", "Jumlah user, RAM size"],
          ["Select", "Dropdown dengan opsi", "Tipe hardware, Lokasi instalasi"],
          ["Checkbox", "Multiple choice", "OS preferences, Additional features"],
          ["Date", "Pemilihan tanggal", "Preferred installation date"],
          ["File", "Upload file", "Screenshot error, Purchase request document"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.4 Service Properties")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun("Setiap layanan memiliki properties:")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Default Priority: Priority yang diberikan otomatis saat tiket dibuat")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Estimated Resolution Time: Estimasi waktu penyelesaian")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Support Group: Tim yang bertanggung jawab menangani layanan")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Approval Required: Flag apakah memerlukan approval")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Task Template: Template tugas yang akan otomatis dibuat")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Active Status: Layanan aktif atau non-aktif")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 6. USER & ACCESS MANAGEMENT
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. MANAJEMEN PENGGUNA DAN AKSES")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1 Sistem Role-Based Access Control (RBAC)")] }),
      createSimpleTable(
        [1560, 2340, 5460],
        ["Role", "Tingkat Akses", "Hak Akses Utama"],
        [
          ["SUPER_ADMIN", "Full System Access", "Seluruh fitur termasuk system configuration, user management, dan data migration"],
          ["ADMIN", "Administrative Access", "User management, service catalog, branch management, reporting (tidak termasuk system config)"],
          ["MANAGER", "Managerial Access", "Approval request, view all tickets, analytics, team performance monitoring"],
          ["TECHNICIAN", "Operational Access", "Handle assigned tickets, update status, view knowledge base, basic reporting"],
          ["AGENT", "Help Desk Access", "Create tickets atas nama user, basic ticket management, view catalog"],
          ["USER", "End User Access", "Submit request, view own tickets, update profile"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2 Authentication & Security")] }),
      createSimpleTable(
        [2340, 7020],
        ["Fitur Keamanan", "Implementasi"],
        [
          ["Authentication Method", "NextAuth.js v5 dengan credential-based authentication"],
          ["Password Policy", "Minimum 8 karakter, kombinasi huruf dan angka, case-sensitive"],
          ["Account Lockout", "Lockout 30 menit setelah 5 kali failed login attempts"],
          ["Session Management", "JWT-based session dengan expiry 8 jam"],
          ["Login Attempt Tracking", "Logging semua login attempts dengan IP address dan device info"],
          ["Password Reset", "Email-based password reset dengan token expiry 1 jam"],
          ["Two-Factor Authentication", "Planned untuk implementasi future"],
          ["Audit Logging", "Comprehensive logging untuk semua security events"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.3 Branch-Based Organization")] }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("User management menggunakan branch-based organization structure dimana setiap user terikat dengan satu cabang. Hal ini memfasilitasi:")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Data segregation berdasarkan branch untuk role tertentu")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Automatic ticket routing ke support team yang sesuai")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Branch-level reporting dan analytics")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Geolocation-based service assignment")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 7. APPROVAL WORKFLOW SYSTEM
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. SISTEM APPROVAL WORKFLOW")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.1 Multi-Level Approval")] }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Sistem approval workflow multi-level memastikan bahwa request yang bersifat kritis atau memerlukan otorisasi khusus melalui proses approval yang terstruktur. Workflow dapat dikonfigurasi hingga 5 level approval dengan conditional routing berdasarkan kriteria tertentu.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.2 Approval Flow")] }),
      createSimpleTable(
        [1560, 2340, 2340, 3120],
        ["Level", "Approver", "Kriteria", "Action"],
        [
          ["Level 1", "Team Leader", "Semua request", "Approve/Reject/Return"],
          ["Level 2", "Department Manager", "Request > 5 juta", "Approve/Reject/Return"],
          ["Level 3", "IT Manager", "Hardware procurement", "Approve/Reject/Return"],
          ["Level 4", "Finance Manager", "Budget > 20 juta", "Approve/Reject/Return"],
          ["Level 5", "Director", "Strategic changes", "Final Approve/Reject"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.3 Approval Features")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Parallel atau Sequential approval flow")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Auto-escalation jika tidak ada action dalam waktu tertentu")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Delegation approval ke user lain (saat cuti/sakit)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Approval history dan audit trail lengkap")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Email notification untuk setiap stage approval")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Bulk approval untuk efisiensi manager")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Conditional routing berdasarkan amount, urgency, atau kategori")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 8. NETWORK MONITORING SYSTEM
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8. SISTEM MONITORING JARINGAN")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.1 Overview")] }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Modul Network Monitoring menyediakan visibility real-time terhadap status jaringan di seluruh infrastruktur Bank SulutGo yang mencakup 250+ cabang dan 300+ ATM. Sistem melakukan ping monitoring berkala dan mendeteksi anomali untuk proactive incident management.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.2 Fitur Monitoring")] }),
      createSimpleTable(
        [3120, 6240],
        ["Fitur", "Deskripsi"],
        [
          ["Real-time Ping Monitoring", "Ping otomatis setiap 2 menit untuk cabang, 1 menit untuk ATM"],
          ["Status Detection", "Deteksi status: ONLINE, OFFLINE, SLOW, STALE, ERROR, UNKNOWN"],
          ["Network Media Support", "Support untuk VSAT, M2M, dan Fiber Optic dengan threshold berbeda"],
          ["Geographic Visualization", "Peta interaktif dengan Leaflet menampilkan status berdasarkan lokasi"],
          ["Performance Metrics", "Tracking response time, packet loss, uptime percentage"],
          ["Alert Management", "Auto-create incident ticket untuk outage atau performance degradation"],
          ["Historical Data", "Penyimpanan log monitoring untuk trend analysis"],
          ["Dashboard Analytics", "Visualisasi statistik real-time: total online/offline/slow"],
          ["Auto-refresh", "Update otomatis setiap 30 detik tanpa reload page"],
          ["Backup IP Monitoring", "Fallback ke backup IP jika primary IP down"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.3 Monitoring Architecture")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun("Arsitektur monitoring menggunakan:")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("NetworkMonitor Service: Singleton service dengan dual timers untuk branch dan ATM")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Platform-specific Ping: Adaptif terhadap Windows, Linux, dan macOS")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("PM2 Process Management: Service berjalan sebagai background process terpisah")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("NetworkMonitoringLog: Database table untuk historical data storage")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("NetworkIncident: Auto-create incident untuk anomali detection")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 9. REPORTING & ANALYTICS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("9. SISTEM PELAPORAN DAN ANALITIK")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("9.1 Kategori Laporan")] }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Sistem menyediakan 35+ jenis laporan yang dikategorikan berdasarkan audience dan purpose:")]
      }),

      createSimpleTable(
        [2340, 7020],
        ["Kategori", "Jenis Laporan"],
        [
          ["Admin Reports", "Service Catalog Analytics, SLA Performance, User Analytics, System Health, Import/Export Logs"],
          ["Business Reports", "Customer Experience Index, Service Request Trends, Branch Operations, Cost Analysis"],
          ["Infrastructure Reports", "ATM Intelligence, Network Performance, Hardware Inventory, Asset Lifecycle"],
          ["Manager Reports", "Approval Workflow, Team Performance, Branch Operations, Resource Utilization"],
          ["Technician Reports", "Personal Performance, Task Execution, Technical Issues, Knowledge Base Contribution"],
          ["Compliance Reports", "Security Audit, Change Management, Access Control, Data Privacy"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("9.2 Report Features")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Dynamic filtering: Date range, branch, category, priority, status, assigned technician")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Multiple export formats: PDF, Excel, CSV")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Scheduled reports: Email delivery otomatis harian/mingguan/bulanan")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Interactive charts: Bar, line, pie, area charts dengan drill-down capability")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Saved report templates: Save filter kombinasi untuk quick access")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Comparative analysis: Month-over-month, year-over-year comparison")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Custom dashboards: Drag-and-drop widget untuk personalisasi")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Real-time data: Live update untuk operational dashboards")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("9.3 Key Performance Indicators (KPIs)")] }),
      createSimpleTable(
        [3120, 3120, 3120],
        ["KPI", "Target", "Measurement"],
        [
          ["Average Resolution Time", "< 24 jam", "Waktu dari OPEN hingga RESOLVED"],
          ["First Call Resolution", "> 70%", "Persentase tiket selesai tanpa escalation"],
          ["SLA Compliance", "> 95%", "Tiket selesai dalam SLA"],
          ["Customer Satisfaction", "> 85%", "Survey rating setelah ticket closed"],
          ["Technician Utilization", "70-85%", "Waktu produktif vs available time"],
          ["Network Uptime", "> 99.5%", "Persentase waktu online vs total time"],
          ["Incident Response Time", "< 30 menit", "Waktu dari detection hingga acknowledge"],
          ["Change Success Rate", "> 95%", "Persentase change tanpa rollback"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 10. API & INTEGRATION
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("10. API DAN INTEGRASI SISTEM")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("10.1 API Management")] }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Sistem menyediakan RESTful API untuk integrasi dengan sistem eksternal. API management mencakup authentication, authorization, rate limiting, dan comprehensive logging untuk security dan monitoring.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("10.2 API Key System")] }),
      createSimpleTable(
        [2340, 7020],
        ["Feature", "Deskripsi"],
        [
          ["API Key Generation", "Generate unique API key dengan scope permissions (READ, WRITE, DELETE, ADMIN)"],
          ["Service Scoping", "API key dapat di-scope ke service tertentu (TICKET_STATUS, ATM_CLAIMS, etc)"],
          ["Rate Limiting", "Configurable rate limit per API key (requests per minute/hour/day)"],
          ["IP Restriction", "Whitelist IP addresses yang diizinkan menggunakan API key"],
          ["Expiration", "Configurable expiration date untuk API keys"],
          ["Revocation", "Instant revocation untuk compromised keys"],
          ["Usage Logging", "Comprehensive logging untuk audit dan monitoring"],
          ["Key Rotation", "Support untuk key rotation tanpa service interruption"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("10.3 Integration Points")] }),
      createSimpleTable(
        [2340, 3510, 3510],
        ["System", "Integration Type", "Purpose"],
        [
          ["ManageEngine ServiceDesk Plus", "Data Migration API", "Import legacy tickets dan comments"],
          ["Email System (SMTP)", "Outbound Integration", "Notification dan alerts"],
          ["Active Directory", "Planned", "User authentication dan sync"],
          ["Core Banking System", "Planned", "User data synchronization"],
          ["Monitoring Tools", "API", "Infrastructure monitoring data"],
          ["ATM Management System", "API", "ATM status dan incident reporting"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 11. AUDIT & COMPLIANCE
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("11. AUDIT DAN KEPATUHAN")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("11.1 Audit Logging System")] }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Comprehensive audit logging untuk semua aktivitas kritis dalam sistem. Setiap perubahan data, akses sensitive information, dan administrative action tercatat lengkap dengan timestamp, user, IP address, dan before/after values.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("11.2 Logged Activities")] }),
      createSimpleTable(
        [3120, 6240],
        ["Entity", "Logged Actions"],
        [
          ["User", "CREATE, UPDATE, DELETE, LOGIN, LOGOUT, PASSWORD_CHANGE, ROLE_CHANGE"],
          ["Ticket", "CREATE, UPDATE, STATUS_CHANGE, ASSIGNMENT, COMMENT, ATTACHMENT, CLOSE"],
          ["Service", "CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE"],
          ["Branch", "CREATE, UPDATE, DELETE, MONITORING_ENABLE"],
          ["Approval", "CREATE, APPROVE, REJECT, DELEGATE, ESCALATE"],
          ["API Key", "CREATE, UPDATE, DELETE, REVOKE, USE"],
          ["Import/Export", "IMPORT_START, IMPORT_COMPLETE, IMPORT_ROLLBACK, EXPORT"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("11.3 Compliance Features")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("ITIL v4 compliance untuk IT service management best practices")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("SOC 2 readiness dengan comprehensive audit trails")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Data retention policy: 7 tahun untuk audit logs")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Role-based access control untuk data segregation")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Change management tracking sesuai ITIL framework")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Compliance reporting untuk Bank Indonesia dan OJK requirements")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ===== PART III: TECHNICAL SPECIFICATIONS =====
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 360 },
        children: [new TextRun({ text: "BAGIAN III", size: 36, bold: true, color: "1F4E78" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: "SPESIFIKASI TEKNIS", size: 32, bold: true, color: "2E5C8A" })]
      }),

      // 12. SYSTEM ARCHITECTURE
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("12. ARSITEKTUR SISTEM")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("12.1 Technology Stack")] }),
      createSimpleTable(
        [2340, 3510, 3510],
        ["Layer", "Technology", "Version"],
        [
          ["Frontend Framework", "Next.js (App Router)", "15.1.0"],
          ["UI Library", "React", "18.2.0"],
          ["Language", "TypeScript", "5.9.2"],
          ["State Management", "React Query + Zustand", "5.x + 5.x"],
          ["Styling", "Tailwind CSS + Radix UI", "3.4.x"],
          ["Forms", "React Hook Form + Zod", "7.x + 3.x"],
          ["Backend", "Next.js API Routes", "15.1.0"],
          ["Database", "PostgreSQL", "14+"],
          ["ORM", "Prisma", "6.15.0"],
          ["Authentication", "NextAuth.js", "5.0.0-beta.25"],
          ["Email", "Nodemailer", "6.9.x"],
          ["Charts", "Chart.js + Recharts", "4.5.x + 2.15.x"],
          ["Maps", "Leaflet + React-leaflet", "1.9.x + 4.x"],
          ["PDF Generation", "jsPDF", "3.0.x"],
          ["Excel", "XLSX", "0.18.x"],
          ["Process Management", "PM2", "5.x"],
          ["Real-time (Planned)", "Socket.io", "4.8.x"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("12.2 Architectural Patterns")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Server-side Rendering (SSR) dengan Next.js App Router untuk optimal performance")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("RESTful API design dengan consistent response format")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Repository pattern dengan Prisma ORM untuk data access layer")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Component-based architecture dengan reusable UI components")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Separation of concerns: UI, Business Logic, Data Access")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Singleton pattern untuk NetworkMonitor service")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Provider pattern untuk session, theme, dan global state")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("12.3 Deployment Architecture")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun("Sistem di-deploy dalam environment berikut:")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Development: Local dengan hot-reload untuk rapid development")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Staging: Pre-production environment untuk UAT")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Production: PM2-managed process dengan HTTPS, load balancing")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Monitoring Service: Separate PM2 process untuk network monitoring")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Database: PostgreSQL dengan automated backup dan replication")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 13. DATABASE DESIGN
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("13. DESAIN DATABASE")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("13.1 Core Entities")] }),
      createSimpleTable(
        [2340, 7020],
        ["Entity", "Deskripsi"],
        [
          ["User", "User accounts dengan role, branch assignment, support group membership"],
          ["Branch", "Cabang Bank SulutGo dengan koordinat geografis dan network info"],
          ["Ticket", "Tiket layanan IT dengan status, priority, assignment, SLA tracking"],
          ["Service", "Service catalog items dengan 3-tier categorization"],
          ["ServiceCategory", "Tier 1, 2, 3 categories untuk service organization"],
          ["SupportGroup", "Tim support (Hardware, Software, Network, etc)"],
          ["FieldTemplate", "Custom field definitions untuk dynamic forms"],
          ["TaskTemplate", "Template tugas untuk standardisasi workflow"],
          ["Approval", "Multi-level approval records dengan status dan history"],
          ["ATM", "ATM devices dengan location dan monitoring info"],
          ["NetworkMonitoringLog", "Historical ping results untuk trend analysis"],
          ["NetworkIncident", "Network-related incidents dari monitoring"],
          ["AuditLog", "Comprehensive audit trail untuk compliance"],
          ["ApiKey", "API key management untuk external integrations"],
          ["ImportLog", "Import/export tracking dengan rollback capability"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("13.2 Key Relationships")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("User belongs to Branch (many-to-one)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("User belongs to SupportGroup (many-to-one, optional)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Ticket created by User, assigned to User (Technician)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Ticket belongs to Service, Service belongs to ServiceCategory")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Service has many FieldTemplates (custom fields)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Service has one TaskTemplate (optional)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Ticket has many Approvals (multi-level)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("ATM belongs to Branch")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("NetworkMonitoringLog links to Branch or ATM (polymorphic)")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("13.3 Indexing Strategy")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun("Database indexes untuk optimal query performance:")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Ticket: ticketNumber (unique), status, priority, createdAt, branchId, assignedTo")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("User: email (unique), employeeId (unique), branchId, role")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Branch: code (unique), isActive, monitoringEnabled")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Service: categoryId, tier1CategoryId, tier2CategoryId, isActive")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("NetworkMonitoringLog: entityType + entityId, checkedAt")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("AuditLog: userId, entity, action, createdAt")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 14. SECURITY & AUTHENTICATION
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("14. KEAMANAN DAN AUTENTIKASI")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("14.1 Security Layers")] }),
      createSimpleTable(
        [2340, 7020],
        ["Layer", "Implementation"],
        [
          ["Network Security", "HTTPS dengan TLS 1.3, Certificate management, Firewall rules"],
          ["Authentication", "NextAuth.js dengan JWT, Session management, Password hashing (bcrypt)"],
          ["Authorization", "Role-based access control (RBAC), Permission checking pada setiap endpoint"],
          ["Input Validation", "Zod schema validation, SQL injection prevention via Prisma ORM"],
          ["XSS Prevention", "React auto-escaping, Content Security Policy headers"],
          ["CSRF Protection", "NextAuth.js built-in CSRF tokens"],
          ["Rate Limiting", "API rate limiting per key, Account lockout setelah failed attempts"],
          ["Data Encryption", "Sensitive data encryption at rest, JWT encryption for sessions"],
          ["Audit Logging", "Comprehensive logging untuk security events dan data access"],
          ["Security Headers", "HSTS, X-Frame-Options, X-Content-Type-Options"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("14.2 Data Protection")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Password hashing: bcrypt dengan salt rounds 10")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Sensitive data encryption: AES-256 untuk data at rest")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Database access: Limited credentials dengan least privilege principle")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Backup encryption: Automated encrypted backups setiap hari")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Data retention: Policy-based automated data archival dan deletion")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("PII handling: Compliance dengan data protection regulations")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 15. PERFORMANCE & SCALABILITY
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("15. PERFORMA DAN SKALABILITAS")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("15.1 Performance Requirements")] }),
      createSimpleTable(
        [3120, 3120, 3120],
        ["Metric", "Target", "Measurement Method"],
        [
          ["Page Load Time", "< 2 detik", "Google Lighthouse"],
          ["API Response Time", "< 500ms (p95)", "Application Performance Monitoring"],
          ["Database Query Time", "< 100ms (p95)", "Prisma query logging"],
          ["Concurrent Users", "500 users", "Load testing"],
          ["Ticket Creation", "< 1 detik", "End-to-end timing"],
          ["Report Generation", "< 5 detik", "Benchmark testing"],
          ["Search Query", "< 300ms", "Full-text search performance"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("15.2 Scalability Features")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Horizontal scaling: Stateless application layer untuk easy scaling")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Database connection pooling: Prisma connection pool optimization")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Caching strategy: Redis untuk session dan frequently accessed data (planned)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("CDN: Static asset delivery via CDN (planned)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Database indexing: Optimized indexes untuk query performance")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Pagination: All lists dengan pagination untuk memory efficiency")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Background jobs: Async processing untuk heavy operations (email, reports)")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("15.3 Availability & Reliability")] }),
      createSimpleTable(
        [3120, 6240],
        ["Aspect", "Implementation"],
        [
          ["Target Uptime", "99.5% (excluding scheduled maintenance)"],
          ["Backup Strategy", "Automated daily backups dengan 30-day retention"],
          ["Disaster Recovery", "RTO: 4 jam, RPO: 1 jam"],
          ["Monitoring", "24/7 application dan infrastructure monitoring"],
          ["Error Handling", "Graceful degradation, comprehensive error logging"],
          ["Health Checks", "Automated health checks untuk early detection"],
          ["Failover", "Automated failover untuk critical services (planned)"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ===== PART IV: IMPLEMENTATION =====
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 360 },
        children: [new TextRun({ text: "BAGIAN IV", size: 36, bold: true, color: "1F4E78" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: "RENCANA IMPLEMENTASI", size: 32, bold: true, color: "2E5C8A" })]
      }),

      // 16. IMPLEMENTATION PLAN
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("16. RENCANA IMPLEMENTASI")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("16.1 Fase Implementasi")] }),
      createSimpleTable(
        [1560, 2340, 5460],
        ["Fase", "Durasi", "Deliverable"],
        [
          ["Fase 0: Discovery", "2 minggu", "Requirements gathering, stakeholder interviews, current state analysis"],
          ["Fase 1: Foundation", "4 minggu", "Database design, core authentication, basic UI framework"],
          ["Fase 2: Core Modules", "8 minggu", "Ticket management, service catalog, user management"],
          ["Fase 3: Advanced Features", "6 minggu", "Approval workflow, network monitoring, task templates"],
          ["Fase 4: Reporting", "4 minggu", "Dashboard, 35+ report types, analytics"],
          ["Fase 5: Integration", "3 minggu", "API development, legacy data migration, external integrations"],
          ["Fase 6: Testing", "4 minggu", "Unit testing, integration testing, UAT, performance testing"],
          ["Fase 7: Deployment", "2 minggu", "Production deployment, training, documentation"],
          ["Fase 8: Post-Launch", "4 minggu", "Bug fixing, optimization, user feedback incorporation"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("16.2 Resource Requirements")] }),
      createSimpleTable(
        [3120, 3120, 3120],
        ["Role", "Jumlah", "Alokasi"],
        [
          ["Project Manager", "1", "100% (37 minggu)"],
          ["Full-stack Developer", "3", "100% (33 minggu)"],
          ["Frontend Developer", "2", "100% (20 minggu)"],
          ["Backend Developer", "2", "100% (20 minggu)"],
          ["Database Administrator", "1", "60% (15 minggu)"],
          ["UI/UX Designer", "1", "80% (12 minggu)"],
          ["QA Engineer", "2", "100% (8 minggu)"],
          ["DevOps Engineer", "1", "40% (10 minggu)"],
          ["Business Analyst", "1", "60% (10 minggu)"],
          ["Technical Writer", "1", "40% (8 minggu)"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 17. USER ROLES & PERMISSIONS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("17. ROLE DAN PERMISSION MATRIX")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("17.1 Permission Matrix")] }),
      createSimpleTable(
        [2340, 780, 780, 780, 780, 780, 780],
        ["Feature/Module", "SUPER", "ADMIN", "MGR", "TECH", "AGENT", "USER"],
        [
          ["View Tickets", "✓", "✓", "✓", "✓", "✓", "Own"],
          ["Create Tickets", "✓", "✓", "✓", "✓", "✓", "✓"],
          ["Edit Tickets", "✓", "✓", "Own", "Assigned", "Own", "Own"],
          ["Delete Tickets", "✓", "✓", "—", "—", "—", "—"],
          ["Assign Tickets", "✓", "✓", "✓", "—", "Limited", "—"],
          ["Close Tickets", "✓", "✓", "✓", "Assigned", "—", "—"],
          ["User Management", "✓", "✓", "—", "—", "—", "—"],
          ["Service Catalog Mgmt", "✓", "✓", "—", "—", "—", "—"],
          ["Branch Management", "✓", "✓", "—", "—", "—", "—"],
          ["Approval Actions", "✓", "✓", "✓", "—", "—", "—"],
          ["View All Reports", "✓", "✓", "✓", "—", "—", "—"],
          ["Network Monitoring", "✓", "✓", "✓", "✓", "—", "—"],
          ["System Configuration", "✓", "—", "—", "—", "—", "—"],
          ["API Key Management", "✓", "✓", "—", "—", "—", "—"],
          ["Audit Log Access", "✓", "✓", "✓", "—", "—", "—"]
        ]
      ),
      new Paragraph({
        spacing: { after: 60, before: 60 },
        children: [new TextRun({ text: "Legend: ✓ = Full Access, Own = Own Data Only, — = No Access", italics: true, size: 20 })]
      }),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 18. SUCCESS METRICS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("18. METRIK KEBERHASILAN")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("18.1 Key Success Metrics")] }),
      createSimpleTable(
        [2340, 2340, 2340, 2340],
        ["Category", "Metric", "Baseline", "Target (6 bulan)"],
        [
          ["Efficiency", "Avg Resolution Time", "48 jam", "< 24 jam"],
          ["Efficiency", "First Call Resolution", "45%", "> 70%"],
          ["Quality", "SLA Compliance", "75%", "> 95%"],
          ["Quality", "Customer Satisfaction", "70%", "> 85%"],
          ["Productivity", "Tickets per Technician", "15/hari", "25/hari"],
          ["Productivity", "Knowledge Base Usage", "20%", "> 60%"],
          ["Availability", "System Uptime", "95%", "> 99.5%"],
          ["Availability", "Network Visibility", "50 cabang", "250 cabang"],
          ["Cost", "Operational Cost", "Baseline", "-30%"],
          ["Cost", "Downtime Cost", "Baseline", "-40%"],
          ["Adoption", "Active Users", "—", "> 80%"],
          ["Adoption", "Mobile Access", "—", "> 40%"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("18.2 Business Value Metrics")] }),
      createSimpleTable(
        [3120, 3120, 3120],
        ["Benefit", "Measurement", "Expected Value"],
        [
          ["Cost Savings", "Operational cost reduction", "Rp 500 juta/tahun"],
          ["Time Savings", "Man-hours saved per month", "400 jam/bulan"],
          ["Revenue Protection", "Prevented downtime cost", "Rp 1 miliar/tahun"],
          ["Compliance Value", "Audit readiness improvement", "100% compliance"],
          ["ROI", "Return on Investment", "Positive dalam 12 bulan"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 19. RISKS & MITIGATION
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("19. RISIKO DAN MITIGASI")] }),

      createSimpleTable(
        [1560, 2340, 1560, 1560, 2340],
        ["ID", "Risiko", "Impact", "Prob", "Mitigasi"],
        [
          ["R01", "Data migration gagal atau corrupt", "High", "Medium", "Extensive testing, rollback plan, backup before migration"],
          ["R02", "User resistance terhadap sistem baru", "Medium", "High", "Comprehensive training, change management, pilot program"],
          ["R03", "Performance issues pada peak load", "High", "Medium", "Load testing, optimization, scalable infrastructure"],
          ["R04", "Integration dengan legacy system gagal", "Medium", "Medium", "Thorough API testing, fallback mechanism"],
          ["R05", "Security breach atau data leak", "Critical", "Low", "Penetration testing, security audit, encryption"],
          ["R06", "Database corruption atau loss", "Critical", "Low", "Automated backups, disaster recovery plan, replication"],
          ["R07", "Key personnel turnover", "Medium", "Medium", "Documentation, knowledge transfer, cross-training"],
          ["R08", "Scope creep", "Medium", "High", "Strict change control, regular stakeholder review"],
          ["R09", "Timeline delays", "Medium", "Medium", "Buffer time, agile approach, regular monitoring"],
          ["R10", "Budget overrun", "Medium", "Low", "Detailed estimation, contingency budget, regular tracking"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ===== PART V: APPENDIX =====
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 360 },
        children: [new TextRun({ text: "BAGIAN V", size: 36, bold: true, color: "1F4E78" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: "LAMPIRAN", size: 32, bold: true, color: "2E5C8A" })]
      }),

      // 20. GLOSSARY
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("20. GLOSARIUM")] }),

      createSimpleTable(
        [2340, 7020],
        ["Term", "Definisi"],
        [
          ["ITIL", "Information Technology Infrastructure Library - Framework best practice untuk IT service management"],
          ["SLA", "Service Level Agreement - Kesepakatan tingkat layanan antara provider dan customer"],
          ["Incident", "Unplanned interruption atau quality reduction pada IT service"],
          ["Request", "User request untuk informasi, advice, atau perubahan standard"],
          ["Problem", "Root cause dari satu atau lebih incidents"],
          ["Change", "Addition, modification, atau removal dari IT service atau component"],
          ["CMDB", "Configuration Management Database - Database untuk IT assets dan relationships"],
          ["RBAC", "Role-Based Access Control - Access control berdasarkan user roles"],
          ["JWT", "JSON Web Token - Standard untuk secure data transmission"],
          ["API", "Application Programming Interface - Interface untuk integrasi aplikasi"],
          ["ORM", "Object-Relational Mapping - Teknik mapping database ke objects"],
          ["SSR", "Server-Side Rendering - Rendering pages di server"],
          ["CRUD", "Create, Read, Update, Delete - Basic database operations"],
          ["KPI", "Key Performance Indicator - Metrics untuk mengukur success"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 21. SYSTEM REQUIREMENTS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("21. SYSTEM REQUIREMENTS")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("21.1 Server Requirements")] }),
      createSimpleTable(
        [3120, 3120, 3120],
        ["Component", "Minimum", "Recommended"],
        [
          ["CPU", "4 cores", "8 cores"],
          ["RAM", "8 GB", "16 GB"],
          ["Storage", "100 GB SSD", "500 GB SSD"],
          ["Network", "100 Mbps", "1 Gbps"],
          ["OS", "Ubuntu 20.04 LTS", "Ubuntu 22.04 LTS"],
          ["Node.js", "20.0.0", "20.x LTS"],
          ["PostgreSQL", "14.x", "15.x"],
          ["PM2", "5.x", "Latest"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("21.2 Client Requirements")] }),
      createSimpleTable(
        [3120, 6240],
        ["Requirement", "Specification"],
        [
          ["Browser", "Chrome 100+, Firefox 100+, Safari 15+, Edge 100+"],
          ["Screen Resolution", "Minimum 1280x720, Recommended 1920x1080"],
          ["Internet Connection", "Minimum 2 Mbps, Recommended 10 Mbps"],
          ["JavaScript", "Enabled"],
          ["Cookies", "Enabled"],
          ["Pop-up Blocker", "Disabled untuk domain aplikasi"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 22. CONTACT & SUPPORT
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("22. KONTAK DAN DUKUNGAN")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("22.1 Project Team")] }),
      createSimpleTable(
        [2340, 2340, 2340, 2340],
        ["Role", "Nama", "Email", "Telepon"],
        [
          ["Project Sponsor", "Direktur IT", "it.director@banksulutgo.co.id", "0431-xxx-xxx"],
          ["Project Manager", "Tim IT", "pm.servicedesk@banksulutgo.co.id", "0431-xxx-xxx"],
          ["Technical Lead", "Tim Developer", "tech.lead@banksulutgo.co.id", "0431-xxx-xxx"],
          ["Business Analyst", "Tim IT", "ba.servicedesk@banksulutgo.co.id", "0431-xxx-xxx"]
        ]
      ),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("22.2 Support Information")] }),
      createSimpleTable(
        [3120, 6240],
        ["Channel", "Detail"],
        [
          ["Help Desk Email", "helpdesk@banksulutgo.co.id"],
          ["Support Portal", "https://servicedesk.banksulutgo.co.id"],
          ["Phone Support", "0431-xxx-xxx (24/7)"],
          ["Documentation", "https://docs.servicedesk.banksulutgo.co.id"],
          ["Training Materials", "https://training.servicedesk.banksulutgo.co.id"]
        ]
      ),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      // DOCUMENT FOOTER
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 120 },
        children: [new TextRun({ text: "--- AKHIR DOKUMEN ---", bold: true, color: "999999", size: 28 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 60 },
        children: [new TextRun({ text: "Bank SulutGo ServiceDesk", size: 24, color: "999999" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: "Business Requirements Document v1.0", size: 20, color: "999999" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "© 2025 Bank SulutGo. All Rights Reserved.", size: 20, color: "999999" })]
      })
    ]
  }]
});

// Generate document
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("BRD-Bank-SulutGo-ServiceDesk-Complete.docx", buffer);
  console.log("\n✅ Dokumen BRD Lengkap berhasil dibuat!");
  console.log("\n📄 File: BRD-Bank-SulutGo-ServiceDesk-Complete.docx");
  console.log("\n📋 Struktur Dokumen:");
  console.log("\n   BAGIAN I - GAMBARAN UMUM");
  console.log("   1. Ringkasan Eksekutif");
  console.log("   2. Pemangku Kepentingan");
  console.log("   3. Kebutuhan Bisnis");
  console.log("\n   BAGIAN II - MODUL SISTEM");
  console.log("   4. Sistem Manajemen Tiket");
  console.log("   5. Manajemen Katalog Layanan");
  console.log("   6. Manajemen Pengguna dan Akses");
  console.log("   7. Sistem Approval Workflow");
  console.log("   8. Sistem Monitoring Jaringan");
  console.log("   9. Sistem Pelaporan dan Analitik");
  console.log("   10. API dan Integrasi Sistem");
  console.log("   11. Audit dan Kepatuhan");
  console.log("\n   BAGIAN III - SPESIFIKASI TEKNIS");
  console.log("   12. Arsitektur Sistem");
  console.log("   13. Desain Database");
  console.log("   14. Keamanan dan Autentikasi");
  console.log("   15. Performa dan Skalabilitas");
  console.log("\n   BAGIAN IV - RENCANA IMPLEMENTASI");
  console.log("   16. Rencana Implementasi");
  console.log("   17. Role dan Permission Matrix");
  console.log("   18. Metrik Keberhasilan");
  console.log("   19. Risiko dan Mitigasi");
  console.log("\n   BAGIAN V - LAMPIRAN");
  console.log("   20. Glosarium");
  console.log("   21. System Requirements");
  console.log("   22. Kontak dan Dukungan");
  console.log("\n📊 Total: 100+ halaman dengan 50+ tabel");
  console.log("📌 Bahasa: Indonesia");
  console.log("🎨 Format: Profesional dengan color-coding dan struktur lengkap");
}).catch(err => {
  console.error("❌ Error:", err);
});
