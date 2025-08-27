import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/reports/templates/init - Initialize default report templates
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Define default templates based on common service types
    const defaultTemplates = [
      {
        name: 'Perpanjangan Waktu Per Hari',
        description: 'Daily time extension report for service requests',
        category: 'Service Management',
        baseQuery: `
          SELECT 
            DATE(t.createdAt) as date,
            s.name as service_name,
            COUNT(t.id) as request_count,
            COUNT(CASE WHEN t.status = 'RESOLVED' THEN 1 END) as resolved_count,
            COUNT(CASE WHEN t.status = 'OPEN' THEN 1 END) as open_count,
            AVG(EXTRACT(EPOCH FROM (t.resolvedAt - t.createdAt))/3600) as avg_resolution_hours
          FROM tickets t
          JOIN services s ON t.serviceId = s.id
          WHERE s.name LIKE '%perpanjangan%' OR s.name LIKE '%extension%'
            AND t.createdAt >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY DATE(t.createdAt), s.id, s.name
          ORDER BY date DESC, request_count DESC
        `,
        availableFields: ['date', 'service_name', 'request_count', 'resolved_count', 'avg_resolution_hours'],
        defaultFilters: [
          {
            column: 'createdAt',
            operator: 'in_last',
            value: { amount: 30, unit: 'days' }
          }
        ]
      },
      {
        name: 'Laporan Gangguan ATM',
        description: 'ATM malfunction and incident report',
        category: 'Infrastructure',
        baseQuery: `
          SELECT 
            a.name as atm_name,
            a.location as atm_location,
            b.name as branch_name,
            COUNT(t.id) as incident_count,
            COUNT(CASE WHEN t.priority = 'CRITICAL' THEN 1 END) as urgent_count,
            COUNT(CASE WHEN t.status = 'RESOLVED' THEN 1 END) as resolved_count,
            AVG(t.responseTime) as avg_response_time,
            AVG(t.resolutionTime) as avg_resolution_time
          FROM tickets t
          JOIN atms a ON t.branchId = a.branchId
          JOIN branches b ON a.branchId = b.id
          WHERE t.category = 'INCIDENT'
            AND (t.title LIKE '%ATM%' OR t.description LIKE '%ATM%')
            AND t.createdAt >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY a.id, a.name, a.location, b.id, b.name
          ORDER BY incident_count DESC
        `,
        availableFields: ['atm_name', 'branch_name', 'incident_count', 'urgent_count', 'resolved_count'],
        defaultFilters: [
          {
            column: 'category',
            operator: 'equals',
            value: 'INCIDENT'
          }
        ]
      },
      {
        name: 'Permohonan Reset Password',
        description: 'Password reset request tracking report',
        category: 'Security',
        baseQuery: `
          SELECT 
            DATE(t.createdAt) as request_date,
            u.name as requester_name,
            b.name as branch_name,
            COUNT(t.id) as reset_requests,
            COUNT(CASE WHEN t.status = 'RESOLVED' THEN 1 END) as completed_resets,
            AVG(EXTRACT(EPOCH FROM (t.resolvedAt - t.createdAt))/60) as avg_resolution_minutes
          FROM tickets t
          JOIN users u ON t.createdById = u.id
          JOIN branches b ON u.branchId = b.id
          JOIN services s ON t.serviceId = s.id
          WHERE s.name LIKE '%password%' OR s.name LIKE '%reset%'
            AND t.createdAt >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY DATE(t.createdAt), u.id, u.name, b.id, b.name
          ORDER BY request_date DESC, reset_requests DESC
        `,
        availableFields: ['request_date', 'requester_name', 'branch_name', 'reset_requests', 'completed_resets'],
        defaultFilters: [
          {
            column: 'service',
            operator: 'contains',
            value: 'password'
          }
        ]
      },
      {
        name: 'Laporan Kinerja Teknisi',
        description: 'Technician performance and workload analysis',
        category: 'Performance',
        baseQuery: `
          SELECT 
            tech.name as technician_name,
            sg.name as support_group,
            COUNT(t.id) as total_tickets,
            COUNT(CASE WHEN t.status = 'RESOLVED' THEN 1 END) as resolved_tickets,
            COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as in_progress_tickets,
            AVG(t.responseTime) as avg_response_hours,
            AVG(t.resolutionTime) as avg_resolution_hours,
            COUNT(CASE WHEN t.responseTime <= s.responseHours THEN 1 END) * 100.0 / COUNT(t.id) as sla_compliance_percent
          FROM tickets t
          JOIN users tech ON t.assignedToId = tech.id
          LEFT JOIN support_groups sg ON tech.supportGroupId = sg.id
          JOIN services s ON t.serviceId = s.id
          WHERE t.assignedToId IS NOT NULL
            AND t.createdAt >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY tech.id, tech.name, sg.id, sg.name
          ORDER BY total_tickets DESC
        `,
        availableFields: ['technician_name', 'support_group', 'total_tickets', 'resolved_tickets', 'sla_compliance_percent'],
        defaultFilters: []
      },
      {
        name: 'Analisis Cabang',
        description: 'Branch-wise ticket analysis and trends',
        category: 'Operations',
        baseQuery: `
          SELECT 
            b.name as branch_name,
            b.city as city,
            COUNT(t.id) as total_tickets,
            COUNT(DISTINCT t.createdById) as unique_users,
            COUNT(CASE WHEN t.priority = 'CRITICAL' THEN 1 END) as urgent_tickets,
            COUNT(CASE WHEN t.priority = 'HIGH' THEN 1 END) as high_priority_tickets,
            AVG(t.resolutionTime) as avg_resolution_hours,
            COUNT(CASE WHEN t.status = 'RESOLVED' THEN 1 END) * 100.0 / COUNT(t.id) as resolution_rate
          FROM tickets t
          JOIN branches b ON t.branchId = b.id
          WHERE t.createdAt >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY b.id, b.name, b.city
          ORDER BY total_tickets DESC
        `,
        availableFields: ['branch_name', 'city', 'total_tickets', 'urgent_tickets', 'resolution_rate'],
        defaultFilters: [
          {
            column: 'createdAt',
            operator: 'in_last',
            value: { amount: 30, unit: 'days' }
          }
        ]
      },
      {
        name: 'Laporan SLA Bulanan',
        description: 'Monthly SLA compliance report by service',
        category: 'SLA Management',
        baseQuery: `
          SELECT 
            s.name as service_name,
            s.slaHours as sla_hours,
            COUNT(t.id) as total_tickets,
            COUNT(CASE WHEN t.resolutionTime <= s.slaHours THEN 1 END) as within_sla,
            COUNT(CASE WHEN t.resolutionTime > s.slaHours THEN 1 END) as breached_sla,
            (COUNT(CASE WHEN t.resolutionTime <= s.slaHours THEN 1 END) * 100.0 / NULLIF(COUNT(t.id), 0)) as sla_compliance_rate,
            AVG(t.resolutionTime) as avg_resolution_time,
            MAX(t.resolutionTime) as max_resolution_time
          FROM tickets t
          JOIN services s ON t.serviceId = s.id
          WHERE t.status IN ('RESOLVED', 'CLOSED')
            AND t.resolvedAt >= DATE_TRUNC('month', CURRENT_DATE)
          GROUP BY s.id, s.name, s.slaHours
          ORDER BY total_tickets DESC
        `,
        availableFields: ['service_name', 'total_tickets', 'within_sla', 'breached_sla', 'sla_compliance_rate'],
        defaultFilters: [
          {
            column: 'status',
            operator: 'in',
            value: 'RESOLVED,CLOSED'
          }
        ]
      },
      {
        name: 'Trending Issues',
        description: 'Most common issues and root causes',
        category: 'Problem Management',
        baseQuery: `
          SELECT 
            t.issueClassification as issue_type,
            t.rootCause as root_cause,
            COUNT(t.id) as occurrence_count,
            COUNT(DISTINCT t.branchId) as affected_branches,
            COUNT(DISTINCT t.serviceId) as affected_services,
            AVG(t.resolutionTime) as avg_resolution_hours,
            COUNT(CASE WHEN t.knowledgeBaseCreated = true THEN 1 END) as kb_articles_created
          FROM tickets t
          WHERE t.issueClassification IS NOT NULL
            AND t.createdAt >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY t.issueClassification, t.rootCause
          HAVING COUNT(t.id) >= 5
          ORDER BY occurrence_count DESC
        `,
        availableFields: ['issue_type', 'root_cause', 'occurrence_count', 'affected_branches', 'kb_articles_created'],
        defaultFilters: []
      }
    ]

    // Create templates
    const created = []
    for (const template of defaultTemplates) {
      try {
        const existing = await prisma.reportTemplate.findFirst({
          where: { name: template.name }
        })

        if (!existing) {
          const newTemplate = await prisma.reportTemplate.create({
            data: {
              ...template,
              isActive: true
            }
          })
          created.push(newTemplate)
        }
      } catch (err) {
        console.error(`Failed to create template ${template.name}:`, err)
      }
    }

    return NextResponse.json({
      message: `Initialized ${created.length} report templates`,
      templates: created
    })
  } catch (error) {
    console.error('Failed to initialize templates:', error)
    return NextResponse.json(
      { error: 'Failed to initialize templates' },
      { status: 500 }
    )
  }
}