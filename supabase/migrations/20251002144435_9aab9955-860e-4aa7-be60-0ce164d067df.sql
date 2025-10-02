-- Drop existing policies if any
DROP POLICY IF EXISTS "offers_datanorm_sonepar_public_read" ON public.offers_datanorm_sonepar;

-- Recreate RLS policies to allow both anonymous and authenticated access
CREATE POLICY "Enable read access for all users"
ON public.offers_datanorm_sonepar
FOR SELECT
TO public
USING (true);

-- Verify RLS is enabled
ALTER TABLE public.offers_datanorm_sonepar ENABLE ROW LEVEL SECURITY;