'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  TrendingUp,
  AreaChart,
  Activity,
  ChartBar,
  ChartPie,
  ChartLine,
  Palette,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'

interface ChartConfig {
  enabled: boolean
  type: 'BAR' | 'PIE' | 'LINE' | 'AREA' | 'DONUT' | 'COLUMN'
  xAxis: string
  yAxis: string
  aggregation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'
  groupBy?: string
  showLegend: boolean
  showDataLabels: boolean
  showGrid: boolean
  colorScheme: string
  title?: string
  height: number
}

interface ChartConfigurationProps {
  columns: string[]
  chartConfig: ChartConfig | null
  onChartConfigChange: (config: ChartConfig | null) => void
}

const chartTypes = [
  { value: 'BAR', label: 'Bar Chart', icon: BarChart3, description: 'Compare values across categories' },
  { value: 'COLUMN', label: 'Column Chart', icon: ChartBar, description: 'Vertical bar representation' },
  { value: 'PIE', label: 'Pie Chart', icon: PieChart, description: 'Show proportions of a whole' },
  { value: 'DONUT', label: 'Donut Chart', icon: ChartPie, description: 'Pie chart with center cutout' },
  { value: 'LINE', label: 'Line Chart', icon: LineChart, description: 'Show trends over time' },
  { value: 'AREA', label: 'Area Chart', icon: AreaChart, description: 'Filled line chart for volume' }
]

