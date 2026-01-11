import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { MapPin, User, Briefcase, Save, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { mockGeocode, mockAutocomplete } from "@/lib/geocoder";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { ServiceAreaManager } from "@/components/profile/ServiceAreaManager";

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

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [userType, setUserType] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Location state
  const [homeBaseAddress, setHomeBaseAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else if (!authLoading && !user) {
      // Not logged in - redirect to auth
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (homeBaseAddress.length >= 2) {
        const suggestions = await mockAutocomplete(homeBaseAddress);
        setAddressSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [homeBaseAddress]);

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
        setHomeBaseAddress(data.home_base_address || "");
        setAvatarUrl(data.avatar_url || null);
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
          setHomeBaseAddress(data.home_base_address || "");
          setAvatarUrl(data.avatar_url || null);
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
      // Geocode the home base address
      let latitude = null;
      let longitude = null;
      
      if (homeBaseAddress) {
        const geocodeResult = await mockGeocode(homeBaseAddress);
        if (geocodeResult) {
          latitude = geocodeResult.coordinates.lat;
          longitude = geocodeResult.coordinates.lng;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          bio: bio || null,
          city: city || null,
          specializations: specializations.length > 0 ? specializations : null,
          home_base_address: homeBaseAddress || null,
          latitude,
          longitude,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
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
                <Input
                  id="city"
                  placeholder="e.g., Sydney"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
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
                Set your office location and service areas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="homeBase">Home Base (Office Address)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="homeBase"
                    placeholder="Enter your office address"
                    value={homeBaseAddress}
                    onChange={(e) => setHomeBaseAddress(e.target.value)}
                    onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                    className="pl-10"
                  />
                  {showSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-elegant overflow-hidden">
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setHomeBaseAddress(suggestion);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-accent/50 transition-colors flex items-center gap-2"
                        >
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
