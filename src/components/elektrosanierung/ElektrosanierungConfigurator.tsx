import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
import { ProductLineItem } from './ProductLineItem';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// Import lucide icons
import { Building, Package, CheckCircle, Minus, Plus, Search, ChevronDown, ChevronUp, X, RotateCcw } from 'lucide-react';

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
  multipliers_material?: any;
  multipliers_hours?: any;
  created_at: string;
};
type OfferProductGroup = {
  group_id: string;
  description: string | null;
};

// Export these types for use in ProductLineItem component
export type OfferProduct = {
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
  tags: string[];
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
export type OfferLineItem = {
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
  stunden_meister_per_unit: number;
  stunden_geselle_per_unit: number;
  stunden_monteur_per_unit: number;
  quantity: number;
  image: string | null;
  localMarkup?: number; // Local override for aufschlag_prozent (stored as percentage, e.g., 40 = 40%)
  localPurchasePrice?: number; // Local override for unit_price
  isSonderprodukt?: boolean; // Flag for custom/special products
};

// --- COMPONENT STATE ---
export function ElektrosanierungConfigurator() {
  // State for selected location
  const [selectedLocId, setSelectedLocId] = useState<string>('1');
  const [availableLocs, setAvailableLocs] = useState<{ loc_id: string; name: string }[]>([]);
  const [rates, setRates] = useState<any>(null);
  
  // State for wage overrides at offer level
  const [wagesOverride, setWagesOverride] = useState<{
    meister?: number;
    geselle?: number;
    monteur?: number;
  }>({});
  
  // Display values for wage inputs (floating edit)
  const [meisterWageDisplay, setMeisterWageDisplay] = useState<string>('');
  const [geselleWageDisplay, setGeselleWageDisplay] = useState<string>('');
  const [monteurWageDisplay, setMonteurWageDisplay] = useState<string>('');
  
  // Previous values for wage inputs
  const [prevMeisterWage, setPrevMeisterWage] = useState<number>(0);
  const [prevGeselleWage, setPrevGeselleWage] = useState<number>(0);
  const [prevMonteurWage, setPrevMonteurWage] = useState<number>(0);
  
  // State for collapsible product sections
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [showProductsForInstance, setShowProductsForInstance] = useState<Set<string>>(new Set());

  // State for global parameters (dynamically populated from database)
  const [globalParams, setGlobalParams] = useState<Record<string, any>>({
    baujahr: true, // true = Altbau, false = Neubau
    anzahl_nutzungseinheiten: 1,
    qualitaetsstufe: 'Standard',
    qualitaetsfaktor: 'Standard' // Synced with qualitaetsstufe for multiplier calculations
  });

  // State for data from all four tables
  const [availablePackages, setAvailablePackages] = useState<OfferPackage[]>([]);
  const [packageItems, setPackageItems] = useState<OfferPackageItem[]>([]);
  const [productGroups, setProductGroups] = useState<OfferProductGroup[]>([]);
  const [products, setProducts] = useState<OfferProduct[]>([]);
  const [productsPrices, setProductsPrices] = useState<Record<string, any>>({});

  // State for dynamic parameters
  const [paramLinks, setParamLinks] = useState<any[]>([]);
  const [paramDefs, setParamDefs] = useState<OfferPackageParameterDefinition[]>([]);

  // State to track selected packages with their parameters
  const [selectedPackages, setSelectedPackages] = useState<{
    instanceId: string;
    package_id: number;
    name: string;
    package_name: string;
    parameters: Record<string, any>;
  }[]>([]);

  // State to hold the offer line items
  const [offerLineItems, setOfferLineItems] = useState<OfferLineItem[]>([]);

  // State for detail view
  const [detailsPackageId, setDetailsPackageId] = useState<number | null>(null);
  const [showAddProduct, setShowAddProduct] = useState<number | null>(null);
  const [showAddSoneparProduct, setShowAddSoneparProduct] = useState<number | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [soneparSearchTerm, setSoneparSearchTerm] = useState('');
  const [soneparResults, setSoneparResults] = useState<any[]>([]);
  const [isSearchingSonepar, setIsSearchingSonepar] = useState(false);
  
  // State for image dialog
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  
  // State for Sonderprodukt dialog
  const [sonderproduktDialogOpen, setSonderproduktDialogOpen] = useState(false);
  const [sonderproduktForm, setSonderproduktForm] = useState({
    name: '',
    description: '',
    unit: 'Stück',
    unit_price: 0,
    quantity: 1,
    stunden_meister: 0,
    stunden_geselle: 0,
    stunden_monteur: 0,
    instanceId: '' as string
  });
  
  // State for category expansion within packages
  const [expandedCategories, setExpandedCategories] = useState<Record<string, Set<string>>>({});
  const [expandedSummaryPackages, setExpandedSummaryPackages] = useState<Set<number>>(new Set());
  const [expandedSummaryCategories, setExpandedSummaryCategories] = useState<Record<number, Set<string>>>({});

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const {
    addItem
  } = useCart();

  // Fetch rates when location changes
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('offers_rates')
          .select('*')
          .eq('loc_id', selectedLocId)
          .maybeSingle();

        if (error) throw error;
        setRates(data);
        
        // Initialize wage displays when rates are loaded
        if (data) {
          const formatNumber = (value: number) => {
            return new Intl.NumberFormat('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(value);
          };
          
          setMeisterWageDisplay(formatNumber(data.stundensatz_meister));
          setGeselleWageDisplay(formatNumber(data.stundensatz_geselle));
          setMonteurWageDisplay(formatNumber(data.stundensatz_monteur));
        }
      } catch (err: any) {
        console.error('Error fetching rates:', err);
        toast({
          title: "Fehler",
          description: "Raten konnten nicht geladen werden.",
          variant: "destructive",
        });
      }
    };

    fetchRates();
  }, [selectedLocId, toast]);

  // Data fetching from all tables including parameter tables
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data from all seven tables concurrently using Promise.all
        const [packagesResult, packageItemsResult, productGroupsResult, productsResult, paramLinksResult, paramDefsResult, productsPricesResult] = await Promise.all([
          supabase.from('offers_packages').select('*').order('category', { ascending: true }).order('name', { ascending: true }),
          supabase.from('offers_package_items').select('*'),
          supabase.from('offers_product_groups').select('group_id, description, category'),
          supabase.from('offers_products').select('*').order('category', { ascending: true }).order('name', { ascending: true }),
          supabase.from('offers_package_parameter_links').select('*'),
          supabase.from('offers_package_parameter_definitions').select('*'),
          supabase.from('offers_products_prices').select('*')
        ]);

        // Fetch rates and locations separately to avoid type issues
        const ratesResult = await (supabase as any).from('offers_rates').select('*');
        const locsResult = await supabase.from('locs').select('id, name');

        // Check for errors in any of the requests
        if (packagesResult.error) throw packagesResult.error;
        if (packageItemsResult.error) throw packageItemsResult.error;
        if (productGroupsResult.error) throw productGroupsResult.error;
        if (productsResult.error) throw productsResult.error;
        if (paramLinksResult.error) throw paramLinksResult.error;
        if (paramDefsResult.error) throw paramDefsResult.error;
        if (productsPricesResult.error) throw productsPricesResult.error;

        // Update state with fetched data
        if (packagesResult.data) setAvailablePackages(packagesResult.data);
        if (packageItemsResult.data) {
          console.log('Package items data:', packageItemsResult.data);
          setPackageItems(packageItemsResult.data);
        }
        if (productGroupsResult.data) setProductGroups(productGroupsResult.data as any);
        if (productsResult.data) {
          console.log('Products data:', productsResult.data);
          // Map products and include category from product_groups
          const productsWithCategory = productsResult.data.map(product => {
            const productGroup = (productGroupsResult.data as any)?.find(
              (pg: any) => pg.group_id === product.produkt_gruppe
            );
            return {
              ...product,
              image: (product as any).image || null,
              tags: (product as any).tags || [],
              category: productGroup?.category || null
            };
          });
          setProducts(productsWithCategory);
        }
        if (paramLinksResult.data) {
          console.log('Parameter links data:', paramLinksResult.data);
          setParamLinks(paramLinksResult.data);
        }
        if (paramDefsResult.data) {
          console.log('Parameter definitions data:', paramDefsResult.data);
          setParamDefs(paramDefsResult.data);
        }
        if (productsPricesResult.data) {
          // Convert array to map for faster lookup
          const pricesMap: Record<string, any> = {};
          productsPricesResult.data.forEach((row: any) => {
            pricesMap[row.product_id] = row;
          });
          setProductsPrices(pricesMap);
        }

        // Check for errors in rates and locs
        if (ratesResult.error) throw ratesResult.error;
        if (locsResult.error) throw locsResult.error;

        // Process locations from rates
        if (ratesResult.data && locsResult.data) {
          const locsMap = new Map(locsResult.data.map((loc: any) => [loc.id.toString(), loc.name]));
          const locations = ratesResult.data.map((rate: any) => ({
            loc_id: rate.loc_id,
            name: locsMap.get(rate.loc_id) || rate.loc_id
          }));
          setAvailableLocs(locations);

          // Set first location as default
          if (locations.length > 0) {
            setSelectedLocId(locations[0].loc_id);
          }
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

  // Debounced Sonepar search
  useEffect(() => {
    const performSoneparSearch = async () => {
      if (soneparSearchTerm.length < 3) {
        setSoneparResults([]);
        return;
      }
      
      setIsSearchingSonepar(true);
      try {
        const searchPattern = `%${soneparSearchTerm}%`;
        const { data, error } = await supabase
          .from('offers_datanorm_sonepar')
          .select('*')
          .or(`Bezeichnung.ilike.${searchPattern},Artikelnummer.ilike.${searchPattern},Kurzcode.ilike.${searchPattern}`)
          .limit(50);
        
        if (error) {
          console.error('Sonepar search error:', error);
          throw error;
        }
        setSoneparResults(data || []);
      } catch (err: any) {
        console.error('Error searching Sonepar products:', err);
        toast({
          title: "Fehler",
          description: `Sonepar Produkte konnten nicht gesucht werden: ${err.message || 'Unbekannter Fehler'}`,
          variant: "destructive",
        });
        setSoneparResults([]);
      } finally {
        setIsSearchingSonepar(false);
      }
    };
    
    const timeoutId = setTimeout(performSoneparSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [soneparSearchTerm, toast]);

  // Helper: Build factor column key from location name
  const factorColumnKey = (locName: string): string => {
    return `${locName} factor`;
  };

  // Helper: Get entity-specific pricing for a product
  const getEntityPricing = (productId: string, currentLocName: string): { 
    basePrice: number; 
    factor: number; 
    effectivePrice: number;
    missingColumn: boolean;
    missingPrice: boolean;
  } => {
    const priceRow = productsPrices[productId];
    
    if (!priceRow) {
      return { basePrice: 0, factor: 1.0, effectivePrice: 0, missingColumn: false, missingPrice: true };
    }

    const basePrice = priceRow.unit_price ?? 0;
    const exactKey = factorColumnKey(currentLocName);
    
    // Try exact match first
    let factor = priceRow[exactKey];
    let missingColumn = false;

    // If not found, try case-insensitive fallback
    if (factor === undefined || factor === null) {
      const keys = Object.keys(priceRow);
      const normalizedKey = exactKey.toLowerCase();
      const foundKey = keys.find(k => k.toLowerCase() === normalizedKey);
      
      if (foundKey) {
        factor = priceRow[foundKey];
      } else {
        factor = 1.0;
        missingColumn = true;
      }
    }

    // Parse factor as number, default to 1.0 if invalid
    const numericFactor = typeof factor === 'number' && !isNaN(factor) ? factor : 1.0;
    const effectivePrice = Math.round(basePrice * numericFactor * 100) / 100;

    return { 
      basePrice, 
      factor: numericFactor, 
      effectivePrice,
      missingColumn,
      missingPrice: basePrice === 0
    };
  };

  // Get current location name for pricing
  const getCurrentLocName = (): string => {
    const loc = availableLocs.find(l => l.loc_id === selectedLocId);
    return loc?.name || '';
  };

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
      
      // Initialize instance parameters with default values from paramDefs
      const initialInstanceParams: Record<string, any> = {};
      const packageParamKeys = paramLinks
        .filter(link => link.package_id === packageData.id)
        .map(link => link.param_key);
      
      packageParamKeys.forEach(paramKey => {
        const paramDef = paramDefs.find(def => def.param_key === paramKey);
        if (paramDef && !paramDef.is_global) {
          // Initialize with default value
          if (paramDef.param_type === 'boolean') {
            initialInstanceParams[paramKey] = false;
          } else if (paramDef.default_value) {
            initialInstanceParams[paramKey] = paramDef.param_type === 'number' 
              ? Number(paramDef.default_value) 
              : paramDef.default_value;
          }
        }
      });
      
      const newSelectedPackage = {
        instanceId,
        package_id: packageData.id,
        name: packageData.name,
        package_name: packageData.name,
        parameters: initialInstanceParams
      };
      setSelectedPackages(prev => [...prev, newSelectedPackage]);

      // Resolve all products for this package and add to offer line items
      const packageItemsForPackage = packageItems.filter(item => item.package_id === packageData.id);
      const newLineItems: OfferLineItem[] = [];
      packageItemsForPackage.forEach(item => {
        // Implement fallback hierarchy: selected quality → package quality → Standard → Basic
        // Also filter by location tags
        let product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === globalParams.qualitaetsstufe && isProductAvailableForLocation(prod));
        
        if (!product && packageData.quality_level) {
          product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === packageData.quality_level && isProductAvailableForLocation(prod));
        }
        
        if (!product) {
          product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === 'Standard' && isProductAvailableForLocation(prod));
        }
        
        if (!product) {
          product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === 'Basic' && isProductAvailableForLocation(prod));
        }
        
        if (product) {
          // Calculate quantity: start with quantity_base and ADD multiplier terms
          let calculatedQuantity = item.quantity_base || 0;
          
          // Merge global and instance parameters for calculations
          const allParams = { ...globalParams, ...newSelectedPackage.parameters };
          
          // Apply material multipliers with formula parser (supports "param" and "param1 * param2")
          if (item.multipliers_material && typeof item.multipliers_material === 'object') {
            const multipliers = item.multipliers_material as Record<string, any>;
            
            for (const formulaKey in multipliers) {
              const factor = multipliers[formulaKey];
              
              // Check if factor is an object (lookup table for additive values)
              if (typeof factor === 'object' && factor !== null) {
                // Object-based additive: look up the parameter value in the object
                const paramValue = allParams[formulaKey];
                if (paramValue !== undefined && paramValue !== null) {
                  const additiveValue = factor[String(paramValue)];
                  if (additiveValue !== undefined) {
                    calculatedQuantity += Number(additiveValue);
                  }
                }
              } else if (typeof factor === 'number') {
                // Number-based multiplicative: use existing formula logic
                // Split the formula key by '*' to get individual parameter names
                const paramNames = formulaKey.split('*').map(name => name.trim());
                
                // Calculate the term value by multiplying all parameter values
                let termValue = 1.0;
                let allParamsFound = true;
                
                for (const paramName of paramNames) {
                  if (allParams[paramName] !== undefined && allParams[paramName] !== null) {
                    // Convert boolean to 1/0 for calculations
                    const paramValue = typeof allParams[paramName] === 'boolean'
                      ? (allParams[paramName] ? 1 : 0)
                      : allParams[paramName];
                    
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
          }

          // Calculate hours multiplier: start with base 1 and ADD multiplier terms
          let hoursMultiplier = 1.0;
          
          // Apply hours multipliers (e.g., {"altbau": 0.2} means +20% if altbau is true)
          if (item.multipliers_hours && typeof item.multipliers_hours === 'object') {
            const multipliers = item.multipliers_hours as Record<string, any>;
            
            for (const formulaKey in multipliers) {
              // Skip the "floor" key - it's handled separately
              if (formulaKey === 'floor') continue;
              
              const factor = multipliers[formulaKey];
              
              // Check if factor is an object (lookup table for additive values)
              if (typeof factor === 'object' && factor !== null) {
                // Object-based additive: look up the parameter value in the object
                const paramValue = allParams[formulaKey];
                if (paramValue !== undefined && paramValue !== null) {
                  const additiveValue = factor[String(paramValue)];
                  if (additiveValue !== undefined) {
                    hoursMultiplier += Number(additiveValue);
                  }
                }
              } else if (typeof factor === 'number') {
                // Number-based multiplicative: use existing formula logic
                // Split the formula key by '*' to get individual parameter names
                const paramNames = formulaKey.split('*').map(name => name.trim());
                
                // Calculate the term value by multiplying all parameter values
                let termValue = 1.0;
                let allParamsFound = true;
                
                for (const paramName of paramNames) {
                  if (allParams[paramName] !== undefined && allParams[paramName] !== null) {
                    // Convert boolean to 1/0 for calculations
                    const paramValue = typeof allParams[paramName] === 'boolean'
                      ? (allParams[paramName] ? 1 : 0)
                      : allParams[paramName];
                    
                    termValue *= paramValue;
                  } else {
                    allParamsFound = false;
                    termValue = 0;
                    break;
                  }
                }
                
                // ADD the final term (termValue * factor) to hours multiplier
                if (allParamsFound || termValue !== 0) {
                  hoursMultiplier += termValue * factor;
                }
              }
            }
            
            // Apply floor if specified - prevents multiplier from going below minimum
            if (multipliers.floor !== undefined) {
              hoursMultiplier = Math.max(hoursMultiplier, multipliers.floor);
            }
          }
          
          newLineItems.push({
            id: `${instanceId}-${product.product_id}-${Math.random()}`,
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
          stunden_meister: product.stunden_meister * hoursMultiplier * calculatedQuantity,
          stunden_geselle: product.stunden_geselle * hoursMultiplier * calculatedQuantity,
          stunden_monteur: product.stunden_monteur * hoursMultiplier * calculatedQuantity,
          stunden_meister_per_unit: product.stunden_meister * hoursMultiplier,
          stunden_geselle_per_unit: product.stunden_geselle * hoursMultiplier,
          stunden_monteur_per_unit: product.stunden_monteur * hoursMultiplier,
          quantity: Math.round(calculatedQuantity),
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

  // Handler function to add another instance of an already selected package
  const handleAddAnotherInstance = (packageData: OfferPackage) => {
    // Create a new selected package instance with parameters
    const instanceId = `${packageData.id}-${Date.now()}`;
    
    // Initialize instance parameters with default values from paramDefs
    const initialInstanceParams: Record<string, any> = {};
    const packageParamKeys = paramLinks
      .filter(link => link.package_id === packageData.id)
      .map(link => link.param_key);
    
    packageParamKeys.forEach(paramKey => {
      const paramDef = paramDefs.find(def => def.param_key === paramKey);
      if (paramDef && !paramDef.is_global) {
        // Initialize with default value
        if (paramDef.param_type === 'boolean') {
          initialInstanceParams[paramKey] = false;
        } else if (paramDef.default_value) {
          initialInstanceParams[paramKey] = paramDef.param_type === 'number' 
            ? Number(paramDef.default_value) 
            : paramDef.default_value;
        }
      }
    });
    
    const newSelectedPackage = {
      instanceId,
      package_id: packageData.id,
      name: packageData.name,
      package_name: packageData.name,
      parameters: initialInstanceParams
    };
    setSelectedPackages(prev => [...prev, newSelectedPackage]);

    // Resolve all products for this package and add to offer line items
    const packageItemsForPackage = packageItems.filter(item => item.package_id === packageData.id);
    const newLineItems: OfferLineItem[] = [];
    packageItemsForPackage.forEach(item => {
      // Implement fallback hierarchy: selected quality → package quality → Standard → Basic
      // Also filter by location tags
      let product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === globalParams.qualitaetsstufe && isProductAvailableForLocation(prod));
      
      if (!product && packageData.quality_level) {
        product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === packageData.quality_level && isProductAvailableForLocation(prod));
      }
      
      if (!product) {
        product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === 'Standard' && isProductAvailableForLocation(prod));
      }
      
      if (!product) {
        product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === 'Basic' && isProductAvailableForLocation(prod));
      }
      
      if (product) {
        // Calculate quantity: start with quantity_base and ADD multiplier terms
        let calculatedQuantity = item.quantity_base || 0;
        
        // Merge global and instance parameters for calculations
        const allParams = { ...globalParams, ...newSelectedPackage.parameters };
        
        // Apply material multipliers with formula parser (supports "param" and "param1 * param2")
        if (item.multipliers_material && typeof item.multipliers_material === 'object') {
          const multipliers = item.multipliers_material as Record<string, any>;
          
          for (const formulaKey in multipliers) {
            const factor = multipliers[formulaKey];
            
            // Check if factor is an object (lookup table for additive values)
            if (typeof factor === 'object' && factor !== null) {
              // Object-based additive: look up the parameter value in the object
              const paramValue = allParams[formulaKey];
              if (paramValue !== undefined && paramValue !== null) {
                const additiveValue = factor[String(paramValue)];
                if (additiveValue !== undefined) {
                  calculatedQuantity += Number(additiveValue);
                }
              }
            } else if (typeof factor === 'number') {
              // Number-based multiplicative: use existing formula logic
              // Split the formula key by '*' to get individual parameter names
              const paramNames = formulaKey.split('*').map(name => name.trim());
              
              // Calculate the term value by multiplying all parameter values
              let termValue = 1.0;
              let allParamsFound = true;
              
              for (const paramName of paramNames) {
                if (allParams[paramName] !== undefined && allParams[paramName] !== null) {
                  // Convert boolean to 1/0 for calculations
                  const paramValue = typeof allParams[paramName] === 'boolean'
                    ? (allParams[paramName] ? 1 : 0)
                    : allParams[paramName];
                  
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
        }

        // Calculate hours multiplier: start with base 1 and ADD multiplier terms
        let hoursMultiplier = 1.0;
        
        // Apply hours multipliers (e.g., {"altbau": 0.2} means +20% if altbau is true)
        if (item.multipliers_hours && typeof item.multipliers_hours === 'object') {
          const multipliers = item.multipliers_hours as Record<string, any>;
          
          for (const formulaKey in multipliers) {
            // Skip the "floor" key - it's handled separately
            if (formulaKey === 'floor') continue;
            
            const factor = multipliers[formulaKey];
            
            // Check if factor is an object (lookup table for additive values)
            if (typeof factor === 'object' && factor !== null) {
              // Object-based additive: look up the parameter value in the object
              const paramValue = allParams[formulaKey];
              if (paramValue !== undefined && paramValue !== null) {
                const additiveValue = factor[String(paramValue)];
                if (additiveValue !== undefined) {
                  hoursMultiplier += Number(additiveValue);
                }
              }
            } else if (typeof factor === 'number') {
              // Number-based multiplicative: use existing formula logic
              // Split the formula key by '*' to get individual parameter names
              const paramNames = formulaKey.split('*').map(name => name.trim());
              
              // Calculate the term value by multiplying all parameter values
              let termValue = 1.0;
              let allParamsFound = true;
              
              for (const paramName of paramNames) {
                if (allParams[paramName] !== undefined && allParams[paramName] !== null) {
                  // Convert boolean to 1/0 for calculations
                  const paramValue = typeof allParams[paramName] === 'boolean'
                    ? (allParams[paramName] ? 1 : 0)
                    : allParams[paramName];
                  
                  termValue *= paramValue;
                } else {
                  allParamsFound = false;
                  termValue = 0;
                  break;
                }
              }
              
              // ADD the final term (termValue * factor) to hours multiplier
              if (allParamsFound || termValue !== 0) {
                hoursMultiplier += termValue * factor;
              }
            }
          }
          
          // Apply floor if specified - prevents multiplier from going below minimum
          if (multipliers.floor !== undefined) {
            hoursMultiplier = Math.max(hoursMultiplier, multipliers.floor);
          }
        }
        
        newLineItems.push({
          id: `${instanceId}-${product.product_id}-${Math.random()}`,
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
          stunden_meister: product.stunden_meister * hoursMultiplier * calculatedQuantity,
          stunden_geselle: product.stunden_geselle * hoursMultiplier * calculatedQuantity,
          stunden_monteur: product.stunden_monteur * hoursMultiplier * calculatedQuantity,
          stunden_meister_per_unit: product.stunden_meister * hoursMultiplier,
          stunden_geselle_per_unit: product.stunden_geselle * hoursMultiplier,
          stunden_monteur_per_unit: product.stunden_monteur * hoursMultiplier,
          quantity: Math.round(calculatedQuantity),
          image: product.image
        });
      }
    });
    setOfferLineItems(prev => [...prev, ...newLineItems]);
    
    toast({
      title: "Paket hinzugefügt",
      description: `${packageData.name} wurde erneut hinzugefügt.`,
    });
  };

  // Handler function to remove a specific package instance
  const handleRemovePackageInstance = (instanceId: string) => {
    // Remove the instance from selectedPackages
    setSelectedPackages(prev => prev.filter(p => p.instanceId !== instanceId));
    // Remove all line items associated with this instance
    setOfferLineItems(prev => prev.filter(item => !item.id.startsWith(instanceId)));
  };

  // Format currency in Euro (de-DE)
  const formatEuro = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Handler for local purchase price override
  const handleLocalPurchasePriceChange = (itemId: string, newPrice: number | undefined) => {
    setOfferLineItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, localPurchasePrice: newPrice } : item
    ));
  };

  // Handler for local markup override
  const handleLocalMarkupChange = (itemId: string, newMarkup: number | undefined) => {
    setOfferLineItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, localMarkup: newMarkup } : item
    ));
  };

  // Reset local markup to global
  const handleResetMarkup = (itemId: string) => {
    setOfferLineItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, localMarkup: undefined } : item
    ));
  };

  // Get effective purchase price for an item (with entity-specific pricing)
  const getEffectivePurchasePrice = (item: OfferLineItem): number => {
    if (item.localPurchasePrice !== undefined) {
      return item.localPurchasePrice;
    }
    const currentLocName = getCurrentLocName();
    const pricing = getEntityPricing(item.product_id, currentLocName);
    return pricing.effectivePrice;
  };

  // Get effective markup for an item (returns percentage, e.g., 40 = 40%)
  const getEffectiveMarkup = (item: OfferLineItem): number => {
    return item.localMarkup ?? (rates?.aufschlag_prozent || 0);
  };

  // Calculate sales price per unit (converts percentage to multiplier)
  const calculateSalesPricePerUnit = (item: OfferLineItem): number => {
    const basePrice = getEffectivePurchasePrice(item);
    const markupPercentage = getEffectiveMarkup(item);
    const multiplier = 1 + (markupPercentage / 100);
    return basePrice * multiplier;
  };

  // Calculate total sales price
  const calculateTotalSalesPrice = (item: OfferLineItem): number => {
    return calculateSalesPricePerUnit(item) * item.quantity;
  };

  // Handler function for parameter changes - now instance-specific
  const handleParameterChange = (instanceId: string, paramKey: string, value: any) => {
    setSelectedPackages(prev => prev.map(pkg => pkg.instanceId === instanceId ? {
      ...pkg,
      parameters: {
        ...pkg.parameters,
        [paramKey]: value
      }
    } : pkg));
  };

  // Recalculate line items whenever parameters change
  useEffect(() => {
    if (selectedPackages.length === 0 || products.length === 0 || packageItems.length === 0) return;
    
    const recalculatedLineItems: OfferLineItem[] = [];
    
    selectedPackages.forEach(selectedPackage => {
      const packageData = availablePackages.find(pkg => pkg.id === selectedPackage.package_id);
      if (!packageData) return;
      
      const packageItemsForPackage = packageItems.filter(item => item.package_id === packageData.id);
      
      packageItemsForPackage.forEach(item => {
        // Find product with fallback hierarchy
        // Also filter by location tags
        let product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === globalParams.qualitaetsstufe && isProductAvailableForLocation(prod));
        
        if (!product && packageData.quality_level) {
          product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === packageData.quality_level && isProductAvailableForLocation(prod));
        }
        
        if (!product) {
          product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === 'Standard' && isProductAvailableForLocation(prod));
        }
        
        if (!product) {
          product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === 'Basic' && isProductAvailableForLocation(prod));
        }
        
        if (product) {
          // Calculate quantity with merged parameters
          let calculatedQuantity = item.quantity_base || 0;
          const allParams = { ...globalParams, ...selectedPackage.parameters };
          
          // Apply material multipliers
          if (item.multipliers_material && typeof item.multipliers_material === 'object') {
            const multipliers = item.multipliers_material as Record<string, any>;
            
            for (const formulaKey in multipliers) {
              const factor = multipliers[formulaKey];
              
              if (typeof factor === 'object' && factor !== null) {
                const paramValue = allParams[formulaKey];
                if (paramValue !== undefined && paramValue !== null) {
                  const additiveValue = factor[String(paramValue)];
                  if (additiveValue !== undefined) {
                    calculatedQuantity += Number(additiveValue);
                  }
                }
              } else if (typeof factor === 'number') {
                const paramNames = formulaKey.split('*').map(name => name.trim());
                let termValue = 1.0;
                let allParamsFound = true;
                
                for (const paramName of paramNames) {
                  if (allParams[paramName] !== undefined && allParams[paramName] !== null) {
                    const paramValue = typeof allParams[paramName] === 'boolean'
                      ? (allParams[paramName] ? 1 : 0)
                      : allParams[paramName];
                    termValue *= paramValue;
                  } else {
                    allParamsFound = false;
                    termValue = 0;
                    break;
                  }
                }
                
                if (allParamsFound || termValue !== 0) {
                  calculatedQuantity += termValue * factor;
                }
              }
            }
          }

          // Calculate hours multiplier
          let hoursMultiplier = 1.0;
          
          if (item.multipliers_hours && typeof item.multipliers_hours === 'object') {
            const multipliers = item.multipliers_hours as Record<string, any>;
            
            for (const formulaKey in multipliers) {
              if (formulaKey === 'floor') continue;
              
              const factor = multipliers[formulaKey];
              
              if (typeof factor === 'object' && factor !== null) {
                const paramValue = allParams[formulaKey];
                if (paramValue !== undefined && paramValue !== null) {
                  const additiveValue = factor[String(paramValue)];
                  if (additiveValue !== undefined) {
                    hoursMultiplier += Number(additiveValue);
                  }
                }
              } else if (typeof factor === 'number') {
                const paramNames = formulaKey.split('*').map(name => name.trim());
                let termValue = 1.0;
                let allParamsFound = true;
                
                for (const paramName of paramNames) {
                  if (allParams[paramName] !== undefined && allParams[paramName] !== null) {
                    const paramValue = typeof allParams[paramName] === 'boolean'
                      ? (allParams[paramName] ? 1 : 0)
                      : allParams[paramName];
                    termValue *= paramValue;
                  } else {
                    allParamsFound = false;
                    termValue = 0;
                    break;
                  }
                }
                
                if (allParamsFound || termValue !== 0) {
                  hoursMultiplier += termValue * factor;
                }
              }
            }
            
            if (multipliers.floor !== undefined) {
              hoursMultiplier = Math.max(hoursMultiplier, multipliers.floor);
            }
          }
          
          recalculatedLineItems.push({
            id: `${selectedPackage.instanceId}-${product.product_id}`,
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
            stunden_meister: product.stunden_meister * hoursMultiplier * calculatedQuantity,
            stunden_geselle: product.stunden_geselle * hoursMultiplier * calculatedQuantity,
            stunden_monteur: product.stunden_monteur * hoursMultiplier * calculatedQuantity,
            stunden_meister_per_unit: product.stunden_meister * hoursMultiplier,
            stunden_geselle_per_unit: product.stunden_geselle * hoursMultiplier,
            stunden_monteur_per_unit: product.stunden_monteur * hoursMultiplier,
            quantity: Math.round(calculatedQuantity),
            image: product.image
          });
        }
      });
    });
    
    setOfferLineItems(recalculatedLineItems);
  }, [selectedPackages, globalParams, products, packageItems, availablePackages]);

  // Handler function for quantity changes
  const handleQuantityChange = (lineItemId: string, newQuantity: number) => {
    setOfferLineItems(currentItems => currentItems.map(item => item.id === lineItemId ? {
      ...item,
      quantity: Math.max(1, newQuantity)
    } : item));
  };

  // Handler for hours changes
  const handleHoursChange = (itemId: string, role: 'meister' | 'geselle' | 'monteur', totalHours: number) => {
    setOfferLineItems(current => current.map(item => {
      if (item.id === itemId) {
        const perUnitHours = totalHours / (item.quantity || 1);
        if (role === 'meister') {
          return {
            ...item,
            stunden_meister_per_unit: perUnitHours,
            stunden_meister: totalHours
          };
        } else if (role === 'geselle') {
          return {
            ...item,
            stunden_geselle_per_unit: perUnitHours,
            stunden_geselle: totalHours
          };
        } else {
          return {
            ...item,
            stunden_monteur_per_unit: perUnitHours,
            stunden_monteur: totalHours
          };
        }
      }
      return item;
    }));
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
      stunden_meister: newProduct.stunden_meister * item.quantity,
      stunden_geselle: newProduct.stunden_geselle * item.quantity,
      stunden_monteur: newProduct.stunden_monteur * item.quantity,
      stunden_meister_per_unit: newProduct.stunden_meister,
      stunden_geselle_per_unit: newProduct.stunden_geselle,
      stunden_monteur_per_unit: newProduct.stunden_monteur
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
      stunden_meister_per_unit: product.stunden_meister,
      stunden_geselle_per_unit: product.stunden_geselle,
      stunden_monteur_per_unit: product.stunden_monteur,
      quantity: 1,
      image: product.image
    };
    setOfferLineItems(prev => [...prev, newLineItem]);
    setShowAddProduct(null);
    setProductSearchQuery('');
  };

  // Helper function to get packages by category
  const getPackagesByCategory = (category: string) => {
    return availablePackages.filter(pkg => pkg.category === category);
  };

  // Helper function to check if a package is selected
  const isPackageSelected = (packageId: number) => {
    return selectedPackages.some(p => p.package_id === packageId);
  };

  // Helper function to get all instances of a package
  const getPackageInstances = (packageId: number) => {
    return selectedPackages.filter(p => p.package_id === packageId);
  };

  // Helper function to get line items for a specific instance
  const getLineItemsForInstance = (instanceId: string) => {
    return offerLineItems.filter(item => item.id.startsWith(instanceId));
  };

  // Helper function to get line items for a package (for summary section)
  const getLineItemsForPackage = (packageId: number) => {
    return offerLineItems.filter(item => item.package_id === packageId);
  };

  // Helper function to get filtered products for adding to packages
  // Helper function to check if product is available for selected location
  const isProductAvailableForLocation = (product: OfferProduct) => {
    const selectedLoc = availableLocs.find(loc => loc.loc_id === selectedLocId);
    if (!selectedLoc) return true; // If no location selected, show all
    if (!product.tags || product.tags.length === 0) return false; // If product has no tags, hide it
    return product.tags.includes(selectedLoc.name);
  };

  const getFilteredProducts = () => {
    let filtered = products.filter(isProductAvailableForLocation);
    if (!productSearchQuery) return filtered;
    return filtered.filter(product => product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || product.description && product.description.toLowerCase().includes(productSearchQuery.toLowerCase()) || product.category && product.category.toLowerCase().includes(productSearchQuery.toLowerCase()));
  };

  // Helper function to get alternatives for a product group
  const getAlternatives = (produktGruppe: string) => {
    return products.filter(p => p.produkt_gruppe === produktGruppe && isProductAvailableForLocation(p));
  };
  
  // Group line items by category for a specific instance
  const groupLineItemsByCategory = (instanceId: string) => {
    const lineItems = getLineItemsForInstance(instanceId);
    const grouped: Record<string, typeof lineItems> = {};
    
    lineItems.forEach(item => {
      const category = item.category || '__uncategorized__';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    // Sort categories alphabetically, uncategorized last
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      if (a === '__uncategorized__') return 1;
      if (b === '__uncategorized__') return 1;
      return a.localeCompare(b, 'de');
    });
    
    return { grouped, sortedCategories };
  };
  
  // Toggle category expansion for a specific instance
  const toggleCategoryExpansion = (instanceId: string, category: string) => {
    setExpandedCategories(prev => {
      const instanceCategories = prev[instanceId] || new Set();
      const newSet = new Set(instanceCategories);
      
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      
      return {
        ...prev,
        [instanceId]: newSet
      };
    });
  };
  
  // Check if category is expanded for a specific instance
  const isCategoryExpanded = (instanceId: string, category: string) => {
    return expandedCategories[instanceId]?.has(category) || false;
  };

  // Handle Sonderprodukt creation
  const handleAddSonderprodukt = () => {
    if (!sonderproduktForm.name.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Produktnamen ein.",
        variant: "destructive"
      });
      return;
    }

    const sonderproduktId = `sonderprodukt-${Date.now()}`;
    const instanceId = sonderproduktForm.instanceId;
    const selectedPkg = selectedPackages.find(p => p.instanceId === instanceId);
    
    if (!selectedPkg) {
      toast({
        title: "Fehler",
        description: "Paket nicht gefunden.",
        variant: "destructive"
      });
      return;
    }

    const newLineItem: OfferLineItem = {
      id: sonderproduktId,
      package_id: selectedPkg.package_id,
      package_name: selectedPkg.package_name,
      product_id: sonderproduktId,
      name: sonderproduktForm.name,
      description: sonderproduktForm.description || null,
      unit: sonderproduktForm.unit,
      unit_price: sonderproduktForm.unit_price,
      category: 'Sonderprodukt',
      produkt_gruppe: null,
      qualitaetsstufe: null,
      stunden_meister: sonderproduktForm.stunden_meister * sonderproduktForm.quantity,
      stunden_geselle: sonderproduktForm.stunden_geselle * sonderproduktForm.quantity,
      stunden_monteur: sonderproduktForm.stunden_monteur * sonderproduktForm.quantity,
      stunden_meister_per_unit: sonderproduktForm.stunden_meister,
      stunden_geselle_per_unit: sonderproduktForm.stunden_geselle,
      stunden_monteur_per_unit: sonderproduktForm.stunden_monteur,
      quantity: sonderproduktForm.quantity,
      image: null,
      isSonderprodukt: true
    };

    setOfferLineItems(prev => [...prev, newLineItem]);
    
    // Reset form and close dialog
    setSonderproduktForm({
      name: '',
      description: '',
      unit: 'Stück',
      unit_price: 0,
      quantity: 1,
      stunden_meister: 0,
      stunden_geselle: 0,
      stunden_monteur: 0,
      instanceId: ''
    });
    setSonderproduktDialogOpen(false);
    
    toast({
      title: "Erfolgreich",
      description: "Sonderprodukt wurde hinzugefügt."
    });
  };

  const openSonderproduktDialog = (instanceId: string) => {
    setSonderproduktForm(prev => ({ ...prev, instanceId }));
    setSonderproduktDialogOpen(true);
  };

  // Helper function to get products for a package (client-side join)
  const getProductsForPackage = (packageId: number, qualitaetsstufe: string) => {
    // 1. Find all package items for this package
    const packageItemsForPackage = packageItems.filter(item => item.package_id === packageId);

    // 2. For each package item, find the corresponding product
    const productNames: string[] = [];
    packageItemsForPackage.forEach(item => {
      const product = products.find(prod => prod.produkt_gruppe === item.produkt_gruppe_id && prod.qualitaetsstufe === qualitaetsstufe && isProductAvailableForLocation(prod));
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
        global_parameters: globalParams,
        selected_package_ids: selectedPackages.map(p => p.package_id),
        loc_id: selectedLocId
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
          selectedPackages,
          loc_id: selectedLocId
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
  return (
    <div className="min-h-screen bg-background">
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
            {/* Location Selector */}
            <div className="col-span-2">
              <Label htmlFor="standort">LOC</Label>
              <Select 
                value={selectedLocId} 
                onValueChange={setSelectedLocId}
              >
                <SelectTrigger id="standort">
                  <SelectValue placeholder="LOC" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocs.map(loc => (
                    <SelectItem key={loc.loc_id} value={loc.loc_id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Keep Qualitätsstufe as hardcoded field */}
            <div>
              <Label htmlFor="qualitaetsstufe">Qualitätsstufe</Label>
              <Select 
                value={String(globalParams.qualitaetsstufe)} 
                onValueChange={value => {
                  handleGlobalParamChange('qualitaetsstufe', value);
                  // Sync qualitaetsfaktor to match qualitaetsstufe for multiplier calculations
                  handleGlobalParamChange('qualitaetsfaktor', value);
                }}
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
            {globalParamDefs.filter(def => def.param_key !== 'qualitaetsstufe' && def.param_key !== 'qualitaetsfaktor').map(def => {
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
                    const instances = getPackageInstances(pkg.id);
                    const requiredParams = paramLinks.filter(link => link.package_id === pkg.id);
                    
                    return <div key={pkg.id} className="space-y-3">
                            {/* Show unselected package with checkbox */}
                            {!isSelected && (
                              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                                <Checkbox checked={false} onCheckedChange={checked => handlePackageSelection(pkg, checked as boolean)} />
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
                            )}
                            
                            {/* Show each instance as a separate box */}
                            {instances.map((instance, index) => (
                              <div key={instance.instanceId}>
                                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                                  <Checkbox checked={true} onCheckedChange={() => handleRemovePackageInstance(instance.instanceId)} />
                                  <div className="flex-1">
                                    <h4 className="font-medium">{pkg.name}</h4>
                                    {pkg.description && <p className="text-sm text-muted-foreground">{pkg.description}</p>}
                                    {pkg.quality_level && <span className="text-xs bg-secondary px-2 py-1 rounded mr-2">
                                        {pkg.quality_level}
                                      </span>}
                                    {instances.length > 1 && <span className="text-xs text-muted-foreground">
                                        (Instanz {index + 1})
                                      </span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleAddAnotherInstance(pkg)}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Nochmal hinzufügen
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setDetailsPackageId(detailsPackageId === pkg.id ? null : pkg.id)}>
                                      Details
                                    </Button>
                                  </div>
                                </div>

                                {/* Parameter inputs for this specific instance */}
                                {requiredParams.length > 0 && (
                                  <div className="pl-8 mt-2 space-y-3 p-4 bg-muted/50 rounded-lg border">
                                    <h5 className="text-sm font-semibold text-foreground">Parameter für dieses Paket:</h5>
                                    {requiredParams.map(link => {
                                      const def = localParamDefs.find(d => d.param_key === link.param_key);
                                      if (!def) return null;
                                      const currentValue = instance.parameters[def.param_key] || def.default_value || '';
                                      return <div key={def.param_key} className="space-y-1">
                                          <Label htmlFor={`param-${instance.instanceId}-${def.param_key}`} className="text-sm font-medium">
                                            {def.label}
                                            {def.unit && <span className="text-muted-foreground ml-1">({def.unit})</span>}
                                          </Label>
                                          <Input 
                                            id={`param-${instance.instanceId}-${def.param_key}`} 
                                            type={def.param_type} 
                                            value={currentValue} 
                                            onChange={e => handleParameterChange(instance.instanceId, def.param_key, e.target.value)} 
                                            placeholder={`${def.label} eingeben...`} 
                                            className="max-w-xs" 
                                          />
                                        </div>;
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                            {/* Package details view - show for any instance */}
                            {detailsPackageId === pkg.id && instances.length > 0 && (
                              <div className="pl-8 mt-2">
                                <strong className="text-sm text-muted-foreground mb-3 block">Inhalt für '{globalParams.qualitaetsstufe}':</strong>
                                {instances.map((instance, idx) => {
                                  const lineItems = getLineItemsForInstance(instance.instanceId);
                                  const isProductsVisible = showProductsForInstance.has(instance.instanceId);
                                  
                                  return (
                                    <div key={instance.instanceId} className="mb-6">
                                      {instances.length > 1 && <h6 className="text-sm font-medium mb-2">Instanz {idx + 1}</h6>}
                                      
                                      {/* Group products by category */}
                                      <div className="space-y-3">
                                        {(() => {
                                          const { grouped, sortedCategories } = groupLineItemsByCategory(instance.instanceId);
                                          
                                          return sortedCategories.map(category => {
                                            const categoryItems = grouped[category];
                                            const isUncategorized = category === '__uncategorized__';
                                            const displayName = isUncategorized 
                                              ? 'Weitere Produkte' 
                                              : category;
                                            const isCatExpanded = isCategoryExpanded(instance.instanceId, category);
                                            
                                            return (
                                              <div key={category} className="border rounded-md overflow-hidden">
                                                <Collapsible
                                                  open={isCatExpanded}
                                                  onOpenChange={() => toggleCategoryExpansion(instance.instanceId, category)}
                                                >
                                                  <CollapsibleTrigger asChild>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="w-full justify-between hover:bg-accent/50 text-sm px-4 py-3"
                                                    >
                                                      <span className="flex items-center gap-2 font-medium">
                                                        <Package className="h-4 w-4" />
                                                        {displayName} ({categoryItems.length} {categoryItems.length === 1 ? 'Artikel' : 'Artikel'})
                                                      </span>
                                                      {isCatExpanded ? (
                                                        <ChevronUp className="h-4 w-4" />
                                                      ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                      )}
                                                    </Button>
                                                  </CollapsibleTrigger>

                                                  <CollapsibleContent className="border-t">
                                                    <div className="space-y-2 p-2">
                                                      {categoryItems.map(item => {
                                                        const isExpanded = expandedProducts.has(item.id);
                                                        
                                                        return (
                                                          <div key={item.id} className="bg-background border rounded-lg overflow-hidden">
                                                             <Collapsible
                                                               open={isExpanded}
                                                               onOpenChange={(open) => {
                                                                 setExpandedProducts(prev => {
                                                                   const newSet = new Set(prev);
                                                                   if (open) {
                                                                     newSet.add(item.id);
                                                                   } else {
                                                                     newSet.delete(item.id);
                                                                   }
                                                                   return newSet;
                                                                 });
                                                               }}
                                                             >
                                                               {/* Compact Product View */}
                                                               <CollapsibleTrigger asChild>
                                                                 <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                                                   <div className="flex items-center gap-4">
                                                                     {/* Product Image */}
                                                                     <div className="w-12 h-12 flex-shrink-0">
                                                                       {item.image ? (
                                                                         <img 
                                                                           src={item.image} 
                                                                           alt={item.name} 
                                                                           className="w-full h-full object-cover rounded border cursor-zoom-in hover:opacity-80 transition-opacity" 
                                                                           onClick={(e) => {
                                                                             e.stopPropagation();
                                                                             setSelectedImage({ url: item.image!, name: item.name });
                                                                             setImageDialogOpen(true);
                                                                           }}
                                                                         />
                                                                       ) : (
                                                                         <div className="w-full h-full bg-muted rounded border flex items-center justify-center">
                                                                           <Package className="h-6 w-6 text-muted-foreground" />
                                                                         </div>
                                                                       )}
                                                                     </div>

                                                                     {/* Compact Info */}
                                                                     <div className="flex-1 min-w-0">
                                                                       <h5 className="font-medium text-sm truncate">{item.name}</h5>
                                                                       <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                                                         <span>Menge: {item.quantity} {item.unit}</span>
                                                                         <span>Preis: {formatEuro(calculateTotalSalesPrice(item))}</span>
                                                                       </div>
                                                                     </div>

                                                                     {/* Expand Icon */}
                                                                     <div className="flex-shrink-0">
                                                                       {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                                     </div>
                                                                   </div>
                                                                 </div>
                                                               </CollapsibleTrigger>

                                                               {/* Expanded Product Details */}
                                                               <CollapsibleContent>
                                                                  <ProductLineItem
                                                                     item={item}
                                                                     alternatives={getAlternatives(item.produkt_gruppe || '')}
                                                                     globalMarkup={rates?.aufschlag_prozent || 0}
                                                                     onQuantityChange={handleQuantityChange}
                                                                    onProductSwap={handleProductSwap}
                                                                    onLocalPurchasePriceChange={handleLocalPurchasePriceChange}
                                                                    onLocalMarkupChange={handleLocalMarkupChange}
                                                                    onResetMarkup={handleResetMarkup}
                                                                    onRemove={handleRemoveLineItem}
                                                                    onHoursChange={handleHoursChange}
                                                                    entityPricing={getEntityPricing(item.product_id, getCurrentLocName())}
                                                                    currentLocName={getCurrentLocName()}
                                                                  />
                                                               </CollapsibleContent>
                                                             </Collapsible>
                                                          </div>
                                                        );
                                                      })}
                                                      
                                                      {/* Add product button within category */}
                                                      <div className="pt-2">
                                                        <Popover 
                                                          open={showAddProduct === pkg.id} 
                                                          onOpenChange={open => setShowAddProduct(open ? pkg.id : null)}
                                                        >
                                                          <PopoverTrigger asChild>
                                                            <Button variant="outline" size="sm" className="w-full">
                                                              <Plus className="h-4 w-4 mr-2" />
                                                              Produkt zu "{displayName}" hinzufügen
                                                            </Button>
                                                          </PopoverTrigger>
                                                          <PopoverContent className="w-80 p-0" align="start">
                                                            <div className="flex flex-col">
                                                              {/* Search Input */}
                                                              <div className="flex items-center border-b px-3 py-2">
                                                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                                <Input 
                                                                  placeholder="Produkte durchsuchen..." 
                                                                  value={productSearchQuery} 
                                                                  onChange={e => setProductSearchQuery(e.target.value)} 
                                                                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                                                                />
                                                              </div>
                                                              
                                                              {/* Product List */}
                                                              <div className="max-h-60 overflow-y-auto">
                                                                {getFilteredProducts().length === 0 ? (
                                                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                                                    Keine Produkte gefunden.
                                                                  </div>
                                                                ) : getFilteredProducts().map(product => (
                                                                  <div 
                                                                    key={product.product_id} 
                                                                    onClick={() => handleAddProduct(pkg.id, product.product_id)} 
                                                                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent transition-colors"
                                                                  >
                                                                    <div className="w-10 h-10 flex-shrink-0">
                                                                      {product.image ? (
                                                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded border" />
                                                                      ) : (
                                                                        <div className="w-full h-full bg-muted rounded border flex items-center justify-center">
                                                                          <Package className="h-5 w-5 text-muted-foreground" />
                                                                        </div>
                                                                      )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                      <div className="font-medium text-sm">{product.name}</div>
                                                                      {product.description && (
                                                                        <div className="text-xs text-muted-foreground truncate">{product.description}</div>
                                                                      )}
                                                                      <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-xs text-muted-foreground">{product.qualitaetsstufe}</span>
                                                                        <span className="text-xs font-medium">{product.unit_price?.toFixed(2)} € / {product.unit}</span>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                ))}
                                                              </div>
                                                            </div>
                                                          </PopoverContent>
                                                        </Popover>
                                                      </div>
                                                    </div>
                                                  </CollapsibleContent>
                                                </Collapsible>
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                      
                          {/* Global Add Product Buttons (outside categories) */}
                          <div className="p-3 border-2 border-dashed border-muted rounded-lg mt-3">
                            <div className="grid grid-cols-2 gap-2">
                              {/* Regular Product Addition */}
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
                                      <Input 
                                        placeholder="Produkte durchsuchen..." 
                                        value={productSearchQuery} 
                                        onChange={e => setProductSearchQuery(e.target.value)} 
                                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                                      />
                                    </div>
                                    
                                    {/* Product List */}
                                    <div className="max-h-60 overflow-y-auto">
                                      {getFilteredProducts().length === 0 ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                          Keine Produkte gefunden.
                                        </div>
                                      ) : getFilteredProducts().map(product => (
                                        <div 
                                          key={product.product_id} 
                                          onClick={() => handleAddProduct(pkg.id, product.product_id)} 
                                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent transition-colors"
                                        >
                                          <div className="w-10 h-10 flex-shrink-0">
                                            {product.image ? (
                                              <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded border" />
                                            ) : (
                                              <div className="w-full h-full bg-muted rounded border flex items-center justify-center">
                                                <Package className="h-5 w-5 text-muted-foreground" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">{product.name}</div>
                                            {product.description && (
                                              <div className="text-xs text-muted-foreground truncate">{product.description}</div>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-xs text-muted-foreground">{product.qualitaetsstufe}</span>
                                              <span className="text-xs font-medium">{product.unit_price?.toFixed(2)} € / {product.unit}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              
                              {/* Sonepar Product Addition */}
                              <Popover open={showAddSoneparProduct === pkg.id} onOpenChange={open => setShowAddSoneparProduct(open ? pkg.id : null)}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-full">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Sonepar Produkt
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                  <Command>
                                    <div className="flex items-center border-b px-3 py-2">
                                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                      <Input 
                                        placeholder="Mindestens 3 Zeichen..." 
                                        value={soneparSearchTerm} 
                                        onChange={e => setSoneparSearchTerm(e.target.value)} 
                                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                                      />
                                    </div>
                                    <CommandList>
                                      {isSearchingSonepar && (
                                        <div className="py-6 text-center text-sm">Suche läuft...</div>
                                      )}
                                      {!isSearchingSonepar && soneparResults.length === 0 && soneparSearchTerm.length >= 3 && (
                                        <CommandEmpty>Keine Produkte gefunden.</CommandEmpty>
                                      )}
                                      {!isSearchingSonepar && soneparSearchTerm.length < 3 && (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                          Geben Sie mindestens 3 Zeichen ein
                                        </div>
                                      )}
                                      {!isSearchingSonepar && soneparResults.length > 0 && (
                                        <CommandGroup>
                                          {soneparResults.map((product) => (
                                            <CommandItem
                                              key={product.Artikelnummer}
                                              value={product.Artikelnummer}
                                              onSelect={() => {
                                                toast({
                                                  title: "Sonderprodukt ausgewählt",
                                                  description: `${product.Bezeichnung || product.Artikelnummer}`,
                                                });
                                                setShowAddSoneparProduct(null);
                                                setSoneparSearchTerm('');
                                                // TODO: Add logic to add Sonepar product to configurator
                                              }}
                                              className="cursor-pointer"
                                            >
                                              <div className="flex flex-col gap-1 flex-1">
                                                <div className="font-medium text-sm">
                                                  {product.Bezeichnung || 'Keine Bezeichnung'}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                                                  <span>Art.-Nr.: {product.Artikelnummer}</span>
                                                  {product.Kurzcode && <span>• {product.Kurzcode}</span>}
                                                  {product.Listenpreis_EUR && (
                                                    <span>• {product.Listenpreis_EUR} €</span>
                                                  )}
                                                </div>
                                                {product.Warengruppe_Name && (
                                                  <div className="text-xs text-muted-foreground">
                                                    {product.Warengruppe_Name}
                                                  </div>
                                                )}
                                              </div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      )}
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              
                              {/* Custom Sonderprodukt Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openSonderproduktDialog(instance.instanceId)}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Sonderprodukt
                              </Button>
                            </div>
                          </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
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
              {offerLineItems.length === 0 ? (
                <p className="text-muted-foreground">Keine Pakete ausgewählt</p>
              ) : rates && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  {/* Package-level sections */}
                  {[...new Set(offerLineItems.map(item => item.package_id))].map(packageId => {
                    const packageItems = getLineItemsForPackage(packageId);
                    const packageName = packageItems[0]?.package_name || '';
                    const isPackageExpanded = expandedSummaryPackages.has(packageId);
                    
                    // Group items by category within this package
                    const categorizedItems = packageItems.reduce((acc, item) => {
                      const category = item.category || '__uncategorized__';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(item);
                      return acc;
                    }, {} as Record<string, typeof packageItems>);
                    
                    const categoryKeys = Object.keys(categorizedItems).sort((a, b) => {
                      if (a === '__uncategorized__') return 1;
                      if (b === '__uncategorized__') return 1;
                      return a.localeCompare(b);
                    });
                    
                    // Package-level calculations
                    const packageMaterialTotal = packageItems.reduce((sum, item) => {
                      const markupMultiplier = 1 + (rates.aufschlag_prozent / 100);
                      const finalUnitPrice = item.unit_price * markupMultiplier;
                      return sum + (finalUnitPrice * item.quantity);
                    }, 0);
                    
                    const packageMeisterHours = packageItems.reduce((sum, item) => sum + item.stunden_meister, 0);
                    const packageGesellHours = packageItems.reduce((sum, item) => sum + item.stunden_geselle, 0);
                    const packageMonteurHours = packageItems.reduce((sum, item) => sum + item.stunden_monteur, 0);
                    
                    const effectiveMeisterWage = (wagesOverride.meister !== undefined && isFinite(wagesOverride.meister)) 
                      ? wagesOverride.meister 
                      : rates.stundensatz_meister;
                    const effectiveGeselleWage = (wagesOverride.geselle !== undefined && isFinite(wagesOverride.geselle)) 
                      ? wagesOverride.geselle 
                      : rates.stundensatz_geselle;
                    const effectiveMonteurWage = (wagesOverride.monteur !== undefined && isFinite(wagesOverride.monteur)) 
                      ? wagesOverride.monteur 
                      : rates.stundensatz_monteur;
                    
                    const packageLaborTotal = (
                      packageMeisterHours * effectiveMeisterWage +
                      packageGesellHours * effectiveGeselleWage +
                      packageMonteurHours * effectiveMonteurWage
                    );
                    
                    return (
                      <div key={packageId} className="border rounded-md bg-background">
                        {/* Package Header */}
                        <button
                          onClick={() => {
                            setExpandedSummaryPackages(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(packageId)) {
                                newSet.delete(packageId);
                              } else {
                                newSet.add(packageId);
                              }
                              return newSet;
                            });
                          }}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium">{packageName}</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isPackageExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isPackageExpanded && (
                          <div className="px-4 pb-4 space-y-3">
                            {/* Categories within package */}
                            {categoryKeys.map(categoryKey => {
                              const categoryItems = categorizedItems[categoryKey];
                              const categoryName = categoryKey === '__uncategorized__' 
                                ? 'Ohne Kategorie' 
                                : categoryKey;
                              const categoryId = `${packageId}-${categoryKey}`;
                              const isCategoryExpanded = expandedSummaryCategories[packageId]?.has(categoryKey);
                              
                              return (
                                <div key={categoryKey} className="border-l-2 border-muted pl-3">
                                  <button
                                    onClick={() => {
                                      setExpandedSummaryCategories(prev => {
                                        const packageCategories = prev[packageId] || new Set();
                                        const newSet = new Set(packageCategories);
                                        if (newSet.has(categoryKey)) {
                                          newSet.delete(categoryKey);
                                        } else {
                                          newSet.add(categoryKey);
                                        }
                                        return { ...prev, [packageId]: newSet };
                                      });
                                    }}
                                    className="w-full flex items-center justify-between py-2 text-sm hover:text-primary transition-colors"
                                  >
                                    <span className="font-medium">Kategorie: {categoryName}</span>
                                    <ChevronDown className={`h-3 w-3 transition-transform ${isCategoryExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                  
                                  {isCategoryExpanded && (
                                    <div className="space-y-1 text-sm pl-2">
                                      {categoryItems.map(item => {
                                        const markupMultiplier = 1 + (rates.aufschlag_prozent / 100);
                                        const finalUnitPrice = item.unit_price * markupMultiplier;
                                        const itemTotal = finalUnitPrice * item.quantity;
                                        return (
                                          <div key={item.id} className="flex justify-between text-muted-foreground py-1">
                                            <span>{item.name} ({item.quantity} {item.unit})</span>
                                            <span className="font-medium">{itemTotal.toFixed(2)} €</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Package-level hours (read-only) */}
                            <div className="pt-2 border-t text-sm space-y-1">
                              <div className="font-medium mb-1">Arbeitsstunden (Paket):</div>
                              <div className="text-muted-foreground pl-2 space-y-0.5">
                                {packageMeisterHours > 0 && (
                                  <div>Meister: {packageMeisterHours.toFixed(2)} h</div>
                                )}
                                {packageGesellHours > 0 && (
                                  <div>Geselle: {packageGesellHours.toFixed(2)} h</div>
                                )}
                                {packageMonteurHours > 0 && (
                                  <div>Monteur: {packageMonteurHours.toFixed(2)} h</div>
                                )}
                              </div>
                            </div>
                            
                            {/* Package subtotals */}
                            <div className="pt-2 border-t text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Materialkosten gesamt:</span>
                                <span className="font-medium">{packageMaterialTotal.toFixed(2)} €</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Arbeitskosten gesamt:</span>
                                <span className="font-medium">{packageLaborTotal.toFixed(2)} €</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Global totals section at bottom */}
                  <div className="pt-4 border-t-2 border-border space-y-4">
                    {/* Editable hourly rates */}
                    <div>
                      <div className="font-medium mb-3">Stundensätze (€/h):</div>
                      <div className="space-y-2 pl-2">
                        {(() => {
                          const formatNumber = (value: number): string => {
                            return new Intl.NumberFormat('de-DE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }).format(value);
                          };
                          
                          const parseInput = (value: string): number | null => {
                            if (value === '') return null;
                            const normalized = value.replace(',', '.');
                            const parsed = parseFloat(normalized);
                            return isNaN(parsed) ? null : parsed;
                          };
                          
                          const isValidInput = (value: string): boolean => {
                            return /^[0-9]*[,.]?[0-9]*$/.test(value);
                          };
                          
                          const createWageHandlers = (
                            role: 'meister' | 'geselle' | 'monteur',
                            displayValue: string,
                            setDisplayValue: (val: string) => void,
                            prevValue: number,
                            setPrevValue: (val: number) => void,
                            currentValue: number
                          ) => ({
                            onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
                              setPrevValue(currentValue);
                              e.target.select();
                            },
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                              const value = e.target.value;
                              if (value === '' || isValidInput(value)) {
                                setDisplayValue(value);
                              }
                            },
                            onBlur: () => {
                              if (displayValue === '') {
                                setDisplayValue(formatNumber(prevValue));
                              } else {
                                const parsed = parseInput(displayValue);
                                if (parsed === null || isNaN(parsed) || parsed < 0) {
                                  setDisplayValue(formatNumber(prevValue));
                                } else {
                                  const finalValue = Math.round(parsed * 100) / 100;
                                  setDisplayValue(formatNumber(finalValue));
                                  setWagesOverride(prev => ({ ...prev, [role]: finalValue }));
                                }
                              }
                            },
                            onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                setDisplayValue(formatNumber(prevValue));
                                e.currentTarget.blur();
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                            }
                          });
                          
                          return (
                            <>
                              {/* Meister rate */}
                              <div className="flex items-center gap-2 text-sm">
                                <span className="w-20">Meister:</span>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*[,.]?[0-9]*"
                                  step="any"
                                  value={meisterWageDisplay}
                                  {...createWageHandlers(
                                    'meister',
                                    meisterWageDisplay,
                                    setMeisterWageDisplay,
                                    prevMeisterWage,
                                    setPrevMeisterWage,
                                    (wagesOverride.meister !== undefined && isFinite(wagesOverride.meister)) 
                                      ? wagesOverride.meister 
                                      : rates.stundensatz_meister
                                  )}
                                  className="h-8 w-24 text-right"
                                  aria-label="Meister Stundensatz"
                                />
                                <span className="text-xs">€/h</span>
                                {wagesOverride.meister !== undefined && (
                                  <button
                                    onClick={() => {
                                      setWagesOverride(prev => {
                                        const updated = { ...prev };
                                        delete updated.meister;
                                        return updated;
                                      });
                                      setMeisterWageDisplay(formatNumber(rates.stundensatz_meister));
                                    }}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                    title="Auf Supabase-Wert zurücksetzen"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              
                              {/* Geselle rate */}
                              <div className="flex items-center gap-2 text-sm">
                                <span className="w-20">Geselle:</span>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*[,.]?[0-9]*"
                                  step="any"
                                  value={geselleWageDisplay}
                                  {...createWageHandlers(
                                    'geselle',
                                    geselleWageDisplay,
                                    setGeselleWageDisplay,
                                    prevGeselleWage,
                                    setPrevGeselleWage,
                                    (wagesOverride.geselle !== undefined && isFinite(wagesOverride.geselle)) 
                                      ? wagesOverride.geselle 
                                      : rates.stundensatz_geselle
                                  )}
                                  className="h-8 w-24 text-right"
                                  aria-label="Geselle Stundensatz"
                                />
                                <span className="text-xs">€/h</span>
                                {wagesOverride.geselle !== undefined && (
                                  <button
                                    onClick={() => {
                                      setWagesOverride(prev => {
                                        const updated = { ...prev };
                                        delete updated.geselle;
                                        return updated;
                                      });
                                      setGeselleWageDisplay(formatNumber(rates.stundensatz_geselle));
                                    }}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                    title="Auf Supabase-Wert zurücksetzen"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              
                              {/* Monteur rate */}
                              <div className="flex items-center gap-2 text-sm">
                                <span className="w-20">Monteur:</span>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*[,.]?[0-9]*"
                                  step="any"
                                  value={monteurWageDisplay}
                                  {...createWageHandlers(
                                    'monteur',
                                    monteurWageDisplay,
                                    setMonteurWageDisplay,
                                    prevMonteurWage,
                                    setPrevMonteurWage,
                                    (wagesOverride.monteur !== undefined && isFinite(wagesOverride.monteur)) 
                                      ? wagesOverride.monteur 
                                      : rates.stundensatz_monteur
                                  )}
                                  className="h-8 w-24 text-right"
                                  aria-label="Monteur Stundensatz"
                                />
                                <span className="text-xs">€/h</span>
                                {wagesOverride.monteur !== undefined && (
                                  <button
                                    onClick={() => {
                                      setWagesOverride(prev => {
                                        const updated = { ...prev };
                                        delete updated.monteur;
                                        return updated;
                                      });
                                      setMonteurWageDisplay(formatNumber(rates.stundensatz_monteur));
                                    }}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                    title="Auf Supabase-Wert zurücksetzen"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Global material total */}
                    <div className="flex justify-between text-sm font-medium">
                      <span>Materialkosten gesamt:</span>
                      <span>{offerLineItems.reduce((sum, item) => {
                        const markupMultiplier = 1 + (rates.aufschlag_prozent / 100);
                        const finalUnitPrice = item.unit_price * markupMultiplier;
                        return sum + (finalUnitPrice * item.quantity);
                      }, 0).toFixed(2)} €</span>
                    </div>
                    
                    {/* Global labor totals */}
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Arbeitskosten gesamt:</div>
                      <div className="pl-2 space-y-1 text-sm">
                        {(() => {
                          const totalMeisterHours = offerLineItems.reduce((sum, item) => sum + item.stunden_meister, 0);
                          const totalGesellHours = offerLineItems.reduce((sum, item) => sum + item.stunden_geselle, 0);
                          const totalMonteurHours = offerLineItems.reduce((sum, item) => sum + item.stunden_monteur, 0);
                          
                          const effectiveMeisterWage = (wagesOverride.meister !== undefined && isFinite(wagesOverride.meister)) 
                            ? wagesOverride.meister 
                            : rates.stundensatz_meister;
                          const effectiveGeselleWage = (wagesOverride.geselle !== undefined && isFinite(wagesOverride.geselle)) 
                            ? wagesOverride.geselle 
                            : rates.stundensatz_geselle;
                          const effectiveMonteurWage = (wagesOverride.monteur !== undefined && isFinite(wagesOverride.monteur)) 
                            ? wagesOverride.monteur 
                            : rates.stundensatz_monteur;
                          
                          const meisterCost = totalMeisterHours * effectiveMeisterWage;
                          const geselleCost = totalGesellHours * effectiveGeselleWage;
                          const monteurCost = totalMonteurHours * effectiveMonteurWage;
                          const totalLaborCost = meisterCost + geselleCost + monteurCost;
                          
                          return (
                            <>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Meister</span>
                                <span>{meisterCost.toFixed(2)} €</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Geselle</span>
                                <span>{geselleCost.toFixed(2)} €</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Monteur</span>
                                <span>{monteurCost.toFixed(2)} €</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t font-medium text-foreground">
                                <span>Arbeitskosten gesamt:</span>
                                <span>{totalLaborCost.toFixed(2)} €</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Zwischensumme */}
                    <div className="flex justify-between pt-3 border-t-2 border-border font-semibold text-base">
                      <span>Zwischensumme:</span>
                      <span>{offerLineItems.reduce((sum, item) => {
                        const markupMultiplier = 1 + (rates.aufschlag_prozent / 100);
                        const finalUnitPrice = item.unit_price * markupMultiplier;
                        const materialCost = finalUnitPrice * item.quantity;
                        
                        const effectiveMeisterWage = (wagesOverride.meister !== undefined && isFinite(wagesOverride.meister)) 
                          ? wagesOverride.meister 
                          : rates.stundensatz_meister;
                        const effectiveGeselleWage = (wagesOverride.geselle !== undefined && isFinite(wagesOverride.geselle)) 
                          ? wagesOverride.geselle 
                          : rates.stundensatz_geselle;
                        const effectiveMonteurWage = (wagesOverride.monteur !== undefined && isFinite(wagesOverride.monteur)) 
                          ? wagesOverride.monteur 
                          : rates.stundensatz_monteur;
                        
                        const laborCost = (
                          (item.stunden_meister * effectiveMeisterWage) +
                          (item.stunden_geselle * effectiveGeselleWage) +
                          (item.stunden_monteur * effectiveMonteurWage)
                        );
                        return sum + materialCost + laborCost;
                      }, 0).toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="pt-4">
                <Button onClick={handleSubmit} className="w-full" disabled={offerLineItems.length === 0}>
                  In den Warenkorb
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedImage?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {selectedImage && (
              <img 
                src={selectedImage.url} 
                alt={selectedImage.name} 
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sonderprodukt Dialog */}
      <Dialog open={sonderproduktDialogOpen} onOpenChange={setSonderproduktDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sonderprodukt hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sonder-name">Produktname *</Label>
              <Input
                id="sonder-name"
                value={sonderproduktForm.name}
                onChange={(e) => setSonderproduktForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Spezial-Installation"
              />
            </div>
            
            <div>
              <Label htmlFor="sonder-description">Beschreibung</Label>
              <Input
                id="sonder-description"
                value={sonderproduktForm.description}
                onChange={(e) => setSonderproduktForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optionale Beschreibung"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sonder-unit">Einheit</Label>
                <Select
                  value={sonderproduktForm.unit}
                  onValueChange={(value) => setSonderproduktForm(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger id="sonder-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stück">Stück</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="m²">m²</SelectItem>
                    <SelectItem value="Set">Set</SelectItem>
                    <SelectItem value="Pauschal">Pauschal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="sonder-quantity">Menge</Label>
                <Input
                  id="sonder-quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={sonderproduktForm.quantity}
                  onChange={(e) => setSonderproduktForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="sonder-price">Einkaufspreis (€ pro Einheit)</Label>
              <Input
                id="sonder-price"
                type="number"
                min="0"
                step="0.01"
                value={sonderproduktForm.unit_price}
                onChange={(e) => setSonderproduktForm(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            
            <div className="border-t pt-4">
              <Label className="text-base font-medium mb-3 block">Arbeitsstunden (pro Einheit)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="sonder-meister">Meister (h)</Label>
                  <Input
                    id="sonder-meister"
                    type="number"
                    min="0"
                    step="0.01"
                    value={sonderproduktForm.stunden_meister}
                    onChange={(e) => setSonderproduktForm(prev => ({ ...prev, stunden_meister: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="sonder-geselle">Geselle (h)</Label>
                  <Input
                    id="sonder-geselle"
                    type="number"
                    min="0"
                    step="0.01"
                    value={sonderproduktForm.stunden_geselle}
                    onChange={(e) => setSonderproduktForm(prev => ({ ...prev, stunden_geselle: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="sonder-monteur">Monteur (h)</Label>
                  <Input
                    id="sonder-monteur"
                    type="number"
                    min="0"
                    step="0.01"
                    value={sonderproduktForm.stunden_monteur}
                    onChange={(e) => setSonderproduktForm(prev => ({ ...prev, stunden_monteur: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Gesamtstunden: Meister {(sonderproduktForm.stunden_meister * sonderproduktForm.quantity).toFixed(2)}h, 
                Geselle {(sonderproduktForm.stunden_geselle * sonderproduktForm.quantity).toFixed(2)}h, 
                Monteur {(sonderproduktForm.stunden_monteur * sonderproduktForm.quantity).toFixed(2)}h
              </p>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setSonderproduktDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button onClick={handleAddSonderprodukt}>
                Hinzufügen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default ElektrosanierungConfigurator;