import { Coins, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCreditPurchase } from "@/hooks/useCreditPurchase";
import { useState } from "react";

const packageIcons = [Zap, Sparkles, Crown];
const packageHighlight = [false, true, false]; // "Popular" is highlighted

export function CreditPurchasePanel() {
  const { packages, packagesLoading, purchaseCredits } = useCreditPurchase();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    setLoadingId(packageId);
    try {
      await purchaseCredits.mutateAsync(packageId);
    } finally {
      setLoadingId(null);
    }
  };

  if (packagesLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-24 bg-muted/30" />
            <CardContent className="space-y-3 pt-4">
              <div className="h-6 bg-muted/30 rounded w-1/2" />
              <div className="h-10 bg-muted/30 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Comprar Créditos</h3>
        <p className="text-sm text-muted-foreground">
          Recarrega a tua carteira para usar funcionalidades de IA
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {packages.map((pkg, index) => {
          const Icon = packageIcons[index] || Coins;
          const isHighlighted = packageHighlight[index];
          const pricePerCredit = (pkg.price / pkg.credits_amount).toFixed(2);
          const isLoading = loadingId === pkg.id;

          return (
            <Card
              key={pkg.id}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                isHighlighted
                  ? "border-primary shadow-primary/10 shadow-md ring-1 ring-primary/20"
                  : "border-border/50 hover:border-primary/30"
              }`}
            >
              {isHighlighted && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary" />
              )}
              <CardHeader className="pb-2 pt-5">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isHighlighted ? "bg-primary/15" : "bg-muted/50"
                  }`}>
                    <Icon className={`h-5 w-5 ${isHighlighted ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  {isHighlighted && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                      Mais popular
                    </Badge>
                  )}
                  {index === 2 && (
                    <Badge variant="outline" className="text-xs border-green-500/30 text-green-500">
                      Melhor valor
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-2">{pkg.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{pkg.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{pkg.credits_amount}</span>
                    <span className="text-sm text-muted-foreground">créditos</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-semibold">€{pkg.price.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    €{pricePerCredit} por crédito
                  </p>
                </div>

                <Button
                  className={`w-full gap-2 ${
                    isHighlighted
                      ? "bg-gradient-to-r from-primary to-primary/80"
                      : ""
                  }`}
                  variant={isHighlighted ? "default" : "outline"}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={isLoading || purchaseCredits.isPending}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A processar...
                    </>
                  ) : (
                    <>
                      <Coins className="h-4 w-4" />
                      Comprar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
