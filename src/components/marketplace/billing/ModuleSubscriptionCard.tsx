import { Calendar, Crown, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleSubscriptionInfo } from "@/hooks/useModuleBilling";

interface ModuleSubscriptionCardProps {
  subscription: ModuleSubscriptionInfo | null;
  moduleName?: string;
  modulePrice?: number;
  isLoading?: boolean;
  onSubscribe?: () => void;
  onManage?: () => void;
  className?: string;
}

export function ModuleSubscriptionCard({
  subscription,
  moduleName,
  modulePrice,
  isLoading,
  onSubscribe,
  onManage,
  className,
}: ModuleSubscriptionCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Ativo</Badge>;
      case "trial":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Trial</Badge>;
      case "canceled":
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!subscription) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{moduleName ? `Ativar ${moduleName}` : "Ativar Módulo"}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {modulePrice && modulePrice > 0 ? `${modulePrice}€/mês` : "Gratuito / Incluído no plano"}
              </p>
            </div>
            {onSubscribe && (
              <Button onClick={onSubscribe} className="w-full">
                <Crown className="h-4 w-4 mr-2" />
                Instalar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Subscrição
          </CardTitle>
          {getStatusBadge(subscription.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Modelo</span>
            <span className="font-medium capitalize">{subscription.pricing_model}</span>
          </div>
          {subscription.price_eur > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Preço</span>
              <span className="font-medium">{subscription.price_eur}€/mês</span>
            </div>
          )}
          {subscription.current_period_end && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Próxima renovação
              </span>
              <span className="font-medium">
                {new Date(subscription.current_period_end).toLocaleDateString("pt-PT")}
              </span>
            </div>
          )}
        </div>

        {subscription.cancel_at_period_end && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
            <AlertCircle className="h-4 w-4 text-warning" />
            <span>Cancela no final do período</span>
          </div>
        )}

        {onManage && subscription.pricing_model === "monthly" && (
          <Button variant="outline" onClick={onManage} className="w-full">
            Gerir Subscrição
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
