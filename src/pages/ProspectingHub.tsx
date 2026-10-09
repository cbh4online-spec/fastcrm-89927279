import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe, Search, Users, ArrowRight, Coins,
  Lock, Crown, Target, Activity, History,
  Clock, CheckCircle2, XCircle, Shield,
  Rocket, Star, Info, Zap, Instagram,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ProspectingAnalytics } from "@/components/prospecting/ProspectingAnalytics";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { IXCard } from "@/components/entity/ix/IXCard";
import { IXEntityTabs } from "@/components/entity/ix/IXEntityTabs";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { supabase } from "@/integrations/supabase/client";

const PROSPECTING_LIMITS: Record<string, { searches: number; label: string }> = {
  starter: { searches: 0, label: "Indisponível" },
  growth: { searches: 100, label: "100 pesquisas externas/mês" },
  scale: { searches: 500, label: "500 pesquisas externas/mês" },
};

const modules = [
  {
    title: "Google Local",
    description: "Encontre negócios locais através do Google Maps e diretórios locais.",
    icon: Globe,
    path: "/dashboard/prospecting/google-local",
    actionKey: "prospecting_google_local_search",
    moduleSlug: "google-local-services",
  },
  {
    title: "Web Search",
    description: "Pesquise profissionais e empresas na web com critérios avançados.",
    icon: Search,
    path: "/dashboard/prospecting/web-search",
    actionKey: "prospecting_web_search",
    moduleSlug: null,
  },
  {
    title: "Profissionais",
    description: "Descubra profissionais em redes sociais e plataformas especializadas.",
    icon: Users,
    path: "/dashboard/prospecting/professionals",
    actionKey: "prospecting_professional_search",
    moduleSlug: "prospecting-pro",
  },
  {
    title: "Extrator de Instagram",
    description: "Recolha em massa perfis públicos de Instagram, com contactos da bio e importação como Leads.",
    icon: Instagram,
    path: "/dashboard/prospecting/instagram",
    actionKey: null,
    moduleSlug: null,
  },
];

