import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import Image from 'next/image';

interface TicketFieldValue {
  id: string;
  value: string;
  field: {
    name: string;
    label: string;
    type: string;
  };
}

interface TicketApproval {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  createdAt: string;
  updatedAt: string;
  approver: {
    id: string;
    name: string;
    email: string;
  };
}

interface TicketData {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    name: string;
    email: string;
  };
  assignedTo?: {
    name: string;
    email: string;
  } | null;
  service: {
    name: string;
  };
  branch: {
    name: string;
    code: string;
  };
  fieldValues?: TicketFieldValue[];
  approvals?: TicketApproval[];
}

interface TicketPrintViewProps {
  ticket: TicketData;
}

export const TicketPrintView = React.forwardRef<HTMLDivElement, TicketPrintViewProps>(
  ({ ticket }, ref) => {
    if (!ticket) return null;

    // Get latest approval if it exists and is approved
    const latestApproval = ticket.approvals?.find(a => a.status === 'APPROVED');

    // Generate QR code text if ticket is approved - plain text format for direct display
    const qrText = latestApproval && latestApproval.approver ?
      `DIGITAL SIGNATURE\nTicket: ${ticket.ticketNumber || ''}\nApprover: ${latestApproval.approver.name || ''}\nApproved: ${format(new Date(latestApproval.updatedAt), 'dd MMM yyyy HH:mm')}\nStatus: APPROVED`
      : null;

    // Status badge colors
    const getStatusColor = (status: string) => {
      const statusColors: Record<string, string> = {
        'OPEN': 'bg-blue-100 text-blue-800 border-blue-300',
        'IN_PROGRESS': 'bg-yellow-100 text-yellow-800 border-yellow-300',
        'RESOLVED': 'bg-green-100 text-green-800 border-green-300',
        'CLOSED': 'bg-gray-100 text-gray-800 border-gray-300',
      };
      return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    // Priority badge colors
    const getPriorityColor = (priority: string) => {
      const priorityColors: Record<string, string> = {
        'URGENT': 'bg-red-100 text-red-800 border-red-300',
        'HIGH': 'bg-orange-100 text-orange-800 border-orange-300',
        'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-300',
        'LOW': 'bg-blue-100 text-blue-800 border-blue-300',
      };
      return priorityColors[priority] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    return (
      <div ref={ref} className="bg-white text-black min-h-screen flex flex-col" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        {/* Header - Bank SulutGo Red */}
        <div className="print-header px-6 py-3 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-lg p-1 shadow-sm">
                <Image
                  src="/logo-bsg.png"
                  alt="Bank SulutGo Logo"
                  width={50}
                  height={50}
                  className="object-contain"
                />
              </div>
              <div className="text-white">
                <h1 className="text-xl font-bold tracking-tight">Bank SulutGo ServiceDesk</h1>
                <p className="text-xs opacity-90">IT Service Management</p>
              </div>
            </div>
            <div className="text-right bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border-2 border-white/30">
              <p className="text-xs text-white/80 uppercase tracking-wider">Ticket</p>
              <p className="text-xl font-bold text-white tracking-tight">{ticket.ticketNumber}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4 flex-1">
          {/* Title Section with Status and Priority */}
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <h2 className="text-lg font-bold text-gray-900 flex-1 pr-3">{ticket.title}</h2>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Information Grid */}
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
              <span className="w-1 h-4 bg-red-600 mr-2 rounded"></span>
              Ticket Information
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Service</span>
                <span className="text-xs font-semibold text-gray-900">{ticket.service?.name || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Branch</span>
                <span className="text-xs font-semibold text-gray-900">
                  {ticket.branch?.name || '-'} {ticket.branch?.code ? `(${ticket.branch.code})` : ''}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Requester</span>
                <span className="text-xs font-semibold text-gray-900">{ticket.createdBy?.name || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Created</span>
                <span className="text-xs font-semibold text-gray-900">
                  {format(new Date(ticket.createdAt), 'dd MMM yyyy, HH:mm')}
                </span>
              </div>
              {ticket.assignedTo && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Assigned To</span>
                  <span className="text-xs font-semibold text-gray-900">{ticket.assignedTo.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
              <span className="w-1 h-4 bg-red-600 mr-2 rounded"></span>
              Description
            </h3>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
              <div
                className="text-xs text-gray-800 whitespace-pre-wrap leading-snug"
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
            </div>
          </div>

          {/* Custom Fields */}
          {ticket.fieldValues && ticket.fieldValues.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                <span className="w-1 h-4 bg-red-600 mr-2 rounded"></span>
                Additional Information
              </h3>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                {ticket.fieldValues.map((fieldValue) => (
                  <div key={fieldValue.id} className="flex flex-col">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      {fieldValue.field?.label || 'Field'}
                    </span>
                    <span className="text-xs font-semibold text-gray-900">{fieldValue.value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Information with QR Code */}
          {latestApproval && qrText && (
            <div className="mb-3">
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                <span className="w-1 h-4 bg-red-600 mr-2 rounded"></span>
                Approval Information
              </h3>
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Approved By</span>
                  <span className="text-xs font-semibold text-gray-900">{latestApproval.approver?.name || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Approval Date</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {format(new Date(latestApproval.updatedAt), 'dd MMM yyyy, HH:mm')}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center border-l border-gray-300 pl-3">
                  <QRCodeSVG
                    value={qrText}
                    size={60}
                    level="H"
                    includeMargin={false}
                  />
                  <p className="text-[9px] text-gray-600 font-semibold mt-1 text-center">
                    Scan to Verify
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Bank SulutGo Red */}
        <div className="print-footer px-6 py-2">
          <div className="flex justify-between items-center text-white text-xs">
            <p className="font-semibold">© {new Date().getFullYear()} Bank SulutGo</p>
            <p className="font-semibold">Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
          </div>
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            @page {
              margin: 0;
              size: A4;
            }
          }

          .print-header {
            background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }

          .print-footer {
            background: linear-gradient(135deg, #B91C1C 0%, #991B1B 100%);
            box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
          }
        `}</style>
      </div>
    );
  }
);

TicketPrintView.displayName = 'TicketPrintView';
