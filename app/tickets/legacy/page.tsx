import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LegacyTicketsDataTable } from '@/components/legacy-tickets/data-table/legacy-tickets-data-table';
import { columns } from '@/components/legacy-tickets/data-table/columns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Archive, AlertCircle } from 'lucide-react';

export default async function LegacyTicketsPage() {
  const session = await auth();
  
  // Check if user is authenticated and has appropriate role
  if (!session || !['TECHNICIAN', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    redirect('/auth/signin');
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Archive className="h-6 w-6 text-blue-600" />
            <h1 className="text-3xl font-bold tracking-tight">Legacy Tickets</h1>
          </div>
          <p className="text-muted-foreground">
            View and manage tickets imported from legacy systems like ManageEngine
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Technician Access
          </Badge>
        </div>
      </div>

      {/* Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">About Legacy Tickets</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-blue-800">
          <p className="mb-3">
            Legacy tickets are imported from external systems (such as ManageEngine ServiceDesk Plus) 
            and are stored separately from regular tickets in the system.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
              These tickets maintain their original data and structure from the source system
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
              Legacy tickets can be converted to regular tickets for continued processing
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
              Comments and attachments from the original system are preserved
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
              Search and filter by original system, status, priority, and conversion status
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Data Table */}
      <LegacyTicketsDataTable columns={columns} />
    </div>
  );
}