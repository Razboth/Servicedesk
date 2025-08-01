'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, AlertTriangle, XCircle, FileText, Paperclip, Users, Settings } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  description?: string;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  description?: string;
  items: Item[];
}

interface Item {
  id: string;
  name: string;
  description?: string;
}

const TICKET_CATEGORIES = [
  {
    value: 'INCIDENT',
    label: 'Incident',
    description: 'Unplanned interruption or reduction in quality of service',
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'bg-red-100 text-red-800 border-red-200',
    examples: ['System outage', 'Application error', 'Service unavailable']
  },
  {
    value: 'SERVICE_REQUEST',
    label: 'Service Request',
    description: 'Request for information, advice, or standard change',
    icon: <Users className="h-5 w-5" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    examples: ['New user account', 'Software installation', 'Access request']
  },
  {
    value: 'CHANGE_REQUEST',
    label: 'Change Request',
    description: 'Request to add, modify, or remove service components',
    icon: <Settings className="h-5 w-5" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    examples: ['System upgrade', 'Configuration change', 'New feature deployment']
  },
  {
    value: 'EVENT_REQUEST',
    label: 'Event Request',
    description: 'Automated system-generated request',
    icon: <Clock className="h-5 w-5" />,
    color: 'bg-green-100 text-green-800 border-green-200',
    examples: ['Automated monitoring alert', 'Scheduled maintenance', 'System notification']
  },
];

const ISSUE_CLASSIFICATIONS = [
  {
    value: 'HUMAN_ERROR',
    label: 'Human Error',
    description: 'Wrong password entered, Incorrect data input, Deleted files accidentally',
    color: 'bg-orange-100 text-orange-800'
  },
  {
    value: 'SYSTEM_ERROR',
    label: 'System Error',
    description: 'Application crash, Service timeout, Database connection failure',
    color: 'bg-red-100 text-red-800'
  },
  {
    value: 'HARDWARE_FAILURE',
    label: 'Hardware Failure',
    description: 'Hard disk failure, Power supply damage, Card reader jam',
    color: 'bg-gray-100 text-gray-800'
  },
  {
    value: 'NETWORK_ISSUE',
    label: 'Network Issue',
    description: 'Connection timeout, Slow response, DNS failure',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    value: 'SECURITY_INCIDENT',
    label: 'Security Incident',
    description: 'Suspicious login, Malware detection, Unauthorized access attempt',
    color: 'bg-red-100 text-red-800'
  },
  {
    value: 'DATA_ISSUE',
    label: 'Data Issue',
    description: 'Data corruption, Missing records, Synchronization failure',
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    value: 'PROCESS_GAP',
    label: 'Process Gap',
    description: 'Missing SOP, Unclear instructions, Workflow bottleneck',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    value: 'EXTERNAL_FACTOR',
    label: 'External Factor',
    description: 'ISP outage, Vendor system down, Power failure',
    color: 'bg-indigo-100 text-indigo-800'
  },
];

const SLA_EXAMPLES = [
  {
    category: 'Critical Incident',
    response: '15 minutes',
    resolution: '4 hours',
    escalation: '1 hour',
    description: 'System-wide outages affecting all users'
  },
  {
    category: 'High Priority Service Request',
    response: '2 hours',
    resolution: '24 hours',
    escalation: '8 hours',
    description: 'Urgent business requirements'
  },
  {
    category: 'Standard Change Request',
    response: '1 business day',
    resolution: '5 business days',
    escalation: '2 business days',
    description: 'Routine system modifications'
  },
  {
    category: 'Low Priority Event',
    response: '4 hours',
    resolution: '72 hours',
    escalation: '24 hours',
    description: 'Monitoring alerts and notifications'
  },
];

