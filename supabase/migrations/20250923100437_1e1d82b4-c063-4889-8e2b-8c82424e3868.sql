-- Update RLS policies for wallbox_leads table to allow public inserts
DROP POLICY IF EXISTS "Allow public inserts" ON wallbox_leads;
DROP POLICY IF EXISTS "Allow admins to view all leads" ON wallbox_leads;

-- Create policy to allow anyone to insert leads (for sales staff interface)
CREATE POLICY "Allow public inserts" ON wallbox_leads
FOR INSERT 
TO anon
WITH CHECK (true);

-- Create policy to allow viewing leads only for authenticated admin users
CREATE POLICY "Allow admins to view all leads" ON wallbox_leads
FOR SELECT 
TO authenticated
USING (true);