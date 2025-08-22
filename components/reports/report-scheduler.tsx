'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { 
  Calendar as CalendarIcon,
  Clock,
  Mail,
  AlertCircle,
  FileText,
  Save,
  Info
} from 'lucide-react'

interface Schedule {
  enabled: boolean
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
  startDate: Date | undefined
  endDate: Date | undefined
  time: { hours: number; minutes: number }
  daysOfWeek?: number[]
  dayOfMonth?: number
  recipients: string[]
  subject: string
  message: string
  format: 'PDF' | 'EXCEL' | 'CSV'
}

interface ReportSchedulerProps {
  schedule: Schedule | null
  onScheduleChange: (schedule: Schedule | null) => void
}

const daysOfWeek = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
]

export function ReportScheduler({ schedule, onScheduleChange }: ReportSchedulerProps) {
  const [localSchedule, setLocalSchedule] = useState<Schedule>(schedule || {
    enabled: false,
    frequency: 'DAILY',
    startDate: undefined,
    endDate: undefined,
    time: { hours: 9, minutes: 0 },
    daysOfWeek: [],
    dayOfMonth: 1,
    recipients: [],
    subject: '',
    message: '',
    format: 'PDF'
  })

  const [recipientInput, setRecipientInput] = useState('')

  const updateSchedule = (updates: Partial<Schedule>) => {
    const newSchedule = { ...localSchedule, ...updates }
    setLocalSchedule(newSchedule)
    onScheduleChange(newSchedule.enabled ? newSchedule : null)
  }

  const addRecipient = () => {
    if (recipientInput && recipientInput.includes('@')) {
      updateSchedule({
        recipients: [...localSchedule.recipients, recipientInput]
      })
      setRecipientInput('')
    }
  }

  const removeRecipient = (email: string) => {
    updateSchedule({
      recipients: localSchedule.recipients.filter(r => r !== email)
    })
  }

  const toggleDayOfWeek = (day: number) => {
    const days = localSchedule.daysOfWeek || []
    if (days.includes(day)) {
      updateSchedule({ daysOfWeek: days.filter(d => d !== day) })
    } else {
      updateSchedule({ daysOfWeek: [...days, day] })
    }
  }

  const getCronExpression = () => {
    const { frequency, time, daysOfWeek, dayOfMonth } = localSchedule
    const minutes = time.minutes
    const hours = time.hours

    switch (frequency) {
      case 'ONCE':
        return `Run once on ${localSchedule.startDate ? format(localSchedule.startDate, 'PPP') : 'selected date'}`
      case 'DAILY':
        return `0 ${minutes} ${hours} * * *`
      case 'WEEKLY':
        const days = (daysOfWeek || []).sort().join(',') || '*'
        return `0 ${minutes} ${hours} * * ${days}`
      case 'MONTHLY':
        return `0 ${minutes} ${hours} ${dayOfMonth} * *`
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Schedule Report</h3>
          <p className="text-sm text-muted-foreground">
            Configure automatic report generation and delivery
          </p>
        </div>
        <Switch
          checked={localSchedule.enabled}
          onCheckedChange={(enabled) => updateSchedule({ enabled })}
        />
      </div>

      {localSchedule.enabled && (
        <>
          {/* Schedule Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Frequency */}
              <div className="space-y-3">
                <Label>Frequency</Label>
                <RadioGroup
                  value={localSchedule.frequency}
                  onValueChange={(value) => updateSchedule({ frequency: value as Schedule['frequency'] })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ONCE" id="once" />
                    <Label htmlFor="once">Generate Once</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="DAILY" id="daily" />
                    <Label htmlFor="daily">Daily Report</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="WEEKLY" id="weekly" />
                    <Label htmlFor="weekly">Weekly Report</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MONTHLY" id="monthly" />
                    <Label htmlFor="monthly">Monthly Report</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !localSchedule.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localSchedule.startDate ? format(localSchedule.startDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={localSchedule.startDate}
                        onSelect={(date) => updateSchedule({ startDate: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {localSchedule.frequency !== 'ONCE' && (
                  <div className="space-y-2">
                    <Label>End Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !localSchedule.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {localSchedule.endDate ? format(localSchedule.endDate, "PPP") : "No end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={localSchedule.endDate}
                          onSelect={(date) => updateSchedule({ endDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <Label>Time</Label>
                <div className="flex gap-2 items-center">
                  <Select
                    value={localSchedule.time.hours.toString()}
                    onValueChange={(value) => updateSchedule({
                      time: { ...localSchedule.time, hours: parseInt(value) }
                    })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>:</span>
                  <Select
                    value={localSchedule.time.minutes.toString()}
                    onValueChange={(value) => updateSchedule({
                      time: { ...localSchedule.time, minutes: parseInt(value) }
                    })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 15, 30, 45].map(m => (
                        <SelectItem key={m} value={m.toString()}>
                          {m.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Weekly Options */}
              {localSchedule.frequency === 'WEEKLY' && (
                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {daysOfWeek.map(day => (
                      <label key={day.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={localSchedule.daysOfWeek?.includes(day.value) || false}
                          onChange={() => toggleDayOfWeek(day.value)}
                          className="rounded"
                        />
                        <span className="text-sm">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Options */}
              {localSchedule.frequency === 'MONTHLY' && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Select
                    value={localSchedule.dayOfMonth?.toString() || '1'}
                    onValueChange={(value) => updateSchedule({ dayOfMonth: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Schedule Preview */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Schedule:</strong> {getCronExpression()}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recipients */}
              <div className="space-y-2">
                <Label>Recipients *</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                  />
                  <Button onClick={addRecipient} type="button">
                    Add
                  </Button>
                </div>
                {localSchedule.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {localSchedule.recipients.map(email => (
                      <div key={email} className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md">
                        <span className="text-sm">{email}</span>
                        <button
                          onClick={() => removeRecipient(email)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input
                  placeholder="Report subject line"
                  value={localSchedule.subject}
                  onChange={(e) => updateSchedule({ subject: e.target.value })}
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Optional message to include with the report"
                  value={localSchedule.message}
                  onChange={(e) => updateSchedule({ message: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Format */}
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select
                  value={localSchedule.format}
                  onValueChange={(value) => updateSchedule({ format: value as Schedule['format'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF Document
                      </div>
                    </SelectItem>
                    <SelectItem value="EXCEL">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Excel Spreadsheet
                      </div>
                    </SelectItem>
                    <SelectItem value="CSV">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        CSV File
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Validation */}
          {localSchedule.enabled && (!localSchedule.recipients.length || !localSchedule.subject) && (
            <Alert className="border-yellow-500">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription>
                Please provide at least one recipient and a subject line to enable scheduling.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  )
}