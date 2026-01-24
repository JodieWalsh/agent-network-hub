-- Fix the INSERT policy for inspection_reports
-- The previous policy was too restrictive or had evaluation issues

-- Drop existing insert policy
DROP POLICY IF EXISTS "inspection_reports_insert_policy" ON public.inspection_reports;

-- Create a simpler INSERT policy
-- Allow authenticated users to insert reports where:
-- 1. They are setting themselves as the inspector
-- 2. They are the assigned inspector for the job
CREATE POLICY "inspection_reports_insert_policy"
ON public.inspection_reports FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be setting themselves as the inspector
  inspector_id = auth.uid()
  -- And the job must have this user as the assigned inspector
  AND EXISTS (
    SELECT 1 FROM public.inspection_jobs
    WHERE id = job_id
    AND assigned_inspector_id = auth.uid()
  )
);

-- Also ensure UPDATE policy allows updates even after submission (for corrections)
DROP POLICY IF EXISTS "inspection_reports_update_policy" ON public.inspection_reports;

CREATE POLICY "inspection_reports_update_policy"
ON public.inspection_reports FOR UPDATE
TO authenticated
USING (
  inspector_id = auth.uid()
  OR public.is_admin(auth.uid())
);
