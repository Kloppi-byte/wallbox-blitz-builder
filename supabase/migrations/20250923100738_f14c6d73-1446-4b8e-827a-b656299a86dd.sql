-- Check current policies and fix wallbox_leads permissions
DROP POLICY IF EXISTS "Allow public inserts" ON wallbox_leads;
DROP POLICY IF EXISTS "Allow admins to view all leads" ON wallbox_leads;
DROP POLICY IF EXISTS "Admins can view all wallbox leads" ON wallbox_leads;
DROP POLICY IF EXISTS "Allow public insert of wallbox leads" ON wallbox_leads;

-- Create new policy for anonymous users to insert leads
CREATE POLICY "Enable insert for anonymous users" ON wallbox_leads
FOR INSERT 
TO anon, public
WITH CHECK (true);

-- Create policy for authenticated users to view leads  
CREATE POLICY "Enable read for authenticated users" ON wallbox_leads
FOR SELECT 
TO authenticated
USING (true);