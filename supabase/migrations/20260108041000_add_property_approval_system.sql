-- Add approval system to properties table
-- Properties submitted by verified professionals require admin approval before appearing in marketplace

-- Add approval fields to properties table
ALTER TABLE public.properties
  ADD COLUMN approval_status public.approval_status DEFAULT 'pending' NOT NULL,
  ADD COLUMN approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Backfill existing properties as approved (so they remain visible)
UPDATE public.properties
SET approval_status = 'approved',
    approved_at = created_at;

-- Create indexes for efficient querying
CREATE INDEX idx_properties_approval_status ON public.properties(approval_status);
CREATE INDEX idx_properties_owner_id ON public.properties(owner_id);
