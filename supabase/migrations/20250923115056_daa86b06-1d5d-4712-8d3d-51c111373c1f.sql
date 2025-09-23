-- Ensure anon can read wallboxen
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE public.wallboxen TO anon;