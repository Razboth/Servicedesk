/**
 * Prometheus Metrics Service
 *
 * Collects and exposes metrics for Prometheus scraping.
 * Uses in-memory counters with periodic database sync for accuracy.
 */

import { prisma } from '@/lib/prisma';

// ==================== Types ====================

interface CounterMetric {
  name: string;
  help: string;
  type: 'counter';
  values: Map<string, number>;
}

interface GaugeMetric {
  name: string;
  help: string;
  type: 'gauge';
  getValue: () => Promise<number | Map<string, number>>;
}

interface HistogramMetric {
  name: string;
  help: string;
  type: 'histogram';
  buckets: number[];
  values: Map<string, number[]>;
}

type Metric = CounterMetric | GaugeMetric | HistogramMetric;

// ==================== Metrics Registry ====================

class MetricsRegistry {
  private counters: Map<string, CounterMetric> = new Map();
  private gauges: Map<string, GaugeMetric> = new Map();
  private histograms: Map<string, HistogramMetric> = new Map();

  // ==================== Counter Methods ====================

  registerCounter(name: string, help: string): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, {
        name,
        help,
        type: 'counter',
        values: new Map(),
      });
    }
  }

  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const counter = this.counters.get(name);
    if (!counter) return;

    const labelKey = this.labelsToKey(labels);
    const current = counter.values.get(labelKey) || 0;
    counter.values.set(labelKey, current + value);
  }

  // ==================== Gauge Methods ====================

  registerGauge(name: string, help: string, getValue: () => Promise<number | Map<string, number>>): void {
    this.gauges.set(name, {
      name,
      help,
      type: 'gauge',
      getValue,
    });
  }

  // ==================== Histogram Methods ====================

  registerHistogram(name: string, help: string, buckets: number[]): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        name,
        help,
        type: 'histogram',
        buckets: buckets.sort((a, b) => a - b),
        values: new Map(),
      });
    }
  }

  observeHistogram(name: string, labels: Record<string, string> = {}, value: number): void {
    const histogram = this.histograms.get(name);
    if (!histogram) return;

    const labelKey = this.labelsToKey(labels);
    let observations = histogram.values.get(labelKey);
    if (!observations) {
      observations = [];
      histogram.values.set(labelKey, observations);
    }
    observations.push(value);
  }

  // ==================== Export Methods ====================

  private labelsToKey(labels: Record<string, string>): string {
    const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([k, v]) => `${k}="${v}"`).join(',');
  }

  private keyToLabels(key: string): string {
    return key ? `{${key}}` : '';
  }

  async exportPrometheusFormat(): Promise<string> {
    const lines: string[] = [];

    // Export counters
    for (const counter of this.counters.values()) {
      lines.push(`# HELP ${counter.name} ${counter.help}`);
      lines.push(`# TYPE ${counter.name} counter`);
      for (const [labelKey, value] of counter.values) {
        lines.push(`${counter.name}${this.keyToLabels(labelKey)} ${value}`);
      }
    }

    // Export gauges
    for (const gauge of this.gauges.values()) {
      lines.push(`# HELP ${gauge.name} ${gauge.help}`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      try {
        const value = await gauge.getValue();
        if (typeof value === 'number') {
          lines.push(`${gauge.name} ${value}`);
        } else {
          for (const [labelKey, v] of value) {
            lines.push(`${gauge.name}${this.keyToLabels(labelKey)} ${v}`);
          }
        }
      } catch {
        // Skip gauge if getValue fails
      }
    }

    // Export histograms
    for (const histogram of this.histograms.values()) {
      lines.push(`# HELP ${histogram.name} ${histogram.help}`);
      lines.push(`# TYPE ${histogram.name} histogram`);

      for (const [labelKey, observations] of histogram.values) {
        const labels = labelKey ? `${labelKey},` : '';
        let cumulative = 0;
        const sum = observations.reduce((a, b) => a + b, 0);

        for (const bucket of histogram.buckets) {
          const count = observations.filter(v => v <= bucket).length;
          cumulative = count;
          lines.push(`${histogram.name}_bucket{${labels}le="${bucket}"} ${cumulative}`);
        }
        lines.push(`${histogram.name}_bucket{${labels}le="+Inf"} ${observations.length}`);
        lines.push(`${histogram.name}_sum${this.keyToLabels(labelKey)} ${sum}`);
        lines.push(`${histogram.name}_count${this.keyToLabels(labelKey)} ${observations.length}`);
      }
    }

    return lines.join('\n');
  }
}

// ==================== Global Registry Instance ====================

const registry = new MetricsRegistry();

// ==================== Register Metrics ====================

// Ticket counters
registry.registerCounter('servicedesk_tickets_created_total', 'Total number of tickets created');
registry.registerCounter('servicedesk_tickets_resolved_total', 'Total number of tickets resolved');
registry.registerCounter('servicedesk_tickets_closed_total', 'Total number of tickets closed');
registry.registerCounter('servicedesk_tickets_sla_breached_total', 'Total number of SLA breaches');

// Auth counters
registry.registerCounter('servicedesk_login_attempts_total', 'Total login attempts');
registry.registerCounter('servicedesk_password_changes_total', 'Total password changes');

// API counters
registry.registerCounter('servicedesk_http_requests_total', 'Total HTTP requests');
registry.registerCounter('servicedesk_http_errors_total', 'Total HTTP errors');

// Omni integration counters
registry.registerCounter('servicedesk_omni_tickets_sent_total', 'Total tickets sent to Omni');
registry.registerCounter('servicedesk_omni_tickets_failed_total', 'Total failed Omni ticket sends');
registry.registerCounter('servicedesk_omni_status_updates_total', 'Total Omni status updates');

