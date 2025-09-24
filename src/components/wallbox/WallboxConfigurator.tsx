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
  meisterstunden: number;
  gesellenstunden: number;
  anfahrt_zone: string;
  foerderung: boolean;
  kunde: {
    name: string;
    email: string;
    plz: string;
    adresse: string;
  };
}

const KATEGORIEN = ['Wallbox', 'Kabel', 'FI/LS'];
const MEISTER_STUNDENSATZ = 85;
const GESELLEN_STUNDENSATZ = 65;

const WallboxConfigurator = () => {
  const [config, setConfig] = useState<ConfigState>({
    selectedWallbox: null,
    selectedProducts: [],
    meisterstunden: 0,
    gesellenstunden: 0,
    anfahrt_zone: "A",
    foerderung: false,
    kunde: {
      name: "",
      email: "",
      plz: "",
      adresse: ""
    }
  });

  const [allProducts, setAllProducts] = useState<WallboxProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<{[key: string]: WallboxProduct[]}>({});
  const [showAddProduct, setShowAddProduct] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { addItem, setCustomerData } = useCart();
  const { toast } = useToast();

  // Fetch all products from database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('wallboxen')
          .select('*')
          .order('Artikelnummer', { ascending: true });

        if (error) {
          console.error('Error fetching products:', error);
          return;
        }

        const products = data?.map((item: any) => ({
          artikelnummer: item.Artikelnummer,
          name: item.Name || 'Unbekannt',
          kategorie: item.Typ || 'Sonstiges',
          beschreibung: item.Beschreibung || '',
          verkaufspreis: item.Verkaufspreis || '0',
          einheit: item.Einheit || 'Stück',
          anzahl_einheit: item['Anzahl Einheit'] || 1, // Use database column
          required: item.required || [],
          optional: item.optional || [],
          exclude: item.exclude || [],
          auto_select: item.auto_select || [],
          stunden_meister: item.stunden_meister || '0',
          stunden_geselle: item.stunden_geselle || '0',
          typ: item.Typ || ''
        })) || [];

        setAllProducts(products);
        
        // Group products by category
        const grouped = KATEGORIEN.reduce((acc, kategorie) => {
          acc[kategorie] = products.filter(p => p.kategorie === kategorie);
          return acc;
        }, {} as {[key: string]: WallboxProduct[]});
        
        setAvailableProducts(grouped);

        // Set default wallbox (first one marked as default or first available)
        const wallboxes = grouped['Wallbox'] || [];
        if (wallboxes.length > 0) {
          const defaultWallbox = wallboxes[0];
          selectWallbox(defaultWallbox);
        }

      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Fehler",
          description: "Produkte konnten nicht geladen werden.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Select wallbox and update required/optional products
  const selectWallbox = (wallbox: WallboxProduct) => {
    const selectedWallbox: SelectedProduct = {
      artikelnummer: wallbox.artikelnummer,
      name: wallbox.name,
      price: parseFloat(wallbox.verkaufspreis) || 0,
      kategorie: wallbox.kategorie,
      beschreibung: wallbox.beschreibung,
      quantity: wallbox.anzahl_einheit || 1,
      einheit: wallbox.einheit
    };

    // Get working hours from selected wallbox
    const meisterstunden = parseFloat(wallbox.stunden_meister) || 0;
    const gesellenstunden = parseFloat(wallbox.stunden_geselle) || 0;

    // Get required products
    const requiredProducts: SelectedProduct[] = [];
    if (wallbox.required) {
      wallbox.required.forEach(artikelnummer => {
        const product = allProducts.find(p => p.artikelnummer.toString() === artikelnummer);
        if (product) {
          requiredProducts.push({
            artikelnummer: product.artikelnummer,
            name: product.name,
            price: parseFloat(product.verkaufspreis) || 0,
            kategorie: product.kategorie,
            beschreibung: product.beschreibung,
            isRequired: true,
            quantity: product.anzahl_einheit || 1,
            einheit: product.einheit
          });
        }
      });
    }

    // Get optional products with auto-select
    const optionalProducts: SelectedProduct[] = [];
    if (wallbox.optional) {
      wallbox.optional.forEach(artikelnummer => {
        const product = allProducts.find(p => p.artikelnummer.toString() === artikelnummer);
        if (product) {
          const isAutoSelected = wallbox.auto_select?.includes(artikelnummer) || false;
          optionalProducts.push({
            artikelnummer: product.artikelnummer,
            name: product.name,
            price: parseFloat(product.verkaufspreis) || 0,
            kategorie: product.kategorie,
            beschreibung: product.beschreibung,
            isAutoSelected,
            quantity: product.anzahl_einheit || 1,
            einheit: product.einheit
          });
        }
      });
    }

    // Auto-select optional products marked for auto-selection
    const autoSelectedOptional = optionalProducts.filter(p => p.isAutoSelected);

    setConfig(prev => ({
      ...prev,
      selectedWallbox,
      selectedProducts: [...requiredProducts, ...autoSelectedOptional],
      meisterstunden,
      gesellenstunden
    }));
  };

  // Toggle optional product selection
  const toggleOptionalProduct = (product: SelectedProduct, selected: boolean) => {
    setConfig(prev => {
      const newProducts = selected 
        ? [...prev.selectedProducts, product]
        : prev.selectedProducts.filter(p => p.artikelnummer !== product.artikelnummer);
      
      return {
        ...prev,
        selectedProducts: newProducts
      };
    });
  };

  // Update product quantity
  const updateProductQuantity = (artikelnummer: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setConfig(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.map(p => 
        p.artikelnummer === artikelnummer 
          ? { ...p, quantity: newQuantity }
          : p
      ),
      selectedWallbox: prev.selectedWallbox?.artikelnummer === artikelnummer
        ? { ...prev.selectedWallbox, quantity: newQuantity }
        : prev.selectedWallbox
    }));
  };

  // Add additional product from category
  const addProductFromCategory = (product: WallboxProduct) => {
    // Remove existing product from same category (only one per category)
    const newProducts = config.selectedProducts.filter(p => 
      p.kategorie !== product.kategorie || p.isRequired
    );

    // Add new product
    const newProduct: SelectedProduct = {
      artikelnummer: product.artikelnummer,
      name: product.name,
      price: parseFloat(product.verkaufspreis) || 0,
      kategorie: product.kategorie,
      beschreibung: product.beschreibung,
      quantity: 1,
      einheit: product.einheit
    };

    setConfig(prev => ({
      ...prev,
      selectedProducts: [...newProducts, newProduct]
    }));

    // Hide add product section
    setShowAddProduct(prev => ({
      ...prev,
      [product.kategorie]: false
    }));
  };

  // Calculate prices
  const calculatePrices = () => {
    const wallboxPrice = config.selectedWallbox ? config.selectedWallbox.price * config.selectedWallbox.quantity : 0;
    const productsPrice = config.selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const materialTotal = wallboxPrice + productsPrice;

    const arbeitskosten = (config.meisterstunden * MEISTER_STUNDENSATZ) + 
                         (config.gesellenstunden * GESELLEN_STUNDENSATZ);
    
    const anfahrtkosten = config.anfahrt_zone === 'A' ? 50 : 
                         config.anfahrt_zone === 'B' ? 75 : 100;

    const nettosumme = materialTotal + arbeitskosten + anfahrtkosten;
    const mwst = nettosumme * 0.19;
    const bruttosumme = nettosumme + mwst;

    const foerderungsabzug = config.foerderung ? Math.min(900, bruttosumme * 0.4) : 0;
    const endpreis = bruttosumme - foerderungsabzug;

    return {
      material: materialTotal,
      arbeit: arbeitskosten,
      anfahrt: anfahrtkosten,
      netto: nettosumme,
      mwst,
      brutto: bruttosumme,
      foerderungsabzug,
      gesamt: endpreis
    };
  };

  const prices = calculatePrices();

  // Get available optional products for selected wallbox
  const getOptionalProducts = () => {
    if (!config.selectedWallbox) return [];
    
    const wallbox = allProducts.find(p => p.artikelnummer === config.selectedWallbox!.artikelnummer);
    if (!wallbox?.optional) return [];

    return wallbox.optional.map(artikelnummer => {
      const product = allProducts.find(p => p.artikelnummer.toString() === artikelnummer);
      return product;
    }).filter(Boolean) as WallboxProduct[];
  };

  // Get excluded products for selected wallbox
  const getExcludedProducts = () => {
    if (!config.selectedWallbox) return [];
    
    const wallbox = allProducts.find(p => p.artikelnummer === config.selectedWallbox!.artikelnummer);
    return wallbox?.exclude || [];
  };

  // Get available products for category (excluding required, selected, and excluded)
  const getAvailableProductsForCategory = (kategorie: string) => {
    const excluded = getExcludedProducts();
    const selectedIds = config.selectedProducts.map(p => p.artikelnummer.toString());
    
    return (availableProducts[kategorie] || []).filter(product => 
      !excluded.includes(product.artikelnummer.toString()) &&
      !selectedIds.includes(product.artikelnummer.toString())
    );
  };

  // Validation
  const validateForm = () => {
    const errors: string[] = [];
    if (!config.kunde.name.trim()) errors.push('Name ist erforderlich');
    if (!config.kunde.email.trim() || !/\S+@\S+\.\S+/.test(config.kunde.email)) {
      errors.push('Gültige E-Mail ist erforderlich');
    }
    if (!config.kunde.plz.trim() || !/^\d{5}$/.test(config.kunde.plz)) {
      errors.push('Gültige PLZ ist erforderlich');
    }
    if (!config.kunde.adresse.trim()) errors.push('Adresse ist erforderlich');
    if (!config.selectedWallbox) errors.push('Bitte wählen Sie eine Wallbox aus');
    return errors;
  };

  // Submit configuration
  const submitConfigurator = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "Eingabefehler",
        description: errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save to Supabase
      await supabase.from('wallbox_leads').insert({
        name: config.kunde.name,
        email: config.kunde.email,
        plz: config.kunde.plz,
        adresse: config.kunde.adresse,
        wallbox_typ: config.selectedWallbox?.artikelnummer.toString() || '',
        installation: 'konfigurator',
        foerderung: config.foerderung,
        features: config.selectedProducts.map(p => p.name)
      });

      toast({
        title: "Angebot erstellt!",
        description: "Ihre Konfiguration wurde erfolgreich gespeichert."
      });

    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        title: "Fehler",
        description: "Es gab ein Problem beim Erstellen des Angebots.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Lade Konfigurator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header with Cart */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/'} 
              className="text-muted-foreground hover:text-foreground"
            >
              ← Zurück zur Hauptseite
            </Button>
          </div>
          <CartIcon onClick={() => setIsCartOpen(true)} />
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Package Overview */}
          <Card className="shadow-card lg:col-span-1">
            <CardHeader>
              <CardTitle>Paketübersicht</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ihr zusammengestelltes Wallbox-Paket
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Selected Wallbox */}
              {config.selectedWallbox && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Wallbox:</span>
                    <span className="text-sm">{config.selectedWallbox.name}</span>
                  </div>
                  {config.selectedWallbox.beschreibung && (
                    <div className="text-xs text-muted-foreground">
                      {config.selectedWallbox.beschreibung}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Products */}
              {config.selectedProducts.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <h4 className="text-sm font-medium">Zusätzliche Komponenten:</h4>
                  {config.selectedProducts.map((product) => (
                    <div key={product.artikelnummer} className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {product.name}
                        {product.isRequired && <Badge variant="secondary" className="text-xs">Erforderlich</Badge>}
                        {product.quantity > 1 && (
                          <span className="text-xs text-muted-foreground">
                            ({product.quantity} {product.einheit || 'Stück'})
                          </span>
                        )}
                      </span>
                      <span>{(product.price * product.quantity).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Working Hours */}
              <div className="space-y-2">
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Meisterstunden:</span>
                  <span>{config.meisterstunden} Std</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Gesellenstunden:</span>
                  <span>{config.gesellenstunden} Std</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Anfahrt:</span>
                  <span>Zone {config.anfahrt_zone}</span>
                </div>
              </div>

              <Separator />

              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Material:</span>
                  <span>{prices.material.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Arbeit:</span>
                  <span>{prices.arbeit.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Anfahrt:</span>
                  <span>{prices.anfahrt.toFixed(2)}€</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Nettosumme:</span>
                  <span>{prices.netto.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>MwSt. (19%):</span>
                  <span>{prices.mwst.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Bruttosumme:</span>
                  <span>{prices.brutto.toFixed(2)}€</span>
                </div>
                {config.foerderung && prices.foerderungsabzug > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Förderabzug:</span>
                    <span>-{prices.foerderungsabzug.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-primary">
                  <span>Gesamtpreis:</span>
                  <span>{prices.gesamt.toFixed(2)}€</span>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Right Column - Configuration */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* Wallbox Selection */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Wallbox auswählen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {(availableProducts['Wallbox'] || []).map((wallbox) => (
                    <div
                      key={wallbox.artikelnummer}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        config.selectedWallbox?.artikelnummer === wallbox.artikelnummer
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => selectWallbox(wallbox)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{wallbox.name}</h4>
                          {wallbox.beschreibung && (
                            <p className="text-sm text-muted-foreground mt-1">{wallbox.beschreibung}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{parseFloat(wallbox.verkaufspreis).toFixed(2)}€</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Required & Optional Components by Category */}
            {config.selectedWallbox && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Komponenten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Required Components by Category */}
                  {Object.entries(
                    config.selectedProducts
                      .filter(p => p.isRequired)
                      .reduce((acc, product) => {
                        if (!acc[product.kategorie]) acc[product.kategorie] = [];
                        acc[product.kategorie].push(product);
                        return acc;
                      }, {} as {[key: string]: SelectedProduct[]})
                  ).map(([kategorie, products]) => (
                    <div key={`required-${kategorie}`} className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        {kategorie} (Erforderlich)
                      </Label>
                      <div className="flex gap-2">
                        <Select value={products[0]?.artikelnummer.toString()} disabled>
                          <SelectTrigger className="bg-muted flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                             {products.map((product) => (
                               <SelectItem 
                                 key={product.artikelnummer} 
                                 value={product.artikelnummer.toString()}
                               >
                                 <div className="flex justify-between items-center w-full">
                                   <span>{product.name}</span>
                                   <Badge variant="secondary" className="ml-2">
                                     {product.price.toFixed(2)}€/{product.einheit || 'Stück'}
                                   </Badge>
                                 </div>
                               </SelectItem>
                             ))}
                          </SelectContent>
                        </Select>
                        {/* Quantity control for required items */}
                        {products[0] && (
                          <div className="flex items-center gap-1">
                            {kategorie.toLowerCase().includes('kabel') ? (
                              // Editable field for cable length
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  step="0.5"
                                  value={products[0].quantity}
                                  onChange={(e) => updateProductQuantity(products[0].artikelnummer, parseFloat(e.target.value) || 1)}
                                  className="w-16 h-8 text-sm"
                                />
                                <span className="text-xs text-muted-foreground">{products[0].einheit || 'm'}</span>
                              </div>
                            ) : (
                              // + button for other items
                              products[0].quantity === 1 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateProductQuantity(products[0].artikelnummer, products[0].quantity + 1)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateProductQuantity(products[0].artikelnummer, products[0].quantity - 1)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="text-sm min-w-[2rem] text-center">{products[0].quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateProductQuantity(products[0].artikelnummer, products[0].quantity + 1)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Optional Components by Category */}
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

                    return (
                      <div key={`optional-${kategorie}`} className="space-y-2">
                        <Label className="text-sm font-medium">
                          {kategorie} (Optional)
                        </Label>
                        <div className="flex gap-2">
                          <Select
                            value={selectedProduct?.artikelnummer.toString() || "none"}
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
                                    quantity: 1,
                                    einheit: product.einheit
                                  };
                                  toggleOptionalProduct(productToAdd, true);
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder={`${kategorie} auswählen`} />
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
                                     <span className="ml-4 font-medium">
                                       {parseFloat(product.verkaufspreis).toFixed(2)}€/{product.einheit || 'Stück'}
                                     </span>
                                   </div>
                                 </SelectItem>
                               ))}
                            </SelectContent>
                          </Select>
                          
                          {/* Quantity control for optional items */}
                          {selectedProduct && (
                            <div className="flex items-center gap-1">
                              {kategorie.toLowerCase().includes('kabel') ? (
                                // Editable field for cable length
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="1"
                                    step="0.5"
                                    value={selectedProduct.quantity}
                                    onChange={(e) => updateProductQuantity(selectedProduct.artikelnummer, parseFloat(e.target.value) || 1)}
                                    className="w-16 h-8 text-sm"
                                  />
                                  <span className="text-xs text-muted-foreground">{selectedProduct.einheit || 'm'}</span>
                                </div>
                              ) : (
                                // + button for other items
                                selectedProduct.quantity === 1 ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateProductQuantity(selectedProduct.artikelnummer, selectedProduct.quantity + 1)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateProductQuantity(selectedProduct.artikelnummer, selectedProduct.quantity - 1)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm min-w-[2rem] text-center">{selectedProduct.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateProductQuantity(selectedProduct.artikelnummer, selectedProduct.quantity + 1)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                </CardContent>
              </Card>
            )}

            {/* Category Navigation */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Weitere Komponenten</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="Kabel" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="Kabel">Kabel</TabsTrigger>
                    <TabsTrigger value="FI/LS">FI/LS</TabsTrigger>
                  </TabsList>
                  
                  {['Kabel', 'FI/LS'].map((kategorie) => (
                    <TabsContent key={kategorie} value={kategorie} className="space-y-3">
                      
                      {/* Currently selected product from this category */}
                      {config.selectedProducts
                        .filter(p => p.kategorie === kategorie && !p.isRequired)
                        .map((product) => (
                          <div key={product.artikelnummer} className="p-3 border border-primary bg-primary/5 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">{product.name}</span>
                                {product.beschreibung && (
                                  <p className="text-sm text-muted-foreground">{product.beschreibung}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{product.price.toFixed(2)}€</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setConfig(prev => ({
                                      ...prev,
                                      selectedProducts: prev.selectedProducts.filter(p => p.artikelnummer !== product.artikelnummer)
                                    }));
                                  }}
                                >
                                  Entfernen
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}

                      {/* Add product button */}
                      {!showAddProduct[kategorie] && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowAddProduct(prev => ({ ...prev, [kategorie]: true }))}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {kategorie} hinzufügen
                        </Button>
                      )}

                      {/* Available products */}
                      {showAddProduct[kategorie] && (
                        <div className="space-y-2">
                          {getAvailableProductsForCategory(kategorie).map((product) => (
                            <div
                              key={product.artikelnummer}
                              className="p-3 border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={() => addProductFromCategory(product)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-medium">{product.name}</h4>
                                  {product.beschreibung && (
                                    <p className="text-sm text-muted-foreground">{product.beschreibung}</p>
                                  )}
                                </div>
                                <span className="font-medium">{parseFloat(product.verkaufspreis).toFixed(2)}€</span>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            onClick={() => setShowAddProduct(prev => ({ ...prev, [kategorie]: false }))}
                          >
                            Abbrechen
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Working Hours */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Arbeitsaufwand</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Meisterstunden ({MEISTER_STUNDENSATZ}€/Std)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={config.meisterstunden}
                    onChange={(e) => setConfig(prev => ({ ...prev, meisterstunden: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gesellenstunden ({GESELLEN_STUNDENSATZ}€/Std)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={config.gesellenstunden}
                    onChange={(e) => setConfig(prev => ({ ...prev, gesellenstunden: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Additional Options */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Zusätzliche Optionen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Anfahrtszone</Label>
                  <Select 
                    value={config.anfahrt_zone} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, anfahrt_zone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Zone A (50€)</SelectItem>
                      <SelectItem value="B">Zone B (75€)</SelectItem>
                      <SelectItem value="C">Zone C (100€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="foerderung"
                    checked={config.foerderung}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, foerderung: checked }))}
                  />
                  <Label htmlFor="foerderung">Förderung beantragen (bis zu 900€ Abzug)</Label>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Sticky Footer with Checkout */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
          <div className="container mx-auto px-4 py-4 max-w-6xl">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-lg font-semibold">
                  Gesamtpreis: {prices.gesamt.toFixed(2)}€
                </span>
                <span className="text-sm text-muted-foreground">
                  {config.foerderung && "Inklusive Förderung"}
                </span>
              </div>
              <Button
                onClick={() => {
                  // Add the complete configuration to cart and navigate to checkout
                  if (config.selectedWallbox) {
                    // Create the complete wallbox configuration
                    const wallboxConfig = {
                      productType: 'wallbox' as const,
                      name: 'Wallbox Komplett-Paket',
                      configuration: {
                        wallbox: config.selectedWallbox,
                        components: config.selectedProducts,
                        workingHours: {
                          meister: config.meisterstunden,
                          geselle: config.gesellenstunden
                        },
                        travelZone: config.anfahrt_zone,
                        subsidy: config.foerderung
                      },
                      pricing: {
                        materialCosts: prices.material,
                        laborCosts: prices.arbeit,
                        travelCosts: prices.anfahrt,
                        subtotal: prices.netto,
                        subsidy: config.foerderung ? Math.min(900, prices.netto * 0.1) : 0,
                        total: prices.gesamt
                      }
                    };

                    addItem(wallboxConfig);

                    // Navigate to checkout
                    window.location.href = '/checkout';
                  } else {
                    toast({
                      title: "Fehler",
                      description: "Bitte wählen Sie eine Wallbox aus.",
                      variant: "destructive"
                    });
                  }
                }}
                size="lg"
                className="min-w-[200px]"
                disabled={!config.selectedWallbox}
              >
                Zur Kasse
              </Button>
            </div>
          </div>
        </div>

        {/* Cart Sheet */}
        <CartSheet 
          open={isCartOpen} 
          onOpenChange={setIsCartOpen} 
        />
      </div>
    </div>
  );
};

export default WallboxConfigurator;