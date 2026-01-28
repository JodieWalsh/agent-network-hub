import { useState, useEffect, FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Save } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BriefLocationManager, type BriefLocation } from "@/components/client-brief/BriefLocationManager";

type Priority = "must_have" | "important" | "nice_to_have" | "dont_care";

interface BriefFormData {
  client_name: string;
  brief_name: string;
  description: string;
  budget_min: string;
  budget_max: string;
  bedrooms_min: string;
  bedrooms_max: string;
  bathrooms_min: string;
  bathrooms_max: string;
  preferred_suburbs: string[];
  expiry_date: string;

  // Property Size
  land_size_min_sqm: string;
  land_size_min_priority: Priority;
  building_size_min_sqm: string;
  building_size_min_priority: Priority;

  // Pool
  pool_required: boolean;
  pool_priority: Priority;
  pool_min_length_m: string;

  // Garden
  garden_required: boolean;
  garden_priority: Priority;
  garden_min_size_sqm: string;

  // Architecture
  architectural_styles: string[];
  architectural_style_priority: Priority;
  min_ceiling_height_m: string;
  ceiling_height_priority: Priority;
  preferred_light_directions: string[];
  light_direction_priority: Priority;
  natural_light_importance: Priority;

  // Views
  water_views_required: boolean;
  water_views_priority: Priority;
  city_views_required: boolean;
  city_views_priority: Priority;
  mountain_views_required: boolean;
  mountain_views_priority: Priority;
  park_views_required: boolean;
  park_views_priority: Priority;

  // Parking
  min_parking_spaces: string;
  parking_priority: Priority;
  garage_required: boolean;
  garage_priority: Priority;

  // Storage
  storage_required: boolean;
  storage_priority: Priority;
  min_storage_size_sqm: string;

  // Climate
  air_conditioning_required: boolean;
  air_conditioning_priority: Priority;
  preferred_ac_types: string[];
  heating_required: boolean;
  heating_priority: Priority;
  preferred_heating_types: string[];

  // Outdoor
  outdoor_entertaining_required: boolean;
  outdoor_entertaining_priority: Priority;
  min_outdoor_area_sqm: string;
  balcony_terrace_required: boolean;
  balcony_priority: Priority;

  // Security
  security_system_required: boolean;
  security_priority: Priority;
  required_security_features: string[];

  // Sustainability
  solar_panels_required: boolean;
  solar_priority: Priority;
  min_energy_rating: string;
  energy_rating_priority: Priority;
  required_sustainable_features: string[];
  sustainability_priority: Priority;

  // Kitchen
  kitchen_styles: string[];
  kitchen_style_priority: Priority;
  required_kitchen_features: string[];
  kitchen_features_priority: Priority;

  // Bathrooms
  min_ensuite_bathrooms: string;
  ensuite_priority: Priority;
  required_bathroom_features: string[];
  bathroom_features_priority: Priority;

  // Condition
  acceptable_conditions: string[];
  condition_priority: Priority;
  max_year_built: string;
  year_built_priority: Priority;
  renovation_acceptable: boolean;

  // Smart Home
  smart_home_required: boolean;
  smart_home_priority: Priority;
  required_smart_features: string[];

  // Lifestyle
  walkability_min_score: string;
  walkability_priority: Priority;
  max_noise_level: string;
  noise_priority: Priority;
  max_street_traffic: string;
  traffic_priority: Priority;
  min_privacy_level: string;
  privacy_priority: Priority;

  // Investment
  min_rental_yield: string;
  rental_yield_priority: Priority;
  max_council_rates_annual: string;
  max_strata_fees_quarterly: string;

  // Flooring
  preferred_flooring_types: string[];
  flooring_priority: Priority;
  flooring_specific_notes: string;

  // Additional
  additional_notes: string;
  deal_breakers: string;
  flexibility_notes: string;
}

const initialFormData: BriefFormData = {
  client_name: "",
  brief_name: "",
  description: "",
  budget_min: "",
  budget_max: "",
  bedrooms_min: "",
  bedrooms_max: "",
  bathrooms_min: "",
  bathrooms_max: "",
  preferred_suburbs: [],
  expiry_date: "",
  land_size_min_sqm: "",
  land_size_min_priority: "dont_care",
  building_size_min_sqm: "",
  building_size_min_priority: "dont_care",
  pool_required: false,
  pool_priority: "dont_care",
  pool_min_length_m: "",
  garden_required: false,
  garden_priority: "dont_care",
  garden_min_size_sqm: "",
  architectural_styles: [],
  architectural_style_priority: "dont_care",
  min_ceiling_height_m: "",
  ceiling_height_priority: "dont_care",
  preferred_light_directions: [],
  light_direction_priority: "dont_care",
  natural_light_importance: "dont_care",
  water_views_required: false,
  water_views_priority: "dont_care",
  city_views_required: false,
  city_views_priority: "dont_care",
  mountain_views_required: false,
  mountain_views_priority: "dont_care",
  park_views_required: false,
  park_views_priority: "dont_care",
  min_parking_spaces: "",
  parking_priority: "dont_care",
  garage_required: false,
  garage_priority: "dont_care",
  storage_required: false,
  storage_priority: "dont_care",
  min_storage_size_sqm: "",
  air_conditioning_required: false,
  air_conditioning_priority: "dont_care",
  preferred_ac_types: [],
  heating_required: false,
  heating_priority: "dont_care",
  preferred_heating_types: [],
  outdoor_entertaining_required: false,
  outdoor_entertaining_priority: "dont_care",
  min_outdoor_area_sqm: "",
  balcony_terrace_required: false,
  balcony_priority: "dont_care",
  security_system_required: false,
  security_priority: "dont_care",
  required_security_features: [],
  solar_panels_required: false,
  solar_priority: "dont_care",
  min_energy_rating: "",
  energy_rating_priority: "dont_care",
  required_sustainable_features: [],
  sustainability_priority: "dont_care",
  kitchen_styles: [],
  kitchen_style_priority: "dont_care",
  required_kitchen_features: [],
  kitchen_features_priority: "dont_care",
  min_ensuite_bathrooms: "",
  ensuite_priority: "dont_care",
  required_bathroom_features: [],
  bathroom_features_priority: "dont_care",
  acceptable_conditions: [],
  condition_priority: "dont_care",
  max_year_built: "",
  year_built_priority: "dont_care",
  renovation_acceptable: false,
  smart_home_required: false,
  smart_home_priority: "dont_care",
  required_smart_features: [],
  walkability_min_score: "",
  walkability_priority: "dont_care",
  max_noise_level: "",
  noise_priority: "dont_care",
  max_street_traffic: "",
  traffic_priority: "dont_care",
  min_privacy_level: "",
  privacy_priority: "dont_care",
  min_rental_yield: "",
  rental_yield_priority: "dont_care",
  max_council_rates_annual: "",
  max_strata_fees_quarterly: "",
  preferred_flooring_types: [],
  flooring_priority: "dont_care",
  flooring_specific_notes: "",
  additional_notes: "",
  deal_breakers: "",
  flexibility_notes: "",
};

