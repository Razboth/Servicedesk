'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { avatarPresets, categories, getAvatarById, getAvatarsByCategory, AvatarPreset } from './avatar-presets'
import { Camera, Check } from 'lucide-react'

interface AvatarSelectorProps {
  currentAvatar?: string | null
  onSelect: (avatarId: string) => void
  trigger?: React.ReactNode
}

export function AvatarSelector({ currentAvatar, onSelect, trigger }: AvatarSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar || null)

  const handleSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId)
  }

  const handleConfirm = () => {
    if (selectedAvatar) {
      onSelect(selectedAvatar)
      setIsOpen(false)
    }
  }

  const renderAvatar = (preset: AvatarPreset, isSelected: boolean = false) => (
    <button
      key={preset.id}
      onClick={() => handleSelect(preset.id)}
      className={`relative w-12 h-12 rounded-full transition-all duration-200 hover:scale-105 ${
        isSelected 
          ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-cream-50 dark:ring-offset-warm-dark-300' 
          : 'hover:ring-2 hover:ring-brown-300 hover:ring-offset-2 hover:ring-offset-cream-50 dark:hover:ring-offset-warm-dark-300'
      }`}
      title={preset.name}
    >
      <div className="w-full h-full">
        {preset.component}
      </div>
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-brown-950" />
        </div>
      )}
    </button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            size="sm" 
            className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-brown-400 hover:bg-brown-500 dark:bg-brown-200 dark:hover:bg-brown-300"
          >
            <Camera className="h-4 w-4 text-white dark:text-brown-950" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200">
        <DialogHeader>
          <DialogTitle className="text-brown-900 dark:text-cream-200">Choose Your Avatar</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-brown-900 dark:text-cream-200">Available Avatars</h3>
            <Badge variant="outline" className="text-brown-600 bg-cream-200 dark:text-cream-400 dark:bg-warm-dark-100/10">
              {avatarPresets.length} options
            </Badge>
          </div>

          <div className="max-h-72 overflow-y-auto">
            <div className="grid grid-cols-6 gap-3 p-2">
              {avatarPresets.map((preset) => 
                renderAvatar(preset, selectedAvatar === preset.id)
              )}
            </div>
          </div>
        </div>

        {/* Current selection preview */}
        {selectedAvatar && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="w-12 h-12">
              {getAvatarById(selectedAvatar)?.component}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-brown-900 dark:text-cream-200">
                {getAvatarById(selectedAvatar)?.name}
              </p>
              <p className="text-xs text-brown-600 dark:text-cream-400 capitalize">
                {getAvatarById(selectedAvatar)?.category}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleConfirm}
            disabled={!selectedAvatar}
            className="flex-1 bg-gradient-to-r from-brown-400 to-brown-500 dark:from-brown-200 dark:to-brown-300 text-white dark:text-brown-950 hover:from-brown-500 hover:to-brown-600 dark:hover:from-brown-300 dark:hover:to-brown-400"
          >
            Select Avatar
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="border-brown-400 text-brown-700 hover:bg-cream-200 dark:border-brown-600 dark:text-cream-200 dark:hover:bg-warm-dark-200"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}