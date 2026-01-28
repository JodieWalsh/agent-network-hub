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

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  MapPinned,
  Info,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
  client_brief_id: string | null; // Link to client brief

  // Step 3: Budget
  budget_amount: number | null;
}

interface ClientBrief {
  id: string;
  brief_name: string;
  client_name: string;
  bedrooms_min: number | null;
  budget_max: number | null;
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

const SESSION_STORAGE_KEY = 'inspection_job_draft_form';

export default function CreateInspectionJob() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [preferredDate1, setPreferredDate1] = useState('');
  const [preferredDate2, setPreferredDate2] = useState('');
  const [preferredDate3, setPreferredDate3] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addressUnknown, setAddressUnknown] = useState(false);
  const [generalAreaLocation, setGeneralAreaLocation] = useState<LocationSuggestion | null>(null);
  const [useBrief, setUseBrief] = useState(false);
  const [clientBriefs, setClientBriefs] = useState<ClientBrief[]>([]);
  const [loadingBriefs, setLoadingBriefs] = useState(false);

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
    client_brief_id: null,
    budget_amount: null,
  });

  // Restore form state from sessionStorage (e.g., after returning from brief creation)
  useEffect(() => {
    const returnedFromBrief = searchParams.get('returnedFromBrief');
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (returnedFromBrief && saved) {
      try {
        const state = JSON.parse(saved);
        if (state.formData) setFormData(state.formData);
        if (state.currentStep) setCurrentStep(state.currentStep);
        if (state.addressUnknown != null) setAddressUnknown(state.addressUnknown);
        if (state.generalAreaLocation) setGeneralAreaLocation(state.generalAreaLocation);
        if (state.selectedLocation) setSelectedLocation(state.selectedLocation);
        if (state.preferredDate1) setPreferredDate1(state.preferredDate1);
        if (state.preferredDate2) setPreferredDate2(state.preferredDate2);
        if (state.preferredDate3) setPreferredDate3(state.preferredDate3);
        if (state.useBrief != null) setUseBrief(state.useBrief);
      } catch (e) {
        console.error('Failed to restore form state:', e);
      }
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  // Fetch user's client briefs on mount
  useEffect(() => {
    if (user) {
      fetchClientBriefs();
    }
  }, [user]);

  const fetchClientBriefs = async () => {
    if (!user) return;

    setLoadingBriefs(true);
    try {
      // Use raw fetch since Supabase client has issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      let accessToken = supabaseKey;
      try {
        const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
        const storedSession = localStorage.getItem(storageKey);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed?.access_token || supabaseKey;
        }
      } catch (e) {}

      const url = `${supabaseUrl}/rest/v1/client_briefs?select=id,brief_name,client_name,bedrooms_min,budget_max&agent_id=eq.${user.id}&order=updated_at.desc`;
      const response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
      }

      const data = await response.json();
      setClientBriefs(data || []);
    } catch (error: any) {
      console.error('Error fetching client briefs:', error);
      toast.error('Failed to load client briefs');
    } finally {
      setLoadingBriefs(false);
    }
  };

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
        // Can proceed if exact address is provided OR if address is unknown but general area is specified
        const hasLocation = addressUnknown
          ? !!generalAreaLocation
          : formData.property_address.length > 0;
        return !!(hasLocation && formData.property_type);
      case 2:
        // Can proceed if urgency is set AND either (scope requirements OR client brief is selected)
        const hasRequirements = useBrief
          ? !!formData.client_brief_id
          : formData.scope_requirements.trim().length > 0;
        return !!(formData.urgency_level && hasRequirements);
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

      // Use general area if address is unknown, otherwise use exact address
      const propertyAddress = addressUnknown
        ? `Area: ${generalAreaLocation?.name || ''}`
        : formData.property_address;

      // Use raw fetch since Supabase client has issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      let accessToken = supabaseKey;
      try {
        const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
        const storedSession = localStorage.getItem(storageKey);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed?.access_token || supabaseKey;
        }
      } catch (e) {}

      const jobData = {
        creator_id: user.id,
        requesting_agent_id: user.id,
        property_address: propertyAddress,
        property_location: addressUnknown && generalAreaLocation
          ? `POINT(${generalAreaLocation.coordinates.lng} ${generalAreaLocation.coordinates.lat})`
          : formData.property_lat && formData.property_lng
            ? `POINT(${formData.property_lng} ${formData.property_lat})`
            : null,
        property_type: formData.property_type,
        property_access_notes: formData.property_access_notes || null,
        urgency_level: formData.urgency_level,
        preferred_inspection_dates: dates.length > 0 ? dates : null,
        scope_requirements: formData.scope_requirements || null,
        special_instructions: formData.special_instructions || null,
        client_brief_id: formData.client_brief_id,
        budget_amount: formData.budget_amount,
        status: 'draft',
      };

      const response = await fetch(`${supabaseUrl}/rest/v1/inspection_jobs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Insert failed: ${response.status}`);
      }

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

      // Use general area if address is unknown, otherwise use exact address
      const propertyAddress = addressUnknown
        ? `Area: ${generalAreaLocation?.name || ''}`
        : formData.property_address;

      // Use raw fetch since Supabase client has issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      let accessToken = supabaseKey;
      try {
        const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
        const storedSession = localStorage.getItem(storageKey);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed?.access_token || supabaseKey;
        }
      } catch (e) {}

      const jobData = {
        creator_id: user.id,
        requesting_agent_id: user.id,
        property_address: propertyAddress,
        property_location: addressUnknown && generalAreaLocation
          ? `POINT(${generalAreaLocation.coordinates.lng} ${generalAreaLocation.coordinates.lat})`
          : formData.property_lat && formData.property_lng
            ? `POINT(${formData.property_lng} ${formData.property_lat})`
            : null,
        property_type: formData.property_type,
        property_access_notes: formData.property_access_notes || null,
        urgency_level: formData.urgency_level,
        preferred_inspection_dates: dates.length > 0 ? dates : null,
        scope_requirements: formData.scope_requirements || null,
        special_instructions: formData.special_instructions || null,
        client_brief_id: formData.client_brief_id,
        budget_amount: formData.budget_amount,
        status: 'open',
        payment_status: 'pending', // Payment collected when poster accepts a bid
      };

      const response = await fetch(`${supabaseUrl}/rest/v1/inspection_jobs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Insert failed: ${response.status}`);
      }

      toast.success('Job posted! Inspectors can now submit bids.');
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
                {/* Address Unknown Checkbox */}
                <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Checkbox
                    id="address-unknown"
                    checked={addressUnknown}
                    onCheckedChange={(checked) => {
                      setAddressUnknown(checked as boolean);
                      if (checked) {
                        // Clear exact address when switching to area mode
                        setSelectedLocation(null);
                        setFormData(prev => ({
                          ...prev,
                          property_address: '',
                          property_lat: null,
                          property_lng: null,
                        }));
                      } else {
                        // Clear general area when switching to exact address
                        setGeneralAreaLocation(null);
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor="address-unknown" className="font-medium cursor-pointer flex items-center gap-2">
                      <MapPinned className="h-4 w-4 text-blue-600" />
                      Exact address not yet confirmed
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check this if you're booking an inspector in advance for properties in a general area
                    </p>
                  </div>
                </div>

                {/* Property Address OR General Area */}
                {!addressUnknown ? (
                  <div className="space-y-2">
                    <Label>Property Address *</Label>
                    <LocationSearch
                      value={selectedLocation}
                      onChange={handleLocationSelected}
                      placeholder="Type to search for exact property address..."
                      types={['address', 'place', 'locality', 'neighborhood', 'postcode']}
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
                ) : (
                  <div className="space-y-2">
                    <Label>General Area *</Label>
                    <LocationSearch
                      value={generalAreaLocation}
                      onChange={setGeneralAreaLocation}
                      placeholder="Search for a suburb or area..."
                      types={['place', 'locality', 'neighborhood']}
                    />
                    {generalAreaLocation && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <MapPinned className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{generalAreaLocation.name}</p>
                          <p className="text-xs text-muted-foreground">{generalAreaLocation.fullName}</p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Search for the suburb or area where you need the inspection.
                    </p>
                  </div>
                )}

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

                {/* Client Brief Option */}
                <div className="flex items-start space-x-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <Checkbox
                    id="use-brief"
                    checked={useBrief}
                    disabled={clientBriefs.length === 0}
                    onCheckedChange={(checked) => {
                      setUseBrief(checked as boolean);
                      if (checked) {
                        // Clear scope requirements when switching to brief mode
                        setFormData(prev => ({ ...prev, scope_requirements: '' }));
                      } else {
                        // Clear brief when switching to manual mode
                        setFormData(prev => ({ ...prev, client_brief_id: null }));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor="use-brief" className={`font-medium cursor-pointer flex items-center gap-2 ${clientBriefs.length === 0 ? 'text-muted-foreground' : ''}`}>
                      <FileText className="h-4 w-4 text-purple-600" />
                      Inspect against client brief requirements
                    </Label>
                    {clientBriefs.length > 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Link this inspection to a client brief. The inspector will evaluate the property against your client's specific requirements.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        You don't have any client briefs yet.{' '}
                        <button
                          type="button"
                          className="text-purple-600 hover:underline"
                          onClick={() => {
                            // Save form state so we can restore it when returning
                            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                              formData,
                              currentStep,
                              addressUnknown,
                              generalAreaLocation,
                              selectedLocation,
                              preferredDate1,
                              preferredDate2,
                              preferredDate3,
                              useBrief,
                            }));
                            navigate('/briefs/new?returnTo=/inspections/jobs/new?returnedFromBrief=1');
                          }}
                        >
                          Create one
                        </button> to link inspections to specific client requirements.
                      </p>
                    )}
                  </div>
                </div>

                {/* Client Brief Selection */}
                {useBrief ? (
                  <div className="space-y-2">
                    <Label>Select Client Brief *</Label>
                    <Select
                      value={formData.client_brief_id || ''}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, client_brief_id: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a client brief..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientBriefs.map((brief) => (
                          <SelectItem key={brief.id} value={brief.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{brief.brief_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {brief.client_name} • {brief.bedrooms_min ? `${brief.bedrooms_min}+ bed` : ''} {brief.budget_max ? `• $${brief.budget_max.toLocaleString()}` : ''}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The inspector will see the full brief requirements and assess whether this property meets them.
                    </p>
                  </div>
                ) : (
                  /* Manual Scope Requirements */
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
                )}

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

                {/* Fee Breakdown - Live Calculation */}
                {formData.budget_amount && formData.budget_amount > 0 && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm font-medium text-emerald-900 mb-3">💰 Fee Breakdown</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-emerald-800">
                        <span>Budget you're offering:</span>
                        <span className="font-semibold">${formData.budget_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 pl-4">
                        <span>├── Inspector receives (90%):</span>
                        <span className="font-medium">${(formData.budget_amount * 0.90).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 pl-4">
                        <span>└── Platform fee (10%):</span>
                        <span className="font-medium">${(formData.budget_amount * 0.10).toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-600 mt-3">
                      Payment is collected when you accept an inspector's bid. Funds are held in escrow until you approve the report. If you cancel before accepting a bid, no charge applies.
                    </p>
                  </div>
                )}
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
                      {addressUnknown ? (
                        <MapPinned className="h-4 w-4 text-blue-600 mt-0.5" />
                      ) : (
                        <MapPin className="h-4 w-4 text-forest mt-0.5" />
                      )}
                      <div className="flex-1">
                        {addressUnknown ? (
                          <>
                            <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700 border-blue-200">
                              General Area Booking
                            </Badge>
                            <p className="text-sm font-medium">{generalAreaLocation?.name}</p>
                            {generalAreaLocation?.fullName && (
                              <p className="text-xs text-muted-foreground">{generalAreaLocation.fullName}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm font-medium">{formData.property_address}</p>
                        )}
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
                    {formData.client_brief_id ? (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Inspection Type:</p>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <FileText className="h-3 w-3 mr-1" />
                          Evaluate against Client Brief
                        </Badge>
                        <p className="text-sm mt-2">
                          <strong>{clientBriefs.find(b => b.id === formData.client_brief_id)?.brief_name}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Inspector will assess property against full brief requirements
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Scope:</p>
                        <p className="text-sm">{formData.scope_requirements}</p>
                      </div>
                    )}
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
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <p className="text-2xl font-semibold text-forest">
                      ${formData.budget_amount?.toLocaleString('en-AU')}
                    </p>
                    <div className="text-sm space-y-1 border-t pt-3">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Inspector receives (90%):</span>
                        <span>${((formData.budget_amount || 0) * 0.90).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Platform fee (10%):</span>
                        <span>${((formData.budget_amount || 0) * 0.10).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">
                      <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>Payment is collected when you accept an inspector's bid. Funds are held in escrow until you approve the report.</span>
                    </div>
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
