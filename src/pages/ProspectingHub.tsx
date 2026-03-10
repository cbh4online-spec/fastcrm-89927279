import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Globe, Search, Users, ArrowRight, Coins, TrendingUp,
  BarChart3, Zap, Lock, Crown, Target, Activity
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ProspectingAnalytics } from "@/components/prospecting/ProspectingAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  },
  {
    title: "Web Search",
    description: "Pesquise profissionais e empresas na web com critérios avançados.",
    icon: Search,
    path: "/dashboard/prospecting/web-search",
    actionKey: "prospecting_web_search",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Profissionais",
    description: "Descubra profissionais em redes sociais e plataformas especializadas.",
    icon: Users,
    path: "/dashboard/prospecting/professionals",
    actionKey: "prospecting_professional_search",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
];

export default function ProspectingHub() {
  const navigate = useNavigate();
  const { balance, getCost, pricingRules } = useCreditWallet();
  const { plan, createCheckout } = useSubscription();

  const planLimits = PROSPECTING_LIMITS[plan] || PROSPECTING_LIMITS.starter;
  const isLocked = plan === "starter";

  const prospectingRules = pricingRules.filter(r => r.module === "prospecting");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Prospecção"
          description="Encontre novos leads e oportunidades com ferramentas de pesquisa inteligentes."
        />
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="gap-1.5 px-3 py-1.5 border-primary/30 text-primary"
          >
            <Coins className="h-3.5 w-3.5" />
            <span className="font-semibold">{balance}</span>
            <span className="text-muted-foreground text-xs">créditos</span>
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs capitalize">{plan}</span>
          </Badge>
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
                Módulo de Prospecção requer plano Growth ou superior
              </p>
              <p className="text-xs text-muted-foreground">
                Faça upgrade para aceder a todas as ferramentas de prospecção.
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

          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isLocked ? "opacity-50 pointer-events-none" : ""}`}>
            {modules.map((mod) => {
              const cost = getCost(mod.actionKey);
              const canAfford = balance >= cost;

              return (
                <Card
                  key={mod.path}
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 relative overflow-hidden"
                  onClick={() => !isLocked && navigate(mod.path)}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-6 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${mod.bgColor}`}>
                        <mod.icon className={`h-6 w-6 ${mod.color}`} />
                      </div>
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Coins className="h-3 w-3" />
                        {cost} créditos
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{mod.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <Button variant="ghost" size="sm" className="w-fit gap-1 p-0 h-auto text-primary">
                        Aceder <ArrowRight className="h-4 w-4" />
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

        <TabsContent value="analytics">
          <ProspectingAnalytics />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Tabela de Custos — Prospecção
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
  );
}
