import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Loader2, Download, Lock } from "lucide-react";
import { ExtensionPack, canInstallPack, PlanTier } from "@/config/extensionPacks";
import { useSubscription, PLAN_INFO } from "@/contexts/SubscriptionContext";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { cn } from "@/lib/utils";

interface ExtensionPackCardProps {
  pack: ExtensionPack;
}

const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Free",
  basic: "Basic+",
  pro: "Pro+",
  agency: "Agency",
};

export function ExtensionPackCard({ pack }: ExtensionPackCardProps) {
  const { plan, createCheckout } = useSubscription();
  const { installModule, isModuleInstalled } = useWorkspaceModules();
  const { trackPackViewed, trackPackInstallStarted, trackPackInstallCompleted, trackPackUpgradePrompted } = useCRMAnalytics();
  const [installing, setInstalling] = useState(false);

  const currentPlan = (plan || "free") as PlanTier;
  const canInstall = canInstallPack(pack, currentPlan);
  const allInstalled = pack.modules.every((slug) => isModuleInstalled(slug));
  const installedCount = pack.modules.filter((slug) => isModuleInstalled(slug)).length;

  // Track view on mount
  useEffect(() => {
    trackPackViewed({ pack_id: pack.id, pack_name: pack.name, required_plan: pack.requiredPlan });
  }, [pack.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstallPack = async () => {
    const toInstall = pack.modules.filter((slug) => !isModuleInstalled(slug));
    trackPackInstallStarted({
      pack_id: pack.id,
      pack_name: pack.name,
      modules_count: pack.modules.length,
      already_installed: installedCount,
    });
    const start = Date.now();
    setInstalling(true);
    try {
      for (const slug of toInstall) {
        await installModule(slug);
      }
      trackPackInstallCompleted({
        pack_id: pack.id,
        pack_name: pack.name,
        modules_installed: toInstall.length,
        duration_ms: Date.now() - start,
      });
    } finally {
      setInstalling(false);
    }
  };

  const handleUpgrade = () => {
    trackPackUpgradePrompted({
      pack_id: pack.id,
      pack_name: pack.name,
      required_plan: pack.requiredPlan,
      current_plan: currentPlan,
    });
    createCheckout(suggestedPlan as "basic" | "pro" | "agency");
  };

  const suggestedPlan = pack.requiredPlan;
  const planInfo = PLAN_INFO[suggestedPlan as keyof typeof PLAN_INFO];

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-md",
      !canInstall && "border-dashed border-muted-foreground/30"
    )}>
      {/* Color accent top bar */}
      <div className="h-1.5 w-full" style={{ background: pack.color }} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${pack.color}20` }}
            >
              {pack.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{pack.name}</h3>
              <p className="text-sm text-muted-foreground">{pack.description}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "flex-shrink-0 text-xs",
              canInstall
                ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                : "border-amber-500/30 text-amber-600 bg-amber-500/10"
            )}
          >
            {canInstall ? <Check className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
            {PLAN_LABELS[pack.requiredPlan]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Modules list */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {pack.modules.length} módulos incluídos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pack.modules.map((slug) => {
              const installed = isModuleInstalled(slug);
              return (
                <Badge
                  key={slug}
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    installed && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  )}
                >
                  {installed && <Check className="w-3 h-3 mr-1" />}
                  {slug}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Action area */}
        {canInstall ? (
          allInstalled ? (
            <Button disabled className="w-full gap-2" variant="outline">
              <Check className="w-4 h-4" />
              Todos instalados
            </Button>
          ) : (
            <Button
              onClick={handleInstallPack}
              disabled={installing}
              className="w-full gap-2"
            >
              {installing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {installing
                ? "A instalar..."
                : installedCount > 0
                  ? `Instalar ${pack.modules.length - installedCount} restante(s)`
                  : "Instalar Pack"}
            </Button>
          )
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">
                Disponível no plano {planInfo?.name || suggestedPlan}
                {planInfo?.price ? ` — €${planInfo.price}/mês` : ""}
              </span>
            </div>
            <Button
              onClick={handleUpgrade}
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <Crown className="w-4 h-4" />
              Fazer Upgrade
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
