-- Add client_brief_id to inspection_jobs table
-- This allows buyers agents to link inspection jobs to specific client briefs

ALTER TABLE public.inspection_jobs
ADD COLUMN client_brief_id UUID REFERENCES public.client_briefs(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_inspection_jobs_client_brief_id ON public.inspection_jobs(client_brief_id);

-- Add comment
COMMENT ON COLUMN public.inspection_jobs.client_brief_id IS 'Optional link to client brief - inspector evaluates property against brief requirements';