// Request duration histogram (in seconds)
registry.registerHistogram(
  'servicedesk_http_request_duration_seconds',
  'HTTP request duration in seconds',
  [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
);

// Ticket resolution time histogram (in hours)
registry.registerHistogram(
  'servicedesk_ticket_resolution_hours',
  'Ticket resolution time in hours',
  [1, 4, 8, 24, 48, 72, 168, 336] // 1h, 4h, 8h, 1d, 2d, 3d, 1w, 2w
);

// ==================== Register Gauges (Database-backed) ====================

// Active tickets by status
registry.registerGauge('servicedesk_tickets_active', 'Number of active tickets by status', async () => {
  const results = await prisma.ticket.groupBy({
    by: ['status'],
    _count: true,
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'PENDING'] },
    },
  });

  const map = new Map<string, number>();
  for (const result of results) {
    map.set(`status="${result.status}"`, result._count);
  }
  return map;
});

// Tickets by priority
registry.registerGauge('servicedesk_tickets_by_priority', 'Number of active tickets by priority', async () => {
  const results = await prisma.ticket.groupBy({
    by: ['priority'],
    _count: true,
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'PENDING'] },
    },
  });

  const map = new Map<string, number>();
  for (const result of results) {
    map.set(`priority="${result.priority}"`, result._count);
  }
  return map;
});

// Total users by role
registry.registerGauge('servicedesk_users_total', 'Total users by role', async () => {
  const results = await prisma.user.groupBy({
    by: ['role'],
    _count: true,
    where: { isActive: true },
  });

  const map = new Map<string, number>();
  for (const result of results) {
    map.set(`role="${result.role}"`, result._count);
  }
  return map;
});

// Pending approvals
registry.registerGauge('servicedesk_pending_approvals', 'Number of pending approvals', async () => {
  const count = await prisma.approval.count({
    where: { status: 'PENDING' },
  });
  return count;
});

// ATM status
registry.registerGauge('servicedesk_atm_status', 'ATM status counts', async () => {
  const results = await prisma.aTM.groupBy({
    by: ['status'],
    _count: true,
    where: { isActive: true },
  });

  const map = new Map<string, number>();
  for (const result of results) {
    map.set(`status="${result.status}"`, result._count);
  }
  return map;
});

// ==================== Metrics Helper Functions ====================

export const metrics = {
  // Ticket metrics
  ticketCreated: (priority: string, serviceCategory?: string) => {
    registry.incrementCounter('servicedesk_tickets_created_total', {
      priority,
      ...(serviceCategory && { service_category: serviceCategory }),
    });
  },

  ticketResolved: (priority: string, resolutionTimeHours?: number) => {
    registry.incrementCounter('servicedesk_tickets_resolved_total', { priority });
    if (resolutionTimeHours !== undefined) {
      registry.observeHistogram('servicedesk_ticket_resolution_hours', { priority }, resolutionTimeHours);
    }
  },

  ticketClosed: (priority: string) => {
    registry.incrementCounter('servicedesk_tickets_closed_total', { priority });
  },

  slaBreach: (type: 'response' | 'resolution', priority: string) => {
    registry.incrementCounter('servicedesk_tickets_sla_breached_total', { type, priority });
  },

  // Auth metrics
  loginAttempt: (success: boolean, reason?: string) => {
    registry.incrementCounter('servicedesk_login_attempts_total', {
      status: success ? 'success' : 'failure',
      ...(reason && { reason }),
    });
  },

  passwordChange: (userId: string) => {
    registry.incrementCounter('servicedesk_password_changes_total', {});
  },

  // API metrics
  httpRequest: (method: string, path: string, statusCode: number, durationSeconds: number) => {
    const pathLabel = normalizePathForMetrics(path);
    registry.incrementCounter('servicedesk_http_requests_total', {
      method,
      path: pathLabel,
      status: statusCode.toString(),
    });

    if (statusCode >= 400) {
      registry.incrementCounter('servicedesk_http_errors_total', {
        method,
        path: pathLabel,
        status: statusCode.toString(),
      });
    }

    registry.observeHistogram('servicedesk_http_request_duration_seconds', {
      method,
      path: pathLabel,
    }, durationSeconds);
  },

  // Omni metrics
  omniTicketSent: (success: boolean) => {
    if (success) {
      registry.incrementCounter('servicedesk_omni_tickets_sent_total', {});
    } else {
      registry.incrementCounter('servicedesk_omni_tickets_failed_total', {});
    }
  },

  omniStatusUpdate: (success: boolean) => {
    registry.incrementCounter('servicedesk_omni_status_updates_total', {
      status: success ? 'success' : 'failure',
    });
  },

  // Export metrics
  export: async (): Promise<string> => {
    return registry.exportPrometheusFormat();
  },
};

// Normalize API paths for metrics (remove IDs to reduce cardinality)
function normalizePathForMetrics(path: string): string {
  // Remove query strings
  const pathOnly = path.split('?')[0];

  // Replace UUIDs with {id}
  let normalized = pathOnly.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{id}');

  // Replace numeric IDs with {id}
  normalized = normalized.replace(/\/\d+($|\/)/g, '/{id}$1');

  // Replace cm-style IDs (Prisma cuid) with {id}
  normalized = normalized.replace(/\/cm[a-z0-9]{20,}/gi, '/{id}');

  return normalized;
}

export { registry, MetricsRegistry };
