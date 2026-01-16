import { Check, Zap, Crown, HelpCircle, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MarketplaceModule, ModulePricing } from "@/types/marketplace";

interface ModulePricingDisplayProps {
  module: MarketplaceModule;
  isSubscribed?: boolean;
  onSubscribe?: () => void;
  onViewDetails?: () => void;
  showFullDetails?: boolean;
  className?: string;
}

export function ModulePricingDisplay({
  module,
  isSubscribed,
  onSubscribe,
  onViewDetails,
  showFullDetails = false,
  className,
}: ModulePricingDisplayProps) {
  const { pricing } = module;

  const formatPrice = (price: number, currency: string = "EUR") => {
    if (price === 0) return "Grátis";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(price);
  };

  const getPricingTypeLabel = (type: string) => {
    switch (type) {
      case "free":
        return "Gratuito";
      case "fixed":
        return "Preço fixo";
      case "usage_based":
        return "Por consumo";
      case "credits":
        return "Créditos";
      case "hybrid":
        return "Híbrido";
      default:
        return type;
    }
  };

  const renderPricingSummary = () => {
    if (pricing.type === "free") {
      return (
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">Grátis</span>
        </div>
      );
    }

    if (pricing.type === "fixed_monthly" || pricing.type === "custom") {
      return (
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">
            {formatPrice(pricing.base_price, pricing.currency)}
          </span>
          <span className="text-muted-foreground">/mês</span>
        </div>
      );
    }

    if (pricing.type === "usage_based") {
      return (
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">
              {formatPrice(pricing.price_per_unit || 0, pricing.currency)}
            </span>
            <span className="text-muted-foreground">
              /{pricing.usage_unit || "uso"}
            </span>
          </div>
          {pricing.included_units && pricing.included_units > 0 && (
            <p className="text-sm text-muted-foreground">
              {pricing.included_units.toLocaleString()} {pricing.usage_unit || "usos"} incluídos
            </p>
          )}
        </div>
      );
    }

    if (pricing.type === "credits") {
      return (
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">
              {formatPrice(pricing.base_price, pricing.currency)}
            </span>
            <span className="text-muted-foreground">/mês</span>
          </div>
          {pricing.credits_included && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" />
              {pricing.credits_included.toLocaleString()} créditos incluídos
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  const renderCreditInfo = () => {
    if (!pricing.credits_included && !pricing.price_per_credit) return null;

    return (
      <div className="space-y-2 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Zap className="h-4 w-4 text-primary" />
          Sistema de Créditos
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {pricing.credits_included && (
            <div>
              <span className="text-muted-foreground">Incluídos:</span>{" "}
              <span className="font-medium">{pricing.credits_included.toLocaleString()}</span>
            </div>
          )}
          {pricing.price_per_credit && (
            <div>
              <span className="text-muted-foreground">Extra:</span>{" "}
              <span className="font-medium">
                {formatPrice(pricing.price_per_credit, pricing.currency)}/crédito
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTrialInfo = () => {
    if (!pricing.trial_days && !pricing.trial_credits) return null;

    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 text-primary text-sm">
        <Crown className="h-4 w-4" />
        <span>
          {pricing.trial_days && `${pricing.trial_days} dias grátis`}
          {pricing.trial_days && pricing.trial_credits && " + "}
          {pricing.trial_credits && `${pricing.trial_credits} créditos de teste`}
        </span>
      </div>
    );
  };

  // Compact view for cards
  if (!showFullDetails) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          {renderPricingSummary()}
          <Badge variant="secondary" className="text-xs">
            {getPricingTypeLabel(pricing.type)}
          </Badge>
        </div>
        {renderTrialInfo()}
      </div>
    );
  }

  // Full details view
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{module.name}</CardTitle>
          <Badge variant="secondary">{getPricingTypeLabel(pricing.type)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price display */}
        {renderPricingSummary()}

        {/* Trial info */}
        {renderTrialInfo()}

        <Separator />

        {/* What's included */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">O que está incluído</h4>
          <ul className="space-y-1.5">
            {module.expected_results?.slice(0, 5).map((result, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{result}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Credit info */}
        {renderCreditInfo()}

        {/* What consumes credits */}
        {(pricing.type === "credits" || pricing.type === "custom" || pricing.type === "usage_based") && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>O que consome créditos</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    Cada ação consome um número específico de créditos do seu saldo mensal.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Chamadas à API principal</li>
              <li>• Processamento de dados</li>
              <li>• Operações avançadas</li>
            </ul>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          {isSubscribed ? (
            <Button variant="outline" className="flex-1" onClick={onViewDetails}>
              Ver Detalhes
            </Button>
          ) : (
            <Button className="flex-1" onClick={onSubscribe}>
              <Crown className="h-4 w-4 mr-2" />
              {pricing.type === "free" ? "Ativar Grátis" : "Subscrever"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
