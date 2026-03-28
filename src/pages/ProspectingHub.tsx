import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe, Search, Users, ArrowRight, Coins, TrendingUp,
  BarChart3, Zap, Lock, Crown, Target, Activity, History,
  Clock, Download, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ProspectingAnalytics } from "@/components/prospecting/ProspectingAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProspectingSearchHistory } from "@/hooks/useProspectingSearchHistory";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

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
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    gradient: "from-blue-500/20 to-blue-600/5",
  },
  {
    title: "Web Search",
    description: "Pesquise profissionais e empresas na web com critérios avançados.",
    icon: Search,
    path: "/dashboard/prospecting/web-search",
    actionKey: "prospecting_web_search",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    gradient: "from-amber-500/20 to-amber-600/5",
  },
  {
    title: "Profissionais",
    description: "Descubra profissionais em redes sociais e plataformas especializadas.",
    icon: Users,
    path: "/dashboard/prospecting/professionals",
    actionKey: "prospecting_professional_search",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    gradient: "from-emerald-500/20 to-emerald-600/5",
  },
];

function SearchHistorySection() {
  const { searches: googleSearches, isLoading: gl } = useProspectingSearchHistory("google_local");
  const { searches: webSearches, isLoading: wl } = useProspectingSearchHistory("web_search");

  const allSearches = [...(googleSearches || []), ...(webSearches || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30);

  const isLoading = gl || wl;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  if (allSearches.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <History className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-1">Sem pesquisas anteriores</h3>
          <p className="text-sm text-muted-foreground">
            As suas pesquisas de prospeção aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {allSearches.map(s => (
        <Card key={s.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              s.search_type === 'google_local' ? 'bg-blue-500/10' : 'bg-amber-500/10'
            }`}>
              {s.search_type === 'google_local' 
                ? <Globe className="h-5 w-5 text-blue-500" /> 
                : <Search className="h-5 w-5 text-amber-500" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {s.query}
              </p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                {s.location && (
                  <span className="flex items-center gap-1 truncate">
                    📍 {s.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(s.created_at), "d MMM, HH:mm", { locale: pt })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant="secondary" className="text-xs gap-1">
                <Target className="h-3 w-3" />
                {s.results_count} resultados
              </Badge>
              {s.imported_count > 0 && (
                <Badge variant="outline" className="text-xs gap-1 border-emerald-500/30 text-emerald-600">
                  <Download className="h-3 w-3" />
                  {s.imported_count} importados
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ProspectingHub() {
  const navigate = useNavigate();
  const { balance, getCost, pricingRules } = useCreditWallet();
  const { plan, createCheckout } = useSubscription();

  const planLimits = PROSPECTING_LIMITS[plan] || PROSPECTING_LIMITS.starter;
  const isLocked = plan === "starter";

  const prospectingRules = pricingRules.filter(r => r.module === "prospecting");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-background to-amber-500/5 border p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Prospeção</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Encontre novos leads e oportunidades com ferramentas de pesquisa inteligentes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="gap-1.5 px-3 py-1.5 border-primary/30 text-primary bg-primary/5"
              >
                <Coins className="h-3.5 w-3.5" />
                <span className="font-semibold">{balance}</span>
                <span className="text-muted-foreground text-xs">créditos</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-background">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs capitalize">{plan}</span>
              </Badge>
            </div>
          </div>
        </div>

        {isLocked && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Lock className="h-5 w-5 text-amber-500" />
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
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="tools" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tools" className="gap-1.5">
              <Target className="h-4 w-4" />
              Ferramentas
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5">
              <Coins className="h-4 w-4" />
              Precificação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="space-y-4">
            {/* Plan usage bar */}
            {!isLocked && planLimits.searches > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Utilização mensal</span>
                    <span className="text-xs text-muted-foreground">{planLimits.label}</span>
                  </div>
                  <Progress value={0} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Pesquisas utilizadas este mês (baseado no consumo de créditos)
                  </p>
                </CardContent>
              </Card>
            )}

            <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${isLocked ? "opacity-50 pointer-events-none" : ""}`}>
              {modules.map((mod) => {
                const cost = getCost(mod.actionKey);
                const canAfford = balance >= cost;

                return (
                  <Card
                    key={mod.path}
                    className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5 relative overflow-hidden"
                    onClick={() => !isLocked && navigate(mod.path)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${mod.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <CardContent className="relative p-6 flex flex-col gap-5">
                      <div className="flex items-start justify-between">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${mod.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                          <mod.icon className={`h-7 w-7 ${mod.color}`} />
                        </div>
                        <Badge variant="outline" className="gap-1 text-xs bg-background/80">
                          <Coins className="h-3 w-3" />
                          {cost} créditos
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{mod.title}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{mod.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <Button variant="ghost" size="sm" className="w-fit gap-1.5 p-0 h-auto text-primary font-medium group-hover:gap-2.5 transition-all">
                          Começar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                        {!canAfford && (
                          <span className="text-xs text-destructive">Saldo insuficiente</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <SearchHistorySection />
          </TabsContent>

          <TabsContent value="analytics">
            <ProspectingAnalytics />
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  Tabela de Custos — Prospeção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {prospectingRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{rule.label}</p>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground">{rule.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`gap-1 ${
                            rule.category === "ai"
                              ? "border-purple-500/30 text-purple-500"
                              : rule.category === "search"
                              ? "border-blue-500/30 text-blue-500"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {rule.category === "ai" && <Zap className="h-3 w-3" />}
                          {rule.category === "search" && <Search className="h-3 w-3" />}
                          {rule.category === "action" && <Activity className="h-3 w-3" />}
                          {rule.credits_cost} créditos
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {prospectingRules.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhuma regra de precificação configurada.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Plan comparison */}
            <div className="grid gap-4 sm:grid-cols-3">
              {(["starter", "growth", "scale"] as const).map((p) => {
                const limits = PROSPECTING_LIMITS[p];
                const isCurrent = plan === p;
                return (
                  <Card
                    key={p}
                    className={`${isCurrent ? "border-primary ring-1 ring-primary/20" : "border-border/50"}`}
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold capitalize text-foreground">{p}</h4>
                        {isCurrent && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                            Atual
                          </Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {limits.searches === -1 ? "∞" : limits.searches}
                      </p>
                      <p className="text-xs text-muted-foreground">{limits.label}</p>
                      {!isCurrent && p !== "starter" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => createCheckout(p)}
                        >
                          Upgrade para {p}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
