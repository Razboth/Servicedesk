import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(session.user.role);
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { supportGroup: true }
    });

    const isTechSupport = user?.supportGroup?.code === 'TECH_SUPPORT';
    const isPCAuditor = user?.supportGroup?.code === 'PC_AUDITOR';

    if (!isAdmin && !isTechSupport && !isPCAuditor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';
    const assetId = searchParams.get('assetId'); // For single asset spec sheet

    // Build where clause from filters
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId');
    const formFactor = searchParams.get('formFactor');

    const where: any = { isActive: true };
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    if (formFactor) where.formFactor = formFactor;
    if (assetId) where.id = assetId;

    // Fetch assets with all related data
    const assets = await prisma.pCAsset.findMany({
      where,
      include: {
        branch: { select: { name: true, code: true } },
        assignedTo: { select: { name: true, email: true } },
        operatingSystem: { select: { name: true, version: true } },
        officeProduct: { select: { name: true, version: true } },
        serviceLogs: {
          orderBy: { performedAt: 'desc' },
          take: assetId ? 50 : 0, // Include service history only for single asset
          include: {
            performedBy: { select: { name: true } }
          }
        }
      },
      orderBy: { pcName: 'asc' }
    });

    if (assetId && assets.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Format data for export
    const inventoryData = assets.map(asset => ({
      'Asset Tag': asset.assetTag || '',
      'Hostname': asset.pcName,
      'Serial Number': asset.serialNumber || '',
      'Brand': asset.brand,
      'Model': asset.model || '',
      'Form Factor': asset.formFactor || '',
      'Status': asset.status || 'IN_USE',
      'Branch': asset.branch?.name || '',
      'Branch Code': asset.branch?.code || '',
      'Department': asset.department || '',
      'Assigned To': asset.assignedTo?.name || asset.assignedUserName || '',
      'Processor': asset.processor,
      'RAM (GB)': asset.ram,
      'Storage Type': asset.storageType || '',
      'Storage Capacity': asset.storageCapacity || '',
      'MAC Address': asset.macAddress || '',
      'IP Address': asset.ipAddress || '',
      'Operating System': asset.operatingSystem ? `${asset.operatingSystem.name} ${asset.operatingSystem.version || ''}`.trim() : '',
      'OS License Type': asset.osLicenseType || '',
      'OS Installation Date': asset.osInstallationDate ? new Date(asset.osInstallationDate).toLocaleDateString('id-ID') : '',
      'Office Suite': asset.officeProduct ? `${asset.officeProduct.name} ${asset.officeProduct.version || ''}`.trim() : '',
      'Office License Type': asset.officeLicenseType || '',
      'Office License Account': asset.officeLicenseAccount || '',
      'Office License Status': asset.officeLicenseStatus || '',
      'Antivirus': asset.antivirusName || '',
      'AV Version': asset.antivirusVersion || '',
      'AV License Expiry': asset.antivirusLicenseExpiry ? new Date(asset.antivirusLicenseExpiry).toLocaleDateString('id-ID') : '',
      'AV Real-Time Protection': asset.avRealTimeProtection ? 'ON' : 'OFF',
      'AV Definition Date': asset.avDefinitionDate ? new Date(asset.avDefinitionDate).toLocaleDateString('id-ID') : '',
      'Hardening Compliant': asset.hardeningCompliant ? 'Yes' : 'No',
      'Last Hardening Date': asset.lastHardeningDate ? new Date(asset.lastHardeningDate).toLocaleDateString('id-ID') : '',
      'Purchase Date': asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('id-ID') : '',
      'Warranty Expiry': asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString('id-ID') : '',
      'PO Number': asset.purchaseOrderNumber || '',
      'Last Audit Date': asset.lastAuditDate ? new Date(asset.lastAuditDate).toLocaleDateString('id-ID') : '',
      'Notes': asset.notes || ''
    }));

    // For single asset, also include service logs
    let serviceLogsData: any[] = [];
    if (assetId && assets[0]?.serviceLogs) {
      serviceLogsData = assets[0].serviceLogs.map(log => ({
        'Date': new Date(log.performedAt).toLocaleDateString('id-ID'),
        'Service Type': log.serviceType,
        'Status': log.status,
        'Issue Reported': log.issueReported || '',
        'Action Taken': log.description,
        'Findings': log.findings || '',
        'Recommendations': log.recommendations || '',
        'Technician': log.performedBy?.name || log.technicianName || '',
        'Cost (IDR)': log.cost ? `Rp ${Number(log.cost).toLocaleString('id-ID')}` : ''
      }));
    }

    // Generate file based on format
    if (format === 'csv') {
      // CSV Export
      const headers = Object.keys(inventoryData[0] || {});
      const csvRows = [
        headers.join(','),
        ...inventoryData.map(row =>
          headers.map(h => {
            const val = (row as any)[h]?.toString() || '';
            return val.includes(',') || val.includes('"') || val.includes('\n')
              ? `"${val.replace(/"/g, '""')}"`
              : val;
          }).join(',')
        )
      ];
      const csvContent = csvRows.join('\n');

      const filename = assetId
        ? `PC_Spec_Sheet_${assets[0]?.assetTag || assets[0]?.pcName}_${new Date().toISOString().split('T')[0]}.csv`
        : `PC_Inventory_${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    } else {
      // Excel Export
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Inventory
      const inventorySheet = XLSX.utils.json_to_sheet(inventoryData);

      // Set column widths
      const colWidths = Object.keys(inventoryData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      inventorySheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(
        workbook,
        inventorySheet,
        assetId ? 'PC Details' : 'PC Inventory'
      );

      // Sheet 2: Service History (for single asset only)
      if (assetId && serviceLogsData.length > 0) {
        const serviceLogsSheet = XLSX.utils.json_to_sheet(serviceLogsData);
        XLSX.utils.book_append_sheet(workbook, serviceLogsSheet, 'Service History');
      }

      // Sheet 3: Summary (for full inventory only)
      if (!assetId) {
        const summaryData = [
          { 'Metric': 'Total Assets', 'Value': inventoryData.length },
          { 'Metric': 'In Use', 'Value': inventoryData.filter(a => a.Status === 'IN_USE').length },
          { 'Metric': 'Stock', 'Value': inventoryData.filter(a => a.Status === 'STOCK').length },
          { 'Metric': 'Broken', 'Value': inventoryData.filter(a => a.Status === 'BROKEN').length },
          { 'Metric': 'Disposed', 'Value': inventoryData.filter(a => a.Status === 'DISPOSED').length },
          { 'Metric': 'Laptops', 'Value': inventoryData.filter(a => a['Form Factor'] === 'LAPTOP').length },
          { 'Metric': 'Desktops', 'Value': inventoryData.filter(a => a['Form Factor'] === 'DESKTOP').length },
          { 'Metric': 'AIO', 'Value': inventoryData.filter(a => a['Form Factor'] === 'AIO').length },
          { 'Metric': 'Workstations', 'Value': inventoryData.filter(a => a['Form Factor'] === 'WORKSTATION').length },
          { 'Metric': 'Export Date', 'Value': new Date().toLocaleString('id-ID') }
        ];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      }

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const filename = assetId
        ? `PC_Spec_Sheet_${assets[0]?.assetTag || assets[0]?.pcName}_${new Date().toISOString().split('T')[0]}.xlsx`
        : `PC_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

  } catch (error) {
    console.error('PC Management Export Error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
