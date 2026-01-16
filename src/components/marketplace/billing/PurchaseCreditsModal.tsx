import { useState } from "react";
import { Coins, Zap, Check, Sparkles, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CreditPackage } from "@/hooks/useModuleBilling";

interface PurchaseCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: CreditPackage[];
  isLoading?: boolean;
  onPurchase: (packageId: string) => Promise<string | null>;
  moduleName?: string;
}

export function PurchaseCreditsModal({
  open,
  onOpenChange,
  packages,
  isLoading,
  onPurchase,
  moduleName,
}: PurchaseCreditsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    try {
      const url = await onPurchase(selectedPackage);
      if (url) {
        window.open(url, "_blank");
        onOpenChange(false);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price);
  };

  const getPricePerCredit = (pkg: CreditPackage) => {
    return (pkg.price / pkg.credits_amount).toFixed(3);
  };

  // Find best value package (lowest price per credit)
  const bestValuePackageId = packages.reduce((best, pkg) => {
    const currentBest = packages.find((p) => p.id === best);
    if (!currentBest) return pkg.id;
    const currentPrice = currentBest.price / currentBest.credits_amount;
    const thisPrice = pkg.price / pkg.credits_amount;
    return thisPrice < currentPrice ? pkg.id : best;
  }, packages[0]?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Comprar Créditos
          </DialogTitle>
          <DialogDescription>
            {moduleName
              ? `Adiciona créditos extras para o módulo ${moduleName}`
              : "Escolhe um pacote de créditos para continuar a usar os módulos"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Não há pacotes de créditos disponíveis</p>
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => {
                const isSelected = selectedPackage === pkg.id;
                const isBestValue = pkg.id === bestValuePackageId && packages.length > 1;

                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-all",
                      "hover:border-primary/50 hover:bg-primary/5",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{pkg.name}</span>
                          {isBestValue && (
                            <Badge className="bg-gradient-to-r from-primary to-primary/80">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Melhor valor
                            </Badge>
                          )}
                          {pkg.discount_percent && pkg.discount_percent > 0 && (
                            <Badge variant="secondary">
                              -{pkg.discount_percent}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Zap className="h-3.5 w-3.5" />
                            {pkg.credits_amount.toLocaleString()} créditos
                          </span>
                          <span>•</span>
                          <span>
                            {getPricePerCredit(pkg)}€/crédito
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          {formatPrice(pkg.price, pkg.currency)}
                        </p>
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary ml-auto mt-1" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={!selectedPackage || isPurchasing}
            className="flex-1"
          >
            {isPurchasing ? (
              "A processar..."
            ) : (
              <>
                Comprar
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
