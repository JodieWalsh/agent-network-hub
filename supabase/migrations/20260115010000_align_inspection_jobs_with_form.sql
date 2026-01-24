-- ============================================================================
-- ALIGN inspection_jobs TABLE WITH CreateInspectionJob FORM
-- ============================================================================
-- The form was built with a simpler schema. This migration adds the missing
-- columns and makes required columns nullable to match the form's expectations.
-- ============================================================================

-- Add columns that the form uses but don't exist yet
ALTER TABLE public.inspection_jobs
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'standard' CHECK (urgency_level IN ('standard', 'urgent', 'express')),
ADD COLUMN IF NOT EXISTS budget_amount INTEGER,
ADD COLUMN IF NOT EXISTS preferred_inspection_dates TEXT[],
ADD COLUMN IF NOT EXISTS scope_requirements TEXT,
ADD COLUMN IF NOT EXISTS property_access_notes TEXT,
ADD COLUMN IF NOT EXISTS property_location geography(POINT, 4326);

-- Make previously required columns nullable (form doesn't provide them)
ALTER TABLE public.inspection_jobs
ALTER COLUMN property_city DROP NOT NULL,
ALTER COLUMN property_state DROP NOT NULL,
ALTER COLUMN property_country DROP NOT NULL,
ALTER COLUMN title DROP NOT NULL,
ALTER COLUMN budget_min DROP NOT NULL,
ALTER COLUMN budget_max DROP NOT NULL,
ALTER COLUMN inspection_date_from DROP NOT NULL,
ALTER COLUMN inspection_date_to DROP NOT NULL;

-- Copy requesting_agent_id to creator_id for existing rows (if any)
UPDATE public.inspection_jobs
SET creator_id = requesting_agent_id
WHERE creator_id IS NULL AND requesting_agent_id IS NOT NULL;

-- Create index on creator_id
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_creator ON public.inspection_jobs(creator_id);

-- Update RLS policy to also check creator_id
DROP POLICY IF EXISTS "inspection_jobs_select_policy" ON public.inspection_jobs;
CREATE POLICY "inspection_jobs_select_policy"
ON public.inspection_jobs FOR SELECT
USING (
  status IN ('open', 'in_negotiation')
  OR requesting_agent_id = auth.uid()
  OR creator_id = auth.uid()
  OR assigned_inspector_id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "inspection_jobs_insert_policy" ON public.inspection_jobs;
CREATE POLICY "inspection_jobs_insert_policy"
ON public.inspection_jobs FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = requesting_agent_id
  OR auth.uid() = creator_id
);

DROP POLICY IF EXISTS "inspection_jobs_update_policy" ON public.inspection_jobs;
CREATE POLICY "inspection_jobs_update_policy"
ON public.inspection_jobs FOR UPDATE
TO authenticated
USING (
  auth.uid() = requesting_agent_id
  OR auth.uid() = creator_id
  OR auth.uid() = assigned_inspector_id
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "inspection_jobs_delete_policy" ON public.inspection_jobs;
CREATE POLICY "inspection_jobs_delete_policy"
ON public.inspection_jobs FOR DELETE
TO authenticated
USING (
  (auth.uid() = requesting_agent_id OR auth.uid() = creator_id)
  AND status = 'open'
);
