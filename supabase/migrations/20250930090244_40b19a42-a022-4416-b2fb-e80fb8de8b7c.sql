-- Part 1: Clean RLS policies for all four tables

-- offers_packages table
DROP POLICY IF EXISTS "public_read_offers_packages" ON public.offers_packages;
DROP POLICY IF EXISTS "offers_packages_public_read" ON public.offers_packages;
DROP POLICY IF EXISTS "authenticated_users_can_read_packages" ON public.offers_packages;
DROP POLICY IF EXISTS "anonymous_users_can_read_packages" ON public.offers_packages;

ALTER TABLE public.offers_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_access" 
ON public.offers_packages 
FOR SELECT 
TO public 
USING (true);

-- offers_package_items table  
DROP POLICY IF EXISTS "public_read_offers_package_items" ON public.offers_package_items;
DROP POLICY IF EXISTS "offers_package_items_public_read" ON public.offers_package_items;
DROP POLICY IF EXISTS "anonymous_users_can_read_package_items" ON public.offers_package_items;

ALTER TABLE public.offers_package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_access" 
ON public.offers_package_items 
FOR SELECT 
TO public 
USING (true);

-- offers_product_groups table
DROP POLICY IF EXISTS "public_read_offers_product_groups" ON public.offers_product_groups;
DROP POLICY IF EXISTS "offers_product_groups_public_read" ON public.offers_product_groups;
DROP POLICY IF EXISTS "anonymous_users_can_read_product_groups" ON public.offers_product_groups;

ALTER TABLE public.offers_product_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_access" 
ON public.offers_product_groups 
FOR SELECT 
TO public 
USING (true);

-- offers_products table
DROP POLICY IF EXISTS "public_read_offers_products" ON public.offers_products;
DROP POLICY IF EXISTS "offers_products_public_read" ON public.offers_products;
DROP POLICY IF EXISTS "anonymous_users_can_read_products" ON public.offers_products;

ALTER TABLE public.offers_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_access" 
ON public.offers_products 
FOR SELECT 
TO public 
USING (true);