-- Create service_type enum
CREATE TYPE public.service_type AS ENUM (
  'video_walkthrough',
  'photo_inspection',
  'auction_bidding',
  'contract_collection',
  'property_assessment',
  'open_home_attendance'
);

-- Create inspection_status enum
CREATE TYPE public.inspection_status AS ENUM (
  'open',
  'assigned',
  'completed',
  'cancelled'
);

-- Add geography fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS home_base_address TEXT,
ADD COLUMN IF NOT EXISTS service_regions TEXT[];

-- Add geography fields to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS property_address TEXT;

-- Create inspection_requests table
CREATE TABLE public.inspection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  property_address TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  service_type service_type NOT NULL,
  budget INTEGER NOT NULL,
  deadline DATE NOT NULL,
  status inspection_status DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on inspection_requests
ALTER TABLE public.inspection_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspection_requests
CREATE POLICY "Inspection requests are viewable by everyone"
ON public.inspection_requests
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create inspection requests"
ON public.inspection_requests
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own inspection requests"
ON public.inspection_requests
FOR UPDATE
USING (auth.uid() = requester_id);

CREATE POLICY "Users can delete their own inspection requests"
ON public.inspection_requests
FOR DELETE
USING (auth.uid() = requester_id);

-- Add trigger for updated_at on inspection_requests
CREATE TRIGGER update_inspection_requests_updated_at
BEFORE UPDATE ON public.inspection_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();