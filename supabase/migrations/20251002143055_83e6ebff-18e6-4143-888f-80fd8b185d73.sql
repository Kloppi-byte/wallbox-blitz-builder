-- Enable RLS on offers_datanorm_sonepar if not already enabled
ALTER TABLE public.offers_datanorm_sonepar ENABLE ROW LEVEL SECURITY;

-- Allow both authenticated and anonymous users to read all data
CREATE POLICY "offers_datanorm_sonepar_public_read" 
ON public.offers_datanorm_sonepar 
FOR SELECT 
USING (true);