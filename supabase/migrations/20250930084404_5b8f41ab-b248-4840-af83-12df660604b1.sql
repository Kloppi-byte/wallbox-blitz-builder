-- Create the offers_packages table if it doesn't already exist
-- This table stores the available packages for elektrosanierung offers
CREATE TABLE IF NOT EXISTS public.offers_packages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category VARCHAR(255),
  quality_level VARCHAR(255) DEFAULT 'Standard',
  is_optional BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.offers_packages ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read packages
CREATE POLICY "authenticated_users_can_read_packages" 
ON public.offers_packages 
FOR SELECT 
TO authenticated 
USING (true);

-- Create policy for admin users to manage packages
CREATE POLICY "admin_users_can_manage_packages" 
ON public.offers_packages 
FOR ALL 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));