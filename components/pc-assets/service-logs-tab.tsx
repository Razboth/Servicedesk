'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Wrench, Plus, Calendar, User, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import Link from 'next/link';

interface ServiceLog {
  id: string;
  serviceType: string;
  description: string;
  findings: string | null;
  recommendations: string | null;
  performedAt: string;
  performedBy: {
    id: string;
    name: string;
    email: string;
  };
  ticket: {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
  } | null;
}

interface ServiceLogsTabProps {
  assetId: string;
  assetName: string;
  serviceLogs: ServiceLog[];
  onRefresh: () => void;
}

const SERVICE_TYPES = [
  { value: 'INSTALLATION', label: 'Installation' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'REPAIR', label: 'Repair' },
  { value: 'UPGRADE', label: 'Upgrade' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'SOFTWARE_UPDATE', label: 'Software Update' },
  { value: 'HARDWARE_REPLACEMENT', label: 'Hardware Replacement' },
  { value: 'TROUBLESHOOTING', label: 'Troubleshooting' },
  { value: 'OTHER', label: 'Other' }
];

export function ServiceLogsTab({ assetId, assetName, serviceLogs, onRefresh }: ServiceLogsTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    serviceType: '',
    description: '',
    findings: '',
    recommendations: '',
    performedAt: new Date().toISOString().slice(0, 16)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.serviceType || !formData.description) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/pc-assets/${assetId}/service-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          performedAt: new Date(formData.performedAt).toISOString()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add service log');
      }

      toast.success('Service log added successfully');
      setIsDialogOpen(false);
      setFormData({
        serviceType: '',
        description: '',
        findings: '',
        recommendations: '',
        performedAt: new Date().toISOString().slice(0, 16)
      });
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add service log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getServiceTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      INSTALLATION: 'bg-green-100 text-green-800',
      MAINTENANCE: 'bg-blue-100 text-blue-800',
      REPAIR: 'bg-red-100 text-red-800',
      UPGRADE: 'bg-purple-100 text-purple-800',
      INSPECTION: 'bg-yellow-100 text-yellow-800',
      CLEANING: 'bg-cyan-100 text-cyan-800',
      SOFTWARE_UPDATE: 'bg-indigo-100 text-indigo-800',
      HARDWARE_REPLACEMENT: 'bg-orange-100 text-orange-800',
      TROUBLESHOOTING: 'bg-pink-100 text-pink-800',
      OTHER: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={colors[type] || colors.OTHER}>
        {SERVICE_TYPES.find(t => t.value === type)?.label || type}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service History
              </CardTitle>
              <CardDescription>
                Service and maintenance records for {assetName}
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Log
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Service Log</DialogTitle>
                  <DialogDescription>
                    Record a new service entry for {assetName}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="serviceType">Service Type *</Label>
                      <Select
                        value={formData.serviceType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, serviceType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="performedAt">Date & Time *</Label>
                      <Input
                        id="performedAt"
                        type="datetime-local"
                        value={formData.performedAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, performedAt: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the service performed..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="findings">Findings</Label>
                      <Textarea
                        id="findings"
                        placeholder="Any issues or observations found..."
                        value={formData.findings}
                        onChange={(e) => setFormData(prev => ({ ...prev, findings: e.target.value }))}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recommendations">Recommendations</Label>
                      <Textarea
                        id="recommendations"
                        placeholder="Recommended follow-up actions..."
                        value={formData.recommendations}
                        onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save Log'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {serviceLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No service logs recorded yet</p>
              <p className="text-sm">Click "Add Service Log" to create the first entry</p>
            </div>
          ) : (
            <div className="space-y-4">
              {serviceLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getServiceTypeBadge(log.serviceType)}
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(log.performedAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                      </div>
                    </div>
                    {log.ticket && (
                      <Link
                        href={`/tickets/${log.ticket.id}`}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="h-4 w-4" />
                        {log.ticket.ticketNumber}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>

                  <p className="text-gray-900 mb-2">{log.description}</p>

                  {log.findings && (
                    <div className="text-sm mb-2">
                      <span className="font-medium text-gray-700">Findings: </span>
                      <span className="text-gray-600">{log.findings}</span>
                    </div>
                  )}

                  {log.recommendations && (
                    <div className="text-sm mb-2">
                      <span className="font-medium text-gray-700">Recommendations: </span>
                      <span className="text-gray-600">{log.recommendations}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-3 pt-3 border-t">
                    <User className="h-4 w-4" />
                    <span>Performed by: {log.performedBy.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ServiceLogsTab;