const colorSchemes = [
  { value: 'default', label: 'Default', colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'] },
  { value: 'pastel', label: 'Pastel', colors: ['#93c5fd', '#fca5a5', '#86efac', '#fcd34d', '#c4b5fd'] },
  { value: 'dark', label: 'Dark', colors: ['#1e40af', '#991b1b', '#14532d', '#92400e', '#5b21b6'] },
  { value: 'vibrant', label: 'Vibrant', colors: ['#0ea5e9', '#f43f5e', '#22c55e', '#f97316', '#a855f7'] },
  { value: 'monochrome', label: 'Monochrome', colors: ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'] }
]

export function ChartConfiguration({ columns, chartConfig, onChartConfigChange }: ChartConfigurationProps) {
  const [localConfig, setLocalConfig] = useState<ChartConfig>(chartConfig || {
    enabled: false,
    type: 'BAR',
    xAxis: '',
    yAxis: '',
    aggregation: 'COUNT',
    groupBy: '',
    showLegend: true,
    showDataLabels: true,
    showGrid: true,
    colorScheme: 'default',
    title: '',
    height: 400
  })

  const updateConfig = (updates: Partial<ChartConfig>) => {
    const newConfig = { ...localConfig, ...updates }
    setLocalConfig(newConfig)
    onChartConfigChange(newConfig.enabled ? newConfig : null)
  }

  const getNumericColumns = () => {
    // In a real implementation, this would filter based on actual column types
    return columns.filter(col => 
      col.includes('count') || 
      col.includes('amount') || 
      col.includes('time') || 
      col.includes('duration') ||
      col.includes('id')
    )
  }

  const getCategoricalColumns = () => {
    // In a real implementation, this would filter based on actual column types
    return columns.filter(col => 
      !getNumericColumns().includes(col)
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Chart Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Add visual representations to your report
          </p>
        </div>
        <Switch
          checked={localConfig.enabled}
          onCheckedChange={(enabled) => updateConfig({ enabled })}
        />
      </div>

      {localConfig.enabled && (
        <>
          {/* Chart Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chart Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {chartTypes.map(chart => (
                  <div
                    key={chart.value}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      localConfig.type === chart.value 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => updateConfig({ type: chart.value as ChartConfig['type'] })}
                  >
                    <div className="flex items-start gap-3">
                      <chart.icon className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{chart.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {chart.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Data Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* X Axis */}
              <div className="space-y-2">
                <Label>X Axis (Category)</Label>
                <Select
                  value={localConfig.xAxis}
                  onValueChange={(value) => updateConfig({ xAxis: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for X axis" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategoricalColumns().map(col => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Y Axis */}
              <div className="space-y-2">
                <Label>Y Axis (Value)</Label>
                <Select
                  value={localConfig.yAxis}
                  onValueChange={(value) => updateConfig({ yAxis: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for Y axis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_count">Count of Records</SelectItem>
                    {getNumericColumns().map(col => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aggregation */}
              {localConfig.yAxis !== '_count' && (
                <div className="space-y-2">
                  <Label>Aggregation</Label>
                  <Select
                    value={localConfig.aggregation}
                    onValueChange={(value) => updateConfig({ aggregation: value as ChartConfig['aggregation'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COUNT">Count</SelectItem>
                      <SelectItem value="SUM">Sum</SelectItem>
                      <SelectItem value="AVG">Average</SelectItem>
                      <SelectItem value="MIN">Minimum</SelectItem>
                      <SelectItem value="MAX">Maximum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Group By (for stacked charts) */}
              {['BAR', 'COLUMN', 'AREA'].includes(localConfig.type) && (
                <div className="space-y-2">
                  <Label>Group By (Optional)</Label>
                  <Select
                    value={localConfig.groupBy || ''}
                    onValueChange={(value) => updateConfig({ groupBy: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grouping column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No grouping</SelectItem>
                      {getCategoricalColumns().filter(col => col !== localConfig.xAxis).map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Chart Title */}
              <div className="space-y-2">
                <Label>Chart Title (Optional)</Label>
                <Input
                  placeholder="Enter chart title"
                  value={localConfig.title || ''}
                  onChange={(e) => updateConfig({ title: e.target.value })}
                />
              </div>

              {/* Color Scheme */}
              <div className="space-y-2">
                <Label>Color Scheme</Label>
                <Select
                  value={localConfig.colorScheme}
                  onValueChange={(value) => updateConfig({ colorScheme: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorSchemes.map(scheme => (
                      <SelectItem key={scheme.value} value={scheme.value}>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {scheme.colors.slice(0, 3).map((color, i) => (
                              <div
                                key={i}
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <span>{scheme.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Height */}
              <div className="space-y-2">
                <Label>Chart Height (pixels)</Label>
                <Input
                  type="number"
                  min="200"
                  max="800"
                  step="50"
                  value={localConfig.height}
                  onChange={(e) => updateConfig({ height: parseInt(e.target.value) || 400 })}
                />
              </div>

              {/* Display Options */}
              <div className="space-y-3">
                <Label>Display Options</Label>
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Show Legend</span>
                    <Switch
                      checked={localConfig.showLegend}
                      onCheckedChange={(checked) => updateConfig({ showLegend: checked })}
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Show Data Labels</span>
                    <Switch
                      checked={localConfig.showDataLabels}
                      onCheckedChange={(checked) => updateConfig({ showDataLabels: checked })}
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Show Grid Lines</span>
                    <Switch
                      checked={localConfig.showGrid}
                      onCheckedChange={(checked) => updateConfig({ showGrid: checked })}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Chart Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-8 bg-muted/20 flex items-center justify-center" style={{ height: localConfig.height }}>
                <div className="text-center">
                  <ChartPreviewIcon type={localConfig.type} />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Chart preview will be displayed when the report is run
                  </p>
                  {localConfig.title && (
                    <p className="mt-2 font-medium">{localConfig.title}</p>
                  )}
                  <div className="mt-4 text-xs text-muted-foreground space-y-1">
                    <div>X: {localConfig.xAxis || 'Not selected'}</div>
                    <div>Y: {localConfig.yAxis || 'Not selected'} 
                      {localConfig.yAxis !== '_count' && localConfig.aggregation && ` (${localConfig.aggregation})`}
                    </div>
                    {localConfig.groupBy && <div>Grouped by: {localConfig.groupBy}</div>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function ChartPreviewIcon({ type }: { type: string }) {
  const iconProps = { className: "h-16 w-16 text-muted-foreground/50 mx-auto" }
  
  switch (type) {
    case 'BAR':
      return <BarChart3 {...iconProps} />
    case 'COLUMN':
      return <ChartBar {...iconProps} />
    case 'PIE':
      return <PieChart {...iconProps} />
    case 'DONUT':
      return <ChartPie {...iconProps} />
    case 'LINE':
      return <LineChart {...iconProps} />
    case 'AREA':
      return <AreaChart {...iconProps} />
    default:
      return <ChartBar {...iconProps} />
  }
}