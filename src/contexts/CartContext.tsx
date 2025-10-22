import React, { createContext, useContext, useReducer, useEffect } from "react";
import { Cart, CartItem, CartContextType } from "@/types/cart";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CartContext = createContext<CartContextType | undefined>(undefined);

type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<CartItem, "id" | "createdAt"> }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_ITEM"; payload: { id: string; updates: Partial<CartItem> } }
  | { type: "CLEAR_CART" }
  | { type: "SET_CUSTOMER_DATA"; payload: Cart["customerData"] }
  | { type: "SET_DISCOUNT"; payload: number }
  | { type: "LOAD_CART"; payload: Cart };

const initialCart: Cart = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  subtotalPrice: 0,
  discountPercent: 0,
  discountAmount: 0,
  customerData: null,
};

// Helper function to calculate optimized pricing for cart items
function calculateOptimizedCart(items: CartItem[]): { optimizedItems: CartItem[]; subtotalPrice: number } {
  if (items.length === 0) return { optimizedItems: [], subtotalPrice: 0 };

  // Group items by customer (assuming same customer for now, can be enhanced later)
  const totalLaborHours = items.reduce((sum, item) => {
    // Extract labor hours from item configuration
    const laborHours = item.configuration?.arbeitsstunden || 0;
    return sum + laborHours;
  }, 0);

  // Calculate labor cost based on 8-hour workdays (75€/hour)
  const workdays = Math.ceil(totalLaborHours / 8);
  const totalLaborCost = workdays * 8 * 75; // Full 8-hour days at 75€/hour

  // Travel costs should be charged per workday (every 8 hours)
  // Use the highest travel cost among all items (assuming same zone)
  const maxTravelCostPerDay = Math.max(...items.map((item) => item.pricing.travelCosts));
  const totalTravelCost = maxTravelCostPerDay * workdays;

  // Distribute labor cost proportionally among items
  const totalOriginalLaborCost = items.reduce((sum, item) => sum + item.pricing.laborCosts, 0);

  const optimizedItems = items.map((item, index) => {
    const laborRatio = totalOriginalLaborCost > 0 ? item.pricing.laborCosts / totalOriginalLaborCost : 1 / items.length;
    const optimizedLaborCost = totalLaborCost * laborRatio;

    // Reset individual travel costs to 0 - we'll show them separately
    const newTotal = item.pricing.materialCosts + optimizedLaborCost - item.pricing.subsidy;

    return {
      ...item,
      pricing: {
        ...item.pricing,
        laborCosts: optimizedLaborCost,
        travelCosts: 0, // Reset individual travel costs
        total: newTotal,
      },
    };
  });

  // Add travel costs to subtotal separately
  const itemsSubtotal = optimizedItems.reduce((sum, item) => sum + item.pricing.total, 0);
  const subtotalPrice = itemsSubtotal + totalTravelCost;

  return { optimizedItems, subtotalPrice };
}

