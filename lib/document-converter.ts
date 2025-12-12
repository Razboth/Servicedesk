import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * File type detection utilities
 */
export const isDocxFile = (mimeType: string): boolean => {
  return mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
         mimeType === 'application/msword';
};

export const isXlsxFile = (mimeType: string): boolean => {
  return mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
         mimeType === 'application/vnd.ms-excel' ||
         mimeType === 'text/csv';
};

export const isPdfFile = (mimeType: string): boolean => {
  return mimeType === 'application/pdf';
};

export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

export const isPreviewableFile = (mimeType: string): boolean => {
  return isPdfFile(mimeType) ||
         isImageFile(mimeType) ||
         isDocxFile(mimeType) ||
         isXlsxFile(mimeType);
};

/**
 * Get file type category
 */
export type FileTypeCategory = 'pdf' | 'image' | 'docx' | 'xlsx' | 'other';

export const getFileTypeCategory = (mimeType: string): FileTypeCategory => {
  if (isPdfFile(mimeType)) return 'pdf';
  if (isImageFile(mimeType)) return 'image';
  if (isDocxFile(mimeType)) return 'docx';
  if (isXlsxFile(mimeType)) return 'xlsx';
  return 'other';
};

/**
 * Convert DOCX buffer to HTML
 */
export async function convertDocxToHtml(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ buffer });

    // Wrap in styled container
    const styledHtml = `
      <div class="docx-content">
        <style>
          .docx-content {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
          }
          .docx-content h1 { font-size: 2rem; margin-bottom: 1rem; font-weight: 600; }
          .docx-content h2 { font-size: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; }
          .docx-content h3 { font-size: 1.25rem; margin-bottom: 0.5rem; font-weight: 600; }
          .docx-content p { margin-bottom: 1rem; }
          .docx-content ul, .docx-content ol { margin-bottom: 1rem; padding-left: 2rem; }
          .docx-content li { margin-bottom: 0.25rem; }
          .docx-content table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
          .docx-content th, .docx-content td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
          .docx-content th { background-color: #f9fafb; font-weight: 600; }
          .docx-content img { max-width: 100%; height: auto; }
          .docx-content blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; margin: 1rem 0; color: #6b7280; }
          @media (prefers-color-scheme: dark) {
            .docx-content { color: #e5e7eb; }
            .docx-content th, .docx-content td { border-color: #374151; }
            .docx-content th { background-color: #1f2937; }
            .docx-content blockquote { border-color: #374151; color: #9ca3af; }
          }
        </style>
        ${result.value}
      </div>
    `;

    // Log any warnings
    if (result.messages.length > 0) {
      console.warn('DOCX conversion warnings:', result.messages);
    }

    return styledHtml;
  } catch (error) {
    console.error('Error converting DOCX to HTML:', error);
    throw new Error('Gagal mengonversi dokumen Word');
  }
}

/**
 * Parse XLSX buffer to HTML with sheet tabs
 */
export interface XlsxParseResult {
  html: string;
  sheetNames: string[];
}

export async function parseXlsxToHtml(buffer: Buffer, sheetIndex: number = 0): Promise<XlsxParseResult> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;

    if (sheetIndex < 0 || sheetIndex >= sheetNames.length) {
      sheetIndex = 0;
    }

    const sheetName = sheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON for more control over rendering
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];

    // Build HTML table
    let tableHtml = '<table>';

    jsonData.forEach((row: unknown[], rowIndex: number) => {
      tableHtml += '<tr>';
      (row as unknown[]).forEach((cell: unknown, cellIndex: number) => {
        const tag = rowIndex === 0 ? 'th' : 'td';
        const cellValue = cell !== null && cell !== undefined ? String(cell) : '';
        tableHtml += `<${tag}>${escapeHtml(cellValue)}</${tag}>`;
      });
      tableHtml += '</tr>';
    });

    tableHtml += '</table>';

    // Wrap in styled container
    const styledHtml = `
      <div class="xlsx-content">
        <style>
          .xlsx-content {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            padding: 1rem;
            overflow-x: auto;
          }
          .xlsx-content table {
            border-collapse: collapse;
            width: 100%;
            min-width: 600px;
            font-size: 0.875rem;
          }
          .xlsx-content th, .xlsx-content td {
            border: 1px solid #e5e7eb;
            padding: 0.5rem 0.75rem;
            text-align: left;
            white-space: nowrap;
          }
          .xlsx-content th {
            background-color: #f3f4f6;
            font-weight: 600;
            position: sticky;
            top: 0;
          }
          .xlsx-content tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .xlsx-content tr:hover {
            background-color: #f3f4f6;
          }
          @media (prefers-color-scheme: dark) {
            .xlsx-content th, .xlsx-content td { border-color: #374151; }
            .xlsx-content th { background-color: #1f2937; }
            .xlsx-content tr:nth-child(even) { background-color: #111827; }
            .xlsx-content tr:hover { background-color: #1f2937; }
          }
        </style>
        ${tableHtml}
      </div>
    `;

    return {
      html: styledHtml,
      sheetNames
    };
  } catch (error) {
    console.error('Error parsing XLSX to HTML:', error);
    throw new Error('Gagal mengonversi spreadsheet Excel');
  }
}

/**
 * Get all sheets info from XLSX
 */
export function getXlsxSheetNames(buffer: Buffer): string[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook.SheetNames;
  } catch (error) {
    console.error('Error reading XLSX sheet names:', error);
    return [];
  }
}

/**
 * Helper to escape HTML entities
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
