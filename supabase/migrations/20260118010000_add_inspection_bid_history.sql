-- Inspection Bid History Table
-- Tracks all changes made to inspection bids for audit trail/transparency

CREATE TABLE IF NOT EXISTS public.inspection_bid_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES public.inspection_bids(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'withdrawn')),

  -- Price changes
  previous_price INTEGER,
  new_price INTEGER,

  -- Date changes
  previous_date DATE,
  new_date DATE,

  -- Message changes
  previous_message TEXT,
  new_message TEXT,

  -- Status changes
  previous_status TEXT,
  new_status TEXT,

  -- Reason for the change (required for updates)
  change_reason TEXT
);

-- Enable RLS
ALTER TABLE public.inspection_bid_history ENABLE ROW LEVEL SECURITY;

-- Index for faster lookups by bid
CREATE INDEX IF NOT EXISTS idx_bid_history_bid_id ON public.inspection_bid_history(bid_id);

-- RLS Policies

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view history for their own bids" ON public.inspection_bid_history;
DROP POLICY IF EXISTS "Users can insert history for their own bids" ON public.inspection_bid_history;

-- Users can view history for bids they made or jobs they created
CREATE POLICY "Users can view history for their own bids"
  ON public.inspection_bid_history
  FOR SELECT
  USING (
    changed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.inspection_bids b
      JOIN public.inspection_jobs j ON b.job_id = j.id
      WHERE b.id = bid_id
      AND (b.inspector_id = auth.uid() OR j.creator_id = auth.uid())
    )
  );

-- Users can insert history for their own bids
CREATE POLICY "Users can insert history for their own bids"
  ON public.inspection_bid_history
  FOR INSERT
  WITH CHECK (
    changed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.inspection_bids b
      WHERE b.id = bid_id
      AND b.inspector_id = auth.uid()
    )
  );

COMMENT ON TABLE public.inspection_bid_history IS 'Audit trail for all changes made to inspection bids';
COMMENT ON COLUMN public.inspection_bid_history.change_type IS 'Type of change: created, updated, or withdrawn';
COMMENT ON COLUMN public.inspection_bid_history.change_reason IS 'User-provided reason for the change';
