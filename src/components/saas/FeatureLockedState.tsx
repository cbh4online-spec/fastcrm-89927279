import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, ArrowRight, Sparkles, Check } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PLAN_DISPLAY_INFO, FEATURE_MODULES } from "@/types/saas";
import { cn } from "@/lib/utils";

interface FeatureLockedStateProps {
  featureKey: string;
  className?: string;
  compact?: boolean;
  children?: React.ReactNode;
}

// Microcopy orientado a valor - nunca usar "erro" ou "não permitido"
const getFeatureMicrocopy = (featureName: string, planName: string) => ({
  title: featureName,
  description: `Esta funcionalidade está disponível no plano ${planName}.`,
  benefit: `Com o plano ${planName}, tens acesso a ${featureName.toLowerCase()} e muito mais.`,
  action: `Desbloquear com ${planName}`,
});

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
  const featureName = feature?.name || "Esta funcionalidade";
  const microcopy = getFeatureMicrocopy(featureName, requiredPlanInfo.name);

  const handleUpgrade = () => {
    createCheckout(requiredPlan as "basic" | "pro" | "agency");
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-xl border border-dashed border-amber-500/40 bg-gradient-to-r from-amber-500/5 to-orange-500/5",
        className
      )}>
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Lock className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{featureName}</p>
          <p className="text-xs text-muted-foreground">
            Disponível no plano {requiredPlanInfo.name}
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={handleUpgrade} 
          className="flex-shrink-0 gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          <Crown className="w-3 h-3" />
          Ver planos
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden border-dashed border-2 border-amber-500/30",
      className
    )}>
      {/* Background gradient suave */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5" />
      
      <CardHeader className="relative text-center pb-4">
        <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
          <Lock className="w-10 h-10 text-amber-600" />
        </div>
        
        <CardTitle className="text-2xl">
          {microcopy.title}
        </CardTitle>
        
        <CardDescription className="text-base">
          {microcopy.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative space-y-5">
        {/* Plan card - orientado a benefícios */}
        <div className="p-5 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-xl">Plano {requiredPlanInfo.name}</span>
                <Badge className="bg-primary/10 text-primary border-0 text-sm">
                  €{requiredPlanInfo.price}/mês
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {requiredPlanInfo.description}
              </p>
              
              {/* Benefícios - foco no valor */}
              <ul className="space-y-2">
                {requiredPlanInfo.features.slice(0, 4).map((feat, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-sm">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CTA principal */}
        <Button 
          onClick={handleUpgrade} 
          className="w-full gap-2 h-12 text-base bg-gradient-to-r from-primary to-primary/80" 
          size="lg"
        >
          <Crown className="w-5 h-5" />
          {microcopy.action}
          <ArrowRight className="w-5 h-5" />
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
    
    const hasAccess = canUseFeature(featureKey as keyof import("@/contexts/SubscriptionContext").PlanLimits);

    if (!hasAccess) {
      return <FeatureLockedState featureKey={featureKey} />;
    }

    return <WrappedComponent {...props} />;
  };
}
