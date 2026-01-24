-- Add any missing columns that the form uses
ALTER TABLE public.inspection_jobs
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS client_brief_id UUID REFERENCES public.client_briefs(id);
