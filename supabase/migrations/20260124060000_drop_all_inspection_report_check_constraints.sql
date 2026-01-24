-- Drop ALL check constraints on inspection_reports table
-- The form values don't match the database constraints in many places
-- Letting the application handle validation is simpler and more maintainable

-- Drop all check constraints for the inspection_reports table
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.inspection_reports'::regclass
        AND contype = 'c'  -- 'c' = check constraint
    LOOP
        EXECUTE format('ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS %I', constraint_rec.conname);
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.conname;
    END LOOP;
END $$;

-- Keep only the essential range constraints for numeric ratings
ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_first_impression_vibe_range
  CHECK (first_impression_vibe IS NULL OR (first_impression_vibe >= 1 AND first_impression_vibe <= 10));

ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_gut_feeling_rating_range
  CHECK (gut_feeling_rating IS NULL OR (gut_feeling_rating >= 1 AND gut_feeling_rating <= 10));

ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_exterior_street_appeal_range
  CHECK (exterior_street_appeal IS NULL OR (exterior_street_appeal >= 1 AND exterior_street_appeal <= 10));

ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_neighbourhood_safety_rating_range
  CHECK (neighbourhood_safety_rating IS NULL OR (neighbourhood_safety_rating >= 1 AND neighbourhood_safety_rating <= 5));

ALTER TABLE public.inspection_reports ADD CONSTRAINT inspection_reports_overall_score_range
  CHECK (overall_score IS NULL OR (overall_score >= 1 AND overall_score <= 10));
