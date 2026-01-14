-- ============================================================================
-- INSPECTION MARKETPLACE: Database Foundation
-- ============================================================================
-- Creates the complete theatrical inspection marketplace system
-- 6 tables: jobs, bids, reports, payments, reviews, badges
-- ============================================================================

-- ============================================================================
-- TABLE 1: inspection_jobs
-- ============================================================================
-- The core job posting table - each "Property Spotlight"

CREATE TABLE IF NOT EXISTS public.inspection_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who posted the job
  requesting_agent_id UUID REFERENCES public.profiles(id) NOT NULL,

  -- Property details (can link to existing property OR be standalone)
  property_id UUID REFERENCES public.properties(id) NULL,
  property_address TEXT NOT NULL,
  property_city TEXT NOT NULL,
  property_state TEXT NOT NULL,
  property_country TEXT NOT NULL,
  property_postcode TEXT,
  property_lat DECIMAL(10, 8),
  property_lng DECIMAL(11, 8),
  property_type TEXT CHECK (property_type IN ('house', 'apartment', 'townhouse', 'land', 'commercial')),
  property_listing_url TEXT,
  property_listing_price TEXT,

  -- Job details
  title TEXT NOT NULL,
  description TEXT,

  -- What's needed (checklist)
  requires_photos BOOLEAN DEFAULT true,
  requires_video BOOLEAN DEFAULT false,
  requires_neighbourhood_assessment BOOLEAN DEFAULT true,
  requires_measurements BOOLEAN DEFAULT false,
  special_requirements TEXT,

  -- Budget and timing
  budget_min INTEGER NOT NULL, -- in cents
  budget_max INTEGER NOT NULL, -- in cents
  budget_currency TEXT DEFAULT 'AUD',
  inspection_date_from DATE NOT NULL,
  inspection_date_to DATE NOT NULL,
  preferred_time_of_day TEXT CHECK (preferred_time_of_day IN ('morning', 'afternoon', 'evening', 'flexible')),

  -- Status workflow
  status TEXT DEFAULT 'open' CHECK (status IN (
    'open',
    'in_negotiation',
    'assigned',
    'in_progress',
    'pending_review',
    'completed',
    'cancelled',
    'expired'
  )),

  -- The chosen inspector (set when job is assigned)
  assigned_inspector_id UUID REFERENCES public.profiles(id) NULL,
  agreed_price INTEGER, -- final negotiated price in cents
  agreed_date DATE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Indexes for inspection_jobs
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_status ON public.inspection_jobs(status);
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_requesting_agent ON public.inspection_jobs(requesting_agent_id);
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_assigned_inspector ON public.inspection_jobs(assigned_inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_location ON public.inspection_jobs(property_city, property_country);
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_created_at ON public.inspection_jobs(created_at DESC);

-- ============================================================================
-- TABLE 2: inspection_bids
-- ============================================================================
-- Bids/interest from inspectors wanting to do the job

CREATE TABLE IF NOT EXISTS public.inspection_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.inspection_jobs(id) ON DELETE CASCADE NOT NULL,
  inspector_id UUID REFERENCES public.profiles(id) NOT NULL,

  -- The bid
  proposed_price INTEGER NOT NULL, -- in cents
  proposed_date DATE NOT NULL,
  message TEXT,

  -- Inspector's credentials for this bid
  years_experience INTEGER,
  local_knowledge_note TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'shortlisted',
    'accepted',
    'declined',
    'withdrawn'
  )),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate bids
  UNIQUE(job_id, inspector_id)
);

