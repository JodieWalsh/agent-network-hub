import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, MapPin, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mockGeocode, mockAutocomplete } from "@/lib/geocoder";
import { useAuth } from "@/contexts/AuthContext";
import { CurrencyCode, CURRENCY_SYMBOLS } from "@/lib/currency";

const serviceTypes = [
  { value: "video_walkthrough", label: "Video Walkthrough" },
  { value: "photo_inspection", label: "Photo Inspection" },
  { value: "auction_bidding", label: "Auction Bidding" },
  { value: "contract_collection", label: "Contract Collection" },
  { value: "property_assessment", label: "Property Assessment" },
  { value: "open_home_attendance", label: "Open Home Attendance" },
];

const currencyOptions: CurrencyCode[] = ['AUD', 'USD', 'GBP', 'EUR', 'NZD', 'CAD'];

export default function PostInspection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("AUD");
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (propertyAddress.length >= 2) {
        const suggestions = await mockAutocomplete(propertyAddress);
        setAddressSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [propertyAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to post an inspection request");
      navigate("/auth");
      return;
    }

    if (!title || !propertyAddress || !serviceType || !budget || !deadline) {
      toast.error("Please fill in all required fields");
      return;
    }

    const budgetCents = Math.round(parseFloat(budget) * 100);
    if (isNaN(budgetCents) || budgetCents < 1000) {
      toast.error("Budget must be at least $10");
      return;
    }

    setLoading(true);

    try {
      // Geocode the address
      const geocodeResult = await mockGeocode(propertyAddress);
      
      const { error } = await supabase.from("inspection_requests").insert({
        requester_id: user.id,
        title,
        property_address: propertyAddress,
        latitude: geocodeResult?.coordinates.lat || null,
        longitude: geocodeResult?.coordinates.lng || null,
        service_type: serviceType as "video_walkthrough" | "photo_inspection" | "auction_bidding" | "contract_collection" | "property_assessment" | "open_home_attendance",
        description: description || null,
        budget: budgetCents,
        currency_code: currency,
        deadline: deadline.toISOString().split("T")[0],
        status: "open" as const,
      });

      if (error) throw error;

      toast.success("Inspection request posted successfully!");
      navigate("/inspections");
    } catch (error) {
      console.error("Error posting inspection request:", error);
      toast.error("Failed to post inspection request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/inspections")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Button>

        {/* Form Card */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl font-display">
              Post Inspection Request
            </CardTitle>
            <CardDescription>
              Create a job listing to find help with property inspections in your area
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Video Walkthrough for 3BR House"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              {/* Property Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Property Address *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder="Enter property address"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
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
                            setPropertyAddress(suggestion);
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

              {/* Service Type */}
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type *</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Provide additional details about the job..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/500 characters
                </p>
              </div>

              {/* Budget and Deadline Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Currency */}
                <div className="space-y-2">
                  <Label>Currency *</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((code) => (
                        <SelectItem key={code} value={code}>
                          {CURRENCY_SYMBOLS[code]} {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {CURRENCY_SYMBOLS[currency]}
                    </span>
                    <Input
                      id="budget"
                      type="number"
                      min="10"
                      step="5"
                      placeholder="150"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Deadline */}
                <div className="space-y-2">
                  <Label>Deadline *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !deadline && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deadline ? format(deadline, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={deadline}
                        onSelect={setDeadline}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/inspections")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-rose-gold hover:bg-rose-gold/90 text-forest font-semibold"
                >
                  {loading ? "Posting..." : "Post Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
