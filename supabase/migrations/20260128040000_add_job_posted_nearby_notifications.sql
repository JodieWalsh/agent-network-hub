-- Add job_posted_nearby notification type and matching RPC function
-- Notifies building inspectors whose service area covers a newly posted job location

-- 1. Add job_posted_nearby to the notification type CHECK constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'bid_received',
    'bid_accepted',
    'bid_declined',
    'bid_edited',
    'job_assigned',
    'report_submitted',
    'report_approved',
    'payment_released',
    'payment_refunded',
    'payment_confirmed',
    'review_received',
    'badge_earned',
    'job_expired',
    'job_cancelled',
    'new_message',
    'user_approved',
    'user_rejected',
    'user_promoted_admin',
    'payout_setup_required',
    'awaiting_inspector_setup',
    'inspector_assigned',
    'job_posted_nearby'
  )
);

-- 2. Create RPC function to find matching inspectors and notify them
CREATE OR REPLACE FUNCTION public.notify_nearby_inspectors(p_job_id UUID)
RETURNS INTEGER -- returns count of notifications created
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_inspector RECORD;
  v_count INTEGER := 0;
  v_message TEXT;
  v_address TEXT;
BEGIN
  -- Fetch job details
  SELECT id, property_address, property_location, budget_amount, budget_currency,
         property_type, creator_id, status
  INTO v_job
  FROM public.inspection_jobs
  WHERE id = p_job_id;

  -- Only notify for open jobs
  IF v_job IS NULL OR v_job.status != 'open' THEN
    RETURN 0;
  END IF;

  -- Clean address for display (remove "Area: " prefix)
  v_address := COALESCE(REPLACE(v_job.property_address, 'Area: ', ''), 'Unknown location');

  -- Build notification message
  -- Format: "New job in München - House - $400 AUD"
  v_message := 'New job in ' || v_address;
  IF v_job.property_type IS NOT NULL AND v_job.property_type != '' THEN
    v_message := v_message || ' - ' || v_job.property_type;
  END IF;
  IF v_job.budget_amount IS NOT NULL THEN
    v_message := v_message || ' - $' || v_job.budget_amount::TEXT || ' ' || COALESCE(v_job.budget_currency, 'AUD');
  END IF;

  -- Find matching inspectors and create notifications
  -- Matches any approved user with a covering service area or home within 5km
  -- Rate limiting note: Could add a check here to limit notifications per inspector per hour
  FOR v_inspector IN
    SELECT DISTINCT p.id AS inspector_id
    FROM public.profiles p
    WHERE p.approval_status = 'approved'
      AND p.id != v_job.creator_id
      AND (
        -- Match 1: Radius service area covers the job location
        EXISTS (
          SELECT 1 FROM public.agent_service_areas sa
          WHERE sa.agent_id = p.id
            AND sa.area_type = 'radius'
            AND v_job.property_location IS NOT NULL
            AND ST_DWithin(sa.center_point, v_job.property_location, sa.radius_km * 1000)
        )
        OR
        -- Match 2: Global service area (matches everything)
        EXISTS (
          SELECT 1 FROM public.agent_service_areas sa
          WHERE sa.agent_id = p.id
            AND sa.area_type = 'global'
        )
        OR
        -- Match 3: Region service area name appears in job address
        EXISTS (
          SELECT 1 FROM public.agent_service_areas sa
          WHERE sa.agent_id = p.id
            AND sa.area_type = 'region'
            AND sa.region_name IS NOT NULL
            AND v_job.property_address ILIKE '%' || sa.region_name || '%'
        )
        OR
        -- Match 4: State service area name appears in job address
        OR
        EXISTS (
          SELECT 1 FROM public.agent_service_areas sa
          WHERE sa.agent_id = p.id
            AND sa.area_type = 'state'
            AND sa.state_name IS NOT NULL
            AND v_job.property_address ILIKE '%' || sa.state_name || '%'
        )
        OR
        -- Match 5: Country service area name appears in job address
        EXISTS (
          SELECT 1 FROM public.agent_service_areas sa
          WHERE sa.agent_id = p.id
            AND sa.area_type = 'country'
            AND sa.country_name IS NOT NULL
            AND v_job.property_address ILIKE '%' || sa.country_name || '%'
        )
        OR
        -- Match 6: Inspector's home location within 5km of job
        (
          v_job.property_location IS NOT NULL
          AND p.latitude IS NOT NULL
          AND p.longitude IS NOT NULL
          AND ST_DWithin(
            v_job.property_location,
            ST_MakePoint(p.longitude, p.latitude)::geography,
            5000  -- 5km in meters
          )
        )
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, job_id, from_user_id, delivered_in_app)
    VALUES (
      v_inspector.inspector_id,
      'job_posted_nearby',
      'New inspection job nearby',
      v_message,
      p_job_id,
      v_job.creator_id,
      true
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Grant execute to authenticated users (they call this after posting a job)
GRANT EXECUTE ON FUNCTION public.notify_nearby_inspectors(UUID) TO authenticated;
