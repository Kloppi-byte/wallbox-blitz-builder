import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
import { CartSheet } from '@/components/cart/CartSheet';
import { supabase } from '@/integrations/supabase/client';
import { 
  Zap, 
  Euro, 
  Clock, 
  ShoppingCart,
  CheckCircle,
  Info
} from 'lucide-react';

interface WallboxProduct {
  Artikelnummer: number;
  Name: string;
  Kategorie: string;
  "Überkategorie": string;
  Verkaufspreis: string;
  Einheit: string;
  stunden_meister: string;
  stunden_geselle: string;
  stunden_monteur: string;
  preselect: boolean;
  auto_select: string[] | null;
  "Überüberkategorie": string[];
}

interface SelectedProduct {
  product: any;
  quantity: number;
  isAutoSelected: boolean;
}

interface ConfiguratorState {
  products: any[];
  selectedProducts: Map<number, SelectedProduct>;
  activeWallbox: any | null;
  autoselectedProducts: Set<number>;
  costs: {
    material: number;
    meisterHours: number;
    geselleHours: number;
    monteurHours: number;
    travel: number;
    total: number;
  };
  componentGroups: Map<string, any[]>;
}

// Hour rates (can be adjusted)
const HOUR_RATES = {
  meister: 85,
  geselle: 65,
  monteur: 45
};

