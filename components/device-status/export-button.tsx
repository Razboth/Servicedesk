'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2, FileIcon as DocxIcon } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { exportDeviceStatusDocx } from '@/lib/export-device-status-docx';

interface ServiceData {
  serviceName: string;
  groupName: string;
  status: string;
}

interface ExportButtonProps {
  contentId: string;
  filename: string;
  title: string;
  data?: any[];
  services?: ServiceData[];
  userName?: string;
}

export function ExportButton({
  contentId,
  filename,
  title,
  data,
  services,
  userName = 'Admin',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById(contentId);
      if (!element) {
        toast.error('Konten tidak ditemukan');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.setFontSize(16);
      pdf.text(title, 14, 15);

      pdf.setFontSize(10);
      pdf.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')} WITA`, 14, 22);

      const imgWidth = pageWidth - 28;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPosition = 28;
      let remainingHeight = imgHeight;
      let sourceY = 0;

      while (remainingHeight > 0) {
        const availableHeight = pageHeight - yPosition - 10;
        const heightToRender = Math.min(remainingHeight, availableHeight);
        const sourceHeight = (heightToRender / imgHeight) * canvas.height;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          tempCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          );

          const tempImgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(tempImgData, 'PNG', 14, yPosition, imgWidth, heightToRender);
        }

        remainingHeight -= heightToRender;
        sourceY += sourceHeight;

        if (remainingHeight > 0) {
          pdf.addPage();
          yPosition = 14;
        }
      }

      pdf.save(`${filename}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF berhasil diunduh');
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error('Gagal mengekspor PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    try {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return String(value);
            })
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success('CSV berhasil diunduh');
    } catch (error) {
      console.error('Export CSV error:', error);
      toast.error('Gagal mengekspor CSV');
    }
  };

  const handleExportDocx = async () => {
    if (!services || services.length === 0) {
      toast.error('Tidak ada data layanan untuk diekspor');
      return;
    }

    setIsExporting(true);
    try {
      const buffer = await exportDeviceStatusDocx({
        date: new Date(),
        userName,
        services,
      });

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `checklist-device-status-${format(new Date(), 'yyyy-MM-dd')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success('DOCX berhasil diunduh');
    } catch (error) {
      console.error('Export DOCX error:', error);
      toast.error('Gagal mengekspor DOCX');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportDocx}>
          <DocxIcon className="h-4 w-4 mr-2" />
          Export DOCX
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
