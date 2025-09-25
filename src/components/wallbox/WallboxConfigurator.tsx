import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
import { CartSheet } from '@/components/cart/CartSheet';
import { Zap, Euro, Plus, Clock } from 'lucide-react';

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
}

interface ConfigState {
  selectedWallbox: SelectedProduct | null;
  requiredProducts: SelectedProduct[];
  optionalProducts: SelectedProduct[];
  meisterStunden: number;
  gesellenStunden: number;
  meisterStundensatz: number;
  gesellenStundensatz: number;
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
    meisterStundensatz: 65,
    gesellenStundensatz: 45,
    anfahrtZone: '',
    anfahrtKosten: 0
  });

  const [showAdditionalProducts, setShowAdditionalProducts] = useState<{[key: string]: boolean}>({});

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
        kategorie: item['Typ'] || '',
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
        typ: item['Typ'] || ''
      }));

      setAllProducts(products);
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
      einheit: product.einheit
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
        einheit: p.einheit
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
        einheit: p.einheit
      }));
    }

    // Set labor hours from wallbox data
    const meisterStunden = parseFloat(wallbox?.stunden_meister || '0');
    const gesellenStunden = parseFloat(wallbox?.stunden_geselle || '0');

    setConfig(prev => ({
      ...prev,
      selectedWallbox: selectedProduct,
      requiredProducts,
      optionalProducts,
      meisterStunden,
      gesellenStunden
    }));

    // Reset additional product visibility
    setShowAdditionalProducts({});
  };

  const selectOptionalProduct = (kategorie: string, product: WallboxProduct | null) => {
    setConfig(prev => {
      const newOptionalProducts = prev.optionalProducts.filter(p => p.kategorie !== kategorie);
      
      if (product) {
        const selectedProduct: SelectedProduct = {
          artikelnummer: product.artikelnummer,
          name: product.name,
          price: parseFloat(product.verkaufspreis) || 0,
          kategorie: product.kategorie,
          beschreibung: product.beschreibung,
          quantity: product.anzahl_einheit || 1,
          einheit: product.einheit
        };
        newOptionalProducts.push(selectedProduct);
      }

      return {
        ...prev,
        optionalProducts: newOptionalProducts
      };
    });
  };

  const updateProductQuantity = (type: 'required' | 'optional', artikelnummer: number, quantity: number) => {
    setConfig(prev => ({
      ...prev,
      [type === 'required' ? 'requiredProducts' : 'optionalProducts']: prev[type === 'required' ? 'requiredProducts' : 'optionalProducts'].map(p => 
        p.artikelnummer === artikelnummer ? { ...p, quantity } : p
      )
    }));
  };

  const updateLaborHours = (type: 'meister' | 'geselle', hours: number) => {
    setConfig(prev => ({
      ...prev,
      [type === 'meister' ? 'meisterStunden' : 'gesellenStunden']: hours
    }));
  };

  const calculateMaterialCosts = () => {
    const wallboxPrice = config.selectedWallbox?.price || 0;
    const requiredPrice = config.requiredProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const optionalPrice = config.optionalProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    return wallboxPrice + requiredPrice + optionalPrice;
  };

  const calculateLaborCosts = () => {
    return (config.meisterStunden * config.meisterStundensatz) + (config.gesellenStunden * config.gesellenStundensatz);
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
          meisterStunden: config.meisterStunden,
          gesellenStunden: config.gesellenStunden
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
                                  {product.quantity} {product.einheit}
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
                              <div className="text-sm">
                                <div>{product.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {product.quantity} {product.einheit}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getWallboxes().map((wallbox) => (
                    <Card 
                      key={wallbox.artikelnummer}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        config.selectedWallbox?.artikelnummer === wallbox.artikelnummer 
                          ? 'ring-2 ring-primary' 
                          : ''
                      }`}
                      onClick={() => selectWallbox(wallbox)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{wallbox.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">{wallbox.beschreibung}</p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-lg">
                            {parseFloat(wallbox.verkaufspreis).toFixed(2)}€
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {wallbox.anzahl_einheit} {wallbox.einheit}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {config.selectedWallbox && (
              <>
                {/* Required Components */}
                {getRequiredProducts().length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-primary">Benötigte Komponenten</CardTitle>
                      <p className="text-sm text-muted-foreground">Diese Komponenten werden automatisch zur Wallbox hinzugefügt.</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {getRequiredProducts().map((product) => {
                          const selectedProduct = config.requiredProducts.find(
                            p => p.artikelnummer === product.artikelnummer
                          );
                          const quantity = selectedProduct?.quantity || product.anzahl_einheit || 1;

                          return (
                            <div key={product.artikelnummer} className="flex justify-between items-center p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{product.name}</span>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => updateProductQuantity('required', product.artikelnummer, parseInt(e.target.value) || 1)}
                                    className="w-16 h-8"
                                  />
                                  <span className="text-sm text-muted-foreground">{product.einheit}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{product.beschreibung}</p>
                              </div>
                              <div className="text-right ml-4">
                                <div className="font-medium">
                                  {parseFloat(product.verkaufspreis).toFixed(2)}€/{product.einheit}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  = {(parseFloat(product.verkaufspreis) * quantity).toFixed(2)}€
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Optional Components by Category */}
                {getAvailableKategorien().length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-600">Optionale Komponenten</CardTitle>
                      <p className="text-sm text-muted-foreground">Wählen Sie zusätzliche Komponenten aus jeder Kategorie.</p>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue={getAvailableKategorien()[0]} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          {getAvailableKategorien().map((kategorie) => (
                            <TabsTrigger key={kategorie} value={kategorie}>
                              {kategorie}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        
                        {getAvailableKategorien().map((kategorie) => {
                          const products = getProductsByKategorie(kategorie);
                          const selectedProduct = config.optionalProducts.find(p => p.kategorie === kategorie);
                          const autoSelectedProducts = getAutoSelectProducts();
                          const autoSelectedProduct = autoSelectedProducts.find(p => p.kategorie === kategorie);
                          const currentProduct: SelectedProduct | null = selectedProduct || (autoSelectedProduct ? {
                            artikelnummer: autoSelectedProduct.artikelnummer,
                            name: autoSelectedProduct.name,
                            price: parseFloat(autoSelectedProduct.verkaufspreis) || 0,
                            kategorie: autoSelectedProduct.kategorie,
                            beschreibung: autoSelectedProduct.beschreibung,
                            quantity: autoSelectedProduct.anzahl_einheit || 1,
                            einheit: autoSelectedProduct.einheit,
                            isAutoSelected: true
                          } : null);

                          return (
                            <TabsContent key={kategorie} value={kategorie} className="space-y-4">
                              {/* Current Selection */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Aktuell gewählt:</Label>
                                {currentProduct ? (
                                  <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{currentProduct.name}</span>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={currentProduct.quantity}
                                          onChange={(e) => updateProductQuantity('optional', currentProduct.artikelnummer, parseInt(e.target.value) || 1)}
                                          className="w-16 h-8"
                                        />
                                        <span className="text-sm text-muted-foreground">{currentProduct.einheit}</span>
                                        {autoSelectedProduct && !selectedProduct && (
                                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-gewählt</span>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">{currentProduct.beschreibung}</p>
                                    </div>
                                    <div className="text-right ml-4">
                                      <div className="font-medium">
                                        {currentProduct.price.toFixed(2)}€/{currentProduct.einheit}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        = {(currentProduct.price * currentProduct.quantity).toFixed(2)}€
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => selectOptionalProduct(kategorie, null)}
                                        className="mt-1"
                                      >
                                        Entfernen
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 border border-dashed border-muted rounded-lg text-center text-muted-foreground">
                                    Keine {kategorie} gewählt
                                  </div>
                                )}
                              </div>

                              {/* Additional Products */}
                              {!showAdditionalProducts[kategorie] ? (
                                <Button
                                  variant="outline"
                                  onClick={() => setShowAdditionalProducts(prev => ({ ...prev, [kategorie]: true }))}
                                  className="w-full"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  + Produkt aus {kategorie} hinzufügen
                                </Button>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-sm font-medium">Verfügbare {kategorie}-Produkte:</Label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowAdditionalProducts(prev => ({ ...prev, [kategorie]: false }))}
                                    >
                                      Ausblenden
                                    </Button>
                                  </div>
                                  <div className="grid gap-3">
                                    {products.map((product) => (
                                      <div
                                        key={product.artikelnummer}
                                        className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                          currentProduct?.artikelnummer === product.artikelnummer
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-muted hover:border-primary'
                                        }`}
                                        onClick={() => selectOptionalProduct(kategorie, product)}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="font-medium">{product.name}</div>
                                            <p className="text-sm text-muted-foreground mt-1">{product.beschreibung}</p>
                                          </div>
                                          <div className="text-right ml-4">
                                            <div className="font-medium">
                                              {parseFloat(product.verkaufspreis).toFixed(2)}€/{product.einheit}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </TabsContent>
                          );
                        })}
                      </Tabs>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Meisterstunden (à {config.meisterStundensatz}€)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={config.meisterStunden}
                          onChange={(e) => updateLaborHours('meister', parseFloat(e.target.value) || 0)}
                        />
                        <div className="text-sm text-muted-foreground">
                          = {(config.meisterStunden * config.meisterStundensatz).toFixed(2)}€
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Gesellenstunden (à {config.gesellenStundensatz}€)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={config.gesellenStunden}
                          onChange={(e) => updateLaborHours('geselle', parseFloat(e.target.value) || 0)}
                        />
                        <div className="text-sm text-muted-foreground">
                          = {(config.gesellenStunden * config.gesellenStundensatz).toFixed(2)}€
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex justify-between items-center font-medium">
                      <span>Gesamte Arbeitskosten:</span>
                      <span className="text-lg">{calculateLaborCosts().toFixed(2)}€</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      <CartSheet 
        open={isCartOpen} 
        onOpenChange={() => setIsCartOpen(false)} 
      />
    </div>
  );
}