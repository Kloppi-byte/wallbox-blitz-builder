-- Create wallbox_leads table for storing lead data
CREATE TABLE public.wallbox_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  plz TEXT NOT NULL,
  adresse TEXT NOT NULL,
  wallbox_typ TEXT NOT NULL,
  installation TEXT NOT NULL,
  foerderung BOOLEAN NOT NULL DEFAULT false,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.wallbox_leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public inserts (for lead capture)
CREATE POLICY "Allow public insert of wallbox leads" 
ON public.wallbox_leads 
FOR INSERT 
WITH CHECK (true);

-- Create policy for admin viewing
CREATE POLICY "Admins can view all wallbox leads" 
ON public.wallbox_leads 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_wallbox_leads_updated_at
BEFORE UPDATE ON public.wallbox_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();