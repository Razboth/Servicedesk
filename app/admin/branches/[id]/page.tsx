'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Building2, 
  ArrowLeft, 
  Users, 
  Ticket, 
  CreditCard,
  User,
  Mail
} from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(100),
  code: z.string().min(1, 'Branch code is required').max(20),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  isActive: z.boolean().default(true)
});

type FormData = z.infer<typeof formSchema>;

interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  province?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    tickets: number;
    atms: number;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  atms: Array<{
    id: string;
    code: string;
    name: string;
    location: string;
  }>;
}

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      province: '',
      isActive: true
    }
  });

  useEffect(() => {
    fetchBranch();
  }, [branchId]);

  const fetchBranch = async () => {
    try {
      const response = await fetch(`/api/admin/branches/${branchId}`);
      if (!response.ok) throw new Error('Failed to fetch branch');

      const data = await response.json();
      setBranch(data);
      
      // Update form with branch data
      form.reset({
        name: data.name,
        code: data.code,
        address: data.address || '',
        city: data.city || '',
        province: data.province || '',
        isActive: data.isActive
      });
    } catch (error) {
      console.error('Error fetching branch:', error);
      toast.error('Failed to load branch details');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/admin/branches/${branchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update branch');
      }

      toast.success('Branch updated successfully');
      router.push('/admin/branches');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update branch');
    } finally {
      setLoading(false);
    }
  };

  if (!branch) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
        <div className="text-center">Loading branch details...</div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/branches">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Branches
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Edit Branch
            </h1>
            <p className="text-gray-600 mt-1">Update branch information and manage users</p>
          </div>
          <Badge variant={branch.isActive ? 'success' : 'secondary'} className="text-lg px-4 py-2">
            {branch.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{branch._count.users}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{branch._count.tickets}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Total ATMs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{branch._count.atms}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="details">Branch Details</TabsTrigger>
          <TabsTrigger value="users">Users ({branch._count.users})</TabsTrigger>
          <TabsTrigger value="atms">ATMs ({branch._count.atms})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Branch Information</CardTitle>
                  <CardDescription>
                    Update the branch details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch Code</FormLabel>
                        <FormControl>
                          <Input {...field} disabled />
                        </FormControl>
                        <FormDescription>
                          Branch code cannot be changed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <FormDescription>
                            Deactivating will prevent new operations for this branch
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Link href="/admin/branches">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Branch'}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Branch Users</CardTitle>
              <CardDescription>
                Recent users assigned to this branch
              </CardDescription>
            </CardHeader>
            <CardContent>
              {branch.users.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No users assigned to this branch</p>
              ) : (
                <div className="space-y-4">
                  {branch.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <Badge>{user.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 text-center">
                <Link href={`/admin/branches/${branchId}/users`}>
                  <Button variant="outline">View All Users</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atms">
          <Card>
            <CardHeader>
              <CardTitle>Branch ATMs</CardTitle>
              <CardDescription>
                ATMs assigned to this branch
              </CardDescription>
            </CardHeader>
            <CardContent>
              {branch.atms.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No ATMs assigned to this branch</p>
              ) : (
                <div className="space-y-4">
                  {branch.atms.map((atm) => (
                    <div key={atm.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{atm.name}</p>
                          <p className="text-sm text-gray-500">Code: {atm.code}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{atm.location}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 text-center">
                <Link href={`/admin/atms?branch=${branchId}`}>
                  <Button variant="outline">View All ATMs</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}