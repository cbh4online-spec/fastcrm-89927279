import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe, Search, Users, ArrowRight, Coins,
  BarChart3, Lock, Crown, Target, Activity, History,
  Clock, Download, CheckCircle2, XCircle, Shield,
  Rocket, Star, Info, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ProspectingAnalytics } from "@/components/prospecting/ProspectingAnalytics";
import { useProspectingSearchHistory } from "@/hooks/useProspectingSearchHistory";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { IXCard } from "@/components/entity/ix/IXCard";
import { IXEntityTabs } from "@/components/entity/ix/IXEntityTabs";
import { useState } from "react";
import { cn } from "@/lib/utils";

const PROSPECTING_LIMITS: Record<string, { searches: number; label: string }> = {
  starter: { searches: 0, label: "Indisponível" },
  growth: { searches: 100, label: "100 pesquisas/mês" },
  scale: { searches: -1, label: "Ilimitado" },
};

const modules = [
  {
    title: "Google Local",
    description: "Encontre negócios locais através do Google Maps e diretórios locais.",
    icon: Globe,
    path: "/dashboard/prospecting/google-local",
    actionKey: "prospecting_google_local_search",
  },
  {
    title: "Web Search",
    description: "Pesquise profissionais e empresas na web com critérios avançados.",
    icon: Search,
    path: "/dashboard/prospecting/web-search",
    actionKey: "prospecting_web_search",
  },
  {
    title: "Profissionais",
    description: "Descubra profissionais em redes sociais e plataformas especializadas.",
    icon: Users,
    path: "/dashboard/prospecting/professionals",
    actionKey: "prospecting_professional_search",
  },
];

