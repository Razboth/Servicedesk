'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, User, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';

interface ChecklistResult {
  id: string;
  status: string;
  notes: string | null;
  checklistItem: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    isRequired: boolean;
  };
}

interface HardeningChecklist {
  id: string;
  status: string;
  complianceScore: number | null;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  template: {
    id: string;
    name: string;
    description: string | null;
  };
  performedBy: {
    id: string;
    name: string;
  };
  checklistResults: ChecklistResult[];
}

interface HardeningTabProps {
  assetId: string;
  assetName: string;
  hardeningChecklists: HardeningChecklist[];
  onRefresh: () => void;
}

export function HardeningTab({ assetId, assetName, hardeningChecklists, onRefresh }: HardeningTabProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getResultIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'SKIPPED':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Group results by category
  const groupResultsByCategory = (results: ChecklistResult[]) => {
    return results.reduce((acc, result) => {
      const category = result.checklistItem.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      return acc;
    }, {} as Record<string, ChecklistResult[]>);
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Hardening Status
          </CardTitle>
          <CardDescription>
            Security hardening checklists for {assetName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hardeningChecklists.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hardening checklists recorded yet</p>
              <p className="text-sm mb-4">Create a hardening checklist from the Hardening Templates page</p>
              <Link href="/admin/pc-assets/hardening-templates">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Templates
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {hardeningChecklists.map((checklist, index) => (
                <div key={checklist.id} className="border rounded-lg overflow-hidden">
                  {/* Checklist Header */}
                  <div className="bg-gray-50 p-4 border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{checklist.template.name}</h3>
                          {getStatusBadge(checklist.status)}
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">Latest</Badge>
                          )}
                        </div>
                        {checklist.template.description && (
                          <p className="text-sm text-gray-600 mb-2">{checklist.template.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Started: {format(new Date(checklist.startedAt), 'dd MMM yyyy', { locale: id })}
                          </div>
                          {checklist.completedAt && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Completed: {format(new Date(checklist.completedAt), 'dd MMM yyyy', { locale: id })}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {checklist.performedBy.name}
                          </div>
                        </div>
                      </div>

                      {/* Compliance Score */}
                      {checklist.complianceScore !== null && (
                        <div className="text-right">
                          <div className={`text-3xl font-bold ${getComplianceColor(checklist.complianceScore)}`}>
                            {checklist.complianceScore}%
                          </div>
                          <div className="text-sm text-gray-500">Compliance Score</div>
                          <div className="w-24 mt-2">
                            <Progress
                              value={checklist.complianceScore}
                              className="h-2"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {checklist.notes && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <span className="font-medium text-sm">Notes: </span>
                        <span className="text-sm text-gray-600">{checklist.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Checklist Results */}
                  {checklist.checklistResults.length > 0 && (
                    <div className="p-4">
                      <Accordion type="multiple" className="space-y-2">
                        {Object.entries(groupResultsByCategory(checklist.checklistResults)).map(([category, results]) => (
                          <AccordionItem key={category} value={category} className="border rounded-lg">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{category}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {results.filter(r => r.status === 'PASSED').length}/{results.length} passed
                                  </Badge>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="space-y-2">
                                {results.map((result) => (
                                  <div
                                    key={result.id}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                                  >
                                    {getResultIcon(result.status)}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{result.checklistItem.title}</span>
                                        {result.checklistItem.isRequired && (
                                          <Badge variant="destructive" className="text-xs">Required</Badge>
                                        )}
                                      </div>
                                      {result.checklistItem.description && (
                                        <p className="text-sm text-gray-600 mt-1">
                                          {result.checklistItem.description}
                                        </p>
                                      )}
                                      {result.notes && (
                                        <p className="text-sm text-gray-500 mt-1 italic">
                                          Note: {result.notes}
                                        </p>
                                      )}
                                    </div>
                                    <Badge
                                      className={
                                        result.status === 'PASSED'
                                          ? 'bg-green-100 text-green-800'
                                          : result.status === 'FAILED'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }
                                    >
                                      {result.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default HardeningTab;
