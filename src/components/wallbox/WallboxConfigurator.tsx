import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
import { CartSheet } from '@/components/cart/CartSheet';
import { Zap, Euro, Clock } from 'lucide-react';

interface WallboxProduct {
  artikelnummer: number;
  name: string;
  kategorie: string;
  beschreibung: string;
  verkaufspreis: string;
  einheit: string;
  anzahl_einheit: number;
  required: string[] | null;
  optional: string[] | null;
  exclude: string[] | null;
  auto_select: string[] | null;
  stunden_meister: string;
  stunden_geselle: string;
  stunden_monteur?: string;
  typ: string;
}

interface SelectedProduct {
  artikelnummer: number;
  name: string;
  price: number;
  kategorie: string;
  beschreibung?: string;
  isRequired?: boolean;
  isAutoSelected?: boolean;
  quantity: number;
  einheit?: string;
  customMeisterStunden?: number;
  customGesellenstunden?: number;
  customMonteurStunden?: number;
}

interface ConfigState {
  selectedWallbox: SelectedProduct | null;
  requiredProducts: SelectedProduct[];
  optionalProducts: SelectedProduct[];
  meisterStunden: number;
  gesellenStunden: number;
  monteurStunden: number;
  meisterStundensatz: number;
  gesellenStundensatz: number;
  monteurStundensatz: number;
  anfahrtZone: string;
  anfahrtKosten: number;
}

