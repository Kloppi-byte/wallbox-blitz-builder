import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
import { CartSheet } from '@/components/cart/CartSheet';
import { Building, Users, Home, Calendar, ArrowRight, ArrowLeft, Plus, Minus, Settings, Zap, Euro, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GlobalsData {
  etagen: number;
  zimmer: number;
  wohnflaeche_qm: number;
  baujahr: number;
  belegt: boolean;
  installation: 'unterputz' | 'aufputz';
}

interface ComponentData {
  id: string;
  name: string;
  unit: string;
  anzahl_einheit: number;
  faktor_zimmer: number;
  faktor_etage: number;
  faktor_wohnflaeche: number;
  faktor_baujahr: number;
  faktor_unterputz_true: number;
  selectedProduct?: ProductOption;
  categoryFilter: string;
  subcategories: ProductOption[];
}

interface ProductOption {
  artikelnummer: string;
  artikel_name: string;
  artikel_preis: number;
  stunden_meister: number;
  stunden_geselle: number;
  stunden_monteur: number;
  typ: string;
}

interface ConfigState {
  globals: GlobalsData;
  components: ComponentData[];
}

export const ElektrosanierungConfigurator = () => {
  const [config, setConfig] = useState<ConfigState>({ 
    globals: {
      etagen: 1,
      zimmer: 4,
      wohnflaeche_qm: 80,
      baujahr: 1975,
      belegt: false,
      installation: 'unterputz'
    },
    components: []
  });
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});
  const [touchedComponents, setTouchedComponents] = useState<Set<string>>(new Set());
  const [articlePrices, setArticlePrices] = useState<Record<string, number>>({});
  const [availableProducts, setAvailableProducts] = useState<ProductOption[]>([]);
  const { toast } = useToast();
  const { addItem } = useCart();

  // Default component catalog with multiplication factors
  const getDefaultComponents = (): ComponentData[] => [
    {
      id: 'steckdosen_tausch',
      name: 'Steckdosen tauschen',
      unit: 'Stück',
      anzahl_einheit: 0,
      faktor_zimmer: 5,
      faktor_etage: 0,
      faktor_wohnflaeche: 0,
      faktor_baujahr: 0,
      faktor_unterputz_true: 0,
      categoryFilter: 'steckdose',
      subcategories: []
    },
    {
      id: 'schalter_tausch',
      name: 'Schalter tauschen',
      unit: 'Stück',
      anzahl_einheit: 0,
      faktor_zimmer: 2,
      faktor_etage: 0,
      faktor_wohnflaeche: 0,
      faktor_baujahr: 0,
      faktor_unterputz_true: 0,
      categoryFilter: 'schalter',
      subcategories: []
    },
    {
      id: 'lichtauslaesse',
      name: 'Lichtauslässe erneuern',
      unit: 'Stück',
      anzahl_einheit: 0,
      faktor_zimmer: 1,
      faktor_etage: 0,
      faktor_wohnflaeche: 0,
      faktor_baujahr: 0,
      faktor_unterputz_true: 0,
      categoryFilter: 'licht',
      subcategories: []
    },
    {
      id: 'leitungsverlegung',
      name: 'Leitungsverlegung',
      unit: 'Meter',
      anzahl_einheit: 0,
      faktor_zimmer: 0,
      faktor_etage: 0,
      faktor_wohnflaeche: 4,
      faktor_baujahr: 0,
      faktor_unterputz_true: 2,
      categoryFilter: 'installation',
      subcategories: []
    },
    {
      id: 'rcd_nachruesten',
      name: 'FI/RCD nachrüsten 30mA',
      unit: 'Stück',
      anzahl_einheit: 0,
      faktor_zimmer: 0,
      faktor_etage: 1,
      faktor_wohnflaeche: 0,
      faktor_baujahr: 0,
      faktor_unterputz_true: 0,
      categoryFilter: 'fi',
      subcategories: []
    },
    {
      id: 'uv_erneuern',
      name: 'Unterverteilung erneuern',
      unit: 'Stück',
      anzahl_einheit: 0,
      faktor_zimmer: 0,
      faktor_etage: 0,
      faktor_wohnflaeche: 0,
      faktor_baujahr: 1,
      faktor_unterputz_true: 0,
      categoryFilter: 'verteiler',
      subcategories: []
    }
  ];

  // Helper functions for numeric input management
  const getInputValue = (key: string, actualValue: number) => {
    return tempInputValues[key] !== undefined ? tempInputValues[key] : String(actualValue);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>, key: string) => {
    e.target.select();
    setTempInputValues(prev => ({ ...prev, [key]: e.target.value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setTempInputValues(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>, key: string, defaultValue: number, updateCallback: (value: number) => void) => {
    const value = e.target.value.trim();
    const numericValue = value === '' ? defaultValue : parseFloat(value) || defaultValue;
    updateCallback(numericValue);
    setTempInputValues(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  useEffect(() => {
    // Fetch products first, then initialize components
    fetchAvailableProducts();
  }, []);

  useEffect(() => {
    // Initialize components when products are loaded
    if (availableProducts.length > 0) {
      initializeComponents();
    }
  }, [availableProducts]);

  // No longer needed as prices come from wallboxen table

  const fetchAvailableProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('wallboxen')
        .select('Artikelnummer, Name, Verkaufspreis, Typ, "stunden_meister", "stunden_geselle", "stunden_monteur"')
        .ilike('Typ', '%Elektrosanierung%');

      if (error) {
        console.log('Could not fetch products from wallboxen - using fallback data');
      } else if (data) {
        const mapped = (data as any[]).map((row) => {
          const raw = String(row.Verkaufspreis ?? '').trim();
          const numeric = raw
            ? parseFloat(
                raw
                  .replace(/[^0-9,.-]/g, '')
                  .replace(/\./g, '')
                  .replace(',', '.')
              )
            : 0;
          return {
            artikelnummer: String(row.Artikelnummer),
            artikel_name: row.Name || `Artikel ${row.Artikelnummer}`,
            artikel_preis: isNaN(numeric) ? 0 : numeric,
            stunden_meister: parseFloat(row.stunden_meister) || 0,
            stunden_geselle: parseFloat(row.stunden_geselle) || 0,
            stunden_monteur: parseFloat(row.stunden_monteur) || 0,
            typ: row.Typ || ''
          } as ProductOption;
        });
        setAvailableProducts(mapped);
      }
    } catch (error) {
      console.log('Error fetching products');
    }
  };

  const initializeComponents = () => {
    const components = getDefaultComponents();
    const componentsWithCalculatedQty = components.map(comp => ({
      ...comp,
      anzahl_einheit: calculateDefaultQuantity(comp, config.globals),
      subcategories: getFilteredProducts(comp.categoryFilter)
    }));
    
    setConfig(prev => ({
      ...prev,
      components: componentsWithCalculatedQty
    }));
  };

  // Calculate default quantity using multiplication factors
  const calculateDefaultQuantity = (comp: ComponentData, globals: GlobalsData): number => {
    try {
      let quantity = 0;
      
      // Apply multiplication factors
      quantity += globals.zimmer * comp.faktor_zimmer;
      quantity += globals.etagen * comp.faktor_etage;
      quantity += globals.wohnflaeche_qm * comp.faktor_wohnflaeche;
      
      // Add unterputz factor if installation is unterputz
      if (globals.installation === 'unterputz') {
        quantity += globals.wohnflaeche_qm * comp.faktor_unterputz_true;
      }
      
      // Add baujahr factor if building is old
      if (globals.baujahr < 1990) {
        quantity += comp.faktor_baujahr;
      }
      
      return Math.max(0, Math.round(quantity));
    } catch (error) {
      console.warn('Quantity calculation error:', error);
      return 0;
    }
  };

  // Update globals and recalculate formulas
  const updateGlobals = (updates: Partial<GlobalsData>) => {
    const newGlobals = { ...config.globals, ...updates };
    
    // Recalculate default quantities only for untouched components
    const updatedComponents = config.components.map(comp => {
      if (!touchedComponents.has(comp.id)) {
        return {
          ...comp,
          anzahl_einheit: calculateDefaultQuantity(comp, newGlobals),
          subcategories: getFilteredProducts(comp.categoryFilter)
        };
      }
      return comp;
    });

    setConfig(prev => ({
      ...prev,
      globals: newGlobals,
      components: updatedComponents
    }));
  };

  // Update component quantity
  const updateComponentQuantity = (id: string, quantity: number) => {
    setTouchedComponents(prev => new Set(prev).add(id));
    setConfig(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        comp.id === id ? { ...comp, anzahl_einheit: quantity } : comp
      )
    }));
  };

  // Update selected product for component
  const updateComponentProduct = (id: string, product: ProductOption) => {
    setTouchedComponents(prev => new Set(prev).add(id));
    setConfig(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        comp.id === id ? { 
          ...comp, 
          selectedProduct: product
        } : comp
      )
    }));
  };

  // Get filtered products for a component
  const getFilteredProducts = (categoryFilter: string): ProductOption[] => {
    if (!availableProducts.length) return [];
    
    // Map component types to their corresponding Typ patterns in wallboxen
    const filterMap: Record<string, string> = {
      'steckdose': 'elektrosanierung - steckdose sub',
      'schalter': 'elektrosanierung - schalter sub',
      'licht': 'elektrosanierung - licht sub',
      'kabel': 'elektrosanierung - kabel sub',
      'fi': 'elektrosanierung - fi sub',
      'verteiler': 'elektrosanierung - verteiler sub',
      'rauchmelder': 'elektrosanierung - rauchmelder sub',
      'stromkreis': 'elektrosanierung - stromkreis sub',
      'installation': 'elektrosanierung - installation sub',
      'pruefung': 'elektrosanierung - pruefung sub'
    };

    const target = filterMap[categoryFilter];
    if (!target) return [];

    return availableProducts.filter((product) => {
      const typ = (product.typ || '').toLowerCase();
      return typ.includes(target);
    });
  };

  // Calculate labor adjustments
  const getLaborAdjustmentFactor = () => {
    let factor = 1.0;
    if (config.globals.belegt) factor += 0.15;
    if (config.globals.baujahr < 1960) factor += 0.20;
    return factor;
  };

  // Calculation functions
  const calculateMaterialCosts = () => {
    return config.components.reduce((total, comp) => {
      if (!comp.selectedProduct) return total;
      return total + (comp.selectedProduct.artikel_preis * comp.anzahl_einheit);
    }, 0);
  };

  const calculateTotalLaborHours = (type: 'meister' | 'geselle' | 'monteur' = 'geselle') => {
    const baseHours = config.components.reduce((total, comp) => {
      if (!comp.selectedProduct) return total;
      const hours = type === 'meister' ? comp.selectedProduct.stunden_meister :
                   type === 'geselle' ? comp.selectedProduct.stunden_geselle :
                   comp.selectedProduct.stunden_monteur;
      return total + (hours * comp.anzahl_einheit);
    }, 0);
    
    return baseHours * getLaborAdjustmentFactor();
  };

  const calculateTotalCosts = () => {
    const materialCosts = calculateMaterialCosts();
    const meisterHours = calculateTotalLaborHours('meister');
    const geselleHours = calculateTotalLaborHours('geselle');
    const monteurHours = calculateTotalLaborHours('monteur');
    
    // Different hourly rates
    const laborCosts = (meisterHours * 95) + (geselleHours * 85) + (monteurHours * 65);
    return materialCosts + laborCosts;
  };

  // No longer needed as hours come from selected products

  // Add configuration to cart
  const addToCart = () => {
    const componentsToAdd = config.components.filter(comp => comp.anzahl_einheit > 0 && comp.selectedProduct);
    
    if (componentsToAdd.length === 0) {
      toast({
        title: "Keine Komponenten ausgewählt",
        description: "Bitte wählen Sie mindestens eine Komponente mit Produkt aus.",
        variant: "destructive",
      });
      return;
    }

    const materialCosts = calculateMaterialCosts();
    const laborHours = calculateTotalLaborHours();
    const laborCosts = laborHours * 85; // €85 per hour
    const total = materialCosts + laborCosts;

    addItem({
      productType: 'elektrosanierung',
      name: 'Elektrosanierung Konfiguration',
      configuration: {
        globals: config.globals,
        components: componentsToAdd,
        materialCosts,
        laborHours,
        laborCosts
      },
      pricing: {
        materialCosts,
        laborCosts,
        travelCosts: 0,
        subtotal: total,
        subsidy: 0,
        total
      }
    });

    toast({
      title: "Zur Anfrage hinzugefügt",
      description: "Elektrosanierung-Konfiguration wurde hinzugefügt.",
    });

    setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-wallbox-surface">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Elektrosanierung Konfigurator</h1>
            <CartIcon onClick={() => setIsCartOpen(true)} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Kostenzusammenfassung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Materialkosten:</span>
                    <span>{calculateMaterialCosts().toLocaleString('de-DE')}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Meister ({calculateTotalLaborHours('meister').toFixed(1)}h à 95€):</span>
                    <span>{(calculateTotalLaborHours('meister') * 95).toLocaleString('de-DE')}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Geselle ({calculateTotalLaborHours('geselle').toFixed(1)}h à 85€):</span>
                    <span>{(calculateTotalLaborHours('geselle') * 85).toLocaleString('de-DE')}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Monteur ({calculateTotalLaborHours('monteur').toFixed(1)}h à 65€):</span>
                    <span>{(calculateTotalLaborHours('monteur') * 65).toLocaleString('de-DE')}€</span>
                  </div>
                  
                  {config.globals.belegt && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Bewohnt-Zuschlag (+15%):</span>
                      <span>eingerechnet</span>
                    </div>
                  )}
                  {config.globals.baujahr < 1960 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Altbau-Zuschlag (+20%):</span>
                      <span>eingerechnet</span>
                    </div>
                  )}
                  
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Gesamtkosten:</span>
                    <span>{calculateTotalCosts().toLocaleString('de-DE')}€</span>
                  </div>
                </div>
                
                <Button onClick={addToCart} className="w-full mt-4" size="lg">
                  Zur Anfrage hinzufügen
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Globals Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Projekt-Parameter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="etagen">Anzahl Etagen</Label>
                    <Input
                      id="etagen"
                      type="number"
                      min="1"
                      value={getInputValue('etagen', config.globals.etagen)}
                      onFocus={(e) => handleInputFocus(e, 'etagen')}
                      onChange={(e) => handleInputChange(e, 'etagen')}
                      onBlur={(e) => handleInputBlur(e, 'etagen', 1, (value) => updateGlobals({ etagen: value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="zimmer">Anzahl Zimmer (inkl. Küche & Bad)</Label>
                    <Input
                      id="zimmer"
                      type="number"
                      min="1"
                      value={getInputValue('zimmer', config.globals.zimmer)}
                      onFocus={(e) => handleInputFocus(e, 'zimmer')}
                      onChange={(e) => handleInputChange(e, 'zimmer')}
                      onBlur={(e) => handleInputBlur(e, 'zimmer', 1, (value) => updateGlobals({ zimmer: value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="wohnflaeche">Wohnfläche (m²)</Label>
                    <Input
                      id="wohnflaeche"
                      type="number"
                      min="20"
                      value={getInputValue('wohnflaeche', config.globals.wohnflaeche_qm)}
                      onFocus={(e) => handleInputFocus(e, 'wohnflaeche')}
                      onChange={(e) => handleInputChange(e, 'wohnflaeche')}
                      onBlur={(e) => handleInputBlur(e, 'wohnflaeche', 20, (value) => updateGlobals({ wohnflaeche_qm: value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="baujahr">Baujahr</Label>
                    <Input
                      id="baujahr"
                      type="number"
                      min="1800"
                      max="2030"
                      value={getInputValue('baujahr', config.globals.baujahr)}
                      onFocus={(e) => handleInputFocus(e, 'baujahr')}
                      onChange={(e) => handleInputChange(e, 'baujahr')}
                      onBlur={(e) => handleInputBlur(e, 'baujahr', 1975, (value) => updateGlobals({ baujahr: value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="installation">Installationsart</Label>
                    <Select 
                      value={config.globals.installation} 
                      onValueChange={(value: 'unterputz' | 'aufputz') => updateGlobals({ installation: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unterputz">Unterputz</SelectItem>
                        <SelectItem value="aufputz">Aufputz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="belegt"
                      checked={config.globals.belegt}
                      onCheckedChange={(checked) => updateGlobals({ belegt: checked as boolean })}
                    />
                    <Label htmlFor="belegt">Wohnung ist bewohnt (+15% Arbeitszeit)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Components Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Komponenten-Auswahl
                </CardTitle>
                <p className="text-muted-foreground">
                  Mengen wurden automatisch basierend auf Ihren Parametern berechnet
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                   {config.components.map((component) => {
                     const filteredProducts = getFilteredProducts(component.categoryFilter);
                     return (
                      <div key={component.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium">{component.name}</h4>
                             <p className="text-sm text-muted-foreground">
                               {component.selectedProduct?.artikel_preis || 0}€ / {component.unit}
                             </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateComponentQuantity(component.id, Math.max(0, component.anzahl_einheit - 1))}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            
                            <Input
                              type="number"
                              min="0"
                              className="w-20 text-center"
                              value={getInputValue(`comp-${component.id}`, component.anzahl_einheit)}
                              onFocus={(e) => handleInputFocus(e, `comp-${component.id}`)}
                              onChange={(e) => handleInputChange(e, `comp-${component.id}`)}
                              onBlur={(e) => handleInputBlur(e, `comp-${component.id}`, 0, (value) => updateComponentQuantity(component.id, value))}
                            />
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateComponentQuantity(component.id, component.anzahl_einheit + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            
                            <div className="text-sm text-muted-foreground min-w-12">
                              {component.unit}
                            </div>
                          </div>
                        </div>

                        {/* Product Selection Dropdown - Always show for all components */}
                        <div className="mb-3">
                          <Label className="text-sm font-medium">Produkt auswählen:</Label>
                          <Select 
                            value={component.selectedProduct?.artikelnummer || ''} 
                            onValueChange={(value) => {
                              const filteredProducts = getFilteredProducts(component.categoryFilter);
                              const product = filteredProducts.find(p => p.artikelnummer === value);
                              if (product) updateComponentProduct(component.id, product);
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={
                                getFilteredProducts(component.categoryFilter).length > 0 
                                  ? "Produkt wählen..." 
                                  : "Keine Produkte verfügbar"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredProducts(component.categoryFilter).length > 0 ? (
                                getFilteredProducts(component.categoryFilter).map((product) => (
                                  <SelectItem key={product.artikelnummer} value={product.artikelnummer}>
                                    <div className="flex justify-between items-center w-full">
                                      <span className="truncate mr-2">{product.artikel_name}</span>
                                      <span className="text-sm text-muted-foreground">
                                        {product.artikel_preis}€
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-products" disabled>
                                  Keine Produkte für {component.categoryFilter} gefunden
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      
                       {component.anzahl_einheit > 0 && component.selectedProduct && (
                         <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                           <Clock className="h-4 w-4" />
                           <span>Arbeitszeiten: </span>
                           <span>M: {component.selectedProduct.stunden_meister}h</span>
                           <span>G: {component.selectedProduct.stunden_geselle}h</span>
                           <span>Mo: {component.selectedProduct.stunden_monteur}h</span>
                         </div>
                        )}
                     </div>
                   );
                   })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </div>
  );
};