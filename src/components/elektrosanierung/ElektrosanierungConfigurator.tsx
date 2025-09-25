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
import { Building, Users, Home, Calendar, Plus, Minus, Euro, Clock, Info } from 'lucide-react';
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

interface CategoryGroup {
  name: string;
  ueberkategorie: string;
  baseProduct?: Product;
  productOptions: Product[];
  quantity: number;
  selectedProduct?: Product;
  defaultQuantity: number;
  isManuallyEdited: boolean;
}

interface ConfiguratorState {
  parameters: ProjectParameters;
  categories: CategoryGroup[];
  costs: {
    material: number;
    meister: number;
    geselle: number;
    monteur: number;
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
    categories: [],
    costs: { material: 0, meister: 0, geselle: 0, monteur: 0, total: 0 }
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempInputs, setTempInputs] = useState<Record<string, string>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const { addItem } = useCart();

  // Fetch products from database
  useEffect(() => {
    fetchProducts();
  }, []);

  // Calculate categories and costs when parameters or selections change
  useEffect(() => {
    if (products.length > 0) {
      calculateCategoriesAndCosts();
    }
  }, [products, state.parameters]);

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
    let quantity = 1; // Base quantity

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

  const calculateCategoriesAndCosts = () => {
    // Group products by Überkategorie
    const categoryGroups = new Map<string, CategoryGroup>();

    // Find base products (without "Produkt" suffix in Kategorie)
    const baseProducts = products.filter(p => !p.kategorie.includes('Produkt') && p.kategorie.trim() === '');
    
    // Create category groups from base products
    baseProducts.forEach(baseProduct => {
      if (!baseProduct.ueberkategorie) return;

      const defaultQuantity = calculateQuantity(baseProduct, state.parameters);
      
      // Find product variants (with "Produkt" suffix)
      const productOptions = products.filter(p => 
        p.ueberkategorie === baseProduct.ueberkategorie && 
        p.kategorie.includes('Produkt')
      );

      // Find preselected or cheapest product
      let selectedProduct = productOptions.find(p => p.preselect);
      if (!selectedProduct && productOptions.length > 0) {
        selectedProduct = productOptions.reduce((min, current) => 
          current.verkaufspreis < min.verkaufspreis ? current : min
        );
      }

      // Check if this category was manually edited
      const existingCategory = state.categories.find(c => c.ueberkategorie === baseProduct.ueberkategorie);
      const isManuallyEdited = existingCategory?.isManuallyEdited || false;
      const quantity = isManuallyEdited ? existingCategory.quantity : defaultQuantity;

      categoryGroups.set(baseProduct.ueberkategorie, {
        name: baseProduct.name,
        ueberkategorie: baseProduct.ueberkategorie,
        baseProduct,
        productOptions,
        quantity,
        selectedProduct: existingCategory?.selectedProduct || selectedProduct,
        defaultQuantity,
        isManuallyEdited
      });
    });

    // Calculate costs
    let materialCosts = 0;
    let meisterHours = 0;
    let geselleHours = 0;
    let monteurHours = 0;

    Array.from(categoryGroups.values()).forEach(category => {
      if (category.selectedProduct && category.quantity > 0) {
        materialCosts += category.selectedProduct.verkaufspreis * category.quantity;
        meisterHours += category.selectedProduct.stunden_meister * category.quantity;
        geselleHours += category.selectedProduct.stunden_geselle * category.quantity;
        monteurHours += category.selectedProduct.stunden_monteur * category.quantity;
      }
    });

    // Apply labor adjustments
    const laborAdjustment = (state.parameters.bewohnt ? 1.15 : 1) * (state.parameters.baujahr < 1960 ? 1.2 : 1);
    meisterHours *= laborAdjustment;
    geselleHours *= laborAdjustment;
    monteurHours *= laborAdjustment;

    const laborCosts = meisterHours * 95 + geselleHours * 85 + monteurHours * 65;

    setState(prev => ({
      ...prev,
      categories: Array.from(categoryGroups.values()),
      costs: {
        material: materialCosts,
        meister: meisterHours * 95,
        geselle: geselleHours * 85,
        monteur: monteurHours * 65,
        total: materialCosts + laborCosts
      }
    }));
  };

  const updateParameters = (updates: Partial<ProjectParameters>) => {
    setState(prev => ({
      ...prev,
      parameters: { ...prev.parameters, ...updates }
    }));
  };

  const updateCategoryQuantity = (ueberkategorie: string, quantity: number) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.ueberkategorie === ueberkategorie
          ? { ...cat, quantity, isManuallyEdited: true }
          : cat
      )
    }));
  };

  const updateCategoryProduct = (ueberkategorie: string, produktNummer: number) => {
    const selectedProduct = products.find(p => p.artikelnummer === produktNummer);
    if (!selectedProduct) return;

    setState(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.ueberkategorie === ueberkategorie
          ? { ...cat, selectedProduct }
          : cat
      )
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
    const selectedCategories = state.categories.filter(cat => cat.quantity > 0 && cat.selectedProduct);
    
    if (selectedCategories.length === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens eine Komponente aus.",
        variant: "destructive"
      });
      return;
    }

    addItem({
      productType: 'elektrosanierung',
      name: 'Elektrosanierung Konfiguration',
      configuration: {
        parameters: state.parameters,
        categories: selectedCategories,
        costs: state.costs
      },
      pricing: {
        materialCosts: state.costs.material,
        laborCosts: state.costs.meister + state.costs.geselle + state.costs.monteur,
        travelCosts: 0,
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
                <div className="space-y-6">
                  {state.categories.map(category => (
                    <div key={category.ueberkategorie} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">{category.name}</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        {/* Quantity Control */}
                        <div>
                          <Label>Menge</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCategoryQuantity(category.ueberkategorie, Math.max(0, category.quantity - 1))}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              value={category.quantity}
                              onChange={e => updateCategoryQuantity(category.ueberkategorie, parseInt(e.target.value) || 0)}
                              className="text-center"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCategoryQuantity(category.ueberkategorie, category.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Product Selection */}
                        <div>
                          <Label>Produktvariante</Label>
                          <Select
                            value={category.selectedProduct?.artikelnummer.toString() || ''}
                            onValueChange={value => updateCategoryProduct(category.ueberkategorie, parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Produkt wählen" />
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
                          <Label>Kosten</Label>
                          <div className="text-sm">
                            {category.selectedProduct && category.quantity > 0 ? (
                              <div>
                                <div>Material: {(category.selectedProduct.verkaufspreis * category.quantity).toLocaleString('de-DE')}€</div>
                                <div className="text-muted-foreground">
                                  Arbeitszeit: {((category.selectedProduct.stunden_meister + category.selectedProduct.stunden_geselle + category.selectedProduct.stunden_monteur) * category.quantity).toFixed(1)}h
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!category.isManuallyEdited && (
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Automatisch berechnet ({category.defaultQuantity} Stück)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};