export default function ITILFeaturesDemo() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/tier-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">ITIL-Based Service Desk Features</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Comprehensive demonstration of ITIL-compliant ticket management system with enhanced categorization, 
            issue classification, SLA management, and attachment capabilities.
          </p>
          <div className="flex gap-4">
            <Link href="/tickets">
              <Button size="lg">
                <FileText className="mr-2 h-5 w-5" />
                View All Tickets
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="categories">ITIL Categories</TabsTrigger>
            <TabsTrigger value="classifications">Issue Classifications</TabsTrigger>
            <TabsTrigger value="hierarchy">3-Tier Structure</TabsTrigger>
            <TabsTrigger value="sla">SLA Management</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  ITIL-Based Ticket Categories
                </CardTitle>
                <CardDescription>
                  Four main categories following ITIL best practices for service management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {TICKET_CATEGORIES.map((category) => (
                    <Card key={category.value} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${category.color}`}>
                              {category.icon}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{category.label}</CardTitle>
                            </div>
                          </div>
                          <Badge className={category.color}>{category.value}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {category.description}
                        </p>
                        <div>
                          <h4 className="font-medium mb-2">Examples:</h4>
                          <ul className="text-sm space-y-1">
                            {category.examples.map((example, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                {example}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Issue Classifications
                </CardTitle>
                <CardDescription>
                  Detailed classification system for root cause analysis and resolution tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ISSUE_CLASSIFICATIONS.map((classification) => (
                    <Card key={classification.value} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{classification.label}</CardTitle>
                          <Badge className={classification.color} variant="secondary">
                            {classification.value.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {classification.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hierarchy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  3-Tier Categorization Structure
                </CardTitle>
                <CardDescription>
                  Hierarchical categorization: Category → Subcategory → Item for precise ticket classification
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading categories...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {categories.map((category) => (
                      <Card key={category.id} className="border">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2">
                            <Badge variant="outline">Tier 1</Badge>
                            {category.name}
                          </CardTitle>
                          {category.description && (
                            <CardDescription>{category.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {category.subcategories.map((subcategory) => (
                              <div key={subcategory.id} className="border-l-2 border-gray-200 pl-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary" className="text-xs">Tier 2</Badge>
                                  <span className="font-medium">{subcategory.name}</span>
                                </div>
                                {subcategory.items.length > 0 && (
                                  <div className="ml-4 space-y-1">
                                    {subcategory.items.map((item) => (
                                      <div key={item.id} className="flex items-center gap-2 text-sm">
                                        <Badge variant="outline" className="text-xs">Tier 3</Badge>
                                        <span className="text-muted-foreground">{item.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sla" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  SLA Management
                </CardTitle>
                <CardDescription>
                  Service Level Agreement templates with response, resolution, and escalation times
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {SLA_EXAMPLES.map((sla, index) => (
                    <Card key={index} className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{sla.category}</CardTitle>
                        <CardDescription>{sla.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{sla.response}</div>
                            <div className="text-sm text-muted-foreground">Response Time</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{sla.resolution}</div>
                            <div className="text-sm text-muted-foreground">Resolution Time</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{sla.escalation}</div>
                            <div className="text-sm text-muted-foreground">Escalation Time</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Attachment Support
                </CardTitle>
                <CardDescription>
                  File attachment capabilities for tickets and comments with comprehensive file type support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Paperclip className="h-5 w-5" />
                        Ticket Attachments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Multiple file upload support
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          10MB file size limit per file
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Support for documents, images, PDFs
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Secure file storage and access
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          File preview and download
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Paperclip className="h-5 w-5" />
                        Comment Attachments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Attach files to comments
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Support for follow-up documentation
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Screenshots and logs
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Resolution evidence
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Internal and external attachments
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Supported File Types</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="font-medium">Documents</div>
                      <div className="text-sm text-muted-foreground">PDF, DOC, DOCX, TXT</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="h-8 w-8 mx-auto mb-2 bg-green-100 rounded flex items-center justify-center">
                        <span className="text-green-600 font-bold text-sm">IMG</span>
                      </div>
                      <div className="font-medium">Images</div>
                      <div className="text-sm text-muted-foreground">PNG, JPG, JPEG, GIF</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="h-8 w-8 mx-auto mb-2 bg-orange-100 rounded flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-sm">ZIP</span>
                      </div>
                      <div className="font-medium">Archives</div>
                      <div className="text-sm text-muted-foreground">ZIP, RAR, 7Z</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="h-8 w-8 mx-auto mb-2 bg-purple-100 rounded flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-sm">LOG</span>
                      </div>
                      <div className="font-medium">Logs</div>
                      <div className="text-sm text-muted-foreground">LOG, CSV, JSON</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Implementation Summary</CardTitle>
            <CardDescription>
              All requested ITIL-based features have been successfully implemented
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium">ITIL Categories</div>
                  <div className="text-sm text-muted-foreground">4 main categories</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium">Issue Classifications</div>
                  <div className="text-sm text-muted-foreground">8 classifications</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium">3-Tier Structure</div>
                  <div className="text-sm text-muted-foreground">Hierarchical categories</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium">Attachments</div>
                  <div className="text-sm text-muted-foreground">Tickets & comments</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}