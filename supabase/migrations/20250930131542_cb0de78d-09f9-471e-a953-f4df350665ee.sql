-- Grant SELECT privileges to anon and authenticated roles, matching other offers_* tables
GRANT SELECT ON public.offers_package_parameter_links TO anon, authenticated;
GRANT SELECT ON public.offers_package_parameter_definitions TO anon, authenticated;