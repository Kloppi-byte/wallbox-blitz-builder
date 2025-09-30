import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
// Import necessary UI components from '@/components/ui/...'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
// Import lucide icons
import { Building, Package, CheckCircle, Minus, Plus, Search } from 'lucide-react';

// --- TYPE DEFINITIONS ---
// Database table types
type OfferPackage = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  is_optional: boolean | null;
  quality_level: string | null;
  created_at: string;
};
type OfferPackageItem = {
  id: number;
  package_id: number;
  produkt_gruppe_id: string;
  quantity_base: number;
  quantity_per_room: number;
  quantity_per_floor: number;
  quantity_per_sqm: number;
  multipliers?: Record<string, number> | null;
  created_at: string;
};
type OfferProductGroup = {
  group_id: string;
  description: string | null;
};
type OfferProduct = {
  product_id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  category: string | null;
  produkt_gruppe: string | null;
  qualitaetsstufe: string | null;
  stunden_meister: number;
  stunden_geselle: number;
  stunden_monteur: number;
  created_at: string;
  image: string | null;
};
type OfferPackageParameterDefinition = {
  param_key: string;
  label: string;
  param_type: string;
  unit?: string | null;
  default_value?: string | null;
  is_global?: boolean;
  maps_to_factor_column?: string | null;
  'true/false'?: string | null;
};

// Application state types
type OfferLineItem = {
  id: string;
  package_id: number;
  package_name: string;
  product_id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  category: string | null;
  produkt_gruppe: string | null;
  qualitaetsstufe: string | null;
  stunden_meister: number;
  stunden_geselle: number;
  stunden_monteur: number;
  quantity: number;
  image: string | null;
};

