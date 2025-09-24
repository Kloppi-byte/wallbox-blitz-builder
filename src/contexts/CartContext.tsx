import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Cart, CartItem, CartContextType } from '@/types/cart';
import { toast } from '@/hooks/use-toast';

const CartContext = createContext<CartContextType | undefined>(undefined);

type CartAction = 
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'id' | 'createdAt'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<CartItem> } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CUSTOMER_DATA'; payload: Cart['customerData'] }
  | { type: 'SET_DISCOUNT'; payload: number }
  | { type: 'LOAD_CART'; payload: Cart };

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
function calculateOptimizedCart(items: CartItem[]): { optimizedItems: CartItem[], subtotalPrice: number } {
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
  const maxTravelCostPerDay = Math.max(...items.map(item => item.pricing.travelCosts));
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
      }
    };
  });
  
  // Add travel costs to subtotal separately
  const itemsSubtotal = optimizedItems.reduce((sum, item) => sum + item.pricing.total, 0);
  const subtotalPrice = itemsSubtotal + totalTravelCost;
  
  return { optimizedItems, subtotalPrice };
}

function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case 'ADD_ITEM': {
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
    
    case 'REMOVE_ITEM': {
      const filteredItems = state.items.filter(item => item.id !== action.payload);
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
    
    case 'UPDATE_ITEM': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, ...action.payload.updates }
          : item
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
    
    case 'CLEAR_CART':
      return initialCart;
    
    case 'SET_CUSTOMER_DATA':
      return {
        ...state,
        customerData: action.payload,
      };
    
    case 'SET_DISCOUNT': {
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
    
    case 'LOAD_CART':
      return action.payload;
    
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, initialCart);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('wallbox-cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: parsedCart });
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    localStorage.setItem('wallbox-cart', JSON.stringify(cart));
  }, [cart]);

  const addItem = (item: Omit<CartItem, 'id' | 'createdAt'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
    toast({
      title: "Zum Warenkorb hinzugefügt",
      description: `${item.name} wurde erfolgreich hinzugefügt.`,
    });
  };

  const removeItem = (itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
    toast({
      title: "Artikel entfernt",
      description: "Der Artikel wurde aus dem Warenkorb entfernt.",
    });
  };

  const updateItem = (itemId: string, updates: Partial<CartItem>) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, updates } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
    toast({
      title: "Warenkorb geleert",
      description: "Alle Artikel wurden entfernt.",
    });
  };

  const setCustomerData = (data: Cart['customerData']) => {
    dispatch({ type: 'SET_CUSTOMER_DATA', payload: data });
  };

  const setDiscount = (percent: number) => {
    dispatch({ type: 'SET_DISCOUNT', payload: percent });
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
      const webhookData = {
        customerData: cart.customerData,
        items: cart.items,
        totalPrice: cart.totalPrice,
        subtotalPrice: cart.subtotalPrice,
        discountPercent: cart.discountPercent,
        discountAmount: cart.discountAmount,
        totalItems: cart.totalItems,
        generatedAt: new Date().toISOString(),
      };

      const webhookUrl = "https://hwg-samuel.app.n8n.cloud/webhook-test/aa9cf5bf-f3ed-4d4b-a03d-254628aeca06";
      const queryParams = new URLSearchParams();
      
      Object.entries(webhookData).forEach(([key, value]) => {
        queryParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });

      const response = await fetch(`${webhookUrl}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.pdfUrl) {
        window.open(result.pdfUrl, '_blank');
        clearCart();
        toast({
          title: "Angebot erstellt",
          description: "Ihr Gesamtangebot wurde erfolgreich generiert.",
        });
      }
    } catch (error) {
      console.error('Error generating quote:', error);
      toast({
        title: "Fehler beim Erstellen des Angebots",
        description: "Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      addItem,
      removeItem,
      updateItem,
      clearCart,
      setCustomerData,
      setDiscount,
      generateQuote,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}