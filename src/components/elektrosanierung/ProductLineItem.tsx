import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus, X, RotateCcw } from 'lucide-react';
import type { OfferLineItem, OfferProduct } from './ElektrosanierungConfigurator';

interface ProductLineItemProps {
  item: OfferLineItem;
  alternatives: OfferProduct[];
  globalMarkup: number;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onProductSwap: (itemId: string, productId: string) => void;
  onLocalPurchasePriceChange: (itemId: string, price: number | undefined) => void;
  onLocalMarkupChange: (itemId: string, markup: number | undefined) => void;
  onResetMarkup: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onHoursChange: (itemId: string, role: 'meister' | 'geselle' | 'monteur', totalHours: number) => void;
}

export const ProductLineItem = ({
  item,
  alternatives,
  globalMarkup,
  onQuantityChange,
  onProductSwap,
  onLocalPurchasePriceChange,
  onLocalMarkupChange,
  onResetMarkup,
  onRemove,
  onHoursChange
}: ProductLineItemProps) => {
  // Previous values for reverting on empty/invalid input
  const [prevPurchasePrice, setPrevPurchasePrice] = useState<number>(item.unit_price);
  const [prevMarkup, setPrevMarkup] = useState<number>(globalMarkup);
  const [prevMeisterHours, setPrevMeisterHours] = useState<number>(0);
  const [prevGeselleHours, setPrevGeselleHours] = useState<number>(0);
  const [prevMonteurHours, setPrevMonteurHours] = useState<number>(0);

  // Refs for keyboard handling
  const purchasePriceRef = useRef<HTMLInputElement>(null);
  const markupRef = useRef<HTMLInputElement>(null);
  const meisterRef = useRef<HTMLInputElement>(null);
  const geselleRef = useRef<HTMLInputElement>(null);
  const monteurRef = useRef<HTMLInputElement>(null);

  // Format currency (de-DE)
  const formatEuro = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format number with 2 decimals (de-DE)
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Parse input (accept both comma and dot as decimal separator)
  const parseInput = (value: string): number | null => {
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  };

  // Get effective values
  const effectivePurchasePrice = item.localPurchasePrice ?? item.unit_price;
  const effectiveMarkup = item.localMarkup ?? globalMarkup;
  const salesPricePerUnit = effectivePurchasePrice * effectiveMarkup;
  const totalSalesPrice = salesPricePerUnit * item.quantity;

  // Handle ESC key to revert and blur
  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    prevValue: number,
    onRevert: () => void
  ) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onRevert();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Upper Controls - ~2/3 of card width */}
      <div className="grid grid-cols-[auto_minmax(200px,1fr)_minmax(180px,auto)_minmax(150px,auto)_minmax(220px,1fr)_auto] gap-5 items-start">
        {/* 1. Quantity Counter */}
        <div className="space-y-1.5">
          <Label htmlFor={`qty-${item.id}`} className="text-xs font-medium">
            Menge
          </Label>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 shrink-0"
              onClick={() => onQuantityChange(item.id, Math.max(1, item.quantity - 1))}
              aria-label="Menge verringern"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id={`qty-${item.id}`}
              type="number"
              min="1"
              step="1"
              value={item.quantity}
              onChange={e => {
                const value = parseInt(e.target.value) || 1;
                onQuantityChange(item.id, Math.max(1, value));
              }}
              className="w-16 h-9 text-center text-sm"
              aria-label={`Menge ${item.name}`}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 shrink-0"
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              aria-label="Menge erhöhen"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground block">{item.unit}</span>
        </div>

        {/* 2. Quality Dropdown */}
        <div className="space-y-1.5">
          <Label htmlFor={`quality-${item.id}`} className="text-xs font-medium">
            Qualität
          </Label>
          <Select value={item.product_id} onValueChange={value => onProductSwap(item.id, value)}>
            <SelectTrigger id={`quality-${item.id}`} className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {alternatives.map(alt => (
                <SelectItem key={alt.product_id} value={alt.product_id}>
                  {alt.qualitaetsstufe}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. Purchase Price */}
        <div className="space-y-1.5">
          <Label htmlFor={`purchase-${item.id}`} className="text-xs font-medium">
            Einkaufspreis
          </Label>
          <Input
            id={`purchase-${item.id}`}
            ref={purchasePriceRef}
            type="text"
            placeholder={formatNumber(item.unit_price)}
            value={item.localPurchasePrice !== undefined ? String(item.localPurchasePrice) : ''}
            onFocus={e => {
              setPrevPurchasePrice(effectivePurchasePrice);
              e.target.select();
            }}
            onChange={e => {
              const value = e.target.value;
              if (value === '') {
                onLocalPurchasePriceChange(item.id, undefined);
              } else {
                // Allow typing, don't validate yet
                const numValue = parseInput(value);
                if (numValue !== null) {
                  onLocalPurchasePriceChange(item.id, numValue);
                }
              }
            }}
            onBlur={e => {
              const value = e.target.value;
              if (value === '') {
                onLocalPurchasePriceChange(item.id, undefined);
              } else {
                const parsed = parseInput(value);
                if (parsed === null || parsed < 0) {
                  // Invalid, revert to previous
                  onLocalPurchasePriceChange(item.id, undefined);
                } else {
                  // Valid, store rounded value
                  onLocalPurchasePriceChange(item.id, Math.round(parsed * 100) / 100);
                }
              }
            }}
            onKeyDown={e => handleKeyDown(e, prevPurchasePrice, () => onLocalPurchasePriceChange(item.id, undefined))}
            className="h-9 text-sm text-right"
            aria-describedby={`purchase-hint-${item.id}`}
          />
          <span id={`purchase-hint-${item.id}`} className="text-xs text-muted-foreground block">
            € / {item.unit}
          </span>

          {/* Markup (below purchase price) */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Input
                id={`markup-${item.id}`}
                ref={markupRef}
                type="text"
                placeholder={formatNumber(globalMarkup)}
                value={item.localMarkup !== undefined ? String(item.localMarkup) : ''}
                onFocus={e => {
                  setPrevMarkup(effectiveMarkup);
                  e.target.select();
                }}
                onChange={e => {
                  const value = e.target.value;
                  if (value === '') {
                    onLocalMarkupChange(item.id, undefined);
                  } else {
                    const numValue = parseInput(value);
                    if (numValue !== null) {
                      onLocalMarkupChange(item.id, numValue);
                    }
                  }
                }}
                onBlur={e => {
                  const value = e.target.value;
                  if (value === '') {
                    onLocalMarkupChange(item.id, undefined);
                  } else {
                    const parsed = parseInput(value);
                    if (parsed === null || parsed < 0.5 || parsed > 5) {
                      // Invalid, revert
                      onLocalMarkupChange(item.id, undefined);
                    } else {
                      onLocalMarkupChange(item.id, Math.round(parsed * 100) / 100);
                    }
                  }
                }}
                onKeyDown={e => handleKeyDown(e, prevMarkup, () => onLocalMarkupChange(item.id, undefined))}
                className="w-20 h-7 text-xs text-right"
                aria-describedby={`markup-hint-${item.id}`}
              />
              <span id={`markup-hint-${item.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                × Aufschlag
              </span>
              {item.localMarkup !== undefined && (
                <button
                  onClick={() => onResetMarkup(item.id)}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  title="Auf global zurücksetzen"
                  aria-label="Aufschlag zurücksetzen"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Selling Price (Read-only) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Verkaufspreis</Label>
          <div
            className="space-y-1 p-2 rounded-md bg-muted/30"
            role="status"
            aria-live="polite"
            aria-label="Verkaufspreis"
          >
            <div className="text-xl font-bold leading-tight">
              {formatEuro(totalSalesPrice)}
            </div>
            <div className="text-sm text-muted-foreground leading-tight">
              {formatEuro(salesPricePerUnit)} / {item.unit}
            </div>
          </div>
        </div>

        {/* 5. Remove Button */}
        <div className="pt-6">
          <Button
            variant="destructive"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => onRemove(item.id)}
            aria-label={`${item.name} entfernen`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Labor Hours Section */}
      <div className="space-y-3">
        <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Arbeitsstunden
        </h6>
        <div className="grid grid-cols-3 gap-4">
          {/* Meister Hours */}
          <div className="space-y-1.5">
            <Label htmlFor={`meister-${item.id}`} className="text-xs font-medium">
              Meister (h)
            </Label>
            <Input
              id={`meister-${item.id}`}
              ref={meisterRef}
              type="text"
              placeholder="0.00"
              value={String(item.stunden_meister_per_unit * item.quantity)}
              onFocus={e => {
                setPrevMeisterHours(item.stunden_meister_per_unit * item.quantity);
                e.target.select();
              }}
              onChange={e => {
                const value = e.target.value;
                const numValue = parseInput(value);
                if (numValue !== null && numValue >= 0) {
                  onHoursChange(item.id, 'meister', numValue);
                }
              }}
              onBlur={e => {
                const value = e.target.value;
                const parsed = parseInput(value);
                if (parsed === null || parsed < 0) {
                  onHoursChange(item.id, 'meister', prevMeisterHours);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onHoursChange(item.id, 'meister', prevMeisterHours);
                  e.currentTarget.blur();
                }
              }}
              className="h-9 text-sm text-right"
              aria-describedby={`meister-hint-${item.id}`}
            />
            <span
              id={`meister-hint-${item.id}`}
              className="text-xs text-muted-foreground block"
              title="Stunden pro Einheit × Menge"
            >
              {formatNumber(item.stunden_meister_per_unit)} h × {item.quantity} = {formatNumber(item.stunden_meister_per_unit * item.quantity)} h
            </span>
          </div>

          {/* Geselle Hours */}
          <div className="space-y-1.5">
            <Label htmlFor={`geselle-${item.id}`} className="text-xs font-medium">
              Geselle (h)
            </Label>
            <Input
              id={`geselle-${item.id}`}
              ref={geselleRef}
              type="text"
              placeholder="0.00"
              value={String(item.stunden_geselle_per_unit * item.quantity)}
              onFocus={e => {
                setPrevGeselleHours(item.stunden_geselle_per_unit * item.quantity);
                e.target.select();
              }}
              onChange={e => {
                const value = e.target.value;
                const numValue = parseInput(value);
                if (numValue !== null && numValue >= 0) {
                  onHoursChange(item.id, 'geselle', numValue);
                }
              }}
              onBlur={e => {
                const value = e.target.value;
                const parsed = parseInput(value);
                if (parsed === null || parsed < 0) {
                  onHoursChange(item.id, 'geselle', prevGeselleHours);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onHoursChange(item.id, 'geselle', prevGeselleHours);
                  e.currentTarget.blur();
                }
              }}
              className="h-9 text-sm text-right"
              aria-describedby={`geselle-hint-${item.id}`}
            />
            <span
              id={`geselle-hint-${item.id}`}
              className="text-xs text-muted-foreground block"
              title="Stunden pro Einheit × Menge"
            >
              {formatNumber(item.stunden_geselle_per_unit)} h × {item.quantity} = {formatNumber(item.stunden_geselle_per_unit * item.quantity)} h
            </span>
          </div>

          {/* Monteur Hours */}
          <div className="space-y-1.5">
            <Label htmlFor={`monteur-${item.id}`} className="text-xs font-medium">
              Monteur (h)
            </Label>
            <Input
              id={`monteur-${item.id}`}
              ref={monteurRef}
              type="text"
              placeholder="0.00"
              value={String(item.stunden_monteur_per_unit * item.quantity)}
              onFocus={e => {
                setPrevMonteurHours(item.stunden_monteur_per_unit * item.quantity);
                e.target.select();
              }}
              onChange={e => {
                const value = e.target.value;
                const numValue = parseInput(value);
                if (numValue !== null && numValue >= 0) {
                  onHoursChange(item.id, 'monteur', numValue);
                }
              }}
              onBlur={e => {
                const value = e.target.value;
                const parsed = parseInput(value);
                if (parsed === null || parsed < 0) {
                  onHoursChange(item.id, 'monteur', prevMonteurHours);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onHoursChange(item.id, 'monteur', prevMonteurHours);
                  e.currentTarget.blur();
                }
              }}
              className="h-9 text-sm text-right"
              aria-describedby={`monteur-hint-${item.id}`}
            />
            <span
              id={`monteur-hint-${item.id}`}
              className="text-xs text-muted-foreground block"
              title="Stunden pro Einheit × Menge"
            >
              {formatNumber(item.stunden_monteur_per_unit)} h × {item.quantity} = {formatNumber(item.stunden_monteur_per_unit * item.quantity)} h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
