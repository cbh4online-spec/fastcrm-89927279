import { Link } from "react-router-dom";
import { SettingsSection } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, Crown, RefreshCw, Plug, ArrowRight } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { CurrentPlanOverview, UsageDashboard, UsageAlertsBanner } from "@/components/saas";
import { PricingCards } from "@/components/subscription/PricingCards";
import { CompanyBillingForm } from "./CompanyBillingForm";

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

      {/* Payment Gateways shortcut */}
      <SettingsSection
        title="Gateways de Pagamento"
        description="Configura Stripe, ifthenpay e outros métodos de cobrança"
        icon={<Plug className="h-5 w-5" />}
      >
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="text-sm text-muted-foreground">
            Hub unificado para gerir os fornecedores de pagamento do workspace.
          </div>
          <Button asChild size="sm">
            <Link to="/settings/payment-gateways">
              Abrir hub <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SettingsSection>

      {/* Company Billing Data */}
      {shouldShow("billing-company") && (
        <SettingsSection
          title="Dados de Faturação"
          description="Informações da empresa para emissão de faturas"
          icon={<Building2 className="h-5 w-5" />}
        >
          <CompanyBillingForm />
        </SettingsSection>
      )}

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
      {shouldShow("billing-upgrade") && plan !== "scale" && (
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
