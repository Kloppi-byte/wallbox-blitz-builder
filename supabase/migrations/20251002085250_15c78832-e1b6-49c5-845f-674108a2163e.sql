-- Enable RLS on both tables
ALTER TABLE public.offers_products_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers_products ENABLE ROW LEVEL SECURITY;

-- Policies for offers_products_prices
CREATE POLICY "select_all_offers_products_prices"
ON public.offers_products_prices
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "insert_all_offers_products_prices"
ON public.offers_products_prices
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "update_all_offers_products_prices"
ON public.offers_products_prices
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "delete_all_offers_products_prices"
ON public.offers_products_prices
FOR DELETE
TO anon, authenticated
USING (true);

-- Policies for offers_products
CREATE POLICY "select_all_offers_products"
ON public.offers_products
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "insert_all_offers_products"
ON public.offers_products
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "update_all_offers_products"
ON public.offers_products
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "delete_all_offers_products"
ON public.offers_products
FOR DELETE
TO anon, authenticated
USING (true);