const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageBreak, LevelFormat } = require('docx');
const fs = require('fs');

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
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-list-1",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-list-2",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-list-3",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-list-4",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
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
      // Cover Page
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("BUSINESS REQUIREMENTS DOCUMENT")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 240 },
        children: [new TextRun({ text: "Sistem Monitoring Jaringan Cabang Berbasis Peta", size: 32, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: "Bank SulutGo ServiceDesk", size: 28, color: "666666" })]
      }),

      // Document Info Table
      createInfoTable(),

      new Paragraph({ children: [new PageBreak()] }),

      // 1. RINGKASAN EKSEKUTIF
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. RINGKASAN EKSEKUTIF")] }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Dokumen ini menjelaskan kebutuhan bisnis untuk pengembangan fitur Sistem Monitoring Jaringan Cabang Berbasis Peta (Branch Network Monitoring Map) pada aplikasi Bank SulutGo ServiceDesk. Fitur ini bertujuan untuk meningkatkan visibilitas dan efisiensi monitoring infrastruktur jaringan di seluruh cabang Bank SulutGo melalui visualisasi geografis real-time.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.1 Latar Belakang")] }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("Bank SulutGo saat ini memiliki lebih dari 250 cabang yang tersebar di seluruh Sulawesi Utara dan wilayah sekitarnya. Setiap cabang memiliki infrastruktur jaringan yang perlu dimonitor secara real-time untuk memastikan ketersediaan layanan perbankan. Sistem monitoring yang ada saat ini menggunakan tampilan tabel/grid yang kurang memberikan gambaran geografis dan sulit untuk memahami distribusi status jaringan secara spasial.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.2 Tujuan Proyek")] }),
      new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun("Meningkatkan visibilitas status jaringan cabang melalui visualisasi peta interaktif")] }),
      new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun("Mempercepat identifikasi masalah jaringan berdasarkan lokasi geografis")] }),
      new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun("Memberikan kemudahan akses informasi detail jaringan cabang dalam satu tampilan")] }),
      new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun("Meningkatkan kecepatan respons tim IT terhadap gangguan jaringan")] }),
      new Paragraph({
        spacing: { after: 120, before: 120 },
        numbering: { reference: "numbered-list-1", level: 0 },
        children: [new TextRun("Mendukung pengambilan keputusan strategis terkait infrastruktur jaringan")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.3 Ruang Lingkup")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Termasuk dalam Ruang Lingkup:", bold: true })]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Visualisasi peta interaktif menggunakan Leaflet dan OpenStreetMap")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Penambahan field koordinat geografis (latitude/longitude) pada database cabang")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Marker berwarna untuk menunjukkan status jaringan (Online/Offline/Slow/Stale/Unknown)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Popup detail informasi cabang dan metrik jaringan")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Dashboard statistik monitoring")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Auto-refresh data setiap 30 detik")] }),
      new Paragraph({
        spacing: { after: 60, before: 120 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Form input koordinat pada halaman administrasi cabang")]
      }),

      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Tidak Termasuk dalam Ruang Lingkup:", bold: true })]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Monitoring ATM (sudah ada pada sistem terpisah)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Perubahan mekanisme ping monitoring yang sudah ada")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Integrasi dengan sistem monitoring eksternal")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 2. PEMANGKU KEPENTINGAN
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. PEMANGKU KEPENTINGAN (STAKEHOLDERS)")] }),
      createStakeholderTable(),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 3. KEBUTUHAN BISNIS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. KEBUTUHAN BISNIS")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 Objektif Bisnis")] }),
      createBusinessObjectivesTable(),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 Manfaat yang Diharapkan")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Manfaat Operasional:", bold: true })]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Pengurangan waktu identifikasi masalah jaringan hingga 60%")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Peningkatan kecepatan respons tim IT terhadap gangguan")] }),
      new Paragraph({
        spacing: { after: 120 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Visualisasi distribusi masalah jaringan berdasarkan wilayah geografis")]
      }),

      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Manfaat Strategis:", bold: true })]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Data untuk perencanaan ekspansi jaringan dan infrastruktur")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Identifikasi pola masalah berdasarkan lokasi geografis")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Peningkatan kualitas layanan IT kepada cabang-cabang")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 4. KEBUTUHAN FUNGSIONAL
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. KEBUTUHAN FUNGSIONAL")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 Visualisasi Peta")] }),
      createFunctionalReqTable("FR-001", "Peta Interaktif", [
        "Sistem harus menampilkan peta interaktif menggunakan Leaflet dan OpenStreetMap",
        "Peta harus dapat di-zoom in/out dan di-pan",
        "Peta harus menampilkan seluruh cabang yang memiliki koordinat geografis",
        "Peta harus berpusat pada rata-rata koordinat semua cabang",
        "Jika tidak ada cabang dengan koordinat, peta berpusat di Manado (1.4748, 124.8421)"
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      createFunctionalReqTable("FR-002", "Marker Status", [
        "Setiap cabang ditampilkan dengan marker berwarna sesuai status:",
        "  • Hijau: ONLINE (jaringan normal)",
        "  • Merah: OFFLINE (jaringan tidak dapat dijangkau)",
        "  • Kuning: SLOW (response time tinggi)",
        "  • Oranye: STALE (data monitoring sudah lama)",
        "  • Abu-abu: UNKNOWN (belum pernah dimonitor)",
        "Marker harus berbentuk pin lokasi dengan ikon custom SVG"
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      createFunctionalReqTable("FR-003", "Popup Detail Cabang", [
        "Klik pada marker harus menampilkan popup dengan informasi:",
        "  • Nama cabang",
        "  • Kode cabang",
        "  • Alamat lengkap",
        "  • Status jaringan (ONLINE/OFFLINE/SLOW/STALE/UNKNOWN)",
        "  • IP Address",
        "  • Backup IP Address (jika ada)",
        "  • Response Time (jika tersedia)",
        "  • Packet Loss (jika tersedia)",
        "  • Waktu pengecekan terakhir",
        "  • Media jaringan (VSAT/M2M/FO)",
        "  • Vendor jaringan",
        "  • Status insiden aktif (jika ada)"
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2 Dashboard Statistik")] }),
      createFunctionalReqTable("FR-004", "Summary Statistics", [
        "Dashboard harus menampilkan ringkasan statistik:",
        "  • Total cabang yang dimonitor",
        "  • Jumlah cabang ONLINE",
        "  • Jumlah cabang OFFLINE",
        "  • Jumlah cabang SLOW",
        "  • Jumlah cabang STALE",
        "  • Jumlah cabang UNKNOWN",
        "  • Jumlah insiden aktif",
        "Statistik harus di-update setiap auto-refresh"
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.3 Auto-Refresh")] }),
      createFunctionalReqTable("FR-005", "Pembaruan Otomatis", [
        "Sistem harus melakukan refresh data otomatis setiap 30 detik",
        "Indikator loading harus ditampilkan saat refresh berlangsung",
        "Posisi zoom dan pan peta harus dipertahankan setelah refresh",
        "Popup yang sedang terbuka harus tetap terbuka setelah refresh"
      ]),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.4 Manajemen Koordinat")] }),
      createFunctionalReqTable("FR-006", "Input Koordinat Cabang", [
        "Admin harus dapat menginput latitude dan longitude pada halaman edit cabang",
        "Admin harus dapat menginput koordinat saat membuat cabang baru",
        "Field koordinat harus menerima angka desimal (float)",
        "Field koordinat bersifat opsional",
        "Validasi format koordinat (latitude: -90 sampai 90, longitude: -180 sampai 180)",
        "Sistem harus menyimpan koordinat ke database dengan tipe Float"
      ]),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 5. KEBUTUHAN NON-FUNGSIONAL
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. KEBUTUHAN NON-FUNGSIONAL")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.1 Performa")] }),
      createNonFunctionalReqTable("NFR-001", "Kecepatan Loading", "Halaman peta harus ter-load dalam waktu maksimal 3 detik pada koneksi normal"),
      createNonFunctionalReqTable("NFR-002", "Responsivitas Peta", "Peta harus responsif dengan delay maksimal 500ms untuk zoom dan pan"),
      createNonFunctionalReqTable("NFR-003", "Auto-refresh", "Auto-refresh harus berjalan tanpa mengganggu interaksi user yang sedang berlangsung"),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.2 Keamanan")] }),
      createNonFunctionalReqTable("NFR-004", "Autentikasi", "Hanya user dengan role ADMIN, SUPER_ADMIN, MANAGER, dan TECHNICIAN yang dapat mengakses halaman monitoring"),
      createNonFunctionalReqTable("NFR-005", "Autorisasi", "Hanya ADMIN yang dapat mengedit koordinat cabang"),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.3 Ketersediaan")] }),
      createNonFunctionalReqTable("NFR-006", "Uptime", "Sistem monitoring harus memiliki availability 99.5% dalam 1 bulan"),
      createNonFunctionalReqTable("NFR-007", "Monitoring Service", "Service monitoring harus dapat restart otomatis jika terjadi crash"),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.4 Skalabilitas")] }),
      createNonFunctionalReqTable("NFR-008", "Kapasitas", "Sistem harus dapat menangani monitoring hingga 500 cabang tanpa degradasi performa"),
      createNonFunctionalReqTable("NFR-009", "Concurrent Users", "Sistem harus dapat menangani minimal 50 user yang mengakses peta secara bersamaan"),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.5 Usability")] }),
      createNonFunctionalReqTable("NFR-010", "Kemudahan Penggunaan", "Interface harus intuitif dan tidak memerlukan training khusus"),
      createNonFunctionalReqTable("NFR-011", "Responsif", "Tampilan harus responsif dan dapat diakses dari desktop dan tablet"),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 6. SPESIFIKASI TEKNIS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. SPESIFIKASI TEKNIS")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1 Teknologi yang Digunakan")] }),
      createTechnologyTable(),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2 Struktur Database")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Modifikasi pada Model Branch:", bold: true })]
      }),
      createDatabaseSchemaTable(),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.3 Arsitektur Sistem")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Komponen Sistem:", bold: true })]
      }),
      new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun("Frontend (React/Next.js): Menampilkan peta interaktif dengan Leaflet")] }),
      new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun("API Layer: Endpoint /api/monitoring/network/status untuk mengambil data")] }),
      new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun("Monitoring Service: Service terpisah yang melakukan ping berkala")] }),
      new Paragraph({
        spacing: { after: 120 },
        numbering: { reference: "numbered-list-2", level: 0 },
        children: [new TextRun("Database: PostgreSQL dengan Prisma ORM")]
      }),

      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Flow Data:", bold: true })]
      }),
      new Paragraph({ numbering: { reference: "numbered-list-3", level: 0 }, children: [new TextRun("Monitoring service melakukan ping ke IP cabang setiap 2 menit")] }),
      new Paragraph({ numbering: { reference: "numbered-list-3", level: 0 }, children: [new TextRun("Hasil ping disimpan ke tabel NetworkMonitoringLog")] }),
      new Paragraph({ numbering: { reference: "numbered-list-3", level: 0 }, children: [new TextRun("Frontend memanggil API setiap 30 detik")] }),
      new Paragraph({ numbering: { reference: "numbered-list-3", level: 0 }, children: [new TextRun("API mengambil data terbaru dari NetworkMonitoringLog")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "numbered-list-3", level: 0 },
        children: [new TextRun("Frontend memperbarui marker dan statistik di peta")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 7. USER STORIES
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. USER STORIES")] }),
      createUserStoryTable("US-001", "Manager IT", "Melihat status jaringan semua cabang dalam satu peta", "Saya dapat dengan cepat mengidentifikasi cabang mana yang mengalami masalah jaringan"),
      createUserStoryTable("US-002", "Teknisi Jaringan", "Melihat detail metrik jaringan cabang tertentu", "Saya dapat memahami performa jaringan sebelum melakukan troubleshooting"),
      createUserStoryTable("US-003", "Administrator", "Menginput koordinat geografis cabang", "Cabang dapat ditampilkan pada peta monitoring"),
      createUserStoryTable("US-004", "Manager IT", "Melihat distribusi geografis masalah jaringan", "Saya dapat mengidentifikasi pola masalah berdasarkan wilayah"),
      createUserStoryTable("US-005", "Teknisi Jaringan", "Mendapatkan informasi real-time status jaringan", "Saya dapat merespons masalah dengan cepat tanpa perlu manual checking"),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 8. RENCANA IMPLEMENTASI
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8. RENCANA IMPLEMENTASI")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.1 Fase Implementasi")] }),
      createImplementationPhaseTable(),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.2 Timeline Proyek")] }),
      createTimelineTable(),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.3 Sumber Daya yang Diperlukan")] }),
      createResourceTable(),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 9. METRIK KEBERHASILAN
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("9. METRIK KEBERHASILAN")] }),
      createSuccessMetricsTable(),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 10. RISIKO DAN MITIGASI
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("10. RISIKO DAN MITIGASI")] }),
      createRiskTable(),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun("")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 11. ASUMSI DAN KETERGANTUNGAN
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("11. ASUMSI DAN KETERGANTUNGAN")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("11.1 Asumsi")] }),
      new Paragraph({ numbering: { reference: "numbered-list-4", level: 0 }, children: [new TextRun("Setiap cabang memiliki IP address yang dapat dijangkau dari server monitoring")] }),
      new Paragraph({ numbering: { reference: "numbered-list-4", level: 0 }, children: [new TextRun("Koordinat geografis cabang dapat diperoleh dari tim operasional")] }),
      new Paragraph({ numbering: { reference: "numbered-list-4", level: 0 }, children: [new TextRun("Koneksi internet server cukup stabil untuk melakukan ping berkala")] }),
      new Paragraph({
        spacing: { after: 120 },
        numbering: { reference: "numbered-list-4", level: 0 },
        children: [new TextRun("User memiliki browser modern yang support Leaflet library")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("11.2 Ketergantungan")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("OpenStreetMap API untuk tile peta (gratis, tanpa API key)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Leaflet library versi 1.9.x atau lebih baru")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("React-leaflet library untuk integrasi React")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("PostgreSQL database dengan Prisma ORM")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("PM2 untuk manajemen monitoring service")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // 12. LAMPIRAN
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("12. LAMPIRAN")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("12.1 Definisi Status Jaringan")] }),
      createStatusDefinitionTable(),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("12.2 Endpoint API")] }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "GET /api/monitoring/network/status", bold: true })]
      }),
      new Paragraph({
        spacing: { after: 30 },
        children: [new TextRun("Query Parameters:")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("type: 'BRANCH' (untuk filter hanya cabang)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("limit: jumlah data (default 500 untuk admin)")] }),
      new Paragraph({
        spacing: { after: 60 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("branchId: filter berdasarkan cabang tertentu")]
      }),

      new Paragraph({
        spacing: { after: 30 },
        children: [new TextRun("Response:")]
      }),
      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun({
          text: `{
  "summary": {
    "total": 250,
    "online": 230,
    "offline": 10,
    "slow": 5,
    "stale": 3,
    "unknown": 2,
    "activeIncidents": 5
  },
  "branches": [
    {
      "id": "...",
      "name": "CABANG AIRMADIDI",
      "code": "017",
      "latitude": 1.42699,
      "longitude": 124.980266,
      "ipAddress": "192.168.1.1",
      "status": "ONLINE",
      "responseTime": 25,
      "packetLoss": 0,
      "lastChecked": "2025-10-21T10:30:00Z"
    }
  ],
  "timestamp": "2025-10-21T10:30:00Z"
}`,
          font: "Courier New",
          size: 20
        })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("12.3 Kode Warna Marker")] }),
      createColorCodeTable(),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("12.4 URL Akses")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Development: http://localhost:3000/monitoring/branches")] }),
      new Paragraph({
        spacing: { after: 180 },
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Production: https://servicedesk.banksulutgo.co.id/monitoring/branches")]
      }),

      // Document Footer
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
        children: [new TextRun({ text: "--- AKHIR DOKUMEN ---", bold: true, color: "999999" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240 },
        children: [new TextRun({ text: "Bank SulutGo - ServiceDesk System", size: 20, color: "999999" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "© 2025 Bank SulutGo. All Rights Reserved.", size: 20, color: "999999" })]
      })
    ]
  }]
});

