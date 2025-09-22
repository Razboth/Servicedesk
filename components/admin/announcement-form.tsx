'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Check, Building } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Type,
  AlertCircle,
  Save,
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  Bold,
  Italic,
  List,
  Link2
} from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().optional(),
  type: z.enum(['GENERAL', 'MAINTENANCE', 'UPDATE', 'ALERT', 'PROMOTION']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isActive: z.boolean(),
  isGlobal: z.boolean(),
  branchIds: z.array(z.string()).optional()
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: 'End date must be after start date',
  path: ['endDate']
}).refine((data) => {
  // If not global, must have at least one branch selected
  if (!data.isGlobal && (!data.branchIds || data.branchIds.length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Please select at least one branch or make it global',
  path: ['branchIds']
});

type FormData = z.infer<typeof announcementSchema>;

interface AnnouncementFormProps {
  announcementId?: string;
}

export default function AnnouncementForm({ announcementId }: AnnouncementFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [useRichText, setUseRichText] = useState(true);
  const [richContent, setRichContent] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [branchSearchOpen, setBranchSearchOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      type: 'GENERAL',
      priority: 'NORMAL',
      isActive: true,
      isGlobal: true,
      branchIds: [],
      startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
    }
  });

  useEffect(() => {
    fetchBranches();
    if (announcementId) {
      fetchAnnouncement();
    }
  }, [announcementId]);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches');
      if (response.ok) {
        const data = await response.json();
        setBranches(data.filter((b: any) => b.isActive));
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchAnnouncement = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/announcements/${announcementId}`);
      if (response.ok) {
        const data = await response.json();
        setValue('title', data.title);
        setValue('content', data.content || '');
        setValue('type', data.type);
        setValue('priority', data.priority);
        setValue('startDate', format(new Date(data.startDate), "yyyy-MM-dd'T'HH:mm"));
        setValue('endDate', format(new Date(data.endDate), "yyyy-MM-dd'T'HH:mm"));
        setValue('isActive', data.isActive);
        setValue('isGlobal', data.isGlobal);
        setRichContent(data.content || '');
        setExistingImages(data.images || []);

        // Load branch selections
        if (data.branches && data.branches.length > 0) {
          const branchIds = data.branches.map((b: any) => b.branchId);
          setSelectedBranches(branchIds);
          setValue('branchIds', branchIds);
        }
      } else {
        toast.error('Failed to fetch announcement');
        router.push('/admin/announcements');
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
      toast.error('Failed to fetch announcement');
      router.push('/admin/announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedImages = [];

    for (const file of Array.from(files)) {
      try {
        // Convert file to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/png;base64,")
            const base64Content = base64.split(',')[1];
            resolve(base64Content);
          };
          reader.onerror = reject;
        });

        reader.readAsDataURL(file);
        const base64Content = await base64Promise;

        // Send as JSON with base64 content
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            content: base64Content
          }),
        });

        if (response.ok) {
          const data = await response.json();
          uploadedImages.push({
            filename: data.filename,
            originalName: data.originalName,
            mimeType: data.mimeType,
            size: data.size,
            path: `/uploads/${data.filename}`, // Add path for consistency
            caption: ''
          });
        } else {
          const error = await response.json();
          toast.error(`Failed to upload ${file.name}: ${error.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setImages([...images, ...uploadedImages]);
    setUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const allImages = [...existingImages, ...images].map((img, index) => ({
        ...img,
        order: index
      }));

      const body = {
        ...data,
        content: useRichText ? richContent : data.content,
        images: allImages,
        branchIds: data.isGlobal ? [] : selectedBranches
      };

      const url = announcementId
        ? `/api/announcements/${announcementId}`
        : '/api/announcements';

      const method = announcementId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(`Announcement ${announcementId ? 'updated' : 'created'} successfully`);
        router.push('/admin/announcements');
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${announcementId ? 'update' : 'create'} announcement`);
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error(`Failed to ${announcementId ? 'update' : 'create'} announcement`);
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { value: 'GENERAL', label: 'General', icon: '📢' },
    { value: 'MAINTENANCE', label: 'Maintenance', icon: '🔧' },
    { value: 'UPDATE', label: 'Update', icon: '🆕' },
    { value: 'ALERT', label: 'Alert', icon: '⚠️' },
    { value: 'PROMOTION', label: 'Promotion', icon: '🎉' }
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Low', color: 'text-slate-600' },
    { value: 'NORMAL', label: 'Normal', color: 'text-blue-600' },
    { value: 'HIGH', label: 'High', color: 'text-orange-600' },
    { value: 'URGENT', label: 'Urgent', color: 'text-red-600' }
  ];

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={announcementId ? 'Edit Announcement' : 'Create Announcement'}
        description={announcementId ? 'Update an existing announcement' : 'Create a new system announcement'}
        action={
          <Button variant="outline" onClick={() => router.push('/admin/announcements')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the announcement details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter announcement title"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={watch('type')}
                    onValueChange={(value: any) => setValue('type', value)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <span>{option.icon}</span>
                            <span>{option.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority *</Label>
                  <Select
                    value={watch('priority')}
                    onValueChange={(value: any) => setValue('priority', value)}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className={option.color}>{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="content">Content</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseRichText(!useRichText)}
                  >
                    {useRichText ? 'Switch to Plain Text' : 'Switch to Rich Text'}
                  </Button>
                </div>
                {useRichText ? (
                  <RichTextEditor
                    content={richContent}
                    onChange={setRichContent}
                    placeholder="Enter announcement content..."
                  />
                ) : (
                  <Textarea
                    id="content"
                    {...register('content')}
                    placeholder="Enter announcement content..."
                    rows={6}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>Set when the announcement should be displayed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date & Time *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    {...register('startDate')}
                    className={errors.startDate ? 'border-red-500' : ''}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.startDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endDate">End Date & Time *</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    {...register('endDate')}
                    className={errors.endDate ? 'border-red-500' : ''}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={watch('isActive')}
                    onCheckedChange={(checked) => setValue('isActive', checked)}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isGlobal"
                    checked={watch('isGlobal')}
                    onCheckedChange={(checked) => {
                      setValue('isGlobal', checked);
                      if (checked) {
                        setSelectedBranches([]);
                        setValue('branchIds', []);
                      }
                    }}
                  />
                  <Label htmlFor="isGlobal">Show to All Branches</Label>
                </div>

                {!watch('isGlobal') && (
                  <div>
                    <Label>Target Branches</Label>
                    <Popover open={branchSearchOpen} onOpenChange={setBranchSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={branchSearchOpen}
                          className="w-full justify-between"
                        >
                          {selectedBranches.length === 0
                            ? "Select branches..."
                            : `${selectedBranches.length} branch${selectedBranches.length > 1 ? 'es' : ''} selected`}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search branches..." />
                          <CommandEmpty>No branch found.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-y-auto">
                            {branches.map((branch) => (
                              <CommandItem
                                key={branch.id}
                                onSelect={() => {
                                  const isSelected = selectedBranches.includes(branch.id);
                                  const newSelection = isSelected
                                    ? selectedBranches.filter((id) => id !== branch.id)
                                    : [...selectedBranches, branch.id];
                                  setSelectedBranches(newSelection);
                                  setValue('branchIds', newSelection);
                                }}
                              >
                                <Checkbox
                                  checked={selectedBranches.includes(branch.id)}
                                  className="mr-2"
                                />
                                <Building className="mr-2 h-4 w-4" />
                                <span>{branch.name}</span>
                                <Badge variant="outline" className="ml-auto">
                                  {branch.code}
                                </Badge>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedBranches.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedBranches.map((branchId) => {
                          const branch = branches.find((b) => b.id === branchId);
                          return branch ? (
                            <Badge key={branchId} variant="secondary">
                              {branch.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    {errors.branchIds && (
                      <p className="text-sm text-red-500 mt-1">{errors.branchIds.message}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>Add images to your announcement (optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Current Images</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {existingImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={`/api/files/${image.filename}`}
                          alt={image.caption || 'Announcement image'}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeExistingImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Images */}
              {images.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">New Images</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={`/api/files/${image.filename}`}
                          alt={image.caption || 'Announcement image'}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Images'}
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/announcements')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : announcementId ? 'Update' : 'Create'} Announcement
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}