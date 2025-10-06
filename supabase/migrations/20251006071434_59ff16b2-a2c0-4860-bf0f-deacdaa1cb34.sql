-- Ensure anon and authenticated roles can read offers_datanorm_sonepar
DO $$ BEGIN
  -- Grant schema usage (idempotent if already granted)
  EXECUTE 'GRANT USAGE ON SCHEMA public TO anon, authenticated';
EXCEPTION WHEN OTHERS THEN
  -- ignore if roles already have usage or role doesn't exist in this environment
  NULL;
END $$;

-- Grant SELECT privilege on the table to anon and authenticated
GRANT SELECT ON TABLE public.offers_datanorm_sonepar TO anon, authenticated;

-- Ensure RLS is enabled and recreate a permissive read policy
ALTER TABLE public.offers_datanorm_sonepar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.offers_datanorm_sonepar;
DROP POLICY IF EXISTS "offers_datanorm_sonepar_public_read" ON public.offers_datanorm_sonepar;

CREATE POLICY "Enable read access for all users"
ON public.offers_datanorm_sonepar
FOR SELECT
TO public
USING (true);
