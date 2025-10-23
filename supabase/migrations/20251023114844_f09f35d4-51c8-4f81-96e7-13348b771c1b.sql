-- Ensure anon/authenticated can use the public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant SELECT on all required tables for catalog/config data used by the app
GRANT SELECT ON TABLE public.offers_packages TO anon, authenticated;
GRANT SELECT ON TABLE public.offers_package_items TO anon, authenticated;
GRANT SELECT ON TABLE public.offers_product_groups TO anon, authenticated;
GRANT SELECT ON TABLE public.offers_products TO anon, authenticated;
GRANT SELECT ON TABLE public.offers_package_parameter_links TO anon, authenticated;
GRANT SELECT ON TABLE public.offers_package_parameter_definitions TO anon, authenticated;
GRANT SELECT ON TABLE public.offers_products_prices TO anon, authenticated;
GRANT SELECT ON TABLE public.offers_rates TO anon, authenticated;
GRANT SELECT ON TABLE public.locs TO anon, authenticated;

-- Future-proof: new tables created by this role in public get SELECT by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO anon, authenticated;