// Helper functions for creating tables
function createInfoTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [3120, 6240],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      createInfoRow("Judul Proyek", "Sistem Monitoring Jaringan Cabang Berbasis Peta", cellBorders),
      createInfoRow("Versi Dokumen", "1.0", cellBorders),
      createInfoRow("Tanggal", "21 Oktober 2025", cellBorders),
      createInfoRow("Penulis", "Tim IT Bank SulutGo", cellBorders),
      createInfoRow("Status", "Final", cellBorders),
      createInfoRow("Departemen", "Information Technology", cellBorders)
    ]
  });
}

function createInfoRow(label: string, value: string, borders: any) {
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 3120, type: WidthType.DXA },
        shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })]
      }),
      new TableCell({
        borders,
        width: { size: 6240, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun(value)] })]
      })
    ]
  });
}

function createStakeholderTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [2340, 2340, 2340, 2340],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("Stakeholder", cellBorders),
          createHeaderCell("Role", cellBorders),
          createHeaderCell("Kepentingan", cellBorders),
          createHeaderCell("Level Keterlibatan", cellBorders)
        ]
      }),
      createStakeholderRow("Direktur IT", "Sponsor", "Meningkatkan efisiensi monitoring IT", "Tinggi", cellBorders),
      createStakeholderRow("Manager IT", "End User", "Monitoring dan manajemen jaringan", "Sangat Tinggi", cellBorders),
      createStakeholderRow("Teknisi Jaringan", "End User", "Troubleshooting dan maintenance", "Sangat Tinggi", cellBorders),
      createStakeholderRow("Administrator Sistem", "End User", "Input dan kelola data cabang", "Tinggi", cellBorders),
      createStakeholderRow("Tim Developer", "Implementor", "Develop dan maintain sistem", "Sangat Tinggi", cellBorders)
    ]
  });
}

