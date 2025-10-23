-- Enable RLS (safe if already enabled)
ALTER TABLE IF EXISTS public.locs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.offers_packages ENABLE ROW LEVEL SECURITY;

-- Ensure authenticated users can SELECT from locs explicitly
DROP POLICY IF EXISTS "locs_select_authenticated_only" ON public.locs;
CREATE POLICY "locs_select_authenticated_only"
ON public.locs
FOR SELECT
TO authenticated
USING (true);

-- Recreate public read policy for offers_packages to avoid permission errors
DROP POLICY IF EXISTS "offers_packages_public_read" ON public.offers_packages;
CREATE POLICY "offers_packages_public_read"
ON public.offers_packages
FOR SELECT
TO anon, authenticated
USING (true);