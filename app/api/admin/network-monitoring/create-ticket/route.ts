import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface NetworkTicketData {
  endpointId: string;
  endpointType: 'BRANCH' | 'ATM';
  incidentType: 'OUTAGE' | 'SLOW' | 'INTERMITTENT' | 'TIMEOUT' | 'ERROR';
  pingResult?: {
    status: string;
    responseTimeMs?: number;
    packetLoss?: number;
    errorMessage?: string;
    ipAddress: string;
    checkedAt: string;
  };
  description?: string;
}

async function determineServiceForIncident(
  incidentType: string, 
  networkMedia?: string,
  endpointType?: string
): Promise<string | null> {
  let serviceName = '';
  
  switch (incidentType) {
    case 'OUTAGE':
    case 'OFFLINE':
      // ATM-specific outage
      if (endpointType === 'ATM') {
        serviceName = 'ATM Network Outage - Transaction Processing Failure';
      }
      // Vendor-specific services for branches
      else if (networkMedia === 'VSAT') {
        serviceName = 'VSAT Satellite Network Issues';
      } else if (networkMedia === 'M2M') {
        serviceName = 'M2M Cellular Network Issues';
      } else if (networkMedia === 'FO') {
        serviceName = 'Fiber Optic Network Issues';
      } else {
        serviceName = 'Critical Network Outage - Branch Complete Failure';
      }
      break;
    case 'SLOW':
      // Determine severity based on response time or other factors
      serviceName = 'Severe Network Performance Degradation';
      break;
    case 'INTERMITTENT':
    case 'TIMEOUT':
    case 'ERROR':
      serviceName = 'Intermittent Network Connectivity Issues';
      break;
    default:
      serviceName = endpointType === 'ATM' 
        ? 'ATM Network Outage - Transaction Processing Failure'
        : 'Critical Network Outage - Branch Complete Failure';
  }

  // Find the service in database
  const service = await prisma.service.findFirst({
    where: { 
      name: serviceName,
      isActive: true
    },
    select: { id: true, name: true, priority: true, slaHours: true }
  });

  return service?.id || null;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ${Math.floor((seconds % 3600) / 60)} minutes`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days} days ${hours} hours`;
}

