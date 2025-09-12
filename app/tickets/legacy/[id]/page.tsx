import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Archive, 
  Calendar, 
  User, 
  Building, 
  Settings, 
  MessageSquare, 
  Paperclip,
  ExternalLink,
  GitBranch
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';

const prisma = new PrismaClient();

interface LegacyTicketPageProps {
  params: {
    id: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'PENDING':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority.toUpperCase()) {
    case 'CRITICAL':
    case 'EMERGENCY':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'LOW':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getSystemColor = (system: string) => {
  switch (system.toUpperCase()) {
    case 'MANAGEENGINE':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'SERVICENOW':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default async function LegacyTicketPage({ params }: LegacyTicketPageProps) {
  const session = await auth();
  
  // Check if user is authenticated and has appropriate role
  if (!session || !['TECHNICIAN', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    redirect('/auth/signin');
  }

  // Fetch legacy ticket
  const legacyTicket = await prisma.legacyTicket.findUnique({
    where: { id: params.id },
    include: {
      service: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true
        }
      },
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          city: true
        }
      },
      supportGroup: {
        select: {
          id: true,
          name: true,
          description: true
        }
      },
      mappedToTicket: {
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          createdAt: true
        }
      },
      convertedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true
        }
      },
      migrationBatch: {
        select: {
          id: true,
          source: true,
          status: true,
          createdAt: true,
          completedAt: true
        }
      },
      comments: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!legacyTicket) {
    notFound();
  }

  // Extract attachment info from original data
  const attachments = legacyTicket.originalData?.attachments || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/tickets/legacy" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Legacy Tickets
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Archive className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">{legacyTicket.ticketNumber}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getSystemColor(legacyTicket.originalSystem)}>
            {legacyTicket.originalSystem}
          </Badge>
          {legacyTicket.isConverted && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Converted
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-xl">{legacyTicket.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(legacyTicket.status)}>
                      {legacyTicket.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(legacyTicket.priority)}>
                      {legacyTicket.priority}
                    </Badge>
                    <Badge variant="outline">
                      {legacyTicket.category}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Original ID: {legacyTicket.originalTicketId}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <div className="bg-gray-50 rounded-md p-4 text-sm whitespace-pre-wrap">
                    {legacyTicket.description || 'No description available'}
                  </div>
                </div>

                {legacyTicket.resolutionNotes && (
                  <div>
                    <h4 className="font-medium mb-2">Resolution Notes</h4>
                    <div className="bg-green-50 rounded-md p-4 text-sm whitespace-pre-wrap">
                      {legacyTicket.resolutionNotes}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({legacyTicket.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {legacyTicket.comments.length > 0 ? (
                <div className="space-y-4">
                  {legacyTicket.comments.map((comment, index) => (
                    <div key={comment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comment.originalAuthor || 'Unknown User'}</span>
                          {comment.isInternal && (
                            <Badge variant="secondary" className="text-xs">Internal</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {comment.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No comments available</p>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments ({attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attachments.map((attachment: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{attachment.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {attachment.size && `${Math.round(attachment.size / 1024)} KB`}
                            {attachment.content_type && ` • ${attachment.content_type}`}
                          </div>
                        </div>
                      </div>
                      {attachment.manageEngineUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={attachment.manageEngineUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Created</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(legacyTicket.createdAt), 'PPp')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(legacyTicket.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Imported</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(legacyTicket.importedAt), 'PPp')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(legacyTicket.importedAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                {legacyTicket.resolvedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Resolved</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(legacyTicket.resolvedAt), 'PPp')}
                      </div>
                    </div>
                  </div>
                )}

                {legacyTicket.closedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Closed</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(legacyTicket.closedAt), 'PPp')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* People */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">People</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Requester</div>
                    {legacyTicket.createdBy ? (
                      <div>
                        <div className="text-sm">{legacyTicket.createdBy.name}</div>
                        <div className="text-xs text-muted-foreground">{legacyTicket.createdBy.email}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Unknown</div>
                    )}
                  </div>
                </div>

                {legacyTicket.assignedTo && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Assigned To</div>
                      <div className="text-sm">{legacyTicket.assignedTo.name}</div>
                      <div className="text-xs text-muted-foreground">{legacyTicket.assignedTo.email}</div>
                    </div>
                  </div>
                )}

                {legacyTicket.convertedBy && (
                  <div className="flex items-start gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Converted By</div>
                      <div className="text-sm">{legacyTicket.convertedBy.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {legacyTicket.convertedAt && format(new Date(legacyTicket.convertedAt), 'PPp')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {legacyTicket.branch && (
                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Branch</div>
                    <div className="text-sm">{legacyTicket.branch.name}</div>
                    <div className="text-xs text-muted-foreground">{legacyTicket.branch.code}</div>
                  </div>
                </div>
              )}

              {legacyTicket.service && (
                <div className="flex items-start gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Service</div>
                    <div className="text-sm">{legacyTicket.service.name}</div>
                  </div>
                </div>
              )}

              {legacyTicket.supportGroup && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Support Group</div>
                    <div className="text-sm">{legacyTicket.supportGroup.name}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversion Status */}
          {legacyTicket.mappedToTicket && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-base text-green-800 flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Converted Ticket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-green-800">Ticket Number</div>
                    <Button variant="outline" asChild size="sm" className="mt-1">
                      <Link href={`/tickets/${legacyTicket.mappedToTicket.id}`} className="flex items-center gap-2">
                        {legacyTicket.mappedToTicket.ticketNumber}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-green-800">Title</div>
                    <div className="text-sm text-green-700">{legacyTicket.mappedToTicket.title}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}