import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
// Import necessary UI components from '@/components/ui/...'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
// Import lucide icons
import { Building, Package, CheckCircle, Minus, Plus } from 'lucide-react';

// --- TYPE DEFINITIONS ---
// This type matches the structure of your 'offers_packages' table
type OfferPackage = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  is_optional: boolean | null;
  quality_level: string | null;
  created_at: string;
};

// This type defines how we store a package the user has selected
type SelectedPackage = {
  package_id: number;
  name: string;
  quantity: number;
};

// --- COMPONENT STATE ---
export function ElektrosanierungConfigurator() {
  // State for the global project parameters
  const [projectParams, setProjectParams] = useState({
    baujahr: 2000,
    qualitaetsstufe: 'Standard',
  });

  // State to hold packages fetched from Supabase
  const [availablePackages, setAvailablePackages] = useState<OfferPackage[]>([]);
  
  // State to hold the packages the user has selected
  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { addItem } = useCart();

  // Data fetching from Supabase offers_packages table
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('offers_packages')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }

        if (data) {
          setAvailablePackages(data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  // Helper function to update project parameters
  const updateProjectParams = (updates: Partial<typeof projectParams>) => {
    setProjectParams(prev => ({ ...prev, ...updates }));
  };

  // Handler function for package selection
  const handlePackageSelection = (packageData: OfferPackage, checked: boolean) => {
    setSelectedPackages(prev => {
      if (checked) {
        // Add package with default quantity of 1
        return [...prev, {
          package_id: packageData.id,
          name: packageData.name,
          quantity: 1
        }];
      } else {
        // Remove package
        return prev.filter(p => p.package_id !== packageData.id);
      }
    });
  };

  // Helper function to update package quantity
  const updatePackageQuantity = (packageId: number, quantity: number) => {
    setSelectedPackages(prev =>
      prev.map(p =>
        p.package_id === packageId
          ? { ...p, quantity: Math.max(0, quantity) }
          : p
      ).filter(p => p.quantity > 0) // Remove packages with 0 quantity
    );
  };

  // Helper function to get packages by category
  const getPackagesByCategory = (category: string) => {
    return availablePackages.filter(pkg => pkg.category === category);
  };

  // Helper function to check if a package is selected
  const isPackageSelected = (packageId: number) => {
    return selectedPackages.some(p => p.package_id === packageId);
  };

  // Helper function to get selected package quantity
  const getSelectedQuantity = (packageId: number) => {
    const selected = selectedPackages.find(p => p.package_id === packageId);
    return selected ? selected.quantity : 0;
  };

  // Get unique categories from available packages, filter out null values
  const categories = [...new Set(availablePackages.map(pkg => pkg.category))].filter(Boolean);

  // Handle form submission - send to backend webhook
  const handleSubmit = async () => {
    if (selectedPackages.length === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens ein Paket aus.",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = {
        global_parameters: projectParams,
        selected_package_ids: selectedPackages.map(pkg => pkg.package_id)
      };

      // Send to backend webhook for calculation
      const { data, error } = await supabase.functions.invoke('calculate-elektrosanierung', {
        body: payload
      });

      if (error) {
        throw error;
      }

      // Add calculated result to cart
      addItem({
        productType: 'elektrosanierung',
        name: 'Elektrosanierung Konfiguration',
        configuration: {
          projectParams,
          selectedPackages,
        },
        pricing: data?.pricing || {
          materialCosts: 0,
          laborCosts: 0,
          travelCosts: 0,
          subtotal: 0,
          subsidy: 0,
          total: 0
        }
      });

      toast({
        title: "Erfolgreich hinzugefügt",
        description: "Konfiguration wurde zum Warenkorb hinzugefügt."
      });

    } catch (err: any) {
      toast({
        title: "Fehler",
        description: "Berechnung konnte nicht durchgeführt werden: " + err.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lade Pakete...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Elektrosanierung Konfigurator</h1>
            <CartIcon onClick={() => {}} />
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Elektrosanierung Konfigurator</h1>

        {/* Section 1: Global Project Parameters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              1. Projektdaten
            </CardTitle>
            <CardDescription>Geben Sie die Eckdaten des Gebäudes an.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="baujahr">Baujahr</Label>
              <Input
                id="baujahr"
                type="number"
                min="1800"
                max="2024"
                value={projectParams.baujahr}
                onChange={e => updateProjectParams({ baujahr: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="qualitaetsstufe">Qualitätsstufe</Label>
              <Select
                value={projectParams.qualitaetsstufe}
                onValueChange={value => updateProjectParams({ qualitaetsstufe: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Package Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              2. Ausstattungspakete auswählen
            </CardTitle>
            <CardDescription>Stellen Sie die Sanierung Raum für Raum zusammen.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <p>Lade Pakete...</p>}
            {error && <p className="text-red-500">Fehler: {error}</p>}
            
            <Accordion type="multiple" className="w-full">
              {categories.map((category, index) => (
                <AccordionItem key={category} value={`category-${index}`}>
                  <AccordionTrigger>{category}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {getPackagesByCategory(category).map((pkg) => (
                        <div key={pkg.id} className="flex items-center space-x-3 p-4 border rounded-lg">
                          <Checkbox
                            checked={isPackageSelected(pkg.id)}
                            onCheckedChange={(checked) => handlePackageSelection(pkg, checked as boolean)}
                          />
                          <div className="flex-1">
                            <h4 className="font-medium">{pkg.name}</h4>
                            {pkg.description && (
                              <p className="text-sm text-muted-foreground">{pkg.description}</p>
                            )}
                            {pkg.quality_level && (
                              <span className="text-xs bg-secondary px-2 py-1 rounded">
                                {pkg.quality_level}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Section 3: Summary & Submission */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              3. Zusammenfassung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h4 className="font-medium">Ausgewählte Pakete:</h4>
              {selectedPackages.length === 0 ? (
                <p className="text-muted-foreground">Keine Pakete ausgewählt</p>
              ) : (
                <div className="space-y-2">
                  {selectedPackages.map((pkg) => (
                    <div key={pkg.package_id} className="flex justify-between items-center p-2 bg-secondary rounded">
                      <span>{pkg.name}</span>
                      <span>Anzahl: {pkg.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Der Gesamtpreis wird nach Übermittlung der Anfrage berechnet und Ihnen in einem detaillierten Angebot mitgeteilt.
                </p>
                <Button 
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={selectedPackages.length === 0}
                >
                  Angebot anfordern
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ElektrosanierungConfigurator;