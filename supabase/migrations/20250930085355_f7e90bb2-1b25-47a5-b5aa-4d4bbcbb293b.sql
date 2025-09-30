-- Drop existing problematic policies and create simple public read policies
DROP POLICY IF EXISTS "offers_packages_public_read" ON public.offers_packages;
DROP POLICY IF EXISTS "authenticated_users_can_read_packages" ON public.offers_packages;
DROP POLICY IF EXISTS "anonymous_users_can_read_packages" ON public.offers_packages;

-- Create simple public read policy that works for everyone
CREATE POLICY "public_read_offers_packages" 
ON public.offers_packages 
FOR SELECT 
USING (true);

-- Do the same for the other tables
DROP POLICY IF EXISTS "offers_package_items_public_read" ON public.offers_package_items;
DROP POLICY IF EXISTS "anonymous_users_can_read_package_items" ON public.offers_package_items;

CREATE POLICY "public_read_offers_package_items" 
ON public.offers_package_items 
FOR SELECT 
USING (true);

-- offers_products
DROP POLICY IF EXISTS "offers_products_public_read" ON public.offers_products;
DROP POLICY IF EXISTS "anonymous_users_can_read_products" ON public.offers_products;

CREATE POLICY "public_read_offers_products" 
ON public.offers_products 
FOR SELECT 
USING (true);

-- offers_product_groups  
DROP POLICY IF EXISTS "offers_product_groups_public_read" ON public.offers_product_groups;
DROP POLICY IF EXISTS "anonymous_users_can_read_product_groups" ON public.offers_product_groups;

CREATE POLICY "public_read_offers_product_groups" 
ON public.offers_product_groups 
FOR SELECT 
USING (true);