function SearchHistorySection() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { data: allSearches = [], isLoading, isError } = useQuery({
    queryKey: ["prospecting-search-history-operations", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    staleTime: 30_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON path selects exceed TS instantiation depth
      const { data, error } = await (supabase as any).from("prospecting_search_operations")
        .select("id, action_key, created_at, result_count:response_data->>count, web_total:response_data->>total, query:response_data->>query, location:response_data->>location")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("status", "completed")
        .in("action_key", ["prospecting_google_local_search", "prospecting_web_search"])
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const rawCount = row.result_count ?? row.web_total;
        const count = rawCount === null ? null : Number(rawCount);
        return {
          ...row,
          search_type: row.action_key === "prospecting_google_local_search" ? "google_local" : "web_search",
          query: row.query || (row.action_key === "prospecting_google_local_search" ? "Pesquisa Google Local" : "Pesquisa Web"),
          results_count: count !== null && Number.isSafeInteger(count) && count >= 0 ? count : null,
        };
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  if (isError) {
    return <IXCard><p className="text-sm text-destructive py-4">Não foi possível carregar o histórico de pesquisas.</p></IXCard>;
  }

  if (allSearches.length === 0) {
    return (
      <IXCard>
        <div className="flex flex-col items-center justify-center text-center py-10">
          <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-medium mb-1">Sem pesquisas anteriores</h3>
          <p className="text-xs text-muted-foreground">
            As pesquisas Google Local e Web Search aparecerão aqui.
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
              {s.results_count === null ? "Contagem indisponível" : `${s.results_count} resultados`}
            </Badge>
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
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => navigate(`/dashboard/leads?source=${s.search_type}`)}
            >
              <Users className="h-3.5 w-3.5" />
              Ver leads da fonte
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProspectingHub() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { balance, pricingRules } = useCreditWallet();
  const { plan, subscribed, createCheckout } = useSubscription();
  const { installedModules, isLoading: modulesLoading } = useWorkspaceModules();
  const [activeTab, setActiveTab] = useState("tools");

  const planLimits = PROSPECTING_LIMITS[plan] || PROSPECTING_LIMITS.starter;
  const isLocked = !subscribed || planLimits.searches === 0;
  const prospectingRules = pricingRules.filter(r => r.module === "prospecting");
  const currentDate = new Date();
  const monthStart = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1));
  const usage = useQuery({
    queryKey: ["prospecting-search-operations-count", currentWorkspace?.id, monthStart.toISOString()],
    enabled: !!currentWorkspace?.id && !isLocked,
    staleTime: 30_000,
    queryFn: async () => {
      // Esta tabela regista as pesquisas autorizadas pelo servidor nas três fontes externas.
      const { count, error } = await supabase
        .from("prospecting_search_operations")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace!.id)
        .eq("status", "completed")
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", nextMonthStart.toISOString());
      if (error) throw error;
      return count as number;
    },
  });

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
              {subscribed ? plan : "sem plano ativo"}
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
              { id: "history", label: "Histórico Google/Web" },
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
                  <span className="text-sm font-medium text-foreground">Pesquisas externas este mês</span>
                  <span className="text-xs text-muted-foreground">{planLimits.label}</span>
                </div>
                {usage.isLoading ? <Skeleton className="h-1.5" /> : usage.isError ? (
                  <p className="text-xs text-destructive">Não foi possível consultar a utilização.</p>
                ) : <Progress value={Math.min(100, ((usage.data ?? 0) / planLimits.searches) * 100)} className="h-1.5" />}
                <p className="text-xs text-muted-foreground mt-2">
                  {usage.isError ? "Tente novamente mais tarde." : usage.isLoading ? "A carregar utilização..." : `${usage.data ?? 0} de ${planLimits.searches} pesquisas concluídas. Google Local, Web Search e Profissionais partilham este limite; cada operação pode também consumir créditos.`}
                </p>
              </IXCard>
            )}

            <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", isLocked && "opacity-50 pointer-events-none")}>
              {modules.map((mod) => {
                const cost = mod.actionKey
                  ? pricingRules.find((rule) => rule.action_key === mod.actionKey)?.credits_cost
                  : undefined;
                const canAfford = !mod.actionKey || cost === undefined || balance >= cost;
                const moduleActive = !mod.moduleSlug || installedModules.some((installed) =>
                  installed.module_slug === mod.moduleSlug &&
                  (!installed.current_period_end || new Date(installed.current_period_end).getTime() > Date.now()) &&
                  (installed.status !== "trial" || !installed.trial_ends_at || new Date(installed.trial_ends_at).getTime() > Date.now())
                );
                return (
                  <button
                    key={mod.path}
                    onClick={() => {
                      if (isLocked || modulesLoading) return;
                      navigate(moduleActive ? mod.path : "/dashboard/marketplace");
                    }}
                    className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                        <mod.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <Badge variant="outline" className="gap-1 text-xs font-normal">
                        <Coins className="h-3 w-3" />
                        {!mod.actionKey ? "Quota própria" : cost === undefined ? "Custo indisponível" : `${cost} créditos`}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-foreground">{mod.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{mod.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                        {modulesLoading ? "A verificar..." : moduleActive ? "Começar" : "Ativar módulo"} <ArrowRight className="h-4 w-4" />
                      </span>
                      {!modulesLoading && !moduleActive && <span className="text-xs text-muted-foreground">Módulo adicional</span>}
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
                  {subscribed ? `Plano ${plan}` : "Sem plano ativo"}
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
                  { key: "growth" as const, icon: Rocket, features: ["Até 100 pesquisas externas/mês", "Web Search; Google Local e Profissionais com módulos ativos", "Consumo de créditos por operação", "Importação assistida de leads", "Histórico de pesquisas"], highlighted: true },
                  { key: "scale" as const, icon: Star, features: ["Até 500 pesquisas externas/mês", "Web Search; Google Local e Profissionais com módulos ativos", "Consumo de créditos por operação", "Importação assistida de leads", "Histórico de pesquisas"], highlighted: false },
                ]).map(({ key: p, icon: PlanIcon, features, highlighted }) => {
                  const limits = PROSPECTING_LIMITS[p];
                  const isCurrent = subscribed ? plan === p : p === "starter";
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
                          {limits.searches}
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
