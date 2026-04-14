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

interface ServiceData {
  serviceName: string;
  groupName: string;
  status: string;
}

interface ExportData {
  date: Date;
  userName: string;
  services: ServiceData[];
}

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

// Format date in Indonesian with time
function formatIndonesianDateTime(date: Date): string {
  return format(date, "EEEE, dd MMMM yyyy 'Pukul' HH:mm 'WITA'", { locale: idLocale });
}

// Create title paragraph
function createTitleParagraph(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: 'Checklist Status Layanan Harian Bank SulutGo',
        bold: true,
        size: 28,
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
                children: [new TextRun({ text: formatIndonesianDateTime(date), size: 22, font: 'Arial' })],
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
                children: [new TextRun({ text: 'Petugas', bold: true, size: 22, font: 'Arial' })],
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

// Create data table for all services
function createDataTable(services: ServiceData[]): Table {
  const colWidths = [600, 5500, 2000];

  // Header row
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      createHeaderCell('No.', colWidths[0]),
      createHeaderCell('Nama Layanan', colWidths[1]),
      createHeaderCell('Status', colWidths[2]),
    ],
  });

  // Data rows
  const dataRows = services.map((service, index) =>
    new TableRow({
      children: [
        createDataCell(String(index + 1), colWidths[0], AlignmentType.CENTER),
        createDataCell(service.serviceName, colWidths[1]),
        createStatusCell(service.status, colWidths[2]),
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
  let displayStatus = status;

  if (status === 'DOWN') {
    bgColor = 'FFCDD2';
    textColor = 'C62828';
  } else if (status === 'IDLE' || status === 'INACTIVE') {
    bgColor = 'E0E0E0';
    textColor = '616161';
    displayStatus = 'IDLE';
  } else if (status === 'OK') {
    bgColor = 'C8E6C9';
    textColor = '2E7D32';
    displayStatus = 'UP';
  } else if (status === 'NUMERIC') {
    bgColor = 'BBDEFB';
    textColor = '1565C0';
  }

  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: bgColor, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: displayStatus, bold: true, size: 20, font: 'Arial', color: textColor })],
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

export async function exportDeviceStatusDocx(data: ExportData): Promise<Uint8Array> {
  const children: (Paragraph | Table)[] = [
    createTitleParagraph(),
    new Paragraph({ spacing: { after: 100 }, children: [] }),
    createHeaderTable(data.date, data.userName),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    createDataTable(data.services),
    new Paragraph({ spacing: { after: 300 }, children: [] }),
    createFooterTable(data.userName),
  ];

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
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
