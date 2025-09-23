-- Grant required privileges for anonymous inserts and reads
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Allow anonymous users to insert into wallbox_leads (RLS already controls row access)
GRANT INSERT ON TABLE public.wallbox_leads TO anon;

-- Ensure read access to wallboxen for anonymous users (RLS policy exists)
GRANT SELECT ON TABLE public.wallboxen TO anon;