function createHeaderCell(text: string, borders: any) {
  return new TableCell({
    borders,
    width: { size: 2340, type: WidthType.DXA },
    shading: { fill: "1F4E78", type: ShadingType.CLEAR },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: "FFFFFF" })]
    })]
  });
}

function createStakeholderRow(stakeholder: string, role: string, interest: string, involvement: string, borders: any) {
  return new TableRow({
    children: [
      createDataCell(stakeholder, borders),
      createDataCell(role, borders),
      createDataCell(interest, borders),
      createDataCell(involvement, borders)
    ]
  });
}

function createDataCell(text: string, borders: any) {
  return new TableCell({
    borders,
    width: { size: 2340, type: WidthType.DXA },
    children: [new Paragraph({ children: [new TextRun(text)] })]
  });
}

function createBusinessObjectivesTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [1560, 3900, 3900],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("No", cellBorders),
          createHeaderCell("Objektif", cellBorders),
          createHeaderCell("Indikator Keberhasilan", cellBorders)
        ]
      }),
      createObjectiveRow("1", "Meningkatkan visibilitas infrastruktur jaringan", "100% cabang dapat dilihat statusnya dalam 1 tampilan peta", cellBorders),
      createObjectiveRow("2", "Mempercepat deteksi masalah jaringan", "Waktu identifikasi masalah berkurang 60% dari rata-rata saat ini", cellBorders),
      createObjectiveRow("3", "Meningkatkan kualitas respons tim IT", "Waktu respons awal berkurang 40% dari rata-rata saat ini", cellBorders),
      createObjectiveRow("4", "Mendukung analisis strategis", "Data geografis tersedia untuk perencanaan infrastruktur 2026", cellBorders)
    ]
  });
}

