import React, { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Sparkles, ArrowRight } from "lucide-react";
import { useSubscription, PlanLimits, PLAN_INFO } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";

interface FeatureGateProps {
  feature: keyof PlanLimits;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * FeatureGate component - conditionally renders children based on subscription plan.
 * Shows an upgrade prompt when the feature is not available.
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { canUseFeature, getUpgradeMessage, createCheckout, plan } = useSubscription();

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <UpgradePrompt 
      message={getUpgradeMessage(feature)} 
      currentPlan={plan}
      onUpgrade={createCheckout}
    />
  );
}

interface UpgradePromptProps {
  message: string;
  currentPlan: string;
  onUpgrade: (plan: "basic" | "pro" | "agency") => void;
  compact?: boolean;
}

/**
 * UpgradePrompt component - displays a prompt to upgrade the subscription plan.
 */
export function UpgradePrompt({ 
  message, 
  currentPlan, 
  onUpgrade, 
  compact = false 
}: UpgradePromptProps) {
  const suggestedPlan = currentPlan === "free" ? "basic" : currentPlan === "basic" ? "pro" : "agency";
  const planInfo = PLAN_INFO[suggestedPlan as keyof typeof PLAN_INFO];

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
        <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-sm text-muted-foreground flex-1">{message}</span>
        <Button 
          size="sm" 
          variant="outline" 
          className="gap-1 border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
          onClick={() => onUpgrade(suggestedPlan as "basic" | "pro" | "agency")}
        >
          <Crown className="w-3 h-3" />
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Crown className="w-6 h-6 text-amber-600" />
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-foreground">Funcionalidade Premium</h3>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                onClick={() => onUpgrade(suggestedPlan as "basic" | "pro" | "agency")}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade para {planInfo.name}
                <ArrowRight className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                A partir de €{planInfo.price}/mês
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface LockedOverlayProps {
  feature: keyof PlanLimits;
  children: ReactNode;
}

/**
 * LockedOverlay - Shows content with a lock overlay when feature is not available.
 * The content is still visible but not interactive.
 */
export function LockedOverlay({ feature, children }: LockedOverlayProps) {
  const { canUseFeature, createCheckout, plan } = useSubscription();

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  const suggestedPlan = plan === "free" ? "basic" : plan === "basic" ? "pro" : "agency";

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-lg">
        <div className="text-center p-4">
          <div className="inline-flex p-3 rounded-full bg-muted mb-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-2">Funcionalidade bloqueada</p>
          <Button 
            size="sm" 
            onClick={() => createCheckout(suggestedPlan as "basic" | "pro" | "agency")}
            className="gap-1"
          >
            <Crown className="w-3 h-3" />
            Fazer Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PlanBadgeProps {
  plan: string;
  className?: string;
}

/**
 * PlanBadge - Displays the current subscription plan as a badge.
 */
export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    basic: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    pro: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    agency: "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-500/30",
  };

  const planNames: Record<string, string> = {
    free: "Free",
    basic: "Basic",
    pro: "Pro",
    agency: "Agency",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium", planColors[plan] || planColors.free, className)}
    >
      {plan === "agency" && <Crown className="w-3 h-3 mr-1" />}
      {planNames[plan] || "Free"}
    </Badge>
  );
}
