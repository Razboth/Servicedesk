'use client';

import { PageHeader } from '@/components/ui/page-header';
import { ServiceStatusBreakdownReport } from '@/components/reports/service-status-breakdown';
import { Layers } from 'lucide-react';

export default function ServiceStatusBreakdownPage() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Service Status Breakdown Report"
        description="View ticket status counts by service and category with comprehensive totals"
        icon={<Layers className="h-6 w-6" />}
      />

      <div className="mt-6">
        <ServiceStatusBreakdownReport />
      </div>
    </div>
  );
}