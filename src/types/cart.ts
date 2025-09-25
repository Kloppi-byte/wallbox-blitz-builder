export interface CartItem {
  id: string;
  productType: 'wallbox' | 'elektrosanierung' | 'solar' | 'heating' | 'other';
  name: string;
  configuration: any;
  pricing: {
    materialCosts: number;
    laborCosts: number;
    travelCosts: number;
    subtotal: number;
    subsidy: number;
    total: number;
  };
  customerData?: {
    name: string;
    email: string;
    plz: string;
    adresse: string;
  };
  createdAt: Date;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  subtotalPrice: number;
  discountPercent: number;
  discountAmount: number;
  customerData: {
    name: string;
    email: string;
    plz: string;
    adresse: string;
  } | null;
}

export interface CartContextType {
  cart: Cart;
  addItem: (item: Omit<CartItem, 'id' | 'createdAt'>) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  setCustomerData: (data: Cart['customerData']) => void;
  setDiscount: (percent: number) => void;
  generateQuote: () => Promise<void>;
}