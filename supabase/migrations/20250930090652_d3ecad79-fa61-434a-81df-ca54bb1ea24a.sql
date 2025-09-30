-- Check and fix the policies to match wallboxen table approach
-- The wallboxen table uses "wallboxen_public_read" and works fine

-- First, let's see the current policies and fix them to match wallboxen exactly

-- Drop all existing policies for the four tables  
DROP POLICY IF EXISTS "public_read_access" ON public.offers_packages;
DROP POLICY IF EXISTS "public_read_offers_packages" ON public.offers_packages;

DROP POLICY IF EXISTS "public_read_access" ON public.offers_package_items;  
DROP POLICY IF EXISTS "public_read_offers_package_items" ON public.offers_package_items;

DROP POLICY IF EXISTS "public_read_access" ON public.offers_product_groups;
DROP POLICY IF EXISTS "public_read_offers_product_groups" ON public.offers_product_groups;

DROP POLICY IF EXISTS "public_read_access" ON public.offers_products;
DROP POLICY IF EXISTS "public_read_offers_products" ON public.offers_products;

-- Now create policies exactly like wallboxen (which uses "wallboxen_public_read")
CREATE POLICY "offers_packages_public_read" 
ON public.offers_packages 
FOR SELECT 
USING (true);

CREATE POLICY "offers_package_items_public_read" 
ON public.offers_package_items 
FOR SELECT 
USING (true);

CREATE POLICY "offers_product_groups_public_read" 
ON public.offers_product_groups 
FOR SELECT 
USING (true);

CREATE POLICY "offers_products_public_read" 
ON public.offers_products 
FOR SELECT 
USING (true);