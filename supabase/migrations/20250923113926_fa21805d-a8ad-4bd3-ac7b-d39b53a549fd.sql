-- Enable RLS on wallboxen table if not already enabled
ALTER TABLE public.wallboxen ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read wallboxen data
CREATE POLICY "wallboxen_public_read" 
ON public.wallboxen 
FOR SELECT 
USING (true);