-- Add comprehensive property attributes for detailed search

-- Basic property details (extend existing)
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS land_size_sqm NUMERIC,
ADD COLUMN IF NOT EXISTS building_size_sqm NUMERIC,
ADD COLUMN IF NOT EXISTS number_of_levels INTEGER,
ADD COLUMN IF NOT EXISTS year_built INTEGER,
ADD COLUMN IF NOT EXISTS property_condition TEXT CHECK (property_condition IN ('excellent', 'good', 'fair', 'needs_renovation')),

-- Pool attributes
ADD COLUMN IF NOT EXISTS has_pool BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pool_type TEXT CHECK (pool_type IN ('inground', 'above_ground', 'lap_pool', 'infinity', 'plunge', 'none')),
ADD COLUMN IF NOT EXISTS pool_length_m NUMERIC,
ADD COLUMN IF NOT EXISTS pool_width_m NUMERIC,

-- Garden and outdoor
ADD COLUMN IF NOT EXISTS garden_type TEXT CHECK (garden_type IN ('landscaped', 'native', 'low_maintenance', 'established', 'edible', 'none')),
ADD COLUMN IF NOT EXISTS garden_size_sqm NUMERIC,
ADD COLUMN IF NOT EXISTS outdoor_entertaining_area BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS outdoor_area_size_sqm NUMERIC,
ADD COLUMN IF NOT EXISTS balcony_terrace BOOLEAN DEFAULT false,

-- Architecture and interior
ADD COLUMN IF NOT EXISTS architectural_style TEXT CHECK (architectural_style IN ('modern', 'contemporary', 'traditional', 'victorian', 'federation', 'art_deco', 'mediterranean', 'hamptons', 'industrial', 'mid_century')),
ADD COLUMN IF NOT EXISTS ceiling_height_m NUMERIC,
ADD COLUMN IF NOT EXISTS primary_light_direction TEXT CHECK (primary_light_direction IN ('north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west')),
ADD COLUMN IF NOT EXISTS natural_light_quality TEXT CHECK (natural_light_quality IN ('excellent', 'good', 'moderate', 'limited')),

-- Views
ADD COLUMN IF NOT EXISTS has_water_views BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_city_views BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_mountain_views BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_park_views BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS view_quality TEXT CHECK (view_quality IN ('panoramic', 'expansive', 'partial', 'glimpses', 'none')),

-- Parking and storage
ADD COLUMN IF NOT EXISTS parking_spaces INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS parking_type TEXT CHECK (parking_type IN ('garage', 'carport', 'covered', 'open', 'street', 'none')),
ADD COLUMN IF NOT EXISTS has_garage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS storage_area BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS storage_size_sqm NUMERIC,

-- Climate control and utilities
ADD COLUMN IF NOT EXISTS air_conditioning TEXT CHECK (air_conditioning IN ('ducted', 'split_system', 'evaporative', 'ceiling_fans', 'none')),
ADD COLUMN IF NOT EXISTS heating_type TEXT CHECK (heating_type IN ('ducted', 'split_system', 'gas', 'fireplace', 'hydronic', 'none')),
ADD COLUMN IF NOT EXISTS solar_panels BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS solar_capacity_kw NUMERIC,
ADD COLUMN IF NOT EXISTS water_tank BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS water_tank_capacity_l INTEGER,

-- Security and smart features
ADD COLUMN IF NOT EXISTS security_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS security_features TEXT[] DEFAULT ARRAY[]::TEXT[], -- alarm, cameras, intercom, gate, etc
ADD COLUMN IF NOT EXISTS smart_home_features TEXT[] DEFAULT ARRAY[]::TEXT[], -- automation, smart_locks, smart_lights, etc

-- Sustainability and energy
ADD COLUMN IF NOT EXISTS energy_efficiency_rating NUMERIC CHECK (energy_efficiency_rating >= 0 AND energy_efficiency_rating <= 10),
ADD COLUMN IF NOT EXISTS water_efficiency_rating NUMERIC CHECK (water_efficiency_rating >= 0 AND water_efficiency_rating <= 6),
ADD COLUMN IF NOT EXISTS sustainable_features TEXT[] DEFAULT ARRAY[]::TEXT[], -- rainwater, greywater, insulation, double_glazing, etc

