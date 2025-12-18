-- Drop the FK constraint temporarily
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;

-- Insert mock profiles
INSERT INTO public.profiles (id, full_name, avatar_url, user_type, specialization, reputation_score, points, city) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Sarah Mitchell', NULL, 'buyers_agent', 'investment', 87, 245, 'Sydney'),
('550e8400-e29b-41d4-a716-446655440002', 'James Chen', NULL, 'real_estate_agent', 'luxury', 92, 310, 'Melbourne'),
('550e8400-e29b-41d4-a716-446655440003', 'Emma Thompson', NULL, 'conveyancer', 'residential', 78, 180, 'Brisbane'),
('550e8400-e29b-41d4-a716-446655440004', 'Michael Roberts', NULL, 'mortgage_broker', 'investment', 85, 220, 'Perth'),
('550e8400-e29b-41d4-a716-446655440005', 'Lisa Anderson', NULL, 'buyers_agent', 'luxury', 95, 380, 'Sydney');

-- Re-add the FK constraint (but allow existing mock data by making it deferrable)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;