function SearchHistorySection() {
  const navigate = useNavigate();
  const { searches: googleSearches, isLoading: gl } = useProspectingSearchHistory("google_local");
  const { searches: webSearches, isLoading: wl } = useProspectingSearchHistory("web_search");

  const allSearches = [...(googleSearches || []), ...(webSearches || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30);

  const isLoading = gl || wl;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  if (allSearches.length === 0) {
    return (
      <IXCard>
        <div className="flex flex-col items-center justify-center text-center py-10">
          <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-medium mb-1">Sem pesquisas anteriores</h3>
          <p className="text-xs text-muted-foreground">
            As suas pesquisas de prospeção aparecerão aqui.
          </p>
        </div>
      </IXCard>
    );
  }

  return (
    <div className="space-y-2">
      {allSearches.map(s => (
        <div
          key={s.id}
          className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            {s.search_type === 'google_local'
              ? <Globe className="h-4 w-4 text-muted-foreground" />
              : <Search className="h-4 w-4 text-muted-foreground" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{s.query}</p>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {s.location && <span className="truncate">📍 {s.location}</span>}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(s.created_at), "d MMM, HH:mm", { locale: pt })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-xs gap-1 font-normal">
              <Target className="h-3 w-3" />
              {s.results_count} resultados
            </Badge>
            {s.imported_count > 0 && (
              <Badge variant="outline" className="text-xs gap-1 font-normal">
                <Download className="h-3 w-3" />
                {s.imported_count} importados
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => navigate(
                s.search_type === "google_local"
                  ? "/dashboard/prospecting/google-local"
                  : "/dashboard/prospecting/web-search"
              )}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Repetir
            </Button>
            {s.imported_count > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => navigate(`/dashboard/leads?source=${s.search_type}`)}
              >
                <Users className="h-3.5 w-3.5" />
                Ver leads
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProspectingHub() {
  const navigate = useNavigate();
  const { balance, getCost, pricingRules } = useCreditWallet();
  const { plan, createCheckout } = useSubscription();
  const [activeTab, setActiveTab] = useState("tools");

  const planLimits = PROSPECTING_LIMITS[plan] || PROSPECTING_LIMITS.starter;
  const isLocked = plan === "starter";
  const prospectingRules = pricingRules.filter(r => r.module === "prospecting");

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header IX — limpo, sem gradientes */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Prospeção</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Encontre novos leads e oportunidades com ferramentas de pesquisa inteligentes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1.5 font-normal">
              <Coins className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{balance}</span>
              <span className="text-muted-foreground text-xs">créditos</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1.5 font-normal capitalize">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              {plan}
            </Badge>
          </div>
        </div>

        {isLocked && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <Lock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Módulo de Prospeção requer plano Growth ou superior
              </p>
              <p className="text-xs text-muted-foreground">
                Faça upgrade para aceder a todas as ferramentas de prospeção.
              </p>
            </div>
            <Button size="sm" onClick={() => createCheckout("growth")} className="gap-1.5">
              <Crown className="h-4 w-4" />
              Upgrade
            </Button>
          </div>
        )}

        {/* Tabs IX */}
        <div className="-mx-6">
          <IXEntityTabs
            tabs={[
              { id: "tools", label: "Ferramentas" },
              { id: "history", label: "Histórico" },
              { id: "analytics", label: "Analytics" },
              { id: "pricing", label: "Precificação" },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {activeTab === "tools" && (
          <div className="space-y-4">
            {!isLocked && planLimits.searches > 0 && (
              <IXCard contentClassName="py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Utilização mensal</span>
                  <span className="text-xs text-muted-foreground">{planLimits.label}</span>
                </div>
                <Progress value={0} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-2">
                  Pesquisas utilizadas este mês (baseado no consumo de créditos).
                </p>
              </IXCard>
            )}

            <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", isLocked && "opacity-50 pointer-events-none")}>
              {modules.map((mod) => {
                const cost = getCost(mod.actionKey);
                const canAfford = balance >= cost;
                return (
                  <button
                    key={mod.path}
                    onClick={() => !isLocked && navigate(mod.path)}
                    className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                        <mod.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <Badge variant="outline" className="gap-1 text-xs font-normal">
                        <Coins className="h-3 w-3" />
                        {cost} créditos
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-foreground">{mod.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{mod.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                        Começar <ArrowRight className="h-4 w-4" />
                      </span>
                      {!canAfford && <span className="text-xs text-destructive">Saldo insuficiente</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "history" && <SearchHistorySection />}

        {activeTab === "analytics" && <ProspectingAnalytics />}

        {activeTab === "pricing" && (
          <div className="space-y-6">
            {/* Saldo — cartão limpo */}
            <IXCard>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo atual</p>
                  <p className="mt-1 text-3xl font-bold text-foreground tabular-nums">
                    {balance} <span className="text-base font-normal text-muted-foreground">créditos</span>
                  </p>
                </div>
                <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1.5 font-normal self-start capitalize">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  Plano {plan}
                </Badge>
              </div>
            </IXCard>

            {/* Tabela de custos */}
            <IXCard
              title="Tabela de custos — Prospeção"
              description="Cada ação consome créditos do seu saldo. Veja abaixo o custo de cada operação."
              contentClassName="px-0 pb-0"
            >
              {["search", "ai", "action"].map((cat) => {
                const catRules = prospectingRules.filter(r => r.category === cat);
                if (catRules.length === 0) return null;
                const catLabel = cat === "search" ? "Pesquisa" : cat === "ai" ? "Inteligência Artificial" : "Ações";
                const CatIcon = cat === "search" ? Search : cat === "ai" ? Zap : Activity;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 px-6 py-2.5 bg-muted/40 border-y border-border">
                      <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{catLabel}</span>
                    </div>
                    <div className="divide-y divide-border">
                      {catRules.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between px-6 py-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{rule.label}</p>
                            {rule.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base font-bold text-foreground tabular-nums">{rule.credits_cost}</p>
                            <p className="text-[10px] text-muted-foreground">créditos</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {prospectingRules.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <Info className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma regra de precificação configurada.</p>
                </div>
              )}
            </IXCard>

            {/* Comparar planos */}
            <div>
              <h3 className="text-base font-semibold text-foreground">Comparar planos</h3>
              <p className="text-xs text-muted-foreground mb-4">Escolha o plano ideal para as suas necessidades de prospeção.</p>

              <div className="grid gap-4 sm:grid-cols-3">
                {([
                  { key: "starter" as const, icon: Shield, features: ["Acesso limitado ao CRM", "Sem prospeção", "Sem IA"], highlighted: false },
                  { key: "growth" as const, icon: Rocket, features: ["100 pesquisas/mês", "Google Local + Web", "Enriquecimento IA", "Importação de leads", "Histórico de pesquisas"], highlighted: true },
                  { key: "scale" as const, icon: Star, features: ["Pesquisas ilimitadas", "Todas as fontes", "IA avançada", "Outreach automático", "API de prospeção", "Suporte prioritário"], highlighted: false },
                ]).map(({ key: p, icon: PlanIcon, features, highlighted }) => {
                  const limits = PROSPECTING_LIMITS[p];
                  const isCurrent = plan === p;
                  return (
                    <div
                      key={p}
                      className={cn(
                        "relative flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-all",
                        highlighted ? "border-primary ring-1 ring-primary/20" : "border-border",
                      )}
                    >
                      {highlighted && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Recomendado
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlanIcon className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-semibold text-base capitalize text-foreground">{p}</h4>
                        </div>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-[10px] font-normal">Atual</Badge>
                        )}
                      </div>

                      <div>
                        <p className="text-3xl font-bold text-foreground tabular-nums">
                          {limits.searches === -1 ? "∞" : limits.searches}
                        </p>
                        <p className="text-xs text-muted-foreground">{limits.label}</p>
                      </div>

                      <ul className="space-y-2 border-t border-border pt-4">
                        {features.map((f) => {
                          const isNegative = p === "starter" && f.startsWith("Sem");
                          return (
                            <li key={f} className="flex items-center gap-2 text-sm">
                              {isNegative
                                ? <XCircle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                                : <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                              <span className={cn(isNegative ? "text-muted-foreground" : "text-foreground")}>{f}</span>
                            </li>
                          );
                        })}
                      </ul>

                      {!isCurrent && p !== "starter" && (
                        <Button
                          className="w-full mt-auto gap-1.5"
                          variant={highlighted ? "default" : "outline"}
                          onClick={() => createCheckout(p)}
                        >
                          <Crown className="h-4 w-4" />
                          Upgrade para {p}
                        </Button>
                      )}
                      {isCurrent && (
                        <div className="text-center text-xs text-muted-foreground mt-auto">
                          O seu plano atual
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Como funcionam os créditos?</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Cada ação de prospeção consome créditos do seu saldo. O custo varia consoante o tipo de operação — pesquisas simples custam menos, enquanto ações de IA (como enriquecimento e qualificação) consomem mais. Os créditos são deduzidos automaticamente e pode consultar o histórico de consumo na aba Analytics.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
