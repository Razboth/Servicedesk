import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

type PreviewAction = 'create' | 'update' | 'skip' | 'error';

interface PreviewRow {
  rowNumber: number;
  action: PreviewAction;
  data: Record<string, any>;
  errors: string[];
  existingRecord?: Record<string, any>;
}

interface PreviewResult {
  totalRows: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
  errors: number;
  rows: PreviewRow[];
}

// POST /api/admin/import/preview - Preview import data
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as string;
    const importMode = formData.get('importMode') as string || 'CREATE_OR_UPDATE';
    const maxPreviewRows = parseInt(formData.get('maxRows') as string || '100');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!entityType) {
      return NextResponse.json({ error: 'Entity type is required' }, { status: 400 });
    }

    const validEntities = ['ATM', 'BRANCH', 'USER', 'SERVICE', 'CATEGORY', 'SUBCATEGORY', 'ITEM'];
    if (!validEntities.includes(entityType.toUpperCase())) {
      return NextResponse.json({ error: `Invalid entity type. Must be one of: ${validEntities.join(', ')}` }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    let data: any[] = [];

    // Parse based on file type
    if (file.name.endsWith('.csv')) {
      const text = new TextDecoder().decode(buffer);
      const parsed = Papa.parse(text, { header: true, delimiter: ';' });
      data = parsed.data as any[];
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
    }

    // Filter out empty rows based on entity type
    const keyFields: Record<string, string> = {
      ATM: 'code',
      BRANCH: 'code',
      USER: 'username',
      SERVICE: 'name',
      CATEGORY: 'name',
      SUBCATEGORY: 'name',
      ITEM: 'name'
    };
    const keyField = keyFields[entityType.toUpperCase()];
    data = data.filter(row => row[keyField] && row[keyField].toString().trim() !== '');

    const result: PreviewResult = {
      totalRows: data.length,
      toCreate: 0,
      toUpdate: 0,
      toSkip: 0,
      errors: 0,
      rows: []
    };

    // Preview each row (up to maxPreviewRows)
    const previewData = data.slice(0, maxPreviewRows);

    for (let i = 0; i < previewData.length; i++) {
      const row = previewData[i];
      const previewRow: PreviewRow = {
        rowNumber: i + 1,
        action: 'create',
        data: row,
        errors: []
      };

      try {
        // Check for existing record based on entity type
        let existingRecord: any = null;

        switch (entityType.toUpperCase()) {
          case 'ATM':
            if (row.code) {
              existingRecord = await prisma.aTM.findFirst({
                where: { code: row.code.toString().trim() },
                select: { id: true, code: true, name: true }
              });
            }
            // Validate required fields
            if (!row.code || !row.code.toString().trim()) {
              previewRow.errors.push('Code is required');
            }
            if (!row.name || !row.name.toString().trim()) {
              previewRow.errors.push('Name is required');
            }
            if (!row.branchCode || !row.branchCode.toString().trim()) {
              previewRow.errors.push('Branch Code is required');
            } else {
              const branch = await prisma.branch.findUnique({
                where: { code: row.branchCode.toString().trim() }
              });
              if (!branch) {
                previewRow.errors.push(`Branch Code '${row.branchCode}' not found`);
              }
            }
            break;

          case 'BRANCH':
            if (row.code) {
              existingRecord = await prisma.branch.findFirst({
                where: { code: row.code.toString().trim() },
                select: { id: true, code: true, name: true }
              });
            }
            if (!row.code || !row.code.toString().trim()) {
              previewRow.errors.push('Code is required');
            }
            if (!row.name || !row.name.toString().trim()) {
              previewRow.errors.push('Name is required');
            }
            break;

          case 'USER':
            if (row.username) {
              existingRecord = await prisma.user.findFirst({
                where: {
                  OR: [
                    { username: row.username.toString().trim() },
                    { email: row.email?.toString().trim().toLowerCase() }
                  ]
                },
                select: { id: true, username: true, email: true, name: true }
              });
            }
            if (!row.username || !row.username.toString().trim()) {
              previewRow.errors.push('Username is required');
            }
            if (!row.email || !row.email.toString().trim()) {
              previewRow.errors.push('Email is required');
            }
            if (!row.name || !row.name.toString().trim()) {
              previewRow.errors.push('Name is required');
            }
            if (!existingRecord && (!row.password || !row.password.toString().trim())) {
              previewRow.errors.push('Password is required for new users');
            }
            break;

          case 'SERVICE':
            if (row.name) {
              existingRecord = await prisma.service.findFirst({
                where: { name: row.name.toString().trim() },
                select: { id: true, name: true, description: true }
              });
            }
            if (!row.name || !row.name.toString().trim()) {
              previewRow.errors.push('Name is required');
            }
            if (!row.description || !row.description.toString().trim()) {
              previewRow.errors.push('Description is required');
            }
            break;

          case 'CATEGORY':
            if (row.name) {
              existingRecord = await prisma.category.findFirst({
                where: { name: row.name.toString().trim() },
                select: { id: true, name: true }
              });
            }
            if (!row.name || !row.name.toString().trim()) {
              previewRow.errors.push('Name is required');
            }
            break;

          case 'SUBCATEGORY':
            if (row.name) {
              existingRecord = await prisma.subcategory.findFirst({
                where: { name: row.name.toString().trim() },
                select: { id: true, name: true }
              });
            }
            if (!row.name || !row.name.toString().trim()) {
              previewRow.errors.push('Name is required');
            }
            break;

          case 'ITEM':
            if (row.name) {
              existingRecord = await prisma.item.findFirst({
                where: { name: row.name.toString().trim() },
                select: { id: true, name: true }
              });
            }
            if (!row.name || !row.name.toString().trim()) {
              previewRow.errors.push('Name is required');
            }
            break;
        }

        // Determine action based on import mode
        if (previewRow.errors.length > 0) {
          previewRow.action = 'error';
          result.errors++;
        } else if (existingRecord) {
          previewRow.existingRecord = existingRecord;
          if (importMode === 'ADD_ONLY') {
            previewRow.action = 'skip';
            result.toSkip++;
          } else {
            previewRow.action = 'update';
            result.toUpdate++;
          }
        } else {
          if (importMode === 'UPDATE_ONLY') {
            previewRow.action = 'skip';
            result.toSkip++;
          } else {
            previewRow.action = 'create';
            result.toCreate++;
          }
        }

      } catch (error) {
        previewRow.action = 'error';
        previewRow.errors.push(error instanceof Error ? error.message : 'Unknown error');
        result.errors++;
      }

      result.rows.push(previewRow);
    }

    // If there are more rows than previewed, estimate totals
    if (data.length > maxPreviewRows) {
      const ratio = data.length / maxPreviewRows;
      result.toCreate = Math.round(result.toCreate * ratio);
      result.toUpdate = Math.round(result.toUpdate * ratio);
      result.toSkip = Math.round(result.toSkip * ratio);
      result.errors = Math.round(result.errors * ratio);
    }

    return NextResponse.json({
      success: true,
      preview: result,
      fileName: file.name,
      fileSize: file.size,
      entityType,
      importMode,
      previewedRows: previewData.length,
      totalRows: data.length
    });

  } catch (error) {
    console.error('Import preview error:', error);
    return NextResponse.json(
      { error: 'Preview failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
