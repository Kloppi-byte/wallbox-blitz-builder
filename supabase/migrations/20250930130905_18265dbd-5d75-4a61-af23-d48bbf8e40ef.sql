-- Drop existing policies on offers_package_parameter_links
DROP POLICY IF EXISTS "offers_package_parameter_links_public_read" ON public.offers_package_parameter_links;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.offers_package_parameter_links;
DROP POLICY IF EXISTS "public_read" ON public.offers_package_parameter_links;

-- Drop existing policies on offers_package_parameter_definitions
DROP POLICY IF EXISTS "offers_package_parameter_definitions_public_read" ON public.offers_package_parameter_definitions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.offers_package_parameter_definitions;
DROP POLICY IF EXISTS "public_read" ON public.offers_package_parameter_definitions;

-- Create new public read policies matching the pattern of other offers_* tables
CREATE POLICY "offers_package_parameter_links_public_read" 
ON public.offers_package_parameter_links 
FOR SELECT 
USING (true);

CREATE POLICY "offers_package_parameter_definitions_public_read" 
ON public.offers_package_parameter_definitions 
FOR SELECT 
USING (true);