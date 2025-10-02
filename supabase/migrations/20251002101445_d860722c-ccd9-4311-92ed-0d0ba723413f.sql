-- Ensure RLS is enabled on both tables
ALTER TABLE public.offers_products_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers_products ENABLE ROW LEVEL SECURITY;

-- Clean up any previous policies to avoid duplicates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='offers_products_prices') THEN
    EXECUTE 'DROP POLICY IF EXISTS "offers_products_prices_select_public" ON public.offers_products_prices';
    EXECUTE 'DROP POLICY IF EXISTS "offers_products_prices_insert_public" ON public.offers_products_prices';
    EXECUTE 'DROP POLICY IF EXISTS "offers_products_prices_update_public" ON public.offers_products_prices';
    EXECUTE 'DROP POLICY IF EXISTS "offers_products_prices_delete_public" ON public.offers_products_prices';
    EXECUTE 'DROP POLICY IF EXISTS "select_all_offers_products_prices" ON public.offers_products_prices';
    EXECUTE 'DROP POLICY IF EXISTS "insert_all_offers_products_prices" ON public.offers_products_prices';
    EXECUTE 'DROP POLICY IF EXISTS "update_all_offers_products_prices" ON public.offers_products_prices';
    EXECUTE 'DROP POLICY IF EXISTS "delete_all_offers_products_prices" ON public.offers_products_prices';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='offers_products') THEN
    EXECUTE 'DROP POLICY IF EXISTS "offers_products_select_public" ON public.offers_products';
    EXECUTE 'DROP POLICY IF EXISTS "offers_products_insert_public" ON public.offers_products';
    EXECUTE 'DROP POLICY IF EXISTS "offers_products_update_public" ON public.offers_products';
    EXECUTE 'DROP POLICY IF EXISTS "offers_products_delete_public" ON public.offers_products';
    EXECUTE 'DROP POLICY IF EXISTS "select_all_offers_products" ON public.offers_products';
    EXECUTE 'DROP POLICY IF EXISTS "insert_all_offers_products" ON public.offers_products';
    EXECUTE 'DROP POLICY IF EXISTS "update_all_offers_products" ON public.offers_products';
    EXECUTE 'DROP POLICY IF EXISTS "delete_all_offers_products" ON public.offers_products';
  END IF;
END$$;

-- Recreate explicit anon + authenticated policies (permissive)
CREATE POLICY "offers_products_prices_select_anon_auth"
ON public.offers_products_prices
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "offers_products_prices_insert_anon_auth"
ON public.offers_products_prices
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "offers_products_prices_update_anon_auth"
ON public.offers_products_prices
AS PERMISSIVE
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "offers_products_prices_delete_anon_auth"
ON public.offers_products_prices
AS PERMISSIVE
FOR DELETE
TO anon, authenticated
USING (true);

-- Same policies for offers_products
CREATE POLICY "offers_products_select_anon_auth"
ON public.offers_products
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "offers_products_insert_anon_auth"
ON public.offers_products
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "offers_products_update_anon_auth"
ON public.offers_products
AS PERMISSIVE
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "offers_products_delete_anon_auth"
ON public.offers_products
AS PERMISSIVE
FOR DELETE
TO anon, authenticated
USING (true);

-- Ensure basic privileges exist (some Supabase stacks rely on GRANTs in addition to RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers_products_prices TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers_products TO anon, authenticated;