'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface Branch {
  id: string
  name: string
  code?: string
}

interface BranchSelectProps {
  branches: Branch[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  allOption?: boolean
  allOptionLabel?: string
  noneOption?: boolean
  noneOptionLabel?: string
  disabled?: boolean
  className?: string
}

export function BranchSelect({
  branches,
  value,
  onValueChange,
  placeholder = 'Select branch...',
  allOption = true,
  allOptionLabel = 'All Branches',
  noneOption = false,
  noneOptionLabel = 'No Branch',
  disabled = false,
  className,
}: BranchSelectProps) {
  const [open, setOpen] = React.useState(false)

  // Sort branches alphabetically by code then name
  const sortedBranches = React.useMemo(() => {
    return [...branches].sort((a, b) => {
      // Sort by code first if available, then by name
      if (a.code && b.code) {
        return a.code.localeCompare(b.code)
      }
      return a.name.localeCompare(b.name)
    })
  }, [branches])

  // Find selected branch label
  const selectedLabel = React.useMemo(() => {
    if (!value || value === 'all') {
      return allOption ? allOptionLabel : placeholder
    }
    if (value === 'none') {
      return noneOptionLabel
    }
    const branch = branches.find(b => b.id === value)
    if (branch) {
      return branch.code ? `${branch.code} - ${branch.name}` : branch.name
    }
    return placeholder
  }, [value, branches, allOption, allOptionLabel, noneOption, noneOptionLabel, placeholder])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between', className)}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search branch..." />
          <CommandList>
            <CommandEmpty>No branch found.</CommandEmpty>
            <CommandGroup>
              {allOption && (
                <CommandItem
                  value="all"
                  onSelect={() => {
                    onValueChange('all')
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === 'all' || !value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {allOptionLabel}
                </CommandItem>
              )}
              {noneOption && (
                <CommandItem
                  value="none"
                  onSelect={() => {
                    onValueChange('none')
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === 'none' ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {noneOptionLabel}
                </CommandItem>
              )}
              {sortedBranches.map((branch) => (
                <CommandItem
                  key={branch.id}
                  value={branch.code ? `${branch.code} ${branch.name}` : branch.name}
                  onSelect={() => {
                    onValueChange(branch.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === branch.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {branch.code ? `${branch.code} - ${branch.name}` : branch.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
