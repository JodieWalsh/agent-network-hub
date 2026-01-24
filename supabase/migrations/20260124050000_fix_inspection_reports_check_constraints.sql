-- Fix CHECK constraints on inspection_reports table
-- The form uses different values than the original constraints expected

-- Drop the old CHECK constraints and recreate with correct values
-- exterior_garden_condition - form uses ConditionRating (excellent, good, fair, poor)
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_exterior_garden_condition_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_exterior_garden_condition_check
  CHECK (exterior_garden_condition IS NULL OR exterior_garden_condition IN ('excellent', 'good', 'fair', 'poor', 'well_maintained', 'average', 'overgrown', 'none'));

-- Also fix other constraints that might have mismatched values

-- neighbourhood_parking - form uses neighbourhood_parking_ease with 'easy', 'moderate', 'difficult'
-- but neighbourhood_parking might still exist with different constraint
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_neighbourhood_parking_check;

-- neighbourhood_street_feel - original has 'quiet', 'moderate', 'busy'
-- Let's keep it flexible
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_neighbourhood_street_feel_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_neighbourhood_street_feel_check
  CHECK (neighbourhood_street_feel IS NULL OR neighbourhood_street_feel IN ('quiet', 'moderate', 'busy'));

-- neighbourhood_traffic_noise - original has 'silent', 'light', 'moderate', 'heavy'
-- Form might use different values, make flexible
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_neighbourhood_traffic_noise_check;

-- interior_living_natural_light - original has 'dark', 'average', 'bright', 'amazing'
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_interior_living_natural_light_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_interior_living_natural_light_check
  CHECK (interior_living_natural_light IS NULL OR interior_living_natural_light IN ('dark', 'average', 'bright', 'amazing'));

-- interior_living_size_accuracy - original has 'smaller', 'accurate', 'larger'
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_interior_living_size_accuracy_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_interior_living_size_accuracy_check
  CHECK (interior_living_size_accuracy IS NULL OR interior_living_size_accuracy IN ('smaller', 'accurate', 'larger'));

-- matches_photos - original has 'yes', 'mostly', 'no'
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_matches_photos_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_matches_photos_check
  CHECK (matches_photos IS NULL OR matches_photos IN ('yes', 'mostly', 'no'));

-- would_personally_buy - original has 'yes', 'maybe', 'no'
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_would_personally_buy_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_would_personally_buy_check
  CHECK (would_personally_buy IS NULL OR would_personally_buy IN ('yes', 'maybe', 'no'));

-- recommendation - original has 'highly_recommend', 'worth_considering', 'not_recommended'
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_recommendation_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_recommendation_check
  CHECK (recommendation IS NULL OR recommendation IN ('highly_recommend', 'worth_considering', 'not_recommended'));

-- All the interior_* condition columns use ConditionRating
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_interior_living_condition_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_interior_living_condition_check
  CHECK (interior_living_condition IS NULL OR interior_living_condition IN ('excellent', 'good', 'fair', 'poor'));

ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_interior_kitchen_condition_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_interior_kitchen_condition_check
  CHECK (interior_kitchen_condition IS NULL OR interior_kitchen_condition IN ('excellent', 'good', 'fair', 'poor'));

ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_interior_bathroom_condition_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_interior_bathroom_condition_check
  CHECK (interior_bathroom_condition IS NULL OR interior_bathroom_condition IN ('excellent', 'good', 'fair', 'poor'));

-- exterior conditions
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_exterior_roof_condition_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_exterior_roof_condition_check
  CHECK (exterior_roof_condition IS NULL OR exterior_roof_condition IN ('excellent', 'good', 'fair', 'poor', 'not_visible'));

ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_exterior_walls_condition_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_exterior_walls_condition_check
  CHECK (exterior_walls_condition IS NULL OR exterior_walls_condition IN ('excellent', 'good', 'fair', 'poor'));

-- interior_kitchen_appliances - original has 'modern', 'dated', 'needs_replacement'
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_interior_kitchen_appliances_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_interior_kitchen_appliances_check
  CHECK (interior_kitchen_appliances IS NULL OR interior_kitchen_appliances IN ('modern', 'dated', 'needs_replacement'));

-- interior_kitchen_storage - original has 'plenty', 'adequate', 'limited'
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_interior_kitchen_storage_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_interior_kitchen_storage_check
  CHECK (interior_kitchen_storage IS NULL OR interior_kitchen_storage IN ('plenty', 'adequate', 'limited'));

-- interior_bedroom_sizes - original has 'generous', 'adequate', 'compact'
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_interior_bedroom_sizes_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_interior_bedroom_sizes_check
  CHECK (interior_bedroom_sizes IS NULL OR interior_bedroom_sizes IN ('generous', 'adequate', 'compact'));

-- interior_bedroom_storage - original has 'built_in_robes', 'some_storage', 'no_storage'
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_interior_bedroom_storage_check;
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_interior_bedroom_storage_check
  CHECK (interior_bedroom_storage IS NULL OR interior_bedroom_storage IN ('built_in_robes', 'some_storage', 'no_storage'));
