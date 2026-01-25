import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { MapPin, User, Briefcase, Save, Lock, Settings, Shield, Award, CheckCircle2, Clock, AlertCircle, Bell, Mail, Smartphone, MessageSquare, Moon, Crown, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUnits } from "@/contexts/UnitsContext";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { LocationSearch } from "@/components/location/LocationSearch";
import type { LocationSuggestion } from "@/lib/mapbox-geocoder";
import { ServiceAreaManager } from "@/components/profile/ServiceAreaManager";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getRoleLabel, ROLE_PERMISSIONS, type UserRole, type Permission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  createDefaultPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";

const userTypeLabels: Record<string, string> = {
  buyers_agent: "Buyer's Agent",
  real_estate_agent: "Real Estate Agent",
  mortgage_broker: "Mortgage Broker",
  conveyancer: "Conveyancer",
};

const specializationLabels: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  investment: "Investment",
  luxury: "Luxury",
};

const membershipLabels: Record<string, string> = {
  free: "Free Member",
  basic: "Basic Member",
  premium: "Premium Member",
};

const membershipColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  basic: "bg-forest/10 text-forest border-forest/20",
  premium: "bg-rose-gold/20 text-rose-gold border-rose-gold/30",
};

export default function ProfileEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const { unitSystem, setUnitSystem } = useUnits();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Check if this is first-time setup
  const isFirstTimeSetup = location.state?.isFirstTimeSetup === true;

  // Profile state
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [userType, setUserType] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("guest");
  const [approvalStatus, setApprovalStatus] = useState<string>("approved");
  const [professionalAccreditation, setProfessionalAccreditation] = useState("");

  // Location state
  const [homeSuburb, setHomeSuburb] = useState<LocationSuggestion | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
  const [savingNotifications, setSavingNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      // Also fetch notification preferences
      fetchNotificationPreferences(user.id).then((prefs) => {
        if (prefs) {
          setNotificationPrefs(prefs);
        } else {
          // Create default preferences if none exist
          createDefaultPreferences(user.id).then(() => {
            fetchNotificationPreferences(user.id).then(setNotificationPrefs);
          });
        }
      });
    } else if (!authLoading && !user) {
      // Not logged in - redirect to auth
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);


  const fetchProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('🟢 [ProfileEdit] Fetching profile with timeout...');

      // Add timeout wrapper (5 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.log('⏰ [ProfileEdit] Profile fetch timed out');
          reject(new Error('Profile fetch timeout'));
        }, 5000);
      });

      const fetchPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const result = await Promise.race([fetchPromise, timeoutPromise]);
      const { data, error } = result as any;

      if (error) throw error;

      if (data) {
        console.log('✅ [ProfileEdit] Profile loaded successfully');
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setCity(data.city || "");
        setUserType(data.user_type || "");
        setSpecializations(Array.isArray(data.specializations) ? data.specializations : []);
        // Reconstruct LocationSuggestion from stored data
        if (data.home_base_address) {
          setHomeSuburb({
            id: 'stored-suburb',
            name: data.home_base_address,
            fullName: data.home_base_address,
            coordinates: data.latitude && data.longitude
              ? { lat: data.latitude, lng: data.longitude }
              : { lat: 0, lng: 0 },
            placeType: ['place'],
          });
        }
        setAvatarUrl(data.avatar_url || null);
        setRole(data.role || "guest");
        setApprovalStatus(data.approval_status || "approved");
        setProfessionalAccreditation(data.professional_accreditation || "");
      }
    } catch (error) {
      console.error("🔴 [ProfileEdit] Error fetching profile:", error);

      // Try to load from cached profile in localStorage
      try {
        const cachedProfile = localStorage.getItem('cached_profile');
        if (cachedProfile) {
          console.log('📦 [ProfileEdit] Using cached profile');
          const data = JSON.parse(cachedProfile);
          setFullName(data.full_name || "");
          setBio(data.bio || "");
          setCity(data.city || "");
          setUserType(data.user_type || "");
          setSpecializations(Array.isArray(data.specializations) ? data.specializations : []);
          // Reconstruct LocationSuggestion from cached data
          if (data.home_base_address) {
            setHomeSuburb({
              id: 'cached-suburb',
              name: data.home_base_address,
              fullName: data.home_base_address,
              coordinates: data.latitude && data.longitude
                ? { lat: data.latitude, lng: data.longitude }
                : { lat: 0, lng: 0 },
              placeType: ['place'],
            });
          }
          setAvatarUrl(data.avatar_url || null);
          setRole(data.role || "guest");
          setApprovalStatus(data.approval_status || "approved");
          setProfessionalAccreditation(data.professional_accreditation || "");
        } else {
          toast.error("Failed to load profile");
        }
      } catch (cacheError) {
        console.error("🔴 [ProfileEdit] Failed to load cached profile:", cacheError);
        toast.error("Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSpecializationToggle = (spec: string) => {
    setSpecializations((prev) =>
      prev.includes(spec)
        ? prev.filter((s) => s !== spec)
        : [...prev, spec]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to update your profile");
      navigate("/auth");
      return;
    }

    setSaving(true);

    try {
      // Extract coordinates from suburb selection
      const latitude = homeSuburb?.coordinates?.lat || null;
      const longitude = homeSuburb?.coordinates?.lng || null;
      const suburbName = homeSuburb?.fullName || null;

      // Build the update object
      const updateData: Record<string, any> = {
        full_name: fullName || null,
        bio: bio || null,
        city: city || null,
        specializations: specializations.length > 0 ? specializations : null,
        home_base_address: suburbName,
        latitude,
        longitude,
        professional_accreditation: professionalAccreditation || null,
      };

      // If user is a guest and submitting professional accreditation,
      // change their status to pending_professional for admin review
      if (role === 'guest' && professionalAccreditation && professionalAccreditation.trim()) {
        updateData.role = 'pending_professional';
        updateData.approval_status = 'pending';
        updateData.application_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;

      // Update local state if role changed
      if (updateData.role) {
        setRole(updateData.role);
        setApprovalStatus('pending');
        toast.success("Profile updated! Your professional credentials have been submitted for review.");
      } else {
        toast.success("Profile updated successfully!");
      }

      // Redirect first-time users to dashboard after saving
      if (isFirstTimeSetup) {
        navigate('/');
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationPrefChange = async (key: keyof NotificationPreferences, value: boolean | string) => {
    if (!user || !notificationPrefs) return;

    const updatedPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(updatedPrefs);

    // Auto-save notification preferences
    setSavingNotifications(true);
    try {
      await updateNotificationPreferences(user.id, { [key]: value });
    } catch (error) {
      console.error("Error saving notification preference:", error);
      toast.error("Failed to save notification preference");
      // Revert on error
      setNotificationPrefs(notificationPrefs);
    } finally {
      setSavingNotifications(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to change your password");
      return;
    }

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("Password update error:", error);
        throw error;
      }

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast.success("Password updated successfully!");
    } catch (error: any) {
      console.error("Error changing password:", error);
      const errorMessage = error?.message || "Failed to change password. Please try again.";
      toast.error(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || authLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-8 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-2/3 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-10 bg-muted rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* First-time setup welcome banner */}
        {isFirstTimeSetup && (
          <Card className="border-forest bg-forest/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold text-forest">
                  Welcome to Buyers Agent Hub!
                </h2>
                <p className="text-muted-foreground">
                  Let's set up your profile so other agents can find and connect with you.
                  Please add your photo, service areas, and professional details below.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-rose-gold" />
                <CardTitle>Personal Information</CardTitle>
              </div>
              <CardDescription>
                Your basic profile information visible to other users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex justify-center py-4">
                <AvatarUpload
                  currentAvatarUrl={avatarUrl}
                  userId={user!.id}
                  onUploadSuccess={(url) => setAvatarUrl(url)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell others about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length}/500 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <LocationSearch
                  value={city ? { id: 'city', name: city, fullName: city, coordinates: { lat: 0, lng: 0 }, placeType: ['place'] } : null}
                  onChange={(location) => setCity(location?.name || '')}
                  placeholder="Search for your city..."
                  types={['place', 'region']}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location Settings */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-rose-gold" />
                <CardTitle>Location Settings</CardTitle>
              </div>
              <CardDescription>
                Set your suburb and service areas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Suburb</Label>
                <LocationSearch
                  value={homeSuburb}
                  onChange={setHomeSuburb}
                  placeholder="Search for your suburb..."
                  types={['place', 'locality']}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the suburb where you're based. This helps other agents find you.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Service Areas - New Location System */}
          {user && <ServiceAreaManager userId={user.id} />}

          {/* Professional Information */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-rose-gold" />
                <CardTitle>Professional Information</CardTitle>
              </div>
              <CardDescription>
                Your professional details and specialization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Professional Type</Label>
                <Input
                  value={userTypeLabels[userType] || userType}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Professional type cannot be changed after registration
                </p>
              </div>

              <div className="space-y-2">
                <Label>Specializations (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {Object.entries(specializationLabels).map(([value, label]) => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`spec-${value}`}
                        checked={specializations.includes(value)}
                        onCheckedChange={() => handleSpecializationToggle(value)}
                      />
                      <Label
                        htmlFor={`spec-${value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
                {specializations.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {specializations.length} specialization{specializations.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Profile */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-rose-gold" />
                <CardTitle>Security Profile</CardTitle>
              </div>
              <CardDescription>
                Your current access level and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {role === 'admin' && <Shield className="h-6 w-6 text-purple-600" />}
                  {role !== 'admin' && approvalStatus === 'approved' && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                  {role !== 'admin' && approvalStatus === 'pending' && <Clock className="h-6 w-6 text-amber-600" />}
                  {role !== 'admin' && approvalStatus === 'rejected' && <AlertCircle className="h-6 w-6 text-red-600" />}
                  {role !== 'admin' && !approvalStatus && <AlertCircle className="h-6 w-6 text-blue-600" />}
                  <div>
                    <p className="font-semibold">
                      {role === 'admin'
                        ? 'Administrator'
                        : `${userTypeLabels[userType] || userType || 'Member'}${
                            approvalStatus === 'approved' ? ' (Verified)' :
                            approvalStatus === 'pending' ? ' (Unverified)' :
                            approvalStatus === 'rejected' ? ' (Rejected)' : ''
                          }`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {role === 'admin' && 'Full administrative access'}
                      {role !== 'admin' && approvalStatus === 'approved' && 'Verified professional with full platform access'}
                      {role !== 'admin' && approvalStatus === 'pending' && 'Awaiting verification - submit credentials below'}
                      {role !== 'admin' && approvalStatus === 'rejected' && 'Verification rejected - please resubmit credentials'}
                      {role !== 'admin' && !approvalStatus && 'Submit credentials below to get verified'}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={approvalStatus === 'approved' || role === 'admin' ? 'default' : 'secondary'}
                  className={
                    role === 'admin' ? 'bg-purple-600' :
                    approvalStatus === 'approved' ? 'bg-green-600' :
                    approvalStatus === 'pending' ? 'bg-amber-500' :
                    approvalStatus === 'rejected' ? 'bg-red-500' :
                    'bg-blue-500'
                  }
                >
                  {approvalStatus === 'approved' ? 'Verified' :
                   approvalStatus === 'pending' ? 'Pending' :
                   approvalStatus === 'rejected' ? 'Rejected' :
                   role === 'admin' ? 'Admin' : 'Unverified'}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">What you can do:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_PERMISSIONS[role]?.map((permission) => (
                    <div key={permission} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">
                        {permission.replace('CAN_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Membership */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-gold" />
                <CardTitle>Membership</CardTitle>
              </div>
              <CardDescription>
                Your current subscription plan and benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {(authProfile?.subscription_tier === 'premium') && (
                    <Crown className="h-6 w-6 text-rose-gold" />
                  )}
                  {(authProfile?.subscription_tier === 'basic') && (
                    <Sparkles className="h-6 w-6 text-forest" />
                  )}
                  {(!authProfile?.subscription_tier || authProfile?.subscription_tier === 'free') && (
                    <Sparkles className="h-6 w-6 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {membershipLabels[authProfile?.subscription_tier || 'free']}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {authProfile?.subscription_tier === 'premium' && 'Full access to all premium features'}
                      {authProfile?.subscription_tier === 'basic' && 'Enhanced features for professionals'}
                      {(!authProfile?.subscription_tier || authProfile?.subscription_tier === 'free') && 'Limited access - upgrade for more features'}
                    </p>
                  </div>
                </div>
                <Badge
                  className={cn(
                    "border",
                    membershipColors[authProfile?.subscription_tier || 'free']
                  )}
                >
                  {(authProfile?.subscription_tier === 'premium') && <Crown className="w-3 h-3 mr-1" />}
                  {membershipLabels[authProfile?.subscription_tier || 'free']}
                </Badge>
              </div>

              <div className="flex gap-2">
                {authProfile?.subscription_tier && authProfile.subscription_tier !== 'free' ? (
                  <Link to="/settings/billing" className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                      Manage Subscription
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/pricing" className="flex-1">
                    <Button className="w-full gap-2 bg-forest hover:bg-forest/90 text-white">
                      <Sparkles className="h-4 w-4" />
                      Upgrade Your Plan
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Accreditation */}
          {(role === 'guest' || role === 'pending_professional') && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  <CardTitle>Professional Accreditation</CardTitle>
                </div>
                <CardDescription>
                  Submit your professional credentials to unlock full platform features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-amber-300 bg-amber-100">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Once submitted, your accreditation will be reviewed within 24 hours. You'll be notified when your professional status is verified.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="accreditation">Professional Credentials & Licenses</Label>
                  <Textarea
                    id="accreditation"
                    placeholder="Please provide your professional accreditation details, including:
• License numbers (e.g., Real Estate Agent License #12345)
• Professional body memberships (e.g., REBAA, REIQ)
• Years of experience
• Any other relevant certifications"
                    value={professionalAccreditation}
                    onChange={(e) => setProfessionalAccreditation(e.target.value)}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide as much detail as possible to speed up the verification process
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preferences */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-rose-gold" />
                <CardTitle>Preferences</CardTitle>
              </div>
              <CardDescription>
                Customize your display preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Distance & Measurement Units</Label>
                <RadioGroup
                  value={unitSystem}
                  onValueChange={(value) => setUnitSystem(value as 'metric' | 'imperial')}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="metric" id="metric" />
                    <Label htmlFor="metric" className="flex-1 cursor-pointer">
                      <span className="font-medium">Metric</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        (km, m², °C)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="imperial" id="imperial" />
                    <Label htmlFor="imperial" className="flex-1 cursor-pointer">
                      <span className="font-medium">Imperial</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        (mi, sq ft, °F)
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  This affects how distances and property sizes are displayed throughout the app
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button for Profile */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-rose-gold hover:bg-rose-gold/90 text-forest font-semibold gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>

        {/* Notification Preferences */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-rose-gold" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
            <CardDescription>
              Control how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* In-App Notifications Note */}
            <div className="p-4 bg-forest/5 rounded-lg border border-forest/20">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-forest mt-0.5" />
                <div>
                  <p className="font-medium text-forest">In-App Notifications</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You'll always receive notifications within the app. Use the bell icon in the sidebar to check your latest updates.
                  </p>
                </div>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Email Notifications</h4>
              </div>

              {notificationPrefs && (
                <div className="space-y-3 pl-6">
                  {/* Master Toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">Enable email notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive important updates via email
                      </p>
                    </div>
                    <Switch
                      checked={notificationPrefs.email_enabled}
                      onCheckedChange={(checked) => handleNotificationPrefChange('email_enabled', checked)}
                      disabled={savingNotifications}
                    />
                  </div>

                  {/* Individual Email Toggles */}
                  {notificationPrefs.email_enabled && (
                    <div className="space-y-2 border-l-2 border-border pl-4 ml-2">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm">New bids on your jobs</span>
                        <Switch
                          checked={notificationPrefs.email_bid_received}
                          onCheckedChange={(checked) => handleNotificationPrefChange('email_bid_received', checked)}
                          disabled={savingNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm">Bid accepted</span>
                        <Switch
                          checked={notificationPrefs.email_bid_accepted}
                          onCheckedChange={(checked) => handleNotificationPrefChange('email_bid_accepted', checked)}
                          disabled={savingNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm">Bid declined</span>
                        <Switch
                          checked={notificationPrefs.email_bid_declined}
                          onCheckedChange={(checked) => handleNotificationPrefChange('email_bid_declined', checked)}
                          disabled={savingNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm">Report submitted</span>
                        <Switch
                          checked={notificationPrefs.email_report_submitted}
                          onCheckedChange={(checked) => handleNotificationPrefChange('email_report_submitted', checked)}
                          disabled={savingNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm">Payment released</span>
                        <Switch
                          checked={notificationPrefs.email_payment_released}
                          onCheckedChange={(checked) => handleNotificationPrefChange('email_payment_released', checked)}
                          disabled={savingNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm">Reviews received</span>
                        <Switch
                          checked={notificationPrefs.email_review_received}
                          onCheckedChange={(checked) => handleNotificationPrefChange('email_review_received', checked)}
                          disabled={savingNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm">Badges earned</span>
                        <Switch
                          checked={notificationPrefs.email_badge_earned}
                          onCheckedChange={(checked) => handleNotificationPrefChange('email_badge_earned', checked)}
                          disabled={savingNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm">Weekly activity digest</span>
                        <Switch
                          checked={notificationPrefs.email_weekly_digest}
                          onCheckedChange={(checked) => handleNotificationPrefChange('email_weekly_digest', checked)}
                          disabled={savingNotifications}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Push Notifications - Coming Soon */}
            <div className="space-y-4 opacity-50">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Push Notifications</h4>
                <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Browser and mobile push notifications will be available in a future update. Stay tuned!
                </p>
              </div>
            </div>

            {/* SMS Notifications - Coming Soon */}
            <div className="space-y-4 opacity-50">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">SMS Notifications</h4>
                <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Text message alerts for critical updates will be available in a future update.
                </p>
              </div>
            </div>

            {/* Quiet Hours */}
            {notificationPrefs && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">Quiet Hours</h4>
                </div>
                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">Enable quiet hours</p>
                      <p className="text-sm text-muted-foreground">
                        Pause email notifications during set hours
                      </p>
                    </div>
                    <Switch
                      checked={notificationPrefs.quiet_hours_enabled}
                      onCheckedChange={(checked) => handleNotificationPrefChange('quiet_hours_enabled', checked)}
                      disabled={savingNotifications}
                    />
                  </div>

                  {notificationPrefs.quiet_hours_enabled && (
                    <div className="grid grid-cols-2 gap-4 border-l-2 border-border pl-4 ml-2">
                      <div className="space-y-2">
                        <Label htmlFor="quietStart" className="text-sm">Start time</Label>
                        <Input
                          id="quietStart"
                          type="time"
                          value={notificationPrefs.quiet_hours_start || '22:00'}
                          onChange={(e) => handleNotificationPrefChange('quiet_hours_start', e.target.value)}
                          disabled={savingNotifications}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quietEnd" className="text-sm">End time</Label>
                        <Input
                          id="quietEnd"
                          type="time"
                          value={notificationPrefs.quiet_hours_end || '07:00'}
                          onChange={(e) => handleNotificationPrefChange('quiet_hours_end', e.target.value)}
                          disabled={savingNotifications}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Change Section */}
        <form onSubmit={handlePasswordChange}>
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-rose-gold" />
                <CardTitle>Change Password</CardTitle>
              </div>
              <CardDescription>
                Update your account password for security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={changingPassword}
                  variant="outline"
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {changingPassword ? "Changing Password..." : "Change Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
