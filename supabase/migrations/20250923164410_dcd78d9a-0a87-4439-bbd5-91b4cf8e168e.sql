-- Enable RLS on zählerschränke table
ALTER TABLE public."zählerschränke" ENABLE ROW LEVEL SECURITY;

-- Allow public read access to zählerschränke
CREATE POLICY "zahlerschranke_public_read" 
ON public."zählerschränke" 
FOR SELECT 
USING (true);