function createObjectiveRow(no: string, objective: string, indicator: string, borders: any) {
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 1560, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun(no)]
        })]
      }),
      createDataCell(objective, borders),
      createDataCell(indicator, borders)
    ]
  });
}

function createFunctionalReqTable(id: string, title: string, requirements: string[]) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  const reqParagraphs = requirements.map(req =>
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun(req)]
    })
  );

  return new Table({
    columnWidths: [2340, 7020],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 2340, type: WidthType.DXA },
            shading: { fill: "E7E6E6", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "ID", bold: true })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 7020, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun(id)] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 2340, type: WidthType.DXA },
            shading: { fill: "E7E6E6", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 7020, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun(title)] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 2340, type: WidthType.DXA },
            shading: { fill: "E7E6E6", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Deskripsi", bold: true })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 7020, type: WidthType.DXA },
            children: reqParagraphs
          })
        ]
      })
    ]
  });
}

function createNonFunctionalReqTable(id: string, title: string, description: string) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [2340, 7020],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 2340, type: WidthType.DXA },
            shading: { fill: "E7E6E6", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "ID", bold: true })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 7020, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun(id)] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 2340, type: WidthType.DXA },
            shading: { fill: "E7E6E6", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Kategori", bold: true })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 7020, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun(title)] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 2340, type: WidthType.DXA },
            shading: { fill: "E7E6E6", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Requirement", bold: true })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 7020, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun(description)] })]
          })
        ]
      })
    ]
  });
}

function createTechnologyTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [3120, 3120, 3120],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("Kategori", cellBorders),
          createHeaderCell("Teknologi", cellBorders),
          createHeaderCell("Versi", cellBorders)
        ]
      }),
      createTechRow("Frontend Framework", "Next.js", "15.x", cellBorders),
      createTechRow("UI Library", "React", "18.x", cellBorders),
      createTechRow("Map Library", "Leaflet", "1.9.x", cellBorders),
      createTechRow("Map Integration", "React-leaflet", "4.x", cellBorders),
      createTechRow("Map Provider", "OpenStreetMap", "Free Tiles", cellBorders),
      createTechRow("Database", "PostgreSQL", "14+", cellBorders),
      createTechRow("ORM", "Prisma", "5.x", cellBorders),
      createTechRow("Language", "TypeScript", "5.x", cellBorders),
      createTechRow("Styling", "Tailwind CSS", "3.x", cellBorders),
      createTechRow("Process Manager", "PM2", "5.x", cellBorders)
    ]
  });
}

function createTechRow(category: string, tech: string, version: string, borders: any) {
  return new TableRow({
    children: [
      createDataCell(category, borders),
      createDataCell(tech, borders),
      createDataCell(version, borders)
    ]
  });
}

function createDatabaseSchemaTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [2340, 2340, 2340, 2340],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("Field", cellBorders),
          createHeaderCell("Type", cellBorders),
          createHeaderCell("Nullable", cellBorders),
          createHeaderCell("Keterangan", cellBorders)
        ]
      }),
      createSchemaRow("latitude", "Float", "Yes", "Koordinat latitude cabang", cellBorders),
      createSchemaRow("longitude", "Float", "Yes", "Koordinat longitude cabang", cellBorders)
    ]
  });
}

