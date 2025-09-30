-- Create policy for anonymous (unauthenticated) users to read packages
CREATE POLICY "anonymous_users_can_read_packages" 
ON public.offers_packages 
FOR SELECT 
TO anon 
USING (true);

-- Also create similar policies for the other tables mentioned
CREATE POLICY "anonymous_users_can_read_package_items" 
ON public.offers_package_items 
FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "anonymous_users_can_read_products" 
ON public.offers_products 
FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "anonymous_users_can_read_product_groups" 
ON public.offers_product_groups 
FOR SELECT 
TO anon 
USING (true);