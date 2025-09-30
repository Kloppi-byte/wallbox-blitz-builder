-- Drop existing policies
DROP POLICY IF EXISTS "offers_package_parameter_links_public_read" ON public.offers_package_parameter_links;
DROP POLICY IF EXISTS "offers_package_parameter_definitions_public_read" ON public.offers_package_parameter_definitions;

-- Create policies that work for both authenticated and anonymous users
CREATE POLICY "offers_package_parameter_links_select_all" 
ON public.offers_package_parameter_links 
FOR SELECT 
TO public, authenticated
USING (true);

CREATE POLICY "offers_package_parameter_definitions_select_all" 
ON public.offers_package_parameter_definitions 
FOR SELECT 
TO public, authenticated
USING (true);