export function WallboxConfigurator() {
  const [allProducts, setAllProducts] = useState<WallboxProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const { addItem } = useCart();

  const [config, setConfig] = useState<ConfigState>({
    selectedWallbox: null,
    requiredProducts: [],
    optionalProducts: [],
    meisterStunden: 0,
    gesellenStunden: 0,
    monteurStunden: 0,
    meisterStundensatz: 85,
    gesellenStundensatz: 65,
    monteurStundensatz: 50,
    anfahrtZone: '',
    anfahrtKosten: 0
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('wallboxen')
        .select('*')
        .order('Name');

      if (error) throw error;

      const products: WallboxProduct[] = data.map(item => ({
        artikelnummer: item['Artikelnummer'],
        name: item['Name'] || '',
        kategorie: (item['Typ'] || '').trim(), // Trim whitespace from category
        beschreibung: item['Beschreibung'] || '',
        verkaufspreis: item['Verkaufspreis'] || '0',
        einheit: item['Einheit'] || 'Stück',
        anzahl_einheit: item['Anzahl Einheit'] || 1,
        required: (item as any).required || null,
        optional: (item as any).optional || null,
        exclude: (item as any).exclude || null,
        auto_select: (item as any).auto_select || null,
        stunden_meister: (item as any).stunden_meister || '0',
        stunden_geselle: (item as any).stunden_geselle || '0',
        stunden_monteur: (item as any).stunden_monteur || '0',
        typ: (item['Typ'] || '').trim() // Trim whitespace from typ as well
      }));

      setAllProducts(products);
      
      // Auto-select first wallbox if none is selected
      if (products.length > 0 && !config.selectedWallbox) {
        const wallboxes = products.filter(p => p.kategorie === 'Wallbox');
        if (wallboxes.length > 0) {
          selectWallbox(wallboxes[0]);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Fehler",
        description: "Produkte konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getWallboxes = () => allProducts.filter(p => p.kategorie === 'Wallbox');
  
  const getRequiredProducts = () => {
    if (!config.selectedWallbox) return [];
    const wallbox = allProducts.find(p => p.artikelnummer === config.selectedWallbox.artikelnummer);
    if (!wallbox?.required) return [];
    return allProducts.filter(p => wallbox.required?.includes(p.artikelnummer.toString()));
  };

  const getOptionalProducts = () => {
    if (!config.selectedWallbox) return [];
    const wallbox = allProducts.find(p => p.artikelnummer === config.selectedWallbox.artikelnummer);
    if (!wallbox?.optional) return [];
    return allProducts.filter(p => wallbox.optional?.includes(p.artikelnummer.toString()));
  };

  const getExcludedProducts = () => {
    if (!config.selectedWallbox) return [];
    const wallbox = allProducts.find(p => p.artikelnummer === config.selectedWallbox.artikelnummer);
    if (!wallbox?.exclude) return [];
    return wallbox.exclude;
  };

  const getAutoSelectProducts = () => {
    if (!config.selectedWallbox) return [];
    const wallbox = allProducts.find(p => p.artikelnummer === config.selectedWallbox.artikelnummer);
    if (!wallbox?.auto_select) return [];
    return allProducts.filter(p => wallbox.auto_select?.includes(p.artikelnummer.toString()));
  };

  const getProductsByKategorie = (kategorie: string) => {
    if (!config.selectedWallbox) return [];
    const optionalProducts = getOptionalProducts();
    const excludedIds = getExcludedProducts();
    return optionalProducts.filter(p => 
      p.kategorie === kategorie && 
      !excludedIds?.includes(p.artikelnummer.toString())
    );
  };

  const getAvailableKategorien = () => {
    const optionalProducts = getOptionalProducts();
    const kategorien = [...new Set(optionalProducts.map(p => p.kategorie))];
    return kategorien.filter(k => k !== 'Wallbox');
  };

  const selectWallbox = (product: WallboxProduct) => {
    const selectedProduct: SelectedProduct = {
      artikelnummer: product.artikelnummer,
      name: product.name,
      price: parseFloat(product.verkaufspreis) || 0,
      kategorie: product.kategorie,
      beschreibung: product.beschreibung,
      quantity: product.anzahl_einheit || 1,
      einheit: product.einheit,
      customMeisterStunden: parseFloat(product.stunden_meister || '0'),
      customGesellenstunden: parseFloat(product.stunden_geselle || '0'),
      customMonteurStunden: parseFloat(product.stunden_monteur || '0')
    };

    // Auto-add required products
    const wallbox = allProducts.find(p => p.artikelnummer === product.artikelnummer);
    let requiredProducts: SelectedProduct[] = [];
    if (wallbox?.required) {
      const reqProducts = allProducts.filter(p => wallbox.required?.includes(p.artikelnummer.toString()));
      requiredProducts = reqProducts.map(p => ({
        artikelnummer: p.artikelnummer,
        name: p.name,
        price: parseFloat(p.verkaufspreis) || 0,
        kategorie: p.kategorie,
        beschreibung: p.beschreibung,
        isRequired: true,
        quantity: p.anzahl_einheit || 1,
        einheit: p.einheit,
        customMeisterStunden: parseFloat(p.stunden_meister || '0'),
        customGesellenstunden: parseFloat(p.stunden_geselle || '0'),
        customMonteurStunden: parseFloat(p.stunden_monteur || '0')
      }));
    }

    // Auto-select optional products
    let optionalProducts: SelectedProduct[] = [];
    if (wallbox?.auto_select) {
      const autoProducts = allProducts.filter(p => wallbox.auto_select?.includes(p.artikelnummer.toString()));
      optionalProducts = autoProducts.map(p => ({
        artikelnummer: p.artikelnummer,
        name: p.name,
        price: parseFloat(p.verkaufspreis) || 0,
        kategorie: p.kategorie,
        beschreibung: p.beschreibung,
        isAutoSelected: true,
        quantity: p.anzahl_einheit || 1,
        einheit: p.einheit,
        customMeisterStunden: parseFloat(p.stunden_meister || '0'),
        customGesellenstunden: parseFloat(p.stunden_geselle || '0'),
        customMonteurStunden: parseFloat(p.stunden_monteur || '0')
      }));
    }

    // Set labor hours from wallbox data as default
    const { totalMeisterStunden, totalGesellenstunden, totalMonteurStunden } = calculateTotalHours();
    const meisterStunden = totalMeisterStunden + parseFloat(wallbox?.stunden_meister || '0');
    const gesellenStunden = totalGesellenstunden + parseFloat(wallbox?.stunden_geselle || '0');
    const monteurStunden = totalMonteurStunden + parseFloat(wallbox?.stunden_monteur || '0');

    setConfig(prev => ({
      ...prev,
      selectedWallbox: selectedProduct,
      requiredProducts,
      optionalProducts,
      meisterStunden,
      gesellenStunden,
      monteurStunden
    }));
  };

  const addOptionalProduct = (product: WallboxProduct) => {
    // Check if product is already selected
    const isAlreadySelected = config.optionalProducts.some(p => p.artikelnummer === product.artikelnummer);
    if (isAlreadySelected) return;

    const selectedProduct: SelectedProduct = {
      artikelnummer: product.artikelnummer,
      name: product.name,
      price: parseFloat(product.verkaufspreis) || 0,
      kategorie: product.kategorie,
      beschreibung: product.beschreibung,
      quantity: product.anzahl_einheit || 1,
      einheit: product.einheit,
      customMeisterStunden: parseFloat(product.stunden_meister || '0'),
      customGesellenstunden: parseFloat(product.stunden_geselle || '0'),
      customMonteurStunden: parseFloat(product.stunden_monteur || '0')
    };

    setConfig(prev => ({
      ...prev,
      optionalProducts: [...prev.optionalProducts, selectedProduct]
    }));
  };

  const removeOptionalProduct = (artikelnummer: number) => {
    setConfig(prev => ({
      ...prev,
      optionalProducts: prev.optionalProducts.filter(p => p.artikelnummer !== artikelnummer)
    }));
  };

  const updateProductQuantity = (type: 'required' | 'optional', artikelnummer: number, quantity: number) => {
    setConfig(prev => ({
      ...prev,
      [type === 'required' ? 'requiredProducts' : 'optionalProducts']: prev[type === 'required' ? 'requiredProducts' : 'optionalProducts'].map(p => 
        p.artikelnummer === artikelnummer ? { ...p, quantity } : p
      )
    }));
  };

  const updateLaborHours = (type: 'meister' | 'geselle' | 'monteur', hours: number) => {
    setConfig(prev => ({
      ...prev,
      [type === 'meister' ? 'meisterStunden' : 
       type === 'geselle' ? 'gesellenStunden' : 'monteurStunden']: hours
    }));
  };

  const calculateMaterialCosts = () => {
    const wallboxPrice = config.selectedWallbox?.price || 0;
    const requiredPrice = config.requiredProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const optionalPrice = config.optionalProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    return wallboxPrice + requiredPrice + optionalPrice;
  };

  const calculateTotalHours = () => {
    let totalMeisterStunden = 0;
    let totalGesellenstunden = 0;
    let totalMonteurStunden = 0;

    // Add wallbox hours
    if (config.selectedWallbox) {
      totalMeisterStunden += (config.selectedWallbox.customMeisterStunden || 0) * config.selectedWallbox.quantity;
      totalGesellenstunden += (config.selectedWallbox.customGesellenstunden || 0) * config.selectedWallbox.quantity;
      totalMonteurStunden += (config.selectedWallbox.customMonteurStunden || 0) * config.selectedWallbox.quantity;
    }

    // Add required product hours
    config.requiredProducts.forEach(product => {
      totalMeisterStunden += (product.customMeisterStunden || 0) * product.quantity;
      totalGesellenstunden += (product.customGesellenstunden || 0) * product.quantity;
      totalMonteurStunden += (product.customMonteurStunden || 0) * product.quantity;
    });

    // Add optional product hours
    config.optionalProducts.forEach(product => {
      totalMeisterStunden += (product.customMeisterStunden || 0) * product.quantity;
      totalGesellenstunden += (product.customGesellenstunden || 0) * product.quantity;
      totalMonteurStunden += (product.customMonteurStunden || 0) * product.quantity;
    });

    return { totalMeisterStunden, totalGesellenstunden, totalMonteurStunden };
  };

  const updateProductHours = (type: 'wallbox' | 'required' | 'optional', artikelnummer: number, hourType: 'meister' | 'geselle' | 'monteur', hours: number) => {
    const fieldName = hourType === 'meister' ? 'customMeisterStunden' : 
                      hourType === 'geselle' ? 'customGesellenstunden' : 'customMonteurStunden';
    
    if (type === 'wallbox' && config.selectedWallbox?.artikelnummer === artikelnummer) {
      setConfig(prev => ({
        ...prev,
        selectedWallbox: {
          ...prev.selectedWallbox!,
          [fieldName]: hours
        }
      }));
    } else if (type === 'required') {
      setConfig(prev => ({
        ...prev,
        requiredProducts: prev.requiredProducts.map(p => 
          p.artikelnummer === artikelnummer 
            ? { ...p, [fieldName]: hours }
            : p
        )
      }));
    } else if (type === 'optional') {
      setConfig(prev => ({
        ...prev,
        optionalProducts: prev.optionalProducts.map(p => 
          p.artikelnummer === artikelnummer 
            ? { ...p, [fieldName]: hours }
            : p
        )
      }));
    }
  };

  const calculateLaborCosts = () => {
    const { totalMeisterStunden, totalGesellenstunden, totalMonteurStunden } = calculateTotalHours();
    return (totalMeisterStunden * config.meisterStundensatz) + 
           (totalGesellenstunden * config.gesellenStundensatz) + 
           (totalMonteurStunden * config.monteurStundensatz);
  };

  const calculateTotal = () => {
    return calculateMaterialCosts() + calculateLaborCosts() + config.anfahrtKosten;
  };

  const addToCart = () => {
    if (!config.selectedWallbox) return;

    const cartItems = [
      {
        productType: 'wallbox' as const,
        name: config.selectedWallbox.name,
        configuration: {
          wallbox: config.selectedWallbox,
          requiredProducts: config.requiredProducts,
          optionalProducts: config.optionalProducts,
          meisterStunden: calculateTotalHours().totalMeisterStunden,
          gesellenStunden: calculateTotalHours().totalGesellenstunden,
          monteurStunden: calculateTotalHours().totalMonteurStunden
        },
        pricing: {
          materialCosts: calculateMaterialCosts(),
          laborCosts: calculateLaborCosts(),
          travelCosts: config.anfahrtKosten,
          subtotal: calculateTotal(),
          subsidy: 0,
          total: calculateTotal()
        }
      }
    ];

    cartItems.forEach(item => {
      addItem(item);
    });

    toast({
      title: "Zur Anfrage hinzugefügt",
      description: "Ihre Wallbox-Konfiguration wurde zur Anfrage hinzugefügt.",
    });

    setIsCartOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold">Wallbox Konfigurator</h1>
            <CartIcon onClick={() => setIsCartOpen(true)} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Package Overview (1/3 width) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Paket-Übersicht
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.selectedWallbox && (
                   <div className="space-y-3">
                     {/* Wallbox */}
                     <div className="p-3 bg-primary/10 rounded-lg">
                       <div className="font-medium text-primary">Wallbox</div>
                       <div className="text-sm">{config.selectedWallbox.name}</div>
                       <div className="text-xs text-muted-foreground mt-1">
                         M: {(config.selectedWallbox.customMeisterStunden || 0) * config.selectedWallbox.quantity}h, 
                         G: {(config.selectedWallbox.customGesellenstunden || 0) * config.selectedWallbox.quantity}h,
                         Mo: {(config.selectedWallbox.customMonteurStunden || 0) * config.selectedWallbox.quantity}h
                       </div>
                       <div className="text-right font-bold">
                         {config.selectedWallbox.price.toFixed(2)}€
                       </div>
                     </div>

                    {/* Required Products */}
                    {config.requiredProducts.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="font-medium text-sm text-primary">Benötigte Komponenten</div>
                          {config.requiredProducts.map((product) => (
                             <div key={product.artikelnummer} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                               <div className="text-sm">
                                 <div>{product.name}</div>
                                 <div className="text-xs text-muted-foreground">
                                   {product.quantity} {product.einheit} • 
                                   M: {(product.customMeisterStunden || 0) * product.quantity}h, 
                                   G: {(product.customGesellenstunden || 0) * product.quantity}h,
                                   Mo: {(product.customMonteurStunden || 0) * product.quantity}h
                                 </div>
                               </div>
                               <div className="text-sm font-medium">
                                 {(product.price * product.quantity).toFixed(2)}€
                               </div>
                             </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Optional Products */}
                    {config.optionalProducts.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="font-medium text-sm text-green-600">Optionale Komponenten</div>
                          {config.optionalProducts.map((product) => (
                            <div key={product.artikelnummer} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                               <div className="text-sm flex-1">
                                 <div>{product.name}</div>
                                 <div className="text-xs text-muted-foreground">
                                   {product.quantity} {product.einheit} • 
                                   M: {(product.customMeisterStunden || 0) * product.quantity}h, 
                                   G: {(product.customGesellenstunden || 0) * product.quantity}h,
                                   Mo: {(product.customMonteurStunden || 0) * product.quantity}h
                                 </div>
                               </div>
                              <div className="text-sm font-medium flex items-center gap-2">
                                {(product.price * product.quantity).toFixed(2)}€
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOptionalProduct(product.artikelnummer)}
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Cost Breakdown */}
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Materialkosten:</span>
                        <span>{calculateMaterialCosts().toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Arbeitskosten:</span>
                        <span>{calculateLaborCosts().toFixed(2)}€</span>
                      </div>
                      {config.anfahrtKosten > 0 && (
                        <div className="flex justify-between">
                          <span>Anfahrt:</span>
                          <span>{config.anfahrtKosten.toFixed(2)}€</span>
                        </div>
                      )}
                    </div>

                    <Separator />
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Gesamt (netto):</span>
                      <span className="text-primary">{calculateTotal().toFixed(2)}€</span>
                    </div>

                    <Button 
                      onClick={addToCart} 
                      className="w-full"
                      size="lg"
                    >
                      <Euro className="h-4 w-4 mr-2" />
                      Zur Anfrage hinzufügen
                    </Button>
                  </div>
                )}

                {!config.selectedWallbox && (
                  <div className="text-center text-muted-foreground py-8">
                    <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Wählen Sie zunächst eine Wallbox aus</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Content Area (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallbox Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Wallbox auswählen</CardTitle>
                <p className="text-sm text-muted-foreground">Wählen Sie zunächst Ihre gewünschte Wallbox aus.</p>
              </CardHeader>
               <CardContent>
                 <div className="space-y-4">
                   {getWallboxes().map((wallbox) => (
                     <div 
                       key={wallbox.artikelnummer}
                       className={`p-4 bg-primary/10 rounded-lg border border-primary/20 cursor-pointer transition-all hover:shadow-md ${
                         config.selectedWallbox?.artikelnummer === wallbox.artikelnummer 
                           ? 'ring-2 ring-primary' 
                           : ''
                       }`}
                       onClick={() => selectWallbox(wallbox)}
                     >
                       <div className="flex items-center justify-between">
                         <div className="flex-1">
                           <h3 className="font-semibold">{wallbox.name}</h3>
                           <p className="text-sm text-muted-foreground mt-1">{wallbox.beschreibung}</p>
                           <div className="flex items-center gap-2 mt-2">
                             <span className="text-sm">{wallbox.einheit}</span>
                             {config.selectedWallbox?.artikelnummer === wallbox.artikelnummer && (
                               <>
                                 <span className="text-sm">• M:</span>
                                 <Input
                                   type="number"
                                   min="0"
                                   step="0.5"
                                   value={config.selectedWallbox?.customMeisterStunden || 0}
                                   onChange={(e) => updateProductHours('wallbox', wallbox.artikelnummer, 'meister', parseFloat(e.target.value) || 0)}
                                   className="w-16"
                                   onClick={(e) => e.stopPropagation()}
                                 />
                                 <span className="text-sm">h, G:</span>
                                 <Input
                                   type="number"
                                   min="0"
                                   step="0.5"
                                   value={config.selectedWallbox?.customGesellenstunden || 0}
                                   onChange={(e) => updateProductHours('wallbox', wallbox.artikelnummer, 'geselle', parseFloat(e.target.value) || 0)}
                                   className="w-16"
                                   onClick={(e) => e.stopPropagation()}
                                 />
                                 <span className="text-sm">h, Mo:</span>
                                 <Input
                                   type="number"
                                   min="0"
                                   step="0.5"
                                   value={config.selectedWallbox?.customMonteurStunden || 0}
                                   onChange={(e) => updateProductHours('wallbox', wallbox.artikelnummer, 'monteur', parseFloat(e.target.value) || 0)}
                                   className="w-16"
                                   onClick={(e) => e.stopPropagation()}
                                 />
                                 <span className="text-sm">h</span>
                               </>
                             )}
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="text-lg font-bold text-primary">
                             {parseFloat(wallbox.verkaufspreis).toFixed(2)}€
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </CardContent>
            </Card>

            {/* Optional Components */}
            {config.selectedWallbox && (
              <Card>
                <CardHeader>
                  <CardTitle>Optionale Komponenten</CardTitle>
                  <p className="text-sm text-muted-foreground">Wählen Sie zusätzliche Komponenten aus jeder Kategorie.</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Show categories that have autoselected or manually selected products */}
                    {getAvailableKategorien()
                      .filter((kategorie) => {
                        // Show category if it has autoselected products or manually selected products
                        const autoSelectedProducts = getAutoSelectProducts();
                        const hasAutoSelected = autoSelectedProducts.some(p => p.kategorie.trim() === kategorie);
                        const hasManuallySelected = config.optionalProducts.some(p => p.kategorie.trim() === kategorie);
                        return hasAutoSelected || hasManuallySelected;
                      })
                      .map((kategorie) => (
                        <div key={kategorie} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-lg">{kategorie}</h3>
                            <Select onValueChange={(value) => {
                              if (value && value !== 'none') {
                                const product = getProductsByKategorie(kategorie).find(p => p.artikelnummer.toString() === value);
                                if (product) {
                                  addOptionalProduct(product);
                                }
                              }
                            }}>
                              <SelectTrigger className="w-64">
                                <SelectValue placeholder={`${kategorie} hinzufügen`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Kein Produkt auswählen</SelectItem>
                                {getProductsByKategorie(kategorie)
                                  .filter(p => !config.optionalProducts.some(selected => selected.artikelnummer === p.artikelnummer))
                                  .map((product) => (
                                    <SelectItem key={product.artikelnummer} value={product.artikelnummer.toString()}>
                                      {product.name} - {parseFloat(product.verkaufspreis).toFixed(2)}€
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Currently selected products for this category */}
                          <div className="space-y-2">
                            {config.optionalProducts
                              .filter(p => p.kategorie === kategorie)
                              .map((product) => (
                                <div key={product.artikelnummer} className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                                  <div className="flex-1">
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-sm text-muted-foreground">{product.beschreibung}</div>
                                     <div className="flex items-center gap-2 mt-2">
                                       <Input
                                         type="number"
                                         min="1"
                                         value={product.quantity}
                                         onChange={(e) => updateProductQuantity('optional', product.artikelnummer, parseInt(e.target.value) || 1)}
                                         className="w-20"
                                       />
                                       <span className="text-sm">{product.einheit}</span>
                                       <span className="text-sm">• M:</span>
                                       <Input
                                         type="number"
                                         min="0"
                                         step="0.5"
                                         value={product.customMeisterStunden || 0}
                                         onChange={(e) => updateProductHours('optional', product.artikelnummer, 'meister', parseFloat(e.target.value) || 0)}
                                         className="w-16"
                                       />
                                       <span className="text-sm">h, G:</span>
                                       <Input
                                         type="number"
                                         min="0"
                                         step="0.5"
                                         value={product.customGesellenstunden || 0}
                                         onChange={(e) => updateProductHours('optional', product.artikelnummer, 'geselle', parseFloat(e.target.value) || 0)}
                                         className="w-16"
                                       />
                                       <span className="text-sm">h, Mo:</span>
                                       <Input
                                         type="number"
                                         min="0"
                                         step="0.5"
                                         value={product.customMonteurStunden || 0}
                                         onChange={(e) => updateProductHours('optional', product.artikelnummer, 'monteur', parseFloat(e.target.value) || 0)}
                                         className="w-16"
                                       />
                                       <span className="text-sm">h</span>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-primary">
                                      {(product.price * product.quantity).toFixed(2)}€
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeOptionalProduct(product.artikelnummer)}
                                      className="mt-2 text-destructive hover:text-destructive"
                                    >
                                      Entfernen
                                    </Button>
                                  </div>
                                </div>
                            ))}
                          </div>
                        </div>
                      ))}

                    {/* Plus button for adding new categories */}
                    <div className="pt-4 border-t">
                      <Select
                        value=""
                        onValueChange={(value) => {
                          if (value) {
                            const [kategorie, artikelnummer] = value.split('|');
                            const product = allProducts.find(p => p.artikelnummer.toString() === artikelnummer);
                            if (product) {
                              addOptionalProduct(product);
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">+</span>
                            <SelectValue placeholder="Weitere Kategorien hinzufügen" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-96">
                          {getAvailableKategorien()
                            .filter((kategorie) => {
                              // Only show categories that are not already displayed
                              const autoSelectedProducts = getAutoSelectProducts();
                              const hasAutoSelected = autoSelectedProducts.some(p => p.kategorie.trim() === kategorie);
                              const hasManuallySelected = config.optionalProducts.some(p => p.kategorie.trim() === kategorie);
                              return !hasAutoSelected && !hasManuallySelected;
                            })
                            .map((kategorie) => (
                              <div key={kategorie}>
                                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted/50">
                                  {kategorie}
                                </div>
                                {getProductsByKategorie(kategorie).map((product) => (
                                  <SelectItem 
                                    key={product.artikelnummer} 
                                    value={`${kategorie}|${product.artikelnummer}`}
                                    className="pl-6"
                                  >
                                    {product.name} - {parseFloat(product.verkaufspreis).toFixed(2)}€
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Labor Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Arbeitsstunden
                </CardTitle>
                <p className="text-sm text-muted-foreground">Passen Sie die Arbeitsstunden bei Bedarf an.</p>
              </CardHeader>
               <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="space-y-2">
                     <Label>Meisterstunden (à {config.meisterStundensatz}€)</Label>
                     <Input
                       type="number"
                       min="0"
                       step="0.5"
                       value={calculateTotalHours().totalMeisterStunden}
                       onChange={(e) => updateLaborHours('meister', parseFloat(e.target.value) || 0)}
                     />
                     <div className="text-sm text-muted-foreground">
                       = {(calculateTotalHours().totalMeisterStunden * config.meisterStundensatz).toFixed(2)}€
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label>Gesellenstunden (à {config.gesellenStundensatz}€)</Label>
                     <Input
                       type="number"
                       min="0"
                       step="0.5"
                       value={calculateTotalHours().totalGesellenstunden}
                       onChange={(e) => updateLaborHours('geselle', parseFloat(e.target.value) || 0)}
                     />
                     <div className="text-sm text-muted-foreground">
                       = {(calculateTotalHours().totalGesellenstunden * config.gesellenStundensatz).toFixed(2)}€
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label>Monteurstunden (à {config.monteurStundensatz}€)</Label>
                     <Input
                       type="number"
                       min="0"
                       step="0.5"
                       value={calculateTotalHours().totalMonteurStunden}
                       onChange={(e) => updateLaborHours('monteur', parseFloat(e.target.value) || 0)}
                     />
                     <div className="text-sm text-muted-foreground">
                       = {(calculateTotalHours().totalMonteurStunden * config.monteurStundensatz).toFixed(2)}€
                     </div>
                   </div>
                 </div>
               </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </div>
  );
}