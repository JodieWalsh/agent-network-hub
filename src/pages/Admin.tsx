import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Home, BarChart3, Settings, Check, X, Clock, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RoleBadge } from '@/components/ui/role-badge';

interface PendingUser {
  id: string;
  full_name: string | null;
  user_type: string;
  role: string;
  approval_status: string;
  application_date: string | null;
  city: string | null;
}

interface PendingProperty {
  id: string;
  title: string;
  city: string;
  state: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  submitted_at: string | null;
  owner_id: string;
  owner: {
    full_name: string | null;
  };
}

interface Stats {
  totalUsers: number;
  totalProperties: number;
  pendingUsers: number;
  pendingProperties: number;
  verifiedProfessionals: number;
}

export default function Admin() {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingProperties, setPendingProperties] = useState<PendingProperty[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProperties: 0,
    pendingUsers: 0,
    pendingProperties: 0,
    verifiedProfessionals: 0,
  });
  const [loading, setLoading] = useState(true);

  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectType, setRejectType] = useState<'user' | 'property'>('user');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchPendingUsers(), fetchPendingProperties(), fetchStats()]);
    setLoading(false);
  };

  const fetchPendingUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, user_type, role, approval_status, application_date, city')
      .eq('role', 'pending_professional')
      .eq('approval_status', 'pending')
      .order('application_date', { ascending: false });

    if (!error && data) {
      setPendingUsers(data);
    }
  };

  const fetchPendingProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        id,
        title,
        city,
        state,
        price,
        bedrooms,
        bathrooms,
        submitted_at,
        owner_id,
        owner:profiles!owner_id(full_name)
      `)
      .eq('approval_status', 'pending')
      .order('submitted_at', { ascending: false });

    if (!error && data) {
      setPendingProperties(data as any);
    }
  };

  const fetchStats = async () => {
    const [usersResult, propertiesResult, pendingUsersResult, pendingPropsResult, verifiedResult] =
      await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'pending_professional')
          .eq('approval_status', 'pending'),
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('approval_status', 'pending'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'verified_professional'),
      ]);

    setStats({
      totalUsers: usersResult.count || 0,
      totalProperties: propertiesResult.count || 0,
      pendingUsers: pendingUsersResult.count || 0,
      pendingProperties: pendingPropsResult.count || 0,
      verifiedProfessionals: verifiedResult.count || 0,
    });
  };

  const approveUser = async (userId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        role: 'verified_professional',
        approval_status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      toast.error('Failed to approve user');
    } else {
      toast.success('User approved successfully');
      fetchData();
    }
  };

  const openRejectDialog = (type: 'user' | 'property', id: string) => {
    setRejectType(type);
    setRejectId(id);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!user || !rejectId) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    if (rejectType === 'user') {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'guest',
          approval_status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', rejectId);

      if (error) {
        toast.error('Failed to reject user');
      } else {
        toast.success('User application rejected');
        setRejectDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('properties')
        .update({
          approval_status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', rejectId);

      if (error) {
        toast.error('Failed to reject property');
      } else {
        toast.success('Property rejected');
        setRejectDialogOpen(false);
        fetchData();
      }
    }
  };

  const approveProperty = async (propertyId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('properties')
      .update({
        approval_status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', propertyId);

    if (error) {
      toast.error('Failed to approve property');
    } else {
      toast.success('Property approved successfully');
      fetchData();
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getUserTypeLabel = (userType: string) => {
    const labels: Record<string, string> = {
      buyers_agent: 'Buyers Agent',
      selling_agent: 'Selling Agent',
      real_estate_agent: 'Real Estate Agent',
      conveyancer: 'Conveyancer',
      mortgage_broker: 'Mortgage Broker',
      stylist: 'Stylist',
      building_inspector: 'Building Inspector',
      pest_control: 'Pest Control Inspector',
    };
    return labels[userType] || userType;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, properties, and platform settings</p>
        </div>

        <Tabs defaultValue="pending-users" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending-users" className="gap-2">
              <Users size={16} />
              Pending Users
              {stats.pendingUsers > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {stats.pendingUsers}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending-properties" className="gap-2">
              <Home size={16} />
              Pending Properties
              {stats.pendingProperties > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {stats.pendingProperties}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 size={16} />
              Platform Stats
            </TabsTrigger>
            <TabsTrigger value="all-users" className="gap-2">
              <Settings size={16} />
              All Users
            </TabsTrigger>
          </TabsList>

          {/* Pending Users Tab */}
          <TabsContent value="pending-users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Professional Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : pendingUsers.length === 0 ? (
                  <p className="text-muted-foreground">No pending applications</p>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border border-border rounded-md"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">
                              {user.full_name || 'Unnamed User'}
                            </h3>
                            <Badge variant="outline" className="border-amber-600 text-amber-600">
                              <Clock size={12} className="mr-1" />
                              Pending
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>User Type: {getUserTypeLabel(user.user_type)}</p>
                            <p>Location: {user.city || 'Not specified'}</p>
                            <p>Applied: {formatDate(user.application_date)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                            onClick={() => approveUser(user.id)}
                          >
                            <Check size={16} className="mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-600 hover:bg-red-50"
                            onClick={() => openRejectDialog('user', user.id)}
                          >
                            <X size={16} className="mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Properties Tab */}
          <TabsContent value="pending-properties" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Property Listings</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : pendingProperties.length === 0 ? (
                  <p className="text-muted-foreground">No pending properties</p>
                ) : (
                  <div className="space-y-4">
                    {pendingProperties.map((property) => (
                      <div
                        key={property.id}
                        className="flex items-center justify-between p-4 border border-border rounded-md"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{property.title}</h3>
                            <Badge variant="outline" className="border-amber-600 text-amber-600">
                              <Clock size={12} className="mr-1" />
                              Pending
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              Location: {property.city}, {property.state}
                            </p>
                            <p>Price: {formatPrice(property.price)}</p>
                            {(property.bedrooms || property.bathrooms) && (
                              <p>
                                {property.bedrooms && `${property.bedrooms} bed`}
                                {property.bedrooms && property.bathrooms && ' • '}
                                {property.bathrooms && `${property.bathrooms} bath`}
                              </p>
                            )}
                            <p>
                              Submitted by: {property.owner?.full_name || 'Unknown'} on{' '}
                              {formatDate(property.submitted_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                            onClick={() => approveProperty(property.id)}
                          >
                            <Check size={16} className="mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-600 hover:bg-red-50"
                            onClick={() => openRejectDialog('property', property.id)}
                          >
                            <X size={16} className="mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Stats Tab */}
          <TabsContent value="stats" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="text-forest" size={20} />
                    <p className="text-3xl font-semibold">{stats.totalUsers}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Verified Professionals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <UserCheck className="text-green-600" size={20} />
                    <p className="text-3xl font-semibold">{stats.verifiedProfessionals}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending User Approvals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="text-amber-600" size={20} />
                    <p className="text-3xl font-semibold">{stats.pendingUsers}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Home className="text-forest" size={20} />
                    <p className="text-3xl font-semibold">{stats.totalProperties}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending Property Approvals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="text-amber-600" size={20} />
                    <p className="text-3xl font-semibold">{stats.pendingProperties}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Users Tab */}
          <TabsContent value="all-users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Coming soon: Comprehensive user management table</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reject {rejectType === 'user' ? 'User Application' : 'Property Listing'}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will help the{' '}
              {rejectType === 'user' ? 'user understand why their application was rejected' : 'property owner understand what needs to be fixed'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection_reason">Rejection Reason</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={
                  rejectType === 'user'
                    ? 'e.g., Unable to verify professional credentials...'
                    : 'e.g., Property images are unclear, please provide better photos...'
                }
                rows={4}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
