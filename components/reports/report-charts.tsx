'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
}

interface BarChartProps {
  title: string;
  data: ChartDataPoint[];
  height?: number;
  showValues?: boolean;
  className?: string;
}

interface PieChartProps {
  title: string;
  data: ChartDataPoint[];
  showLegend?: boolean;
  className?: string;
}

interface TimelineChartProps {
  title: string;
  data: Array<{
    date: string;
    value: number;
    label?: string;
  }>;
  height?: number;
  className?: string;
}

// Metric Card Component
export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  badge,
  ...props
}: MetricCardProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card {...props} className="shadow-sm border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground/50">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end space-y-1">
            {badge && (
              <Badge variant={badge.variant || 'secondary'} className="text-xs">
                {badge.text}
              </Badge>
            )}
            {trend && (
              <div className={`flex items-center text-xs ${
                trend.isPositive ? 'text-success' : 'text-destructive'
              }`}>
                <span className="mr-1">
                  {trend.isPositive ? '↗' : '↘'}
                </span>
                <span>{Math.abs(trend.value)}% {trend.label}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Bar Chart Component
export function BarChart({
  title,
  data,
  height = 300,
  showValues = true,
  className = ''
}: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <Card className={`${className} shadow-sm border-border bg-card`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" style={{ height }}>
          {data.map((item, index) => {
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const color = item.color || `hsl(var(--chart-${(index % 5) + 1}))`;

            return (
              <div key={item.label} className="flex items-center space-x-3">
                <div className="w-24 text-sm text-muted-foreground truncate" title={item.label}>
                  {item.label}
                </div>
                <div className="flex-1 relative">
                  <div className="w-full bg-muted rounded-full h-6">
                    <div
                      className="h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                        minWidth: showValues && item.value > 0 ? '40px' : '0'
                      }}
                    >
                      {showValues && item.value > 0 && (
                        <span className="text-xs font-medium" style={{ color: 'white' }}>
                          {item.value}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-12 text-sm text-foreground text-right font-medium">
                  {item.percentage ? `${item.percentage}%` : item.value}
                </div>
              </div>
            );
          })}
        </div>
        {data.length === 0 && (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <div className="text-center">
              <div className="text-sm">No data available</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple Pie Chart Component
export function PieChart({
  title,
  data,
  showLegend = true,
  className = ''
}: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;

  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const startAngle = (cumulativePercentage / 100) * 360;
    const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
    cumulativePercentage += percentage;

    const color = item.color || `hsl(var(--chart-${(index % 5) + 1}))`;

    return {
      ...item,
      percentage: Math.round(percentage * 10) / 10,
      startAngle,
      endAngle,
      color
    };
  });

  const createArcPath = (centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", centerX, centerY,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  return (
    <Card className={`${className} shadow-sm border-border bg-card`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-6">
          {/* Pie Chart SVG */}
          <div className="flex-shrink-0">
            <svg width="200" height="200" className="transform -rotate-90">
              {segments.map((segment, index) => (
                <path
                  key={index}
                  d={createArcPath(100, 100, 80, segment.startAngle, segment.endAngle)}
                  fill={segment.color}
                  stroke="hsl(var(--background))"
                  strokeWidth="2"
                />
              ))}
              {total === 0 && (
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="hsl(var(--muted))"
                  stroke="hsl(var(--border))"
                  strokeWidth="2"
                />
              )}
            </svg>
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="flex-1">
              {segments.map((segment, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="text-sm text-muted-foreground">{segment.label}</span>
                  </div>
                  <div className="text-sm text-foreground font-medium">
                    {segment.value} ({segment.percentage}%)
                  </div>
                </div>
              ))}
              {data.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <div className="text-sm">No data available</div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple Timeline Chart Component
export function TimelineChart({
  title,
  data,
  height = 200,
  className = ''
}: TimelineChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const valueRange = maxValue - minValue || 1;

  return (
    <Card className={`${className} shadow-sm border-border bg-card`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height }}>
          {data.length > 0 ? (
            <svg width="100%" height="100%" className="overflow-visible">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = height * (1 - ratio);
                return (
                  <line
                    key={ratio}
                    x1="0"
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                );
              })}

              {/* Data line */}
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                points={data.map((point, index) => {
                  const x = (index / (data.length - 1)) * 100;
                  const y = height * (1 - (point.value - minValue) / valueRange);
                  return `${x}%,${y}`;
                }).join(' ')}
              />

              {/* Data points */}
              {data.map((point, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = height * (1 - (point.value - minValue) / valueRange);
                return (
                  <circle
                    key={index}
                    cx={`${x}%`}
                    cy={y}
                    r="4"
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                  >
                    <title>{point.label || point.date}: {point.value}</title>
                  </circle>
                );
              })}
            </svg>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-sm">No data available</div>
              </div>
            </div>
          )}
        </div>

        {/* X-axis labels */}
        {data.length > 0 && (
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{new Date(data[0].date).toLocaleDateString()}</span>
            <span>{new Date(data[data.length - 1].date).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Generic ReportCharts component for backward compatibility
interface ReportChartsProps {
  data: any[];
  type: 'bar' | 'line' | 'pie' | 'area';
  title?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  className?: string;
}

export function ReportCharts({
  data,
  type,
  title,
  xAxisKey = 'name',
  yAxisKey = 'value',
  className = ''
}: ReportChartsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  // Convert data to the format expected by existing components
  const chartData = data.map(item => ({
    label: item[xAxisKey] || item.name || item.label || 'Unknown',
    value: item[yAxisKey] || item.value || 0,
    color: item.color
  }));

  switch (type) {
    case 'bar':
      return <BarChart title={title || 'Chart'} data={chartData} className={className} />;
    case 'pie':
      return <PieChart title={title || 'Chart'} data={chartData} className={className} />;
    case 'line':
    case 'area':
      // For line/area charts, convert to timeline format
      const timelineData = data.map((item, index) => ({
        date: item.date || item[xAxisKey] || `Point ${index + 1}`,
        value: item[yAxisKey] || item.value || 0,
        label: item.label || item.name
      }));
      return <TimelineChart title={title || 'Chart'} data={timelineData} className={className} />;
    default:
      return <BarChart title={title || 'Chart'} data={chartData} className={className} />;
  }
}

// Default export for backward compatibility
export default ReportCharts;