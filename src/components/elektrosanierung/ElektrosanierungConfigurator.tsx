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
  price_per_unit: number;
  qty_formula: string;
  labor_hours_per_unit?: number;
  visible_if?: string;
  anzahl_einheit: number;
  artikelnummer?: string;
  customMeisterStunden?: number;
  customGesellenstunden?: number;
  customMonteurStunden?: number;
  selectedProduct?: ProductOption;
  categoryFilter: string;
}

interface ProductOption {
  artikelnummer: string;
  artikel_name: string;
  artikel_preis: number;
  kategorie: string;
  subkategorie: string;
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

  // Article number mapping for components
  const getComponentArticleMapping = (): Record<string, string> => ({
    'steckdosen_tausch': '849130',
    'schalter_tausch': '813016',
    'lichtauslaesse': '849171',
    'leitungsverlegung': '125101',
    'schlitzen_schliessen': '',
    'rcd_nachruesten': '606663',
    'uv_erneuern': '606808',
    'rauchmelder': '',
    'e_check': '',
    'zusaetzliche_stromkreise': '606819'
  });

  // Default component catalog with formulas
  const getDefaultComponents = (): ComponentData[] => [
    {
      id: 'steckdosen_tausch',
      name: 'Steckdosen tauschen',
      unit: 'Stück',
      price_per_unit: articlePrices['849130'] || 25,
      qty_formula: 'globals.zimmer * 5',
      labor_hours_per_unit: 0.25,
      anzahl_einheit: 0,
      artikelnummer: '849130',
      customMeisterStunden: 0.1,
      customGesellenstunden: 0.15,
      customMonteurStunden: 0,
      categoryFilter: 'steckdose'
    },
    {
      id: 'schalter_tausch',
      name: 'Schalter tauschen',
      unit: 'Stück',
      price_per_unit: articlePrices['813016'] || 15,
      qty_formula: 'Math.max(globals.zimmer * 2, Math.ceil(globals.zimmer * 1.5))',
      labor_hours_per_unit: 0.2,
      anzahl_einheit: 0,
      artikelnummer: '813016',
      customMeisterStunden: 0.08,
      customGesellenstunden: 0.12,
      customMonteurStunden: 0,
      categoryFilter: 'schalter'
    },
    {
      id: 'lichtauslaesse',
      name: 'Lichtauslässe erneuern',
      unit: 'Stück',
      price_per_unit: articlePrices['849171'] || 35,
      qty_formula: 'globals.zimmer * 1 + ((globals.wohnflaeche_qm / globals.zimmer > 20) ? Math.round(globals.zimmer * 0.2) : 0)',
      labor_hours_per_unit: 0.4,
      anzahl_einheit: 0,
      artikelnummer: '849171',
      customMeisterStunden: 0.15,
      customGesellenstunden: 0.25,
      customMonteurStunden: 0,
      categoryFilter: 'licht'
    },
    {
      id: 'leitungsverlegung',
      name: 'Leitungsverlegung',
      unit: 'Meter',
      price_per_unit: articlePrices['125101'] || 8,
      qty_formula: "Math.round(globals.wohnflaeche_qm * (globals.installation==='unterputz' ? 6 : 4))",
      anzahl_einheit: 0,
      artikelnummer: '125101',
      customMeisterStunden: 0.05,
      customGesellenstunden: 0.1,
      customMonteurStunden: 0.05,
      categoryFilter: 'kabel'
    },
    {
      id: 'schlitzen_schliessen',
      name: 'Schlitzen & Schließen',
      unit: 'Meter',
      price_per_unit: 12,
      qty_formula: "(globals.installation==='unterputz' ? Math.round(globals.wohnflaeche_qm * 0.6) : 0)",
      anzahl_einheit: 0,
      customMeisterStunden: 0.02,
      customGesellenstunden: 0.08,
      customMonteurStunden: 0.1,
      categoryFilter: 'installation'
    },
    {
      id: 'rcd_nachruesten',
      name: 'FI/RCD nachrüsten 30mA',
      unit: 'Stück',
      price_per_unit: articlePrices['606663'] || 120,
      qty_formula: 'globals.etagen',
      labor_hours_per_unit: 1.0,
      anzahl_einheit: 0,
      artikelnummer: '606663',
      customMeisterStunden: 0.5,
      customGesellenstunden: 0.5,
      customMonteurStunden: 0,
      categoryFilter: 'fi'
    },
    {
      id: 'uv_erneuern',
      name: 'Unterverteilung erneuern',
      unit: 'Stück',
      price_per_unit: articlePrices['606808'] || 800,
      qty_formula: '(globals.baujahr < 1990) ? 1 : 0',
      labor_hours_per_unit: 6.0,
      anzahl_einheit: 0,
      artikelnummer: '606808',
      customMeisterStunden: 3,
      customGesellenstunden: 3,
      customMonteurStunden: 0,
      categoryFilter: 'verteiler'
    },
    {
      id: 'rauchmelder',
      name: 'Rauchwarnmelder',
      unit: 'Stück',
      price_per_unit: 30,
      qty_formula: 'Math.max(3, Math.min(globals.zimmer, 12))',
      anzahl_einheit: 0,
      customMeisterStunden: 0,
      customGesellenstunden: 0.2,
      customMonteurStunden: 0.1,
      categoryFilter: 'rauchmelder'
    },
    {
      id: 'e_check',
      name: 'E-Check / Messprotokoll',
      unit: 'Pauschale',
      price_per_unit: 150,
      qty_formula: '1',
      anzahl_einheit: 0,
      customMeisterStunden: 1,
      customGesellenstunden: 0,
      customMonteurStunden: 0,
      categoryFilter: 'pruefung'
    },
    {
      id: 'zusaetzliche_stromkreise',
      name: 'Zusätzliche Stromkreise 16A',
      unit: 'Stück',
      price_per_unit: articlePrices['606819'] || 180,
      qty_formula: 'Math.max(0, Math.ceil(globals.wohnflaeche_qm/40) - 3)',
      anzahl_einheit: 0,
      artikelnummer: '606819',
      customMeisterStunden: 1.5,
      customGesellenstunden: 1.5,
      customMonteurStunden: 0,
      categoryFilter: 'stromkreis'
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
    // Initialize components immediately with fallback prices
    initializeComponents();
    // Then try to fetch real prices from database
    fetchArticlePrices();
    fetchAvailableProducts();
  }, []);

