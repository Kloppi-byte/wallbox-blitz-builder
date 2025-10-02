import { useState, useRef, useEffect, KeyboardEvent, FocusEvent, ChangeEvent } from 'react';
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
  entityPricing?: {
    basePrice: number;
    factor: number;
    effectivePrice: number;
    missingColumn: boolean;
    missingPrice: boolean;
  };
  currentLocName?: string;
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
  onHoursChange,
  entityPricing,
  currentLocName
}: ProductLineItemProps) => {
  // Display values (what user sees while typing)
  const [purchasePriceDisplay, setPurchasePriceDisplay] = useState<string>('');
  const [markupDisplay, setMarkupDisplay] = useState<string>('');
  const [meisterHoursDisplay, setMeisterHoursDisplay] = useState<string>('');
  const [geselleHoursDisplay, setGeselleHoursDisplay] = useState<string>('');
  const [monteurHoursDisplay, setMonteurHoursDisplay] = useState<string>('');

  // Previous committed values for reverting
  const [prevPurchasePrice, setPrevPurchasePrice] = useState<number>(0);
  const [prevMarkup, setPrevMarkup] = useState<number>(0);
  const [prevMeisterHours, setPrevMeisterHours] = useState<number>(0);
  const [prevGeselleHours, setPrevGeselleHours] = useState<number>(0);
  const [prevMonteurHours, setPrevMonteurHours] = useState<number>(0);

  // Hours overrides (undefined = auto-scaling mode)
  const [meisterHoursOverride, setMeisterHoursOverride] = useState<number | undefined>(undefined);
  const [geselleHoursOverride, setGeselleHoursOverride] = useState<number | undefined>(undefined);
  const [monteurHoursOverride, setMonteurHoursOverride] = useState<number | undefined>(undefined);

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
    if (value === '') return null;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  };

  // Validate input characters (digits, comma, dot, empty)
  const isValidInput = (value: string): boolean => {
    return /^[0-9]*[,.]?[0-9]*$/.test(value);
  };

  // Computed hours (auto-scaling)
  const computedMeisterHours = item.stunden_meister_per_unit * item.quantity;
  const computedGeselleHours = item.stunden_geselle_per_unit * item.quantity;
  const computedMonteurHours = item.stunden_monteur_per_unit * item.quantity;

  // Effective hours (override or computed)
  const effectiveMeisterHours = meisterHoursOverride ?? computedMeisterHours;
  const effectiveGeselleHours = geselleHoursOverride ?? computedGeselleHours;
  const effectiveMonteurHours = monteurHoursOverride ?? computedMonteurHours;

  // Initialize display values from props
  useEffect(() => {
    const effectivePurchasePrice = item.localPurchasePrice ?? item.unit_price;
    const effectiveMarkup = item.localMarkup ?? globalMarkup;
    
    setPurchasePriceDisplay(formatNumber(effectivePurchasePrice));
    setMarkupDisplay(formatNumber(effectiveMarkup));
    setMeisterHoursDisplay(formatNumber(computedMeisterHours));
    setGeselleHoursDisplay(formatNumber(computedGeselleHours));
    setMonteurHoursDisplay(formatNumber(computedMonteurHours));
  }, [item.id]); // Only re-initialize when item changes

  // Auto-update hours display when quantity/hoursPerUnit changes (only if no override)
  useEffect(() => {
    if (meisterHoursOverride === undefined) {
      setMeisterHoursDisplay(formatNumber(computedMeisterHours));
    }
    if (geselleHoursOverride === undefined) {
      setGeselleHoursDisplay(formatNumber(computedGeselleHours));
    }
    if (monteurHoursOverride === undefined) {
      setMonteurHoursDisplay(formatNumber(computedMonteurHours));
    }
  }, [computedMeisterHours, computedGeselleHours, computedMonteurHours, meisterHoursOverride, geselleHoursOverride, monteurHoursOverride]);

  // Prevent scroll-wheel changes
  const preventWheel = (e: WheelEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    const refs = [purchasePriceRef, markupRef, meisterRef, geselleRef, monteurRef];
    refs.forEach(ref => {
      if (ref.current) {
        ref.current.addEventListener('wheel', preventWheel, { passive: false });
      }
    });
    return () => {
      refs.forEach(ref => {
        if (ref.current) {
          ref.current.removeEventListener('wheel', preventWheel);
        }
      });
    };
  }, []);

  // Get effective values (with entity-specific pricing)
  const effectivePurchasePrice = item.localPurchasePrice ?? (entityPricing?.effectivePrice || item.unit_price);
  const effectiveMarkup = item.localMarkup ?? globalMarkup;
  const markupMultiplier = 1 + (effectiveMarkup / 100); // Convert percentage to multiplier
  const salesPricePerUnit = effectivePurchasePrice * markupMultiplier;
  const totalSalesPrice = salesPricePerUnit * item.quantity;

  // Format factor for display (up to 3 decimals)
  const formatFactor = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }).format(value);
  };

  // Generic handlers for floating edit behavior (for price/markup)
  const createFloatingHandlers = (
    displayValue: string,
    setDisplayValue: (val: string) => void,
    prevValue: number,
    setPrevValue: (val: number) => void,
    currentValue: number,
    onCommit: (val: number | undefined) => void,
    options?: { min?: number; max?: number }
  ) => ({
    onFocus: (e: FocusEvent<HTMLInputElement>) => {
      setPrevValue(currentValue);
      e.target.select();
    },
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '' || isValidInput(value)) {
        setDisplayValue(value);
      }
    },
    onBlur: () => {
      if (displayValue === '') {
        // Revert to previous value
        setDisplayValue(formatNumber(prevValue));
        // Don't commit if reverting to default (undefined local override)
        if (prevValue === item.unit_price || prevValue === globalMarkup) {
          onCommit(undefined);
        }
      } else {
        const parsed = parseInput(displayValue);
        if (parsed === null || isNaN(parsed)) {
          // Invalid, revert to previous
          setDisplayValue(formatNumber(prevValue));
        } else {
          // Valid, optionally clamp
          let finalValue = parsed;
          if (options?.min !== undefined && finalValue < options.min) {
            finalValue = options.min;
          }
          if (options?.max !== undefined && finalValue > options.max) {
            finalValue = options.max;
          }
          // Round to 2 decimals
          finalValue = Math.round(finalValue * 100) / 100;
          setDisplayValue(formatNumber(finalValue));
          onCommit(finalValue);
        }
      }
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
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

  // Hours-specific floating handlers (sets override)
  const createHoursHandlers = (
    displayValue: string,
    setDisplayValue: (val: string) => void,
    prevValue: number,
    setPrevValue: (val: number) => void,
    effectiveHours: number,
    setOverride: (val: number | undefined) => void,
    role: 'meister' | 'geselle' | 'monteur'
  ) => ({
    onFocus: (e: FocusEvent<HTMLInputElement>) => {
      setPrevValue(effectiveHours);
      e.target.select();
    },
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '' || isValidInput(value)) {
        setDisplayValue(value);
      }
    },
    onBlur: () => {
      if (displayValue === '') {
        // Revert to previous value
        setDisplayValue(formatNumber(prevValue));
      } else {
        const parsed = parseInput(displayValue);
        if (parsed === null || isNaN(parsed) || parsed < 0) {
          // Invalid, revert to previous
          setDisplayValue(formatNumber(prevValue));
        } else {
          // Valid, set override
          const finalValue = Math.round(parsed * 100) / 100;
          setDisplayValue(formatNumber(finalValue));
          setOverride(finalValue);
          onHoursChange(item.id, role, finalValue);
        }
      }
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
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
    <div className="p-6 space-y-5">
      {/* Upper Controls - ~2/3 of card width */}
      <div className="grid grid-cols-[auto_minmax(200px,1fr)_minmax(180px,auto)_minmax(150px,auto)_minmax(220px,1fr)_auto] gap-5 items-start">
        {/* 1. Quantity Counter */}
        <div className="space-y-1.5">
          <Label htmlFor={`qty-${item.id}`} className="text-xs font-medium">
            Menge
          </Label>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0" onClick={() => onQuantityChange(item.id, Math.max(1, item.quantity - 1))} aria-label="Menge verringern">
              <Minus className="h-4 w-4" />
            </Button>
            <Input id={`qty-${item.id}`} type="number" min="1" step="1" value={item.quantity} onChange={e => {
            const value = parseInt(e.target.value) || 1;
            onQuantityChange(item.id, Math.max(1, value));
          }} className="w-16 h-9 text-center text-sm" aria-label={`Menge ${item.name}`} />
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0" onClick={() => onQuantityChange(item.id, item.quantity + 1)} aria-label="Menge erhöhen">
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
              {alternatives.map(alt => <SelectItem key={alt.product_id} value={alt.product_id}>
                  {alt.qualitaetsstufe}
                </SelectItem>)}
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
            inputMode="decimal"
            pattern="[0-9]*[,.]?[0-9]*"
            step="any"
            value={purchasePriceDisplay}
            {...createFloatingHandlers(
              purchasePriceDisplay,
              setPurchasePriceDisplay,
              prevPurchasePrice,
              setPrevPurchasePrice,
              effectivePurchasePrice,
              (val) => onLocalPurchasePriceChange(item.id, val),
              { min: 0 }
            )}
            className="h-9 text-sm text-right"
            aria-describedby={`purchase-hint-${item.id}`}
          />
          <span id={`purchase-hint-${item.id}`} className="text-xs text-muted-foreground block">
            € / {item.unit}
          </span>
          
          {/* Entity-specific pricing breakdown */}
          {entityPricing && !item.localPurchasePrice && (
            <div className="text-[10px] text-muted-foreground leading-tight space-y-0.5">
              <div>
                Basis: {formatNumber(entityPricing.basePrice)} × Faktor ({currentLocName || 'N/A'}): {formatFactor(entityPricing.factor)}
              </div>
              {entityPricing.missingColumn && (
                <div className="text-amber-600">
                  ⚠ Faktor fehlt (1,00 verwendet)
                </div>
              )}
              {entityPricing.missingPrice && (
                <div className="text-red-600">
                  ⚠ Preis fehlt
                </div>
              )}
            </div>
          )}

          {/* Markup (below purchase price) */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Input
                id={`markup-${item.id}`}
                ref={markupRef}
                 type="text"
                 inputMode="decimal"
                 pattern="[0-9]*[,.]?[0-9]*"
                 step="any"
                 value={markupDisplay}
                 {...createFloatingHandlers(
                   markupDisplay,
                   setMarkupDisplay,
                   prevMarkup,
                   setPrevMarkup,
                   effectiveMarkup,
                   (val) => onLocalMarkupChange(item.id, val),
                   { min: 0, max: 500 }
                 )}
                 className="w-20 h-7 text-xs text-right"
                 aria-describedby={`markup-hint-${item.id}`}
               />
              <span id={`markup-hint-${item.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                % Aufschlag
              </span>
              {item.localMarkup !== undefined && (
                <button
                  onClick={() => {
                    onResetMarkup(item.id);
                    setMarkupDisplay(formatNumber(globalMarkup));
                  }}
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
        <div className="space-y-1.5 mx-[20px]">
          <Label className="text-xs font-medium">Verkaufspreis</Label>
          <div className="space-y-1 p-2 rounded-md bg-muted/30" role="status" aria-live="polite" aria-label="Verkaufspreis">
            <div className="text-xl font-bold leading-tight">
              {formatEuro(totalSalesPrice)}
            </div>
            <div className="text-sm text-muted-foreground leading-tight">
              {formatEuro(salesPricePerUnit)} / {item.unit}
            </div>
          </div>
        </div>

        {/* 5. Remove Button */}
        <div className="pt-6 mx-[220px]">
          <Button variant="destructive" size="sm" className="h-9 w-9 p-0" onClick={() => onRemove(item.id)} aria-label={`${item.name} entfernen`}>
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
            <div className="flex items-center gap-2">
              <Label htmlFor={`meister-${item.id}`} className="text-xs font-medium">
                Meister (h)
              </Label>
              {meisterHoursOverride !== undefined && (
                <>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    Override
                  </span>
                  <button
                    onClick={() => {
                      setMeisterHoursOverride(undefined);
                      setMeisterHoursDisplay(formatNumber(computedMeisterHours));
                      onHoursChange(item.id, 'meister', computedMeisterHours);
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                    title="Auf Auto-Modus zurücksetzen"
                    aria-label="Auto-Modus aktivieren"
                  >
                    <RotateCcw className="h-3 w-3" /> Auto
                  </button>
                </>
              )}
            </div>
            <Input
              id={`meister-${item.id}`}
              ref={meisterRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[,.]?[0-9]*"
              step="any"
              value={meisterHoursDisplay}
              {...createHoursHandlers(
                meisterHoursDisplay,
                setMeisterHoursDisplay,
                prevMeisterHours,
                setPrevMeisterHours,
                effectiveMeisterHours,
                setMeisterHoursOverride,
                'meister'
              )}
              className="h-9 text-sm text-right"
              aria-describedby={`meister-hint-${item.id}`}
              aria-label="Meister Gesamtstunden"
            />
            <span id={`meister-hint-${item.id}`} className="text-xs text-muted-foreground block" title="Stunden pro Einheit × Menge">
              {formatNumber(item.stunden_meister_per_unit)} h × {item.quantity} = {formatNumber(computedMeisterHours)} h
            </span>
          </div>

          {/* Geselle Hours */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor={`geselle-${item.id}`} className="text-xs font-medium">
                Geselle (h)
              </Label>
              {geselleHoursOverride !== undefined && (
                <>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    Override
                  </span>
                  <button
                    onClick={() => {
                      setGeselleHoursOverride(undefined);
                      setGeselleHoursDisplay(formatNumber(computedGeselleHours));
                      onHoursChange(item.id, 'geselle', computedGeselleHours);
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                    title="Auf Auto-Modus zurücksetzen"
                    aria-label="Auto-Modus aktivieren"
                  >
                    <RotateCcw className="h-3 w-3" /> Auto
                  </button>
                </>
              )}
            </div>
            <Input
              id={`geselle-${item.id}`}
              ref={geselleRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[,.]?[0-9]*"
              step="any"
              value={geselleHoursDisplay}
              {...createHoursHandlers(
                geselleHoursDisplay,
                setGeselleHoursDisplay,
                prevGeselleHours,
                setPrevGeselleHours,
                effectiveGeselleHours,
                setGeselleHoursOverride,
                'geselle'
              )}
              className="h-9 text-sm text-right"
              aria-describedby={`geselle-hint-${item.id}`}
              aria-label="Geselle Gesamtstunden"
            />
            <span id={`geselle-hint-${item.id}`} className="text-xs text-muted-foreground block" title="Stunden pro Einheit × Menge">
              {formatNumber(item.stunden_geselle_per_unit)} h × {item.quantity} = {formatNumber(computedGeselleHours)} h
            </span>
          </div>

          {/* Monteur Hours */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor={`monteur-${item.id}`} className="text-xs font-medium">
                Monteur (h)
              </Label>
              {monteurHoursOverride !== undefined && (
                <>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    Override
                  </span>
                  <button
                    onClick={() => {
                      setMonteurHoursOverride(undefined);
                      setMonteurHoursDisplay(formatNumber(computedMonteurHours));
                      onHoursChange(item.id, 'monteur', computedMonteurHours);
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                    title="Auf Auto-Modus zurücksetzen"
                    aria-label="Auto-Modus aktivieren"
                  >
                    <RotateCcw className="h-3 w-3" /> Auto
                  </button>
                </>
              )}
            </div>
            <Input
              id={`monteur-${item.id}`}
              ref={monteurRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[,.]?[0-9]*"
              step="any"
              value={monteurHoursDisplay}
              {...createHoursHandlers(
                monteurHoursDisplay,
                setMonteurHoursDisplay,
                prevMonteurHours,
                setPrevMonteurHours,
                effectiveMonteurHours,
                setMonteurHoursOverride,
                'monteur'
              )}
              className="h-9 text-sm text-right"
              aria-describedby={`monteur-hint-${item.id}`}
              aria-label="Monteur Gesamtstunden"
            />
            <span id={`monteur-hint-${item.id}`} className="text-xs text-muted-foreground block" title="Stunden pro Einheit × Menge">
              {formatNumber(item.stunden_monteur_per_unit)} h × {item.quantity} = {formatNumber(computedMonteurHours)} h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};