-- Kitchen and bathrooms details
ADD COLUMN IF NOT EXISTS kitchen_style TEXT CHECK (kitchen_style IN ('modern', 'country', 'industrial', 'scandinavian', 'traditional', 'gourmet')),
ADD COLUMN IF NOT EXISTS kitchen_features TEXT[] DEFAULT ARRAY[]::TEXT[], -- island, pantry, stone_benchtops, gas_cooking, dishwasher, etc
ADD COLUMN IF NOT EXISTS ensuite_bathrooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS powder_rooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bathroom_features TEXT[] DEFAULT ARRAY[]::TEXT[], -- spa_bath, separate_shower, double_vanity, heated_floors, etc

-- Flooring and finishes
ADD COLUMN IF NOT EXISTS flooring_types TEXT[] DEFAULT ARRAY[]::TEXT[], -- timber, tiles, carpet, concrete, marble, etc
ADD COLUMN IF NOT EXISTS interior_condition TEXT CHECK (interior_condition IN ('pristine', 'excellent', 'good', 'average', 'needs_work')),

-- Lifestyle and location features
ADD COLUMN IF NOT EXISTS proximity_beach_km NUMERIC,
ADD COLUMN IF NOT EXISTS proximity_cbd_km NUMERIC,
ADD COLUMN IF NOT EXISTS proximity_schools_km NUMERIC,
ADD COLUMN IF NOT EXISTS proximity_shopping_km NUMERIC,
ADD COLUMN IF NOT EXISTS proximity_transport_km NUMERIC,
ADD COLUMN IF NOT EXISTS walkability_score INTEGER CHECK (walkability_score >= 0 AND walkability_score <= 100),

-- Investment attributes
ADD COLUMN IF NOT EXISTS rental_yield_estimate NUMERIC,
ADD COLUMN IF NOT EXISTS council_rates_annual NUMERIC,
ADD COLUMN IF NOT EXISTS strata_fees_quarterly NUMERIC,
ADD COLUMN IF NOT EXISTS water_rates_annual NUMERIC,

-- Additional details
ADD COLUMN IF NOT EXISTS noise_level TEXT CHECK (noise_level IN ('very_quiet', 'quiet', 'moderate', 'busy', 'very_busy')),
ADD COLUMN IF NOT EXISTS street_traffic TEXT CHECK (street_traffic IN ('no_through_road', 'quiet_street', 'moderate', 'busy_road', 'main_road')),
ADD COLUMN IF NOT EXISTS privacy_level TEXT CHECK (privacy_level IN ('very_private', 'private', 'moderate', 'overlooked'));

-- Create indexes for common search filters
CREATE INDEX IF NOT EXISTS idx_properties_land_size ON public.properties(land_size_sqm);
CREATE INDEX IF NOT EXISTS idx_properties_building_size ON public.properties(building_size_sqm);
CREATE INDEX IF NOT EXISTS idx_properties_pool ON public.properties(has_pool);
CREATE INDEX IF NOT EXISTS idx_properties_views ON public.properties(has_water_views, has_city_views, has_mountain_views);
CREATE INDEX IF NOT EXISTS idx_properties_parking ON public.properties(parking_spaces);
CREATE INDEX IF NOT EXISTS idx_properties_architectural_style ON public.properties(architectural_style);
CREATE INDEX IF NOT EXISTS idx_properties_condition ON public.properties(property_condition);
CREATE INDEX IF NOT EXISTS idx_properties_year_built ON public.properties(year_built);

-- Create GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_properties_security_features ON public.properties USING GIN (security_features);
CREATE INDEX IF NOT EXISTS idx_properties_smart_features ON public.properties USING GIN (smart_home_features);
CREATE INDEX IF NOT EXISTS idx_properties_sustainable_features ON public.properties USING GIN (sustainable_features);
CREATE INDEX IF NOT EXISTS idx_properties_kitchen_features ON public.properties USING GIN (kitchen_features);
CREATE INDEX IF NOT EXISTS idx_properties_bathroom_features ON public.properties USING GIN (bathroom_features);
CREATE INDEX IF NOT EXISTS idx_properties_flooring ON public.properties USING GIN (flooring_types);
