-- Enable RLS on tables that are missing it
ALTER TABLE public.offers_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers_product_groups ENABLE ROW LEVEL SECURITY;