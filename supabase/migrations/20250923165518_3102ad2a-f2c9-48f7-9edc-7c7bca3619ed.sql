-- Ensure anon and authenticated can SELECT the table (required in addition to RLS policies)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public."zählerschränke" TO anon, authenticated;