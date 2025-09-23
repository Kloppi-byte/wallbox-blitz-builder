import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CartSummary } from './CartSummary';

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Warenkorb</SheetTitle>
          <SheetDescription>
            Überprüfen Sie Ihre ausgewählten Produkte und erstellen Sie ein Gesamtangebot.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <CartSummary />
        </div>
      </SheetContent>
    </Sheet>
  );
}