function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case "ADD_ITEM": {
      const newItem: CartItem = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };

      const allItems = [...state.items, newItem];
      const { optimizedItems, subtotalPrice } = calculateOptimizedCart(allItems);
      const discountAmount = subtotalPrice * (state.discountPercent / 100);
      const totalPrice = subtotalPrice - discountAmount;

      return {
        ...state,
        items: optimizedItems,
        totalItems: optimizedItems.length,
        subtotalPrice,
        discountAmount,
        totalPrice,
      };
    }

    case "REMOVE_ITEM": {
      const filteredItems = state.items.filter((item) => item.id !== action.payload);
      const { optimizedItems, subtotalPrice } = calculateOptimizedCart(filteredItems);
      const discountAmount = subtotalPrice * (state.discountPercent / 100);
      const totalPrice = subtotalPrice - discountAmount;

      return {
        ...state,
        items: optimizedItems,
        totalItems: optimizedItems.length,
        subtotalPrice,
        discountAmount,
        totalPrice,
      };
    }

    case "UPDATE_ITEM": {
      const updatedItems = state.items.map((item) =>
        item.id === action.payload.id ? { ...item, ...action.payload.updates } : item,
      );
      const { optimizedItems, subtotalPrice } = calculateOptimizedCart(updatedItems);
      const discountAmount = subtotalPrice * (state.discountPercent / 100);
      const totalPrice = subtotalPrice - discountAmount;

      return {
        ...state,
        items: optimizedItems,
        subtotalPrice,
        discountAmount,
        totalPrice,
      };
    }

    case "CLEAR_CART":
      return initialCart;

    case "SET_CUSTOMER_DATA":
      return {
        ...state,
        customerData: action.payload,
      };

    case "SET_DISCOUNT": {
      const subtotalPrice = state.items.reduce((sum, item) => sum + item.pricing.total, 0);
      const discountAmount = subtotalPrice * (action.payload / 100);
      const totalPrice = subtotalPrice - discountAmount;

      return {
        ...state,
        discountPercent: action.payload,
        discountAmount,
        totalPrice,
      };
    }

    case "LOAD_CART":
      return action.payload;

    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, initialCart);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("wallbox-cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        dispatch({ type: "LOAD_CART", payload: parsedCart });
      } catch (error) {
        console.error("Failed to load cart from localStorage:", error);
      }
    }
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    localStorage.setItem("wallbox-cart", JSON.stringify(cart));
  }, [cart]);

  const addItem = (item: Omit<CartItem, "id" | "createdAt">) => {
    dispatch({ type: "ADD_ITEM", payload: item });
    toast({
      title: "Zum Warenkorb hinzugefügt",
      description: `${item.name} wurde erfolgreich hinzugefügt.`,
    });
  };

  const removeItem = (itemId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: itemId });
    toast({
      title: "Artikel entfernt",
      description: "Der Artikel wurde aus dem Warenkorb entfernt.",
    });
  };

  const updateItem = (itemId: string, updates: Partial<CartItem>) => {
    dispatch({ type: "UPDATE_ITEM", payload: { id: itemId, updates } });
  };

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" });
    toast({
      title: "Warenkorb geleert",
      description: "Alle Artikel wurden entfernt.",
    });
  };

  const setCustomerData = (data: Cart["customerData"]) => {
    dispatch({ type: "SET_CUSTOMER_DATA", payload: data });
  };

  const setDiscount = (percent: number) => {
    dispatch({ type: "SET_DISCOUNT", payload: percent });
  };

  const generateQuote = async () => {
    if (cart.items.length === 0) {
      toast({
        title: "Warenkorb leer",
        description: "Fügen Sie Artikel hinzu, bevor Sie ein Angebot erstellen.",
        variant: "destructive",
      });
      return;
    }

    if (!cart.customerData) {
      toast({
        title: "Kundendaten fehlen",
        description: "Bitte geben Sie Ihre Kontaktdaten ein.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Build enriched configurations with 5-layer hierarchy
      const enrichedConfigurations = await Promise.all(
        cart.items.map(async (item) => {
          // Skip if not elektrosanierung or no configuration
          if (item.productType !== "elektrosanierung" || !item.configuration) {
            return {
              configurationId: item.id,
              productType: item.productType,
              name: item.name,
              pricing: item.pricing,
              configuration: item.configuration,
              packageCategories: [],
            };
          }

          const config = item.configuration;
          const offerLineItems = config.offerLineItems || [];
          const schutzorgane = config.schutzorgane || [];
          const selectedPackages = config.selectedPackages || [];

          // Fetch metadata from Supabase for complete payload
          const packageIds = [...new Set(offerLineItems.map((li: any) => li.package_id).filter(Boolean))];
          const productIds = [
            ...new Set(
              [...offerLineItems.map((li: any) => li.product_id), ...schutzorgane.map((s: any) => s.product_id)].filter(
                Boolean,
              ),
            ),
          ];

          const [packagesData, productsData] = await Promise.all([
            packageIds.length > 0
              ? supabase
                  .from("offers_packages")
                  .select("*")
                  .in("id", packageIds as number[])
              : { data: [], error: null },
            productIds.length > 0
              ? supabase
                  .from("offers_products")
                  .select("*")
                  .in("product_id", productIds as string[])
              : { data: [], error: null },
          ]);

          if (packagesData.error) console.error("Error fetching packages:", packagesData.error);
          if (productsData.error) console.error("Error fetching products:", productsData.error);

          // Create lookup maps
          const packagesMap = new Map((packagesData.data || []).map((p) => [p.id, p]));
          const productsMap = new Map((productsData.data || []).map((p) => [p.product_id, p]));

          // Build 5-layer hierarchy
          // Group line items by package category first
          const packageCategoryMap = new Map<string, any>();

          offerLineItems.forEach((lineItem: any) => {
            const packageData = packagesMap.get(lineItem.package_id);
            const productData = productsMap.get(lineItem.product_id);

            if (!packageData || !productData) return;

            const packageCategory = packageData.category || "Uncategorized";
            const productCategory = productData.category || "Uncategorized";

            // Get or create package category
            if (!packageCategoryMap.has(packageCategory)) {
              packageCategoryMap.set(packageCategory, {
                category: packageCategory,
                packages: new Map(),
              });
            }

            const pkgCat = packageCategoryMap.get(packageCategory);

            // Get or create package within category
            const packageKey = lineItem.instance_id || `${lineItem.package_id}`;
            if (!pkgCat.packages.has(packageKey)) {
              // Find package parameters from selectedPackages
              const selectedPkg = selectedPackages.find(
                (sp: any) => sp.instanceId === lineItem.instance_id || sp.packageId === lineItem.package_id,
              );

              pkgCat.packages.set(packageKey, {
                packageId: lineItem.package_id,
                packageName: packageData.name,
                packageDescription: packageData.description,
                instanceId: lineItem.instance_id,
                qualityLevel: packageData.quality_level,
                isOptional: packageData.is_optional,
                parameters: selectedPkg?.parameters || {},
                productCategories: new Map(),
              });
            }

            const pkg = pkgCat.packages.get(packageKey);

            // Get or create product category within package
            if (!pkg.productCategories.has(productCategory)) {
              pkg.productCategories.set(productCategory, {
                category: productCategory,
                products: [],
              });
            }

            const prodCat = pkg.productCategories.get(productCategory);

            // Add product with full metadata
            prodCat.products.push({
              product_id: lineItem.product_id,
              name: productData.name,
              description: productData.description,
              unit: productData.unit,
              unit_price: lineItem.unit_price,
              quantity: lineItem.quantity,
              total_price: lineItem.total_price,
              category: productData.category,
              produkt_gruppe: productData.produkt_gruppe,
              qualitaetsstufe: productData.qualitaetsstufe,
              stunden_meister: lineItem.stunden_meister || productData.stunden_meister,
              stunden_geselle: lineItem.stunden_geselle || productData.stunden_geselle,
              stunden_monteur: lineItem.stunden_monteur || productData.stunden_monteur,
              image: productData.image,
              tags: productData.tags,
              labor_hours: lineItem.labor_hours,
              material_cost: lineItem.material_cost,
            });
          });

          // Convert Maps to arrays for JSON serialization
          const packageCategories = Array.from(packageCategoryMap.values()).map((pkgCat) => ({
            category: pkgCat.category,
            packages: Array.from(pkgCat.packages.values()).map((pkg: any) => ({
              packageId: pkg.packageId,
              packageName: pkg.packageName,
              packageDescription: pkg.packageDescription,
              instanceId: pkg.instanceId,
              qualityLevel: pkg.qualityLevel,
              isOptional: pkg.isOptional,
              parameters: pkg.parameters,
              productCategories: Array.from(pkg.productCategories.values()),
            })),
          }));

          // Process Schutzorgane (protection devices) with metadata
          const schutzorganeWithMetadata = schutzorgane.map((s: any) => {
            const productData = productsMap.get(s.product_id);
            return {
              product_id: s.product_id,
              name: productData?.name || s.name,
              description: productData?.description || "",
              unit: productData?.unit || s.unit,
              unit_price: s.unit_price,
              quantity: s.quantity,
              total_price: s.total_price,
              category: productData?.category || "Schutzorgane",
              produkt_gruppe: productData?.produkt_gruppe || s.produkt_gruppe,
              qualitaetsstufe: productData?.qualitaetsstufe,
              stunden_meister: productData?.stunden_meister,
              stunden_geselle: productData?.stunden_geselle,
              stunden_monteur: productData?.stunden_monteur,
              image: productData?.image,
              tags: productData?.tags,
            };
          });

          return {
            configurationId: item.id,
            productType: item.productType,
            name: item.name,
            loc_id: config.loc_id,
            locationName: config.locationName,
            globalParams: config.globalParams || {},
            packageCategories,
            schutzorgane: {
              category: "Schutzorgane (auto)",
              products: schutzorganeWithMetadata,
            },
            pricing: item.pricing,
            // Keep original flat structure for backward compatibility
            originalConfiguration: {
              offerLineItems,
              schutzorgane,
              selectedPackages,
            },
          };
        }),
      );

      const webhookData = {
        customerData: cart.customerData,
        configurations: enrichedConfigurations,
        totalPrice: cart.totalPrice,
        subtotalPrice: cart.subtotalPrice,
        discountPercent: cart.discountPercent,
        discountAmount: cart.discountAmount,
        totalItems: cart.totalItems,
        generatedAt: new Date().toISOString(),
      };

      console.log("📦 Webhook Payload (5-layer hierarchy):", JSON.stringify(webhookData, null, 2));

      const webhookUrl = "https://hwg-samuel.app.n8n.cloud/webhook-test/aa9cf5bf-f3ed-4d4b-a03d-254628aeca06";

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        clearCart();
        toast({
          title: "Angebot erstellt",
          description: "Ihr Gesamtangebot wurde erfolgreich generiert.",
        });

        // If PDF URL is available, open it
        if (result.pdfUrl) {
          window.open(result.pdfUrl, "_blank");
        }
      }
    } catch (error) {
      console.error("Error generating quote:", error);
      toast({
        title: "Fehler beim Erstellen des Angebots",
        description: "Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        removeItem,
        updateItem,
        clearCart,
        setCustomerData,
        setDiscount,
        generateQuote,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
