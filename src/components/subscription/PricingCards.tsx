import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap, Building2, Loader2 } from "lucide-react";
import { useSubscription, SubscriptionPlan, PLAN_INFO } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";

interface PricingCardsProps {
  onSelectPlan?: (plan: SubscriptionPlan) => void;
}

export function PricingCards({ onSelectPlan }: PricingCardsProps) {
  const { plan: currentPlan, createCheckout, openCustomerPortal, subscribed, isLoading } = useSubscription();

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (onSelectPlan) {
      onSelectPlan(plan);
    } else if (plan !== "free" && plan !== currentPlan) {
      createCheckout(plan);
    }
  };

  const plans: { key: SubscriptionPlan; icon: React.ReactNode; popular?: boolean }[] = [
    { key: "free", icon: <Zap className="w-5 h-5" /> },
    { key: "basic", icon: <Sparkles className="w-5 h-5" /> },
    { key: "pro", icon: <Crown className="w-5 h-5" />, popular: true },
    { key: "agency", icon: <Building2 className="w-5 h-5" /> },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {plans.map(({ key, icon, popular }) => {
        const info = PLAN_INFO[key];
        const isCurrentPlan = currentPlan === key;
        const isUpgrade = getplanLevel(key) > getplanLevel(currentPlan);
        const isDowngrade = getplanLevel(key) < getplanLevel(currentPlan) && key !== "free";

        return (
          <Card 
            key={key}
            className={cn(
              "relative transition-all",
              popular && "border-primary shadow-lg shadow-primary/10",
              isCurrentPlan && "ring-2 ring-primary ring-offset-2"
            )}
          >
            {popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                Mais popular
              </Badge>
            )}
            
            {isCurrentPlan && (
              <Badge 
                variant="outline" 
                className="absolute -top-3 right-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
              >
                Plano atual
              </Badge>
            )}

            <CardHeader>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                key === "free" && "bg-muted text-muted-foreground",
                key === "basic" && "bg-blue-500/10 text-blue-600",
                key === "pro" && "bg-purple-500/10 text-purple-600",
                key === "agency" && "bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600"
              )}>
                {icon}
              </div>
              <CardTitle className="text-xl">{info.name}</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">€{info.price}</span>
                {info.price > 0 && <span className="text-muted-foreground">/mês</span>}
              </div>

              <ul className="space-y-2.5">
                {info.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              {isLoading ? (
                <Button disabled className="w-full">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A carregar...
                </Button>
              ) : isCurrentPlan ? (
                subscribed && key !== "free" ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => openCustomerPortal()}
                  >
                    Gerir subscrição
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="w-full">
                    Plano atual
                  </Button>
                )
              ) : key === "free" ? (
                <Button variant="outline" disabled className="w-full">
                  Plano gratuito
                </Button>
              ) : (
                <Button 
                  className={cn(
                    "w-full",
                    popular && "bg-primary hover:bg-primary/90"
                  )}
                  variant={isDowngrade ? "outline" : "default"}
                  onClick={() => handleSelectPlan(key)}
                >
                  {isUpgrade ? "Fazer upgrade" : "Selecionar plano"}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

function getplanLevel(plan: SubscriptionPlan): number {
  const levels: Record<SubscriptionPlan, number> = {
    free: 0,
    basic: 1,
    pro: 2,
    agency: 3,
  };
  return levels[plan];
}

interface CurrentPlanCardProps {
  className?: string;
}

export function CurrentPlanCard({ className }: CurrentPlanCardProps) {
  const { plan, subscriptionEnd, cancelAtPeriodEnd, openCustomerPortal, isLoading } = useSubscription();
  const info = PLAN_INFO[plan];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">O seu plano</CardTitle>
            <CardDescription>
              {plan === "free" 
                ? "Está a usar o plano gratuito" 
                : `Subscrito ao plano ${info.name}`
              }
            </CardDescription>
          </div>
          <Badge 
            variant="outline"
            className={cn(
              plan === "pro" && "bg-purple-500/10 text-purple-600 border-purple-500/30",
              plan === "agency" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
              plan === "basic" && "bg-blue-500/10 text-blue-600 border-blue-500/30"
            )}
          >
            {info.name}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold">€{info.price}</span>
          {info.price > 0 && <span className="text-muted-foreground">/mês</span>}
        </div>

        {subscriptionEnd && (
          <p className="text-sm text-muted-foreground">
            {cancelAtPeriodEnd 
              ? `A subscrição termina a ${new Date(subscriptionEnd).toLocaleDateString("pt-PT")}`
              : `Próxima renovação: ${new Date(subscriptionEnd).toLocaleDateString("pt-PT")}`
            }
          </p>
        )}

        {cancelAtPeriodEnd && (
          <Badge variant="outline" className="mt-2 bg-amber-500/10 text-amber-600 border-amber-500/30">
            Cancelada - ativa até ao fim do período
          </Badge>
        )}
      </CardContent>

      {plan !== "free" && (
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => openCustomerPortal()}
            disabled={isLoading}
          >
            Gerir subscrição
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
