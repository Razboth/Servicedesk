const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
        LevelFormat, PageBreak, TableOfContents, ShadingType } = require('docx');

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 24 }
      }
    },
    paragraphStyles: [
      {
        id: "Title",
        name: "Title",
        basedOn: "Normal",
        run: { size: 56, bold: true, color: "1F4E78", font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER }
      },
      {
        id: "Subtitle",
        name: "Subtitle",
        basedOn: "Normal",
        run: { size: 32, bold: true, color: "1F4E78", font: "Arial" },
        paragraph: { spacing: { before: 120, after: 240 }, alignment: AlignmentType.CENTER }
      },
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, color: "1F4E78", font: "Arial" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 }
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, color: "2E75B5", font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 }
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, color: "5B9BD5", font: "Arial" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullet-list",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }
        ]
      },
      {
        reference: "numbered-list-1",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }
        ]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // Cover Page
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun("LATAR BELAKANG")]
      }),
      new Paragraph({
        style: "Subtitle",
        children: [new TextRun("Aplikasi ServiceDesk")]
      }),
      new Paragraph({
        style: "Subtitle",
        children: [new TextRun("Bank SulutGo")]
      }),
      new Paragraph({
        spacing: { before: 480 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Versi 2.8.0", size: 28, color: "666666" })]
      }),
      new Paragraph({
        spacing: { before: 120 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Divisi Teknologi Informasi", size: 24, color: "666666" })]
      }),
      new Paragraph({
        spacing: { before: 60 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "2025", size: 24, color: "666666" })]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // Table of Contents
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("DAFTAR ISI")]
      }),
      new TableOfContents("Daftar Isi", {
        hyperlink: true,
        headingStyleRange: "1-3"
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 1. PENDAHULUAN
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("1. PENDAHULUAN")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1.1 Latar Belakang")]
      }),
      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun("Dalam era digital dan transformasi perbankan modern, Bank SulutGo sebagai salah satu bank terkemuka di Indonesia Timur menghadapi tantangan dalam mengelola layanan teknologi informasi yang semakin kompleks. Dengan operasional yang mencakup lebih dari 250 cabang yang tersebar di seluruh Indonesia, kebutuhan akan sistem manajemen layanan TI yang terstruktur, efisien, dan sesuai dengan standar internasional menjadi sangat krusial.")]
      }),
      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun("Sebelum implementasi aplikasi ServiceDesk, penanganan insiden dan permintaan layanan TI dilakukan secara manual dan terpisah-pisah, yang mengakibatkan beberapa permasalahan signifikan:")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Tidak adanya sistem tracking yang terpusat untuk mengelola tiket layanan TI")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Kesulitan dalam monitoring dan pelaporan kinerja tim IT support")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Tidak terukurnya Service Level Agreement (SLA) untuk setiap layanan")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Proses eskalasi yang tidak terstruktur dan seringkali terlambat")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Duplikasi pekerjaan karena kurangnya knowledge base terpusat")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Sulitnya melakukan analisis tren masalah dan pengambilan keputusan berbasis data")]
      }),

      new Paragraph({
        spacing: { before: 240, after: 180 },
        children: [new TextRun("Untuk mengatasi tantangan-tantangan tersebut, Divisi Teknologi Informasi Bank SulutGo mengembangkan aplikasi ServiceDesk yang berbasis pada framework ITIL v4 (Information Technology Infrastructure Library). Aplikasi ini dirancang untuk menjadi solusi komprehensif dalam mengelola seluruh siklus hidup layanan TI, mulai dari penerimaan permintaan, penanganan insiden, penyelesaian masalah, hingga pelaporan dan analisis kinerja.")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1.2 Visi dan Misi")]
      }),

      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: "Visi:", bold: true })]
      }),
      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun("Menjadi platform manajemen layanan TI terdepan yang mendukung transformasi digital Bank SulutGo dan memberikan pengalaman layanan TI yang excellent kepada seluruh stakeholder.")]
      }),

      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: "Misi:", bold: true })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-list-1", level: 0 },
        children: [new TextRun("Menyediakan platform terpusat untuk manajemen insiden, masalah, dan permintaan layanan TI")]
      }),
      new Paragraph({
        numbering: { reference: "numbered-list-1", level: 0 },
        children: [new TextRun("Meningkatkan efisiensi operasional tim IT support melalui otomasi dan standarisasi proses")]
      }),
      new Paragraph({
        numbering: { reference: "numbered-list-1", level: 0 },
        children: [new TextRun("Memastikan kepatuhan terhadap SLA dan standar layanan yang telah ditetapkan")]
      }),
      new Paragraph({
        numbering: { reference: "numbered-list-1", level: 0 },
        children: [new TextRun("Menyediakan data dan analisis untuk pengambilan keputusan strategis")]
      }),
      new Paragraph({
        numbering: { reference: "numbered-list-1", level: 0 },
        children: [new TextRun("Membangun knowledge base untuk meningkatkan kemampuan self-service pengguna")]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 2. TUJUAN DAN MANFAAT
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("2. TUJUAN DAN MANFAAT")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2.1 Tujuan Pengembangan")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Meningkatkan Kualitas Layanan TI: ", bold: true }), new TextRun("Memberikan layanan TI yang lebih responsif, terukur, dan berkualitas tinggi kepada seluruh pengguna di 250+ cabang Bank SulutGo")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Standardisasi Proses ITIL v4: ", bold: true }), new TextRun("Mengimplementasikan best practice ITIL v4 dalam pengelolaan layanan TI untuk meningkatkan efektivitas dan efisiensi operasional")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Visibilitas dan Transparansi: ", bold: true }), new TextRun("Memberikan visibilitas penuh terhadap status tiket, kinerja tim, dan kepatuhan SLA kepada semua stakeholder")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Pengukuran Kinerja: ", bold: true }), new TextRun("Menyediakan metrik dan KPI yang akurat untuk mengukur dan meningkatkan kinerja tim IT support")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Otomasi Proses: ", bold: true }), new TextRun("Mengotomasi proses-proses manual seperti assignment tiket, eskalasi, notifikasi, dan pelaporan")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Knowledge Management: ", bold: true }), new TextRun("Membangun repositori pengetahuan untuk mengurangi waktu penyelesaian masalah dan meningkatkan first-call resolution rate")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2.2 Manfaat bagi Organisasi")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("2.2.1 Manfaat Operasional")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Pengurangan waktu downtime sistem melalui penanganan insiden yang lebih cepat dan terstruktur")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Peningkatan produktivitas tim IT support melalui otomasi dan standarisasi proses kerja")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Optimasi penggunaan resources melalui workload balancing dan skill-based routing")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Pengurangan biaya operasional TI melalui efisiensi proses dan pencegahan masalah berulang")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("2.2.2 Manfaat Strategis")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Alignment dengan strategi transformasi digital Bank SulutGo")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Peningkatan customer satisfaction melalui layanan TI yang lebih reliable dan responsif")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Data-driven decision making melalui analytics dan reporting yang komprehensif")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Kepatuhan terhadap regulasi dan standar industri perbankan")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Continuous improvement culture melalui monitoring dan analisis kinerja yang berkelanjutan")]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 3. RUANG LINGKUP SISTEM
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("3. RUANG LINGKUP SISTEM")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3.1 Cakupan Layanan")]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Aplikasi ServiceDesk Bank SulutGo mencakup berbagai jenis layanan TI yang meliputi:")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Incident Management: ", bold: true }), new TextRun("Penanganan gangguan dan masalah pada layanan TI yang berdampak pada operasional bisnis")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Service Request Management: ", bold: true }), new TextRun("Pengelolaan permintaan layanan standar seperti pembuatan user account, reset password, instalasi software, dll")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Problem Management: ", bold: true }), new TextRun("Identifikasi dan penyelesaian root cause dari insiden berulang")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Change Management: ", bold: true }), new TextRun("Pengelolaan perubahan sistem dengan approval workflow yang terstruktur")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Knowledge Management: ", bold: true }), new TextRun("Dokumentasi solusi dan best practices untuk meningkatkan self-service capability")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Asset Management: ", bold: true }), new TextRun("Pengelolaan aset TI termasuk PC, laptop, ATM, dan perangkat jaringan")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3.2 Kategori Layanan")]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Sistem mengakomodasi berbagai kategori layanan TI yang dikelompokkan berdasarkan jenis dan kompleksitas:")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Application Services: ", bold: true }), new TextRun("Core banking, mobile banking, internet banking, ATM services, payment gateway")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Infrastructure Services: ", bold: true }), new TextRun("Network, server, storage, backup & recovery, monitoring")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "End User Services: ", bold: true }), new TextRun("Desktop support, email, collaboration tools, printing services")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Security Services: ", bold: true }), new TextRun("Access management, security incident response, compliance monitoring")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Transaction Claims: ", bold: true }), new TextRun("Penanganan klaim transaksi, dispute resolution, ATM claims")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3.3 Pengguna Sistem")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "End Users (2,500+ users): ", bold: true }), new TextRun("Karyawan Bank SulutGo di seluruh cabang yang membutuhkan layanan TI")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "IT Technicians (100+ staff): ", bold: true }), new TextRun("Tim IT support yang menangani dan menyelesaikan tiket layanan")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Branch Managers (250+ managers): ", bold: true }), new TextRun("Manager cabang dengan fungsi approval untuk permintaan tertentu")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "IT Managers (20+ managers): ", bold: true }), new TextRun("Supervisor tim IT dengan akses monitoring dan reporting")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "System Administrators (10+ admins): ", bold: true }), new TextRun("Administrator sistem yang mengelola konfigurasi dan master data")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Security Analysts (5+ analysts): ", bold: true }), new TextRun("Tim keamanan yang menangani security incident dan monitoring")]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 4. FITUR-FITUR UTAMA
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("4. FITUR-FITUR UTAMA SISTEM")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4.1 Ticket Management")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Multi-channel Ticket Creation: ", bold: true }), new TextRun("Web portal, email, API integration, omnichannel support")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Service Catalog: ", bold: true }), new TextRun("Katalog layanan terstruktur dengan 240+ layanan TI yang tersedia")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Dynamic Forms: ", bold: true }), new TextRun("Custom fields dan form templates untuk setiap jenis layanan")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Automated Assignment: ", bold: true }), new TextRun("Assignment otomatis berdasarkan support group, branch, dan workload balancing")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Status Tracking: ", bold: true }), new TextRun("Tracking real-time status tiket dari OPEN → IN_PROGRESS → RESOLVED → CLOSED")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Priority Management: ", bold: true }), new TextRun("4 level prioritas (LOW, MEDIUM, HIGH, URGENT) dengan SLA berbeda")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Attachment Support: ", bold: true }), new TextRun("Upload dokumen, screenshot, dan file pendukung hingga 10MB per file")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4.2 Approval Workflow")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Multi-level Approval: ", bold: true }), new TextRun("Support untuk approval hierarki hingga 3 level (Branch Manager → Department Head → Director)")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Configurable Rules: ", bold: true }), new TextRun("Aturan approval yang dapat dikonfigurasi per service berdasarkan kriteria tertentu")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Approval Dashboard: ", bold: true }), new TextRun("Dashboard khusus untuk manager melihat pending approvals dan history")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Email Notifications: ", bold: true }), new TextRun("Notifikasi otomatis ke approver dengan link direct approval")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Audit Trail: ", bold: true }), new TextRun("Logging lengkap setiap approval decision dengan timestamp dan alasan")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4.3 SLA Management")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "SLA Configuration: ", bold: true }), new TextRun("Pengaturan SLA per service dengan response time dan resolution time berbeda")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Real-time Monitoring: ", bold: true }), new TextRun("Monitoring SLA status secara real-time dengan countdown timer")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Progressive Alerts: ", bold: true }), new TextRun("Alert otomatis pada 50%, 75%, dan 90% SLA threshold")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "SLA Reports: ", bold: true }), new TextRun("Laporan SLA compliance dengan breakdown per service, technician, dan periode")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Breach Analysis: ", bold: true }), new TextRun("Analisis penyebab SLA breach untuk continuous improvement")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4.4 Escalation Management")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "4-Level Escalation: ", bold: true }), new TextRun("Senior Technician → Support Group Manager → Department Head → IT Director")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Automatic Escalation: ", bold: true }), new TextRun("Eskalasi otomatis berdasarkan SLA breach atau no response threshold")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Manual Escalation: ", bold: true }), new TextRun("User atau manager dapat request escalation secara manual")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Priority Elevation: ", bold: true }), new TextRun("Automatic priority increase saat eskalasi untuk mempercepat penanganan")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Escalation Tracking: ", bold: true }), new TextRun("Tracking lengkap escalation path dan timeline untuk analisis")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4.5 Communication & Collaboration")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Comment System: ", bold: true }), new TextRun("Komunikasi dua arah antara user dan technician dengan comment threading")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Internal Notes: ", bold: true }), new TextRun("Private notes untuk komunikasi internal tim IT support")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Multi-channel Notifications: ", bold: true }), new TextRun("Email, in-app notifications, dan SMS untuk event penting")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Notification Preferences: ", bold: true }), new TextRun("User dapat mengatur preferensi notifikasi sesuai kebutuhan")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Collaboration Tools: ", bold: true }), new TextRun("Mention users, link related tickets, attach knowledge articles")]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4.6 Knowledge Management")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Knowledge Base: ", bold: true }), new TextRun("Repository artikel solusi, troubleshooting guide, dan FAQ")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Article Authoring: ", bold: true }), new TextRun("Rich text editor dengan support untuk images, tables, dan formatting")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Search & Discovery: ", bold: true }), new TextRun("Full-text search dengan filtering dan relevance ranking")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Article Rating: ", bold: true }), new TextRun("User feedback dan rating untuk mengukur kualitas artikel")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Linked to Tickets: ", bold: true }), new TextRun("Auto-suggest relevant articles saat user membuat ticket")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Version Control: ", bold: true }), new TextRun("Tracking perubahan artikel dengan version history")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4.7 Reporting & Analytics")]
      }),

      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Sistem menyediakan lebih dari 30 jenis laporan yang dapat dikategorikan sebagai berikut:")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.7.1 Operational Reports")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("All Tickets Report dengan filtering multi-dimensi")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Transaction Claims Report dengan export CSV/XLSX")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Open & On-Hold Tickets Report")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("ATM Issues & Claims Report")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Daily Operations Report")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.7.2 Performance Reports")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Technician Performance Report (individual & team)")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Branch Operations Report")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Service Catalog Performance")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("SLA Compliance & Breach Analysis")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Team Performance Metrics")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.7.3 Business Intelligence Reports")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Customer Experience Dashboard")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Operational Excellence Metrics")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("ATM Intelligence Report")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Technical Trends Analysis")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Request Analytics by Category/Priority/Status")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.7.4 Compliance & Audit Reports")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Security Incident Report")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("System Health Report")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Approval Workflow Audit")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("User Activity Log")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4.8 Network & ATM Monitoring")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Real-time Monitoring: ", bold: true }), new TextRun("Monitoring status 250+ cabang dan 500+ ATM secara real-time")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Visual Map: ", bold: true }), new TextRun("Peta Indonesia dengan marker status branch dan ATM")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Ping Monitoring: ", bold: true }), new TextRun("Automated ping test untuk deteksi early warning network issues")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Incident Correlation: ", bold: true }), new TextRun("Automatic ticket creation dari monitoring alerts")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Performance Metrics: ", bold: true }), new TextRun("Latency, packet loss, uptime percentage per location")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Alert Management: ", bold: true }), new TextRun("Konfigurasi alert threshold dan notification rules")]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 5. TEKNOLOGI YANG DIGUNAKAN
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("5. TEKNOLOGI YANG DIGUNAKAN")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5.1 Frontend Technology Stack")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Next.js 15.4.4: ", bold: true }), new TextRun("Modern React framework dengan App Router untuk performance optimal dan SEO-friendly")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "React 18: ", bold: true }), new TextRun("Library JavaScript untuk membangun user interface yang interactive dan responsive")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "TypeScript: ", bold: true }), new TextRun("Superset JavaScript dengan static typing untuk code quality dan maintainability")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Tailwind CSS: ", bold: true }), new TextRun("Utility-first CSS framework untuk rapid UI development")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Radix UI: ", bold: true }), new TextRun("Accessible UI components library untuk consistency dan accessibility")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "React Query: ", bold: true }), new TextRun("Server state management dengan automatic caching dan refetching")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Zustand: ", bold: true }), new TextRun("Lightweight state management untuk client-side state")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5.2 Backend Technology Stack")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Next.js API Routes: ", bold: true }), new TextRun("Serverless API endpoints dengan automatic code splitting")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "PostgreSQL: ", bold: true }), new TextRun("Enterprise-grade relational database dengan ACID compliance")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Prisma ORM: ", bold: true }), new TextRun("Type-safe database client dengan migration management")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "NextAuth.js v5: ", bold: true }), new TextRun("Authentication library dengan support untuk multiple providers")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Node.js: ", bold: true }), new TextRun("JavaScript runtime untuk server-side execution")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5.3 Supporting Libraries & Tools")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "React Hook Form + Zod: ", bold: true }), new TextRun("Form management dengan schema validation")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Chart.js & Recharts: ", bold: true }), new TextRun("Data visualization untuk dashboard dan reports")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "jsPDF: ", bold: true }), new TextRun("PDF generation untuk export reports")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "XLSX: ", bold: true }), new TextRun("Excel file generation untuk data export")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Socket.io: ", bold: true }), new TextRun("Real-time bidirectional communication (configured)")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Nodemailer: ", bold: true }), new TextRun("Email sending dengan SMTP support")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5.4 Infrastructure & Deployment")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "PM2: ", bold: true }), new TextRun("Process manager untuk production deployment dengan zero-downtime reload")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Git: ", bold: true }), new TextRun("Version control system untuk collaborative development")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "ESLint: ", bold: true }), new TextRun("Code linting untuk code quality enforcement")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "SSL/HTTPS: ", bold: true }), new TextRun("Secure communication dengan TLS encryption")]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 6. ARSITEKTUR SISTEM
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("6. ARSITEKTUR SISTEM")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("6.1 Arsitektur Aplikasi")]
      }),
      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun("Aplikasi ServiceDesk menggunakan arsitektur modern dengan pendekatan monolithic modular yang memberikan keseimbangan optimal antara simplicity dan scalability:")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Presentation Layer: ", bold: true }), new TextRun("React components dengan server-side rendering (SSR) dan client-side rendering (CSR) hybrid approach")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Business Logic Layer: ", bold: true }), new TextRun("Next.js API routes dengan modular service organization")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Data Access Layer: ", bold: true }), new TextRun("Prisma ORM dengan optimized queries dan connection pooling")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Database Layer: ", bold: true }), new TextRun("PostgreSQL dengan proper indexing dan query optimization")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("6.2 Database Design")]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Database dirancang dengan normalisasi yang tepat untuk menjaga data integrity sambil mempertahankan query performance:")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Core Tables: ", bold: true }), new TextRun("User, Ticket, Service, Branch, SupportGroup, Category")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Relationship Tables: ", bold: true }), new TextRun("ServiceField, FieldTemplate, TicketComment, TicketAttachment")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Audit Tables: ", bold: true }), new TextRun("AuditLog, LoginAttempt, ImportLog untuk tracking dan compliance")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Monitoring Tables: ", bold: true }), new TextRun("ATM, NetworkEndpoint, MonitoringIncident, PingResult")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Knowledge Tables: ", bold: true }), new TextRun("KnowledgeArticle, ArticleComment, ArticleFeedback")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("6.3 Security Architecture")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Authentication: ", bold: true }), new TextRun("NextAuth.js dengan credential-based authentication dan session management")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Authorization: ", bold: true }), new TextRun("Role-based access control (RBAC) dengan 7 predefined roles")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Account Protection: ", bold: true }), new TextRun("Account lockout setelah 5 failed login attempts (30 menit lockout)")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Data Encryption: ", bold: true }), new TextRun("Password hashing dengan bcrypt, sensitive data encryption at rest")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Transport Security: ", bold: true }), new TextRun("HTTPS/TLS untuk semua communication")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Input Validation: ", bold: true }), new TextRun("Zod schema validation untuk semua user inputs")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "XSS Prevention: ", bold: true }), new TextRun("Content Security Policy dan sanitization")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "CSRF Protection: ", bold: true }), new TextRun("Built-in NextAuth CSRF tokens")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("6.4 Integration Architecture")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "RESTful API: ", bold: true }), new TextRun("Standard HTTP methods untuk external integration")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "API Key Management: ", bold: true }), new TextRun("Secure API keys dengan permissions dan rate limiting")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Webhook Support: ", bold: true }), new TextRun("Outbound webhooks untuk event notifications")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Email Integration: ", bold: true }), new TextRun("SMTP untuk notifications dan ticket creation via email")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Legacy System: ", bold: true }), new TextRun("Import dari ManageEngine ServiceDesk Plus dengan rollback capability")]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 7. IMPLEMENTASI DAN DEPLOYMENT
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("7. IMPLEMENTASI DAN DEPLOYMENT")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("7.1 Development Approach")]
      }),
      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun("Pengembangan aplikasi mengikuti metodologi Agile dengan sprint 2 minggu, mencakup:")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Sprint Planning: ", bold: true }), new TextRun("Requirement analysis dan task breakdown")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Daily Standups: ", bold: true }), new TextRun("Progress tracking dan blocker identification")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Code Review: ", bold: true }), new TextRun("Peer review sebelum merge ke main branch")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Sprint Review: ", bold: true }), new TextRun("Demo kepada stakeholders")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Sprint Retrospective: ", bold: true }), new TextRun("Continuous improvement discussion")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("7.2 Testing Strategy")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Manual Testing: ", bold: true }), new TextRun("Comprehensive manual testing melalui UI untuk semua user flows")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Role-based Testing: ", bold: true }), new TextRun("Testing dengan different user accounts untuk verify RBAC")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Integration Testing: ", bold: true }), new TextRun("Testing integrasi dengan database dan external services")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Performance Testing: ", bold: true }), new TextRun("Load testing untuk ensure scalability")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Security Testing: ", bold: true }), new TextRun("Vulnerability scanning dan penetration testing")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("7.3 Deployment Process")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Environment Setup: ", bold: true }), new TextRun("Development, Staging, dan Production environments")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Build Process: ", bold: true }), new TextRun("Automated build dengan npm run build")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Database Migration: ", bold: true }), new TextRun("Prisma migrations dengan rollback capability")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "PM2 Deployment: ", bold: true }), new TextRun("Zero-downtime deployment dengan PM2 reload")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Health Checks: ", bold: true }), new TextRun("Post-deployment verification")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Monitoring: ", bold: true }), new TextRun("PM2 monitoring untuk application health")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("7.4 Data Migration")]
      }),

      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Migrasi data dari sistem legacy ManageEngine ServiceDesk Plus dilakukan dengan pendekatan yang hati-hati:")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Data Analysis: ", bold: true }), new TextRun("Analisis struktur data legacy dan mapping ke schema baru")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Import Scripts: ", bold: true }), new TextRun("Custom Node.js scripts untuk automated import dengan 250+ branch mapping")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Batch Processing: ", bold: true }), new TextRun("Import dalam batches untuk avoid timeout dan memory issues")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Data Validation: ", bold: true }), new TextRun("Verification scripts untuk ensure data integrity")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Rollback Mechanism: ", bold: true }), new TextRun("ImportLog tracking untuk rollback capability jika diperlukan")]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 8. KEUNGGULAN KOMPETITIF
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("8. KEUNGGULAN KOMPETITIF")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("8.1 Customization untuk Banking Industry")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Banking-specific Features: ", bold: true }), new TextRun("Transaction claims handling, ATM management, branch operations tracking")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Multi-branch Architecture: ", bold: true }), new TextRun("Native support untuk 250+ cabang dengan branch-scoped data dan permissions")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Compliance Ready: ", bold: true }), new TextRun("Audit logging, data encryption, access control sesuai regulasi perbankan")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Integration with Core Banking: ", bold: true }), new TextRun("API integration capability untuk koneksi dengan sistem core banking")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("8.2 Modern Technology Advantage")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Performance: ", bold: true }), new TextRun("Next.js SSR/SSG untuk fast initial load dan optimal SEO")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Scalability: ", bold: true }), new TextRun("Horizontal scaling capability dengan stateless architecture")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Developer Experience: ", bold: true }), new TextRun("TypeScript untuk type safety, hot reload untuk rapid development")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Maintainability: ", bold: true }), new TextRun("Clean code architecture, modular design, comprehensive documentation")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("8.3 User Experience Excellence")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Intuitive Interface: ", bold: true }), new TextRun("Modern UI dengan Tailwind CSS dan Radix UI components")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Responsive Design: ", bold: true }), new TextRun("Mobile-friendly untuk akses dari berbagai devices")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Real-time Updates: ", bold: true }), new TextRun("Live notifications dan status updates")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Accessibility: ", bold: true }), new TextRun("WCAG 2.1 compliant untuk inclusive design")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("8.4 Cost Efficiency")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "In-house Development: ", bold: true }), new TextRun("No licensing fees untuk commercial ITSM software")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Open Source Stack: ", bold: true }), new TextRun("Built dengan open source technologies untuk cost reduction")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Customization Freedom: ", bold: true }), new TextRun("Unlimited customization tanpa additional vendor fees")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "No Per-user Licensing: ", bold: true }), new TextRun("Unlimited users tanpa biaya tambahan per seat")]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 9. ROADMAP DAN PENGEMBANGAN MASA DEPAN
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("9. ROADMAP DAN PENGEMBANGAN MASA DEPAN")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("9.1 Short-term Roadmap (3-6 bulan)")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Mobile Application: ", bold: true }), new TextRun("Native mobile app untuk iOS dan Android")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Advanced Analytics: ", bold: true }), new TextRun("Predictive analytics dengan machine learning untuk forecast incidents")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Chatbot Integration: ", bold: true }), new TextRun("AI-powered chatbot untuk first-level support")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Self-service Portal Enhancement: ", bold: true }), new TextRun("Expanded knowledge base dan guided troubleshooting")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("9.2 Mid-term Roadmap (6-12 bulan)")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Change Management Module: ", bold: true }), new TextRun("Complete ITIL change management dengan CAB workflow")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Asset Management Enhancement: ", bold: true }), new TextRun("Complete asset lifecycle management dengan depreciation tracking")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Service Catalog Expansion: ", bold: true }), new TextRun("Marketplace-style service catalog dengan approval automation")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Advanced Reporting: ", bold: true }), new TextRun("Custom report builder dengan drag-and-drop interface")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("9.3 Long-term Vision (12-24 bulan)")]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "AI/ML Integration: ", bold: true }), new TextRun("Automated ticket categorization, priority assignment, dan solution suggestion")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "IoT Integration: ", bold: true }), new TextRun("Direct integration dengan IoT devices untuk proactive monitoring")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Multi-tenant Architecture: ", bold: true }), new TextRun("SaaS capability untuk serve multiple organizations")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Advanced Automation: ", bold: true }), new TextRun("RPA integration untuk automated remediation")]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // 10. PENUTUP
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("10. PENUTUP")]
      }),

      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun("Aplikasi ServiceDesk Bank SulutGo merupakan solusi komprehensif yang dirancang khusus untuk memenuhi kebutuhan manajemen layanan TI di lingkungan perbankan dengan skala multi-cabang. Dengan mengadopsi best practice ITIL v4 dan memanfaatkan teknologi modern, aplikasi ini tidak hanya menyelesaikan tantangan operasional yang ada saat ini, tetapi juga memberikan fondasi yang kuat untuk transformasi digital Bank SulutGo di masa depan.")]
      }),

      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun("Keberhasilan implementasi sistem ini bergantung pada komitmen dan kolaborasi dari seluruh stakeholder, termasuk manajemen, tim IT, dan end users. Dengan dukungan yang tepat, training yang memadai, dan continuous improvement mindset, aplikasi ServiceDesk akan menjadi enabler utama dalam meningkatkan kualitas layanan TI dan mendukung pencapaian objektif bisnis Bank SulutGo.")]
      }),

      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun({ text: "Key Success Factors:", bold: true })]
      }),

      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "User Adoption: ", bold: true }), new TextRun("Training dan change management yang efektif")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Continuous Improvement: ", bold: true }), new TextRun("Regular review dan enhancement berdasarkan feedback")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Data-driven Decision: ", bold: true }), new TextRun("Leverage analytics untuk strategic planning")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Integration: ", bold: true }), new TextRun("Seamless integration dengan existing systems")]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Innovation: ", bold: true }), new TextRun("Embrace new technologies untuk competitive advantage")]
      }),

      new Paragraph({
        spacing: { before: 360, after: 180 },
        children: [new TextRun("Dengan roadmap yang jelas dan komitmen untuk continuous improvement, aplikasi ServiceDesk Bank SulutGo akan terus berkembang dan beradaptasi dengan kebutuhan bisnis yang dinamis, memastikan bahwa layanan TI dapat mendukung operasional perbankan dengan optimal dan memberikan nilai tambah bagi seluruh stakeholder.")]
      }),

      // Closing
      new Paragraph({
        spacing: { before: 480 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "--- Akhir Dokumen ---", italics: true, color: "666666" })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/Users/razboth/Documents/Project/Servicedesk/LATAR_BELAKANG_SERVICEDESK.docx", buffer);
  console.log("✅ Dokumen berhasil dibuat: LATAR_BELAKANG_SERVICEDESK.docx");
});
