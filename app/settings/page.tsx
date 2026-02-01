'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import { 
  Settings,
  Bell,
  Moon,
  Sun,
  Monitor,
  Palette,
  Globe,
  Shield,
  Key,
  Mail,
  MessageSquare,
  Volume2,
  Eye,
  EyeOff,
  Save
} from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [preferences, setPreferences] = useState({
    notifications: {
      email: true,
      inApp: true,
      sound: false,
      ticketUpdates: true,
      newAssignments: true,
      mentions: true,
      systemAlerts: false
    },
    display: {
      compactMode: false,
      showAvatars: true,
      animationsEnabled: true,
      sidebarCollapsed: false
    },
    privacy: {
      profileVisible: true,
      showOnlineStatus: true,
      allowMessages: true
    }
  })

  useEffect(() => {
    setMounted(true)
    // Load saved preferences from localStorage or API
    const savedPreferences = localStorage.getItem('userPreferences')
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences))
    }
  }, [])

  const handleSavePreferences = () => {
    setIsSaving(true)
    // Save to localStorage and/or API
    localStorage.setItem('userPreferences', JSON.stringify(preferences))
    setTimeout(() => {
      setIsSaving(false)
      toast.success('Settings saved successfully')
    }, 500)
  }

  const updateNotificationSetting = (key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }))
  }

  const updateDisplaySetting = (key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      display: {
        ...prev.display,
        [key]: value
      }
    }))
  }

  const updatePrivacySetting = (key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }))
  }

  if (!mounted || !session) {
    return (
      <div className="min-h-screen bg-cream-100 dark:bg-brown-950 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-brown-600 dark:text-cream-300">Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-brown-950">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="Settings"
          description="Customize your experience and manage preferences"
          icon={<Settings className="h-6 w-6" />}
        />

        <Tabs defaultValue="general" className="space-y-6">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex h-10 min-w-full sm:min-w-0 sm:max-w-md p-1 bg-cream-200 dark:bg-warm-dark-200 rounded-lg">
              <TabsTrigger value="general" className="flex-shrink-0 text-xs sm:text-sm">General</TabsTrigger>
              <TabsTrigger value="notifications" className="flex-shrink-0 text-xs sm:text-sm">Notifications</TabsTrigger>
              <TabsTrigger value="display" className="flex-shrink-0 text-xs sm:text-sm">Display</TabsTrigger>
              <TabsTrigger value="privacy" className="flex-shrink-0 text-xs sm:text-sm">Privacy</TabsTrigger>
            </TabsList>
          </div>

          {/* General Settings */}
          <TabsContent value="general">
            <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg">
              <CardHeader>
                <CardTitle>General Preferences</CardTitle>
                <CardDescription>Manage your general application settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold flex items-center gap-2 mb-4">
                      <Palette className="h-4 w-4" />
                      Appearance
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        className={theme === 'light' 
                          ? 'bg-brown-400 hover:bg-brown-500 text-white' 
                          : 'border-brown-400 text-brown-700 hover:bg-cream-200 dark:border-brown-600 dark:text-cream-200 dark:hover:bg-warm-dark-200'}
                        onClick={() => setTheme('light')}
                      >
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        className={theme === 'dark' 
                          ? 'bg-brown-400 hover:bg-brown-500 text-white dark:bg-brown-200 dark:hover:bg-brown-300 dark:text-brown-950' 
                          : 'border-brown-400 text-brown-700 hover:bg-cream-200 dark:border-brown-600 dark:text-cream-200 dark:hover:bg-warm-dark-200'}
                        onClick={() => setTheme('dark')}
                      >
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </Button>
                      <Button
                        variant={theme === 'system' ? 'default' : 'outline'}
                        className={theme === 'system' 
                          ? 'bg-brown-400 hover:bg-brown-500 text-white' 
                          : 'border-brown-400 text-brown-700 hover:bg-cream-200 dark:border-brown-600 dark:text-cream-200 dark:hover:bg-warm-dark-200'}
                        onClick={() => setTheme('system')}
                      >
                        <Monitor className="h-4 w-4 mr-2" />
                        System
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-cream-500 dark:bg-warm-dark-200" />

                  {/* Language Selection */}
                  <div>
                    <Label htmlFor="language" className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4" />
                      Language
                    </Label>
                    <Select defaultValue="en">
                      <SelectTrigger id="language" className="bg-cream-50 dark:bg-warm-dark-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time Zone */}
                  <div>
                    <Label htmlFor="timezone" className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4" />
                      Time Zone
                    </Label>
                    <Select defaultValue="wita">
                      <SelectTrigger id="timezone" className="bg-cream-50 dark:bg-warm-dark-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wib">WIB (Jakarta)</SelectItem>
                        <SelectItem value="wita">WITA (Makassar)</SelectItem>
                        <SelectItem value="wit">WIT (Jayapura)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Notifications
                      </Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={preferences.notifications.email}
                      onCheckedChange={(checked) => updateNotificationSetting('email', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="in-app-notifications" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        In-App Notifications
                      </Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Show notifications within the app
                      </p>
                    </div>
                    <Switch
                      id="in-app-notifications"
                      checked={preferences.notifications.inApp}
                      onCheckedChange={(checked) => updateNotificationSetting('inApp', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sound-notifications" className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4" />
                        Sound Alerts
                      </Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Play sound for new notifications
                      </p>
                    </div>
                    <Switch
                      id="sound-notifications"
                      checked={preferences.notifications.sound}
                      onCheckedChange={(checked) => updateNotificationSetting('sound', checked)}
                    />
                  </div>

                  <Separator className="bg-cream-500 dark:bg-warm-dark-200" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="ticket-updates">Ticket Updates</Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Notify when tickets are updated
                      </p>
                    </div>
                    <Switch
                      id="ticket-updates"
                      checked={preferences.notifications.ticketUpdates}
                      onCheckedChange={(checked) => updateNotificationSetting('ticketUpdates', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="new-assignments">New Assignments</Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Notify when assigned new tickets
                      </p>
                    </div>
                    <Switch
                      id="new-assignments"
                      checked={preferences.notifications.newAssignments}
                      onCheckedChange={(checked) => updateNotificationSetting('newAssignments', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="mentions" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Mentions
                      </Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Notify when mentioned in comments
                      </p>
                    </div>
                    <Switch
                      id="mentions"
                      checked={preferences.notifications.mentions}
                      onCheckedChange={(checked) => updateNotificationSetting('mentions', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Display Settings */}
          <TabsContent value="display">
            <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg">
              <CardHeader>
                <CardTitle>Display Preferences</CardTitle>
                <CardDescription>Customize the application appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="compact-mode">Compact Mode</Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Use compact spacing in lists and tables
                      </p>
                    </div>
                    <Switch
                      id="compact-mode"
                      checked={preferences.display.compactMode}
                      onCheckedChange={(checked) => updateDisplaySetting('compactMode', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-avatars">Show Avatars</Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Display user avatars in lists
                      </p>
                    </div>
                    <Switch
                      id="show-avatars"
                      checked={preferences.display.showAvatars}
                      onCheckedChange={(checked) => updateDisplaySetting('showAvatars', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="animations">Animations</Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Enable smooth animations and transitions
                      </p>
                    </div>
                    <Switch
                      id="animations"
                      checked={preferences.display.animationsEnabled}
                      onCheckedChange={(checked) => updateDisplaySetting('animationsEnabled', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy">
            <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Security
                </CardTitle>
                <CardDescription>Manage your privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="profile-visible" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Profile Visibility
                      </Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Allow others to view your profile
                      </p>
                    </div>
                    <Switch
                      id="profile-visible"
                      checked={preferences.privacy.profileVisible}
                      onCheckedChange={(checked) => updatePrivacySetting('profileVisible', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="online-status">Online Status</Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Show when you're online
                      </p>
                    </div>
                    <Switch
                      id="online-status"
                      checked={preferences.privacy.showOnlineStatus}
                      onCheckedChange={(checked) => updatePrivacySetting('showOnlineStatus', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allow-messages" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Direct Messages
                      </Label>
                      <p className="text-sm text-brown-600 dark:text-cream-400">
                        Allow users to send you messages
                      </p>
                    </div>
                    <Switch
                      id="allow-messages"
                      checked={preferences.privacy.allowMessages}
                      onCheckedChange={(checked) => updatePrivacySetting('allowMessages', checked)}
                    />
                  </div>

                  <Separator className="bg-cream-500 dark:bg-warm-dark-200" />

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Security Options
                    </Label>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-brown-400 text-brown-700 hover:bg-cream-200 dark:border-brown-600 dark:text-cream-200 dark:hover:bg-warm-dark-200"
                      onClick={() => window.location.href = '/auth/change-password'}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="bg-gradient-to-r from-brown-400 to-brown-500 dark:from-brown-200 dark:to-brown-300 text-white dark:text-brown-950 hover:from-brown-500 hover:to-brown-600 dark:hover:from-brown-300 dark:hover:to-brown-400"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}