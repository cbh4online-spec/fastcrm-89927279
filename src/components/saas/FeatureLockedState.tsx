import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, ArrowRight, Sparkles } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PLAN_DISPLAY_INFO, FEATURE_MODULES } from "@/types/saas";
import { cn } from "@/lib/utils";

interface FeatureLockedStateProps {
  featureKey: string;
  className?: string;
  compact?: boolean;
  children?: React.ReactNode;
}

export function FeatureLockedState({ 
  featureKey, 
  className,
  compact = false,
  children 
}: FeatureLockedStateProps) {
  const { plan, createCheckout } = useSubscription();
  const feature = FEATURE_MODULES[featureKey];

  const getRequiredPlan = () => {
    // Determine which plan unlocks this feature
    if (["inbox_enabled", "automations_enabled", "templates_enabled", "proposals_enabled", "landing_pages_enabled", "integrations_enabled"].includes(featureKey)) {
      return "basic";
    }
    if (["ai_suggestions_enabled", "ai_insights_enabled", "dashboard_customization", "sidebar_customization"].includes(featureKey)) {
      return "pro";
    }
    return "agency";
  };

  const requiredPlan = getRequiredPlan();
  const requiredPlanInfo = PLAN_DISPLAY_INFO[requiredPlan as keyof typeof PLAN_DISPLAY_INFO];

  const handleUpgrade = () => {
    createCheckout(requiredPlan as "basic" | "pro" | "agency");
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5",
        className
      )}>
        <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{feature?.name || featureKey}</p>
          <p className="text-xs text-muted-foreground">Requer plano {requiredPlanInfo.name}</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleUpgrade} className="flex-shrink-0 gap-1">
          <Crown className="w-3 h-3" />
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden border-amber-500/30",
      className
    )}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5" />
      
      <CardHeader className="relative text-center pb-2">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
          <Lock className="w-8 h-8 text-amber-600" />
        </div>
        
        <CardTitle className="text-xl">
          {feature?.name || "Funcionalidade Bloqueada"}
        </CardTitle>
        
        <CardDescription>
          {feature?.description || "Esta funcionalidade não está disponível no seu plano atual."}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Plan requirement */}
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Plano {requiredPlanInfo.name}</span>
                <Badge variant="outline">€{requiredPlanInfo.price}/mês</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {requiredPlanInfo.description}
              </p>
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Inclui:</p>
          <ul className="space-y-1.5">
            {requiredPlanInfo.features.slice(0, 4).map((feat, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Button onClick={handleUpgrade} className="w-full gap-2" size="lg">
          <Crown className="w-4 h-4" />
          Fazer Upgrade para {requiredPlanInfo.name}
          <ArrowRight className="w-4 h-4" />
        </Button>

        {children}
      </CardContent>
    </Card>
  );
}

// HOC for wrapping components with feature lock check
export function withFeatureLock<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureKey: string
) {
  return function FeatureLockedComponent(props: P) {
    const { canUseFeature } = useSubscription();
    
    // For now, we'll need to check asynchronously, so this is a simplified version
    // In production, you'd want to use the hook directly in the component
    const hasAccess = canUseFeature(featureKey as keyof import("@/contexts/SubscriptionContext").PlanLimits);

    if (!hasAccess) {
      return <FeatureLockedState featureKey={featureKey} />;
    }

    return <WrappedComponent {...props} />;
  };
}