  useEffect(() => {
    // Re-initialize components when prices are fetched successfully
    if (Object.keys(articlePrices).length > 0) {
      initializeComponents();
    }
  }, [articlePrices]);

  const fetchArticlePrices = async () => {
    try {
      setLoading(true);
      const articleNumbers = Object.values(getComponentArticleMapping()).filter(Boolean);
      
      const { data, error } = await supabase
        .from('article_master')
        .select('artikelnummer, artikel_preis')
        .in('artikelnummer', articleNumbers);

      if (error) {
        console.log('Using fallback prices - database access restricted');
        // Don't show error toast for permission issues, just use fallback prices
      } else if (data) {
        const priceMap = data.reduce((acc, item) => {
          acc[item.artikelnummer] = item.artikel_preis;
          return acc;
        }, {} as Record<string, number>);
        setArticlePrices(priceMap);
      }
    } catch (error) {
      console.log('Using fallback prices - fetch error');
      // Don't show error toast, just use fallback prices
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('article_master')
        .select('artikelnummer, artikel_name, artikel_preis, kategorie, subkategorie')
        .ilike('subkategorie', '%Elektrosanierung%');

      if (error) {
        console.log('Could not fetch products - using fallback data');
      } else if (data) {
        setAvailableProducts(data);
      }
    } catch (error) {
      console.log('Error fetching products');
    }
  };

  const initializeComponents = () => {
    const components = getDefaultComponents();
    const componentsWithCalculatedQty = components.map(comp => ({
      ...comp,
      anzahl_einheit: evaluateFormula(comp.qty_formula, config.globals)
    }));
    
    setConfig(prev => ({
      ...prev,
      components: componentsWithCalculatedQty
    }));
  };

