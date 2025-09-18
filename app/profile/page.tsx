'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Calendar,
  Clock,
  Key,
  Save,
  Camera,
  Users
} from 'lucide-react'
import { AvatarSelector } from '@/components/ui/avatar-selector'
import { getAvatarById } from '@/components/ui/avatar-presets'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    emailNotifyOnTicketCreated: true,
    emailNotifyOnTicketAssigned: true,
    emailNotifyOnTicketUpdated: true,
    emailNotifyOnTicketResolved: true,
    emailNotifyOnComment: true
  })

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user) return

      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          setUserData(data)
          setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            avatar: data.avatar || '',
            emailNotifyOnTicketCreated: data.emailNotifyOnTicketCreated ?? true,
            emailNotifyOnTicketAssigned: data.emailNotifyOnTicketAssigned ?? true,
            emailNotifyOnTicketUpdated: data.emailNotifyOnTicketUpdated ?? true,
            emailNotifyOnTicketResolved: data.emailNotifyOnTicketResolved ?? true,
            emailNotifyOnComment: data.emailNotifyOnComment ?? true
          })
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [session])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update the form data with the response
        if (result.user) {
          setFormData({
            name: result.user.name || '',
            email: result.user.email || '',
            phone: result.user.phone || '',
            avatar: result.user.avatar || ''
          })
        }
        
        // Force session refresh with trigger data
        await update({
          avatar: formData.avatar
        })
        
        toast.success('Profile updated successfully')
      } else {
        toast.error('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('An error occurred while updating profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = () => {
    router.push('/auth/change-password')
  }

  const handleAvatarSelect = (avatarId: string) => {
    setFormData(prev => ({ ...prev, avatar: avatarId }))
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-cream-100 dark:bg-brown-950 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-brown-600 dark:text-cream-300">Please sign in to view your profile</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-brown-950">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="User Profile"
          description="Manage your personal information and account settings"
          icon={<User className="h-6 w-6" />}
        />

        <div className="grid gap-6">
          {/* Profile Card */}
          <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24">
                    {(formData.avatar || (session.user as any)?.avatar) && getAvatarById(formData.avatar || (session.user as any)?.avatar) ? (
                      <div className="w-full h-full">
                        {getAvatarById(formData.avatar || (session.user as any)?.avatar)?.component}
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-brown-400 to-brown-600 dark:from-brown-200 dark:to-brown-300 p-1">
                        <div className="w-full h-full rounded-full bg-cream-50 dark:bg-warm-dark-300 flex items-center justify-center">
                          <span className="text-2xl font-bold text-brown-700 dark:text-cream-200">
                            {session.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-brown-900 dark:text-cream-200">{session.user.name}</h3>
                    <p className="text-sm text-brown-600 dark:text-cream-400">{session.user.role}</p>
                    {(formData.avatar || (session.user as any)?.avatar) && (
                      <p className="text-xs text-brown-500 dark:text-cream-500 mt-1">
                        Avatar: {getAvatarById(formData.avatar || (session.user as any)?.avatar)?.name}
                      </p>
                    )}
                  </div>
                </div>
                <AvatarSelector
                  currentAvatar={formData.avatar}
                  onSelect={handleAvatarSelect}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto border-brown-400 text-brown-700 hover:bg-cream-200 dark:border-brown-600 dark:text-cream-200 dark:hover:bg-warm-dark-200"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Change Avatar
                    </Button>
                  }
                />
              </div>

              <Separator className="bg-cream-500 dark:bg-warm-dark-200" />

              {/* Form Fields */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-cream-50 dark:bg-warm-dark-200"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-cream-50 dark:bg-warm-dark-200"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Enter phone number"
                    className="bg-cream-50 dark:bg-warm-dark-200"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-brown-400 to-brown-500 dark:from-brown-200 dark:to-brown-300 text-white dark:text-brown-950 hover:from-brown-500 hover:to-brown-600 dark:hover:from-brown-300 dark:hover:to-brown-400"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleChangePassword}
                  className="border-brown-400 text-brown-700 hover:bg-cream-200 dark:border-brown-600 dark:text-cream-200 dark:hover:bg-warm-dark-200"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Notifications & Account Details Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Email Notifications Card */}
            <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg">
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Choose which notifications you receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailTicketCreated">New Ticket Created</Label>
                      <p className="text-xs text-muted-foreground">Get notified when a ticket is created</p>
                    </div>
                    <Switch
                      id="emailTicketCreated"
                      checked={formData.emailNotifyOnTicketCreated}
                      onCheckedChange={(checked) => setFormData({...formData, emailNotifyOnTicketCreated: checked})}
                    />
                  </div>

                  <Separator className="bg-cream-500 dark:bg-warm-dark-200" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailTicketAssigned">Ticket Assigned</Label>
                      <p className="text-xs text-muted-foreground">Get notified when a ticket is assigned to you</p>
                    </div>
                    <Switch
                      id="emailTicketAssigned"
                      checked={formData.emailNotifyOnTicketAssigned}
                      onCheckedChange={(checked) => setFormData({...formData, emailNotifyOnTicketAssigned: checked})}
                    />
                  </div>

                  <Separator className="bg-cream-500 dark:bg-warm-dark-200" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailTicketUpdated">Ticket Updated</Label>
                      <p className="text-xs text-muted-foreground">Get notified when a ticket is updated</p>
                    </div>
                    <Switch
                      id="emailTicketUpdated"
                      checked={formData.emailNotifyOnTicketUpdated}
                      onCheckedChange={(checked) => setFormData({...formData, emailNotifyOnTicketUpdated: checked})}
                    />
                  </div>

                  <Separator className="bg-cream-500 dark:bg-warm-dark-200" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailTicketResolved">Ticket Resolved</Label>
                      <p className="text-xs text-muted-foreground">Get notified when a ticket is resolved</p>
                    </div>
                    <Switch
                      id="emailTicketResolved"
                      checked={formData.emailNotifyOnTicketResolved}
                      onCheckedChange={(checked) => setFormData({...formData, emailNotifyOnTicketResolved: checked})}
                    />
                  </div>

                  <Separator className="bg-cream-500 dark:bg-warm-dark-200" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailComment">New Comment</Label>
                      <p className="text-xs text-muted-foreground">Get notified when someone comments</p>
                    </div>
                    <Switch
                      id="emailComment"
                      checked={formData.emailNotifyOnComment}
                      onCheckedChange={(checked) => setFormData({...formData, emailNotifyOnComment: checked})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Details Card */}
            <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg">
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-brown-600 dark:text-cream-400" />
                  <div>
                    <p className="text-sm font-medium text-brown-900 dark:text-cream-200">Role</p>
                    <Badge variant="outline" className="mt-1 text-brown-600 bg-cream-200 dark:text-cream-400 dark:bg-warm-dark-100/10 border-brown-500/20">
                      {session.user.role}
                    </Badge>
                  </div>
                </div>

                {session.user.branchName && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-brown-600 dark:text-cream-400" />
                    <div>
                      <p className="text-sm font-medium text-brown-900 dark:text-cream-200">Branch</p>
                      <p className="text-sm text-brown-600 dark:text-cream-400">{session.user.branchName}</p>
                    </div>
                  </div>
                )}

                {session.user.supportGroupName && (
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-brown-600 dark:text-cream-400" />
                    <div>
                      <p className="text-sm font-medium text-brown-900 dark:text-cream-200">Support Group</p>
                      <p className="text-sm text-brown-600 dark:text-cream-400">{session.user.supportGroupName}</p>
                    </div>
                  </div>
                )}

                <Separator className="bg-cream-500 dark:bg-warm-dark-200" />

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-brown-600 dark:text-cream-400" />
                  <div>
                    <p className="text-sm font-medium text-brown-900 dark:text-cream-200">Account Created</p>
                    <p className="text-sm text-brown-600 dark:text-cream-400">
                      {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-brown-600 dark:text-cream-400" />
                  <div>
                    <p className="text-sm font-medium text-brown-900 dark:text-cream-200">Last Activity</p>
                    <p className="text-sm text-brown-600 dark:text-cream-400">
                      {userData?.lastActivity ? new Date(userData.lastActivity).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  )
}