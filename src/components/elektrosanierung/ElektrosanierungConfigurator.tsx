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
import { Building, Users, Home, Calendar, ArrowRight, ArrowLeft, Plus, Minus, Settings } from 'lucide-react';

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
}

interface ConfigState {
  globals: GlobalsData;
  components: ComponentData[];
  currentStep: number;
  totalSteps: number;
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
    components: [],
    currentStep: 1,
    totalSteps: 2
  });
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});
  const [touchedComponents, setTouchedComponents] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { addItem } = useCart();

  // Default component catalog with formulas
  const getDefaultComponents = (): ComponentData[] => [
    {
      id: 'steckdosen_tausch',
      name: 'Steckdosen tauschen',
      unit: 'Stück',
      price_per_unit: 25,
      qty_formula: 'globals.zimmer * 5',
      labor_hours_per_unit: 0.25,
      anzahl_einheit: 0
    },
    {
      id: 'schalter_tausch',
      name: 'Schalter tauschen',
      unit: 'Stück',
      price_per_unit: 15,
      qty_formula: 'globals.zimmer * 2',
      labor_hours_per_unit: 0.2,
      anzahl_einheit: 0
    },
    {
      id: 'lichtauslaesse',
      name: 'Lichtauslässe erneuern',
      unit: 'Stück',
      price_per_unit: 35,
      qty_formula: 'globals.zimmer * 1',
      labor_hours_per_unit: 0.4,
      anzahl_einheit: 0
    },
    {
      id: 'leitungsverlegung',
      name: 'Leitungsverlegung',
      unit: 'Meter',
      price_per_unit: 8,
      qty_formula: "Math.round(globals.wohnflaeche_qm * (globals.installation==='unterputz' ? 6 : 4))",
      anzahl_einheit: 0
    },
    {
      id: 'schlitzen_schliessen',
      name: 'Schlitzen & Schließen',
      unit: 'Meter',
      price_per_unit: 12,
      qty_formula: 'Math.round(globals.wohnflaeche_qm * 0.6)',
      anzahl_einheit: 0
    },
    {
      id: 'rcd_nachruesten',
      name: 'FI/RCD nachrüsten 30mA',
      unit: 'Stück',
      price_per_unit: 120,
      qty_formula: 'globals.etagen',
      labor_hours_per_unit: 1.0,
      anzahl_einheit: 0
    },
    {
      id: 'uv_erneuern',
      name: 'Unterverteilung erneuern',
      unit: 'Stück',
      price_per_unit: 800,
      qty_formula: '(globals.baujahr < 1990) ? 1 : 0',
      labor_hours_per_unit: 6.0,
      anzahl_einheit: 0
    },
    {
      id: 'rauchmelder',
      name: 'Rauchwarnmelder',
      unit: 'Stück',
      price_per_unit: 30,
      qty_formula: 'globals.zimmer',
      anzahl_einheit: 0
    },
    {
      id: 'e_check',
      name: 'E-Check / Messprotokoll',
      unit: 'Pauschale',
      price_per_unit: 150,
      qty_formula: '1',
      anzahl_einheit: 0
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
    initializeComponents();
  }, []);

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

  // Navigation functions
  const nextStep = () => {
    if (config.currentStep < config.totalSteps) {
      setConfig(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  };

  const prevStep = () => {
    if (config.currentStep > 1) {
      setConfig(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
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

  const calculateTotalLaborHours = () => {
    const baseHours = config.components.reduce((total, comp) => {
      return total + ((comp.labor_hours_per_unit || 0) * comp.anzahl_einheit);
    }, 0);
    
    return baseHours * getLaborAdjustmentFactor();
  };

  const calculateTotalCosts = () => {
    const materialCosts = calculateMaterialCosts();
    const laborHours = calculateTotalLaborHours();
    const laborCosts = laborHours * 85; // €85 per hour
    return materialCosts + laborCosts;
  };

  // Add selected components to cart
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

    componentsToAdd.forEach(comp => {
      addItem({
        name: comp.name,
        price: comp.price_per_unit,
        quantity: comp.anzahl_einheit,
        category: 'Elektrosanierung',
        description: `${comp.unit} - ${comp.name}`
      });
    });

    toast({
      title: "Zur Anfrage hinzugefügt",
      description: `${componentsToAdd.length} Komponenten wurden hinzugefügt.`,
    });

    setIsCartOpen(true);
  };

  // Step 1: Globals Configuration
  const renderGlobalsStep = () => (
    <div className="space-y-6">
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
                min="1900"
                max="2025"
                value={getInputValue('baujahr', config.globals.baujahr)}
                onFocus={(e) => handleInputFocus(e, 'baujahr')}
                onChange={(e) => handleInputChange(e, 'baujahr')}
                onBlur={(e) => handleInputBlur(e, 'baujahr', 1975, (value) => updateGlobals({ baujahr: value }))}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="belegt"
                checked={config.globals.belegt}
                onCheckedChange={(checked) => updateGlobals({ belegt: Boolean(checked) })}
              />
              <Label htmlFor="belegt">Objekt ist bewohnt (+15% Arbeitsaufwand)</Label>
            </div>
            
            <div>
              <Label>Installationsart</Label>
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
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={nextStep} className="flex items-center gap-2">
          Komponenten konfigurieren
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Step 2: Components Configuration
  const renderComponentsStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Komponenten-Auswahl
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {config.components.map((component) => (
              <div key={component.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{component.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {component.price_per_unit}€ / {component.unit}
                    {component.labor_hours_per_unit && ` • ${component.labor_hours_per_unit}h Arbeitszeit`}
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
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Kostenzusammenfassung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Materialkosten:</span>
              <span>{calculateMaterialCosts().toLocaleString('de-DE')}€</span>
            </div>
            <div className="flex justify-between">
              <span>Arbeitszeit:</span>
              <span>{calculateTotalLaborHours().toFixed(1)}h</span>
            </div>
            <div className="flex justify-between">
              <span>Arbeitskosten (85€/h):</span>
              <span>{(calculateTotalLaborHours() * 85).toLocaleString('de-DE')}€</span>
            </div>
            {config.globals.belegt && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Bewohnt-Zuschlag (+15%):</span>
                <span>bereits eingerechnet</span>
              </div>
            )}
            {config.globals.baujahr < 1960 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Altbau-Zuschlag (+20%):</span>
                <span>bereits eingerechnet</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Gesamtkosten:</span>
              <span>{calculateTotalCosts().toLocaleString('de-DE')}€</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Button>
        <Button onClick={addToCart} className="flex items-center gap-2">
          Zur Anfrage hinzufügen
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

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

      {/* Progress Bar */}
      <div className="bg-wallbox-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Schritt {config.currentStep} von {config.totalSteps}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round((config.currentStep / config.totalSteps) * 100)}% abgeschlossen
            </span>
          </div>
          <div className="w-full h-2 bg-progress-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-hero rounded-full transition-all duration-500"
              style={{ width: `${(config.currentStep / config.totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {config.currentStep === 1 && renderGlobalsStep()}
          {config.currentStep === 2 && renderComponentsStep()}
        </div>
      </div>

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </div>
  );
};