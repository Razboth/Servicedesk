'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TicketListEnhanced } from '@/components/tickets/ticket-list-enhanced';
import { TicketForm } from '@/components/tickets/ticket-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  category: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}



export default function TicketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'list' | 'create'>('list');

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'list' ? (
          <TicketListEnhanced
            onCreateTicket={() => setCurrentView('create')}
            onViewTicket={(ticketId) => {
              router.push(`/tickets/${ticketId}`);
            }}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentView('list')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Tickets
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">Create New Ticket</h1>
            </div>
            
            <TicketForm
              onSuccess={() => setCurrentView('list')}
              onCancel={() => setCurrentView('list')}
            />
          </div>
        )}
      </main>
    </div>
  );
}