async function generateTicketDescription(
  endpoint: any, 
  pingResult: any, 
  incidentType: string
): Promise<string> {
  const entityType = endpoint.type || 'BRANCH';
  const entityName = endpoint.name || endpoint.code;
  const timestamp = new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  // Get monitoring log for downtime information
  const monitoringLog = await prisma.networkMonitoringLog.findUnique({
    where: {
      entityType_entityId: {
        entityType: entityType,
        entityId: endpoint.id
      }
    }
  });

  let description = `🚨 AUTOMATED NETWORK INCIDENT REPORT\n\n`;
  description += `📍 LOCATION: ${entityName} (${endpoint.code})\n`;
  description += `🏢 TYPE: ${entityType}\n`;
  description += `🌐 IP ADDRESS: ${pingResult?.ipAddress || endpoint.ipAddress || 'N/A'}\n`;
  description += `📡 NETWORK MEDIA: ${endpoint.networkMedia || 'Unknown'}\n`;
  description += `🏭 VENDOR: ${endpoint.networkVendor || 'Unknown'}\n`;
  description += `⏰ DETECTED AT: ${timestamp}\n\n`;

  description += `🔍 INCIDENT DETAILS:\n`;
  description += `- Current Status: ${pingResult?.status || incidentType}\n`;
  
  if (monitoringLog?.previousStatus && monitoringLog.previousStatus !== (pingResult?.status || incidentType)) {
    description += `- Previous Status: ${monitoringLog.previousStatus}\n`;
  }
  
  if (pingResult?.responseTimeMs) {
    description += `- Response Time: ${pingResult.responseTimeMs}ms\n`;
  }
  
  if (pingResult?.packetLoss && pingResult.packetLoss > 0) {
    description += `- Packet Loss: ${pingResult.packetLoss.toFixed(1)}%\n`;
  }
  
  if (pingResult?.errorMessage) {
    description += `- Error Message: ${pingResult.errorMessage}\n`;
  }

  // Add downtime information if available
  if (monitoringLog?.downSince && ['OFFLINE', 'TIMEOUT', 'ERROR'].includes(pingResult?.status || incidentType)) {
    const downtimeSeconds = Math.floor((Date.now() - monitoringLog.downSince.getTime()) / 1000);
    description += `- Downtime Duration: ${formatDuration(downtimeSeconds)}\n`;
    description += `- Down Since: ${monitoringLog.downSince.toLocaleString('en-US', { 
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short'
    })}\n`;
  }

  // Add status change information
  if (monitoringLog?.statusChangedAt) {
    const timeSinceChange = Math.floor((Date.now() - monitoringLog.statusChangedAt.getTime()) / 1000);
    description += `- Status Changed: ${formatDuration(timeSinceChange)} ago\n`;
  }

  // Add uptime information
  if (monitoringLog?.uptimeSeconds !== undefined && monitoringLog?.downtimeSeconds !== undefined) {
    const currentDowntime = monitoringLog.downSince && ['OUTAGE', 'TIMEOUT', 'ERROR'].includes(pingResult?.status || incidentType)
      ? Math.floor((Date.now() - monitoringLog.downSince.getTime()) / 1000)
      : 0;
    
    const totalTime = (monitoringLog.uptimeSeconds || 0) + (monitoringLog.downtimeSeconds || 0) + currentDowntime;
    if (totalTime > 0) {
      const uptimePercentage = Math.round(((monitoringLog.uptimeSeconds || 0) / totalTime) * 100);
      description += `- Uptime (Recent): ${uptimePercentage}% (${formatDuration(monitoringLog.uptimeSeconds || 0)} up, ${formatDuration((monitoringLog.downtimeSeconds || 0) + currentDowntime)} down)\n`;
    }
  }

  description += `\n💼 BUSINESS IMPACT:\n`;
  
  if (entityType === 'BRANCH') {
    switch (incidentType) {
      case 'OUTAGE':
      case 'OFFLINE':
        description += `- Branch operations severely impacted\n`;
        description += `- Staff unable to access core banking systems\n`;
        description += `- Customer service disrupted\n`;
        break;
      case 'SLOW':
        description += `- Degraded performance affecting productivity\n`;
        description += `- Delays in customer transactions\n`;
        description += `- Staff experiencing system timeouts\n`;
        break;
      default:
        description += `- Intermittent connectivity issues\n`;
        description += `- Potential service interruptions\n`;
    }
  } else if (entityType === 'ATM') {
    switch (incidentType) {
      case 'OUTAGE':
      case 'OFFLINE':
        description += `- ATM out of service\n`;
        description += `- Customers unable to perform transactions\n`;
        description += `- Potential revenue loss\n`;
        break;
      case 'SLOW':
        description += `- Slow transaction processing\n`;
        description += `- Customer complaints likely\n`;
        description += `- Extended transaction times\n`;
        break;
      default:
        description += `- Intermittent transaction failures\n`;
        description += `- Customer experience degraded\n`;
    }
  }

  description += `\n🔧 RECOMMENDED ACTIONS:\n`;
  description += `1. Verify physical network connections\n`;
  description += `2. Check with network vendor (${endpoint.networkVendor || 'vendor'})\n`;
  description += `3. Review network equipment status\n`;
  description += `4. Monitor for service restoration\n`;
  description += `5. Update stakeholders on resolution progress\n\n`;

  description += `⚠️ This ticket was automatically generated by the Network Monitoring System.\n`;
  description += `For urgent issues, please contact the Network Operations Center immediately.`;

  return description;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[CreateTicket] Starting ticket creation...');
    
    const session = await auth();
    
    if (!session || !['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      console.log('[CreateTicket] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data: NetworkTicketData = await request.json();
    const { endpointId, endpointType, incidentType, pingResult, description } = data;

    console.log('[CreateTicket] Request data:', { endpointId, endpointType, incidentType });

    if (!endpointId || !endpointType || !incidentType) {
      console.log('[CreateTicket] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: endpointId, endpointType, incidentType' },
        { status: 400 }
      );
    }

    // Get endpoint details
    let endpoint: any = null;
    
    if (endpointType === 'BRANCH') {
      endpoint = await prisma.branch.findUnique({
        where: { id: endpointId },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          ipAddress: true,
          networkMedia: true,
          networkVendor: true
        }
      });
      endpoint.type = 'BRANCH';
    } else if (endpointType === 'ATM') {
      endpoint = await prisma.aTM.findUnique({
        where: { id: endpointId },
        select: {
          id: true,
          code: true,
          location: true,
          ipAddress: true,
          networkMedia: true,
          networkVendor: true,
          branch: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      });
      if (endpoint) {
        endpoint.name = endpoint.location;
        endpoint.type = 'ATM';
      }
    }

    if (!endpoint) {
      return NextResponse.json(
        { error: `${endpointType.toLowerCase()} not found` },
        { status: 404 }
      );
    }

    // Determine appropriate service
    console.log('[CreateTicket] Determining service for:', { incidentType, networkMedia: endpoint.networkMedia, endpointType });
    const serviceId = await determineServiceForIncident(incidentType, endpoint.networkMedia, endpointType);
    console.log('[CreateTicket] Found serviceId:', serviceId);
    
    if (!serviceId) {
      console.log('[CreateTicket] No service found for incident type');
      return NextResponse.json(
        { error: 'No appropriate service found for this incident type' },
        { status: 400 }
      );
    }

    // Get service details
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        supportGroup: true
      }
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Generate ticket description
    const ticketDescription = description || await generateTicketDescription(endpoint, pingResult, incidentType);

    // Determine priority based on incident type
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    if (['OUTAGE', 'OFFLINE'].includes(incidentType)) {
      priority = 'HIGH';
    } else if (incidentType === 'SLOW') {
      priority = 'MEDIUM';
    } else {
      priority = 'MEDIUM';
    }

    // Generate ticket number - get max ticket number and increment
    const maxResult = await prisma.$queryRaw<[{ maxNum: bigint | null }]>`
      SELECT MAX(CAST(NULLIF(REGEXP_REPLACE("ticketNumber", '[^0-9]', '', 'g'), '') AS BIGINT)) as "maxNum"
      FROM "tickets"
    `;
    const maxTicketNumber = maxResult[0]?.maxNum ? Number(maxResult[0].maxNum) : 0;
    const ticketNumber = String(maxTicketNumber + 1);

    console.log('[CreateTicket] Creating ticket with data:', {
      ticketNumber,
      serviceId,
      supportGroupId: service.supportGroupId,
      branchId: endpointType === 'BRANCH' ? endpoint.id : endpoint.branch?.id
    });

    // Create the ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: `[AUTO] ${endpointType} Network ${incidentType} - ${endpoint.code}`,
        description: ticketDescription,
        category: 'INCIDENT',
        priority,
        status: 'OPEN',
        serviceId,
        supportGroupId: service.supportGroupId,
        createdById: session.user.id,
        branchId: endpointType === 'BRANCH' ? endpoint.id : (endpoint.branch?.id || null)
      }
    });

    console.log('[CreateTicket] Ticket created successfully:', ticket.id);

    // Create field values for the network incident using enhanced templates
    const serviceFields = await prisma.serviceField.findMany({
      where: { serviceId },
      orderBy: { order: 'asc' }
    });

    // Also get monitoring log for enhanced field population
    const monitoringLog = await prisma.networkMonitoringLog.findUnique({
      where: {
        entityType_entityId: {
          entityType: endpointType,
          entityId: endpointId
        }
      }
    });

    for (const serviceField of serviceFields) {
      let value = '';
      
      switch (serviceField.name) {
        case 'Incident Severity Level':
          if (['OUTAGE', 'OFFLINE'].includes(incidentType)) {
            value = 'Critical - Complete outage affecting business operations';
          } else if (incidentType === 'SLOW') {
            value = 'High - Significant impact with degraded service';
          } else {
            value = 'Medium - Moderate impact with workarounds available';
          }
          break;
          
        case 'Network Incident Type':
          if (['OUTAGE', 'OFFLINE'].includes(incidentType)) {
            value = 'Complete Network Outage';
          } else if (incidentType === 'SLOW') {
            value = 'Slow Network Performance';
          } else if (['INTERMITTENT', 'TIMEOUT'].includes(incidentType)) {
            value = 'Intermittent Connectivity Loss';
          } else {
            value = 'Equipment Hardware Failure';
          }
          break;

        case 'Affected Network Equipment':
          if (endpoint.networkMedia === 'VSAT') {
            value = 'VSAT Terminal';
          } else if (endpoint.networkMedia === 'M2M') {
            value = 'M2M/Cellular Modem';
          } else if (endpoint.networkMedia === 'FO') {
            value = 'Fiber Equipment';
          } else {
            value = 'Unknown/Multiple Devices';
          }
          break;

        case 'Network Media Type':
          const mediaMap = {
            'VSAT': 'VSAT Satellite',
            'M2M': 'M2M Cellular', 
            'FO': 'Fiber Optic (FO)'
          };
          value = mediaMap[endpoint.networkMedia as keyof typeof mediaMap] || 'Unknown';
          break;

        case 'Service Provider/Vendor':
          const vendorMap = {
            'Telkomsat': 'Telkomsat (VSAT)',
            'Telkom': 'Telkom Indonesia',
            'Telkomsel': 'Telkomsel',
            'Indosat': 'Indosat Ooredoo',
            'XL Axiata': 'XL Axiata'
          };
          value = vendorMap[endpoint.networkVendor as keyof typeof vendorMap] || 'Other ISP';
          break;

        case 'Primary IP Address':
          value = pingResult?.ipAddress || endpoint.ipAddress || '';
          break;

        case 'Secondary/Backup IP Address':
          value = endpoint.backupIpAddress || '';
          break;

        case 'Last Successful Response Time':
          value = pingResult?.responseTimeMs && pingResult.responseTimeMs > 0 
            ? pingResult.responseTimeMs.toString() 
            : '';
          break;

        case 'Current Response Time':
          value = pingResult?.responseTimeMs ? pingResult.responseTimeMs.toString() : '';
          break;

        case 'Packet Loss Percentage':
          value = pingResult?.packetLoss !== undefined ? pingResult.packetLoss.toString() : '0';
          break;

        case 'Network Speed Test Results':
          if (pingResult?.responseTimeMs) {
            value = `Response Time: ${pingResult.responseTimeMs}ms`;
            if (pingResult.packetLoss && pingResult.packetLoss > 0) {
              value += `\nPacket Loss: ${pingResult.packetLoss}%`;
            }
          }
          break;

        case 'Incident First Detected':
          value = pingResult?.checkedAt || new Date().toISOString();
          break;

        case 'Last Known Working Time':
          // Could be enhanced with monitoring log data
          value = '';
          break;

        case 'Estimated Downtime Duration':
          if (monitoringLog?.downSince && ['OFFLINE', 'TIMEOUT', 'ERROR'].includes(incidentType)) {
            const downtimeSeconds = Math.floor((Date.now() - monitoringLog.downSince.getTime()) / 1000);
            if (downtimeSeconds < 900) value = '0-15 minutes';
            else if (downtimeSeconds < 1800) value = '15-30 minutes';
            else if (downtimeSeconds < 3600) value = '30-60 minutes';
            else if (downtimeSeconds < 7200) value = '1-2 hours';
            else if (downtimeSeconds < 14400) value = '2-4 hours';
            else if (downtimeSeconds < 28800) value = '4-8 hours';
            else if (downtimeSeconds < 86400) value = '8-24 hours';
            else value = 'More than 24 hours';
          }
          break;

        case 'Number of Users Affected':
          if (endpointType === 'ATM') {
            value = '51-100 users'; // ATMs serve many customers
          } else {
            value = '21-50 users'; // Branch staff and customers
          }
          break;

        case 'Business Services Impacted':
          if (endpointType === 'ATM') {
            value = 'ATM Transaction Processing,POS/Payment Systems,External Customer Services';
          } else {
            value = 'Core Banking System Access,Branch Teller Operations,Customer Service Operations,Email and Communications';
          }
          break;

        case 'Current Workaround Status':
          if (['OUTAGE', 'OFFLINE'].includes(incidentType)) {
            value = 'No workaround available - complete outage';
          } else if (incidentType === 'SLOW') {
            value = 'Partial workaround implemented';
          } else {
            value = 'Service temporarily suspended';
          }
          break;

        case 'Error Messages and Codes':
          value = pingResult?.errorMessage || '';
          break;

        case 'Network Diagnostic Results':
          let diagnostics = '';
          if (pingResult?.responseTimeMs) {
            diagnostics += `Ping Response: ${pingResult.responseTimeMs}ms\n`;
          }
          if (pingResult?.packetLoss && pingResult.packetLoss > 0) {
            diagnostics += `Packet Loss: ${pingResult.packetLoss}%\n`;
          }
          if (pingResult?.errorMessage) {
            diagnostics += `Error: ${pingResult.errorMessage}`;
          }
          value = diagnostics.trim();
          break;

        case 'Equipment Status Indicators':
          value = `Status: ${pingResult?.status || incidentType}\nIP: ${endpoint.ipAddress}`;
          break;

        case 'Weather Conditions':
          value = 'Unknown/Not applicable';
          break;

        case 'Recent Network Changes':
          value = '';
          break;

        case 'Power Status':
          value = 'Unknown power status';
          break;

        case 'Vendor Notification Status':
          value = 'Vendor not yet contacted';
          break;

        case 'Vendor Ticket Reference':
          value = '';
          break;
      }

      if (value) {
        await prisma.ticketFieldValue.create({
          data: {
            ticketId: ticket.id,
            fieldId: serviceField.id,
            value
          }
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        ticketId: ticket.id,
        action: 'TICKET_CREATED',
        entity: 'TICKET',
        entityId: ticket.id,
        newValues: {
          automated: true,
          endpointType,
          endpointId,
          incidentType,
          networkMedia: endpoint.networkMedia
        }
      }
    });

    // Create network incident record if applicable
    if (['OUTAGE', 'SLOW', 'TIMEOUT', 'ERROR'].includes(incidentType)) {
      await prisma.networkIncident.create({
        data: {
          ...(endpointType === 'BRANCH' && { branchId: endpoint.id }),
          ...(endpointType === 'ATM' && { atmId: endpoint.id }),
          type: incidentType === 'OUTAGE' ? 'COMMUNICATION_OFFLINE' : 'SLOW_CONNECTION',
          severity: priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
          description: `Automated network incident: ${incidentType}`,
          status: 'OPEN',
          ticketId: ticket.id,
          externalReferenceId: `NET-${timestamp}-${endpointId.slice(-8)}`
        }
      });
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      },
      endpoint: {
        id: endpoint.id,
        type: endpointType,
        name: endpoint.name,
        code: endpoint.code
      },
      service: {
        id: service.id,
        name: service.name,
        supportGroup: service.supportGroup?.name
      }
    });

  } catch (error) {
    console.error('[CreateTicket] Error creating network ticket:', error);
    
    // Provide more detailed error information
    if (error instanceof Error) {
      console.error('[CreateTicket] Error message:', error.message);
      console.error('[CreateTicket] Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Failed to create network incident ticket', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}