/**
 * AdminPropertyReviewModal Component
 *
 * Shows full property details for admin review
 * - All property attributes
 * - Photo gallery
 * - Floor plan
 * - Submission info (who submitted, when)
 * - Approve/Reject actions
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, MapPin, Bed, Bath, Calendar, User, Clock, Image as ImageIcon, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PropertyGallery } from '@/components/marketplace/PropertyGallery';

interface AdminPropertyReviewModalProps {
  propertyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
}

interface FullProperty {
  id: string;
  title: string;
  description: string | null;
  street_address: string | null;
  city: string;
  state: string;
  country: string | null;
  postcode: string | null;
  price: number;
  currency: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  photo_urls: string[] | null;
  floor_plan_url: string | null;
  land_size_sqm: number | null;
  building_size_sqm: number | null;
  year_built: number | null;
  has_pool: boolean | null;
  pool_type: string | null;
  garden_type: string | null;
  architectural_style: string | null;
  has_water_views: boolean | null;
  has_city_views: boolean | null;
  has_mountain_views: boolean | null;
  parking_spaces: number | null;
  parking_type: string | null;
  air_conditioning: string | null;
  heating_type: string | null;
  solar_panels: boolean | null;
  security_system: boolean | null;
  energy_efficiency_rating: number | null;
  submitted_at: string | null;
  owner_id: string;
  owner: {
    full_name: string | null;
    user_type: string | null;
  };
  [key: string]: any; // For other fields
}

export function AdminPropertyReviewModal({
  propertyId,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: AdminPropertyReviewModalProps) {
  const [property, setProperty] = useState<FullProperty | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (propertyId && open) {
      fetchPropertyDetails();
    }
  }, [propertyId, open]);

  const fetchPropertyDetails = async () => {
    if (!propertyId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          owner:profiles!owner_id(full_name, user_type)
        `)
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      setProperty(data as FullProperty);
    } catch (error: any) {
      console.error('Error fetching property:', error);
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!property) return;

    setApproving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', property.id);

      if (error) throw error;

      toast.success('Property approved successfully!');
      onApprove();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error approving property:', error);
      toast.error('Failed to approve property');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectClick = () => {
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!property) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setRejecting(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          approval_status: 'rejected',
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', property.id);

      if (error) throw error;

      toast.success('Property rejected');
      onReject();
      onOpenChange(false);
      setShowRejectDialog(false);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting property:', error);
      toast.error('Failed to reject property');
    } finally {
      setRejecting(false);
    }
  };

  const formatPrice = (price: number, currency?: string | null) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'AUD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLabel = (text: string) => {
    return text.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (!property && !loading) return null;

  return (
    <>
      <Dialog open={open && !showRejectDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading property details...</p>
            </div>
          ) : property ? (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-semibold mb-2">
                      {property.title}
                    </DialogTitle>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin size={14} />
                        <span>
                          {property.street_address && `${property.street_address}, `}
                          {property.city}, {property.state}
                          {property.postcode && ` ${property.postcode}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User size={14} />
                        <span>
                          Submitted by: {property.owner?.full_name || 'Unknown'}
                          ({formatLabel(property.owner?.user_type || '')})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock size={14} />
                        <span>Submitted: {formatDate(property.submitted_at)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-600 text-amber-600">
                    Pending Review
                  </Badge>
                </div>
              </DialogHeader>

              {/* Price and Basic Info */}
              <div className="p-4 bg-forest/5 rounded-lg border border-forest/20">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-forest">
                    {formatPrice(property.price, property.currency)}
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    {property.bedrooms && (
                      <div className="flex items-center gap-1">
                        <Bed size={16} />
                        <span>{property.bedrooms} bed</span>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div className="flex items-center gap-1">
                        <Bath size={16} />
                        <span>{property.bathrooms} bath</span>
                      </div>
                    )}
                    {property.parking_spaces && property.parking_spaces > 0 && (
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>{property.parking_spaces} car</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs for Different Sections */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="photos">
                    <ImageIcon size={16} className="mr-2" />
                    Photos ({property.photo_urls?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="details">Full Details</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {property.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground">{property.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {property.land_size_sqm && (
                      <div>
                        <span className="text-sm text-muted-foreground">Land Size:</span>
                        <p className="font-medium">{property.land_size_sqm} m²</p>
                      </div>
                    )}
                    {property.building_size_sqm && (
                      <div>
                        <span className="text-sm text-muted-foreground">Building Size:</span>
                        <p className="font-medium">{property.building_size_sqm} m²</p>
                      </div>
                    )}
                    {property.year_built && (
                      <div>
                        <span className="text-sm text-muted-foreground">Year Built:</span>
                        <p className="font-medium">{property.year_built}</p>
                      </div>
                    )}
                    {property.architectural_style && (
                      <div>
                        <span className="text-sm text-muted-foreground">Style:</span>
                        <p className="font-medium">{formatLabel(property.architectural_style)}</p>
                      </div>
                    )}
                  </div>

                  {/* Key Features */}
                  <div className="flex flex-wrap gap-2">
                    {property.has_pool && (
                      <Badge variant="secondary">Pool ({property.pool_type})</Badge>
                    )}
                    {property.garden_type && property.garden_type !== 'none' && (
                      <Badge variant="secondary">Garden ({property.garden_type})</Badge>
                    )}
                    {property.has_water_views && <Badge variant="secondary">Water Views</Badge>}
                    {property.has_city_views && <Badge variant="secondary">City Views</Badge>}
                    {property.has_mountain_views && <Badge variant="secondary">Mountain Views</Badge>}
                    {property.solar_panels && <Badge variant="secondary">Solar Panels</Badge>}
                    {property.security_system && <Badge variant="secondary">Security System</Badge>}
                    {property.air_conditioning && property.air_conditioning !== 'none' && (
                      <Badge variant="secondary">Air Con ({property.air_conditioning})</Badge>
                    )}
                  </div>

                  {/* Floor Plan */}
                  {property.floor_plan_url && (
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText size={16} />
                        Floor Plan
                      </h3>
                      <a
                        href={property.floor_plan_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-forest hover:underline"
                      >
                        View Floor Plan →
                      </a>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="photos">
                  {property.photo_urls && property.photo_urls.length > 0 ? (
                    <PropertyGallery photos={property.photo_urls} />
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      No photos uploaded
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="details" className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries(property).map(([key, value]) => {
                      // Skip certain fields
                      if (
                        ['id', 'owner_id', 'owner', 'photo_urls', 'title', 'description', 'approval_status'].includes(key) ||
                        value === null ||
                        value === undefined ||
                        value === '' ||
                        value === false ||
                        (Array.isArray(value) && value.length === 0)
                      ) {
                        return null;
                      }

                      return (
                        <div key={key}>
                          <span className="text-muted-foreground">{formatLabel(key)}:</span>
                          <p className="font-medium">
                            {typeof value === 'boolean' ? 'Yes' :
                             Array.isArray(value) ? value.join(', ') :
                             value.toString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Admin Action Buttons */}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={approving || rejecting}
                >
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                    onClick={handleRejectClick}
                    disabled={approving || rejecting}
                  >
                    <X size={16} className="mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleApprove}
                    disabled={approving || rejecting}
                  >
                    {approving ? (
                      'Approving...'
                    ) : (
                      <>
                        <Check size={16} className="mr-2" />
                        Approve Property
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Property Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection_reason">Rejection Reason</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Property images are unclear, please provide better photos..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejecting}
            >
              {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