-- Indexes for inspection_bids
CREATE INDEX IF NOT EXISTS idx_inspection_bids_job ON public.inspection_bids(job_id);
CREATE INDEX IF NOT EXISTS idx_inspection_bids_inspector ON public.inspection_bids(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspection_bids_status ON public.inspection_bids(status);

-- ============================================================================
-- TABLE 3: inspection_reports
-- ============================================================================
-- The comprehensive inspection report submitted by the inspector

CREATE TABLE IF NOT EXISTS public.inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.inspection_jobs(id) NOT NULL UNIQUE,
  inspector_id UUID REFERENCES public.profiles(id) NOT NULL,

  -- Section 1: First Impressions
  first_impression_vibe INTEGER CHECK (first_impression_vibe BETWEEN 1 AND 10),
  matches_photos TEXT CHECK (matches_photos IN ('yes', 'mostly', 'no')),
  gut_feeling_rating INTEGER CHECK (gut_feeling_rating BETWEEN 1 AND 10),
  first_impression_comments TEXT,

  -- Section 2: Exterior
  exterior_roof_condition TEXT CHECK (exterior_roof_condition IN ('good', 'fair', 'poor', 'not_visible')),
  exterior_walls_condition TEXT CHECK (exterior_walls_condition IN ('good', 'fair', 'poor')),
  exterior_garden_condition TEXT CHECK (exterior_garden_condition IN ('well_maintained', 'average', 'overgrown', 'none')),
  exterior_parking TEXT,
  exterior_comments TEXT,

  -- Section 3: Interior - Living Areas
  interior_living_condition TEXT CHECK (interior_living_condition IN ('excellent', 'good', 'fair', 'poor')),
  interior_living_natural_light TEXT CHECK (interior_living_natural_light IN ('dark', 'average', 'bright', 'amazing')),
  interior_living_size_accuracy TEXT CHECK (interior_living_size_accuracy IN ('smaller', 'accurate', 'larger')),
  interior_living_comments TEXT,

  -- Section 3: Interior - Kitchen
  interior_kitchen_condition TEXT CHECK (interior_kitchen_condition IN ('excellent', 'good', 'fair', 'poor')),
  interior_kitchen_appliances TEXT CHECK (interior_kitchen_appliances IN ('modern', 'dated', 'needs_replacement')),
  interior_kitchen_storage TEXT CHECK (interior_kitchen_storage IN ('plenty', 'adequate', 'limited')),
  interior_kitchen_comments TEXT,

  -- Section 3: Interior - Bathrooms
  interior_bathroom_condition TEXT CHECK (interior_bathroom_condition IN ('excellent', 'good', 'fair', 'poor')),
  interior_bathroom_count INTEGER,
  interior_bathroom_comments TEXT,

  -- Section 3: Interior - Bedrooms
  interior_bedroom_count INTEGER,
  interior_bedroom_sizes TEXT CHECK (interior_bedroom_sizes IN ('generous', 'adequate', 'compact')),
  interior_bedroom_storage TEXT CHECK (interior_bedroom_storage IN ('built_in_robes', 'some_storage', 'no_storage')),
  interior_bedroom_comments TEXT,

  -- Section 3: Interior - Other Spaces
  interior_other_spaces TEXT[], -- array of: garage, laundry, study, storage, balcony, courtyard, pool
  interior_other_comments TEXT,

  -- Section 4: Neighbourhood
  neighbourhood_street_feel TEXT CHECK (neighbourhood_street_feel IN ('quiet', 'moderate', 'busy')),
  neighbourhood_traffic_noise TEXT CHECK (neighbourhood_traffic_noise IN ('silent', 'light', 'moderate', 'heavy')),
  neighbourhood_parking TEXT CHECK (neighbourhood_parking IN ('easy', 'moderate', 'difficult')),
  neighbourhood_safety_rating INTEGER CHECK (neighbourhood_safety_rating BETWEEN 1 AND 5),
  neighbourhood_amenities TEXT[], -- array of: shops, cafes, restaurants, parks, schools, transport, gym
  neighbourhood_comments TEXT,

  -- Section 5: Red Flags & Concerns
  has_structural_concerns BOOLEAN DEFAULT false,
  has_damp_mold_signs BOOLEAN DEFAULT false,
  has_unusual_smells BOOLEAN DEFAULT false,
  has_pest_signs BOOLEAN DEFAULT false,
  has_noise_issues BOOLEAN DEFAULT false,
  has_access_issues BOOLEAN DEFAULT false,
  concerns_comments TEXT,

  -- Section 6: Standout Features
  standout_features TEXT[],
  best_feature TEXT,
  would_personally_buy TEXT CHECK (would_personally_buy IN ('yes', 'maybe', 'no')),
  standout_comments TEXT,

  -- Section 7: Final Verdict
  overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10) NOT NULL,
  recommendation TEXT CHECK (recommendation IN ('highly_recommend', 'worth_considering', 'not_recommended')) NOT NULL,
  summary_comments TEXT NOT NULL,

  -- Section 8: Additional Comments
  additional_comments TEXT,
  questions_to_ask_agent TEXT,
  second_visit_tips TEXT,

  -- Media
  photos JSONB DEFAULT '[]', -- array of {url, caption, section}
  video_url TEXT,
  video_thumbnail_url TEXT,
  voice_notes JSONB DEFAULT '[]', -- array of {url, duration, section}

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

