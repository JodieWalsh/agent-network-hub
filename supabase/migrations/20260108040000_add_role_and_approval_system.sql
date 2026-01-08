-- Add role-based access control system to profiles
-- ROLES = Permission levels (admin, verified_professional, pending_professional, guest)
-- USER TYPES = Professions (buyers_agent, selling_agent, conveyancer, etc.) - already exists

-- Add role enum (permissions, not professions)
CREATE TYPE public.user_role AS ENUM ('admin', 'verified_professional', 'pending_professional', 'guest');

-- Add approval status enum
CREATE TYPE public.approval_status AS ENUM ('approved', 'pending', 'rejected');

-- Alter profiles table to add role and approval fields
ALTER TABLE public.profiles
  ADD COLUMN role public.user_role DEFAULT 'guest' NOT NULL,
  ADD COLUMN approval_status public.approval_status DEFAULT 'approved' NOT NULL,
  ADD COLUMN approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN application_date TIMESTAMP WITH TIME ZONE;

-- Backfill existing users based on is_verified flag
UPDATE public.profiles
SET role = CASE
  WHEN is_verified = true THEN 'verified_professional'::public.user_role
  ELSE 'guest'::public.user_role
END;

-- Create indexes for performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_approval_status ON public.profiles(approval_status);

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role::TEXT = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