export default function ClientBriefForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<BriefFormData>(initialFormData);
  const [briefLocations, setBriefLocations] = useState<BriefLocation[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["basic", "locations"]));
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!id);

  const isEditMode = !!id;

  // Fetch existing brief if editing
  useEffect(() => {
    if (id && user) {
      fetchBrief();
    }
  }, [id, user]);

  const fetchBrief = async () => {
    if (!id || !user) return;

    try {
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

      const response = await fetch(
        `${supabaseUrl}/rest/v1/client_briefs?select=*&id=eq.${id}&agent_id=eq.${user.id}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.pgrst.object+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
      }

      const data = await response.json();

      if (data) {
        // Populate form with existing data
        setFormData({
          client_name: data.client_name || "",
          brief_name: data.brief_name || "",
          description: data.description || "",
          budget_min: data.budget_min?.toString() || "",
          budget_max: data.budget_max?.toString() || "",
          bedrooms_min: data.bedrooms_min?.toString() || "",
          bedrooms_max: data.bedrooms_max?.toString() || "",
          bathrooms_min: data.bathrooms_min?.toString() || "",
          bathrooms_max: data.bathrooms_max?.toString() || "",
          preferred_suburbs: data.preferred_suburbs || [],
          expiry_date: data.expiry_date || "",
          land_size_min_sqm: data.land_size_min_sqm?.toString() || "",
          land_size_min_priority: data.land_size_min_priority || "dont_care",
          building_size_min_sqm: data.building_size_min_sqm?.toString() || "",
          building_size_min_priority: data.building_size_min_priority || "dont_care",
          pool_required: data.pool_required || false,
          pool_priority: data.pool_priority || "dont_care",
          pool_min_length_m: data.pool_min_length_m?.toString() || "",
          garden_required: data.garden_required || false,
          garden_priority: data.garden_priority || "dont_care",
          garden_min_size_sqm: data.garden_min_size_sqm?.toString() || "",
          architectural_styles: data.architectural_styles || [],
          architectural_style_priority: data.architectural_style_priority || "dont_care",
          min_ceiling_height_m: data.min_ceiling_height_m?.toString() || "",
          ceiling_height_priority: data.ceiling_height_priority || "dont_care",
          preferred_light_directions: data.preferred_light_directions || [],
          light_direction_priority: data.light_direction_priority || "dont_care",
          natural_light_importance: data.natural_light_importance || "dont_care",
          water_views_required: data.water_views_required || false,
          water_views_priority: data.water_views_priority || "dont_care",
          city_views_required: data.city_views_required || false,
          city_views_priority: data.city_views_priority || "dont_care",
          mountain_views_required: data.mountain_views_required || false,
          mountain_views_priority: data.mountain_views_priority || "dont_care",
          park_views_required: data.park_views_required || false,
          park_views_priority: data.park_views_priority || "dont_care",
          min_parking_spaces: data.min_parking_spaces?.toString() || "",
          parking_priority: data.parking_priority || "dont_care",
          garage_required: data.garage_required || false,
          garage_priority: data.garage_priority || "dont_care",
          storage_required: data.storage_required || false,
          storage_priority: data.storage_priority || "dont_care",
          min_storage_size_sqm: data.min_storage_size_sqm?.toString() || "",
          air_conditioning_required: data.air_conditioning_required || false,
          air_conditioning_priority: data.air_conditioning_priority || "dont_care",
          preferred_ac_types: data.preferred_ac_types || [],
          heating_required: data.heating_required || false,
          heating_priority: data.heating_priority || "dont_care",
          preferred_heating_types: data.preferred_heating_types || [],
          outdoor_entertaining_required: data.outdoor_entertaining_required || false,
          outdoor_entertaining_priority: data.outdoor_entertaining_priority || "dont_care",
          min_outdoor_area_sqm: data.min_outdoor_area_sqm?.toString() || "",
          balcony_terrace_required: data.balcony_terrace_required || false,
          balcony_priority: data.balcony_priority || "dont_care",
          security_system_required: data.security_system_required || false,
          security_priority: data.security_priority || "dont_care",
          required_security_features: data.required_security_features || [],
          solar_panels_required: data.solar_panels_required || false,
          solar_priority: data.solar_priority || "dont_care",
          min_energy_rating: data.min_energy_rating?.toString() || "",
          energy_rating_priority: data.energy_rating_priority || "dont_care",
          required_sustainable_features: data.required_sustainable_features || [],
          sustainability_priority: data.sustainability_priority || "dont_care",
          kitchen_styles: data.kitchen_styles || [],
          kitchen_style_priority: data.kitchen_style_priority || "dont_care",
          required_kitchen_features: data.required_kitchen_features || [],
          kitchen_features_priority: data.kitchen_features_priority || "dont_care",
          min_ensuite_bathrooms: data.min_ensuite_bathrooms?.toString() || "",
          ensuite_priority: data.ensuite_priority || "dont_care",
          required_bathroom_features: data.required_bathroom_features || [],
          bathroom_features_priority: data.bathroom_features_priority || "dont_care",
          acceptable_conditions: data.acceptable_conditions || [],
          condition_priority: data.condition_priority || "dont_care",
          max_year_built: data.max_year_built?.toString() || "",
          year_built_priority: data.year_built_priority || "dont_care",
          renovation_acceptable: data.renovation_acceptable || false,
          smart_home_required: data.smart_home_required || false,
          smart_home_priority: data.smart_home_priority || "dont_care",
          required_smart_features: data.required_smart_features || [],
          walkability_min_score: data.walkability_min_score?.toString() || "",
          walkability_priority: data.walkability_priority || "dont_care",
          max_noise_level: data.max_noise_level || "",
          noise_priority: data.noise_priority || "dont_care",
          max_street_traffic: data.max_street_traffic || "",
          traffic_priority: data.traffic_priority || "dont_care",
          min_privacy_level: data.min_privacy_level || "",
          privacy_priority: data.privacy_priority || "dont_care",
          min_rental_yield: data.min_rental_yield?.toString() || "",
          rental_yield_priority: data.rental_yield_priority || "dont_care",
          max_council_rates_annual: data.max_council_rates_annual?.toString() || "",
          max_strata_fees_quarterly: data.max_strata_fees_quarterly?.toString() || "",
          preferred_flooring_types: data.preferred_flooring_types || [],
          flooring_priority: data.flooring_priority || "dont_care",
          flooring_specific_notes: data.flooring_specific_notes || "",
          additional_notes: data.additional_notes || "",
          deal_breakers: data.deal_breakers || "",
          flexibility_notes: data.flexibility_notes || "",
        });
      }
    } catch (error) {
      console.error("Error fetching brief:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load brief for editing.",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      console.log('[ClientBriefForm] Testing database connection...');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      console.log('[ClientBriefForm] Supabase URL:', supabaseUrl);
      console.log('[ClientBriefForm] Key exists:', !!supabaseKey);
      const testStart = Date.now();

      // Get access token from localStorage (bypass broken Supabase client)
      let accessToken = supabaseKey;
      try {
        const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
        const storedSession = localStorage.getItem(storageKey);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed?.access_token || supabaseKey;
          console.log('[ClientBriefForm] Got access token from localStorage');
        }
      } catch (e) {
        console.log('[ClientBriefForm] Using anon key (no stored session)');
      }

      // Convert form data to database format
      const briefData = {
        agent_id: user.id,
        client_name: formData.client_name,
        brief_name: formData.brief_name,
        description: formData.description || null,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        bedrooms_min: formData.bedrooms_min ? parseInt(formData.bedrooms_min) : null,
        bedrooms_max: formData.bedrooms_max ? parseInt(formData.bedrooms_max) : null,
        bathrooms_min: formData.bathrooms_min ? parseInt(formData.bathrooms_min) : null,
        bathrooms_max: formData.bathrooms_max ? parseInt(formData.bathrooms_max) : null,
        preferred_suburbs: formData.preferred_suburbs,
        expiry_date: formData.expiry_date || null,
        land_size_min_sqm: formData.land_size_min_sqm ? parseFloat(formData.land_size_min_sqm) : null,
        land_size_min_priority: formData.land_size_min_priority,
        building_size_min_sqm: formData.building_size_min_sqm ? parseFloat(formData.building_size_min_sqm) : null,
        building_size_min_priority: formData.building_size_min_priority,
        pool_required: formData.pool_required,
        pool_priority: formData.pool_priority,
        pool_min_length_m: formData.pool_min_length_m ? parseFloat(formData.pool_min_length_m) : null,
        garden_required: formData.garden_required,
        garden_priority: formData.garden_priority,
        garden_min_size_sqm: formData.garden_min_size_sqm ? parseFloat(formData.garden_min_size_sqm) : null,
        architectural_styles: formData.architectural_styles,
        architectural_style_priority: formData.architectural_style_priority,
        min_ceiling_height_m: formData.min_ceiling_height_m ? parseFloat(formData.min_ceiling_height_m) : null,
        ceiling_height_priority: formData.ceiling_height_priority,
        preferred_light_directions: formData.preferred_light_directions,
        light_direction_priority: formData.light_direction_priority,
        natural_light_importance: formData.natural_light_importance,
        water_views_required: formData.water_views_required,
        water_views_priority: formData.water_views_priority,
        city_views_required: formData.city_views_required,
        city_views_priority: formData.city_views_priority,
        mountain_views_required: formData.mountain_views_required,
        mountain_views_priority: formData.mountain_views_priority,
        park_views_required: formData.park_views_required,
        park_views_priority: formData.park_views_priority,
        min_parking_spaces: formData.min_parking_spaces ? parseInt(formData.min_parking_spaces) : null,
        parking_priority: formData.parking_priority,
        garage_required: formData.garage_required,
        garage_priority: formData.garage_priority,
        storage_required: formData.storage_required,
        storage_priority: formData.storage_priority,
        min_storage_size_sqm: formData.min_storage_size_sqm ? parseFloat(formData.min_storage_size_sqm) : null,
        air_conditioning_required: formData.air_conditioning_required,
        air_conditioning_priority: formData.air_conditioning_priority,
        preferred_ac_types: formData.preferred_ac_types,
        heating_required: formData.heating_required,
        heating_priority: formData.heating_priority,
        preferred_heating_types: formData.preferred_heating_types,
        outdoor_entertaining_required: formData.outdoor_entertaining_required,
        outdoor_entertaining_priority: formData.outdoor_entertaining_priority,
        min_outdoor_area_sqm: formData.min_outdoor_area_sqm ? parseFloat(formData.min_outdoor_area_sqm) : null,
        balcony_terrace_required: formData.balcony_terrace_required,
        balcony_priority: formData.balcony_priority,
        security_system_required: formData.security_system_required,
        security_priority: formData.security_priority,
        required_security_features: formData.required_security_features,
        solar_panels_required: formData.solar_panels_required,
        solar_priority: formData.solar_priority,
        min_energy_rating: formData.min_energy_rating ? parseFloat(formData.min_energy_rating) : null,
        energy_rating_priority: formData.energy_rating_priority,
        required_sustainable_features: formData.required_sustainable_features,
        sustainability_priority: formData.sustainability_priority,
        kitchen_styles: formData.kitchen_styles,
        kitchen_style_priority: formData.kitchen_style_priority,
        required_kitchen_features: formData.required_kitchen_features,
        kitchen_features_priority: formData.kitchen_features_priority,
        min_ensuite_bathrooms: formData.min_ensuite_bathrooms ? parseInt(formData.min_ensuite_bathrooms) : null,
        ensuite_priority: formData.ensuite_priority,
        required_bathroom_features: formData.required_bathroom_features,
        bathroom_features_priority: formData.bathroom_features_priority,
        acceptable_conditions: formData.acceptable_conditions,
        condition_priority: formData.condition_priority,
        max_year_built: formData.max_year_built ? parseInt(formData.max_year_built) : null,
        year_built_priority: formData.year_built_priority,
        renovation_acceptable: formData.renovation_acceptable,
        smart_home_required: formData.smart_home_required,
        smart_home_priority: formData.smart_home_priority,
        required_smart_features: formData.required_smart_features,
        walkability_min_score: formData.walkability_min_score ? parseInt(formData.walkability_min_score) : null,
        walkability_priority: formData.walkability_priority,
        max_noise_level: formData.max_noise_level || null,
        noise_priority: formData.noise_priority,
        max_street_traffic: formData.max_street_traffic || null,
        traffic_priority: formData.traffic_priority,
        min_privacy_level: formData.min_privacy_level || null,
        privacy_priority: formData.privacy_priority,
        min_rental_yield: formData.min_rental_yield ? parseFloat(formData.min_rental_yield) : null,
        rental_yield_priority: formData.rental_yield_priority,
        max_council_rates_annual: formData.max_council_rates_annual ? parseFloat(formData.max_council_rates_annual) : null,
        max_strata_fees_quarterly: formData.max_strata_fees_quarterly ? parseFloat(formData.max_strata_fees_quarterly) : null,
        preferred_flooring_types: formData.preferred_flooring_types,
        flooring_priority: formData.flooring_priority,
        additional_notes: formData.additional_notes || null,
        deal_breakers: formData.deal_breakers || null,
        flexibility_notes: formData.flexibility_notes || null,
      };

      // Use raw fetch since Supabase client has issues
      const startTime = Date.now();
      let savedBrief;

      if (isEditMode && id) {
        // UPDATE existing brief
        console.log('[ClientBriefForm] Starting update via fetch...', { id, brief_name: formData.brief_name });

        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/client_briefs?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(briefData),
        });

        console.log(`[ClientBriefForm] Update completed in ${Date.now() - startTime}ms, status: ${updateResponse.status}`);

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('Update error details:', errorText);
          throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`);
        }

        const updatedBriefs = await updateResponse.json();
        savedBrief = Array.isArray(updatedBriefs) ? updatedBriefs[0] : updatedBriefs;
      } else {
        // INSERT new brief
        console.log('[ClientBriefForm] Starting insert via fetch...', { agent_id: user.id, brief_name: formData.brief_name });

        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/client_briefs`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(briefData),
        });

        console.log(`[ClientBriefForm] Insert completed in ${Date.now() - startTime}ms, status: ${insertResponse.status}`);

        if (!insertResponse.ok) {
          const errorText = await insertResponse.text();
          console.error('Insert error details:', errorText);
          throw new Error(`Insert failed: ${insertResponse.status} - ${errorText}`);
        }

        const createdBriefs = await insertResponse.json();
        savedBrief = Array.isArray(createdBriefs) ? createdBriefs[0] : createdBriefs;
      }

      // Save locations if any were added (also using raw fetch)
      if (briefLocations.length > 0 && savedBrief) {
        const locationInserts = briefLocations.map(location => ({
          brief_id: savedBrief.id,
          location_name: location.location_name,
          center_point: `POINT(${location.longitude} ${location.latitude})`,
          radius_km: location.radius_km,
          priority_tier: location.priority_tier,
          city: location.city || null,
          state: location.state || null,
          country_code: location.country_code || null,
          suburb: location.suburb || null,
        }));

        const locationsResponse = await fetch(`${supabaseUrl}/rest/v1/client_brief_locations`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(locationInserts),
        });

        if (!locationsResponse.ok) {
          console.error("Error saving locations:", await locationsResponse.text());
          // Don't fail the whole operation, just warn
          toast({
            variant: "destructive",
            title: "Warning",
            description: "Brief created but some locations could not be saved.",
          });
        }
      }

      toast({
        title: isEditMode ? "Brief Updated" : "Brief Created",
        description: "Client brief has been saved successfully.",
      });

      const returnTo = searchParams.get('returnTo');
      navigate(returnTo || "/briefs");
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} brief:`, error);
      const isTimeout = error?.message?.includes('timed out');
      toast({
        variant: "destructive",
        title: isTimeout ? "Request Timeout" : "Error",
        description: isTimeout
          ? "The database took too long to respond. This can happen if the database was idle. Please try again."
          : `Failed to ${isEditMode ? 'update' : 'create'} client brief. Please try again.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const PrioritySelector = ({ value, onChange }: { value: Priority; onChange: (value: Priority) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="must_have">Must Have</SelectItem>
        <SelectItem value="important">Important</SelectItem>
        <SelectItem value="nice_to_have">Nice to Have</SelectItem>
        <SelectItem value="dont_care">Don't Care</SelectItem>
      </SelectContent>
    </Select>
  );

  const SectionHeader = ({ title, section }: { title: string; section: string }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg"
    >
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {expandedSections.has(section) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">{isEditMode ? 'Edit Client Brief' : 'Create Client Brief'}</h1>
          <p className="text-sm text-muted-foreground">
            {isEditMode ? 'Update the property requirements for your client.' : 'Define detailed property requirements for your client with priority levels for each attribute.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <SectionHeader title="Basic Information" section="basic" />
            {expandedSections.has("basic") && (
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_name">Client Name *</Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="brief_name">Brief Name *</Label>
                    <Input
                      id="brief_name"
                      value={formData.brief_name}
                      onChange={(e) => setFormData({ ...formData, brief_name: e.target.value })}
                      placeholder="e.g., Family Home - North Shore"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief overview of client requirements"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    When should this brief expire? Leave blank for no expiry.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget_min">Budget Min ($)</Label>
                    <Input
                      id="budget_min"
                      type="number"
                      value={formData.budget_min}
                      onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                      placeholder="1000000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="budget_max">Budget Max ($)</Label>
                    <Input
                      id="budget_max"
                      type="number"
                      value={formData.budget_max}
                      onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                      placeholder="1500000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="bedrooms_min">Bedrooms Min</Label>
                    <Input
                      id="bedrooms_min"
                      type="number"
                      value={formData.bedrooms_min}
                      onChange={(e) => setFormData({ ...formData, bedrooms_min: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bedrooms_max">Bedrooms Max</Label>
                    <Input
                      id="bedrooms_max"
                      type="number"
                      value={formData.bedrooms_max}
                      onChange={(e) => setFormData({ ...formData, bedrooms_max: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms_min">Bathrooms Min</Label>
                    <Input
                      id="bathrooms_min"
                      type="number"
                      value={formData.bathrooms_min}
                      onChange={(e) => setFormData({ ...formData, bathrooms_min: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms_max">Bathrooms Max</Label>
                    <Input
                      id="bathrooms_max"
                      type="number"
                      value={formData.bathrooms_max}
                      onChange={(e) => setFormData({ ...formData, bathrooms_max: e.target.value })}
                    />
                  </div>
                </div>

              </CardContent>
            )}
          </Card>

          {/* Location Preferences */}
          <Card>
            <SectionHeader title="Location Preferences" section="locations" />
            {expandedSections.has("locations") && (
              <CardContent className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Add your client's preferred locations with priorities. You can set must-have areas, nice-to-have options, and exclude specific areas.
                </p>
                <BriefLocationManager
                  locations={briefLocations}
                  onChange={setBriefLocations}
                />
              </CardContent>
            )}
          </Card>

          {/* Property Size */}
          <Card>
            <SectionHeader title="Property Size" section="size" />
            {expandedSections.has("size") && (
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="land_size_min">Min Land Size (sqm)</Label>
                    <Input
                      id="land_size_min"
                      type="number"
                      value={formData.land_size_min_sqm}
                      onChange={(e) => setFormData({ ...formData, land_size_min_sqm: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.land_size_min_priority}
                      onChange={(value) => setFormData({ ...formData, land_size_min_priority: value })}
                    />
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="building_size_min">Min Building Size (sqm)</Label>
                    <Input
                      id="building_size_min"
                      type="number"
                      value={formData.building_size_min_sqm}
                      onChange={(e) => setFormData({ ...formData, building_size_min_sqm: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.building_size_min_priority}
                      onChange={(value) => setFormData({ ...formData, building_size_min_priority: value })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Pool */}
          <Card>
            <SectionHeader title="Pool" section="pool" />
            {expandedSections.has("pool") && (
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pool_required"
                      checked={formData.pool_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, pool_required: checked as boolean })}
                    />
                    <Label htmlFor="pool_required">Pool Required</Label>
                  </div>
                  <PrioritySelector
                    value={formData.pool_priority}
                    onChange={(value) => setFormData({ ...formData, pool_priority: value })}
                  />
                </div>

                <div>
                  <Label htmlFor="pool_min_length">Min Pool Length (m)</Label>
                  <Input
                    id="pool_min_length"
                    type="number"
                    value={formData.pool_min_length_m}
                    onChange={(e) => setFormData({ ...formData, pool_min_length_m: e.target.value })}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Garden & Outdoor */}
          <Card>
            <SectionHeader title="Garden & Outdoor" section="garden" />
            {expandedSections.has("garden") && (
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="garden_required"
                      checked={formData.garden_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, garden_required: checked as boolean })}
                    />
                    <Label htmlFor="garden_required">Garden Required</Label>
                  </div>
                  <PrioritySelector
                    value={formData.garden_priority}
                    onChange={(value) => setFormData({ ...formData, garden_priority: value })}
                  />
                </div>

                <div>
                  <Label htmlFor="garden_min_size">Min Garden Size (sqm)</Label>
                  <Input
                    id="garden_min_size"
                    type="number"
                    value={formData.garden_min_size_sqm}
                    onChange={(e) => setFormData({ ...formData, garden_min_size_sqm: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="outdoor_entertaining"
                      checked={formData.outdoor_entertaining_required}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, outdoor_entertaining_required: checked as boolean })
                      }
                    />
                    <Label htmlFor="outdoor_entertaining">Outdoor Entertaining Area</Label>
                  </div>
                  <PrioritySelector
                    value={formData.outdoor_entertaining_priority}
                    onChange={(value) => setFormData({ ...formData, outdoor_entertaining_priority: value })}
                  />
                </div>

                <div>
                  <Label htmlFor="outdoor_area_size">Min Outdoor Area Size (sqm)</Label>
                  <Input
                    id="outdoor_area_size"
                    type="number"
                    value={formData.min_outdoor_area_sqm}
                    onChange={(e) => setFormData({ ...formData, min_outdoor_area_sqm: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="balcony"
                      checked={formData.balcony_terrace_required}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, balcony_terrace_required: checked as boolean })
                      }
                    />
                    <Label htmlFor="balcony">Balcony/Terrace</Label>
                  </div>
                  <PrioritySelector
                    value={formData.balcony_priority}
                    onChange={(value) => setFormData({ ...formData, balcony_priority: value })}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Architecture & Interior */}
          <Card>
            <SectionHeader title="Architecture & Interior" section="architecture" />
            {expandedSections.has("architecture") && (
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label>Architectural Styles</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "modern", label: "Modern" },
                      { value: "contemporary", label: "Contemporary" },
                      { value: "traditional", label: "Traditional" },
                      { value: "victorian", label: "Victorian" },
                      { value: "federation", label: "Federation" },
                      { value: "art_deco", label: "Art Deco" },
                      { value: "mediterranean", label: "Mediterranean" },
                      { value: "hamptons", label: "Hamptons" },
                      { value: "industrial", label: "Industrial" },
                      { value: "mid_century", label: "Mid-Century" },
                    ].map((style) => (
                      <div key={style.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`arch_${style.value}`}
                          checked={formData.architectural_styles.includes(style.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, architectural_styles: [...formData.architectural_styles, style.value] });
                            } else {
                              setFormData({ ...formData, architectural_styles: formData.architectural_styles.filter((s) => s !== style.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`arch_${style.value}`} className="font-normal cursor-pointer">{style.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <PrioritySelector
                      value={formData.architectural_style_priority}
                      onChange={(value) => setFormData({ ...formData, architectural_style_priority: value })}
                    />
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="ceiling_height">Min Ceiling Height (m)</Label>
                    <Input
                      id="ceiling_height"
                      type="number"
                      step="0.1"
                      value={formData.min_ceiling_height_m}
                      onChange={(e) => setFormData({ ...formData, min_ceiling_height_m: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.ceiling_height_priority}
                      onChange={(value) => setFormData({ ...formData, ceiling_height_priority: value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Preferred Light Directions</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "north", label: "North" },
                      { value: "south", label: "South" },
                      { value: "east", label: "East" },
                      { value: "west", label: "West" },
                      { value: "north_east", label: "North-East" },
                      { value: "north_west", label: "North-West" },
                      { value: "south_east", label: "South-East" },
                      { value: "south_west", label: "South-West" },
                    ].map((dir) => (
                      <div key={dir.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`light_${dir.value}`}
                          checked={formData.preferred_light_directions.includes(dir.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, preferred_light_directions: [...formData.preferred_light_directions, dir.value] });
                            } else {
                              setFormData({ ...formData, preferred_light_directions: formData.preferred_light_directions.filter((d) => d !== dir.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`light_${dir.value}`} className="font-normal cursor-pointer">{dir.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <PrioritySelector
                      value={formData.light_direction_priority}
                      onChange={(value) => setFormData({ ...formData, light_direction_priority: value })}
                    />
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label>Natural Light Importance</Label>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.natural_light_importance}
                      onChange={(value) => setFormData({ ...formData, natural_light_importance: value })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Views */}
          <Card>
            <SectionHeader title="Views" section="views" />
            {expandedSections.has("views") && (
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      id="water_views"
                      checked={formData.water_views_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, water_views_required: checked as boolean })}
                    />
                    <Label htmlFor="water_views">Water Views</Label>
                  </div>
                  <PrioritySelector
                    value={formData.water_views_priority}
                    onChange={(value) => setFormData({ ...formData, water_views_priority: value })}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      id="city_views"
                      checked={formData.city_views_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, city_views_required: checked as boolean })}
                    />
                    <Label htmlFor="city_views">City Views</Label>
                  </div>
                  <PrioritySelector
                    value={formData.city_views_priority}
                    onChange={(value) => setFormData({ ...formData, city_views_priority: value })}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      id="mountain_views"
                      checked={formData.mountain_views_required}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, mountain_views_required: checked as boolean })
                      }
                    />
                    <Label htmlFor="mountain_views">Mountain Views</Label>
                  </div>
                  <PrioritySelector
                    value={formData.mountain_views_priority}
                    onChange={(value) => setFormData({ ...formData, mountain_views_priority: value })}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      id="park_views"
                      checked={formData.park_views_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, park_views_required: checked as boolean })}
                    />
                    <Label htmlFor="park_views">Park Views</Label>
                  </div>
                  <PrioritySelector
                    value={formData.park_views_priority}
                    onChange={(value) => setFormData({ ...formData, park_views_priority: value })}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Parking & Storage */}
          <Card>
            <SectionHeader title="Parking & Storage" section="parking" />
            {expandedSections.has("parking") && (
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="parking_spaces">Min Parking Spaces</Label>
                    <Input
                      id="parking_spaces"
                      type="number"
                      value={formData.min_parking_spaces}
                      onChange={(e) => setFormData({ ...formData, min_parking_spaces: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.parking_priority}
                      onChange={(value) => setFormData({ ...formData, parking_priority: value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      id="garage"
                      checked={formData.garage_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, garage_required: checked as boolean })}
                    />
                    <Label htmlFor="garage">Garage Required</Label>
                  </div>
                  <PrioritySelector
                    value={formData.garage_priority}
                    onChange={(value) => setFormData({ ...formData, garage_priority: value })}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      id="storage"
                      checked={formData.storage_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, storage_required: checked as boolean })}
                    />
                    <Label htmlFor="storage">Storage Area Required</Label>
                  </div>
                  <PrioritySelector
                    value={formData.storage_priority}
                    onChange={(value) => setFormData({ ...formData, storage_priority: value })}
                  />
                </div>

                <div>
                  <Label htmlFor="storage_size">Min Storage Size (sqm)</Label>
                  <Input
                    id="storage_size"
                    type="number"
                    value={formData.min_storage_size_sqm}
                    onChange={(e) => setFormData({ ...formData, min_storage_size_sqm: e.target.value })}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Climate Control */}
          <Card>
            <SectionHeader title="Climate Control" section="climate" />
            {expandedSections.has("climate") && (
              <CardContent className="space-y-4 pt-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="air_conditioning"
                      checked={formData.air_conditioning_required}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, air_conditioning_required: checked as boolean })
                      }
                    />
                    <Label htmlFor="air_conditioning" className="font-semibold">Air Conditioning Required</Label>
                  </div>
                  <Label>Preferred AC Types</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "ducted", label: "Ducted" },
                      { value: "split_system", label: "Split System" },
                      { value: "evaporative", label: "Evaporative" },
                      { value: "ceiling_fans", label: "Ceiling Fans" },
                    ].map((type) => (
                      <div key={type.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`ac_${type.value}`}
                          checked={formData.preferred_ac_types.includes(type.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, preferred_ac_types: [...formData.preferred_ac_types, type.value] });
                            } else {
                              setFormData({ ...formData, preferred_ac_types: formData.preferred_ac_types.filter((t) => t !== type.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`ac_${type.value}`} className="font-normal cursor-pointer">{type.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <PrioritySelector
                      value={formData.air_conditioning_priority}
                      onChange={(value) => setFormData({ ...formData, air_conditioning_priority: value })}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="heating"
                      checked={formData.heating_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, heating_required: checked as boolean })}
                    />
                    <Label htmlFor="heating" className="font-semibold">Heating Required</Label>
                  </div>
                  <Label>Preferred Heating Types</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "ducted", label: "Ducted" },
                      { value: "split_system", label: "Split System" },
                      { value: "gas", label: "Gas" },
                      { value: "fireplace", label: "Fireplace" },
                      { value: "hydronic", label: "Hydronic" },
                    ].map((type) => (
                      <div key={type.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`heat_${type.value}`}
                          checked={formData.preferred_heating_types.includes(type.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, preferred_heating_types: [...formData.preferred_heating_types, type.value] });
                            } else {
                              setFormData({ ...formData, preferred_heating_types: formData.preferred_heating_types.filter((t) => t !== type.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`heat_${type.value}`} className="font-normal cursor-pointer">{type.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <PrioritySelector
                      value={formData.heating_priority}
                      onChange={(value) => setFormData({ ...formData, heating_priority: value })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Security */}
          <Card>
            <SectionHeader title="Security" section="security" />
            {expandedSections.has("security") && (
              <CardContent className="space-y-4 pt-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="security_system"
                      checked={formData.security_system_required}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, security_system_required: checked as boolean })
                      }
                    />
                    <Label htmlFor="security_system" className="font-semibold">Security System Required</Label>
                  </div>
                  <Label>Required Security Features</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "alarm", label: "Alarm System" },
                      { value: "cameras", label: "Security Cameras" },
                      { value: "intercom", label: "Intercom" },
                      { value: "gate", label: "Gated Entry" },
                      { value: "motion_sensors", label: "Motion Sensors" },
                      { value: "smart_locks", label: "Smart Locks" },
                      { value: "security_patrol", label: "Security Patrol" },
                    ].map((feature) => (
                      <div key={feature.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`security_${feature.value}`}
                          checked={formData.required_security_features.includes(feature.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, required_security_features: [...formData.required_security_features, feature.value] });
                            } else {
                              setFormData({ ...formData, required_security_features: formData.required_security_features.filter((f) => f !== feature.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`security_${feature.value}`} className="font-normal cursor-pointer">{feature.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <PrioritySelector
                      value={formData.security_priority}
                      onChange={(value) => setFormData({ ...formData, security_priority: value })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Sustainability */}
          <Card>
            <SectionHeader title="Sustainability" section="sustainability" />
            {expandedSections.has("sustainability") && (
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      id="solar_panels"
                      checked={formData.solar_panels_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, solar_panels_required: checked as boolean })}
                    />
                    <Label htmlFor="solar_panels">Solar Panels</Label>
                  </div>
                  <PrioritySelector
                    value={formData.solar_priority}
                    onChange={(value) => setFormData({ ...formData, solar_priority: value })}
                  />
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="energy_rating">Min Energy Rating (0-10)</Label>
                    <Input
                      id="energy_rating"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.min_energy_rating}
                      onChange={(e) => setFormData({ ...formData, min_energy_rating: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.energy_rating_priority}
                      onChange={(value) => setFormData({ ...formData, energy_rating_priority: value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Required Sustainable Features</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "rainwater", label: "Rainwater Tank" },
                      { value: "greywater", label: "Greywater System" },
                      { value: "solar_hot_water", label: "Solar Hot Water" },
                      { value: "insulation", label: "High-R Insulation" },
                      { value: "double_glazing", label: "Double Glazing" },
                      { value: "led_lighting", label: "LED Lighting" },
                      { value: "battery_storage", label: "Battery Storage" },
                      { value: "passive_solar", label: "Passive Solar Design" },
                    ].map((feature) => (
                      <div key={feature.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`sustain_${feature.value}`}
                          checked={formData.required_sustainable_features.includes(feature.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, required_sustainable_features: [...formData.required_sustainable_features, feature.value] });
                            } else {
                              setFormData({ ...formData, required_sustainable_features: formData.required_sustainable_features.filter((f) => f !== feature.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`sustain_${feature.value}`} className="font-normal cursor-pointer">{feature.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <PrioritySelector
                      value={formData.sustainability_priority}
                      onChange={(value) => setFormData({ ...formData, sustainability_priority: value })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Kitchen */}
          <Card>
            <SectionHeader title="Kitchen" section="kitchen" />
            {expandedSections.has("kitchen") && (
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label>Kitchen Styles</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "modern", label: "Modern" },
                      { value: "country", label: "Country" },
                      { value: "industrial", label: "Industrial" },
                      { value: "scandinavian", label: "Scandinavian" },
                      { value: "traditional", label: "Traditional" },
                      { value: "gourmet", label: "Gourmet" },
                    ].map((style) => (
                      <div key={style.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`kitchen_style_${style.value}`}
                          checked={formData.kitchen_styles.includes(style.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, kitchen_styles: [...formData.kitchen_styles, style.value] });
                            } else {
                              setFormData({ ...formData, kitchen_styles: formData.kitchen_styles.filter((s) => s !== style.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`kitchen_style_${style.value}`} className="font-normal cursor-pointer">{style.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <PrioritySelector
                      value={formData.kitchen_style_priority}
                      onChange={(value) => setFormData({ ...formData, kitchen_style_priority: value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Required Kitchen Features</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "island", label: "Island Bench" },
                      { value: "pantry", label: "Walk-in Pantry" },
                      { value: "stone_benchtops", label: "Stone Benchtops" },
                      { value: "gas_cooking", label: "Gas Cooking" },
                      { value: "induction", label: "Induction Cooking" },
                      { value: "dishwasher", label: "Dishwasher" },
                      { value: "double_oven", label: "Double Oven" },
                      { value: "butlers_pantry", label: "Butler's Pantry" },
                      { value: "breakfast_bar", label: "Breakfast Bar" },
                    ].map((feature) => (
                      <div key={feature.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`kitchen_feat_${feature.value}`}
                          checked={formData.required_kitchen_features.includes(feature.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, required_kitchen_features: [...formData.required_kitchen_features, feature.value] });
                            } else {
                              setFormData({ ...formData, required_kitchen_features: formData.required_kitchen_features.filter((f) => f !== feature.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`kitchen_feat_${feature.value}`} className="font-normal cursor-pointer">{feature.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <PrioritySelector
                      value={formData.kitchen_features_priority}
                      onChange={(value) => setFormData({ ...formData, kitchen_features_priority: value })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Bathrooms */}
          <Card>
            <SectionHeader title="Bathrooms" section="bathrooms" />
            {expandedSections.has("bathrooms") && (
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="ensuite_min">Min Ensuite Bathrooms</Label>
                    <Input
                      id="ensuite_min"
                      type="number"
                      value={formData.min_ensuite_bathrooms}
                      onChange={(e) => setFormData({ ...formData, min_ensuite_bathrooms: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.ensuite_priority}
                      onChange={(value) => setFormData({ ...formData, ensuite_priority: value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Required Bathroom Features</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "spa_bath", label: "Spa Bath/Jacuzzi" },
                      { value: "separate_shower", label: "Separate Shower" },
                      { value: "double_vanity", label: "Double Vanity" },
                      { value: "heated_floors", label: "Heated Floors" },
                      { value: "floor_ceiling_tiles", label: "Floor-to-Ceiling Tiles" },
                      { value: "rainfall_shower", label: "Rainfall Showerhead" },
                      { value: "bathtub", label: "Bathtub" },
                      { value: "powder_room", label: "Powder Room" },
                    ].map((feature) => (
                      <div key={feature.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`bath_feat_${feature.value}`}
                          checked={formData.required_bathroom_features.includes(feature.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, required_bathroom_features: [...formData.required_bathroom_features, feature.value] });
                            } else {
                              setFormData({ ...formData, required_bathroom_features: formData.required_bathroom_features.filter((f) => f !== feature.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`bath_feat_${feature.value}`} className="font-normal cursor-pointer">{feature.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <PrioritySelector
                      value={formData.bathroom_features_priority}
                      onChange={(value) => setFormData({ ...formData, bathroom_features_priority: value })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Property Condition */}
          <Card>
            <SectionHeader title="Property Condition & Age" section="condition" />
            {expandedSections.has("condition") && (
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label>Acceptable Property Conditions</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "pristine", label: "Pristine" },
                      { value: "excellent", label: "Excellent" },
                      { value: "good", label: "Good" },
                      { value: "average", label: "Average (Some Work)" },
                      { value: "needs_renovation", label: "Needs Renovation (Fixer-Upper)" },
                    ].map((condition) => (
                      <div key={condition.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`condition_${condition.value}`}
                          checked={formData.acceptable_conditions.includes(condition.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, acceptable_conditions: [...formData.acceptable_conditions, condition.value] });
                            } else {
                              setFormData({ ...formData, acceptable_conditions: formData.acceptable_conditions.filter((c) => c !== condition.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`condition_${condition.value}`} className="font-normal cursor-pointer">{condition.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <PrioritySelector
                      value={formData.condition_priority}
                      onChange={(value) => setFormData({ ...formData, condition_priority: value })}
                    />
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="year_built">Not Older Than (Year)</Label>
                    <Input
                      id="year_built"
                      type="number"
                      value={formData.max_year_built}
                      onChange={(e) => setFormData({ ...formData, max_year_built: e.target.value })}
                      placeholder="2000"
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.year_built_priority}
                      onChange={(value) => setFormData({ ...formData, year_built_priority: value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="renovation"
                    checked={formData.renovation_acceptable}
                    onCheckedChange={(checked) => setFormData({ ...formData, renovation_acceptable: checked as boolean })}
                  />
                  <Label htmlFor="renovation">Renovation Acceptable</Label>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Smart Home */}
          <Card>
            <SectionHeader title="Smart Home" section="smart_home" />
            {expandedSections.has("smart_home") && (
              <CardContent className="space-y-4 pt-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="smart_home"
                      checked={formData.smart_home_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, smart_home_required: checked as boolean })}
                    />
                    <Label htmlFor="smart_home" className="font-semibold">Smart Home Features Required</Label>
                  </div>
                  <Label>Required Smart Features</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "automation", label: "Home Automation System" },
                      { value: "smart_lights", label: "Smart Lights" },
                      { value: "smart_locks", label: "Smart Locks" },
                      { value: "smart_thermostat", label: "Smart Thermostat" },
                      { value: "smart_security", label: "Smart Security" },
                      { value: "voice_control", label: "Voice Control (Alexa/Google)" },
                      { value: "smart_blinds", label: "Smart Blinds/Curtains" },
                      { value: "smart_irrigation", label: "Smart Irrigation" },
                    ].map((feature) => (
                      <div key={feature.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`smart_${feature.value}`}
                          checked={formData.required_smart_features.includes(feature.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, required_smart_features: [...formData.required_smart_features, feature.value] });
                            } else {
                              setFormData({ ...formData, required_smart_features: formData.required_smart_features.filter((f) => f !== feature.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`smart_${feature.value}`} className="font-normal cursor-pointer">{feature.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <PrioritySelector
                      value={formData.smart_home_priority}
                      onChange={(value) => setFormData({ ...formData, smart_home_priority: value })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Lifestyle */}
          <Card>
            <SectionHeader title="Lifestyle Preferences" section="lifestyle" />
            {expandedSections.has("lifestyle") && (
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="walkability">Min Walkability Score (0-100)</Label>
                    <p className="text-xs text-muted-foreground mb-2">Measures pedestrian access to shops, schools, parks, and transport</p>
                    <Input
                      id="walkability"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.walkability_min_score}
                      onChange={(e) => setFormData({ ...formData, walkability_min_score: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.walkability_priority}
                      onChange={(value) => setFormData({ ...formData, walkability_priority: value })}
                    />
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="noise_level">Maximum Acceptable Noise Level</Label>
                    <Select value={formData.max_noise_level} onValueChange={(value) => setFormData({ ...formData, max_noise_level: value })}>
                      <SelectTrigger id="noise_level">
                        <SelectValue placeholder="Select noise level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very_quiet">Very Quiet</SelectItem>
                        <SelectItem value="quiet">Quiet</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="very_busy">Very Busy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.noise_priority}
                      onChange={(value) => setFormData({ ...formData, noise_priority: value })}
                    />
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="street_traffic">Maximum Acceptable Street Traffic</Label>
                    <Select value={formData.max_street_traffic} onValueChange={(value) => setFormData({ ...formData, max_street_traffic: value })}>
                      <SelectTrigger id="street_traffic">
                        <SelectValue placeholder="Select traffic level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_through_road">No Through Road</SelectItem>
                        <SelectItem value="quiet_street">Quiet Street</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="busy_road">Busy Road</SelectItem>
                        <SelectItem value="main_road">Main Road</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.traffic_priority}
                      onChange={(value) => setFormData({ ...formData, traffic_priority: value })}
                    />
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="privacy_level">Minimum Privacy Level</Label>
                    <Select value={formData.min_privacy_level} onValueChange={(value) => setFormData({ ...formData, min_privacy_level: value })}>
                      <SelectTrigger id="privacy_level">
                        <SelectValue placeholder="Select privacy level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very_private">Very Private</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="overlooked">Overlooked (OK)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.privacy_priority}
                      onChange={(value) => setFormData({ ...formData, privacy_priority: value })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Investment */}
          <Card>
            <SectionHeader title="Investment Criteria" section="investment" />
            {expandedSections.has("investment") && (
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="rental_yield">Min Rental Yield (%)</Label>
                    <Input
                      id="rental_yield"
                      type="number"
                      step="0.1"
                      value={formData.min_rental_yield}
                      onChange={(e) => setFormData({ ...formData, min_rental_yield: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <PrioritySelector
                      value={formData.rental_yield_priority}
                      onChange={(value) => setFormData({ ...formData, rental_yield_priority: value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="council_rates">Max Council Rates (Annual)</Label>
                    <Input
                      id="council_rates"
                      type="number"
                      value={formData.max_council_rates_annual}
                      onChange={(e) => setFormData({ ...formData, max_council_rates_annual: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="strata_fees">Max Strata Fees (Quarterly)</Label>
                    <Input
                      id="strata_fees"
                      type="number"
                      value={formData.max_strata_fees_quarterly}
                      onChange={(e) => setFormData({ ...formData, max_strata_fees_quarterly: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Flooring */}
          <Card>
            <SectionHeader title="Flooring" section="flooring" />
            {expandedSections.has("flooring") && (
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label>Preferred Flooring Types</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: "timber", label: "Timber/Hardwood" },
                      { value: "engineered_timber", label: "Engineered Timber" },
                      { value: "tiles", label: "Tiles (Ceramic/Porcelain)" },
                      { value: "carpet", label: "Carpet" },
                      { value: "vinyl_laminate", label: "Vinyl/Laminate" },
                      { value: "polished_concrete", label: "Polished Concrete" },
                      { value: "stone_marble", label: "Stone/Marble" },
                      { value: "bamboo", label: "Bamboo" },
                    ].map((type) => (
                      <div key={type.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`flooring_${type.value}`}
                          checked={formData.preferred_flooring_types.includes(type.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                preferred_flooring_types: [...formData.preferred_flooring_types, type.value],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                preferred_flooring_types: formData.preferred_flooring_types.filter((t) => t !== type.value),
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`flooring_${type.value}`} className="font-normal cursor-pointer">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="flooring_notes">Specific Flooring Preferences</Label>
                  <Textarea
                    id="flooring_notes"
                    value={formData.flooring_specific_notes}
                    onChange={(e) => setFormData({ ...formData, flooring_specific_notes: e.target.value })}
                    placeholder="e.g., Carpet in bedrooms, timber or tiles in living areas"
                    rows={2}
                  />
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label>Overall Flooring Priority</Label>
                  </div>
                  <div>
                    <PrioritySelector
                      value={formData.flooring_priority}
                      onChange={(value) => setFormData({ ...formData, flooring_priority: value })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Additional Notes */}
          <Card>
            <SectionHeader title="Additional Notes" section="notes" />
            {expandedSections.has("notes") && (
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="additional_notes">Additional Notes</Label>
                  <Textarea
                    id="additional_notes"
                    value={formData.additional_notes}
                    onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                    placeholder="Any other requirements or preferences"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="deal_breakers">Deal Breakers</Label>
                  <Textarea
                    id="deal_breakers"
                    value={formData.deal_breakers}
                    onChange={(e) => setFormData({ ...formData, deal_breakers: e.target.value })}
                    placeholder="What are absolute deal breakers for this client?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="flexibility_notes">Flexibility Notes</Label>
                  <Textarea
                    id="flexibility_notes"
                    value={formData.flexibility_notes}
                    onChange={(e) => setFormData({ ...formData, flexibility_notes: e.target.value })}
                    placeholder="Where is the client willing to compromise?"
                    rows={3}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6">
            <Button type="button" variant="outline" onClick={() => navigate(searchParams.get('returnTo') || "/briefs")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              <Save size={16} className="mr-2" />
              {submitting ? "Saving..." : "Save Brief"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