-- Indexes for inspection_reports
CREATE INDEX IF NOT EXISTS idx_inspection_reports_job ON public.inspection_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_inspector ON public.inspection_reports(inspector_id);

-- ============================================================================
-- TABLE 4: inspection_payments
-- ============================================================================
-- Payment tracking with platform fee (10%)

CREATE TABLE IF NOT EXISTS public.inspection_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.inspection_jobs(id) NOT NULL UNIQUE,

  -- Parties
  payer_id UUID REFERENCES public.profiles(id) NOT NULL,
  payee_id UUID REFERENCES public.profiles(id) NOT NULL,

  -- Amounts (all in cents)
  gross_amount INTEGER NOT NULL, -- agreed price
  platform_fee INTEGER NOT NULL, -- 10% cut
  net_amount INTEGER NOT NULL, -- what inspector receives
  currency TEXT DEFAULT 'AUD',

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'held',
    'released',
    'refunded',
    'disputed'
  )),

  -- Stripe integration (for future)
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ
);

-- Indexes for inspection_payments
CREATE INDEX IF NOT EXISTS idx_inspection_payments_job ON public.inspection_payments(job_id);
CREATE INDEX IF NOT EXISTS idx_inspection_payments_payer ON public.inspection_payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_inspection_payments_payee ON public.inspection_payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_inspection_payments_status ON public.inspection_payments(status);

-- ============================================================================
-- TABLE 5: inspection_reviews
-- ============================================================================
-- Two-way reviews: requester reviews inspector, inspector reviews requester

CREATE TABLE IF NOT EXISTS public.inspection_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.inspection_jobs(id) NOT NULL,

  -- Who is reviewing whom
  reviewer_id UUID REFERENCES public.profiles(id) NOT NULL,
  reviewee_id UUID REFERENCES public.profiles(id) NOT NULL,
  review_type TEXT CHECK (review_type IN ('requester_to_inspector', 'inspector_to_requester')),

  -- The review
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  title TEXT,
  comment TEXT,

  -- Specific aspects (optional)
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  professionalism_rating INTEGER CHECK (professionalism_rating BETWEEN 1 AND 5),
  timeliness_rating INTEGER CHECK (timeliness_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),

  -- Would work with again?
  would_work_again BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One review per direction per job
  UNIQUE(job_id, reviewer_id, reviewee_id)
);

-- Indexes for inspection_reviews
CREATE INDEX IF NOT EXISTS idx_inspection_reviews_job ON public.inspection_reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reviews_reviewer ON public.inspection_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reviews_reviewee ON public.inspection_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reviews_rating ON public.inspection_reviews(reviewee_id, rating);

-- ============================================================================
-- TABLE 6: inspection_badges (GAMIFICATION!)
-- ============================================================================
-- Badges for achievements - make it fun and rewarding!

CREATE TABLE IF NOT EXISTS public.inspection_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,

  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'first_inspection',
    'five_inspections',
    'ten_inspections',
    'twenty_five_inspections',
    'fifty_inspections',
    'hundred_inspections',
    'photographer',
    'filmmaker',
    'five_star_streak',
    'quick_responder',
    'local_expert',
    'globe_trotter',
    'trusted_inspector',
    'top_earner_monthly',
    'first_job_posted',
    'generous_reviewer'
  )),

  earned_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, badge_type)
);

-- Indexes for inspection_badges
CREATE INDEX IF NOT EXISTS idx_inspection_badges_user ON public.inspection_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_badges_type ON public.inspection_badges(badge_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.inspection_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_badges ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: inspection_jobs
-- ============================================================================

-- Everyone can see all open jobs (this is a marketplace!)
CREATE POLICY "inspection_jobs_select_policy"
ON public.inspection_jobs FOR SELECT
USING (
  status IN ('open', 'in_negotiation')
  OR requesting_agent_id = auth.uid()
  OR assigned_inspector_id = auth.uid()
  OR public.is_admin(auth.uid())
);

-- Authenticated users can create jobs
CREATE POLICY "inspection_jobs_insert_policy"
ON public.inspection_jobs FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = requesting_agent_id
);

