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
      approverName: latestApproval?.approver?.name || '',
      approvedDate: latestApproval?.updatedAt || ticket.createdAt,
      status: latestApproval ? 'DISETUJUI' : ticket.status
    };
    const encodedData = typeof window !== 'undefined' ? btoa(JSON.stringify(qrData)) : '';
    const qrCodeUrl = encodedData ? `${typeof window !== 'undefined' ? window.location.origin : ''}/qr/${encodedData}` : '';

    // Plain text QR for direct scanning (always show)
    const qrText = `TIKET: ${ticket.ticketNumber}\nStatus: ${ticket.status}\nPemohon: ${ticket.createdBy?.name || '-'}\nLayanan: ${ticket.service?.name || '-'}\nTanggal: ${format(new Date(ticket.createdAt), 'dd MMM yyyy HH:mm')}${latestApproval ? `\nDisetujui: ${latestApproval.approver?.name || '-'}` : ''}`;

    // Status badge colors - inline styles for print compatibility
    const getStatusColor = (status: string) => {
      const statusColors: Record<string, { bg: string; text: string; border: string }> = {
        'OPEN': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
        'IN_PROGRESS': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
        'RESOLVED': { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
        'CLOSED': { bg: '#f3f4f6', text: '#1f2937', border: '#6b7280' },
      };
      return statusColors[status] || statusColors['OPEN'];
    };

    // Priority badge colors - inline styles for print compatibility
    const getPriorityColor = (priority: string) => {
      const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
        'EMERGENCY': { bg: '#fae8ff', text: '#6b21a8', border: '#a855f7' },
        'CRITICAL': { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
        'HIGH': { bg: '#fed7aa', text: '#9a3412', border: '#f97316' },
        'MEDIUM': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
        'LOW': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
      };
      return priorityColors[priority] || priorityColors['MEDIUM'];
    };

    const statusColor = getStatusColor(ticket.status);
    const priorityColor = getPriorityColor(ticket.priority);

    return (
      <div ref={ref} style={{
        backgroundColor: '#ffffff',
        color: '#000000',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      }}>
        {/* Header - Bank SulutGo Red */}
        <div style={{
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          padding: '16px 24px',
          marginBottom: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '8px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#DC2626',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '20px' }}>BSG</span>
                </div>
              </div>
              <div style={{ color: '#ffffff' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, lineHeight: 1.2 }}>
                  Bank SulutGo ServiceDesk
                </h1>
                <p style={{ fontSize: '12px', opacity: 0.9, margin: '4px 0 0 0' }}>
                  Manajemen Layanan TI
                </p>
              </div>
            </div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(4px)',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '2px solid rgba(255, 255, 255, 0.3)'
            }}>
              <p style={{
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.9)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 4px 0'
              }}>
                Tiket
              </p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                {ticket.ticketNumber}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 24px 16px 24px', flex: 1 }}>
          {/* Title Section with Status and Priority */}
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#111827',
                flex: 1,
                paddingRight: '16px',
                margin: 0
              }}>
                {ticket.title}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: statusColor.bg,
                  color: statusColor.text,
                  border: `1px solid ${statusColor.border}`,
                  whiteSpace: 'nowrap'
                }}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: priorityColor.bg,
                  color: priorityColor.text,
                  border: `1px solid ${priorityColor.border}`,
                  whiteSpace: 'nowrap'
                }}>
                  {ticket.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Information Grid */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                width: '4px',
                height: '16px',
                backgroundColor: '#DC2626',
                marginRight: '8px',
                borderRadius: '2px'
              }}></span>
              Informasi Tiket
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              backgroundColor: '#f9fafb',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '4px'
                }}>
                  Layanan
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                  {ticket.service?.name || '-'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '4px'
                }}>
                  Cabang
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                  {ticket.branch?.name || '-'} {ticket.branch?.code ? `(${ticket.branch.code})` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '4px'
                }}>
                  Pemohon
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                  {ticket.createdBy?.name || '-'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '4px'
                }}>
                  Dibuat
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                  {format(new Date(ticket.createdAt), 'dd MMM yyyy, HH:mm')}
                </span>
              </div>
              {ticket.assignedTo && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '4px'
                  }}>
                    Ditugaskan Ke
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                    {ticket.assignedTo.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                width: '4px',
                height: '16px',
                backgroundColor: '#DC2626',
                marginRight: '8px',
                borderRadius: '2px'
              }}></span>
              Deskripsi
            </h3>
            <div style={{
              backgroundColor: '#f9fafb',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div
                style={{
                  fontSize: '12px',
                  color: '#1f2937',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5
                }}
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
            </div>
          </div>

          {/* Custom Fields */}
          {ticket.fieldValues && ticket.fieldValues.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{
                  width: '4px',
                  height: '16px',
                  backgroundColor: '#DC2626',
                  marginRight: '8px',
                  borderRadius: '2px'
                }}></span>
                Informasi Tambahan
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                backgroundColor: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                {ticket.fieldValues.map((fieldValue) => (
                  <div key={fieldValue.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px'
                    }}>
                      {fieldValue.field?.label || 'Field'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                      {fieldValue.value || '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Information (if approved) */}
          {latestApproval && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{
                  width: '4px',
                  height: '16px',
                  backgroundColor: '#DC2626',
                  marginRight: '8px',
                  borderRadius: '2px'
                }}></span>
                Informasi Persetujuan
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                backgroundColor: '#dcfce7',
                padding: '16px',
                borderRadius: '8px',
                border: '2px solid #16a34a'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#166534',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '4px'
                  }}>
                    Disetujui Oleh
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                    {latestApproval.approver?.name || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#166534',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '4px'
                  }}>
                    Tanggal Persetujuan
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                    {format(new Date(latestApproval.updatedAt), 'dd MMM yyyy, HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Verification Section - Always Show */}
          <div style={{
            marginBottom: '16px',
            padding: '20px',
            backgroundColor: '#fef2f2',
            borderRadius: '12px',
            border: '2px solid #DC2626'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px'
            }}>
              {/* Left side - Verification info */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#DC2626',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>BSG</span>
                  </div>
                  <div>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: '#DC2626',
                      margin: '0 0 4px 0'
                    }}>
                      Verifikasi Digital
                    </h4>
                    <p style={{
                      fontSize: '11px',
                      color: '#991b1b',
                      margin: 0
                    }}>
                      Bank SulutGo ServiceDesk
                    </p>
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca'
                }}>
                  <p style={{
                    fontSize: '10px',
                    color: '#991b1b',
                    margin: '0 0 8px 0',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Detail Tiket
                  </p>
                  <p style={{ fontSize: '11px', color: '#1f2937', margin: '0 0 4px 0' }}>
                    <strong>No. Tiket:</strong> {ticket.ticketNumber}
                  </p>
                  <p style={{ fontSize: '11px', color: '#1f2937', margin: '0 0 4px 0' }}>
                    <strong>Status:</strong> {ticket.status.replace('_', ' ')}
                  </p>
                  <p style={{ fontSize: '11px', color: '#1f2937', margin: '0 0 4px 0' }}>
                    <strong>Pemohon:</strong> {ticket.createdBy?.name || '-'}
                  </p>
                  {latestApproval && (
                    <p style={{ fontSize: '11px', color: '#16a34a', margin: '0', fontWeight: 600 }}>
                      ✓ Disetujui oleh {latestApproval.approver?.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Right side - QR Code */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '2px solid #DC2626'
              }}>
                <QRCodeSVG
                  value={qrCodeUrl || qrText}
                  size={100}
                  level="H"
                  includeMargin={false}
                  style={{ display: 'block' }}
                />
                <p style={{
                  fontSize: '10px',
                  color: '#DC2626',
                  fontWeight: 700,
                  marginTop: '8px',
                  textAlign: 'center',
                  margin: '8px 0 0 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Pindai untuk Verifikasi
                </p>
              </div>
            </div>

            <p style={{
              fontSize: '9px',
              color: '#6b7280',
              textAlign: 'center',
              margin: '12px 0 0 0',
              borderTop: '1px solid #fecaca',
              paddingTop: '12px'
            }}>
              Dokumen ini dibuat secara elektronik oleh Bank SulutGo ServiceDesk.
              Scan QR code untuk memverifikasi keaslian dokumen.
            </p>
          </div>
        </div>

        {/* Footer - Bank SulutGo Red */}
        <div style={{
          background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
          padding: '12px 24px',
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#ffffff',
            fontSize: '11px'
          }}>
            <p style={{ fontWeight: 600, margin: 0 }}>
              © {new Date().getFullYear()} Bank SulutGo
            </p>
            <p style={{ fontWeight: 600, margin: 0 }}>
              Dicetak: {format(new Date(), 'dd MMM yyyy, HH:mm')}
            </p>
          </div>
        </div>

        {/* Print Styles */}
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

            body {
              margin: 0;
              padding: 0;
            }

            /* Optimize for faster printing */
            img {
              max-width: 100%;
              height: auto;
            }

            /* Ensure QR code prints correctly */
            svg {
              shape-rendering: crispEdges;
            }

            /* Remove shadows for better print quality */
            * {
              box-shadow: none !important;
              text-shadow: none !important;
            }

            /* Ensure backgrounds print */
            div, span, p {
              background-color: transparent;
            }

            /* Preserve specific backgrounds */
            [style*="background"] {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
          }
        `}</style>
      </div>
    );
  }
);

TicketPrintView.displayName = 'TicketPrintView';
