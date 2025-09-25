import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
import { CartSheet } from '@/components/cart/CartSheet';
import { Zap, Euro, Clock, ArrowLeftRight, Trash2, Check, ChevronsUpDown } from 'lucide-react';

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
  preselect?: boolean;
  foto?: string;
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
  laborHours: {
    meister: number;
    geselle: number;
    monteur: number;
  };
  travelCosts: number;
}

export const WallboxConfigurator = () => {
  const [products, setProducts] = useState<WallboxProduct[]>([]);
  const [config, setConfig] = useState<ConfigState>({ 
    selectedWallbox: null, 
    requiredProducts: [], 
    optionalProducts: [], 
    laborHours: { meister: 0, geselle: 0, monteur: 0 }, 
    travelCosts: 0 
  });
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAlternativesOpen, setIsAlternativesOpen] = useState(false);
  const [isComponentsOpen, setIsComponentsOpen] = useState(false);
  const { toast } = useToast();
  const { addItem } = useCart();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('wallboxen')
        .select('*');

      if (error) {
        console.error('Error loading products:', error);
        toast({
          title: "Fehler",
          description: "Produkte konnten nicht geladen werden.",
          variant: "destructive",
        });
        return;
      }

      const mappedProducts: WallboxProduct[] = (data || []).map(item => ({
        artikelnummer: item["Artikelnummer"],
        name: item["Name"] || '',
        kategorie: item["Typ"] || '',
        beschreibung: item["Beschreibung"] || '',
        verkaufspreis: item["Verkaufspreis"] || '0',
        einheit: item["Einheit"] || 'Stk',
        anzahl_einheit: item["Anzahl Einheit"] || 1,
        required: item["required"],
        optional: item["optional"],
        exclude: item["exclude"],
        auto_select: item["auto_select"],
        stunden_meister: item["stunden_meister"] || '0',
        stunden_geselle: item["stunden_geselle"] || '0',
        stunden_monteur: item["stunden_monteur"] || '0',
        typ: item["Typ"] || '',
        preselect: item["preselect"] || false,
        foto: item["foto"] || null
      }));

      setProducts(mappedProducts);

      // Initialize selection using mappedProducts to avoid state race
      const wallboxes = mappedProducts.filter(p => p.typ === 'Wallbox');
      if (wallboxes.length > 0) {
        const wallbox = wallboxes.find(w => w.preselect === true) || wallboxes[0];

        const selectedWallbox: SelectedProduct = {
          artikelnummer: wallbox.artikelnummer,
          name: wallbox.name,
          price: parseFloat(wallbox.verkaufspreis),
          kategorie: wallbox.kategorie,
          beschreibung: wallbox.beschreibung,
          quantity: 1,
          einheit: wallbox.einheit,
          customMeisterStunden: parseFloat(wallbox.stunden_meister) || 0,
          customGesellenstunden: parseFloat(wallbox.stunden_geselle) || 0,
          customMonteurStunden: parseFloat(wallbox.stunden_monteur || '0') || 0
        };

        const requiredProducts: SelectedProduct[] = (wallbox.required || [])
          .map(id => mappedProducts.find(p => p.artikelnummer.toString() === id && p.typ !== 'Wallbox'))
          .filter(Boolean)
          .map(p => ({
            artikelnummer: p!.artikelnummer,
            name: p!.name,
            price: parseFloat(p!.verkaufspreis),
            kategorie: p!.kategorie,
            beschreibung: p!.beschreibung,
            isRequired: true,
            quantity: 1,
            einheit: p!.einheit,
            customMeisterStunden: parseFloat(p!.stunden_meister) || 0,
            customGesellenstunden: parseFloat(p!.stunden_geselle) || 0,
            customMonteurStunden: parseFloat(p!.stunden_monteur || '0') || 0
          }));

        const autoSelectedProducts: SelectedProduct[] = (wallbox.auto_select || [])
          .map(id => mappedProducts.find(p => p.artikelnummer.toString() === id && p.typ !== 'Wallbox'))
          .filter(Boolean)
          .map(p => ({
            artikelnummer: p!.artikelnummer,
            name: p!.name,
            price: parseFloat(p!.verkaufspreis),
            kategorie: p!.kategorie,
            beschreibung: p!.beschreibung,
            isAutoSelected: true,
            quantity: 1,
            einheit: p!.einheit,
            customMeisterStunden: parseFloat(p!.stunden_meister) || 0,
            customGesellenstunden: parseFloat(p!.stunden_geselle) || 0,
            customMonteurStunden: parseFloat(p!.stunden_monteur || '0') || 0
          }));

        setConfig(prev => ({
          ...prev,
          selectedWallbox,
          requiredProducts,
          optionalProducts: autoSelectedProducts
        }));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in loadProducts:', error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const getWallboxes = () => {
    return products.filter(p => p.typ === 'Wallbox');
  };

  const getRequiredProducts = (wallboxArtikelnummer: number) => {
    const wallbox = products.find(p => p.artikelnummer === wallboxArtikelnummer);
    if (!wallbox?.required) return [];
    
    return products.filter(p => 
      wallbox.required!.includes(p.artikelnummer.toString()) && 
      p.typ !== 'Wallbox'
    );
  };

  const getOptionalProducts = (wallboxArtikelnummer: number) => {
    const wallbox = products.find(p => p.artikelnummer === wallboxArtikelnummer);
    if (!wallbox?.optional) return [];
    
    return products.filter(p => 
      wallbox.optional!.includes(p.artikelnummer.toString()) && 
      p.typ !== 'Wallbox'
    );
  };

  const getExcludedProducts = (wallboxArtikelnummer: number) => {
    const wallbox = products.find(p => p.artikelnummer === wallboxArtikelnummer);
    if (!wallbox?.exclude) return [];
    
    return wallbox.exclude.map(Number);
  };

  const getAutoSelectProducts = (wallboxArtikelnummer: number) => {
    const wallbox = products.find(p => p.artikelnummer === wallboxArtikelnummer);
    if (!wallbox?.auto_select) return [];
    
    return products.filter(p => 
      wallbox.auto_select!.includes(p.artikelnummer.toString()) && 
      p.typ !== 'Wallbox'
    );
  };

  const getProductsByKategorie = (kategorie: string) => {
    if (!config.selectedWallbox) return [];
    
    const optionalProducts = getOptionalProducts(config.selectedWallbox.artikelnummer);
    const excludedProducts = getExcludedProducts(config.selectedWallbox.artikelnummer);
    
    return optionalProducts.filter(p => 
      p.kategorie.trim() === kategorie &&
      !excludedProducts.includes(p.artikelnummer)
    );
  };

  const getAvailableKategorien = () => {
    if (!config.selectedWallbox) return [];
    
    const optionalProducts = getOptionalProducts(config.selectedWallbox.artikelnummer);
    const excludedProducts = getExcludedProducts(config.selectedWallbox.artikelnummer);
    
    const categories = [...new Set(
      optionalProducts
        .filter(p => !excludedProducts.includes(p.artikelnummer))
        .map(p => p.kategorie.trim())
        .filter(k => k !== '')
    )];
    
    return categories;
  };

  const selectWallbox = (product: WallboxProduct) => {
    const selectedProduct: SelectedProduct = {
      artikelnummer: product.artikelnummer,
      name: product.name,
      price: parseFloat(product.verkaufspreis),
      kategorie: product.kategorie,
      beschreibung: product.beschreibung,
      quantity: 1,
      einheit: product.einheit,
      customMeisterStunden: parseFloat(product.stunden_meister) || 0,
      customGesellenstunden: parseFloat(product.stunden_geselle) || 0,
      customMonteurStunden: parseFloat(product.stunden_monteur || '0') || 0
    };

    // Get required products
    const requiredProducts = getRequiredProducts(product.artikelnummer).map(req => ({
      artikelnummer: req.artikelnummer,
      name: req.name,
      price: parseFloat(req.verkaufspreis),
      kategorie: req.kategorie,
      beschreibung: req.beschreibung,
      isRequired: true,
      quantity: 1,
      einheit: req.einheit,
      customMeisterStunden: parseFloat(req.stunden_meister) || 0,
      customGesellenstunden: parseFloat(req.stunden_geselle) || 0,
      customMonteurStunden: parseFloat(req.stunden_monteur || '0') || 0
    }));

    // Get auto-selected optional products
    const autoSelectedProducts = getAutoSelectProducts(product.artikelnummer).map(auto => ({
      artikelnummer: auto.artikelnummer,
      name: auto.name,
      price: parseFloat(auto.verkaufspreis),
      kategorie: auto.kategorie,
      beschreibung: auto.beschreibung,
      isAutoSelected: true,
      quantity: 1,
      einheit: auto.einheit,
      customMeisterStunden: parseFloat(auto.stunden_meister) || 0,
      customGesellenstunden: parseFloat(auto.stunden_geselle) || 0,
      customMonteurStunden: parseFloat(auto.stunden_monteur || '0') || 0
    }));

    setConfig(prev => ({
      ...prev,
      selectedWallbox: selectedProduct,
      requiredProducts,
      optionalProducts: autoSelectedProducts
    }));
  };

  const addOptionalProduct = (product: WallboxProduct) => {
    const selectedProduct: SelectedProduct = {
      artikelnummer: product.artikelnummer,
      name: product.name,
      price: parseFloat(product.verkaufspreis),
      kategorie: product.kategorie,
      beschreibung: product.beschreibung,
      quantity: 1,
      einheit: product.einheit,
      customMeisterStunden: parseFloat(product.stunden_meister) || 0,
      customGesellenstunden: parseFloat(product.stunden_geselle) || 0,
      customMonteurStunden: parseFloat(product.stunden_monteur || '0') || 0
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

  const updateProductQuantity = (type: 'wallbox' | 'required' | 'optional', artikelnummer: number, quantity: number) => {
    setConfig(prev => {
      if (type === 'wallbox' && prev.selectedWallbox?.artikelnummer === artikelnummer) {
        return {
          ...prev,
          selectedWallbox: { ...prev.selectedWallbox, quantity }
        };
      } else if (type === 'required') {
        return {
          ...prev,
          requiredProducts: prev.requiredProducts.map(p => 
            p.artikelnummer === artikelnummer ? { ...p, quantity } : p
          )
        };
      } else if (type === 'optional') {
        return {
          ...prev,
          optionalProducts: prev.optionalProducts.map(p => 
            p.artikelnummer === artikelnummer ? { ...p, quantity } : p
          )
        };
      }
      return prev;
    });
  };

  const updateProductHours = (type: 'wallbox' | 'required' | 'optional', artikelnummer: number, hourType: 'meister' | 'geselle' | 'monteur', hours: number) => {
    setConfig(prev => {
      const updateHours = (product: SelectedProduct) => {
        if (hourType === 'meister') return { ...product, customMeisterStunden: hours };
        if (hourType === 'geselle') return { ...product, customGesellenstunden: hours };
        if (hourType === 'monteur') return { ...product, customMonteurStunden: hours };
        return product;
      };

      if (type === 'wallbox' && prev.selectedWallbox?.artikelnummer === artikelnummer) {
        return {
          ...prev,
          selectedWallbox: updateHours(prev.selectedWallbox)
        };
      } else if (type === 'required') {
        return {
          ...prev,
          requiredProducts: prev.requiredProducts.map(p => 
            p.artikelnummer === artikelnummer ? updateHours(p) : p
          )
        };
      } else if (type === 'optional') {
        return {
          ...prev,
          optionalProducts: prev.optionalProducts.map(p => 
            p.artikelnummer === artikelnummer ? updateHours(p) : p
          )
        };
      }
      return prev;
    });
  };

  // Calculation functions
  const calculateMaterialCosts = () => {
    let total = 0;
    if (config.selectedWallbox) {
      total += config.selectedWallbox.price * config.selectedWallbox.quantity;
    }
    config.requiredProducts.forEach(p => total += p.price * p.quantity);
    config.optionalProducts.forEach(p => total += p.price * p.quantity);
    return total;
  };

  const calculateTotalHours = () => {
    let totalMeister = 0;
    let totalGeselle = 0;
    let totalMonteur = 0;

    if (config.selectedWallbox) {
      totalMeister += (config.selectedWallbox.customMeisterStunden || 0) * config.selectedWallbox.quantity;
      totalGeselle += (config.selectedWallbox.customGesellenstunden || 0) * config.selectedWallbox.quantity;
      totalMonteur += (config.selectedWallbox.customMonteurStunden || 0) * config.selectedWallbox.quantity;
    }

    config.requiredProducts.forEach(p => {
      totalMeister += (p.customMeisterStunden || 0) * p.quantity;
      totalGeselle += (p.customGesellenstunden || 0) * p.quantity;
      totalMonteur += (p.customMonteurStunden || 0) * p.quantity;
    });

    config.optionalProducts.forEach(p => {
      totalMeister += (p.customMeisterStunden || 0) * p.quantity;
      totalGeselle += (p.customGesellenstunden || 0) * p.quantity;
      totalMonteur += (p.customMonteurStunden || 0) * p.quantity;
    });

    return { 
      meister: totalMeister, 
      geselle: totalGeselle, 
      monteur: totalMonteur,
      total: totalMeister + totalGeselle + totalMonteur
    };
  };

  const calculateLaborCosts = () => {
    const hours = calculateTotalHours();
    const meisterRate = 85;
    const geselleRate = 65;
    const monteurRate = 45;

    return (hours.meister * meisterRate) + (hours.geselle * geselleRate) + (hours.monteur * monteurRate);
  };

  const calculateTotal = () => {
    return calculateMaterialCosts() + calculateLaborCosts() + config.travelCosts;
  };

  const addToCart = () => {
    if (!config.selectedWallbox) {
      toast({
        title: "Keine Wallbox ausgewählt",
        description: "Bitte wählen Sie eine Wallbox aus.",
        variant: "destructive",
      });
      return;
    }

    const materialCosts = calculateMaterialCosts();
    const laborCosts = calculateLaborCosts();
    const totalHours = calculateTotalHours();

    const cartItem = {
      productType: 'wallbox' as const,
      name: 'Wallbox-Konfiguration',
      configuration: {
        wallbox: config.selectedWallbox,
        requiredProducts: config.requiredProducts,
        optionalProducts: config.optionalProducts,
        hours: totalHours
      },
      pricing: {
        materialCosts: materialCosts,
        laborCosts: laborCosts,
        travelCosts: config.travelCosts,
        subtotal: materialCosts + laborCosts + config.travelCosts,
        subsidy: 0,
        total: calculateTotal()
      }
    };

    addItem(cartItem);

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
                               <div className="text-sm font-medium">
                                 {(product.price * product.quantity).toFixed(2)}€
                               </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                     <Separator />
                     
                     {/* Cost Breakdown */}
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span>Materialkosten:</span>
                         <span>{calculateMaterialCosts().toFixed(2)}€</span>
                       </div>
                       <div className="flex justify-between text-sm">
                         <span>Arbeitskosten:</span>
                         <span>{calculateLaborCosts().toFixed(2)}€</span>
                       </div>
                       <div className="flex justify-between text-sm">
                         <span>Anfahrtskosten:</span>
                         <span>{config.travelCosts.toFixed(2)}€</span>
                       </div>
                       <Separator />
                       <div className="flex justify-between font-bold text-lg text-primary">
                         <span>Gesamt:</span>
                         <span>{calculateTotal().toFixed(2)}€</span>
                       </div>
                     </div>

                     <Button onClick={addToCart} className="w-full" size="lg">
                       Zur Anfrage hinzufügen
                     </Button>
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
                  <CardTitle>1. Wallbox auswählen</CardTitle>
                  <p className="text-sm text-muted-foreground">Ihre empfohlene Wallbox-Lösung.</p>
                </CardHeader>
                <CardContent>
                  {config.selectedWallbox && (
                    <div className="space-y-4">
                      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 ring-2 ring-primary">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{config.selectedWallbox.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{config.selectedWallbox.beschreibung}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm">{config.selectedWallbox.einheit}</span>
                              <span className="text-sm">• M:</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={config.selectedWallbox?.customMeisterStunden || 0}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '') {
                                    // Temporarily allow empty for user input
                                    return;
                                  }
                                  updateProductHours('wallbox', config.selectedWallbox.artikelnummer, 'meister', parseFloat(value) || 0);
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === '') {
                                    updateProductHours('wallbox', config.selectedWallbox.artikelnummer, 'meister', 0);
                                  }
                                }}
                                className="w-16"
                              />
                              <span className="text-sm">h, G:</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={config.selectedWallbox?.customGesellenstunden || 0}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '') {
                                    // Temporarily allow empty for user input
                                    return;
                                  }
                                  updateProductHours('wallbox', config.selectedWallbox.artikelnummer, 'geselle', parseFloat(value) || 0);
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === '') {
                                    updateProductHours('wallbox', config.selectedWallbox.artikelnummer, 'geselle', 0);
                                  }
                                }}
                                className="w-16"
                              />
                              <span className="text-sm">h, Mo:</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={config.selectedWallbox?.customMonteurStunden || 0}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '') {
                                    // Temporarily allow empty for user input
                                    return;
                                  }
                                  updateProductHours('wallbox', config.selectedWallbox.artikelnummer, 'monteur', parseFloat(value) || 0);
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === '') {
                                    updateProductHours('wallbox', config.selectedWallbox.artikelnummer, 'monteur', 0);
                                  }
                                }}
                                className="w-16"
                              />
                              <span className="text-sm">h</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              {config.selectedWallbox.price.toFixed(2)}€
                            </div>
                          </div>
                        </div>
                      </div>

                      <Dialog open={isAlternativesOpen} onOpenChange={setIsAlternativesOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full">
                            <ArrowLeftRight className="h-4 w-4 mr-2" />
                            Alternative Produkte
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Alternative Wallbox-Produkte</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 mt-4">
                            {getWallboxes().map((wallbox) => (
                              <div 
                                key={wallbox.artikelnummer}
                                className={`flex gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                  config.selectedWallbox?.artikelnummer === wallbox.artikelnummer 
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                                    : 'border-border hover:border-primary'
                                }`}
                                onClick={() => {
                                  selectWallbox(wallbox);
                                  setIsAlternativesOpen(false);
                                }}
                              >
                                {/* Image on the left */}
                                <div className="flex-shrink-0 w-32 h-24 bg-muted rounded-lg overflow-hidden border">
                                  {wallbox.foto ? (
                                    <img 
                                      src={wallbox.foto} 
                                      alt={wallbox.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.currentTarget as HTMLImageElement;
                                        const placeholder = target.nextElementSibling as HTMLElement;
                                        target.style.display = 'none';
                                        if (placeholder) {
                                          placeholder.style.display = 'flex';
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-full h-full flex items-center justify-center ${wallbox.foto ? 'hidden' : 'flex'}`}>
                                    <div className="text-xs text-muted-foreground text-center">
                                      Wallbox<br />Bild
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Product information */}
                                <div className="flex-1 flex items-center justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{wallbox.name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{wallbox.beschreibung}</p>
                                    <div className="flex items-center gap-2 mt-3">
                                      <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">{wallbox.einheit}</span>
                                      {config.selectedWallbox?.artikelnummer === wallbox.artikelnummer && (
                                        <Badge variant="default" className="bg-primary text-primary-foreground">Ausgewählt</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right ml-4">
                                    <div className="text-2xl font-bold text-primary">
                                      {parseFloat(wallbox.verkaufspreis).toFixed(2)}€
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      inkl. MwSt.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </CardContent>
            </Card>

            {/* Optional Components */}
            {config.selectedWallbox && (
              <Card>
                <CardHeader>
                  <CardTitle>2. Optionale Komponenten</CardTitle>
                  <p className="text-sm text-muted-foreground">Wählen Sie zusätzliche Komponenten aus jeder Kategorie.</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                     {/* Show categories that have products currently selected (both auto-selected and manually added) */}
                     {getAvailableKategorien()
                       .filter((kategorie) => {
                         // Show category if it has products currently selected
                         return config.optionalProducts.some(p => p.kategorie.trim() === kategorie);
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
                              <SelectContent className="max-h-60">
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
                              .filter(p => p.kategorie.trim() === kategorie)
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
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '') {
                                    // Temporarily allow empty for user input
                                    return;
                                  }
                                  updateProductQuantity('optional', product.artikelnummer, parseInt(value) || 1);
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === '' || e.target.value === '0') {
                                    updateProductQuantity('optional', product.artikelnummer, 1);
                                  }
                                }}
                                className="w-20"
                              />
                                       <span className="text-sm">{product.einheit}</span>
                                       <span className="text-sm">• M:</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={product.customMeisterStunden || 0}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              // Temporarily allow empty for user input
                              return;
                            }
                            updateProductHours('optional', product.artikelnummer, 'meister', parseFloat(value) || 0);
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              updateProductHours('optional', product.artikelnummer, 'meister', 0);
                            }
                          }}
                          className="w-16"
                        />
                                       <span className="text-sm">h, G:</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={product.customGesellenstunden || 0}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              // Temporarily allow empty for user input
                              return;
                            }
                            updateProductHours('optional', product.artikelnummer, 'geselle', parseFloat(value) || 0);
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              updateProductHours('optional', product.artikelnummer, 'geselle', 0);
                            }
                          }}
                          className="w-16"
                        />
                                       <span className="text-sm">h, Mo:</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={product.customMonteurStunden || 0}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              // Temporarily allow empty for user input
                              return;
                            }
                            updateProductHours('optional', product.artikelnummer, 'monteur', parseFloat(value) || 0);
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              updateProductHours('optional', product.artikelnummer, 'monteur', 0);
                            }
                          }}
                          className="w-16"
                        />
                                       <span className="text-sm">h</span>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-primary">
                                        {(product.price * product.quantity).toFixed(2)}€
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {product.price.toFixed(2)}€ pro {product.einheit}
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeOptionalProduct(product.artikelnummer)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                       ))}

                     {/* Single dropdown with categories and search for all unselected categories */}
                     {getAvailableKategorien().filter((kategorie) => {
                       return !config.optionalProducts.some(p => p.kategorie.trim() === kategorie);
                     }).length > 0 && (
                       <div className="mt-4">
                         <Popover open={isComponentsOpen} onOpenChange={setIsComponentsOpen}>
                           <PopoverTrigger asChild>
                             <Button
                               variant="outline"
                               role="combobox"
                               aria-expanded={isComponentsOpen}
                               className="w-full justify-between"
                             >
                               Zusätzliche Komponenten hinzufügen
                               <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                             <Command>
                               <CommandInput placeholder="Komponenten suchen..." />
                               <CommandList className="max-h-60">
                                 <CommandEmpty>Keine Komponenten gefunden.</CommandEmpty>
                                 {getAvailableKategorien()
                                   .filter((kategorie) => {
                                     return !config.optionalProducts.some(p => p.kategorie.trim() === kategorie);
                                   })
                                   .map((kategorie) => {
                                     const products = getProductsByKategorie(kategorie);
                                     if (products.length === 0) return null;
                                     
                                     return (
                                       <CommandGroup key={kategorie} heading={kategorie}>
                                         {products.map((product) => (
                                           <CommandItem
                                             key={product.artikelnummer}
                                             value={`${kategorie} ${product.name} ${product.beschreibung}`}
                                             onSelect={() => {
                                               addOptionalProduct(product);
                                               setIsComponentsOpen(false);
                                             }}
                                             className="cursor-pointer"
                                           >
                                             <div className="flex flex-col w-full">
                                               <div className="font-medium">{product.name}</div>
                                               <div className="text-sm text-muted-foreground">
                                                 {product.beschreibung}
                                               </div>
                                               <div className="text-sm font-medium text-primary mt-1">
                                                 {parseFloat(product.verkaufspreis).toFixed(2)}€ / {product.einheit}
                                               </div>
                                             </div>
                                           </CommandItem>
                                         ))}
                                       </CommandGroup>
                                     );
                                   })}
                               </CommandList>
                             </Command>
                           </PopoverContent>
                         </Popover>
                       </div>
                     )}
                   </div>
                </CardContent>
              </Card>
            )}

            {/* Labor Hours and Travel Costs */}
            {config.selectedWallbox && (
              <Card>
                <CardHeader>
                  <CardTitle>3. Arbeitskosten & Anfahrt</CardTitle>
                  <p className="text-sm text-muted-foreground">Anpassung der Arbeitszeiten und Anfahrtskosten.</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Current Hours Summary */}
                    <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{calculateTotalHours().meister}h</div>
                        <div className="text-sm text-muted-foreground">Meister (85€/h)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{calculateTotalHours().geselle}h</div>
                        <div className="text-sm text-muted-foreground">Geselle (65€/h)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{calculateTotalHours().monteur}h</div>
                        <div className="text-sm text-muted-foreground">Monteur (45€/h)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{calculateTotalHours().total}h</div>
                        <div className="text-sm text-muted-foreground">Gesamt</div>
                      </div>
                    </div>

                    {/* Travel Costs */}
                    <div className="space-y-2">
                      <Label htmlFor="travelCosts">Anfahrtskosten</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="travelCosts"
                          type="number"
                          min="0"
                          step="1"
                          value={config.travelCosts}
                          onChange={(e) => setConfig(prev => ({ ...prev, travelCosts: parseFloat(e.target.value) || 0 }))}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">€</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </div>
  );
};