  // Formula evaluation function
  const evaluateFormula = (formula: string, globals: GlobalsData): number => {
    try {
      // Replace globals references in formula
      const evalFormula = formula.replace(/globals\.(\w+)/g, (match, prop) => {
        return String(globals[prop as keyof GlobalsData]);
      });
      
      // Use eval for formula calculation (in production, consider using a safer parser)
      const result = eval(evalFormula);
      return Math.max(0, Math.round(result));
    } catch (error) {
      console.warn('Formula evaluation error:', error);
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
          anzahl_einheit: evaluateFormula(comp.qty_formula, newGlobals)
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
          selectedProduct: product,
          price_per_unit: product.artikel_preis,
          artikelnummer: product.artikelnummer
        } : comp
      )
    }));
  };

  // Get filtered products for a component
  const getFilteredProducts = (categoryFilter: string): ProductOption[] => {
    if (!availableProducts.length) return [];
    
    // Map component types to their corresponding database subkategorie patterns
    const filterMap: Record<string, string> = {
      'steckdose': 'Elektrosanierung Steckdose Sub',
      'schalter': 'Elektrosanierung Schalter Sub', 
      'licht': 'Elektrosanierung Licht Sub',
      'kabel': 'Elektrosanierung Kabel Sub',
      'fi': 'Elektrosanierung FI Sub',
      'verteiler': 'Elektrosanierung Verteiler Sub',
      'rauchmelder': 'Elektrosanierung Rauchmelder Sub',
      'stromkreis': 'Elektrosanierung Stromkreis Sub',
      'installation': 'Elektrosanierung Installation Sub',
      'pruefung': 'Elektrosanierung Pruefung Sub'
    };

    const targetSubkategorie = filterMap[categoryFilter];
    if (!targetSubkategorie) return [];

    return availableProducts.filter(product => 
      product.subkategorie && product.subkategorie.includes(targetSubkategorie)
    );
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
      return total + (comp.price_per_unit * comp.anzahl_einheit);
    }, 0);
  };

  const calculateTotalLaborHours = (type: 'meister' | 'geselle' | 'monteur' = 'geselle') => {
    const baseHours = config.components.reduce((total, comp) => {
      const hours = type === 'meister' ? comp.customMeisterStunden || 0 :
                   type === 'geselle' ? comp.customGesellenstunden || 0 :
                   comp.customMonteurStunden || 0;
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

  // Update component hours
  const updateComponentHours = (id: string, type: 'meister' | 'geselle' | 'monteur', hours: number) => {
    setTouchedComponents(prev => new Set(prev).add(id));
    setConfig(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        comp.id === id ? { 
          ...comp, 
          [`custom${type.charAt(0).toUpperCase() + type.slice(1)}Stunden`]: hours 
        } : comp
      )
    }));
  };

  // Add configuration to cart
  const addToCart = () => {
    const componentsToAdd = config.components.filter(comp => comp.anzahl_einheit > 0);
    
    if (componentsToAdd.length === 0) {
      toast({
        title: "Keine Komponenten ausgewählt",
        description: "Bitte wählen Sie mindestens eine Komponente aus.",
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
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex-1">
                           <h4 className="font-medium">{component.name}</h4>
                           <p className="text-sm text-muted-foreground">
                             {component.price_per_unit}€ / {component.unit}
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

                       {/* Product Selection Dropdown */}
                       {filteredProducts.length > 0 && (
                         <div className="mb-3">
                           <Label className="text-sm font-medium">Produkt auswählen:</Label>
                           <Select 
                             value={component.selectedProduct?.artikelnummer || ''} 
                             onValueChange={(value) => {
                               const product = filteredProducts.find(p => p.artikelnummer === value);
                               if (product) updateComponentProduct(component.id, product);
                             }}
                           >
                             <SelectTrigger className="mt-1">
                               <SelectValue placeholder="Produkt wählen..." />
                             </SelectTrigger>
                             <SelectContent>
                               {filteredProducts.map((product) => (
                                 <SelectItem key={product.artikelnummer} value={product.artikelnummer}>
                                   <div className="flex justify-between items-center w-full">
                                     <span className="truncate mr-2">{product.artikel_name}</span>
                                     <span className="text-sm text-muted-foreground">
                                       {product.artikel_preis}€
                                     </span>
                                   </div>
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </div>
                       )}
                      
                      {component.anzahl_einheit > 0 && (
                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>M:</span>
                          <Input
                            type="text"
                            value={getInputValue(`${component.id}-meister`, component.customMeisterStunden || 0)}
                            onFocus={(e) => handleInputFocus(e, `${component.id}-meister`)}
                            onChange={(e) => handleInputChange(e, `${component.id}-meister`)}
                            onBlur={(e) => handleInputBlur(e, `${component.id}-meister`, 0, (value) => 
                              updateComponentHours(component.id, 'meister', value)
                            )}
                            className="w-16"
                          />
                          <span>h, G:</span>
                          <Input
                            type="text"
                            value={getInputValue(`${component.id}-geselle`, component.customGesellenstunden || 0)}
                            onFocus={(e) => handleInputFocus(e, `${component.id}-geselle`)}
                            onChange={(e) => handleInputChange(e, `${component.id}-geselle`)}
                            onBlur={(e) => handleInputBlur(e, `${component.id}-geselle`, 0, (value) => 
                              updateComponentHours(component.id, 'geselle', value)
                            )}
                            className="w-16"
                          />
                          <span>h, Mo:</span>
                          <Input
                            type="text"
                            value={getInputValue(`${component.id}-monteur`, component.customMonteurStunden || 0)}
                            onFocus={(e) => handleInputFocus(e, `${component.id}-monteur`)}
                            onChange={(e) => handleInputChange(e, `${component.id}-monteur`)}
                            onBlur={(e) => handleInputBlur(e, `${component.id}-monteur`, 0, (value) => 
                              updateComponentHours(component.id, 'monteur', value)
                            )}
                            className="w-16"
                          />
                          <span>h</span>
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