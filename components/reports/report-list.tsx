'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UnifiedExport } from './unified-export';
import { 
  Search, 
  Filter,
  Download,
  Sparkles,
  Clock,
  Calendar,
  FileText,
  Star,
  Layout
} from 'lucide-react';

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: any;
  category: string;
  roles: string[];
  badge?: string;
  lastUpdated?: string;
  type?: 'standard' | 'custom' | 'template';
  isFavorite?: boolean;
  isScheduled?: boolean;
}

interface ReportListProps {
  reports: ReportCard[];
  userRole?: string;
  analyticsData?: any;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  showExport?: boolean;
}

export function ReportList({ 
  reports, 
  userRole,
  analyticsData,
  searchTerm = '',
  onSearchChange,
  showExport = true
}: ReportListProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Use local search if no external handler provided
  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setLocalSearchTerm(value);
    }
  };

  const actualSearchTerm = onSearchChange ? searchTerm : localSearchTerm;

  // Filter reports based on search term
  const filteredReports = reports.filter(report => 
    actualSearchTerm === '' || 
    report.title.toLowerCase().includes(actualSearchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(actualSearchTerm.toLowerCase()) ||
    report.category.toLowerCase().includes(actualSearchTerm.toLowerCase())
  );

  // Get type badge variant
  const getTypeBadgeVariant = (type?: string) => {
    switch (type) {
      case 'custom': return 'default';
      case 'template': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'custom': return FileText;
      case 'template': return Layout;
      default: return FileText;
    }
  };


  return (
    <div className="space-y-6">
      {/* Search and Export Controls */}
      {(onSearchChange || showExport) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {onSearchChange && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search reports..."
                value={actualSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-white/80 border-gray-200/50 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
          )}

          {showExport && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
              </Badge>
              <UnifiedExport
                reports={reports}
                analyticsData={analyticsData}
                userRole={userRole}
              />
            </div>
          )}
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => {
          const ReportIcon = report.icon || getTypeIcon(report.type);
          
          return (
            <Link key={report.href} href={report.href}>
              <Card className="group h-full bg-white/[0.8] dark:bg-gray-900/[0.8] backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300/50 dark:hover:border-blue-600/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 rounded-xl overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-xl group-hover:from-blue-200 group-hover:to-indigo-200 dark:group-hover:from-blue-800/60 dark:group-hover:to-indigo-800/60 transition-all duration-300">
                        <ReportIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300" />
                      </div>
                      <div className="flex items-center gap-2">
                        {report.isFavorite && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                        {report.isScheduled && (
                          <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                    </div>
                    {report.badge && (
                      <Badge 
                        variant="outline" 
                        className="text-xs font-medium"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {report.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {report.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {report.description}
                  </p>
                  
                  {/* Footer with metadata */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center gap-2">
                      {report.type && (
                        <Badge 
                          variant={getTypeBadgeVariant(report.type)}
                          className="text-xs"
                        >
                          {report.type}
                        </Badge>
                      )}
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                      >
                        {report.category}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {report.lastUpdated || 'Recently'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* No Reports Found */}
      {filteredReports.length === 0 && (
        <div className="text-center py-12 bg-white/[0.6] dark:bg-gray-900/[0.6] backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No reports found</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {actualSearchTerm ? 'Try adjusting your search terms.' : 'No reports available in this section.'}
          </p>
          {actualSearchTerm && (
            <Button 
              onClick={() => handleSearchChange('')}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}