// --- COMPONENT STATE ---
export function ElektrosanierungConfigurator() {
  // State for global parameters (dynamically populated from database)
  const [globalParams, setGlobalParams] = useState<Record<string, any>>({
    baujahr: 2000,
    qualitaetsstufe: 'Standard'
  });

  // State for data from all four tables
  const [availablePackages, setAvailablePackages] = useState<OfferPackage[]>([]);
  const [packageItems, setPackageItems] = useState<OfferPackageItem[]>([]);
  const [productGroups, setProductGroups] = useState<OfferProductGroup[]>([]);
  const [products, setProducts] = useState<OfferProduct[]>([]);

  // State for dynamic parameters
  const [paramLinks, setParamLinks] = useState<any[]>([]);
  const [paramDefs, setParamDefs] = useState<OfferPackageParameterDefinition[]>([]);

  // State to track selected packages with their parameters
  const [selectedPackages, setSelectedPackages] = useState<{
    instanceId: string;
    package_id: number;
    name: string;
    parameters: Record<string, any>;
  }[]>([]);

  // State to hold the offer line items
  const [offerLineItems, setOfferLineItems] = useState<OfferLineItem[]>([]);

  // State for detail view
  const [detailsPackageId, setDetailsPackageId] = useState<number | null>(null);
  const [showAddProduct, setShowAddProduct] = useState<number | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const {
    addItem
  } = useCart();

  // Data fetching from all tables including parameter tables
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data from all six tables concurrently using Promise.all
        const [packagesResult, packageItemsResult, productGroupsResult, productsResult, paramLinksResult, paramDefsResult] = await Promise.all([supabase.from('offers_packages').select('*').order('category', {
          ascending: true
        }).order('name', {
          ascending: true
        }), supabase.from('offers_package_items').select('*'), supabase.from('offers_product_groups').select('*'), supabase.from('offers_products').select('*').order('category', {
          ascending: true
        }).order('name', {
          ascending: true
        }), supabase.from('offers_package_parameter_links').select('*'), supabase.from('offers_package_parameter_definitions').select('*')]);

        // Check for errors in any of the requests
        if (packagesResult.error) throw packagesResult.error;
        if (packageItemsResult.error) throw packageItemsResult.error;
        if (productGroupsResult.error) throw productGroupsResult.error;
        if (productsResult.error) throw productsResult.error;
        if (paramLinksResult.error) throw paramLinksResult.error;
        if (paramDefsResult.error) throw paramDefsResult.error;

        // Update state with fetched data
        if (packagesResult.data) setAvailablePackages(packagesResult.data);
        if (packageItemsResult.data) {
          console.log('Package items data:', packageItemsResult.data);
          setPackageItems(packageItemsResult.data);
        }
        if (productGroupsResult.data) setProductGroups(productGroupsResult.data);
        if (productsResult.data) {
          console.log('Products data:', productsResult.data);
          setProducts(productsResult.data.map(product => ({
            ...product,
            image: (product as any).image || null
          })));
        }
        if (paramLinksResult.data) {
          console.log('Parameter links data:', paramLinksResult.data);
          setParamLinks(paramLinksResult.data);
        }
        if (paramDefsResult.data) {
          console.log('Parameter definitions data:', paramDefsResult.data);
          setParamDefs(paramDefsResult.data);
        }

        // Log the package IDs and package item package IDs to check relationship
        if (packagesResult.data && packageItemsResult.data) {
          console.log('Package IDs:', packagesResult.data.map(p => p.id));
          console.log('Package Item package_ids:', [...new Set(packageItemsResult.data.map(pi => pi.package_id))]);
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching configuration data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // Generic handler for global parameter changes
  const handleGlobalParamChange = (paramKey: string, value: any) => {
    setGlobalParams(prevParams => ({
      ...prevParams,
      [paramKey]: value,
    }));
  };

  // Handler function for package selection
  const handlePackageSelection = (packageData: OfferPackage, checked: boolean) => {
    if (checked) {
      // Create a new selected package instance with parameters
      const instanceId = `${packageData.id}-${Date.now()}`;
      const newSelectedPackage = {
        instanceId,
        package_id: packageData.id,
        name: packageData.name,
        parameters: {} as Record<string, any>
      };
      setSelectedPackages(prev => [...prev, newSelectedPackage]);

      // Resolve all products for this package and add to offer line items
      const packageItemsForPackage = packageItems.filter(item => item.package_id === packageData.id);
      const newLineItems: OfferLineItem[] = [];
      packageItemsForPackage.forEach(item => {
        const product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === globalParams.qualitaetsstufe);
        if (product) {
          // Calculate quantity: start with quantity_base and ADD multiplier terms
          let calculatedQuantity = item.quantity_base || 0;
          
          // Apply multipliers with formula parser (supports "param" and "param1 * param2")
          if (item.multipliers && typeof item.multipliers === 'object') {
            const multipliers = item.multipliers as Record<string, number>;
            
            for (const formulaKey in multipliers) {
              const factor = multipliers[formulaKey];
              
              // Split the formula key by '*' to get individual parameter names
              const paramNames = formulaKey.split('*').map(name => name.trim());
              
              // Calculate the term value by multiplying all parameter values
              let termValue = 1.0;
              let allParamsFound = true;
              
              for (const paramName of paramNames) {
                if (globalParams[paramName] !== undefined && globalParams[paramName] !== null) {
                  // Convert boolean to 1/0 for calculations
                  const paramValue = typeof globalParams[paramName] === 'boolean'
                    ? (globalParams[paramName] ? 1 : 0)
                    : globalParams[paramName];
                  
                  termValue *= paramValue;
                } else {
                  allParamsFound = false;
                  termValue = 0;
                  break;
                }
              }
              
              // ADD the final term (termValue * factor) to total quantity
              if (allParamsFound || termValue !== 0) {
                calculatedQuantity += termValue * factor;
              }
            }
          }
          
          newLineItems.push({
            id: `${packageData.id}-${product.product_id}-${Date.now()}`,
            package_id: packageData.id,
            package_name: packageData.name,
            product_id: product.product_id,
            name: product.name,
            description: product.description,
            unit: product.unit,
            unit_price: product.unit_price,
            category: product.category,
            produkt_gruppe: product.produkt_gruppe,
            qualitaetsstufe: product.qualitaetsstufe,
            stunden_meister: product.stunden_meister * calculatedQuantity,
            stunden_geselle: product.stunden_geselle * calculatedQuantity,
            stunden_monteur: product.stunden_monteur * calculatedQuantity,
            quantity: Math.round(calculatedQuantity * 100) / 100, // Round to 2 decimals
            image: product.image
          });
        }
      });
      setOfferLineItems(prev => [...prev, ...newLineItems]);
    } else {
      // Remove selected package and all line items for this package
      setSelectedPackages(prev => prev.filter(p => p.package_id !== packageData.id));
      setOfferLineItems(prev => prev.filter(item => item.package_id !== packageData.id));
    }
  };

  // Handler function for parameter changes
  const handleParameterChange = (packageId: number, paramKey: string, value: any) => {
    setSelectedPackages(prev => prev.map(pkg => pkg.package_id === packageId ? {
      ...pkg,
      parameters: {
        ...pkg.parameters,
        [paramKey]: value
      }
    } : pkg));
  };

  // Handler function for quantity changes
  const handleQuantityChange = (lineItemId: string, newQuantity: number) => {
    setOfferLineItems(currentItems => currentItems.map(item => item.id === lineItemId ? {
      ...item,
      quantity: Math.max(0, newQuantity)
    } : item).filter(item => item.quantity > 0) // Remove items with 0 quantity
    );
  };

  // Handler function for product swaps
  const handleProductSwap = (lineItemId: string, newProductId: string) => {
    const newProduct = products.find(p => p.product_id === newProductId);
    if (!newProduct) return;
    setOfferLineItems(currentItems => currentItems.map(item => item.id === lineItemId ? {
      ...item,
      product_id: newProduct.product_id,
      name: newProduct.name,
      description: newProduct.description,
      unit: newProduct.unit,
      unit_price: newProduct.unit_price,
      category: newProduct.category,
      qualitaetsstufe: newProduct.qualitaetsstufe,
      stunden_meister: newProduct.stunden_meister,
      stunden_geselle: newProduct.stunden_geselle,
      stunden_monteur: newProduct.stunden_monteur
    } : item));
  };

  // Handler function for hours changes
  const handleHoursChange = (lineItemId: string, field: 'stunden_meister' | 'stunden_geselle' | 'stunden_monteur', newValue: number) => {
    setOfferLineItems(currentItems => currentItems.map(item => item.id === lineItemId ? {
      ...item,
      [field]: Math.max(0, parseFloat(newValue.toFixed(2)))
    } : item));
  };

  // Handler function for removing line items
  const handleRemoveLineItem = (lineItemId: string) => {
    setOfferLineItems(currentItems => currentItems.filter(item => item.id !== lineItemId));
  };

  // Handler function for adding a product to a package
  const handleAddProduct = (packageId: number, productId: string) => {
    const product = products.find(p => p.product_id === productId);
    if (!product) return;
    const newLineItem: OfferLineItem = {
      id: `${packageId}-${productId}-${Date.now()}`,
      package_id: packageId,
      package_name: availablePackages.find(p => p.id === packageId)?.name || '',
      product_id: product.product_id,
      name: product.name,
      description: product.description,
      unit: product.unit,
      unit_price: product.unit_price,
      category: product.category,
      produkt_gruppe: product.produkt_gruppe,
      qualitaetsstufe: product.qualitaetsstufe,
      stunden_meister: product.stunden_meister,
      stunden_geselle: product.stunden_geselle,
      stunden_monteur: product.stunden_monteur,
      quantity: 1,
      // Default quantity
      image: product.image
    };
    setOfferLineItems(prev => [...prev, newLineItem]);
    setShowAddProduct(null); // Close the dropdown
    setProductSearchQuery(''); // Reset search
  };

  // Helper function to get packages by category
  const getPackagesByCategory = (category: string) => {
    return availablePackages.filter(pkg => pkg.category === category);
  };

  // Helper function to check if a package is selected
  const isPackageSelected = (packageId: number) => {
    return offerLineItems.some(item => item.package_id === packageId);
  };

  // Helper function to get line items for a package
  const getLineItemsForPackage = (packageId: number) => {
    return offerLineItems.filter(item => item.package_id === packageId);
  };

  // Helper function to get filtered products for adding to packages
  const getFilteredProducts = () => {
    if (!productSearchQuery) return products;
    return products.filter(product => product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || product.description && product.description.toLowerCase().includes(productSearchQuery.toLowerCase()) || product.category && product.category.toLowerCase().includes(productSearchQuery.toLowerCase()));
  };

  // Helper function to get alternatives for a product group
  const getAlternatives = (produktGruppe: string) => {
    return products.filter(p => p.produkt_gruppe === produktGruppe);
  };

  // Helper function to get products for a package (client-side join)
  const getProductsForPackage = (packageId: number, qualitaetsstufe: string) => {
    // 1. Find all package items for this package
    const packageItemsForPackage = packageItems.filter(item => item.package_id === packageId);

    // 2. For each package item, find the corresponding product
    const productNames: string[] = [];
    packageItemsForPackage.forEach(item => {
      const product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === qualitaetsstufe);
      if (product) {
        productNames.push(product.name);
      }
    });
    return productNames;
  };

  // Filter parameter definitions into global and local
  const globalParamDefs = paramDefs.filter(p => p.is_global);
  const localParamDefs = paramDefs.filter(p => !p.is_global);

  // Get unique categories from available packages, filter out null values
  const categories = [...new Set(availablePackages.map(pkg => pkg.category))].filter(Boolean);

  // Handle form submission - send to backend webhook
  const handleSubmit = async () => {
    if (offerLineItems.length === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens ein Paket aus.",
        variant: "destructive"
      });
      return;
    }
    try {
      const payload = {
        global_params: globalParams,
        selected_packages: selectedPackages
      };

      // Send to backend webhook for calculation
      const {
        data,
        error
      } = await supabase.functions.invoke('calculate-elektrosanierung', {
        body: payload
      });
      if (error) {
        throw error;
      }

      // Add calculated result to cart
      addItem({
        productType: 'elektrosanierung',
        name: 'Elektrosanierung Konfiguration',
        configuration: {
          globalParams,
          selectedPackages
        },
        pricing: data?.pricing || {
          materialCosts: 0,
          laborCosts: 0,
          travelCosts: 0,
          subtotal: 0,
          subsidy: 0,
          total: 0
        }
      });
      toast({
        title: "Erfolgreich hinzugefügt",
        description: "Konfiguration wurde zum Warenkorb hinzugefügt."
      });
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: "Berechnung konnte nicht durchgeführt werden: " + err.message,
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lade Pakete...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            
            <CartIcon onClick={() => {}} />
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Elektrosanierung</h1>

        {/* Section 1: Global Project Parameters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              1. Projektdaten
            </CardTitle>
            <CardDescription>Geben Sie die Eckdaten des Gebäudes an.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {/* Keep Qualitätsstufe as hardcoded field */}
            <div>
              <Label htmlFor="qualitaetsstufe">Qualitätsstufe</Label>
              <Select 
                value={String(globalParams.qualitaetsstufe)} 
                onValueChange={value => handleGlobalParamChange('qualitaetsstufe', value)}
              >
                <SelectTrigger id="qualitaetsstufe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamically render other global parameters */}
            {globalParamDefs.filter(def => def.param_key !== 'qualitaetsstufe').map(def => {
              // Initialize default value based on param_type
              let defaultValue: any = def.default_value;
              if (def.param_type === 'boolean') {
                // For boolean, default to false (0 in calculations)
                defaultValue = false;
              }
              
              const currentValue = globalParams[def.param_key] !== undefined 
                ? globalParams[def.param_key] 
                : defaultValue;
              
              // Render based on param_type
              if (def.param_type === 'boolean' && def['true/false']) {
                const [trueText, falseText] = def['true/false'].split('/').map(t => t.trim());
                return (
                  <div key={def.param_key} className="flex items-center space-x-2">
                    <Switch
                      id={`global-${def.param_key}`}
                      checked={currentValue === true}
                      onCheckedChange={(checked) => handleGlobalParamChange(def.param_key, checked)}
                    />
                    <Label htmlFor={`global-${def.param_key}`} className="cursor-pointer">
                      {currentValue ? trueText : falseText}
                    </Label>
                  </div>
                );
              }
              
              if (def.param_type === 'select') {
                return (
                  <div key={def.param_key}>
                    <Label htmlFor={`global-${def.param_key}`}>{def.label}</Label>
                    <Select 
                      value={String(currentValue)} 
                      onValueChange={value => handleGlobalParamChange(def.param_key, value)}
                    >
                      <SelectTrigger id={`global-${def.param_key}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Basic">Basic</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              
              // Default: render as input
              return (
                <div key={def.param_key}>
                  <Label htmlFor={`global-${def.param_key}`}>
                    {def.label}
                    {def.unit && <span className="text-muted-foreground ml-1">({def.unit})</span>}
                  </Label>
                  <Input
                    id={`global-${def.param_key}`}
                    type={def.param_type}
                    value={currentValue || ''}
                    onChange={e => handleGlobalParamChange(def.param_key, e.target.value)}
                    placeholder={`${def.label} eingeben...`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Section 2: Package Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              2. Ausstattungspakete auswählen
            </CardTitle>
            <CardDescription>Stellen Sie die Sanierung Raum für Raum zusammen.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <p>Lade Pakete...</p>}
            {error && <p className="text-red-500">Fehler: {error}</p>}
            
            <Accordion type="multiple" className="w-full">
              {categories.map((category, index) => <AccordionItem key={category} value={`category-${index}`}>
                  <AccordionTrigger>{category}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {getPackagesByCategory(category).map(pkg => {
                    const isSelected = isPackageSelected(pkg.id);
                    const requiredParams = paramLinks.filter(link => link.package_id === pkg.id);
                    return <div key={pkg.id}>
                            <div className="flex items-center space-x-3 p-4 border rounded-lg">
                              <Checkbox checked={isSelected} onCheckedChange={checked => handlePackageSelection(pkg, checked as boolean)} />
                              <div className="flex-1">
                                <h4 className="font-medium">{pkg.name}</h4>
                                {pkg.description && <p className="text-sm text-muted-foreground">{pkg.description}</p>}
                                {pkg.quality_level && <span className="text-xs bg-secondary px-2 py-1 rounded">
                                    {pkg.quality_level}
                                  </span>}
                              </div>
                              <Button variant="outline" size="sm" onClick={() => setDetailsPackageId(detailsPackageId === pkg.id ? null : pkg.id)}>
                                Details
                              </Button>
                            </div>

                            {/* Conditionally render parameter inputs ONLY if package is selected */}
                            {isSelected && requiredParams.length > 0 && <div className="pl-8 mt-2 space-y-3 p-4 bg-muted/50 rounded-lg border">
                                <h5 className="text-sm font-semibold text-foreground">Parameter für dieses Paket:</h5>
                                {requiredParams.map(link => {
                          const def = localParamDefs.find(d => d.param_key === link.param_key);
                          if (!def) return null;
                          const currentPackage = selectedPackages.find(p => p.package_id === pkg.id);
                          const currentValue = currentPackage?.parameters[def.param_key] || def.default_value || '';
                          return <div key={def.param_key} className="space-y-1">
                                      <Label htmlFor={`param-${pkg.id}-${def.param_key}`} className="text-sm font-medium">
                                        {def.label}
                                        {def.unit && <span className="text-muted-foreground ml-1">({def.unit})</span>}
                                      </Label>
                                      <Input id={`param-${pkg.id}-${def.param_key}`} type={def.param_type} value={currentValue} onChange={e => handleParameterChange(pkg.id, def.param_key, e.target.value)} placeholder={`${def.label} eingeben...`} className="max-w-xs" />
                                    </div>;
                        })}
                              </div>}
                          {/* Package details view */}
                          {detailsPackageId === pkg.id && <div className="pl-8 mt-2">
                              <strong className="text-sm text-muted-foreground mb-3 block">Inhalt für '{globalParams.qualitaetsstufe}':</strong>
                              {isPackageSelected(pkg.id) ? <div className="space-y-3">
                                   {getLineItemsForPackage(pkg.id).map(item => <div key={item.id} className="p-4 bg-background border rounded-lg">
                                       <div className="flex items-start gap-4">
                                         {/* Product Image */}
                                         <div className="w-16 h-16 flex-shrink-0">
                                           {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded border" /> : <div className="w-full h-full bg-muted rounded border flex items-center justify-center">
                                               <Package className="h-8 w-8 text-muted-foreground" />
                                             </div>}
                                         </div>

                                         {/* Product Info and Controls */}
                                         <div className="flex-1">
                                           <div className="mb-3">
                                             <h5 className="font-medium text-base">{item.name}</h5>
                                             {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                                           </div>

                                           {/* Top row controls */}
                                           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                             {/* Quantity */}
                                             <div>
                                               <Label className="text-sm font-medium mb-2 block">Menge</Label>
                                               <div className="flex items-center gap-2">
                                                 <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => handleQuantityChange(item.id, Math.max(0, item.quantity - 1))}>
                                                   <Minus className="h-4 w-4" />
                                                 </Button>
                                                 <Input type="number" min="0" step="1" value={item.quantity || ''} placeholder="0" onChange={e => {
                                        const value = e.target.value;
                                        if (value === '') {
                                          setOfferLineItems(current => current.map(lineItem => lineItem.id === item.id ? {
                                            ...lineItem,
                                            quantity: '' as any
                                          } : lineItem));
                                        } else {
                                          const num = parseInt(value) || 0;
                                          handleQuantityChange(item.id, num);
                                        }
                                      }} onBlur={e => {
                                        if (e.target.value === '') {
                                          handleQuantityChange(item.id, 0);
                                        }
                                      }} className="w-20 h-9 text-center" />
                                                 <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>
                                                   <Plus className="h-4 w-4" />
                                                 </Button>
                                               </div>
                                               <span className="text-xs text-muted-foreground mt-1 block">{item.unit}</span>
                                             </div>

                                             {/* Quality */}
                                             <div>
                                               <Label className="text-sm font-medium mb-2 block">Qualität</Label>
                                               <Select value={item.product_id} onValueChange={value => handleProductSwap(item.id, value)}>
                                                 <SelectTrigger className="h-9">
                                                   <SelectValue />
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                   {getAlternatives(item.produkt_gruppe || '').map(alt => <SelectItem key={alt.product_id} value={alt.product_id}>
                                                       {alt.qualitaetsstufe}
                                                     </SelectItem>)}
                                                 </SelectContent>
                                               </Select>
                                             </div>

                                             {/* Price */}
                                             <div>
                                               <Label className="text-sm font-medium mb-2 block">Gesamtpreis</Label>
                                               <div className="bg-muted border rounded p-2 h-9 flex items-center justify-center">
                                                 <span className="font-semibold">
                                                   {((item.unit_price || 0) * (item.quantity || 0)).toFixed(2)} €
                                                 </span>
                                               </div>
                                               <span className="text-xs text-muted-foreground mt-1 block">
                                                 {(item.unit_price || 0).toFixed(2)} € / {item.unit}
                                               </span>
                                             </div>

                                             {/* Remove button */}
                                             <div className="flex items-end">
                                               <Button variant="destructive" size="sm" onClick={() => handleRemoveLineItem(item.id)} className="h-9 w-full">
                                                 Entfernen
                                               </Button>
                                             </div>
                                           </div>

                                           {/* Hours row */}
                                           <div className="grid grid-cols-3 gap-4">
                                             {/* Meister Hours */}
                                             <div>
                                               <Label className="text-sm font-medium mb-2 block">Meister (h)</Label>
                                               <div className="flex items-center gap-2">
                                                 <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleHoursChange(item.id, 'stunden_meister', Math.max(0, (item.stunden_meister || 0) - 0.1))}>
                                                   <Minus className="h-3 w-3" />
                                                 </Button>
                                                 <Input type="number" step="0.1" min="0" value={item.stunden_meister ? parseFloat(item.stunden_meister.toString()).toFixed(2) : ''} placeholder="0.00" onChange={e => {
                                        const value = e.target.value;
                                        if (value === '') {
                                          setOfferLineItems(current => current.map(lineItem => lineItem.id === item.id ? {
                                            ...lineItem,
                                            stunden_meister: '' as any
                                          } : lineItem));
                                        } else {
                                          const num = parseFloat(value) || 0;
                                          handleHoursChange(item.id, 'stunden_meister', num);
                                        }
                                      }} onBlur={e => {
                                        if (e.target.value === '') {
                                          handleHoursChange(item.id, 'stunden_meister', 0);
                                        }
                                      }} className="flex-1 h-8 text-center text-sm" />
                                                 <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleHoursChange(item.id, 'stunden_meister', (item.stunden_meister || 0) + 0.1)}>
                                                   <Plus className="h-3 w-3" />
                                                 </Button>
                                                </div>
                                                <span className="text-xs text-muted-foreground mt-1 block">
                                                  {((item.stunden_meister || 0) / (item.quantity || 1)).toFixed(2)} h/Stk × {item.quantity} = {(item.stunden_meister || 0).toFixed(2)} h
                                                </span>
                                              </div>

                                             {/* Geselle Hours */}
                                             <div>
                                               <Label className="text-sm font-medium mb-2 block">Geselle (h)</Label>
                                               <div className="flex items-center gap-2">
                                                 <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleHoursChange(item.id, 'stunden_geselle', Math.max(0, (item.stunden_geselle || 0) - 0.1))}>
                                                   <Minus className="h-3 w-3" />
                                                 </Button>
                                                 <Input type="number" step="0.1" min="0" value={item.stunden_geselle ? parseFloat(item.stunden_geselle.toString()).toFixed(2) : ''} placeholder="0.00" onChange={e => {
                                        const value = e.target.value;
                                        if (value === '') {
                                          setOfferLineItems(current => current.map(lineItem => lineItem.id === item.id ? {
                                            ...lineItem,
                                            stunden_geselle: '' as any
                                          } : lineItem));
                                        } else {
                                          const num = parseFloat(value) || 0;
                                          handleHoursChange(item.id, 'stunden_geselle', num);
                                        }
                                      }} onBlur={e => {
                                        if (e.target.value === '') {
                                          handleHoursChange(item.id, 'stunden_geselle', 0);
                                        }
                                      }} className="flex-1 h-8 text-center text-sm" />
                                                 <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleHoursChange(item.id, 'stunden_geselle', (item.stunden_geselle || 0) + 0.1)}>
                                                   <Plus className="h-3 w-3" />
                                                 </Button>
                                                </div>
                                                <span className="text-xs text-muted-foreground mt-1 block">
                                                  {((item.stunden_geselle || 0) / (item.quantity || 1)).toFixed(2)} h/Stk × {item.quantity} = {(item.stunden_geselle || 0).toFixed(2)} h
                                                </span>
                                              </div>

                                             {/* Monteur Hours */}
                                             <div>
                                               <Label className="text-sm font-medium mb-2 block">Monteur (h)</Label>
                                               <div className="flex items-center gap-2">
                                                 <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleHoursChange(item.id, 'stunden_monteur', Math.max(0, (item.stunden_monteur || 0) - 0.1))}>
                                                   <Minus className="h-3 w-3" />
                                                 </Button>
                                                 <Input type="number" step="0.1" min="0" value={item.stunden_monteur ? parseFloat(item.stunden_monteur.toString()).toFixed(2) : ''} placeholder="0.00" onChange={e => {
                                        const value = e.target.value;
                                        if (value === '') {
                                          setOfferLineItems(current => current.map(lineItem => lineItem.id === item.id ? {
                                            ...lineItem,
                                            stunden_monteur: '' as any
                                          } : lineItem));
                                        } else {
                                          const num = parseFloat(value) || 0;
                                          handleHoursChange(item.id, 'stunden_monteur', num);
                                        }
                                      }} onBlur={e => {
                                        if (e.target.value === '') {
                                          handleHoursChange(item.id, 'stunden_monteur', 0);
                                        }
                                      }} className="flex-1 h-8 text-center text-sm" />
                                                 <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleHoursChange(item.id, 'stunden_monteur', (item.stunden_monteur || 0) + 0.1)}>
                                                   <Plus className="h-3 w-3" />
                                                 </Button>
                                                </div>
                                                <span className="text-xs text-muted-foreground mt-1 block">
                                                  {((item.stunden_monteur || 0) / (item.quantity || 1)).toFixed(2)} h/Stk × {item.quantity} = {(item.stunden_monteur || 0).toFixed(2)} h
                                                </span>
                                              </div>
                                           </div>
                                         </div>
                                       </div>
                                     </div>)}
                                   
                                   {/* Add Product Button */}
                                   <div className="p-3 border-2 border-dashed border-muted rounded-lg">
                                     <Popover open={showAddProduct === pkg.id} onOpenChange={open => setShowAddProduct(open ? pkg.id : null)}>
                                       <PopoverTrigger asChild>
                                         <Button variant="outline" size="sm" className="w-full">
                                           <Plus className="h-4 w-4 mr-2" />
                                           Produkt hinzufügen
                                         </Button>
                                       </PopoverTrigger>
                                       <PopoverContent className="w-80 p-0" align="start">
                                         <div className="flex flex-col">
                                           {/* Search Input */}
                                           <div className="flex items-center border-b px-3 py-2">
                                             <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                             <Input placeholder="Produkte durchsuchen..." value={productSearchQuery} onChange={e => setProductSearchQuery(e.target.value)} className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                                           </div>
                                           
                                           {/* Product List */}
                                           <div className="max-h-60 overflow-y-auto">
                                             {getFilteredProducts().length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">
                                                 Keine Produkte gefunden.
                                               </div> : getFilteredProducts().map(product => <div key={product.product_id} onClick={() => handleAddProduct(pkg.id, product.product_id)} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent transition-colors">
                                                   <div className="w-10 h-10 flex-shrink-0">
                                                     {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded border" /> : <div className="w-full h-full bg-muted rounded border flex items-center justify-center">
                                                         <Package className="h-5 w-5 text-muted-foreground" />
                                                       </div>}
                                                   </div>
                                                   <div className="flex-1 min-w-0">
                                                     <div className="font-medium text-sm">{product.name}</div>
                                                     {product.description && <div className="text-xs text-muted-foreground truncate">{product.description}</div>}
                                                     <div className="flex items-center gap-2 mt-1">
                                                       <span className="text-xs text-muted-foreground">{product.qualitaetsstufe}</span>
                                                       <span className="text-xs font-medium">{product.unit_price?.toFixed(2)} € / {product.unit}</span>
                                                     </div>
                                                   </div>
                                                 </div>)}
                                           </div>
                                         </div>
                                       </PopoverContent>
                                     </Popover>
                                   </div>
                                 </div> : <div className="text-sm text-muted-foreground">
                                  <p>Paket auswählen, um Inhalte zu bearbeiten.</p>
                                  <ul className="mt-1 space-y-1">
                                    {getProductsForPackage(pkg.id, globalParams.qualitaetsstufe).map(productName => <li key={productName}>- {productName}</li>)}
                                  </ul>
                                </div>}
                            </div>}
                          </div>;
                  })}
                    </div>
                  </AccordionContent>
                </AccordionItem>)}
            </Accordion>
          </CardContent>
        </Card>

        {/* Section 3: Summary & Submission */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              3. Zusammenfassung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h4 className="font-medium">Ausgewählte Angebotspositionen:</h4>
              {offerLineItems.length === 0 ? <p className="text-muted-foreground">Keine Pakete ausgewählt</p> : <div className="space-y-2">
                  {/* Group by package */}
                  {[...new Set(offerLineItems.map(item => item.package_id))].map(packageId => {
                const packageItems = getLineItemsForPackage(packageId);
                const packageName = packageItems[0]?.package_name || '';
                return <div key={packageId} className="p-3 bg-secondary rounded">
                        <h5 className="font-medium mb-2">{packageName}</h5>
                        <div className="space-y-1 text-sm">
                          {packageItems.map(item => <div key={item.id} className="flex justify-between">
                              <span>{item.name}</span>
                              <span>{((item.unit_price || 0) * (item.quantity || 0)).toFixed(2)} €</span>
                            </div>)}
                        </div>
                      </div>;
              })}
                </div>}
              
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Der Gesamtpreis wird nach Übermittlung der Anfrage berechnet und Ihnen in einem detaillierten Angebot mitgeteilt.
                </p>
                <Button onClick={handleSubmit} className="w-full" disabled={offerLineItems.length === 0}>
                  Angebot anfordern
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}
export default ElektrosanierungConfigurator;