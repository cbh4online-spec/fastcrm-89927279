import { Calendar, Crown, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ModuleSubscription } from "@/hooks/useModuleBilling";

interface ModuleSubscriptionCardProps {
  subscription: ModuleSubscription | null;
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
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
            Ativo
          </Badge>
        );
      case "trialing":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            Período de Teste
          </Badge>
        );
      case "past_due":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pagamento Pendente
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">Cancelado</Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Not subscribed state
  if (!subscription) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">
                {moduleName ? `Ativar ${moduleName}` : "Ativar Módulo"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {modulePrice && modulePrice > 0
                  ? `A partir de ${modulePrice}€/mês`
                  : "Gratuito"}
              </p>
            </div>
            {onSubscribe && (
              <Button onClick={onSubscribe} className="w-full">
                <Crown className="h-4 w-4 mr-2" />
                Subscrever Agora
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
        {/* Subscription details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ciclo de faturação</span>
            <span className="font-medium capitalize">
              {subscription.billing_cycle === "monthly" ? "Mensal" : "Anual"}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Período atual
            </span>
            <span className="font-medium">
              {new Date(subscription.current_period_start).toLocaleDateString("pt-PT")} -{" "}
              {new Date(subscription.current_period_end).toLocaleDateString("pt-PT")}
            </span>
          </div>
        </div>

        {/* Next renewal info */}
        {subscription.status === "active" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Renova automaticamente a{" "}
              <span className="font-medium text-foreground">
                {new Date(subscription.current_period_end).toLocaleDateString("pt-PT")}
              </span>
            </span>
          </div>
        )}

        {/* Past due warning */}
        {subscription.status === "past_due" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive">
              Atualiza o método de pagamento para continuar a usar o módulo
            </span>
          </div>
        )}

        {/* Manage button */}
        {onManage && (
          <Button variant="outline" onClick={onManage} className="w-full">
            Gerir Subscrição
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
