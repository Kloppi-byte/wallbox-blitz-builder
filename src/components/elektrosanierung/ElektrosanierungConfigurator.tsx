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
import { Building, Users, Home, Calendar, Plus, Minus, Euro, Clock, Info, X, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Types
interface ProjectParameters {
  etagen: number;
  zimmer: number;
  wohnflaeche: number;
  baujahr: number;
  unterputz: boolean;
  bewohnt: boolean;
}

interface Product {
  artikelnummer: number;
  name: string;
  verkaufspreis: number;
  kategorie: string;
  ueberkategorie: string;
  ueberueberkategorie: string[];
  stunden_meister: number;
  stunden_geselle: number;
  stunden_monteur: number;
  "anzahl_einheit"?: number;
  faktor_zimmer?: number;
  faktor_etage?: number;
  faktor_wohnflaeche?: number;
  faktor_baujahr?: number;
  faktor_unterputz?: number;
  preselect?: boolean;
  required?: number[];
  optional?: number[];
  exclude?: number[];
  auto_select?: number[];
}

interface ProductEntry {
  id: string;
  product: Product;
  quantity: number;
  isManuallyEdited: boolean;
  defaultQuantity: number;
}

interface CategoryGroup {
  name: string;
  ueberkategorie: string;
  baseProduct?: Product;
  productOptions: Product[];
  productEntries: ProductEntry[];
}

interface ConfiguratorState {
  parameters: ProjectParameters;
  categories: CategoryGroup[];
  costs: {
    material: number;
    meister: number;
    geselle: number;
    monteur: number;
    travel: number;
    total: number;
  };
}

export const ElektrosanierungConfigurator = () => {
  const [state, setState] = useState<ConfiguratorState>({
    parameters: {
      etagen: 1,
      zimmer: 4,
      wohnflaeche: 80,
      baujahr: 1975,
      unterputz: true,
      bewohnt: false
    },
    categories: [], // Start with empty categories
    costs: { material: 0, meister: 0, geselle: 0, monteur: 0, travel: 0, total: 0 }
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempInputs, setTempInputs] = useState<Record<string, string>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const { toast } = useToast();
  const { addItem } = useCart();

  // Fetch products from database
  useEffect(() => {
    fetchProducts();
  }, []);

  // Calculate costs when parameters or selections change
  useEffect(() => {
    if (products.length > 0) {
      calculateCosts();
      // Extract available categories from products
      const categories = [...new Set(products
        .filter(p => !p.kategorie.includes('Produkt') && p.kategorie.trim() === '')
        .map(p => p.ueberkategorie)
        .filter(Boolean)
      )];
      setAvailableCategories(categories);
    }
  }, [products, state.parameters, state.categories]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wallboxen')
        .select(`
          Artikelnummer,
          Name, 
          Verkaufspreis,
          Kategorie,
          "Überkategorie",
          "Überüberkategorie",
          "Anzahl Einheit",
          stunden_meister,
          stunden_geselle, 
          stunden_monteur,
          "Faktor Zimmer",
          "Faktor Etage",
          "Faktor Wohnfläche",
          "Faktor Baujahr < 1990",
          "Faktor Unterputz==true",
          preselect,
          required,
          optional,
          exclude,
          auto_select
        `)
        .contains('Überüberkategorie', ['Elektrosanierung']);

      if (error) throw error;

      const mappedProducts: Product[] = (data || []).map((item: any) => ({
        artikelnummer: Number(item.Artikelnummer),
        name: item.Name || `Artikel ${item.Artikelnummer}`,
        verkaufspreis: parseFloat(String(item.Verkaufspreis || 0).replace(',', '.')) || 0,
        kategorie: item.Kategorie || '',
        ueberkategorie: item.Überkategorie || '',
        ueberueberkategorie: item.Überüberkategorie || [],
        "anzahl_einheit": parseFloat(item["Anzahl Einheit"] || 0),
        stunden_meister: parseFloat(item.stunden_meister || 0),
        stunden_geselle: parseFloat(item.stunden_geselle || 0),
        stunden_monteur: parseFloat(item.stunden_monteur || 0),
        faktor_zimmer: parseFloat(item["Faktor Zimmer"] || 0),
        faktor_etage: parseFloat(item["Faktor Etage"] || 0),
        faktor_wohnflaeche: parseFloat(item["Faktor Wohnfläche"] || 0),
        faktor_baujahr: parseFloat(item["Faktor Baujahr < 1990"] || 0),
        faktor_unterputz: parseFloat(item["Faktor Unterputz==true"] || 0),
        preselect: item.preselect || false,
        required: item.required || [],
        optional: item.optional || [],
        exclude: item.exclude || [],
        auto_select: item.auto_select || []
      }));

      setProducts(mappedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Fehler beim Laden",
        description: "Produkte konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateQuantity = (product: Product, parameters: ProjectParameters): number => {
    // Use "Anzahl Einheit" as base quantity, or 0 if not specified
    let quantity = product["anzahl_einheit"] || 0;

    // Apply factorization
    if (product.faktor_zimmer) {
      quantity += product.faktor_zimmer * parameters.zimmer;
    }
    if (product.faktor_etage) {
      quantity += product.faktor_etage * parameters.etagen;
    }
    if (product.faktor_wohnflaeche) {
      quantity += product.faktor_wohnflaeche * parameters.wohnflaeche;
    }
    if (product.faktor_baujahr && parameters.baujahr < 1990) {
      quantity += product.faktor_baujahr;
    }
    if (product.faktor_unterputz && parameters.unterputz) {
      quantity *= product.faktor_unterputz;
    }

    return Math.ceil(Math.max(0, quantity));
  };

  const calculateCosts = () => {
    let materialCosts = 0;
    let meisterHours = 0;
    let geselleHours = 0;
    let monteurHours = 0;

    state.categories.forEach(category => {
      category.productEntries.forEach(entry => {
        if (entry.quantity > 0) {
          materialCosts += entry.product.verkaufspreis * entry.quantity;
          meisterHours += entry.product.stunden_meister * entry.quantity;
          geselleHours += entry.product.stunden_geselle * entry.quantity;
          monteurHours += entry.product.stunden_monteur * entry.quantity;
        }
      });
    });

    // Apply labor adjustments
    const laborAdjustment = (state.parameters.bewohnt ? 1.15 : 1) * (state.parameters.baujahr < 1960 ? 1.2 : 1);
    meisterHours *= laborAdjustment;
    geselleHours *= laborAdjustment;
    monteurHours *= laborAdjustment;

    const laborCosts = meisterHours * 95 + geselleHours * 85 + monteurHours * 65;

    setState(prev => ({
      ...prev,
      costs: {
        material: materialCosts,
        meister: meisterHours * 95,
        geselle: geselleHours * 85,
        monteur: monteurHours * 65,
        travel: prev.costs.travel,
        total: materialCosts + laborCosts + prev.costs.travel
      }
    }));
  };

  const addCategory = (ueberkategorie: string) => {
    // Find base product for this category
    const baseProduct = products.find(p => 
      p.ueberkategorie === ueberkategorie && 
      !p.kategorie.includes('Produkt') && 
      p.kategorie.trim() === ''
    );

    if (!baseProduct) return;

    const defaultQuantity = calculateQuantity(baseProduct, state.parameters);
    
    // Find product variants
    const productOptions = products.filter(p => 
      p.ueberkategorie === ueberkategorie && 
      p.kategorie.includes('Produkt')
    );

    // Find preselected or cheapest product
    let selectedProduct = productOptions.find(p => p.preselect);
    if (!selectedProduct && productOptions.length > 0) {
      selectedProduct = productOptions.reduce((min, current) => 
        current.verkaufspreis < min.verkaufspreis ? current : min
      );
    }

    // Create initial product entry if a product is available
    const productEntries: ProductEntry[] = selectedProduct ? [{
      id: `${ueberkategorie}-${Date.now()}`,
      product: selectedProduct,
      quantity: defaultQuantity,
      isManuallyEdited: false,
      defaultQuantity
    }] : [];

    const newCategory: CategoryGroup = {
      name: baseProduct.name,
      ueberkategorie,
      baseProduct,
      productOptions,
      productEntries
    };

    setState(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory]
    }));
  };

  const removeCategory = (ueberkategorie: string) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.ueberkategorie !== ueberkategorie)
    }));
  };

  const updateParameters = (updates: Partial<ProjectParameters>) => {
    setState(prev => ({
      ...prev,
      parameters: { ...prev.parameters, ...updates }
    }));
  };

  const addProductToCategory = (ueberkategorie: string) => {
    const category = state.categories.find(cat => cat.ueberkategorie === ueberkategorie);
    if (!category || !category.baseProduct) return;

    // Find cheapest available product as default
    const defaultProduct = category.productOptions.length > 0 
      ? category.productOptions.reduce((min, current) => 
          current.verkaufspreis < min.verkaufspreis ? current : min
        )
      : null;

    if (!defaultProduct) return;

    const defaultQuantity = calculateQuantity(category.baseProduct, state.parameters);

    const newEntry: ProductEntry = {
      id: `${ueberkategorie}-${Date.now()}`,
      product: defaultProduct,
      quantity: defaultQuantity,
      isManuallyEdited: false,
      defaultQuantity
    };

    setState(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.ueberkategorie === ueberkategorie
          ? { ...cat, productEntries: [...cat.productEntries, newEntry] }
          : cat
      )
    }));
  };

  const removeProductFromCategory = (entryId: string) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(cat => ({
        ...cat,
        productEntries: cat.productEntries.filter(entry => entry.id !== entryId)
      }))
    }));
  };

  const updateProductEntry = (entryId: string, updates: Partial<ProductEntry>) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(cat => ({
        ...cat,
        productEntries: cat.productEntries.map(entry =>
          entry.id === entryId ? { ...entry, ...updates } : entry
        )
      }))
    }));
  };

  const updateProductEntryQuantity = (entryId: string, quantity: number) => {
    updateProductEntry(entryId, { quantity, isManuallyEdited: true });
  };

  const updateProductEntryProduct = (entryId: string, produktNummer: number) => {
    const selectedProduct = products.find(p => p.artikelnummer === produktNummer);
    if (!selectedProduct) return;
    updateProductEntry(entryId, { product: selectedProduct });
  };

  const updateTravelCosts = (amount: number) => {
    setState(prev => ({
      ...prev,
      costs: {
        ...prev.costs,
        travel: amount,
        total: prev.costs.material + prev.costs.meister + prev.costs.geselle + prev.costs.monteur + amount
      }
    }));
  };

  const handleInputChange = (key: string, value: string) => {
    setTempInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleInputBlur = (key: keyof ProjectParameters, value: string) => {
    const numValue = parseInt(value) || 0;
    updateParameters({ [key]: numValue });
    setTempInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[key];
      return newInputs;
    });
  };

  const addToCart = () => {
    const hasProducts = state.categories.some(cat => 
      cat.productEntries.some(entry => entry.quantity > 0)
    );
    
    if (!hasProducts) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens ein Produkt aus.",
        variant: "destructive"
      });
      return;
    }

    addItem({
      productType: 'elektrosanierung',
      name: 'Elektrosanierung Konfiguration',
      configuration: {
        parameters: state.parameters,
        categories: state.categories.filter(cat => 
          cat.productEntries.some(entry => entry.quantity > 0)
        ),
        costs: state.costs
      },
      pricing: {
        materialCosts: state.costs.material,
        laborCosts: state.costs.meister + state.costs.geselle + state.costs.monteur,
        travelCosts: state.costs.travel,
        subtotal: state.costs.total,
        subsidy: 0,
        total: state.costs.total
      }
    });

    toast({
      title: "Erfolgreich hinzugefügt",
      description: "Konfiguration wurde zum Warenkorb hinzugefügt."
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Produkte werden geladen...</p>
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
            <CartIcon onClick={() => setIsCartOpen(true)} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Parameters */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Projekt-Parameter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="etagen">Etagen</Label>
                  <Input
                    id="etagen"
                    type="number"
                    min="1"
                    value={tempInputs.etagen ?? state.parameters.etagen}
                    onChange={e => handleInputChange('etagen', e.target.value)}
                    onBlur={e => handleInputBlur('etagen', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="zimmer">Zimmer</Label>
                  <Input
                    id="zimmer"
                    type="number"
                    min="1"
                    value={tempInputs.zimmer ?? state.parameters.zimmer}
                    onChange={e => handleInputChange('zimmer', e.target.value)}
                    onBlur={e => handleInputBlur('zimmer', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="wohnflaeche">Wohnfläche (m²)</Label>
                  <Input
                    id="wohnflaeche"
                    type="number"
                    min="1"
                    value={tempInputs.wohnflaeche ?? state.parameters.wohnflaeche}
                    onChange={e => handleInputChange('wohnflaeche', e.target.value)}
                    onBlur={e => handleInputBlur('wohnflaeche', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="baujahr">Baujahr</Label>
                  <Input
                    id="baujahr"
                    type="number"
                    min="1900"
                    max="2024"
                    value={tempInputs.baujahr ?? state.parameters.baujahr}
                    onChange={e => handleInputChange('baujahr', e.target.value)}
                    onBlur={e => handleInputBlur('baujahr', e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unterputz"
                    checked={state.parameters.unterputz}
                    onCheckedChange={checked => updateParameters({ unterputz: !!checked })}
                  />
                  <Label htmlFor="unterputz">Unterputz Installation</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bewohnt"
                    checked={state.parameters.bewohnt}
                    onCheckedChange={checked => updateParameters({ bewohnt: !!checked })}
                  />
                  <Label htmlFor="bewohnt">Wohnung bewohnt (+15% Arbeitszeit)</Label>
                </div>
              </CardContent>
            </Card>

            {/* Cost Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Kostenzusammenfassung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Materialkosten:</span>
                  <span className="font-semibold">{state.costs.material.toLocaleString('de-DE')}€</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Meister:</span>
                  <span>{state.costs.meister.toLocaleString('de-DE')}€</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Geselle:</span>
                  <span>{state.costs.geselle.toLocaleString('de-DE')}€</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Monteur:</span>
                  <span>{state.costs.monteur.toLocaleString('de-DE')}€</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Anfahrtskosten:</span>
                  <span>{state.costs.travel.toLocaleString('de-DE')}€</span>
                </div>

                <Separator />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Gesamtkosten:</span>
                  <span>{state.costs.total.toLocaleString('de-DE')}€</span>
                </div>

                <Button onClick={addToCart} className="w-full mt-4">
                  Zur Anfrage hinzufügen
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Component Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Komponenten-Auswahl</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {state.categories.map(category => (
                    <div key={category.ueberkategorie} className="border rounded-lg p-4 bg-card">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">{category.name}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCategory(category.ueberkategorie)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Product Entries */}
                      <div className="space-y-3">
                        {category.productEntries.map(entry => (
                          <div key={entry.id} className="grid grid-cols-4 gap-4 items-end p-3 bg-muted/30 rounded-md">
                            {/* Quantity Control */}
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Menge</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateProductEntryQuantity(entry.id, Math.max(0, entry.quantity - 1))}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                  type="number"
                                  min="0"
                                  value={entry.quantity}
                                  onChange={e => updateProductEntryQuantity(entry.id, parseInt(e.target.value) || 0)}
                                  className="text-center w-20"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateProductEntryQuantity(entry.id, entry.quantity + 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              {!entry.isManuallyEdited && (
                                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                                  <Info className="h-3 w-3" />
                                  Auto: {entry.defaultQuantity}
                                </div>
                              )}
                            </div>

                            {/* Product Selection */}
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Produktvariante</Label>
                              <Select
                                value={entry.product.artikelnummer.toString()}
                                onValueChange={value => updateProductEntryProduct(entry.id, parseInt(value))}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {category.productOptions.map(product => (
                                    <SelectItem key={product.artikelnummer} value={product.artikelnummer.toString()}>
                                      {product.name} - {product.verkaufspreis.toLocaleString('de-DE')}€
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Cost Information */}
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Kosten</Label>
                              <div className="mt-1">
                                <div className="text-sm font-medium">
                                  Material: {(entry.product.verkaufspreis * entry.quantity).toLocaleString('de-DE')}€
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Arbeitszeit: {((entry.product.stunden_meister + entry.product.stunden_geselle + entry.product.stunden_monteur) * entry.quantity).toFixed(1)}h
                                </div>
                              </div>
                            </div>

                            {/* Remove Product Button */}
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProductFromCategory(entry.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Add Product Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addProductToCategory(category.ueberkategorie)}
                          className="w-full border-dashed"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Produkt hinzufügen
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add Category Button */}
                  <div className="border-2 border-dashed border-muted rounded-lg p-6">
                    <Select onValueChange={addCategory}>
                      <SelectTrigger className="w-full">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          <SelectValue placeholder="Leistung hinzufügen" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories
                          .filter(cat => !state.categories.some(existing => existing.ueberkategorie === cat))
                          .map(category => (
                            <SelectItem key={category} value={category}>
                              {products.find(p => p.ueberkategorie === category && !p.kategorie.includes('Produkt'))?.name || category}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hours Summary and Travel Costs */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Stunden-Aufstellung & Anfahrtskosten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hours Breakdown */}
                <div className="space-y-2">
                  <h3 className="font-medium">Arbeitszeiten (Summe aller Positionen)</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-muted/30 p-3 rounded-md">
                      <div className="font-medium text-center">Meister</div>
                      <div className="text-lg font-bold text-center mt-1">
                        {state.categories.reduce((total, cat) => 
                          total + cat.productEntries.reduce((entryTotal, entry) => 
                            entryTotal + (entry.product.stunden_meister * entry.quantity), 0), 0
                        ).toFixed(1)}h
                      </div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-md">
                      <div className="font-medium text-center">Geselle</div>
                      <div className="text-lg font-bold text-center mt-1">
                        {state.categories.reduce((total, cat) => 
                          total + cat.productEntries.reduce((entryTotal, entry) => 
                            entryTotal + (entry.product.stunden_geselle * entry.quantity), 0), 0
                        ).toFixed(1)}h
                      </div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-md">
                      <div className="font-medium text-center">Monteur</div>
                      <div className="text-lg font-bold text-center mt-1">
                        {state.categories.reduce((total, cat) => 
                          total + cat.productEntries.reduce((entryTotal, entry) => 
                            entryTotal + (entry.product.stunden_monteur * entry.quantity), 0), 0
                        ).toFixed(1)}h
                      </div>
                    </div>
                  </div>
                </div>

                {/* Travel Costs */}
                <div className="space-y-2">
                  <Label htmlFor="anfahrtskosten">Anfahrtskosten (€)</Label>
                  <Input
                    id="anfahrtskosten"
                    type="number"
                    min="0"
                    step="0.01"
                    value={state.costs.travel}
                    onChange={e => updateTravelCosts(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="max-w-40"
                  />
                </div>
               </CardContent>
             </Card>
           </div>
          </div>
        </div>
      </div>
    );
  };

  export default ElektrosanierungConfigurator;