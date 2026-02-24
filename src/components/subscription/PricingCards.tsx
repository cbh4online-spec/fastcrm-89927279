import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap, Building2, Loader2, Star } from "lucide-react";
import { useSubscription, SubscriptionPlan, PLAN_INFO } from "@/contexts/SubscriptionContext";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { cn } from "@/lib/utils";

interface PricingCardsProps {
  onSelectPlan?: (plan: SubscriptionPlan) => void;
  showRecommendation?: boolean;
}

const PLAN_IDEAL_FOR: Record<SubscriptionPlan, string> = {
  starter: "For getting started with CRM basics",
  growth: "For teams ready to scale revenue",
  scale: "For companies with advanced needs",
};

export function PricingCards({ onSelectPlan, showRecommendation = true }: PricingCardsProps) {
  const { plan: currentPlan, createCheckout, openCustomerPortal, subscribed, isLoading } = useSubscription();
  const { trackCheckoutStarted } = useCRMAnalytics();

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (onSelectPlan) {
      onSelectPlan(plan);
    } else if (plan !== "starter" && plan !== currentPlan) {
      trackCheckoutStarted({ plan_type: plan, upgrade_from_plan: currentPlan });
      createCheckout(plan);
    }
  };

  const plans: { key: SubscriptionPlan; icon: React.ReactNode; popular?: boolean }[] = [
    { key: "starter", icon: <Zap className="w-6 h-6" /> },
    { key: "growth", icon: <Sparkles className="w-6 h-6" />, popular: true },
    { key: "scale", icon: <Crown className="w-6 h-6" /> },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map(({ key, icon, popular }) => {
        const info = PLAN_INFO[key];
        const isCurrentPlan = currentPlan === key;
        const isUpgrade = getPlanLevel(key) > getPlanLevel(currentPlan);

        return (
          <Card 
            key={key}
            className={cn(
              "relative transition-all hover:shadow-lg",
              popular && "border-primary border-2 shadow-lg shadow-primary/10",
              isCurrentPlan && "ring-2 ring-emerald-500 ring-offset-2"
            )}
          >
            {popular && !isCurrentPlan && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary gap-1">
                <Star className="w-3 h-3" />
                Most popular
              </Badge>
            )}
            
            {isCurrentPlan && (
              <Badge 
                variant="outline" 
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1"
              >
                <Check className="w-3 h-3" />
                Your plan
              </Badge>
            )}

            <CardHeader className="pt-8">
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center mb-4",
                key === "starter" && "bg-muted text-muted-foreground",
                key === "growth" && "bg-blue-500/10 text-blue-600",
                key === "scale" && "bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600"
              )}>
                {icon}
              </div>
              <CardTitle className="text-2xl">{info.name}</CardTitle>
              <CardDescription className="min-h-[40px]">
                {PLAN_IDEAL_FOR[key]}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">€{info.price}</span>
                {info.price > 0 && <span className="text-muted-foreground">/mo</span>}
              </div>

              <ul className="space-y-3">
                {info.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-2">
              {isLoading ? (
                <Button disabled className="w-full h-11">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </Button>
              ) : isCurrentPlan ? (
                subscribed && key !== "starter" ? (
                  <Button 
                    variant="outline" 
                    className="w-full h-11"
                    onClick={() => openCustomerPortal()}
                  >
                    Manage subscription
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="w-full h-11">
                    Your current plan
                  </Button>
                )
              ) : key === "starter" ? (
                <Button variant="outline" disabled className="w-full h-11">
                  Free plan
                </Button>
              ) : (
                <Button 
                  className={cn(
                    "w-full h-11",
                    popular && "bg-primary hover:bg-primary/90"
                  )}
                  onClick={() => handleSelectPlan(key)}
                >
                  {isUpgrade ? "Choose plan" : "Switch to this plan"}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

function getPlanLevel(plan: SubscriptionPlan): number {
  const levels: Record<SubscriptionPlan, number> = {
    starter: 0,
    growth: 1,
    scale: 2,
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
            <CardTitle className="text-lg">Your plan</CardTitle>
            <CardDescription>
              {plan === "starter" 
                ? "You're using the free plan" 
                : `Subscribed to ${info.name}`
              }
            </CardDescription>
          </div>
          <Badge 
            variant="outline"
            className={cn(
              plan === "growth" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
              plan === "scale" && "bg-amber-500/10 text-amber-600 border-amber-500/30"
            )}
          >
            {info.name}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold">€{info.price}</span>
          {info.price > 0 && <span className="text-muted-foreground">/mo</span>}
        </div>

        {subscriptionEnd && (
          <p className="text-sm text-muted-foreground">
            {cancelAtPeriodEnd 
              ? `Subscription ends ${new Date(subscriptionEnd).toLocaleDateString()}`
              : `Next renewal: ${new Date(subscriptionEnd).toLocaleDateString()}`
            }
          </p>
        )}

        {cancelAtPeriodEnd && (
          <Badge variant="outline" className="mt-2 bg-amber-500/10 text-amber-600 border-amber-500/30">
            Ending — active until period end
          </Badge>
        )}
      </CardContent>

      {plan !== "starter" && (
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => openCustomerPortal()}
            disabled={isLoading}
          >
            Manage subscription
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
