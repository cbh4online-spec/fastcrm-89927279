import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useKernelDecisions } from "@/hooks/useKernelDecisions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Flame,
  UserMinus,
  Brain,
  Activity,
  Target,
  ShieldAlert,
  CheckCircle,
  Play,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

function useRevenueRadarData() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const forecast = useQuery({
    queryKey: ["rr-forecast", wid],
    queryFn: async () => {
      if (!wid) return { weighted: 0, active: 0, atRisk: 0 };
      const { data } = await supabase
        .from("opportunities")
        .select("value, probability, status, last_activity_at, updated_at")
        .eq("workspace_id", wid)
        .eq("status", "open");
      if (!data?.length) return { weighted: 0, active: 0, atRisk: 0 };
      const now = Date.now();
      const weighted = data.reduce((s, d) => s + (d.value ?? 0) * ((d.probability ?? 50) / 100), 0);
      const active = data.length;
      const atRisk = data.filter((d) => {
        const last = d.last_activity_at ?? d.updated_at;
        return last && new Date(last).getTime() < now - 7 * 86400000;
      }).length;
      return { weighted, active, atRisk };
    },
    enabled: !!wid,
  });

  const wonThisWeek = useQuery({
    queryKey: ["rr-won-week", wid],
    queryFn: async () => {
      if (!wid) return 0;
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from("opportunities")
        .select("value")
        .eq("workspace_id", wid)
        .eq("status", "won")
        .gte("updated_at", weekAgo);
      return data?.reduce((s, d) => s + (d.value ?? 0), 0) ?? 0;
    },
    enabled: !!wid,
  });

  const hotLeads = useQuery({
    queryKey: ["rr-hot-leads", wid],
    queryFn: async () => {
      if (!wid) return [];
      const { data } = await supabase
        .from("leads")
        .select("id, name, lead_score, last_contact_at, created_at")
        .eq("workspace_id", wid)
        .not("lead_score", "is", null)
        .gte("lead_score", 70)
        .order("lead_score", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!wid,
  });

  const churnRisk = useQuery({
    queryKey: ["rr-churn-risk", wid],
    queryFn: async () => {
      if (!wid) return [];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from("contacts")
        .select("id, name, email, client_status, last_contact_at")
        .eq("workspace_id", wid)
        .eq("client_status", "active")
        .lt("last_contact_at", thirtyDaysAgo)
        .order("last_contact_at", { ascending: true })
        .limit(10);
      return data ?? [];
    },
    enabled: !!wid,
  });

  return { forecast, wonThisWeek, hotLeads, churnRisk };
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  variant,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  variant: "primary" | "success" | "warning" | "danger";
}) {
  const styles = {
    primary: "bg-primary/10 text-primary",
    success: "bg-chart-2/10 text-chart-2",
    warning: "bg-chart-4/10 text-chart-4",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="border-border/30">
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${styles[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RevenueRadarPage() {
  const { forecast, wonThisWeek, hotLeads, churnRisk } = useRevenueRadarData();
  const { openDecisions, acceptDecision, rejectDecision, executeDecision } = useKernelDecisions();

  const f = forecast.data;
  const isLoading = forecast.isLoading;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue Radar</h1>
        <p className="text-sm text-muted-foreground">
          Visão unificada de receita, pipeline e sinais de crescimento
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/30">
              <CardContent className="py-4 px-5">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              icon={DollarSign}
              label="Receita Prevista"
              value={`€${((f?.weighted ?? 0) / 1000).toFixed(1)}k`}
              sub="Soma ponderada por probabilidade"
              variant="primary"
            />
            <StatCard
              icon={Target}
              label="Deals Ativos"
              value={String(f?.active ?? 0)}
              sub={`${f?.atRisk ?? 0} em risco`}
              variant="success"
            />
            <StatCard
              icon={TrendingUp}
              label="Ganhos Esta Semana"
              value={`€${((wonThisWeek.data ?? 0) / 1000).toFixed(1)}k`}
              variant="warning"
            />
            <StatCard
              icon={UserMinus}
              label="Churn Risk"
              value={String(churnRisk.data?.length ?? 0)}
              sub="Clientes inativos >30 dias"
              variant="danger"
            />
          </>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Health */}
        <Card className="border-border/30 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Pipeline Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-chart-2">{f?.active ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-chart-4">{f?.atRisk ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Em Risco</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {f?.active ? Math.round(((f.active - (f.atRisk ?? 0)) / f.active) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Saúde</p>
                  </div>
                </div>
                <Progress
                  value={f?.active ? ((f.active - (f.atRisk ?? 0)) / f.active) * 100 : 0}
                  className="h-2"
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Hot Leads */}
        <Card className="border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-chart-4" />
              Leads Quentes
              {hotLeads.data?.length ? (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {hotLeads.data.length}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[220px] px-4 pb-4">
              {hotLeads.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : !hotLeads.data?.length ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Sem leads com score ≥ 70
                </p>
              ) : (
                <div className="space-y-1">
                  {hotLeads.data.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors"
                    >
                      <Flame className="h-3.5 w-3.5 text-chart-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{lead.name}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {lead.lead_score}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Churn Risk */}
        <Card className="border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Risco de Churn
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[200px] px-4 pb-4">
              {churnRisk.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !churnRisk.data?.length ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Sem clientes em risco
                </p>
              ) : (
                <div className="space-y-1">
                  {churnRisk.data.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors"
                    >
                      <UserMinus className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.name ?? c.email}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Último contacto:{" "}
                          {c.last_contact_at
                            ? formatDistanceToNow(new Date(c.last_contact_at), {
                                addSuffix: true,
                                locale: pt,
                              })
                            : "nunca"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Kernel Decisions */}
        <Card className="border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Decisões Prioritárias
              {openDecisions.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {openDecisions.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[200px] px-4 pb-4">
              {!openDecisions.length ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Sem decisões pendentes
                </p>
              ) : (
                <div className="space-y-2">
                  {openDecisions.slice(0, 8).map((d) => (
                    <div key={d.id} className="p-2 rounded-md border border-border/20 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {d.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: pt })}
                        </span>
                      </div>
                      <p className="text-xs">{d.summary}</p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-6 text-[10px] gap-1 px-2"
                          onClick={() => executeDecision.mutate(d.id)}
                        >
                          <Play className="h-2.5 w-2.5" /> Executar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-1 px-2"
                          onClick={() => acceptDecision.mutate(d.id)}
                        >
                          <CheckCircle className="h-2.5 w-2.5" /> Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] gap-1 px-2"
                          onClick={() => rejectDecision.mutate(d.id)}
                        >
                          <XCircle className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
