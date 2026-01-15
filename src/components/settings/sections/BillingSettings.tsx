import { SettingsSection } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { CreditCard, Crown, RefreshCw } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { CurrentPlanOverview, UsageDashboard, UsageAlertsBanner } from "@/components/saas";
import { PricingCards } from "@/components/subscription/PricingCards";

interface BillingSettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

export function BillingSettings({ searchQuery = "", matchedSections }: BillingSettingsProps) {
  const { plan, checkSubscription, isLoading } = useSubscription();
  const hasSearch = searchQuery.trim().length > 0;

  const shouldShow = (sectionId: string) => {
    if (!hasSearch || !matchedSections) return true;
    return matchedSections.has(sectionId);
  };

  return (
    <div className="space-y-6">
      {/* Usage Alerts */}
      <UsageAlertsBanner />

      {/* Current Plan Overview */}
      {shouldShow("billing-plan") && (
        <SettingsSection
          title="Plano & Subscrição"
          description="Detalhes do seu plano atual e estado da subscrição"
          icon={<Crown className="h-5 w-5" />}
        >
          <CurrentPlanOverview showActions={true} />
        </SettingsSection>
      )}

      {/* Usage Dashboard */}
      {shouldShow("billing-usage") && (
        <SettingsSection
          title="Utilização"
          description="Consumo atual vs limites do seu plano"
          icon={<CreditCard className="h-5 w-5" />}
        >
          <UsageDashboard />
        </SettingsSection>
      )}

      {/* Upgrade Options */}
      {shouldShow("billing-upgrade") && plan !== "agency" && (
        <SettingsSection
          title="Fazer Upgrade"
          description="Compare planos e faça upgrade para desbloquear mais funcionalidades"
          icon={<Crown className="h-5 w-5" />}
        >
          <PricingCards />
        </SettingsSection>
      )}

      {/* Sync Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => checkSubscription()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Sincronizar com Stripe
        </Button>
      </div>
    </div>
  );
}
