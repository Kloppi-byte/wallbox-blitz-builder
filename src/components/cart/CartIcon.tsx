import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';

interface CartIconProps {
  onClick: () => void;
}

export function CartIcon({ onClick }: CartIconProps) {
  const { cart } = useCart();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className="relative"
    >
      <ShoppingCart className="h-4 w-4" />
      {cart.totalItems > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {cart.totalItems}
        </Badge>
      )}
    </Button>
  );
}