export const WallboxConfigurator = () => {
  const [state, setState] = useState<ConfiguratorState>({
    products: [],
    selectedProducts: new Map(),
    activeWallbox: null,
    autoselectedProducts: new Set(),
    costs: { material: 0, meisterHours: 0, geselleHours: 0, monteurHours: 0, travel: 0, total: 0 },
    componentGroups: new Map()
  });
  const [travelCosts, setTravelCosts] = useState(50);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();
  const { addItem } = useCart();

  // Fetch wallbox products from Supabase
  useEffect(() => {
    fetchWallboxProducts();
  }, []);

  // Recalculate costs when state changes
  useEffect(() => {
    calculateCosts();
  }, [state.selectedProducts, travelCosts]);

  const fetchWallboxProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wallboxen')
        .select('*')
        .contains('"Überüberkategorie"', ['Wallbox']);

      if (error) throw error;

      const products = (data || []) as any[];
      console.log(`Loaded ${products.length} wallbox products`);
      
      // Group products by Überkategorie
      const componentGroups = new Map<string, any[]>();
      products.forEach(product => {
        const category = product["Überkategorie"] || product.Überkategorie;
        if (category && !componentGroups.has(category)) {
          componentGroups.set(category, []);
        }
        if (category) {
          componentGroups.get(category)!.push(product);
        }
      });

      console.log(`Found ${componentGroups.size} distinct Überkategorien:`, Array.from(componentGroups.keys()));

      setState(prev => ({
        ...prev,
        products,
        componentGroups
      }));

      // Initialize with preselected wallbox
      initializeWallboxSelection(products);
    } catch (error) {
      console.error('Error fetching wallbox products:', error);
      toast({
        title: "Fehler",
        description: "Wallbox-Produkte konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeWallboxSelection = (products: any[]) => {
    // Find preselected wallbox
    const preselectedWallbox = products.find(p => p.preselect === true);
    const defaultWallbox = preselectedWallbox || products[0];

    if (defaultWallbox) {
      console.log('Initializing with wallbox:', defaultWallbox.Name);
      selectWallbox(defaultWallbox, products);
    }
  };

  const selectWallbox = (wallbox: any, allProducts?: any[]) => {
    const products = allProducts || state.products;
    
    setState(prev => {
      const newSelectedProducts = new Map(prev.selectedProducts);
      const newAutoselectedProducts = new Set<number>();

      // Clear previous autoselected items
      prev.autoselectedProducts.forEach(artikelnummer => {
        if (newSelectedProducts.has(artikelnummer)) {
          const selected = newSelectedProducts.get(artikelnummer)!;
          if (selected.isAutoSelected) {
            newSelectedProducts.delete(artikelnummer);
          }
        }
      });

      // Add the wallbox itself
      newSelectedProducts.set(wallbox.Artikelnummer, {
        product: wallbox,
        quantity: 1,
        isAutoSelected: false
      });

      // Auto-select related products
      if (wallbox.auto_select) {
        wallbox.auto_select.forEach(autoSelectId => {
          const autoProduct = products.find(p => p.Artikelnummer.toString() === autoSelectId);
          if (autoProduct) {
            newSelectedProducts.set(autoProduct.Artikelnummer, {
              product: autoProduct,
              quantity: 1,
              isAutoSelected: true
            });
            newAutoselectedProducts.add(autoProduct.Artikelnummer);
            console.log('Auto-selected:', autoProduct.Name);
          }
        });
      }

      return {
        ...prev,
        selectedProducts: newSelectedProducts,
        activeWallbox: wallbox,
        autoselectedProducts: newAutoselectedProducts
      };
    });
  };

  const handleProductSelect = (category: string, produktId: string) => {
    const product = state.products.find(p => 
      (p["Überkategorie"] || p.Überkategorie) === category && p.Artikelnummer.toString() === produktId
    );
    
    if (product) {
      // Check if this is a wallbox (assuming wallbox categories contain "wallbox" in name)
      const isWallbox = category.toLowerCase().includes('wallbox');
      
      if (isWallbox) {
        selectWallbox(product);
      } else {
        // Regular product selection
        setState(prev => {
          const newSelectedProducts = new Map(prev.selectedProducts);
          
          if (newSelectedProducts.has(product.Artikelnummer)) {
            newSelectedProducts.delete(product.Artikelnummer);
          } else {
            newSelectedProducts.set(product.Artikelnummer, {
              product,
              quantity: 1,
              isAutoSelected: false
            });
          }

          return {
            ...prev,
            selectedProducts: newSelectedProducts
          };
        });
      }
    }
  };

  const handleQuantityChange = (artikelnummer: number, quantity: number) => {
    setState(prev => {
      const newSelectedProducts = new Map(prev.selectedProducts);
      const selected = newSelectedProducts.get(artikelnummer);
      
      if (selected) {
        if (quantity === 0) {
          newSelectedProducts.delete(artikelnummer);
        } else {
          newSelectedProducts.set(artikelnummer, {
            ...selected,
            quantity
          });
        }
      }

      return {
        ...prev,
        selectedProducts: newSelectedProducts
      };
    });
  };

  const calculateCosts = () => {
    let materialCosts = 0;
    let meisterHours = 0;
    let geselleHours = 0;
    let monteurHours = 0;

    state.selectedProducts.forEach(({ product, quantity }) => {
      const price = parseFloat(product.Verkaufspreis) || 0;
      materialCosts += price * quantity;

      meisterHours += (parseFloat(product.stunden_meister) || 0) * quantity;
      geselleHours += (parseFloat(product.stunden_geselle) || 0) * quantity;
      monteurHours += (parseFloat(product.stunden_monteur) || 0) * quantity;
    });

    const laborCosts = 
      meisterHours * HOUR_RATES.meister + 
      geselleHours * HOUR_RATES.geselle + 
      monteurHours * HOUR_RATES.monteur;

    const total = materialCosts + laborCosts + travelCosts;

    setState(prev => ({
      ...prev,
      costs: {
        material: materialCosts,
        meisterHours,
        geselleHours,
        monteurHours,
        travel: travelCosts,
        total
      }
    }));
  };

  const addToCart = () => {
    const items = Array.from(state.selectedProducts.values()).map(({ product, quantity }) => ({
      id: product.Artikelnummer.toString(),
      name: product.Name,
      price: parseFloat(product.Verkaufspreis) || 0,
      kategorie: product.Kategorie,
      subkategorie: product.Überkategorie,
      quantity,
      multiplier: 1,
      isAutoSelected: false,
      isPreselected: product.preselect || false
    }));
    
    const cartItem = {
      productType: 'wallbox' as const,
      name: 'Wallbox Konfiguration',
      configuration: {
        selectedItems: items,
        travelCosts
      },
      pricing: {
        materialCosts: state.costs.material,
        laborCosts: state.costs.total - state.costs.material - state.costs.travel,
        travelCosts: state.costs.travel,
        subtotal: state.costs.material + (state.costs.total - state.costs.material - state.costs.travel),
        subsidy: 0,
        total: state.costs.total
      }
    };

    addItem(cartItem);
    setIsCartOpen(true);
    
    toast({
      title: "Erfolgreich hinzugefügt",
      description: "Die Wallbox-Konfiguration wurde zum Warenkorb hinzugefügt.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Lade Wallbox-Konfiguration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Wallbox Konfigurator</h1>
                <p className="text-muted-foreground">Konfiguriere deine perfekte Wallbox-Lösung</p>
              </div>
            </div>
            <CartIcon onClick={() => setIsCartOpen(true)} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Configuration Area */}
          <div className="lg:col-span-2 space-y-6">
            {Array.from(state.componentGroups.entries()).map(([category, products]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category.toLowerCase().includes('wallbox') ? <Zap className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {products.map(product => {
                      const isSelected = state.selectedProducts.has(product.Artikelnummer);
                      const selectedData = state.selectedProducts.get(product.Artikelnummer);
                      const isAutoSelected = state.autoselectedProducts.has(product.Artikelnummer);
                      const price = parseFloat(product.Verkaufspreis) || 0;
                      const meisterHours = parseFloat(product.stunden_meister) || 0;
                      const geselleHours = parseFloat(product.stunden_geselle) || 0;
                      const monteurHours = parseFloat(product.stunden_monteur) || 0;

                      return (
                        <Card 
                          key={product.Artikelnummer}
                          className={`transition-all duration-200 ${
                            isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-medium">{product.Name}</h4>
                                  {product.preselect && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                      <CheckCircle className="w-3 h-3" />
                                      Empfohlen
                                    </span>
                                  )}
                                  {isAutoSelected && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                      <Info className="w-3 h-3" />
                                      Auto-gewählt
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mb-3">
                                  <div>€{price.toFixed(2)}/{product.Einheit}</div>
                                  <div>{meisterHours}h Meister</div>
                                  <div>{geselleHours}h Geselle</div>
                                  <div>{monteurHours}h Monteur</div>
                                </div>

                                {isSelected && (
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor={`qty-${product.Artikelnummer}`} className="text-sm">
                                      Menge:
                                    </Label>
                                    <Input
                                      id={`qty-${product.Artikelnummer}`}
                                      type="number"
                                      value={selectedData?.quantity || 0}
                                      onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                                        handleQuantityChange(product.Artikelnummer, value);
                                      }}
                                      onBlur={(e) => {
                                        if (e.target.value === '') {
                                          handleQuantityChange(product.Artikelnummer, 0);
                                        }
                                      }}
                                      className="w-20"
                                      min="0"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-right">
                                <Select
                                  value={isSelected ? product.Artikelnummer.toString() : ''}
                                  onValueChange={(value) => {
                                    if (value === product.Artikelnummer.toString()) {
                                      handleProductSelect(category, value);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Auswählen" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={product.Artikelnummer.toString()}>
                                      {isSelected ? 'Entfernen' : 'Hinzufügen'}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Travel Costs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Anfahrtskosten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Label htmlFor="travel-costs" className="text-sm font-medium">
                    Anfahrtskosten (€)
                  </Label>
                  <Input
                    id="travel-costs"
                    type="number"
                    value={travelCosts}
                    onChange={(e) => setTravelCosts(parseInt(e.target.value) || 0)}
                    className="w-32"
                    min="0"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="w-5 h-5" />
                    Kostenzusammenfassung
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Materialkosten</span>
                      <span>€{state.costs.material.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>• Meister ({state.costs.meisterHours.toFixed(1)}h × €{HOUR_RATES.meister})</span>
                      <span>€{(state.costs.meisterHours * HOUR_RATES.meister).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>• Geselle ({state.costs.geselleHours.toFixed(1)}h × €{HOUR_RATES.geselle})</span>
                      <span>€{(state.costs.geselleHours * HOUR_RATES.geselle).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>• Monteur ({state.costs.monteurHours.toFixed(1)}h × €{HOUR_RATES.monteur})</span>
                      <span>€{(state.costs.monteurHours * HOUR_RATES.monteur).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Anfahrtskosten</span>
                      <span>€{state.costs.travel.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Gesamtpreis</span>
                      <span className="text-primary">€{state.costs.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={addToCart}
                    className="w-full"
                    disabled={state.selectedProducts.size === 0}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    In den Warenkorb
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </div>
  );
};