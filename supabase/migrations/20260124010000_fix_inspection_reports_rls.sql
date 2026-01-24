-- Fix RLS policy for inspection_reports
-- The existing policy's subquery wasn't working correctly for job posters

-- Drop the existing select policy
DROP POLICY IF EXISTS "inspection_reports_select_policy" ON public.inspection_reports;

-- Create a new, simpler policy that explicitly allows:
-- 1. The inspector who created the report
-- 2. The agent who requested the inspection (job poster)
-- 3. Admins
CREATE POLICY "inspection_reports_select_policy"
ON public.inspection_reports FOR SELECT
USING (
  -- Inspector can see their own reports
  auth.uid() = inspector_id
  -- Job requester can see reports for jobs they created
  OR EXISTS (
    SELECT 1 FROM public.inspection_jobs j
    WHERE j.id = inspection_reports.job_id
    AND j.requesting_agent_id = auth.uid()
  )
  -- Admins can see all
  OR public.is_admin(auth.uid())
);

-- Also ensure the update policy allows inspectors to update even after submission
-- (in case they need to make corrections)
DROP POLICY IF EXISTS "inspection_reports_update_policy" ON public.inspection_reports;

CREATE POLICY "inspection_reports_update_policy"
ON public.inspection_reports FOR UPDATE
TO authenticated
USING (
  auth.uid() = inspector_id
  OR public.is_admin(auth.uid())
);
