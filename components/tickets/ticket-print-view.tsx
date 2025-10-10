import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';

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
  creator: {
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
    // Get latest approval if it exists and is approved
    const latestApproval = ticket.approvals?.find(a => a.status === 'APPROVED');

    // Generate QR code data if ticket is approved
    const qrData = latestApproval ? {
      ticketNumber: ticket.ticketNumber,
      approverName: latestApproval.approver.name,
      approvedDate: latestApproval.updatedAt,
      status: 'APPROVED'
    } : null;

    const qrDataString = qrData ? btoa(JSON.stringify(qrData)) : null;

    return (
      <div ref={ref} className="p-8 bg-white text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">Bank SulutGo ServiceDesk</h1>
              <p className="text-sm text-gray-600">IT Service Management System</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Ticket Number</p>
              <p className="text-xl font-bold">{ticket.ticketNumber}</p>
            </div>
          </div>
        </div>

        {/* Ticket Information */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">Ticket Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Title</p>
              <p className="font-semibold">{ticket.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold">{ticket.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Priority</p>
              <p className="font-semibold">{ticket.priority}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Service</p>
              <p className="font-semibold">{ticket.service.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Branch</p>
              <p className="font-semibold">{ticket.branch.name} ({ticket.branch.code})</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created Date</p>
              <p className="font-semibold">{format(new Date(ticket.createdAt), 'dd MMM yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Requester</p>
              <p className="font-semibold">{ticket.creator.name}</p>
            </div>
            {ticket.assignedTo && (
              <div>
                <p className="text-sm text-gray-600">Assigned To</p>
                <p className="font-semibold">{ticket.assignedTo.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">Description</h2>
          <div
            className="text-sm whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: ticket.description }}
          />
        </div>

        {/* Custom Fields */}
        {ticket.fieldValues && ticket.fieldValues.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">Custom Fields</h2>
            <div className="grid grid-cols-2 gap-4">
              {ticket.fieldValues.map((fieldValue) => (
                <div key={fieldValue.id}>
                  <p className="text-sm text-gray-600">{fieldValue.field.label}</p>
                  <p className="font-semibold">{fieldValue.value || '-'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval Information with QR Code */}
        {latestApproval && qrDataString && (
          <div className="mb-6 border-2 border-green-600 p-4 rounded">
            <h2 className="text-lg font-bold mb-3 text-green-700">Approval Information</h2>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Approved By</p>
                  <p className="font-semibold text-green-700">{latestApproval.approver.name}</p>
                </div>
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Approval Date</p>
                  <p className="font-semibold">{format(new Date(latestApproval.updatedAt), 'dd MMM yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-green-700">APPROVED</p>
                </div>
              </div>
              <div className="text-center">
                <QRCodeSVG
                  value={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/qr/${qrDataString}`}
                  size={120}
                  level="H"
                  includeMargin={true}
                />
                <p className="text-xs text-gray-600 mt-2">Scan to verify approval</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
          <div className="flex justify-between">
            <p>© {new Date().getFullYear()} Bank SulutGo</p>
            <p>Printed: {format(new Date(), 'dd MMM yyyy HH:mm:ss')}</p>
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
              margin: 1cm;
            }
          }
        `}</style>
      </div>
    );
  }
);

TicketPrintView.displayName = 'TicketPrintView';
