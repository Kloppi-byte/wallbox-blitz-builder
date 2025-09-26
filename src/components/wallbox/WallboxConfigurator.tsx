import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
import { CartSheet } from '@/components/cart/CartSheet';
import { 
  Zap, 
  Euro, 
  Clock, 
  ShoppingCart, 
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface WallboxItem {
  id: string;
  name: string;
  price: number;
  preselect?: boolean;
  autoselect?: string[];
  multiplikator?: {
    type: 'meter';
    label: string;
    defaultValue: number;
    pricePerUnit: number;
  };
}

interface WallboxSubkategorie {
  items: WallboxItem[];
}

interface WallboxKategorie {
  subkategorien: Record<string, WallboxSubkategorie>;
}

interface WallboxConfig {
  categories: Record<string, WallboxKategorie>;
}

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  kategorie: string;
  subkategorie: string;
  quantity: number;
  multiplier: number;
  isAutoSelected: boolean;
  isPreselected: boolean;
}

interface ConfiguratorState {
  selectedItems: Map<string, SelectedItem>;
  activeWallbox: string | null;
  autoselectedItems: Set<string>;
  costs: {
    material: number;
    labor: number;
    travel: number;
    total: number;
  };
}

// Wallbox configuration data
const wallboxConfig: WallboxConfig = {
  categories: {
    "Wallbox": {
      subkategorien: {
        "11kW Wallbox": {
          items: [
            {
              id: "wb_11kw_standard",
              name: "Standard 11kW Wallbox",
              price: 890,
              preselect: true,
              autoselect: ["kabel_typ2_5m", "sicherung_b16", "installation_basis"]
            }
          ]
        },
        "22kW Wallbox": {
          items: [
            {
              id: "wb_22kw_premium",
              name: "Premium 22kW Wallbox", 
              price: 1450,
              preselect: false,
              autoselect: ["kabel_typ2_7m", "sicherung_b32", "installation_erweitert"]
            }
          ]
        }
      }
    },
    "Zubehör": {
      subkategorien: {
        "Ladekabel": {
          items: [
            {
              id: "kabel_typ2_5m",
              name: "Typ 2 Ladekabel 5m",
              price: 180,
              preselect: false
            },
            {
              id: "kabel_typ2_7m", 
              name: "Typ 2 Ladekabel 7m",
              price: 220,
              preselect: false
            }
          ]
        },
        "Sicherungen": {
          items: [
            {
              id: "sicherung_b16",
              name: "LS-Schalter B16",
              price: 45,
              preselect: false
            },
            {
              id: "sicherung_b32",
              name: "LS-Schalter B32", 
              price: 65,
              preselect: false
            }
          ]
        },
        "Installation": {
          items: [
            {
              id: "installation_basis",
              name: "Basis Installation",
              price: 450,
              preselect: false,
              multiplikator: {
                type: "meter",
                label: "Kabelweg in Metern",
                defaultValue: 10,
                pricePerUnit: 15
              }
            },
            {
              id: "installation_erweitert",
              name: "Erweiterte Installation",
              price: 680,
              preselect: false,
              multiplikator: {
                type: "meter", 
                label: "Kabelweg in Metern",
                defaultValue: 15,
                pricePerUnit: 20
              }
            }
          ]
        }
      }
    }
  }
};

