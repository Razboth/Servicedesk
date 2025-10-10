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
              <div className="border-4 border-green-600 rounded-xl overflow-hidden shadow-2xl">
                <div className="approval-header px-6 py-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    DIGITAL APPROVAL - VERIFIED
                  </h3>
                </div>
                <div className="approval-body p-8">
                  <div className="flex justify-between items-start gap-8">
                    <div className="flex-1 space-y-5">
                      <div className="flex flex-col bg-white p-5 rounded-xl border-3 border-green-400 shadow-md">
                        <span className="text-sm font-bold text-green-600 uppercase tracking-widest mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          Approved By
                        </span>
                        <span className="text-2xl font-extrabold text-green-800">{latestApproval.approver?.name || '-'}</span>
                        <span className="text-base text-green-700 mt-1.5 font-semibold">{latestApproval.approver?.email || ''}</span>
                      </div>
                      <div className="flex flex-col bg-white p-5 rounded-xl border-3 border-green-400 shadow-md">
                        <span className="text-sm font-bold text-green-600 uppercase tracking-widest mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          Approval Date & Time
                        </span>
                        <span className="text-xl font-extrabold text-green-800">
                          {format(new Date(latestApproval.updatedAt), 'dd MMMM yyyy, HH:mm:ss')}
                        </span>
                      </div>
                      <div className="approval-status-badge px-6 py-4 rounded-xl border-3 border-green-500 shadow-lg inline-flex items-center gap-3">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-lg font-black text-white uppercase tracking-wider">STATUS: APPROVED</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center qr-container p-6 rounded-2xl border-4 border-green-500 shadow-2xl">
                      <div className="bg-white p-3 rounded-lg">
                        <QRCodeSVG
                          value={qrText}
                          size={160}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="text-sm text-white font-black mt-4 text-center max-w-[180px] uppercase tracking-wide">
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

          .approval-header {
            background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%);
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
          }

          .approval-body {
            background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 50%, #6EE7B7 100%);
          }

          .approval-status-badge {
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
          }

          .qr-container {
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            box-shadow: 0 8px 20px rgba(16, 185, 129, 0.6);
          }
        `}</style>
      </div>
    );
  }
);

TicketPrintView.displayName = 'TicketPrintView';
