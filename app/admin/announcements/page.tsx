'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  Bell,
  Power,
  Calendar,
  Users,
  Image as ImageIcon
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content?: string;
  type: 'GENERAL' | 'MAINTENANCE' | 'UPDATE' | 'ALERT' | 'PROMOTION';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  images: any[];
  _count: {
    views: number;
  };
}

const typeIcons = {
  GENERAL: Info,
  MAINTENANCE: AlertTriangle,
  ALERT: AlertCircle,
  UPDATE: Info,
  PROMOTION: Bell
};

const typeColors = {
  GENERAL: 'bg-blue-500 text-white',
  MAINTENANCE: 'bg-amber-500 text-white',
  ALERT: 'bg-red-500 text-white',
  UPDATE: 'bg-green-500 text-white',
  PROMOTION: 'bg-purple-500 text-white'
};

const priorityColors = {
  LOW: 'bg-gray-500 text-white dark:bg-gray-600',
  NORMAL: 'bg-blue-500 text-white dark:bg-blue-600',
  HIGH: 'bg-orange-500 text-white dark:bg-orange-600',
  URGENT: 'bg-red-500 text-white dark:bg-red-600'
};

export default function AnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'upcoming'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/announcements?admin=true');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data);
      } else {
        toast.error('Failed to fetch announcements');
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/announcements/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Announcement deleted successfully');
        fetchAnnouncements();
      } else {
        toast.error('Failed to delete announcement');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        toast.success(`Announcement ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchAnnouncements();
      } else {
        toast.error('Failed to update announcement status');
      }
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to update announcement status',
        variant: 'destructive',
      });
    }
  };

  const getStatus = (announcement: Announcement) => {
    const now = new Date();
    const start = new Date(announcement.startDate);
    const end = new Date(announcement.endDate);

    if (!announcement.isActive) return 'inactive';
    if (now < start) return 'upcoming';
    if (now > end) return 'expired';
    return 'active';
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.content?.toLowerCase().includes(searchTerm.toLowerCase());

    const status = getStatus(announcement);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    const matchesType = typeFilter === 'all' || announcement.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Announcement Management"
        description="Create and manage system-wide announcements"
        action={
          <Button onClick={() => router.push('/admin/announcements/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search announcements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="ALERT">Alert</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="PROMOTION">Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={fetchAnnouncements}>
                <Filter className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading announcements...
                  </TableCell>
                </TableRow>
              ) : filteredAnnouncements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No announcements found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnnouncements.map((announcement) => {
                  const Icon = typeIcons[announcement.type];
                  const status = getStatus(announcement);

                  return (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            status === 'active' ? 'bg-green-500 text-white border-green-600' :
                            status === 'upcoming' ? 'bg-blue-500 text-white border-blue-600' :
                            status === 'expired' ? 'bg-gray-500 text-white border-gray-600' :
                            'bg-red-500 text-white border-red-600'
                          }
                        >
                          {status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {announcement.images.length > 0 && (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{announcement.title}</p>
                            {announcement.content && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {announcement.content}
                              </p>
                            )}
                            {announcement.isGlobal ? (
                              <Badge variant="secondary" className="mt-1 text-xs bg-brown-100 text-brown-700 dark:bg-brown-800 dark:text-brown-200">
                                <Users className="h-3 w-3 mr-1" />
                                All Branches
                              </Badge>
                            ) : announcement.branches?.length > 0 ? (
                              <Badge variant="secondary" className="mt-1 text-xs bg-brown-100 text-brown-700 dark:bg-brown-800 dark:text-brown-200">
                                <Users className="h-3 w-3 mr-1" />
                                {announcement.branches.length} Branch{announcement.branches.length > 1 ? 'es' : ''}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={cn('gap-1', typeColors[announcement.type])}>
                            <Icon className="h-3 w-3" />
                            <span className="text-xs font-medium">{announcement.type}</span>
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('font-medium', priorityColors[announcement.priority])}>
                          {announcement.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(announcement.startDate), 'MMM dd, yyyy')}</p>
                          <p className="text-muted-foreground">
                            to {format(new Date(announcement.endDate), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{announcement._count.views}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{announcement.creator.name}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleActive(announcement.id, announcement.isActive)}
                          >
                            <Power className={`h-4 w-4 ${announcement.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/admin/announcements/${announcement.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteId(announcement.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}