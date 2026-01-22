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
        minHeight: '297mm',
        width: '210mm',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
        color: '#1a1a1a',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        {/* Modern Header with BSG Branding */}
        <div style={{
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 50%, #991B1B 100%)',
          padding: '24px 32px',
          borderBottom: '4px solid #7F1D1D',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative background elements */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            opacity: 0.5
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '-30px',
            left: '60%',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            opacity: 0.5
          }}></div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1
          }}>
            {/* Logo and Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* BSG Logo Box */}
              <div style={{
                width: '72px',
                height: '72px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                border: '3px solid #FEF2F2'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#DC2626',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  <span style={{
                    color: '#ffffff',
                    fontWeight: '900',
                    fontSize: '24px',
                    letterSpacing: '1px'
                  }}>
                    BSG
                  </span>
                </div>
              </div>

              {/* Title and Subtitle */}
              <div>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#ffffff',
                  margin: '0 0 4px 0',
                  letterSpacing: '-0.5px',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  Bank SulutGo ServiceDesk
                </h1>
                <p style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.95)',
                  margin: 0,
                  fontWeight: '500',
                  letterSpacing: '0.5px'
                }}>
                  IT Service Management System
                </p>
              </div>
            </div>

            {/* Ticket Number Badge */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '16px 24px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '3px solid #FEF2F2',
              textAlign: 'center',
              minWidth: '180px'
            }}>
              <div style={{
                fontSize: '10px',
                color: '#DC2626',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginBottom: '4px'
              }}>
                Nomor Tiket
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: '900',
                color: '#991B1B',
                letterSpacing: '0.5px'
              }}>
                {ticket.ticketNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ padding: '32px' }}>
          {/* Ticket Title with Status and Priority Badges */}
          <div style={{
            marginBottom: '24px',
            paddingBottom: '20px',
            borderBottom: '2px solid #E5E7EB'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#111827',
                margin: '0 0 12px 0',
                lineHeight: '1.3'
              }}>
                {ticket.title}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {/* Status Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                backgroundColor:
                  ticket.status === 'OPEN' ? '#DBEAFE' :
                  ticket.status === 'IN_PROGRESS' ? '#FEF3C7' :
                  ticket.status === 'RESOLVED' ? '#D1FAE5' :
                  '#F3F4F6',
                color:
                  ticket.status === 'OPEN' ? '#1E40AF' :
                  ticket.status === 'IN_PROGRESS' ? '#92400E' :
                  ticket.status === 'RESOLVED' ? '#065F46' :
                  '#1F2937',
                border: `2px solid ${
                  ticket.status === 'OPEN' ? '#3B82F6' :
                  ticket.status === 'IN_PROGRESS' ? '#F59E0B' :
                  ticket.status === 'RESOLVED' ? '#10B981' :
                  '#6B7280'
                }`
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'currentColor',
                  marginRight: '8px',
                  display: 'inline-block'
                }}></span>
                {ticket.status.replace('_', ' ')}
              </div>

              {/* Priority Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
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
                  '#1E40AF',
                border: `2px solid ${
                  ticket.priority === 'EMERGENCY' ? '#A855F7' :
                  ticket.priority === 'CRITICAL' ? '#EF4444' :
                  ticket.priority === 'HIGH' ? '#F97316' :
                  ticket.priority === 'MEDIUM' ? '#F59E0B' :
                  '#3B82F6'
                }`
              }}>
                <span style={{ marginRight: '6px' }}>
                  {ticket.priority === 'EMERGENCY' || ticket.priority === 'CRITICAL' ? '🔴' :
                   ticket.priority === 'HIGH' ? '🟠' :
                   ticket.priority === 'MEDIUM' ? '🟡' : '🔵'}
                </span>
                {ticket.priority}
              </div>
            </div>
          </div>

          {/* Ticket Information Grid */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              gap: '12px'
            }}>
              <div style={{
                width: '5px',
                height: '24px',
                backgroundColor: '#DC2626',
                borderRadius: '3px'
              }}></div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#111827',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Informasi Tiket
              </h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              backgroundColor: '#F9FAFB',
              padding: '20px',
              borderRadius: '12px',
              border: '2px solid #E5E7EB'
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
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              gap: '12px'
            }}>
              <div style={{
                width: '5px',
                height: '24px',
                backgroundColor: '#DC2626',
                borderRadius: '3px'
              }}></div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#111827',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Deskripsi
              </h3>
            </div>

            <div style={{
              backgroundColor: '#F9FAFB',
              padding: '20px',
              borderRadius: '12px',
              border: '2px solid #E5E7EB',
              minHeight: '80px'
            }}>
              <div
                style={{
                  fontSize: '13px',
                  color: '#374151',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
            </div>
          </div>

          {/* Custom Fields Section */}
          {ticket.fieldValues && ticket.fieldValues.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                gap: '12px'
              }}>
                <div style={{
                  width: '5px',
                  height: '24px',
                  backgroundColor: '#DC2626',
                  borderRadius: '3px'
                }}></div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Informasi Tambahan
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                backgroundColor: '#F9FAFB',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid #E5E7EB'
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
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                gap: '12px'
              }}>
                <div style={{
                  width: '5px',
                  height: '24px',
                  backgroundColor: '#16A34A',
                  borderRadius: '3px'
                }}></div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Informasi Persetujuan
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                backgroundColor: '#DCFCE7',
                padding: '20px',
                borderRadius: '12px',
                border: '3px solid #16A34A'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#166534',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Disetujui Oleh
                  </span>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#14532D'
                  }}>
                    {latestApproval.approver?.name || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#166534',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Tanggal Persetujuan
                  </span>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#14532D'
                  }}>
                    {format(new Date(latestApproval.updatedAt), 'dd MMM yyyy, HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Verification Section - ALWAYS VISIBLE */}
          <div style={{
            backgroundColor: '#FEF2F2',
            borderRadius: '16px',
            border: '3px solid #DC2626',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(220, 38, 38, 0.1)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '32px',
              alignItems: 'center'
            }}>
              {/* Left: Verification Information */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  {/* BSG Icon */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: '#DC2626',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}>
                    <span style={{
                      color: '#ffffff',
                      fontWeight: '900',
                      fontSize: '18px',
                      letterSpacing: '0.5px'
                    }}>
                      BSG
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <h4 style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#DC2626',
                      margin: '0 0 4px 0',
                      letterSpacing: '0.3px'
                    }}>
                      Verifikasi Digital
                    </h4>
                    <p style={{
                      fontSize: '12px',
                      color: '#991B1B',
                      margin: 0,
                      fontWeight: '600'
                    }}>
                      Bank SulutGo ServiceDesk
                    </p>
                  </div>
                </div>

                {/* Ticket Details Box */}
                <div style={{
                  backgroundColor: '#ffffff',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '2px solid #FECACA'
                }}>
                  <div style={{
                    fontSize: '10px',
                    color: '#991B1B',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '12px'
                  }}>
                    Detail Tiket
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <DetailRow label="No. Tiket" value={ticket.ticketNumber} />
                    <DetailRow label="Status" value={ticket.status.replace('_', ' ')} />
                    <DetailRow label="Pemohon" value={ticket.createdBy?.name || '-'} />
                    <DetailRow label="Layanan" value={ticket.service?.name || '-'} />
                    <DetailRow
                      label="Tanggal"
                      value={format(new Date(ticket.createdAt), 'dd MMM yyyy, HH:mm')}
                    />
                    {latestApproval && (
                      <div style={{
                        marginTop: '4px',
                        paddingTop: '8px',
                        borderTop: '1px solid #FEE2E2'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: '#16A34A',
                          fontWeight: '700'
                        }}>
                          ✓ Disetujui oleh {latestApproval.approver?.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: QR Code */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '3px solid #DC2626',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                  <QRCodeSVG
                    value={qrCodeUrl || qrText}
                    size={120}
                    level="H"
                    includeMargin={false}
                    style={{ display: 'block' }}
                  />
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#DC2626',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Pindai untuk Verifikasi
                </div>
              </div>
            </div>

            {/* Bottom Notice */}
            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '2px solid #FECACA',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '10px',
                color: '#6B7280',
                margin: 0,
                lineHeight: '1.6'
              }}>
                Dokumen ini dibuat secara elektronik oleh Bank SulutGo ServiceDesk.
                <br />
                Scan QR code untuk memverifikasi keaslian dan detail lengkap dokumen ini.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)',
          padding: '16px 32px',
          borderTop: '4px solid #450A0A',
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
            fontSize: '11px',
            fontWeight: '600'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>©</span>
              <span>{new Date().getFullYear()}</span>
              <span>Bank SulutGo</span>
              <span style={{
                marginLeft: '8px',
                padding: '2px 8px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '4px',
                fontSize: '10px'
              }}>
                ServiceDesk
              </span>
            </div>
            <div>
              Dicetak: {format(new Date(), 'dd MMM yyyy, HH:mm')}
            </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{
        fontSize: '11px',
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: '0.8px'
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '13px',
        fontWeight: '600',
        color: '#111827',
        lineHeight: '1.4'
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
      gap: '12px',
      fontSize: '12px'
    }}>
      <span style={{
        color: '#6B7280',
        fontWeight: '600',
        minWidth: '80px'
      }}>
        {label}:
      </span>
      <span style={{
        color: '#111827',
        fontWeight: '700',
        flex: 1,
        textAlign: 'right'
      }}>
        {value}
      </span>
    </div>
  );
}
