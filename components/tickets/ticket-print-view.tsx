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
      <div ref={ref} className="bg-white text-black" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        {/* Header - Bank SulutGo Red */}
        <div className="print-header px-10 py-6 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="bg-white rounded-lg p-2 shadow-sm">
                <Image
                  src="/logo-bsg.png"
                  alt="Bank SulutGo Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold tracking-tight mb-1">Bank SulutGo</h1>
                <p className="text-lg font-medium opacity-95">ServiceDesk - IT Service Management</p>
                <p className="text-sm opacity-80 mt-1">Official Ticket Documentation</p>
              </div>
            </div>
            <div className="text-right bg-white/10 backdrop-blur-sm px-6 py-4 rounded-lg border-2 border-white/30">
              <p className="text-xs text-white/80 uppercase tracking-wider mb-1">Ticket Number</p>
              <p className="text-3xl font-bold text-white tracking-tight">{ticket.ticketNumber}</p>
            </div>
          </div>
        </div>

        <div className="px-10 pb-8">
          {/* Title Section with Status and Priority */}
          <div className="mb-8 pb-6 border-b-2 border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex-1 pr-4">{ticket.title}</h2>
              <div className="flex gap-3">
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Information Grid */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-1 h-6 bg-red-600 mr-3 rounded"></span>
              Ticket Information
            </h3>
            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Service</span>
                <span className="text-base font-semibold text-gray-900">{ticket.service?.name || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Branch</span>
                <span className="text-base font-semibold text-gray-900">
                  {ticket.branch?.name || '-'} {ticket.branch?.code ? `(${ticket.branch.code})` : ''}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Requester</span>
                <span className="text-base font-semibold text-gray-900">{ticket.createdBy?.name || '-'}</span>
                <span className="text-xs text-gray-600 mt-0.5">{ticket.createdBy?.email || ''}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created Date</span>
                <span className="text-base font-semibold text-gray-900">
                  {format(new Date(ticket.createdAt), 'dd MMMM yyyy, HH:mm')}
                </span>
              </div>
              {ticket.assignedTo && (
                <>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assigned To</span>
                    <span className="text-base font-semibold text-gray-900">{ticket.assignedTo.name}</span>
                    <span className="text-xs text-gray-600 mt-0.5">{ticket.assignedTo.email || ''}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Last Updated</span>
                    <span className="text-base font-semibold text-gray-900">
                      {format(new Date(ticket.updatedAt), 'dd MMMM yyyy, HH:mm')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-1 h-6 bg-red-600 mr-3 rounded"></span>
              Description
            </h3>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div
                className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
            </div>
          </div>

          {/* Custom Fields */}
          {ticket.fieldValues && ticket.fieldValues.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-1 h-6 bg-red-600 mr-3 rounded"></span>
                Additional Information
              </h3>
              <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                {ticket.fieldValues.map((fieldValue) => (
                  <div key={fieldValue.id} className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      {fieldValue.field?.label || 'Field'}
                    </span>
                    <span className="text-base font-semibold text-gray-900">{fieldValue.value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Information with QR Code */}
          {latestApproval && qrText && (
            <div className="mb-8">
              <div className="border-3 border-green-600 rounded-xl overflow-hidden shadow-lg">
                <div className="bg-green-600 px-6 py-3">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Digital Approval - Verified
                  </h3>
                </div>
                <div className="bg-green-50 p-6">
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Approved By</span>
                        <span className="text-lg font-bold text-green-900">{latestApproval.approver?.name || '-'}</span>
                        <span className="text-sm text-green-700 mt-0.5">{latestApproval.approver?.email || ''}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Approval Date & Time</span>
                        <span className="text-base font-bold text-green-900">
                          {format(new Date(latestApproval.updatedAt), 'dd MMMM yyyy, HH:mm:ss')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-lg border-2 border-green-300 inline-block">
                        <svg className="w-5 h-5 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-bold text-green-900">STATUS: APPROVED</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center bg-white p-4 rounded-lg border-2 border-green-300 shadow-sm">
                      <QRCodeSVG
                        value={qrText}
                        size={140}
                        level="H"
                        includeMargin={true}
                      />
                      <p className="text-xs text-green-700 font-semibold mt-3 text-center max-w-[140px]">
                        Scan for Digital Signature Verification
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Bank SulutGo Red */}
        <div className="print-footer px-10 py-4 mt-8">
          <div className="flex justify-between items-center text-white">
            <div>
              <p className="text-sm font-semibold">© {new Date().getFullYear()} Bank SulutGo - All Rights Reserved</p>
              <p className="text-xs opacity-80 mt-0.5">Confidential IT Service Management Document</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80 uppercase tracking-wider">Document Generated</p>
              <p className="text-sm font-semibold">{format(new Date(), 'dd MMMM yyyy, HH:mm:ss')}</p>
            </div>
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
