-- Ensure RLS enabled and explicit public read policies for failing tables
ALTER TABLE IF EXISTS public.offers_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.offers_product_groups ENABLE ROW LEVEL SECURITY;

-- offers_package_items: public read
DROP POLICY IF EXISTS "offers_package_items_public_read" ON public.offers_package_items;
CREATE POLICY "offers_package_items_public_read"
ON public.offers_package_items
FOR SELECT
TO anon, authenticated
USING (true);

-- offers_product_groups: public read
DROP POLICY IF EXISTS "offers_product_groups_public_read" ON public.offers_product_groups;
CREATE POLICY "offers_product_groups_public_read"
ON public.offers_product_groups
FOR SELECT
TO anon, authenticated
USING (true);

-- Reassert for offers_packages too to be safe
ALTER TABLE IF EXISTS public.offers_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offers_packages_public_read" ON public.offers_packages;
CREATE POLICY "offers_packages_public_read"
ON public.offers_packages
FOR SELECT
TO anon, authenticated
USING (true);