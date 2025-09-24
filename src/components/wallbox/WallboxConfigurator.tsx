import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
import { CartSheet } from '@/components/cart/CartSheet';
import { Minus, Plus, Zap, Download, Euro } from 'lucide-react';

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
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">Wallbox Konfigurator</CardTitle>
            <CartIcon onClick={() => setIsCartOpen(true)} />
          </div>
        </CardHeader>
      </Card>

      {/* Wallbox Selection */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Wallbox auswählen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Benötigte Komponenten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getRequiredProducts().map((product) => (
                  <div key={product.artikelnummer} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <span className="font-medium">{product.name}</span>
                      <p className="text-sm text-muted-foreground">{product.beschreibung}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {parseFloat(product.verkaufspreis).toFixed(2)}€
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {product.anzahl_einheit} {product.einheit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Optional Components */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Optionale Komponenten</CardTitle>
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

                 // Check if there's an auto-selected product for this category
                 const wallbox = allProducts.find(p => p.artikelnummer === config.selectedWallbox?.artikelnummer);
                 const autoSelectedProduct = wallbox?.auto_select ? 
                   products.find(p => wallbox.auto_select?.includes(p.artikelnummer.toString())) : null;

                return (
                  <div key={`optional-${kategorie}`} className="space-y-3">
                    <Label className="text-sm font-medium">
                      {kategorie} (Optional)
                    </Label>
                    
                    <Select
                      value={selectedProduct?.artikelnummer.toString() || autoSelectedProduct?.artikelnummer.toString() || "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          // Remove current selection
                          if (selectedProduct) {
                            toggleOptionalProduct(selectedProduct, false);
                          }
                        } else {
                          // Remove current selection and add new one
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
                      <SelectTrigger className="w-full h-12">
                        <SelectValue placeholder={`${kategorie} auswählen`}>
                          {(() => {
                            const displayProduct = selectedProduct || autoSelectedProduct;
                            if (displayProduct) {
                              return (
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-left">{displayProduct.name}</span>
                                  <span className="text-right font-medium">
                                    {parseFloat((displayProduct as any).price || (displayProduct as any).verkaufspreis).toFixed(2)}€/{displayProduct.einheit || 'Stück'}
                                  </span>
                                </div>
                              );
                            }
                            return `${kategorie} auswählen`;
                          })()}
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
                               <span className="ml-auto font-medium">
                                 {parseFloat(product.verkaufspreis).toFixed(2)}€/{product.einheit || 'Stück'}
                               </span>
                             </div>
                           </SelectItem>
                         ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Quantity control - always show when product is selected or auto-selected */}
                    {(selectedProduct || autoSelectedProduct) && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Anzahl:</span>
                        <div className="flex items-center gap-2">
                          {kategorie.toLowerCase().includes('kabel') ? (
                            // Editable field for cable length
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                step="0.5"
                                value={selectedProduct ? selectedProduct.quantity : (autoSelectedProduct?.anzahl_einheit || 1)}
                                onChange={(e) => {
                                  const currentProduct = selectedProduct || autoSelectedProduct;
                                  if (currentProduct) {
                                    if (!selectedProduct && autoSelectedProduct) {
                                      // Convert auto-selected to selected product first
                                      const productToAdd: SelectedProduct = {
                                        artikelnummer: autoSelectedProduct.artikelnummer,
                                        name: autoSelectedProduct.name,
                                        price: parseFloat(autoSelectedProduct.verkaufspreis) || 0,
                                        kategorie: autoSelectedProduct.kategorie || kategorie,
                                        beschreibung: autoSelectedProduct.beschreibung,
                                        quantity: parseFloat(e.target.value) || 1,
                                        einheit: autoSelectedProduct.einheit
                                      };
                                      toggleOptionalProduct(productToAdd, true);
                                    } else {
                                      updateProductQuantity(currentProduct.artikelnummer, parseFloat(e.target.value) || 1);
                                    }
                                  }
                                }}
                                className="w-20 h-8 text-sm"
                              />
                              <span className="text-sm text-muted-foreground">
                                {selectedProduct ? selectedProduct.einheit : (autoSelectedProduct?.einheit || 'm')}
                              </span>
                            </div>
                          ) : (
                            // +/- buttons for other items
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentProduct = selectedProduct || autoSelectedProduct;
                                  const currentQuantity = selectedProduct ? selectedProduct.quantity : (autoSelectedProduct?.anzahl_einheit || 1);
                                  if (currentProduct && currentQuantity > 1) {
                                    if (!selectedProduct && autoSelectedProduct) {
                                      // Convert auto-selected to selected product first
                                      const productToAdd: SelectedProduct = {
                                        artikelnummer: autoSelectedProduct.artikelnummer,
                                        name: autoSelectedProduct.name,
                                        price: parseFloat(autoSelectedProduct.verkaufspreis) || 0,
                                        kategorie: autoSelectedProduct.kategorie || kategorie,
                                        beschreibung: autoSelectedProduct.beschreibung,
                                        quantity: currentQuantity - 1,
                                        einheit: autoSelectedProduct.einheit
                                      };
                                      toggleOptionalProduct(productToAdd, true);
                                    } else {
                                      updateProductQuantity(currentProduct.artikelnummer, currentQuantity - 1);
                                    }
                                  }
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm min-w-[2rem] text-center">
                                {selectedProduct ? selectedProduct.quantity : (autoSelectedProduct?.anzahl_einheit || 1)}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentProduct = selectedProduct || autoSelectedProduct;
                                  const currentQuantity = selectedProduct ? selectedProduct.quantity : (autoSelectedProduct?.anzahl_einheit || 1);
                                  if (currentProduct) {
                                    if (!selectedProduct && autoSelectedProduct) {
                                      // Convert auto-selected to selected product first
                                      const productToAdd: SelectedProduct = {
                                        artikelnummer: autoSelectedProduct.artikelnummer,
                                        name: autoSelectedProduct.name,
                                        price: parseFloat(autoSelectedProduct.verkaufspreis) || 0,
                                        kategorie: autoSelectedProduct.kategorie || kategorie,
                                        beschreibung: autoSelectedProduct.beschreibung,
                                        quantity: currentQuantity + 1,
                                        einheit: autoSelectedProduct.einheit
                                      };
                                      toggleOptionalProduct(productToAdd, true);
                                    } else {
                                      updateProductQuantity(currentProduct.artikelnummer, currentQuantity + 1);
                                    }
                                  }
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                {selectedProduct ? selectedProduct.einheit : (autoSelectedProduct?.einheit || 'Stück')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Summary and Add to Cart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Gesamtpreis:</span>
                  <span className="text-2xl font-bold">{calculateTotal().toFixed(2)}€</span>
                </div>
                <Button 
                  onClick={addToCart} 
                  className="w-full"
                  size="lg"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Zur Anfrage hinzufügen
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <CartSheet 
        open={isCartOpen} 
        onOpenChange={setIsCartOpen} 
      />
    </div>
  );
}

export default WallboxConfigurator;