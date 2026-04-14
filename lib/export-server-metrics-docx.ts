import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  PageOrientation,
  BorderStyle,
  WidthType,
  VerticalAlign,
  ShadingType,
} from 'docx';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface ServerData {
  serverName: string;
  instance: string;
  cpuPercent: number;
  memoryPercent: number;
  storagePercent: number;
  status: string;
}

interface ExportData {
  date: Date;
  userName: string;
  servers: ServerData[];
}

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

// Helper to extract IP from instance (e.g., "192.168.1.1:9100" -> "192.168.1.1")
function extractIP(instance: string): string {
  return instance.split(':')[0];
}

// Format date in Indonesian
function formatIndonesianDate(date: Date): string {
  return format(date, 'EEEE, dd MMMM yyyy', { locale: idLocale });
}

// Create title paragraph
function createTitleParagraph(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: 'Checklist Metriks Server Harian Bank SulutGo',
        bold: true,
        size: 28, // 14pt
        font: 'Arial',
      }),
    ],
  });
}

// Create header table (Date, Petugas)
function createHeaderTable(date: Date, userName: string): Table {
  const labelWidth = 2500;
  const valueWidth = 11000;

  return new Table({
    columnWidths: [labelWidth, valueWidth],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: labelWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Hari / Tanggal', bold: true, size: 22, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: valueWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: formatIndonesianDate(date), size: 22, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: labelWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Petugas Backup', bold: true, size: 22, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: valueWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: userName, size: 22, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// Create data table
function createDataTable(servers: ServerData[]): Table {
  // Column widths (total ~13500 for landscape A4)
  const colWidths = [600, 2200, 2000, 2000, 2000, 2500, 1200];

  // Header row
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      createHeaderCell('No.', colWidths[0]),
      createHeaderCell('Nama Server', colWidths[1]),
      createHeaderCell('IP Server', colWidths[2]),
      createHeaderCell('Penggunaan Prosesor (%)', colWidths[3]),
      createHeaderCell('Penggunaan Memori (%)', colWidths[4]),
      createHeaderCell('Penggunaan Penyimpanan (%)', colWidths[5]),
      createHeaderCell('Status', colWidths[6]),
    ],
  });

  // Data rows
  const dataRows = servers.map((server, index) =>
    new TableRow({
      children: [
        createDataCell(String(index + 1), colWidths[0], AlignmentType.CENTER),
        createDataCell(server.serverName, colWidths[1]),
        createDataCell(extractIP(server.instance), colWidths[2]),
        createDataCell(server.cpuPercent.toFixed(1), colWidths[3], AlignmentType.CENTER),
        createDataCell(server.memoryPercent.toFixed(1), colWidths[4], AlignmentType.CENTER),
        createDataCell(server.storagePercent.toFixed(1), colWidths[5], AlignmentType.CENTER),
        createStatusCell(server.status, colWidths[6]),
      ],
    })
  );

  return new Table({
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

function createHeaderCell(text: string, width: number): TableCell {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: 'D9E2F3', type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size: 20, font: 'Arial' })],
      }),
    ],
  });
}

function createDataCell(text: string, width: number, alignment = AlignmentType.LEFT): TableCell {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment,
        children: [new TextRun({ text, size: 20, font: 'Arial' })],
      }),
    ],
  });
}

function createStatusCell(status: string, width: number): TableCell {
  let bgColor = 'FFFFFF';
  let textColor = '000000';

  if (status === 'WARNING') {
    bgColor = 'FFCDD2'; // Light red
    textColor = 'C62828'; // Dark red
  } else if (status === 'CAUTION') {
    bgColor = 'FFF9C4'; // Light yellow
    textColor = 'F57F17'; // Dark yellow/orange
  } else if (status === 'OK') {
    bgColor = 'C8E6C9'; // Light green
    textColor = '2E7D32'; // Dark green
  }

  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: bgColor, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: status, bold: true, size: 20, font: 'Arial', color: textColor })],
      }),
    ],
  });
}

// Create footer signature table
function createFooterTable(userName: string): Table {
  const colWidth = 6750;

  return new Table({
    columnWidths: [colWidth, colWidth],
    rows: [
      // Labels row
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Petugas', bold: true, size: 22, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Mengetahui', bold: true, size: 22, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      // Empty space for signature
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
            ],
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
            ],
          }),
        ],
      }),
      // Names row
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: userName, size: 22, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Yanry Y. P. Pangouw', size: 22, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function exportServerMetricsDocx(data: ExportData): Promise<Uint8Array> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 0.5 inch margins
          },
        },
        children: [
          // Title
          createTitleParagraph(),
          // Spacing
          new Paragraph({ spacing: { after: 100 }, children: [] }),
          // Header table
          createHeaderTable(data.date, data.userName),
          // Spacing
          new Paragraph({ spacing: { after: 200 }, children: [] }),
          // Data table
          createDataTable(data.servers),
          // Spacing
          new Paragraph({ spacing: { after: 300 }, children: [] }),
          // Footer signature table
          createFooterTable(data.userName),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
