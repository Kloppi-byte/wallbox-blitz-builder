-- Drop existing restrictive policies on offers_products_prices
DROP POLICY IF EXISTS "select_all_offers_products_prices" ON public.offers_products_prices;
DROP POLICY IF EXISTS "insert_all_offers_products_prices" ON public.offers_products_prices;
DROP POLICY IF EXISTS "update_all_offers_products_prices" ON public.offers_products_prices;
DROP POLICY IF EXISTS "delete_all_offers_products_prices" ON public.offers_products_prices;

-- Create new PERMISSIVE policies that allow public access
CREATE POLICY "offers_products_prices_select_public"
ON public.offers_products_prices
FOR SELECT
TO public
USING (true);

CREATE POLICY "offers_products_prices_insert_public"
ON public.offers_products_prices
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "offers_products_prices_update_public"
ON public.offers_products_prices
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "offers_products_prices_delete_public"
ON public.offers_products_prices
FOR DELETE
TO public
USING (true);