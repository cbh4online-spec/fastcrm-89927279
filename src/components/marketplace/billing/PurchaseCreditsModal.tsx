import { useState } from "react";
import { Coins } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PurchaseCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages?: unknown[];
  isLoading?: boolean;
  onPurchase?: (packageId: string) => Promise<string | null>;
  moduleName?: string;
}

/** @deprecated Credit purchase is deprecated. Modules use subscriptions now. */
export function PurchaseCreditsModal({
  open,
  onOpenChange,
}: PurchaseCreditsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Sistema de Créditos Descontinuado
          </DialogTitle>
          <DialogDescription>
            Os módulos agora funcionam com subscrição mensal ou estão incluídos no seu plano.
            O sistema de créditos foi substituído.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