function createSchemaRow(field: string, type: string, nullable: string, desc: string, borders: any) {
  return new TableRow({
    children: [
      createDataCell(field, borders),
      createDataCell(type, borders),
      createDataCell(nullable, borders),
      createDataCell(desc, borders)
    ]
  });
}

function createUserStoryTable(id: string, role: string, action: string, benefit: string) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [1560, 7800],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 1560, type: WidthType.DXA },
            shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "ID", bold: true })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 7800, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun(id)] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 1560, type: WidthType.DXA },
            shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Story", bold: true })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 7800, type: WidthType.DXA },
            children: [new Paragraph({ children: [
              new TextRun({ text: "Sebagai ", italics: true }),
              new TextRun({ text: role, bold: true }),
              new TextRun({ text: ", saya ingin ", italics: true }),
              new TextRun({ text: action }),
              new TextRun({ text: ", sehingga ", italics: true }),
              new TextRun({ text: benefit })
            ]})]
          })
        ]
      })
    ]
  });
}

function createImplementationPhaseTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [1560, 2340, 5460],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("Fase", cellBorders),
          createHeaderCell("Durasi", cellBorders),
          createHeaderCell("Aktivitas", cellBorders)
        ]
      }),
      createPhaseRow("Fase 1", "1 minggu", "Database modification (add latitude/longitude fields), API enhancement", cellBorders),
      createPhaseRow("Fase 2", "2 minggu", "Frontend development (Leaflet integration, map UI, markers, popups)", cellBorders),
      createPhaseRow("Fase 3", "1 minggu", "Admin interface (coordinate input forms)", cellBorders),
      createPhaseRow("Fase 4", "1 minggu", "Testing & bug fixing", cellBorders),
      createPhaseRow("Fase 5", "1 minggu", "Data collection (coordinate input for all branches)", cellBorders),
      createPhaseRow("Fase 6", "1 minggu", "UAT & deployment", cellBorders)
    ]
  });
}

