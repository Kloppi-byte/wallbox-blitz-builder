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
// Database table types
type OfferPackage = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  is_optional: boolean | null;
  quality_level: string | null;
  created_at: string;
};

type OfferPackageItem = {
  id: number;
  package_id: number;
  produkt_gruppe_id: string;
  quantity_base: number;
  quantity_per_room: number;
  quantity_per_floor: number;
  quantity_per_sqm: number;
  created_at: string;
};

type OfferProductGroup = {
  group_id: string;
  description: string | null;
};

type OfferProduct = {
  product_id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  category: string | null;
  produkt_gruppe: string | null;
  qualitaetsstufe: string | null;
  stunden_meister: number;
  stunden_geselle: number;
  stunden_monteur: number;
  created_at: string;
};

// Application state types
type OfferLineItem = {
  id: string;
  package_id: number;
  package_name: string;
  product_id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  category: string | null;
  produkt_gruppe: string | null;
  qualitaetsstufe: string | null;
  stunden_meister: number;
  stunden_geselle: number;
  stunden_monteur: number;
  quantity: number;
};

// --- COMPONENT STATE ---
export function ElektrosanierungConfigurator() {
  // State for the global project parameters
  const [projectParams, setProjectParams] = useState({
    baujahr: 2000,
    qualitaetsstufe: 'Standard',
  });

  // State for data from all four tables
  const [availablePackages, setAvailablePackages] = useState<OfferPackage[]>([]);
  const [packageItems, setPackageItems] = useState<OfferPackageItem[]>([]);
  const [productGroups, setProductGroups] = useState<OfferProductGroup[]>([]);
  const [products, setProducts] = useState<OfferProduct[]>([]);
  
  // State to hold the offer line items (replaces selectedPackages)
  const [offerLineItems, setOfferLineItems] = useState<OfferLineItem[]>([]);

  // State for detail view
  const [detailsPackageId, setDetailsPackageId] = useState<number | null>(null);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { addItem } = useCart();

  // Data fetching from all four Supabase tables
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch data from all four tables concurrently using Promise.all
        const [packagesResult, packageItemsResult, productGroupsResult, productsResult] = await Promise.all([
          supabase
            .from('offers_packages')
            .select('*')
            .order('category', { ascending: true })
            .order('name', { ascending: true }),
          
          supabase
            .from('offers_package_items')
            .select('*'),
          
          supabase
            .from('offers_product_groups')
            .select('*'),
          
          supabase
            .from('offers_products')
            .select('*')
            .order('category', { ascending: true })
            .order('name', { ascending: true })
        ]);

        // Check for errors in any of the requests
        if (packagesResult.error) throw packagesResult.error;
        if (packageItemsResult.error) throw packageItemsResult.error;
        if (productGroupsResult.error) throw productGroupsResult.error;
        if (productsResult.error) throw productsResult.error;

        // Update state with fetched data
        if (packagesResult.data) setAvailablePackages(packagesResult.data);
        if (packageItemsResult.data) setPackageItems(packageItemsResult.data);
        if (productGroupsResult.data) setProductGroups(productGroupsResult.data);
        if (productsResult.data) setProducts(productsResult.data);

      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching configuration data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Helper function to update project parameters
  const updateProjectParams = (updates: Partial<typeof projectParams>) => {
    setProjectParams(prev => ({ ...prev, ...updates }));
  };

  // Handler function for package selection
  const handlePackageSelection = (packageData: OfferPackage, checked: boolean) => {
    console.log('Package selection called:', { packageData, checked });
    console.log('Package items available:', packageItems.length);
    console.log('Products available:', products.length);
    
    if (checked) {
      // Resolve all products for this package and add to offer line items
      const packageItemsForPackage = packageItems.filter(item => item.package_id === packageData.id);
      console.log('Package items for package:', packageItemsForPackage);
      
      const newLineItems: OfferLineItem[] = [];
      packageItemsForPackage.forEach(item => {
        const product = products.find(prod => 
          prod.produkt_gruppe === item.produkt_gruppe_id && 
          prod.qualitaetsstufe === projectParams.qualitaetsstufe
        );
        console.log('Found product for item:', { item, product });
        if (product) {
          newLineItems.push({
            id: `${packageData.id}-${product.product_id}-${Date.now()}`,
            package_id: packageData.id,
            package_name: packageData.name,
            product_id: product.product_id,
            name: product.name,
            description: product.description,
            unit: product.unit,
            unit_price: product.unit_price,
            category: product.category,
            produkt_gruppe: product.produkt_gruppe,
            qualitaetsstufe: product.qualitaetsstufe,
            stunden_meister: product.stunden_meister,
            stunden_geselle: product.stunden_geselle,
            stunden_monteur: product.stunden_monteur,
            quantity: item.quantity_base + item.quantity_per_room + item.quantity_per_floor + item.quantity_per_sqm // Simple default calculation
          });
        }
      });
      
      console.log('New line items to add:', newLineItems);
      setOfferLineItems(prev => [...prev, ...newLineItems]);
    } else {
      // Remove all line items for this package
      setOfferLineItems(prev => prev.filter(item => item.package_id !== packageData.id));
    }
  };

  // Handler function for quantity changes
  const handleQuantityChange = (lineItemId: string, newQuantity: number) => {
    setOfferLineItems(currentItems =>
      currentItems.map(item =>
        item.id === lineItemId ? { ...item, quantity: Math.max(0, newQuantity) } : item
      ).filter(item => item.quantity > 0) // Remove items with 0 quantity
    );
  };

  // Handler function for product swaps
  const handleProductSwap = (lineItemId: string, newProductId: string) => {
    const newProduct = products.find(p => p.product_id === newProductId);
    if (!newProduct) return;

    setOfferLineItems(currentItems =>
      currentItems.map(item =>
        item.id === lineItemId 
          ? { 
              ...item, 
              product_id: newProduct.product_id,
              name: newProduct.name,
              description: newProduct.description,
              unit: newProduct.unit,
              unit_price: newProduct.unit_price,
              category: newProduct.category,
              qualitaetsstufe: newProduct.qualitaetsstufe,
              stunden_meister: newProduct.stunden_meister,
              stunden_geselle: newProduct.stunden_geselle,
              stunden_monteur: newProduct.stunden_monteur
            }
          : item
      )
    );
  };

  // Helper function to get packages by category
  const getPackagesByCategory = (category: string) => {
    return availablePackages.filter(pkg => pkg.category === category);
  };

  // Helper function to check if a package is selected
  const isPackageSelected = (packageId: number) => {
    return offerLineItems.some(item => item.package_id === packageId);
  };

  // Helper function to get line items for a package
  const getLineItemsForPackage = (packageId: number) => {
    return offerLineItems.filter(item => item.package_id === packageId);
  };

  // Helper function to get alternatives for a product group
  const getAlternatives = (produktGruppe: string) => {
    return products.filter(p => p.produkt_gruppe === produktGruppe);
  };

  // Helper function to get products for a package (client-side join)
  const getProductsForPackage = (packageId: number, qualitaetsstufe: string) => {
    // 1. Find all package items for this package
    const packageItemsForPackage = packageItems.filter(item => item.package_id === packageId);
    
    // 2. For each package item, find the corresponding product
    const productNames: string[] = [];
    packageItemsForPackage.forEach(item => {
      const product = products.find(prod => 
        prod.produkt_gruppe === item.produkt_gruppe_id && 
        prod.qualitaetsstufe === qualitaetsstufe
      );
      if (product) {
        productNames.push(product.name);
      }
    });
    
    return productNames;
  };

  // Get unique categories from available packages, filter out null values
  const categories = [...new Set(availablePackages.map(pkg => pkg.category))].filter(Boolean);

  // Handle form submission - send to backend webhook
  const handleSubmit = async () => {
    if (offerLineItems.length === 0) {
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
        line_items: offerLineItems
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
          offerLineItems,
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
                        <div key={pkg.id}>
                          <div className="flex items-center space-x-3 p-4 border rounded-lg">
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
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setDetailsPackageId(detailsPackageId === pkg.id ? null : pkg.id)}
                            >
                              Details
                            </Button>
                          </div>
                          {/* Package details view */}
                          {detailsPackageId === pkg.id && (
                            <div className="pl-8 mt-2">
                              <strong className="text-sm text-muted-foreground mb-3 block">Inhalt für '{projectParams.qualitaetsstufe}':</strong>
                              {isPackageSelected(pkg.id) ? (
                                <div className="space-y-3">
                                  {getLineItemsForPackage(pkg.id).map(item => (
                                    <div key={item.id} className="flex items-center gap-3 p-3 bg-background border rounded">
                                      <div className="flex-1">
                                        <div className="font-medium">{item.name}</div>
                                        {item.description && (
                                          <div className="text-xs text-muted-foreground">{item.description}</div>
                                        )}
                                      </div>
                                      
                                      {/* Quantity input */}
                                      <div className="flex items-center gap-2">
                                        <Label htmlFor={`qty-${item.id}`} className="text-xs">Menge:</Label>
                                        <Input
                                          id={`qty-${item.id}`}
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={item.quantity}
                                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                          className="w-16 h-8 text-xs"
                                        />
                                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                                      </div>

                                      {/* Product swap select */}
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs">Qualität:</Label>
                                        <Select value={item.product_id} onValueChange={(value) => handleProductSwap(item.id, value)}>
                                          <SelectTrigger className="w-32 h-8 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {getAlternatives(item.produkt_gruppe || '').map(alt => (
                                              <SelectItem key={alt.product_id} value={alt.product_id}>
                                                {alt.qualitaetsstufe}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  <p>Paket auswählen, um Inhalte zu bearbeiten.</p>
                                  <ul className="mt-1 space-y-1">
                                    {getProductsForPackage(pkg.id, projectParams.qualitaetsstufe).map(productName => (
                                      <li key={productName}>- {productName}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
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
              <h4 className="font-medium">Ausgewählte Angebotspositionen:</h4>
              {offerLineItems.length === 0 ? (
                <p className="text-muted-foreground">Keine Pakete ausgewählt</p>
              ) : (
                <div className="space-y-2">
                  {/* Group by package */}
                  {[...new Set(offerLineItems.map(item => item.package_id))].map(packageId => {
                    const packageItems = getLineItemsForPackage(packageId);
                    const packageName = packageItems[0]?.package_name || '';
                    return (
                      <div key={packageId} className="p-3 bg-secondary rounded">
                        <h5 className="font-medium mb-2">{packageName}</h5>
                        <div className="space-y-1 text-sm">
                          {packageItems.map(item => (
                            <div key={item.id} className="flex justify-between">
                              <span>{item.name}</span>
                              <span>{item.quantity} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Der Gesamtpreis wird nach Übermittlung der Anfrage berechnet und Ihnen in einem detaillierten Angebot mitgeteilt.
                </p>
                <Button 
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={offerLineItems.length === 0}
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