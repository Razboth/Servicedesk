'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize, getFileTypeCategory } from '@/lib/document-converter';

// Indonesian labels
const labels = {
  preview: 'Pratinjau',
  download: 'Unduh',
  close: 'Tutup',
  page: 'Halaman',
  of: 'dari',
  zoomIn: 'Perbesar',
  zoomOut: 'Perkecil',
  rotateLeft: 'Putar Kiri',
  rotateRight: 'Putar Kanan',
  resetView: 'Reset Tampilan',
  fullscreen: 'Layar Penuh',
  exitFullscreen: 'Keluar Layar Penuh',
  loading: 'Memuat dokumen...',
  error: 'Gagal memuat dokumen',
  previewNotAvailable: 'Pratinjau tidak tersedia untuk tipe file ini',
  sheet: 'Lembar',
  previousPage: 'Halaman Sebelumnya',
  nextPage: 'Halaman Berikutnya'
};

export interface DocumentPreviewAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: DocumentPreviewAttachment;
  articleId: string;
}

interface XlsxPreviewData {
  html: string;
  sheetNames: string[];
  currentSheet: number;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  attachment,
  articleId
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);

  // PDF state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // DOCX state
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  // XLSX state
  const [xlsxData, setXlsxData] = useState<XlsxPreviewData | null>(null);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);

  const transformRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const fileType = getFileTypeCategory(attachment.mimeType);

  // Load document when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDocument();
    }

    return () => {
      // Cleanup URLs
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [isOpen, attachment.id]);

  const loadDocument = async () => {
    setLoading(true);
    setError(null);
    setRotation(0);
    setPageNumber(1);
    setPdfScale(1.0);

    try {
      const previewUrl = `/api/knowledge/${articleId}/attachments/${attachment.id}/preview`;

      switch (fileType) {
        case 'pdf':
        case 'image': {
          const response = await fetch(previewUrl);
          if (!response.ok) throw new Error('Failed to load file');
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          if (fileType === 'pdf') {
            setPdfUrl(url);
          } else {
            setImageUrl(url);
          }
          break;
        }

        case 'docx': {
          const response = await fetch(previewUrl);
          if (!response.ok) throw new Error('Failed to convert document');
          const html = await response.text();
          setDocxHtml(html);
          break;
        }

        case 'xlsx': {
          const response = await fetch(`${previewUrl}?sheet=${currentSheetIndex}`);
          if (!response.ok) throw new Error('Failed to parse spreadsheet');
          const data = await response.json();
          setXlsxData(data);
          break;
        }

        default:
          setError(labels.previewNotAvailable);
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setError(err instanceof Error ? err.message : labels.error);
    } finally {
      setLoading(false);
    }
  };

  // Load different sheet for XLSX
  const loadSheet = useCallback(async (sheetIndex: number) => {
    if (fileType !== 'xlsx') return;

    setLoading(true);
    try {
      const previewUrl = `/api/knowledge/${articleId}/attachments/${attachment.id}/preview?sheet=${sheetIndex}`;
      const response = await fetch(previewUrl);
      if (!response.ok) throw new Error('Failed to load sheet');
      const data = await response.json();
      setXlsxData(data);
      setCurrentSheetIndex(sheetIndex);
    } catch (err) {
      console.error('Error loading sheet:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sheet');
    } finally {
      setLoading(false);
    }
  }, [articleId, attachment.id, fileType]);

  const handleDownload = async () => {
    try {
      const response = await fetch(
        `/api/knowledge/${articleId}/attachments/${attachment.id}/download`
      );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleRotate = (direction: 'left' | 'right') => {
    setRotation((prev) =>
      direction === 'right' ? (prev + 90) % 360 : (prev - 90 + 360) % 360
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{labels.loading}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {labels.download}
          </Button>
        </div>
      );
    }

    // Image preview
    if (fileType === 'image' && imageUrl) {
      return (
        <div className="relative w-full h-full">
          {/* Image controls */}
          <div className="absolute top-4 left-4 z-20 flex gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
            <Button
              size="sm"
              variant="outline"
              onClick={() => transformRef.current?.zoomIn()}
              title={labels.zoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => transformRef.current?.zoomOut()}
              title={labels.zoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => transformRef.current?.resetTransform()}
              title={labels.resetView}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRotate('left')}
              title={labels.rotateLeft}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRotate('right')}
              title={labels.rotateRight}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={0.1}
            maxScale={10}
            wheel={{ step: 0.1 }}
            limitToBounds={false}
            centerOnInit={true}
          >
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
                cursor: 'move'
              }}
              contentStyle={{
                width: '100%',
                height: '100%'
              }}
            >
              <div className="w-full h-full flex items-center justify-center p-5">
                <img
                  src={imageUrl}
                  alt={attachment.originalName}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.3s ease'
                  }}
                  draggable={false}
                />
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>
      );
    }

    // PDF preview
    if (fileType === 'pdf' && pdfUrl) {
      return (
        <div className="relative w-full h-full flex flex-col">
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&zoom=page-width`}
            className="w-full flex-1 border-0"
            title={attachment.originalName}
          />
        </div>
      );
    }

    // DOCX preview
    if (fileType === 'docx' && docxHtml) {
      return (
        <div
          ref={docxContainerRef}
          className="w-full h-full overflow-auto bg-white dark:bg-gray-900"
          dangerouslySetInnerHTML={{ __html: docxHtml }}
        />
      );
    }

    // XLSX preview
    if (fileType === 'xlsx' && xlsxData) {
      return (
        <div className="w-full h-full flex flex-col">
          {/* Sheet tabs */}
          {xlsxData.sheetNames.length > 1 && (
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex overflow-x-auto py-2 px-4 gap-2">
                {xlsxData.sheetNames.map((name, index) => (
                  <button
                    key={name}
                    onClick={() => loadSheet(index)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                      index === currentSheetIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Table content */}
          <div
            className="flex-1 overflow-auto bg-white dark:bg-gray-900"
            dangerouslySetInnerHTML={{ __html: xlsxData.html }}
          />
        </div>
      );
    }

    // Fallback for unsupported types
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <FileText className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {labels.previewNotAvailable}
        </p>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          {labels.download}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'p-0 gap-0',
          isFullscreen
            ? 'max-w-[98vw] w-[98vw] h-[98vh] max-h-[98vh]'
            : 'max-w-[90vw] w-[90vw] h-[85vh] max-h-[85vh]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0 pr-4">
            <DialogTitle className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
              {attachment.originalName}
            </DialogTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formatFileSize(attachment.size)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? labels.exitFullscreen : labels.fullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              title={labels.download}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-950">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
