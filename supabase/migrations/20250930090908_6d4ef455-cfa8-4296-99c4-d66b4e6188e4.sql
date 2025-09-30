-- Grant basic SELECT permissions to anon role on the four tables
-- This is what wallboxen has that these tables are missing

GRANT SELECT ON public.offers_packages TO anon;
GRANT SELECT ON public.offers_package_items TO anon;  
GRANT SELECT ON public.offers_product_groups TO anon;
GRANT SELECT ON public.offers_products TO anon;