-- Drop the existing policy and recreate it with correct syntax
DROP POLICY IF EXISTS "zahlerschranke_public_read" ON public."zählerschränke";

-- Create a proper public read policy for zählerschränke
CREATE POLICY "zählerschränke_public_read" 
ON public."zählerschränke" 
FOR SELECT 
TO public
USING (true);