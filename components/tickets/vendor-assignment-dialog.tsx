'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Building2, Hash, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Vendor {
  id: string;
  name: string;
  code: string;
  contactEmail?: string;
  contactPhone?: string;
  supportHours?: string;
  isActive: boolean;
}

interface VendorAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumber: string;
  onAssign: (data: {
    vendorId: string;
    vendorTicketNumber: string;
    vendorNotes?: string;
    reason?: string;
  }) => Promise<void>;
}

export function VendorAssignmentDialog({
  open,
  onOpenChange,
  ticketId,
  ticketNumber,
  onAssign
}: VendorAssignmentDialogProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorTicketNumber, setVendorTicketNumber] = useState('');
  const [vendorNotes, setVendorNotes] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      fetchVendors();
    }
  }, [open]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendors?active=true');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      } else {
        setError('Failed to load vendors');
      }
    } catch (err) {
      setError('Failed to load vendors');
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVendorId || !vendorTicketNumber) {
      setError('Please select a vendor and enter a vendor ticket number');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await onAssign({
        vendorId: selectedVendorId,
        vendorTicketNumber,
        vendorNotes,
        reason
      });

      // Reset form
      setSelectedVendorId('');
      setVendorTicketNumber('');
      setVendorNotes('');
      setReason('');
      onOpenChange(false);
    } catch (err) {
      setError('Failed to assign vendor');
      console.error('Error assigning vendor:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            Assign Ticket to Vendor
          </DialogTitle>
          <DialogDescription>
            Assign ticket #{ticketNumber} to a vendor for external support.
            The ticket status will be updated to "Pending Vendor".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Vendor Selection */}
          <div className="space-y-2">
            <Label htmlFor="vendor">
              Vendor <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={selectedVendorId} 
              onValueChange={setSelectedVendorId}
              disabled={loading || submitting}
            >
              <SelectTrigger id="vendor" className="w-full">
                <SelectValue placeholder={loading ? "Loading vendors..." : "Select a vendor"} />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{vendor.name}</span>
                      <span className="text-xs text-gray-500">({vendor.code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedVendor && (
              <div className="text-xs text-gray-600 space-y-1 p-2 bg-gray-50 rounded">
                {selectedVendor.contactEmail && (
                  <div>Email: {selectedVendor.contactEmail}</div>
                )}
                {selectedVendor.contactPhone && (
                  <div>Phone: {selectedVendor.contactPhone}</div>
                )}
                {selectedVendor.supportHours && (
                  <div>Support Hours: {selectedVendor.supportHours}</div>
                )}
              </div>
            )}
          </div>

          {/* Vendor Ticket Number */}
          <div className="space-y-2">
            <Label htmlFor="vendorTicketNumber">
              Vendor Ticket Number <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="vendorTicketNumber"
                value={vendorTicketNumber}
                onChange={(e) => setVendorTicketNumber(e.target.value)}
                placeholder="Enter vendor's ticket number"
                className="pl-10"
                disabled={submitting}
              />
            </div>
            <p className="text-xs text-gray-500">
              The ticket number provided by the vendor for tracking this issue
            </p>
          </div>

          {/* Vendor Notes */}
          <div className="space-y-2">
            <Label htmlFor="vendorNotes">
              Notes for Vendor (Optional)
            </Label>
            <Textarea
              id="vendorNotes"
              value={vendorNotes}
              onChange={(e) => setVendorNotes(e.target.value)}
              placeholder="Any specific instructions or notes for the vendor..."
              rows={3}
              disabled={submitting}
            />
          </div>

          {/* Reason for Assignment */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Vendor Assignment (Optional)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this ticket being assigned to a vendor..."
              rows={2}
              disabled={submitting}
            />
          </div>

          {/* Preview Message */}
          {selectedVendor && vendorTicketNumber && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded">
              <div className="text-sm font-medium text-amber-800 mb-1">
                Automatic Comment Preview:
              </div>
              <div className="text-sm text-amber-700">
                Telah di Follow Up ke {selectedVendor.name} dengan Ticket {vendorTicketNumber}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedVendorId || !vendorTicketNumber}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Assigning...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 mr-2" />
                Assign to Vendor
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}