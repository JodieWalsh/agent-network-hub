/**
 * CreateInspectionJob.tsx
 *
 * 🎭 THEATRICAL MULTI-STEP JOB POSTING FORM
 *
 * Buyers agents post inspection jobs with:
 * - Property details & location
 * - Inspection requirements & urgency
 * - Budget settings
 * - Review & publish
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationSearch, type LocationSearchProps } from '@/components/location/LocationSearch';
import { type LocationSuggestion } from '@/lib/mapbox-geocoder';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Home,
  Clock,
  FileText,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type UrgencyLevel = 'standard' | 'urgent' | 'express';
type PropertyType = 'house' | 'apartment' | 'townhouse' | 'land' | 'other';
type JobStatus = 'draft' | 'open';

interface JobFormData {
  // Step 1: Property Details
  property_address: string;
  property_lat: number | null;
  property_lng: number | null;
  property_type: PropertyType;
  property_access_notes: string;

  // Step 2: Inspection Details
  urgency_level: UrgencyLevel;
  preferred_inspection_dates: string[]; // ISO date strings
  scope_requirements: string;
  special_instructions: string;

  // Step 3: Budget
  budget_amount: number | null;
}

const STEPS = [
  { id: 1, name: 'Property', icon: Home, description: 'Property details & location' },
  { id: 2, name: 'Requirements', icon: FileText, description: 'Inspection scope & timing' },
  { id: 3, name: 'Budget', icon: DollarSign, description: 'Set your budget' },
  { id: 4, name: 'Review', icon: CheckCircle2, description: 'Review & post' },
];

const URGENCY_OPTIONS = [
  {
    value: 'standard' as UrgencyLevel,
    label: 'Standard',
    description: 'Within 7-14 days',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    value: 'urgent' as UrgencyLevel,
    label: 'Urgent',
    description: 'Within 3-5 days',
    icon: AlertCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    value: 'express' as UrgencyLevel,
    label: 'Express',
    description: 'Within 24-48 hours',
    icon: Zap,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
];

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'land', label: 'Land' },
  { value: 'other', label: 'Other' },
];

export default function CreateInspectionJob() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [preferredDate1, setPreferredDate1] = useState('');
  const [preferredDate2, setPreferredDate2] = useState('');
  const [preferredDate3, setPreferredDate3] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<JobFormData>({
    property_address: '',
    property_lat: null,
    property_lng: null,
    property_type: 'house',
    property_access_notes: '',
    urgency_level: 'standard',
    preferred_inspection_dates: [],
    scope_requirements: '',
    special_instructions: '',
    budget_amount: null,
  });

  const progressPercentage = (currentStep / STEPS.length) * 100;

  const handleLocationSelected = (location: LocationSuggestion | null) => {
    setSelectedLocation(location);
    if (location) {
      setFormData(prev => ({
        ...prev,
        property_address: location.fullName,
        property_lat: location.coordinates.lat,
        property_lng: location.coordinates.lng,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        property_address: '',
        property_lat: null,
        property_lng: null,
      }));
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.property_address && formData.property_type);
      case 2:
        return !!(formData.urgency_level && formData.scope_requirements.trim());
      case 3:
        return formData.budget_amount !== null && formData.budget_amount > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedFromStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSaveDraft = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      // Collect preferred dates
      const dates = [preferredDate1, preferredDate2, preferredDate3].filter(d => d);

      const { error } = await supabase.from('inspection_jobs').insert({
        creator_id: user.id,
        property_address: formData.property_address,
        property_location: formData.property_lat && formData.property_lng
          ? `POINT(${formData.property_lng} ${formData.property_lat})`
          : null,
        property_type: formData.property_type,
        property_access_notes: formData.property_access_notes || null,
        urgency_level: formData.urgency_level,
        preferred_inspection_dates: dates.length > 0 ? dates : null,
        scope_requirements: formData.scope_requirements || null,
        special_instructions: formData.special_instructions || null,
        budget_amount: formData.budget_amount,
        status: 'draft',
      });

      if (error) throw error;

      toast.success('Draft saved! You can finish it later.');
      navigate('/inspections');
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast.error(error.message || 'Failed to save draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostJob = async () => {
    if (!user) return;
    if (!canProceedFromStep(1) || !canProceedFromStep(2) || !canProceedFromStep(3)) {
      toast.error('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Collect preferred dates
      const dates = [preferredDate1, preferredDate2, preferredDate3].filter(d => d);

      const { error } = await supabase.from('inspection_jobs').insert({
        creator_id: user.id,
        property_address: formData.property_address,
        property_location: formData.property_lat && formData.property_lng
          ? `POINT(${formData.property_lng} ${formData.property_lat})`
          : null,
        property_type: formData.property_type,
        property_access_notes: formData.property_access_notes || null,
        urgency_level: formData.urgency_level,
        preferred_inspection_dates: dates.length > 0 ? dates : null,
        scope_requirements: formData.scope_requirements || null,
        special_instructions: formData.special_instructions || null,
        budget_amount: formData.budget_amount,
        status: 'open', // Posted as open!
      });

      if (error) throw error;

      toast.success('🎉 Job posted! Inspectors will start bidding soon.');
      navigate('/inspections/spotlights');
    } catch (error: any) {
      console.error('Error posting job:', error);
      toast.error(error.message || 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-foreground">Post Inspection Job</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Get competitive bids from verified inspectors in your area
          </p>

          {/* Progress Bar */}
          <div className="mt-6">
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between mt-4">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex flex-col items-center gap-2 flex-1',
                      isActive && 'text-forest',
                      isCompleted && 'text-forest/60',
                      !isActive && !isCompleted && 'text-muted-foreground'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                      isActive && 'border-forest bg-forest/10',
                      isCompleted && 'border-forest bg-forest text-white',
                      !isActive && !isCompleted && 'border-border bg-background'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium">{step.name}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={(e) => e.preventDefault()}>

          {/* STEP 1: Property Details */}
          {currentStep === 1 && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-forest" />
                  Property Details
                </CardTitle>
                <CardDescription>
                  Tell us about the property you need inspected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Property Address */}
                <div className="space-y-2">
                  <Label>Property Address *</Label>
                  <LocationSearch
                    value={selectedLocation}
                    onChange={handleLocationSelected}
                    placeholder="Search for property address..."
                    types={['address', 'place']}
                  />
                  {selectedLocation && (
                    <div className="flex items-start gap-2 p-3 bg-forest/5 border border-forest/20 rounded-md">
                      <MapPin className="h-4 w-4 text-forest mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{selectedLocation.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedLocation.fullName}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Property Type */}
                <div className="space-y-2">
                  <Label>Property Type *</Label>
                  <Select
                    value={formData.property_type}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, property_type: val as PropertyType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Property Access Notes */}
                <div className="space-y-2">
                  <Label>Property Access Notes</Label>
                  <Textarea
                    placeholder="e.g., Lockbox code 1234, Contact tenant first, Keys at agent's office..."
                    value={formData.property_access_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, property_access_notes: e.target.value }))}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    How should the inspector access the property?
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Inspection Requirements */}
          {currentStep === 2 && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-forest" />
                  Inspection Requirements
                </CardTitle>
                <CardDescription>
                  Define the scope and timeline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Urgency Level */}
                <div className="space-y-3">
                  <Label>Urgency Level *</Label>
                  <RadioGroup
                    value={formData.urgency_level}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, urgency_level: val as UrgencyLevel }))}
                  >
                    {URGENCY_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <label
                          key={option.value}
                          className={cn(
                            'flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all',
                            formData.urgency_level === option.value
                              ? `${option.borderColor} ${option.bgColor}`
                              : 'border-border bg-background hover:border-forest/30'
                          )}
                        >
                          <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                          <div className="flex items-start gap-3 flex-1">
                            <Icon className={cn('h-5 w-5 mt-0.5', option.color)} />
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{option.label}</p>
                              <p className="text-sm text-muted-foreground">{option.description}</p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>

                {/* Preferred Inspection Dates */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Preferred Inspection Dates (Optional)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Provide up to 3 preferred dates. Inspectors can propose alternatives.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      type="date"
                      value={preferredDate1}
                      onChange={(e) => setPreferredDate1(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <Input
                      type="date"
                      value={preferredDate2}
                      onChange={(e) => setPreferredDate2(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <Input
                      type="date"
                      value={preferredDate3}
                      onChange={(e) => setPreferredDate3(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {/* Scope Requirements */}
                <div className="space-y-2">
                  <Label>Scope of Inspection *</Label>
                  <Textarea
                    placeholder="Describe what needs to be inspected (e.g., Full building & pest inspection, Pre-purchase inspection, Structural assessment...)"
                    value={formData.scope_requirements}
                    onChange={(e) => setFormData(prev => ({ ...prev, scope_requirements: e.target.value }))}
                    rows={4}
                    required
                  />
                </div>

                {/* Special Instructions */}
                <div className="space-y-2">
                  <Label>Special Instructions</Label>
                  <Textarea
                    placeholder="Any special requirements or areas of concern? (e.g., Check roof for water damage, Focus on foundation cracks...)"
                    value={formData.special_instructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Budget */}
          {currentStep === 3 && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-forest" />
                  Set Your Budget
                </CardTitle>
                <CardDescription>
                  What's your budget for this inspection?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Budget Amount (AUD) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="50"
                      placeholder="500"
                      value={formData.budget_amount || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        budget_amount: e.target.value ? parseFloat(e.target.value) : null
                      }))}
                      className="pl-7"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Inspectors will bid at or below this amount. You can always negotiate.
                  </p>
                </div>

                {/* Budget Guidelines */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">💡 Typical Inspection Costs</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Standard Building Inspection: $400-600</li>
                    <li>• Building + Pest Inspection: $600-800</li>
                    <li>• Pre-Purchase Inspection: $500-700</li>
                    <li>• Urgent/Express Service: Add 20-50%</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: Review */}
          {currentStep === 4 && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-forest" />
                  Review Your Job
                </CardTitle>
                <CardDescription>
                  Double-check everything before posting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Property Summary */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground">PROPERTY</h3>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-forest mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{formData.property_address}</p>
                        <Badge variant="outline" className="mt-1">{PROPERTY_TYPES.find(t => t.value === formData.property_type)?.label}</Badge>
                      </div>
                    </div>
                    {formData.property_access_notes && (
                      <p className="text-xs text-muted-foreground pl-6">Access: {formData.property_access_notes}</p>
                    )}
                  </div>
                </div>

                {/* Requirements Summary */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground">REQUIREMENTS</h3>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      {URGENCY_OPTIONS.find(o => o.value === formData.urgency_level)?.icon && (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const option = URGENCY_OPTIONS.find(o => o.value === formData.urgency_level);
                            if (!option) return null;
                            const Icon = option.icon;
                            return (
                              <>
                                <Icon className={cn('h-4 w-4', option.color)} />
                                <Badge className={option.bgColor}>{option.label}</Badge>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Scope:</p>
                      <p className="text-sm">{formData.scope_requirements}</p>
                    </div>
                    {formData.special_instructions && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Special Instructions:</p>
                        <p className="text-sm">{formData.special_instructions}</p>
                      </div>
                    )}
                    {[preferredDate1, preferredDate2, preferredDate3].filter(d => d).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Preferred Dates:</p>
                        <div className="flex flex-wrap gap-2">
                          {[preferredDate1, preferredDate2, preferredDate3].filter(d => d).map((date, idx) => (
                            <Badge key={idx} variant="outline">
                              {new Date(date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Budget Summary */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground">BUDGET</h3>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-semibold text-forest">
                      ${formData.budget_amount?.toLocaleString('en-AU')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Maximum budget for this inspection</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={submitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              {currentStep < STEPS.length ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={submitting || !formData.property_address}
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceedFromStep(currentStep)}
                    className="bg-forest hover:bg-forest/90"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={submitting}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePostJob}
                    disabled={submitting}
                    className="bg-forest hover:bg-forest/90"
                  >
                    {submitting ? 'Posting...' : '🎉 Post Job'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
