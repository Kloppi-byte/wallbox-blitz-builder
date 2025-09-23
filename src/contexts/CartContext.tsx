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

function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case 'ADD_ITEM': {
      const newItem: CartItem = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };
      
      const items = [...state.items, newItem];
      const subtotalPrice = items.reduce((sum, item) => sum + item.pricing.total, 0);
      const discountAmount = subtotalPrice * (state.discountPercent / 100);
      const totalPrice = subtotalPrice - discountAmount;
      
      return {
        ...state,
        items,
        totalItems: items.length,
        subtotalPrice,
        discountAmount,
        totalPrice,
      };
    }
    
    case 'REMOVE_ITEM': {
      const items = state.items.filter(item => item.id !== action.payload);
      const subtotalPrice = items.reduce((sum, item) => sum + item.pricing.total, 0);
      const discountAmount = subtotalPrice * (state.discountPercent / 100);
      const totalPrice = subtotalPrice - discountAmount;
      
      return {
        ...state,
        items,
        totalItems: items.length,
        subtotalPrice,
        discountAmount,
        totalPrice,
      };
    }
    
    case 'UPDATE_ITEM': {
      const items = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, ...action.payload.updates }
          : item
      );
      const subtotalPrice = items.reduce((sum, item) => sum + item.pricing.total, 0);
      const discountAmount = subtotalPrice * (state.discountPercent / 100);
      const totalPrice = subtotalPrice - discountAmount;
      
      return {
        ...state,
        items,
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