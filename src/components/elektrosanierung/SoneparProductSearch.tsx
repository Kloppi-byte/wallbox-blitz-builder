import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type SoneparProduct = {
  Artikelnummer: string;
  Bezeichnung: string | null;
  Kurzcode: string | null;
  Einheit: string | null;
  Listenpreis_EUR: string | null;
  Warengruppe: string | null;
  Warengruppe_Name: string | null;
};

export function SoneparProductSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SoneparProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Debounced search effect
  useEffect(() => {
    const performSearch = async () => {
      if (searchTerm.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('offers_datanorm_sonepar')
          .select('*')
          .or(`Bezeichnung.ilike.%${searchTerm}%,Artikelnummer.ilike.%${searchTerm}%,Kurzcode.ilike.%${searchTerm}%`)
          .limit(50);

        if (error) throw error;
        setSearchResults(data || []);
        setOpen(true);
      } catch (err: any) {
        console.error('Error searching products:', err);
        toast({
          title: "Fehler",
          description: "Produkte konnten nicht gesucht werden.",
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, toast]);

  const handleProductSelect = (product: SoneparProduct) => {
    toast({
      title: "Produkt ausgewählt",
      description: `${product.Bezeichnung || product.Artikelnummer}`,
    });
    setOpen(false);
    setSearchTerm('');
    // TODO: Add logic to add this product to the configurator
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Sonepar Produktsuche</CardTitle>
      </CardHeader>
      <CardContent>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Mindestens 3 Zeichen eingeben..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandList>
                {isSearching && (
                  <div className="py-6 text-center text-sm">Suche läuft...</div>
                )}
                {!isSearching && searchResults.length === 0 && searchTerm.length >= 3 && (
                  <CommandEmpty>Keine Produkte gefunden.</CommandEmpty>
                )}
                {!isSearching && searchTerm.length < 3 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Geben Sie mindestens 3 Zeichen ein
                  </div>
                )}
                {!isSearching && searchResults.length > 0 && (
                  <CommandGroup>
                    {searchResults.map((product) => (
                      <CommandItem
                        key={product.Artikelnummer}
                        value={product.Artikelnummer}
                        onSelect={() => handleProductSelect(product)}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="font-medium">
                            {product.Bezeichnung || 'Keine Bezeichnung'}
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>Art.-Nr.: {product.Artikelnummer}</span>
                            {product.Kurzcode && <span>• {product.Kurzcode}</span>}
                            {product.Listenpreis_EUR && (
                              <span>• {product.Listenpreis_EUR} €</span>
                            )}
                          </div>
                          {product.Warengruppe_Name && (
                            <div className="text-xs text-muted-foreground">
                              {product.Warengruppe_Name}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}
