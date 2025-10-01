-- LÖSCHT zuerst alle existierenden Richtlinien für offers_rates, um Konflikte zu vermeiden.
DROP POLICY IF EXISTS "Public read access for rates" ON public.offers_rates;
DROP POLICY IF EXISTS "Enable read for all users" ON public.offers_rates;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.offers_rates;

-- AKTIVIERT Row Level Security auf der Tabelle.
ALTER TABLE public.offers_rates ENABLE ROW LEVEL SECURITY;

-- ERSTELLT eine neue, einfache Richtlinie, die JEDEM Lesezugriff gewährt.
CREATE POLICY "offers_rates_public_read_all"
ON public.offers_rates
FOR SELECT
USING (true);

-- GEWÄHRT Lese-Berechtigungen explizit für die anonymen und authentifizierten Rollen.
GRANT SELECT ON TABLE public.offers_rates TO anon, authenticated;