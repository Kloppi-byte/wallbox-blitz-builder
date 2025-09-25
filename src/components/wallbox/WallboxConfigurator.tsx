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
import { Zap, Euro } from 'lucide-react';

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
  selectedProducts: SelectedProduct[];
  customerData: {
    name?: string;
    email?: string;
    address?: string;
    plz?: string;
  };
  features: string[];
  installation: string;
  foerderung: boolean;
}

export function WallboxConfigurator() {
  const [allProducts, setAllProducts] = useState<WallboxProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const { addItem } = useCart();

  const [config, setConfig] = useState<ConfigState>({
    selectedWallbox: null,
    selectedProducts: [],
    customerData: {},
    features: [],
    installation: '',
    foerderung: false
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

    setConfig(prev => ({
      ...prev,
      selectedWallbox: selectedProduct,
      selectedProducts: [] // Reset products when wallbox changes
    }));

    // Auto-add required products
    const wallbox = allProducts.find(p => p.artikelnummer === product.artikelnummer);
    if (wallbox?.required) {
      const requiredProducts = allProducts.filter(p => wallbox.required?.includes(p.artikelnummer.toString()));
      const newProducts = requiredProducts.map(p => ({
        artikelnummer: p.artikelnummer,
        name: p.name,
        price: parseFloat(p.verkaufspreis) || 0,
        kategorie: p.kategorie,
        beschreibung: p.beschreibung,
        isRequired: true,
        quantity: p.anzahl_einheit || 1,
        einheit: p.einheit
      }));

      setConfig(prev => ({
        ...prev,
        selectedProducts: newProducts
      }));
    }
  };

  const toggleOptionalProduct = (product: SelectedProduct, add: boolean) => {
    setConfig(prev => ({
      ...prev,
      selectedProducts: add 
        ? [...prev.selectedProducts.filter(p => p.artikelnummer !== product.artikelnummer), product]
        : prev.selectedProducts.filter(p => p.artikelnummer !== product.artikelnummer)
    }));
  };

  const updateProductQuantity = (artikelnummer: number, quantity: number) => {
    setConfig(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.map(p => 
        p.artikelnummer === artikelnummer ? { ...p, quantity } : p
      )
    }));
  };

  const calculateTotal = () => {
    const wallboxPrice = config.selectedWallbox?.price || 0;
    const productsPrice = config.selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    return wallboxPrice + productsPrice;
  };

  const addToCart = () => {
    if (!config.selectedWallbox) return;

    const cartItems = [
      {
        productType: 'wallbox' as const,
        name: config.selectedWallbox.name,
        configuration: {
          wallbox: config.selectedWallbox,
          selectedProducts: config.selectedProducts,
          features: config.features,
          installation: config.installation,
          foerderung: config.foerderung
        },
        pricing: {
          materialCosts: calculateTotal(),
          laborCosts: 0,
          travelCosts: 0,
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
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="font-medium text-primary">Wallbox</div>
                      <div className="text-sm">{config.selectedWallbox.name}</div>
                      <div className="text-right font-bold">
                        {config.selectedWallbox.price.toFixed(2)}€
                      </div>
                    </div>

                    {config.selectedProducts.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="font-medium text-sm">Komponenten</div>
                          {config.selectedProducts.map((product) => (
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

                    <Separator />
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Gesamt:</span>
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
                      <CardTitle>Benötigte Komponenten</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {getRequiredProducts().map((product) => {
                          const selectedProduct = config.selectedProducts.find(
                            p => p.artikelnummer === product.artikelnummer
                          );
                          const quantity = selectedProduct?.quantity || product.anzahl_einheit || 1;

                          return (
                            <div key={product.artikelnummer} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{product.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    ({quantity} {product.einheit})
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{product.beschreibung}</p>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {parseFloat(product.verkaufspreis).toFixed(2)}€/{product.einheit}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Optional Components */}
                {getOptionalProducts().length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Optionale Komponenten</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(
                        getOptionalProducts().reduce((acc, product) => {
                          if (!acc[product.kategorie]) acc[product.kategorie] = [];
                          acc[product.kategorie].push(product);
                          return acc;
                        }, {} as {[key: string]: WallboxProduct[]})
                      ).map(([kategorie, products]) => {
                        const selectedProduct = config.selectedProducts.find(
                          p => p.kategorie === kategorie && !p.isRequired
                        );

                        // Check for auto-selected product
                        const wallbox = allProducts.find(p => p.artikelnummer === config.selectedWallbox?.artikelnummer);
                        const autoSelectedProduct = wallbox?.auto_select ? 
                          products.find(p => wallbox.auto_select?.includes(p.artikelnummer.toString())) : null;

                        const currentProduct = selectedProduct || autoSelectedProduct;

                        return (
                          <div key={`optional-${kategorie}`} className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Product Selection */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                  {kategorie} (Optional)
                                </Label>
                                
                                <Select
                                  value={currentProduct?.artikelnummer.toString() || "none"}
                                  onValueChange={(value) => {
                                    if (value === "none") {
                                      if (selectedProduct) {
                                        toggleOptionalProduct(selectedProduct, false);
                                      }
                                    } else {
                                      if (selectedProduct) {
                                        toggleOptionalProduct(selectedProduct, false);
                                      }
                                      
                                      const product = products.find(p => p.artikelnummer.toString() === value);
                                      if (product) {
                                        const productToAdd: SelectedProduct = {
                                          artikelnummer: product.artikelnummer,
                                          name: product.name,
                                          price: parseFloat(product.verkaufspreis) || 0,
                                          kategorie: product.kategorie,
                                          beschreibung: product.beschreibung,
                                          quantity: product.anzahl_einheit || 1,
                                          einheit: product.einheit
                                        };
                                        toggleOptionalProduct(productToAdd, true);
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder={`${kategorie} auswählen`}>
                                      {currentProduct ? (
                                        <div className="flex justify-between items-center w-full">
                                          <span className="text-left">{currentProduct.name}</span>
                                          <span className="text-right text-sm font-medium ml-2">
                                            {parseFloat((currentProduct as any).price || (currentProduct as any).verkaufspreis).toFixed(2)}€/{currentProduct.einheit}
                                          </span>
                                        </div>
                                      ) : `${kategorie} auswählen`}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-lg z-50">
                                    <SelectItem value="none">
                                      <span className="text-muted-foreground">Keine Auswahl</span>
                                    </SelectItem>
                                    {products.map((product) => (
                                      <SelectItem 
                                        key={product.artikelnummer} 
                                        value={product.artikelnummer.toString()}
                                      >
                                        <div className="flex justify-between items-center w-full">
                                          <span>{product.name}</span>
                                          <span className="ml-auto font-medium text-sm">
                                            {parseFloat(product.verkaufspreis).toFixed(2)}€/{product.einheit}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Quantity Control */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Anzahl</Label>
                                {currentProduct && (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="1"
                                      step={kategorie.toLowerCase().includes('kabel') ? "0.5" : "1"}
                                      value={selectedProduct ? selectedProduct.quantity : (autoSelectedProduct?.anzahl_einheit || 1)}
                                      onChange={(e) => {
                                        const newQuantity = parseFloat(e.target.value) || 1;
                                        
                                        if (!selectedProduct && autoSelectedProduct) {
                                          // Convert auto-selected to selected product first
                                          const productToAdd: SelectedProduct = {
                                            artikelnummer: autoSelectedProduct.artikelnummer,
                                            name: autoSelectedProduct.name,
                                            price: parseFloat(autoSelectedProduct.verkaufspreis) || 0,
                                            kategorie: autoSelectedProduct.kategorie,
                                            beschreibung: autoSelectedProduct.beschreibung,
                                            quantity: newQuantity,
                                            einheit: autoSelectedProduct.einheit
                                          };
                                          toggleOptionalProduct(productToAdd, true);
                                        } else if (selectedProduct) {
                                          updateProductQuantity(selectedProduct.artikelnummer, newQuantity);
                                        }
                                      }}
                                      className="flex-1"
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                                      {currentProduct.einheit}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
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