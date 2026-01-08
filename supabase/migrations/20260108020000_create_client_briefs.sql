-- Create client_briefs table for saving detailed property search criteria

CREATE TABLE IF NOT EXISTS public.client_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  brief_name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'matched', 'on_hold', 'archived')) DEFAULT 'active',

  -- Budget and basics
  budget_min NUMERIC,
  budget_max NUMERIC,
  bedrooms_min INTEGER,
  bedrooms_max INTEGER,
  bathrooms_min INTEGER,
  bathrooms_max INTEGER,

  -- Location preferences
  preferred_suburbs TEXT[] DEFAULT ARRAY[]::TEXT[],
  excluded_suburbs TEXT[] DEFAULT ARRAY[]::TEXT[],
  max_distance_cbd_km NUMERIC,
  max_distance_beach_km NUMERIC,
  max_distance_schools_km NUMERIC,

  -- Property type and size with priorities
  property_types TEXT[] DEFAULT ARRAY[]::TEXT[], -- house, apartment, townhouse, etc
  land_size_min_sqm NUMERIC,
  land_size_min_priority TEXT CHECK (land_size_min_priority IN ('must_have', 'important', 'nice_to_have', 'dont_care')) DEFAULT 'dont_care',
  building_size_min_sqm NUMERIC,
  building_size_min_priority TEXT DEFAULT 'dont_care',

  -- Pool preferences with priority
  pool_required BOOLEAN,
  pool_priority TEXT DEFAULT 'dont_care',
  pool_types TEXT[], -- inground, lap_pool, etc
  pool_min_length_m NUMERIC,

  -- Garden preferences with priority
  garden_required BOOLEAN,
  garden_priority TEXT DEFAULT 'dont_care',
  garden_types TEXT[],
  garden_min_size_sqm NUMERIC,

  -- Architectural preferences with priority
  architectural_styles TEXT[],
  architectural_style_priority TEXT DEFAULT 'dont_care',
  min_ceiling_height_m NUMERIC,
  ceiling_height_priority TEXT DEFAULT 'dont_care',
  preferred_light_directions TEXT[],
  light_direction_priority TEXT DEFAULT 'dont_care',
  natural_light_importance TEXT DEFAULT 'dont_care',

  -- Views with priorities
  water_views_required BOOLEAN,
  water_views_priority TEXT DEFAULT 'dont_care',
  city_views_required BOOLEAN,
  city_views_priority TEXT DEFAULT 'dont_care',
  mountain_views_required BOOLEAN,
  mountain_views_priority TEXT DEFAULT 'dont_care',
  park_views_required BOOLEAN,
  park_views_priority TEXT DEFAULT 'dont_care',

  -- Parking with priority
  min_parking_spaces INTEGER,
  parking_priority TEXT DEFAULT 'dont_care',
  preferred_parking_types TEXT[],
  garage_required BOOLEAN,
  garage_priority TEXT DEFAULT 'dont_care',

  -- Storage with priority
  storage_required BOOLEAN,
  storage_priority TEXT DEFAULT 'dont_care',
  min_storage_size_sqm NUMERIC,

  -- Climate control with priority
  air_conditioning_required BOOLEAN,
  air_conditioning_priority TEXT DEFAULT 'dont_care',
  preferred_ac_types TEXT[],
  heating_required BOOLEAN,
  heating_priority TEXT DEFAULT 'dont_care',
  preferred_heating_types TEXT[],

  -- Outdoor living with priority
  outdoor_entertaining_required BOOLEAN,
  outdoor_entertaining_priority TEXT DEFAULT 'dont_care',
  min_outdoor_area_sqm NUMERIC,
  balcony_terrace_required BOOLEAN,
  balcony_priority TEXT DEFAULT 'dont_care',

  -- Security with priority
  security_system_required BOOLEAN,
  security_priority TEXT DEFAULT 'dont_care',
  required_security_features TEXT[],

  -- Sustainability with priority
  solar_panels_required BOOLEAN,
  solar_priority TEXT DEFAULT 'dont_care',
  min_energy_rating NUMERIC,
  energy_rating_priority TEXT DEFAULT 'dont_care',
  required_sustainable_features TEXT[],
  sustainability_priority TEXT DEFAULT 'dont_care',

  -- Kitchen preferences with priority
  kitchen_styles TEXT[],
  kitchen_style_priority TEXT DEFAULT 'dont_care',
  required_kitchen_features TEXT[],
  kitchen_features_priority TEXT DEFAULT 'dont_care',

  -- Bathroom preferences with priority
  min_ensuite_bathrooms INTEGER,
  ensuite_priority TEXT DEFAULT 'dont_care',
  required_bathroom_features TEXT[],
  bathroom_features_priority TEXT DEFAULT 'dont_care',

  -- Property condition with priority
  acceptable_conditions TEXT[],
  condition_priority TEXT DEFAULT 'dont_care',
  max_year_built INTEGER,
  year_built_priority TEXT DEFAULT 'dont_care',
  renovation_acceptable BOOLEAN,

  -- Smart home with priority
  smart_home_required BOOLEAN,
  smart_home_priority TEXT DEFAULT 'dont_care',
  required_smart_features TEXT[],

  -- Lifestyle preferences with priority
  walkability_min_score INTEGER,
  walkability_priority TEXT DEFAULT 'dont_care',
  max_noise_level TEXT,
  noise_priority TEXT DEFAULT 'dont_care',
  max_street_traffic TEXT,
  traffic_priority TEXT DEFAULT 'dont_care',
  min_privacy_level TEXT,
  privacy_priority TEXT DEFAULT 'dont_care',

  -- Investment criteria (for investment buyers)
  min_rental_yield NUMERIC,
  rental_yield_priority TEXT DEFAULT 'dont_care',
  max_council_rates_annual NUMERIC,
  max_strata_fees_quarterly NUMERIC,

  -- Flooring preferences
  preferred_flooring_types TEXT[],
  flooring_priority TEXT DEFAULT 'dont_care',

  -- Additional notes and metadata
  additional_notes TEXT,
  deal_breakers TEXT, -- Free text for specific must-haves
  flexibility_notes TEXT, -- Where client is willing to compromise

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_search_date TIMESTAMP WITH TIME ZONE,
  matched_properties_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.client_briefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own client briefs"
ON public.client_briefs FOR SELECT
TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Users can create client briefs"
ON public.client_briefs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Users can update their own client briefs"
ON public.client_briefs FOR UPDATE
TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Users can delete their own client briefs"
ON public.client_briefs FOR DELETE
TO authenticated
USING (auth.uid() = agent_id);

-- Public viewing for all authenticated users (agents can see each other's briefs)
CREATE POLICY "Authenticated users can view all briefs"
ON public.client_briefs FOR SELECT
TO authenticated
USING (true);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_client_briefs_agent ON public.client_briefs(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_briefs_status ON public.client_briefs(status);
CREATE INDEX IF NOT EXISTS idx_client_briefs_budget ON public.client_briefs(budget_min, budget_max);
CREATE INDEX IF NOT EXISTS idx_client_briefs_suburbs ON public.client_briefs USING GIN (preferred_suburbs);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_client_briefs_updated_at
BEFORE UPDATE ON public.client_briefs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
