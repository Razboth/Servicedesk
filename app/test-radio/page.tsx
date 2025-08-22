'use client'

import { useState } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

export default function TestRadioPage() {
  const [value, setValue] = useState('option1')

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Radio Button Test</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Basic Radio Group</h2>
          <p className="mb-2">Current value: {value}</p>
          <RadioGroup value={value} onValueChange={setValue}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="option1" id="option1" />
              <Label htmlFor="option1">Option 1</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="option2" id="option2" />
              <Label htmlFor="option2">Option 2</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="option3" id="option3" />
              <Label htmlFor="option3">Option 3</Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">With Label Wrapping</h2>
          <RadioGroup value={value} onValueChange={setValue}>
            <Label htmlFor="wrap1" className="flex items-center space-x-2 p-3 border rounded cursor-pointer hover:bg-accent">
              <RadioGroupItem value="wrap1" id="wrap1" />
              <span>Wrapped Option 1</span>
            </Label>
            <Label htmlFor="wrap2" className="flex items-center space-x-2 p-3 border rounded cursor-pointer hover:bg-accent">
              <RadioGroupItem value="wrap2" id="wrap2" />
              <span>Wrapped Option 2</span>
            </Label>
          </RadioGroup>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Complex Content</h2>
          <RadioGroup value={value} onValueChange={setValue}>
            <Label htmlFor="complex1" className="flex items-start space-x-2 p-4 border rounded cursor-pointer hover:bg-accent">
              <RadioGroupItem value="complex1" id="complex1" className="mt-1" />
              <div className="flex-1">
                <div className="font-medium">Complex Option 1</div>
                <p className="text-sm text-muted-foreground">This is a description for option 1</p>
              </div>
            </Label>
            <Label htmlFor="complex2" className="flex items-start space-x-2 p-4 border rounded cursor-pointer hover:bg-accent">
              <RadioGroupItem value="complex2" id="complex2" className="mt-1" />
              <div className="flex-1">
                <div className="font-medium">Complex Option 2</div>
                <p className="text-sm text-muted-foreground">This is a description for option 2</p>
              </div>
            </Label>
          </RadioGroup>
        </div>
      </div>
    </div>
  )
}