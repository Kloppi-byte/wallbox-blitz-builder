import React, { useState } from 'react';
import { Trash2, Euro, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';

export function CartSummary() {
  const { cart, removeItem, generateQuote, clearCart, setCustomerData, setDiscount } = useCart();
  const [customerForm, setCustomerForm] = useState({
    name: cart.customerData?.name || '',
    email: cart.customerData?.email || '',
    plz: cart.customerData?.plz || '',
    adresse: cart.customerData?.adresse || ''
  });
  const [discountInput, setDiscountInput] = useState((cart.discountPercent || 0).toString());

  const handleCustomerDataChange = (field: string, value: string) => {
    const newForm = { ...customerForm, [field]: value };
    setCustomerForm(newForm);
    
    // Update cart with complete customer data
    if (newForm.name && newForm.email && newForm.plz && newForm.adresse) {
      setCustomerData(newForm);
    } else {
      setCustomerData(null);
    }
  };

  const handleDiscountChange = (value: string) => {
    setDiscountInput(value);
    const percent = Math.max(0, Math.min(30, parseFloat(value) || 0));
    setDiscount(percent);
  };

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

  const isFormValid = customerForm.name && customerForm.email && customerForm.plz && customerForm.adresse;

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
          
          {/* Discount Section */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="discount">Rabatt (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="30"
                  value={discountInput}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  placeholder="0"
                  className="max-w-20"
                />
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Price Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Zwischensumme:</span>
              <span>{cart.subtotalPrice.toFixed(2)}€</span>
            </div>
            
            {cart.discountPercent > 0 && (
              <div className="flex items-center justify-between text-green-600">
                <span>Rabatt ({cart.discountPercent}%):</span>
                <span>-{cart.discountAmount.toFixed(2)}€</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Gesamtsumme:</span>
              <div className="flex items-center gap-1">
                <Euro className="h-5 w-5" />
                <span>{cart.totalPrice.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Data Form */}
      <Card>
        <CardHeader>
          <CardTitle>Kontaktdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input 
                id="name" 
                value={customerForm.name} 
                onChange={(e) => handleCustomerDataChange('name', e.target.value)} 
                placeholder="Ihr Name" 
              />
            </div>
            <div>
              <Label htmlFor="email">E-Mail *</Label>
              <Input 
                id="email" 
                type="email" 
                value={customerForm.email} 
                onChange={(e) => handleCustomerDataChange('email', e.target.value)} 
                placeholder="ihre@email.de" 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="plz">PLZ *</Label>
              <Input 
                id="plz" 
                value={customerForm.plz} 
                onChange={(e) => handleCustomerDataChange('plz', e.target.value)} 
                placeholder="12345" 
                maxLength={5} 
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="adresse">Adresse *</Label>
              <Input 
                id="adresse" 
                value={customerForm.adresse} 
                onChange={(e) => handleCustomerDataChange('adresse', e.target.value)} 
                placeholder="Straße und Hausnummer" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Quote Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={generateQuote} 
            className="w-full" 
            size="lg"
            disabled={!isFormValid}
          >
            Gesamtangebot als PDF erstellen
          </Button>
          {!isFormValid && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Bitte füllen Sie alle Kontaktdaten aus
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}