-- Requesters can update their own jobs, assigned inspectors can update status
CREATE POLICY "inspection_jobs_update_policy"
ON public.inspection_jobs FOR UPDATE
TO authenticated
USING (
  auth.uid() = requesting_agent_id
  OR auth.uid() = assigned_inspector_id
  OR public.is_admin(auth.uid())
);

-- Requesters can delete their own jobs (only if no bids accepted)
CREATE POLICY "inspection_jobs_delete_policy"
ON public.inspection_jobs FOR DELETE
TO authenticated
USING (
  auth.uid() = requesting_agent_id
  AND status = 'open'
);

-- ============================================================================
-- RLS POLICIES: inspection_bids
-- ============================================================================

-- Inspectors can see their own bids, requesters can see all bids on their jobs
CREATE POLICY "inspection_bids_select_policy"
ON public.inspection_bids FOR SELECT
USING (
  auth.uid() = inspector_id
  OR auth.uid() IN (
    SELECT requesting_agent_id FROM public.inspection_jobs WHERE id = job_id
  )
  OR public.is_admin(auth.uid())
);

-- Authenticated users can create bids
CREATE POLICY "inspection_bids_insert_policy"
ON public.inspection_bids FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = inspector_id
  -- Can't bid on own jobs
  AND NOT EXISTS (
    SELECT 1 FROM public.inspection_jobs
    WHERE id = job_id AND requesting_agent_id = auth.uid()
  )
);

-- Inspectors can update their own bids, requesters can update bid status
CREATE POLICY "inspection_bids_update_policy"
ON public.inspection_bids FOR UPDATE
TO authenticated
USING (
  auth.uid() = inspector_id
  OR auth.uid() IN (
    SELECT requesting_agent_id FROM public.inspection_jobs WHERE id = job_id
  )
  OR public.is_admin(auth.uid())
);

-- Inspectors can delete/withdraw their own bids
CREATE POLICY "inspection_bids_delete_policy"
ON public.inspection_bids FOR DELETE
TO authenticated
USING (
  auth.uid() = inspector_id
  AND status = 'pending'
);

-- ============================================================================
-- RLS POLICIES: inspection_reports
-- ============================================================================

-- Requesters and assigned inspectors can see reports for their jobs
CREATE POLICY "inspection_reports_select_policy"
ON public.inspection_reports FOR SELECT
USING (
  auth.uid() = inspector_id
  OR auth.uid() IN (
    SELECT requesting_agent_id FROM public.inspection_jobs WHERE id = job_id
  )
  OR public.is_admin(auth.uid())
);

-- Only assigned inspectors can create reports for their jobs
CREATE POLICY "inspection_reports_insert_policy"
ON public.inspection_reports FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = inspector_id
  AND auth.uid() IN (
    SELECT assigned_inspector_id FROM public.inspection_jobs WHERE id = job_id
  )
);

-- Inspectors can update their own reports (before submission)
CREATE POLICY "inspection_reports_update_policy"
ON public.inspection_reports FOR UPDATE
TO authenticated
USING (
  auth.uid() = inspector_id
  AND submitted_at IS NULL
);

-- ============================================================================
-- RLS POLICIES: inspection_payments
-- ============================================================================

-- Only involved parties can see payments
CREATE POLICY "inspection_payments_select_policy"
ON public.inspection_payments FOR SELECT
USING (
  auth.uid() = payer_id
  OR auth.uid() = payee_id
  OR public.is_admin(auth.uid())
);

-- System/admin creates payment records
CREATE POLICY "inspection_payments_insert_policy"
ON public.inspection_payments FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR auth.uid() = payer_id
);

-- Payer and admin can update payment status
CREATE POLICY "inspection_payments_update_policy"
ON public.inspection_payments FOR UPDATE
TO authenticated
USING (
  auth.uid() = payer_id
  OR public.is_admin(auth.uid())
);

-- ============================================================================
-- RLS POLICIES: inspection_reviews
-- ============================================================================

-- Reviews are public once submitted (everyone can see)
CREATE POLICY "inspection_reviews_select_policy"
ON public.inspection_reviews FOR SELECT
USING (true);

