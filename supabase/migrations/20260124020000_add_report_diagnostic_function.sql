-- Diagnostic function to check if a report exists for a job
-- This function runs with SECURITY DEFINER to bypass RLS for diagnostics

CREATE OR REPLACE FUNCTION public.check_report_exists(p_job_id UUID)
RETURNS TABLE (
  report_exists BOOLEAN,
  report_id UUID,
  inspector_id UUID,
  job_requesting_agent_id UUID,
  job_assigned_inspector_id UUID,
  job_status TEXT,
  submitted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (r.id IS NOT NULL) as report_exists,
    r.id as report_id,
    r.inspector_id,
    j.requesting_agent_id as job_requesting_agent_id,
    j.assigned_inspector_id as job_assigned_inspector_id,
    j.status as job_status,
    r.submitted_at
  FROM public.inspection_jobs j
  LEFT JOIN public.inspection_reports r ON r.job_id = j.id
  WHERE j.id = p_job_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_report_exists(UUID) TO authenticated;

-- Also fix the interface mismatch - the code expects creator_id but table has requesting_agent_id
-- Create a view that aliases the column (optional, for clarity)
-- Actually, let's just ensure the RLS policy is correct

-- Re-apply the SELECT policy with explicit syntax
DROP POLICY IF EXISTS "inspection_reports_select_policy" ON public.inspection_reports;

CREATE POLICY "inspection_reports_select_policy"
ON public.inspection_reports FOR SELECT TO authenticated
USING (
  -- Inspector can read their own reports
  inspector_id = auth.uid()
  -- OR job poster can read reports for their jobs
  OR job_id IN (
    SELECT id FROM public.inspection_jobs
    WHERE requesting_agent_id = auth.uid()
  )
  -- OR admin
  OR public.is_admin(auth.uid())
);
