-- Add missing columns to inspection_reports table
-- The form has been extended with additional fields that don't exist in the database

-- Section 0: Inspection Details
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS inspection_date DATE;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS inspection_time TEXT;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS weather TEXT;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS shown_by TEXT;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS areas_not_accessed TEXT;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER;

-- Section 1: Client Brief Match
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS brief_matches JSONB DEFAULT '[]';
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS brief_overall_assessment TEXT;

-- Section 3: Exterior - additional fields
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS exterior_street_appeal INTEGER CHECK (exterior_street_appeal BETWEEN 1 AND 10);
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS exterior_windows_condition TEXT CHECK (exterior_windows_condition IN ('excellent', 'good', 'fair', 'poor'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS exterior_fencing TEXT;

-- Section 4: Interior Living - additional field
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS interior_living_layout_flow TEXT;

-- Section 5: Kitchen (form uses kitchen_* instead of interior_kitchen_*)
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS kitchen_condition TEXT CHECK (kitchen_condition IN ('excellent', 'good', 'fair', 'poor'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS kitchen_age_style TEXT;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS kitchen_appliances TEXT CHECK (kitchen_appliances IN ('modern', 'dated', 'needs_replacement'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS kitchen_bench_space TEXT CHECK (kitchen_bench_space IN ('plenty', 'adequate', 'limited'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS kitchen_storage TEXT CHECK (kitchen_storage IN ('plenty', 'adequate', 'limited'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS kitchen_renovation_estimate TEXT CHECK (kitchen_renovation_estimate IN ('none', 'minor', 'major', 'full'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS kitchen_comments TEXT;

-- Section 6: Bathrooms (form uses bathroom_* instead of interior_bathroom_*)
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bathroom_count INTEGER;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bathroom_ensuite_count INTEGER;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bathroom_condition TEXT CHECK (bathroom_condition IN ('excellent', 'good', 'fair', 'poor'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bathroom_style TEXT;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bathroom_ventilation TEXT CHECK (bathroom_ventilation IN ('excellent', 'good', 'poor', 'none'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bathroom_renovation_estimate TEXT CHECK (bathroom_renovation_estimate IN ('none', 'minor', 'major', 'full'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bathroom_comments TEXT;

-- Section 7: Bedrooms (form uses bedroom_* instead of interior_bedroom_*)
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bedroom_count INTEGER;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bedroom_master_size TEXT CHECK (bedroom_master_size IN ('generous', 'adequate', 'compact'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bedroom_other_sizes TEXT CHECK (bedroom_other_sizes IN ('generous', 'adequate', 'compact'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bedroom_storage TEXT CHECK (bedroom_storage IN ('built_in_robes', 'some_storage', 'no_storage'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS bedroom_comments TEXT;

-- Section 8: Other Spaces (form uses other_spaces* instead of interior_other_*)
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS other_spaces TEXT[] DEFAULT '{}';
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS other_spaces_comments TEXT;

-- Section 9: Neighbourhood - additional fields
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS neighbourhood_traffic TEXT;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS neighbourhood_parking_ease TEXT CHECK (neighbourhood_parking_ease IN ('easy', 'moderate', 'difficult'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS neighbourhood_neighbour_properties TEXT;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS neighbourhood_walking_distances TEXT;

-- Section 10: Red Flags (form uses new structure)
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS red_flags TEXT[] DEFAULT '{}';
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS red_flags_comments TEXT;

-- Section 11: Standout Features - additional field
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS best_single_feature TEXT;

-- Section 12: Market Context (all new)
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS days_on_market TEXT;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS price_guide TEXT;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS pricing_opinion TEXT CHECK (pricing_opinion IN ('overpriced', 'fair', 'underpriced', 'hard_to_say'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS competition_level TEXT CHECK (competition_level IN ('hot', 'competitive', 'moderate', 'quiet'));
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS seller_motivation TEXT;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS market_comments TEXT;

-- Section 13: Final Verdict - additional field
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS urgency TEXT CHECK (urgency IN ('act_fast', 'normal', 'take_time'));

-- Section 14: For Agent - additional field
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS negotiation_suggestions TEXT;

-- Section Photos (JSONB for storing section-specific photos)
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS section_photos JSONB DEFAULT '{}';
