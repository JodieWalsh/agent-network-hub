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
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

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