-- Involved parties can create reviews
CREATE POLICY "inspection_reviews_insert_policy"
ON public.inspection_reviews FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND (
    -- Requester reviewing inspector
    (review_type = 'requester_to_inspector'
     AND auth.uid() IN (SELECT requesting_agent_id FROM public.inspection_jobs WHERE id = job_id)
     AND reviewee_id IN (SELECT assigned_inspector_id FROM public.inspection_jobs WHERE id = job_id))
    OR
    -- Inspector reviewing requester
    (review_type = 'inspector_to_requester'
     AND auth.uid() IN (SELECT assigned_inspector_id FROM public.inspection_jobs WHERE id = job_id)
     AND reviewee_id IN (SELECT requesting_agent_id FROM public.inspection_jobs WHERE id = job_id))
  )
);

-- Reviews cannot be updated or deleted (integrity)
-- (Could add admin exception if needed)

-- ============================================================================
-- RLS POLICIES: inspection_badges
-- ============================================================================

-- Everyone can see all badges (public achievements)
CREATE POLICY "inspection_badges_select_policy"
ON public.inspection_badges FOR SELECT
USING (true);

-- System/admin creates badges
CREATE POLICY "inspection_badges_insert_policy"
ON public.inspection_badges FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR auth.uid() = user_id -- Allow users to trigger their own badges via app logic
);

-- Badges cannot be deleted (permanent achievements)

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate platform fee (10%)
CREATE OR REPLACE FUNCTION public.calculate_platform_fee(gross_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(gross_amount * 0.10);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get inspector stats (for profile display)
CREATE OR REPLACE FUNCTION public.get_inspector_stats(inspector_user_id UUID)
RETURNS TABLE (
  total_inspections INTEGER,
  average_rating DECIMAL,
  total_earnings INTEGER,
  badge_count INTEGER,
  five_star_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ij.id)::INTEGER AS total_inspections,
    ROUND(AVG(ir.rating), 2) AS average_rating,
    COALESCE(SUM(ip.net_amount), 0)::INTEGER AS total_earnings,
    COUNT(DISTINCT ib.id)::INTEGER AS badge_count,
    COUNT(DISTINCT CASE WHEN ir.rating = 5 THEN ir.id END)::INTEGER AS five_star_count
  FROM public.inspection_jobs ij
  LEFT JOIN public.inspection_reviews ir ON ir.job_id = ij.id AND ir.reviewee_id = inspector_user_id
  LEFT JOIN public.inspection_payments ip ON ip.job_id = ij.id AND ip.payee_id = inspector_user_id
  LEFT JOIN public.inspection_badges ib ON ib.user_id = inspector_user_id
  WHERE ij.assigned_inspector_id = inspector_user_id
    AND ij.status = 'completed';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can bid on a job
CREATE OR REPLACE FUNCTION public.can_bid_on_job(job_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  job_status TEXT;
  is_requester BOOLEAN;
  has_existing_bid BOOLEAN;
BEGIN
  -- Get job status and check if user is the requester
  SELECT
    ij.status,
    ij.requesting_agent_id = user_uuid,
    EXISTS(SELECT 1 FROM public.inspection_bids WHERE job_id = job_uuid AND inspector_id = user_uuid)
  INTO job_status, is_requester, has_existing_bid
  FROM public.inspection_jobs ij
  WHERE ij.id = job_uuid;

  -- Can bid if job is open, user is not requester, and hasn't bid yet
  RETURN (job_status = 'open' AND NOT is_requester AND NOT has_existing_bid);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on inspection_jobs
CREATE OR REPLACE FUNCTION public.update_inspection_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inspection_jobs_updated_at
BEFORE UPDATE ON public.inspection_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_inspection_jobs_updated_at();

-- Update updated_at timestamp on inspection_bids
CREATE TRIGGER trigger_inspection_bids_updated_at
BEFORE UPDATE ON public.inspection_bids
FOR EACH ROW
EXECUTE FUNCTION public.update_inspection_jobs_updated_at();

-- Update updated_at timestamp on inspection_reports
CREATE TRIGGER trigger_inspection_reports_updated_at
BEFORE UPDATE ON public.inspection_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_inspection_jobs_updated_at();

-- ============================================================================
-- COMPLETE! DATABASE FOUNDATION READY
-- ============================================================================
-- 6 tables created with comprehensive RLS policies
-- Helper functions for stats and validation
-- Triggers for timestamp management
-- Ready for Phase 2: Job Posting Experience! 🎬
-- ============================================================================
