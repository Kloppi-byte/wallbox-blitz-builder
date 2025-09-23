import React from 'react';
import { Trash2, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';

export function CartSummary() {
  const { cart, removeItem, generateQuote, clearCart } = useCart();

  if (cart.items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Ihr Warenkorb ist leer</p>
          <p className="text-sm text-muted-foreground">Fügen Sie Produkte hinzu, um ein Angebot zu erstellen</p>
        </CardContent>
      </Card>
    );
  }

  const getProductTypeLabel = (type: string) => {
    const labels = {
      wallbox: 'Wallbox',
      solar: 'Solar',
      heating: 'Heizung',
      other: 'Sonstiges'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Warenkorb ({cart.totalItems} Artikel)</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearCart}
              className="text-destructive hover:text-destructive"
            >
              Alle entfernen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{item.name}</h4>
                    <Badge variant="secondary">
                      {getProductTypeLabel(item.productType)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>Material: {item.pricing.materialCosts.toFixed(2)}€</div>
                    <div>Arbeitszeit: {item.pricing.laborCosts.toFixed(2)}€</div>
                    <div>Anfahrt: {item.pricing.travelCosts.toFixed(2)}€</div>
                    <div>Förderung: -{item.pricing.subsidy.toFixed(2)}€</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold text-lg">
                    {item.pricing.total.toFixed(2)}€
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="text-destructive hover:text-destructive p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          <Separator />
          
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Gesamtsumme:</span>
            <div className="flex items-center gap-1">
              <Euro className="h-5 w-5" />
              <span>{cart.totalPrice.toFixed(2)}€</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={generateQuote} 
            className="w-full" 
            size="lg"
            disabled={!cart.customerData}
          >
            Gesamtangebot als PDF erstellen
          </Button>
          {!cart.customerData && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Bitte geben Sie Ihre Kontaktdaten in einem Konfigurator ein
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}