export const WallboxConfigurator = () => {
  const [state, setState] = useState<ConfiguratorState>({
    selectedItems: new Map(),
    activeWallbox: null,
    autoselectedItems: new Set(),
    costs: { material: 0, labor: 0, travel: 0, total: 0 }
  });
  const [travelCosts, setTravelCosts] = useState(50);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "Wallbox": true,
    "Zubehör": true
  });
  const [openSubkategorien, setOpenSubkategorien] = useState<Record<string, boolean>>({});

  const { toast } = useToast();
  const { addItem } = useCart();

  // Initialize wallbox selection on mount
  useEffect(() => {
    initializeWallboxSelection();
  }, []);

  // Recalculate costs when state changes
  useEffect(() => {
    calculateCosts();
  }, [state.selectedItems, travelCosts]);

  const findItemById = (id: string): { item: WallboxItem; kategorie: string; subkategorie: string } | null => {
    for (const [kategorieKey, kategorie] of Object.entries(wallboxConfig.categories)) {
      for (const [subkategorieKey, subkategorie] of Object.entries(kategorie.subkategorien)) {
        const item = subkategorie.items.find(item => item.id === id);
        if (item) {
          return { item, kategorie: kategorieKey, subkategorie: subkategorieKey };
        }
      }
    }
    return null;
  };

  const findItemsByProperty = (property: keyof WallboxItem, value: any): Array<{ item: WallboxItem; kategorie: string; subkategorie: string }> => {
    const results: Array<{ item: WallboxItem; kategorie: string; subkategorie: string }> = [];
    
    for (const [kategorieKey, kategorie] of Object.entries(wallboxConfig.categories)) {
      for (const [subkategorieKey, subkategorie] of Object.entries(kategorie.subkategorien)) {
        for (const item of subkategorie.items) {
          if (item[property] === value) {
            results.push({ item, kategorie: kategorieKey, subkategorie: subkategorieKey });
          }
        }
      }
    }
    
    return results;
  };

  const activateItem = (itemId: string, isAutoSelected = false, multiplier = 1) => {
    const found = findItemById(itemId);
    if (!found) return;

    const { item, kategorie, subkategorie } = found;
    const defaultMultiplier = item.multiplikator?.defaultValue || multiplier;

    setState(prev => {
      const newSelectedItems = new Map(prev.selectedItems);
      const newAutoselectedItems = new Set(prev.autoselectedItems);

      newSelectedItems.set(itemId, {
        id: itemId,
        name: item.name,
        price: item.price,
        kategorie,
        subkategorie,
        quantity: 1,
        multiplier: defaultMultiplier,
        isAutoSelected,
        isPreselected: item.preselect || false
      });

      if (isAutoSelected) {
        newAutoselectedItems.add(itemId);
      }

      return {
        ...prev,
        selectedItems: newSelectedItems,
        autoselectedItems: newAutoselectedItems
      };
    });
  };

  const deactivateItem = (itemId: string) => {
    setState(prev => {
      const newSelectedItems = new Map(prev.selectedItems);
      const newAutoselectedItems = new Set(prev.autoselectedItems);

      newSelectedItems.delete(itemId);
      newAutoselectedItems.delete(itemId);

      return {
        ...prev,
        selectedItems: newSelectedItems,
        autoselectedItems: newAutoselectedItems
      };
    });
  };

  const initializeWallboxSelection = () => {
    // Find all preselected items
    const preselectedItems = findItemsByProperty('preselect', true);
    
    // Activate preselected items
    preselectedItems.forEach(({ item }) => {
      activateItem(item.id, false);
      
      // Set as active wallbox if it's a wallbox
      if (wallboxConfig.categories["Wallbox"]) {
        setState(prev => ({ ...prev, activeWallbox: item.id }));
      }
    });

    // Activate autoselect dependencies
    preselectedItems.forEach(({ item }) => {
      if (item.autoselect) {
        item.autoselect.forEach(autoItemId => {
          activateItem(autoItemId, true);
        });
      }
    });
  };

  const onWallboxSelection = (selectedWallboxId: string) => {
    const currentWallbox = state.activeWallbox;
    
    // Deactivate autoselect items of previous wallbox
    if (currentWallbox) {
      const currentFound = findItemById(currentWallbox);
      if (currentFound?.item.autoselect) {
        currentFound.item.autoselect.forEach(itemId => {
          if (state.autoselectedItems.has(itemId)) {
            deactivateItem(itemId);
          }
        });
      }
      // Deactivate current wallbox
      deactivateItem(currentWallbox);
    }

    // Activate new wallbox
    activateItem(selectedWallboxId, false);
    
    // Activate autoselect items of new wallbox
    const newFound = findItemById(selectedWallboxId);
    if (newFound?.item.autoselect) {
      newFound.item.autoselect.forEach(itemId => {
        activateItem(itemId, true);
      });
    }

    setState(prev => ({ ...prev, activeWallbox: selectedWallboxId }));
  };

  const calculateItemPrice = (item: SelectedItem): number => {
    const basePrice = item.price * item.quantity;
    const found = findItemById(item.id);
    
    if (found?.item.multiplikator) {
      const additionalCost = found.item.multiplikator.pricePerUnit * item.multiplier;
      return basePrice + additionalCost;
    }
    
    return basePrice;
  };

  const calculateCosts = () => {
    let materialCosts = 0;
    
    state.selectedItems.forEach(item => {
      materialCosts += calculateItemPrice(item);
    });

    const laborCosts = materialCosts * 0.3; // 30% labor costs estimate
    const total = materialCosts + laborCosts + travelCosts;

    setState(prev => ({
      ...prev,
      costs: {
        material: materialCosts,
        labor: laborCosts,
        travel: travelCosts,
        total
      }
    }));
  };

  const handleItemToggle = (itemId: string, checked: boolean) => {
    if (checked) {
      // Check if this is a wallbox
      const found = findItemById(itemId);
      if (found?.kategorie === "Wallbox") {
        onWallboxSelection(itemId);
      } else {
        activateItem(itemId, false);
      }
    } else {
      // Don't allow deactivating autoselected items without warning
      if (state.autoselectedItems.has(itemId)) {
        toast({
          title: "Warnung",
          description: "Dieses Element wurde automatisch für die gewählte Wallbox ausgewählt.",
          variant: "destructive",
        });
        return;
      }
      deactivateItem(itemId);
    }
  };

  const handleMultiplierChange = (itemId: string, value: number) => {
    setState(prev => {
      const newSelectedItems = new Map(prev.selectedItems);
      const item = newSelectedItems.get(itemId);
      if (item) {
        newSelectedItems.set(itemId, { ...item, multiplier: value });
      }
      return { ...prev, selectedItems: newSelectedItems };
    });
  };

  const addToCart = () => {
    const items = Array.from(state.selectedItems.values());
    
    const cartItem = {
      productType: 'wallbox' as const,
      name: 'Wallbox Konfiguration',
      configuration: {
        selectedItems: items,
        travelCosts
      },
      pricing: {
        materialCosts: state.costs.material,
        laborCosts: state.costs.labor,
        travelCosts: state.costs.travel,
        subtotal: state.costs.material + state.costs.labor,
        subsidy: 0,
        total: state.costs.total
      }
    };

    addItem(cartItem);
    setIsCartOpen(true);
    
    toast({
      title: "Erfolgreich hinzugefügt",
      description: "Die Wallbox-Konfiguration wurde zum Warenkorb hinzugefügt.",
    });
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleSubkategorie = (subkategorie: string) => {
    setOpenSubkategorien(prev => ({ ...prev, [subkategorie]: !prev[subkategorie] }));
  };

  const renderItem = (item: WallboxItem, kategorie: string, subkategorie: string) => {
    const isSelected = state.selectedItems.has(item.id);
    const selectedItem = state.selectedItems.get(item.id);
    const isAutoSelected = state.autoselectedItems.has(item.id);
    const isWallbox = kategorie === "Wallbox";
    const isCurrentWallbox = state.activeWallbox === item.id;

    return (
      <Card 
        key={item.id} 
        className={`transition-all duration-200 ${
          isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Checkbox
                id={item.id}
                checked={isSelected}
                onCheckedChange={(checked) => handleItemToggle(item.id, checked as boolean)}
                disabled={isWallbox && isCurrentWallbox && Object.keys(wallboxConfig.categories["Wallbox"].subkategorien).length === 1}
              />
              
              <div className="flex-1">
                <Label htmlFor={item.id} className="text-base font-medium cursor-pointer">
                  {item.name}
                </Label>
                
                <div className="flex gap-2 mt-1">
                  {item.preselect && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Empfohlen
                    </Badge>
                  )}
                  {isAutoSelected && (
                    <Badge variant="outline" className="text-xs">
                      <Info className="w-3 h-3 mr-1" />
                      Auto-gewählt
                    </Badge>
                  )}
                </div>

                {item.multiplikator && isSelected && selectedItem && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <Label className="text-sm font-medium">{item.multiplikator.label}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={selectedItem.multiplier}
                        onChange={(e) => handleMultiplierChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-20"
                        min="1"
                      />
                      <span className="text-sm text-muted-foreground">
                        Basis: €{item.price} + €{item.multiplikator.pricePerUnit}/m × {selectedItem.multiplier}m = €{calculateItemPrice(selectedItem)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-semibold text-primary">
                €{isSelected && selectedItem ? calculateItemPrice(selectedItem) : item.price}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Wallbox Konfigurator</h1>
                <p className="text-muted-foreground">Konfiguriere deine perfekte Wallbox-Lösung</p>
              </div>
            </div>
            <CartIcon onClick={() => setIsCartOpen(true)} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Configuration Area */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(wallboxConfig.categories).map(([kategorieKey, kategorie]) => (
              <Collapsible
                key={kategorieKey}
                open={openCategories[kategorieKey]}
                onOpenChange={() => toggleCategory(kategorieKey)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {kategorieKey === "Wallbox" ? <Zap className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                          {kategorieKey}
                        </CardTitle>
                        <ChevronDown className={`w-5 h-5 transition-transform ${openCategories[kategorieKey] ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      {Object.entries(kategorie.subkategorien).map(([subkategorieKey, subkategorie]) => (
                        <div key={subkategorieKey}>
                          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                            {subkategorieKey}
                          </h4>
                          <div className="space-y-3">
                            {subkategorie.items.map(item => renderItem(item, kategorieKey, subkategorieKey))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}

            {/* Travel Costs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Anfahrtskosten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Label htmlFor="travel-costs" className="text-sm font-medium">
                    Anfahrtskosten (€)
                  </Label>
                  <Input
                    id="travel-costs"
                    type="number"
                    value={travelCosts}
                    onChange={(e) => setTravelCosts(parseInt(e.target.value) || 0)}
                    className="w-32"
                    min="0"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="w-5 h-5" />
                    Kostenzusammenfassung
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Materialkosten</span>
                      <span>€{state.costs.material.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Arbeitskosten</span>
                      <span>€{state.costs.labor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Anfahrtskosten</span>
                      <span>€{state.costs.travel.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Gesamtpreis</span>
                      <span className="text-primary">€{state.costs.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={addToCart}
                    className="w-full"
                    disabled={state.selectedItems.size === 0}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    In den Warenkorb
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </div>
  );
};