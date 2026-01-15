import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PLAN_DISPLAY_INFO } from "@/types/saas";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface CurrentPlanOverviewProps {
  className?: string;
  showActions?: boolean;
}

export function CurrentPlanOverview({ className, showActions = true }: CurrentPlanOverviewProps) {
  const { 
    plan, 
    subscribed, 
    subscriptionEnd, 
    cancelAtPeriodEnd, 
    isLoading,
    openCustomerPortal,
    checkSubscription 
  } = useSubscription();

  const planInfo = PLAN_DISPLAY_INFO[plan];

  const getStatusBadge = () => {
    if (cancelAtPeriodEnd) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
          <Clock className="w-3 h-3" />
          Cancelada
        </Badge>
      );
    }
    if (subscribed) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Ativa
        </Badge>
      );
    }
    if (plan === "free") {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          Gratuito
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
        <XCircle className="w-3 h-3" />
        Inativa
      </Badge>
    );
  };

  const getPlanBadgeColor = () => {
    switch (plan) {
      case "agency":
        return "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-500/30";
      case "pro":
        return "bg-purple-500/10 text-purple-600 border-purple-500/30";
      case "basic":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Decorative gradient */}
      {plan !== "free" && (
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <div className={cn(
            "absolute inset-0 rounded-full blur-3xl",
            plan === "agency" && "bg-amber-500",
            plan === "pro" && "bg-purple-500",
            plan === "basic" && "bg-blue-500"
          )} />
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {plan !== "free" && <Crown className="w-5 h-5 text-primary" />}
              O Seu Plano
            </CardTitle>
            <CardDescription>
              {plan === "free" 
                ? "Plano gratuito com funcionalidades básicas" 
                : `Subscrição ${planInfo.name}`
              }
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Plan info */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              getPlanBadgeColor()
            )}>
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-lg">{planInfo.name}</p>
              <p className="text-sm text-muted-foreground">{planInfo.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">€{planInfo.price}</p>
            {planInfo.price > 0 && (
              <p className="text-sm text-muted-foreground">/mês</p>
            )}
          </div>
        </div>

        {/* Subscription details */}
        {subscribed && subscriptionEnd && (
          <>
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {cancelAtPeriodEnd ? "Termina em" : "Renova em"}
                  </p>
                  <p className="text-sm font-medium">
                    {format(new Date(subscriptionEnd), "d 'de' MMMM, yyyy", { locale: pt })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Próximo pagamento</p>
                  <p className="text-sm font-medium">
                    {cancelAtPeriodEnd ? "—" : `€${planInfo.price}`}
                  </p>
                </div>
              </div>
            </div>

            {cancelAtPeriodEnd && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700">
                    Subscrição cancelada
                  </p>
                  <p className="text-xs text-amber-600">
                    O acesso continua até {format(new Date(subscriptionEnd), "d 'de' MMMM", { locale: pt })}. 
                    Pode reativar a qualquer momento.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        {showActions && (
          <>
            <Separator />
            
            <div className="flex gap-2">
              {subscribed && plan !== "free" && (
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => openCustomerPortal()}
                >
                  <CreditCard className="w-4 h-4" />
                  Gerir Subscrição
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => checkSubscription()}
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
