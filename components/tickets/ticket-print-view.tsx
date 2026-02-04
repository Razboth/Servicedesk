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

    // Always generate QR code data for ticket verification
    const qrData = {
      ticketNumber: ticket.ticketNumber || '',
      status: ticket.status,
      requester: ticket.createdBy?.name || '',
      service: ticket.service?.name || '',
      createdDate: ticket.createdAt,
      approverName: latestApproval?.approver?.name || '',
      approvedDate: latestApproval?.updatedAt || ''
    };

    const encodedData = typeof window !== 'undefined' ? btoa(JSON.stringify(qrData)) : '';
    const qrCodeUrl = encodedData ? `${typeof window !== 'undefined' ? window.location.origin : ''}/qr/${encodedData}` : '';

    // Plain text QR as fallback
    const qrText = `TIKET: ${ticket.ticketNumber}\nStatus: ${ticket.status}\nPemohon: ${ticket.createdBy?.name || '-'}\nLayanan: ${ticket.service?.name || '-'}\nTanggal: ${format(new Date(ticket.createdAt), 'dd MMM yyyy HH:mm')}${latestApproval ? `\nDisetujui: ${latestApproval.approver?.name || '-'}` : ''}`;

    return (
      <div ref={ref} style={{
        backgroundColor: '#ffffff',
        height: '297mm',
        width: '210mm',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '1.4',
        color: '#1a1a1a',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pageBreakAfter: 'avoid',
        pageBreakInside: 'avoid'
      }}>
        {/* Compact Header */}
        <div style={{
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 50%, #991B1B 100%)',
          padding: '16px 24px',
          borderBottom: '3px solid #7F1D1D',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {/* Logo and Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-bsg.png"
                  alt="BSG Logo"
                  style={{
                    width: '40px',
                    height: '40px',
                    objectFit: 'contain'
                  }}
                />
              </div>
              <div>
                <h1 style={{
                  fontSize: '18px',
                  fontWeight: '800',
                  color: '#ffffff',
                  margin: 0
                }}>
                  Bank SulutGo ServiceDesk
                </h1>
                <p style={{
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: 0
                }}>
                  IT Service Management System
                </p>
              </div>
            </div>

            {/* Ticket Number Badge */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '9px',
                color: '#DC2626',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Nomor Tiket
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '900',
                color: '#991B1B'
              }}>
                {ticket.ticketNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ padding: '16px 24px', paddingBottom: '60px' }}>
          {/* Ticket Title with Status and Priority Badges */}
          <div style={{
            marginBottom: '12px',
            paddingBottom: '10px',
            borderBottom: '1px solid #E5E7EB'
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#111827',
              margin: '0 0 8px 0',
              lineHeight: '1.3'
            }}>
              {ticket.title}
            </h2>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* Status Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase',
                backgroundColor:
                  ticket.status === 'OPEN' ? '#DBEAFE' :
                  ticket.status === 'IN_PROGRESS' ? '#FEF3C7' :
                  ticket.status === 'RESOLVED' ? '#D1FAE5' :
                  '#F3F4F6',
                color:
                  ticket.status === 'OPEN' ? '#1E40AF' :
                  ticket.status === 'IN_PROGRESS' ? '#92400E' :
                  ticket.status === 'RESOLVED' ? '#065F46' :
                  '#1F2937'
              }}>
                {ticket.status.replace('_', ' ')}
              </div>

              {/* Priority Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase',
                backgroundColor:
                  ticket.priority === 'EMERGENCY' ? '#FAE8FF' :
                  ticket.priority === 'CRITICAL' ? '#FEE2E2' :
                  ticket.priority === 'HIGH' ? '#FED7AA' :
                  ticket.priority === 'MEDIUM' ? '#FEF3C7' :
                  '#DBEAFE',
                color:
                  ticket.priority === 'EMERGENCY' ? '#6B21A8' :
                  ticket.priority === 'CRITICAL' ? '#991B1B' :
                  ticket.priority === 'HIGH' ? '#9A3412' :
                  ticket.priority === 'MEDIUM' ? '#92400E' :
                  '#1E40AF'
              }}>
                {ticket.priority}
              </div>
            </div>
          </div>

          {/* Ticket Information Grid */}
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#DC2626',
              margin: '0 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderLeft: '3px solid #DC2626',
              paddingLeft: '8px'
            }}>
              Informasi Tiket
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              backgroundColor: '#F9FAFB',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB'
            }}>
              <InfoField label="Layanan" value={ticket.service?.name || '-'} />
              <InfoField
                label="Cabang"
                value={`${ticket.branch?.name || '-'} ${ticket.branch?.code ? `(${ticket.branch.code})` : ''}`}
              />
              <InfoField label="Pemohon" value={ticket.createdBy?.name || '-'} />
              <InfoField
                label="Dibuat"
                value={format(new Date(ticket.createdAt), 'dd MMM yyyy, HH:mm')}
              />
              {ticket.assignedTo && (
                <InfoField label="Ditugaskan Ke" value={ticket.assignedTo.name} />
              )}
            </div>
          </div>

          {/* Description Section */}
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#DC2626',
              margin: '0 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderLeft: '3px solid #DC2626',
              paddingLeft: '8px'
            }}>
              Deskripsi
            </h3>

            <div style={{
              backgroundColor: '#F9FAFB',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              maxHeight: '80px',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  fontSize: '11px',
                  color: '#374151',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
            </div>
          </div>

          {/* Custom Fields Section */}
          {ticket.fieldValues && ticket.fieldValues.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#DC2626',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderLeft: '3px solid #DC2626',
                paddingLeft: '8px'
              }}>
                Informasi Tambahan
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                backgroundColor: '#F9FAFB',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB'
              }}>
                {ticket.fieldValues.map((fieldValue) => (
                  <InfoField
                    key={fieldValue.id}
                    label={fieldValue.field?.label || 'Field'}
                    value={fieldValue.value || '-'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Approval Information Section */}
          {latestApproval && (
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#16A34A',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderLeft: '3px solid #16A34A',
                paddingLeft: '8px'
              }}>
                Informasi Persetujuan
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                backgroundColor: '#DCFCE7',
                padding: '12px',
                borderRadius: '6px',
                border: '2px solid #16A34A'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>
                    Disetujui Oleh
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#14532D' }}>
                    {latestApproval.approver?.name || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>
                    Tanggal Persetujuan
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#14532D' }}>
                    {format(new Date(latestApproval.updatedAt), 'dd MMM yyyy, HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Verification Section - Compact */}
          <div style={{
            backgroundColor: '#FEF2F2',
            borderRadius: '8px',
            border: '2px solid #DC2626',
            padding: '12px'
          }}>
            <div style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center'
            }}>
              {/* Left: Verification Info */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #FECACA',
                    padding: '2px'
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logo-bsg.png"
                      alt="BSG"
                      style={{ width: '26px', height: '26px', objectFit: 'contain' }}
                    />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#DC2626', margin: 0 }}>
                      Verifikasi Digital
                    </h4>
                    <p style={{ fontSize: '9px', color: '#991B1B', margin: 0 }}>Bank SulutGo ServiceDesk</p>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#ffffff',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #FECACA',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '4px',
                  fontSize: '9px'
                }}>
                  <DetailRow label="No. Tiket" value={ticket.ticketNumber} />
                  <DetailRow label="Status" value={ticket.status.replace('_', ' ')} />
                  <DetailRow label="Pemohon" value={ticket.createdBy?.name || '-'} />
                  <DetailRow label="Layanan" value={ticket.service?.name || '-'} />
                </div>
              </div>

              {/* Right: QR Code */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '2px solid #DC2626'
                }}>
                  <QRCodeSVG
                    value={qrCodeUrl || qrText}
                    size={70}
                    level="H"
                    includeMargin={false}
                    style={{ display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: '8px', fontWeight: '700', color: '#DC2626', marginTop: '4px' }}>
                  SCAN QR
                </div>
              </div>
            </div>

            <p style={{ fontSize: '8px', color: '#6B7280', margin: '8px 0 0 0', textAlign: 'center' }}>
              Dokumen elektronik Bank SulutGo ServiceDesk. Scan QR untuk verifikasi.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: '#991B1B',
          padding: '8px 24px',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#ffffff',
            fontSize: '9px'
          }}>
            <span>© {new Date().getFullYear()} Bank SulutGo ServiceDesk</span>
            <span>Dicetak: {format(new Date(), 'dd MMM yyyy, HH:mm')}</span>
          </div>
        </div>

        {/* Print-Specific Styles */}
        <style jsx global>{`
          @media print {
            * {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            @page {
              margin: 0;
              size: A4 portrait;
            }

            html, body {
              margin: 0;
              padding: 0;
              width: 210mm;
              height: 297mm;
            }

            /* Ensure backgrounds and colors print correctly */
            div, span, p, h1, h2, h3, h4 {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }

            /* QR Code optimization */
            svg {
              shape-rendering: crispEdges;
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }

            /* Remove unnecessary shadows for print */
            .no-print-shadow {
              box-shadow: none !important;
            }

            /* Ensure page breaks are controlled */
            .avoid-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }

          @media screen {
            /* Screen-only adjustments */
            body {
              background-color: #f3f4f6;
              padding: 20px;
            }
          }
        `}</style>
      </div>
    );
  }
);

TicketPrintView.displayName = 'TicketPrintView';

// Helper Components
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{
        fontSize: '9px',
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase'
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '11px',
        fontWeight: '600',
        color: '#111827'
      }}>
        {value}
      </span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: '4px',
      fontSize: '9px'
    }}>
      <span style={{ color: '#6B7280', fontWeight: '600' }}>{label}:</span>
      <span style={{ color: '#111827', fontWeight: '700' }}>{value}</span>
    </div>
  );
}
