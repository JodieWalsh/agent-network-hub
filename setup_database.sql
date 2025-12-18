-- Agent Hub Database Setup
-- Run this entire file in your Supabase SQL Editor

-- Create enums for user types and specializations
CREATE TYPE public.user_type AS ENUM ('buyers_agent', 'real_estate_agent', 'conveyancer', 'mortgage_broker');
CREATE TYPE public.specialization_type AS ENUM ('investment', 'luxury', 'residential', 'commercial');
CREATE TYPE public.property_status AS ENUM ('off_market', 'under_offer', 'sold');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  user_type public.user_type NOT NULL,
  specialization public.specialization_type DEFAULT 'residential',
  reputation_score INTEGER DEFAULT 0 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  points INTEGER DEFAULT 0,
  city TEXT,
  bio TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  home_base_address TEXT,
  service_regions TEXT[],
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  price INTEGER NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  thumbnail_url TEXT,
  status public.property_status DEFAULT 'off_market',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  property_address TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

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
  currency_code TEXT DEFAULT 'AUD',
  deadline DATE NOT NULL,
  status inspection_status DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_requests ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Properties RLS policies
CREATE POLICY "Properties are viewable by everyone"
ON public.properties FOR SELECT
USING (true);

CREATE POLICY "Property owners can update their properties"
ON public.properties FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can insert properties"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Inspection requests RLS policies
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

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspection_requests_updated_at
BEFORE UPDATE ON public.inspection_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inspection_requests_currency ON public.inspection_requests(currency_code);
CREATE INDEX IF NOT EXISTS idx_inspection_requests_status ON public.inspection_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