function createPhaseRow(phase: string, duration: string, activities: string, borders: any) {
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 1560, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: phase, bold: true })] })]
      }),
      new TableCell({
        borders,
        width: { size: 2340, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(duration)] })]
      }),
      createDataCell(activities, borders)
    ]
  });
}

function createTimelineTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [3120, 3120, 3120],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("Milestone", cellBorders),
          createHeaderCell("Target Tanggal", cellBorders),
          createHeaderCell("Deliverable", cellBorders)
        ]
      }),
      createMilestoneRow("Project Kickoff", "Minggu 1", "Project charter, team assignment", cellBorders),
      createMilestoneRow("Database & API Ready", "Minggu 2", "Schema migration, API endpoints", cellBorders),
      createMilestoneRow("Frontend Alpha", "Minggu 4", "Basic map with markers", cellBorders),
      createMilestoneRow("Admin Interface Ready", "Minggu 5", "Coordinate input forms", cellBorders),
      createMilestoneRow("Beta Release", "Minggu 6", "Complete feature for testing", cellBorders),
      createMilestoneRow("Production Release", "Minggu 7", "Deployed to production", cellBorders)
    ]
  });
}

function createMilestoneRow(milestone: string, date: string, deliverable: string, borders: any) {
  return new TableRow({
    children: [
      createDataCell(milestone, borders),
      createDataCell(date, borders),
      createDataCell(deliverable, borders)
    ]
  });
}

function createResourceTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [3120, 3120, 3120],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("Role", cellBorders),
          createHeaderCell("Jumlah", cellBorders),
          createHeaderCell("Alokasi Waktu", cellBorders)
        ]
      }),
      createResourceRow("Full-stack Developer", "2 orang", "100% (7 minggu)", cellBorders),
      createResourceRow("UI/UX Designer", "1 orang", "40% (2 minggu)", cellBorders),
      createResourceRow("QA Engineer", "1 orang", "60% (2 minggu)", cellBorders),
      createResourceRow("Database Administrator", "1 orang", "20% (1 minggu)", cellBorders),
      createResourceRow("Project Manager", "1 orang", "50% (7 minggu)", cellBorders)
    ]
  });
}

function createResourceRow(role: string, quantity: string, allocation: string, borders: any) {
  return new TableRow({
    children: [
      createDataCell(role, borders),
      new TableCell({
        borders,
        width: { size: 3120, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(quantity)] })]
      }),
      createDataCell(allocation, borders)
    ]
  });
}

function createSuccessMetricsTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [3120, 3120, 3120],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("Metrik", cellBorders),
          createHeaderCell("Target", cellBorders),
          createHeaderCell("Cara Pengukuran", cellBorders)
        ]
      }),
      createMetricRow("User Adoption", "80% user aktif menggunakan dalam 1 bulan", "Analytics tracking", cellBorders),
      createMetricRow("Waktu Identifikasi Masalah", "Berkurang 60%", "Time tracking sebelum vs sesudah", cellBorders),
      createMetricRow("Waktu Respons Awal", "Berkurang 40%", "SLA metrics comparison", cellBorders),
      createMetricRow("System Performance", "Load time < 3 detik", "Performance monitoring", cellBorders),
      createMetricRow("Data Accuracy", "95% koordinat cabang ter-input", "Database query", cellBorders),
      createMetricRow("User Satisfaction", "Rating ≥ 4.0/5.0", "User survey setelah 1 bulan", cellBorders)
    ]
  });
}

function createMetricRow(metric: string, target: string, measurement: string, borders: any) {
  return new TableRow({
    children: [
      createDataCell(metric, borders),
      createDataCell(target, borders),
      createDataCell(measurement, borders)
    ]
  });
}

function createRiskTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [2340, 2340, 2340, 2340],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("Risiko", cellBorders),
          createHeaderCell("Dampak", cellBorders),
          createHeaderCell("Probabilitas", cellBorders),
          createHeaderCell("Mitigasi", cellBorders)
        ]
      }),
      createRiskRow("Data koordinat tidak lengkap", "Medium", "High", "Survey bertahap dan prioritas cabang utama", cellBorders),
      createRiskRow("Performa peta lambat dengan banyak marker", "High", "Medium", "Clustering dan lazy loading", cellBorders),
      createRiskRow("OpenStreetMap API down", "Medium", "Low", "Fallback ke tile server alternatif", cellBorders),
      createRiskRow("Browser compatibility issues", "Low", "Medium", "Progressive enhancement dan testing", cellBorders),
      createRiskRow("User resistance terhadap perubahan UI", "Medium", "Medium", "Training dan dokumentasi lengkap", cellBorders)
    ]
  });
}

function createRiskRow(risk: string, impact: string, probability: string, mitigation: string, borders: any) {
  return new TableRow({
    children: [
      createDataCell(risk, borders),
      createDataCell(impact, borders),
      createDataCell(probability, borders),
      createDataCell(mitigation, borders)
    ]
  });
}

function createStatusDefinitionTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [2340, 7020],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("Status", cellBorders),
          createHeaderCell("Definisi", cellBorders)
        ]
      }),
      createStatusRow("ONLINE", "Jaringan normal, ping response < 100ms, packet loss < 5%", cellBorders),
      createStatusRow("SLOW", "Ping response 100-500ms atau packet loss 5-20%", cellBorders),
      createStatusRow("OFFLINE", "Tidak ada response atau packet loss > 20%", cellBorders),
      createStatusRow("STALE", "Data monitoring sudah lebih dari 10 menit (belum ter-update)", cellBorders),
      createStatusRow("UNKNOWN", "Belum pernah dimonitor atau monitoring disabled", cellBorders),
      createStatusRow("ERROR", "Terjadi error saat melakukan monitoring", cellBorders)
    ]
  });
}

function createStatusRow(status: string, definition: string, borders: any) {
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 2340, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: status, bold: true })] })]
      }),
      createDataCell(definition, borders)
    ]
  });
}

function createColorCodeTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    columnWidths: [2340, 2340, 4680],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell("Status", cellBorders),
          createHeaderCell("Warna", cellBorders),
          createHeaderCell("Hex Code", cellBorders)
        ]
      }),
      createColorRow("ONLINE", "Hijau", "#22c55e", cellBorders),
      createColorRow("OFFLINE", "Merah", "#ef4444", cellBorders),
      createColorRow("SLOW", "Kuning", "#eab308", cellBorders),
      createColorRow("STALE", "Oranye", "#f97316", cellBorders),
      createColorRow("UNKNOWN", "Abu-abu", "#9ca3af", cellBorders),
      createColorRow("ERROR", "Merah", "#ef4444", cellBorders)
    ]
  });
}

function createColorRow(status: string, color: string, hex: string, borders: any) {
  return new TableRow({
    children: [
      createDataCell(status, borders),
      createDataCell(color, borders),
      new TableCell({
        borders,
        width: { size: 4680, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: hex, font: "Courier New" })] })]
      })
    ]
  });
}

// Generate and save document
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("BRD-Branch-Network-Monitoring-Map.docx", buffer);
  console.log("\n✅ Dokumen BRD berhasil dibuat: BRD-Branch-Network-Monitoring-Map.docx");
  console.log("\n📄 Dokumen berisi:");
  console.log("   1. Ringkasan Eksekutif");
  console.log("   2. Pemangku Kepentingan");
  console.log("   3. Kebutuhan Bisnis");
  console.log("   4. Kebutuhan Fungsional");
  console.log("   5. Kebutuhan Non-Fungsional");
  console.log("   6. Spesifikasi Teknis");
  console.log("   7. User Stories");
  console.log("   8. Rencana Implementasi");
  console.log("   9. Metrik Keberhasilan");
  console.log("  10. Risiko dan Mitigasi");
  console.log("  11. Asumsi dan Ketergantungan");
  console.log("  12. Lampiran");
  console.log("\n📊 Total: 40+ halaman dengan 20+ tabel dan struktur lengkap");
}).catch(err => {
  console.error("❌ Error generating document:", err);
});
