'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Lock, Unlock, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface LockedInputProps {
  type?: 'text' | 'textarea' | 'select' | 'checkbox'
  label?: string
  value: any
  onChange: (value: any) => void
  placeholder?: string
  isLocked?: boolean
  source?: 'default' | 'user' | 'service'
  canOverride?: boolean
  onUnlock?: () => void
  options?: string[] | Array<{ value: string; label: string }>
  className?: string
  helpText?: string
  required?: boolean
}

export function LockedInput({ 
  type = 'text',
  label,
  value,
  onChange,
  placeholder,
  isLocked = false,
  source = 'user',
  canOverride = true,
  onUnlock,
  options = [],
  className = '',
  helpText,
  required = false
}: LockedInputProps) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  
  const isDisabled = isLocked && !isUnlocked
  
  const handleUnlock = () => {
    setIsUnlocked(true)
    if (onUnlock) {
      onUnlock()
    }
  }
  
  const getSourceIcon = () => {
    switch (source) {
      case 'service':
        return '🔧'
      case 'default':
        return '⚙️'
      default:
        return '👤'
    }
  }
  
  const getSourceText = () => {
    switch (source) {
      case 'service':
        return 'Auto-filled from service template'
      case 'default':
        return 'System default value'
      default:
        return 'User entered value'
    }
  }
  
  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={isDisabled}
            className={`${className} ${isDisabled ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}`}
            rows={3}
          />
        )
      
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={onChange}
            disabled={isDisabled}
          >
            <SelectTrigger className={`${className} ${isDisabled ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}`}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => {
                const optionValue = typeof option === 'string' ? option : option.value
                const optionLabel = typeof option === 'string' ? option : option.label
                return (
                  <SelectItem key={optionValue} value={optionValue}>
                    {optionLabel}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => onChange(checked)}
              disabled={isDisabled}
              className={isDisabled ? 'cursor-not-allowed' : ''}
            />
            <Label className={isDisabled ? 'text-gray-500 cursor-not-allowed' : 'cursor-pointer'}>
              {label}
            </Label>
          </div>
        )
      
      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={isDisabled}
            className={`${className} ${isDisabled ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}`}
          />
        )
    }
  }
  
  return (
    <TooltipProvider>
      <div className="space-y-2">
        {label && type !== 'checkbox' && (
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            
            {isLocked && (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded-md text-xs">
                      <span>{getSourceIcon()}</span>
                      <Lock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getSourceText()}</p>
                  </TooltipContent>
                </Tooltip>
                
                {canOverride && !isUnlocked && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleUnlock}
                        className="h-6 w-6 p-0 hover:bg-blue-200 dark:hover:bg-blue-800"
                      >
                        <Unlock className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to unlock and edit this field</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {isUnlocked && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 rounded-md text-xs">
                    <Unlock className="h-3 w-3 text-green-600 dark:text-green-400" />
                    <span className="text-green-700 dark:text-green-300">Unlocked</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="relative">
          {renderInput()}
          
          {isLocked && !isUnlocked && (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-md pointer-events-none" />
          )}
        </div>
        
        {helpText && (
          <div className="flex items-start gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{helpText}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}