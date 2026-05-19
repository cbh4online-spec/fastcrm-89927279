import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Briefcase,
  CheckCircle2,
  Clock,
  Download,
  HeadphonesIcon,
  ListChecks,
  Phone,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  AttributionModel,
  ExecPeriod,
  getPeriod,
  useExecutiveActions,
  useExecutiveLeaks,
  useExecutiveOverview,
  useExecutiveRecommendations,
  useGenerateExecutiveSummary,
  useResolveLeak,
  useRevenueByChannel,
  useUpdateActionItem,
  useUpdateRecommendation,
} from "@/hooks/useExecutiveDashboard";

const formatEur = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v ?? 0));

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  website_chat: "Website Chat",
  website_form: "Formulários",
  email: "Email",
  phone: "Telefone",
  voice: "VoiceHub",
  manual: "Manual",
  other: "Outros",
};

const severityVariant = (s: string): any =>
  s === "critical" || s === "high" ? "destructive" : s === "medium" ? "default" : "secondary";

export default function ExecutiveCommandDashboard() {
  const [periodPreset, setPeriodPreset] = useState("7d");
  const [model, setModel] = useState<AttributionModel>("last_touch");
  const [tab, setTab] = useState("overview");
  const { toast } = useToast();

  const period: ExecPeriod = useMemo(() => getPeriod(periodPreset), [periodPreset]);

  const overview = useExecutiveOverview(period, model);
  const channels = useRevenueByChannel(period, model);
  const leaks = useExecutiveLeaks();
  const recs = useExecutiveRecommendations();
  const actions = useExecutiveActions();

  const generate = useGenerateExecutiveSummary();
  const updateRec = useUpdateRecommendation();
  const updateAction = useUpdateActionItem();
  const resolveLeak = useResolveLeak();

  const ov = overview.data ?? {};

  const exportSummary = () => {
    const lines = [
      `# Resumo Executivo — FastCRM`,
      ``,
      `**Período:** ${new Date(period.from).toLocaleDateString("pt-PT")} → ${new Date(period.to).toLocaleDateString("pt-PT")}`,
      `**Modelo de atribuição:** ${model}`,
      ``,
      `## KPIs principais`,
      `- Receita atribuída: ${formatEur(ov.revenue)}`,
      `- Margem: ${formatEur(ov.margin)}`,
      `- Leads: ${ov.leads ?? 0}`,
      `- Oportunidades: ${ov.opportunities ?? 0}`,
      `- Conversões: ${ov.conversions ?? 0}`,
      `- Taxa conversão: ${ov.conversion_rate ?? 0}%`,
      `- Fugas abertas: ${ov.open_leaks ?? 0}`,
      `- Recomendações críticas: ${ov.critical_recommendations ?? 0}`,
      ``,
      `## Receita por canal`,
      ...(channels.data ?? []).map((c) => `- ${channelLabels[c.channel_type] ?? c.channel_type}: ${formatEur(c.revenue)} (${c.conversions} conversões)`),
      ``,
      `## Top fugas de receita`,
      ...(leaks.data ?? []).slice(0, 10).map((l: any) => `- [${l.severity}] ${l.title} — ${formatEur(l.estimated_value)}`),
    ];
    const txt = lines.join("\n");
    navigator.clipboard.writeText(txt);
    toast({ title: "Resumo copiado para a área de transferência" });
  };

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Executive Command</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Receita, risco, equipa e próximas acções — em tempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodPreset} onValueChange={setPeriodPreset}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="prev_month">Mês anterior</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Select value={model} onValueChange={(v) => setModel(v as AttributionModel)}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_touch">Last Touch</SelectItem>
              <SelectItem value="first_touch">First Touch</SelectItem>
              <SelectItem value="assisted">Assisted</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportSummary}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar
          </Button>
          <Button size="sm" onClick={() => generate.mutate({ period, model })} disabled={generate.isPending}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {generate.isPending ? "A gerar…" : "Gerar resumo IA"}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto flex flex-wrap gap-0.5">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background">
            <Activity className="mr-1.5 h-3.5 w-3.5" />Visão Geral
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-background">
            <Wallet className="mr-1.5 h-3.5 w-3.5" />Receita
          </TabsTrigger>
          <TabsTrigger value="risk" className="data-[state=active]:bg-background">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />Risco
          </TabsTrigger>
          <TabsTrigger value="actions" className="data-[state=active]:bg-background">
            <ListChecks className="mr-1.5 h-3.5 w-3.5" />Plano de Acção
          </TabsTrigger>
          <TabsTrigger value="modules" className="data-[state=active]:bg-background">
            <Brain className="mr-1.5 h-3.5 w-3.5" />Operação
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          {overview.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <>
              {/* KPIs principais — apenas 4, com hierarquia clara */}
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Resultado do período
                </h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <KPI title="Receita atribuída" value={formatEur(ov.revenue)} icon={<Target />} accent="primary" />
                  <KPI title="Margem estimada" value={formatEur(ov.margin)} icon={<TrendingUp />} />
                  <KPI title="Taxa conversão" value={`${ov.conversion_rate ?? 0}%`} icon={<BarChart3 />} accent="success" />
                  <KPI
                    title="Recomendações críticas"
                    value={ov.critical_recommendations ?? 0}
                    icon={<AlertTriangle />}
                    accent={(ov.critical_recommendations ?? 0) > 0 ? "destructive" : undefined}
                  />
                </div>

                {/* Chips secundários — funil & risco operacional */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <StatChip icon={Users} label="Leads" value={ov.leads ?? 0} />
                  <StatChip icon={Briefcase} label="Oportunidades" value={ov.opportunities ?? 0} />
                  <StatChip icon={CheckCircle2} label="Conversões" value={ov.conversions ?? 0} />
                  <StatChip
                    icon={TrendingDown}
                    label="Fugas abertas"
                    value={ov.open_leaks ?? 0}
                    tone={(ov.open_leaks ?? 0) > 0 ? "warning" : undefined}
                  />
                </div>
              </section>

              {/* O que fazer agora */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" /> O que fazer agora
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Acções prioritárias para as próximas 24–72h
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <PriorityActions
                    recs={recs.data ?? []}
                    onUpdate={(id, status) => updateRec.mutate({ id, status })}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>


        {/* REVENUE */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receita por Canal</CardTitle>
              <CardDescription>Atribuição: {model}</CardDescription>
            </CardHeader>
            <CardContent>
              {channels.isLoading ? (
                <Skeleton className="h-48" />
              ) : (channels.data ?? []).length === 0 ? (
                <EmptyState message="Sem eventos de atribuição neste período." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Oportunidades</TableHead>
                      <TableHead className="text-right">Conversões</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(channels.data ?? []).map((c) => (
                      <TableRow key={c.channel_type}>
                        <TableCell className="font-medium">{channelLabels[c.channel_type] ?? c.channel_type}</TableCell>
                        <TableCell className="text-right">{c.leads}</TableCell>
                        <TableCell className="text-right">{c.opportunities}</TableCell>
                        <TableCell className="text-right">{c.conversions}</TableCell>
                        <TableCell className="text-right font-semibold">{formatEur(c.revenue)}</TableCell>
                        <TableCell className="text-right">{formatEur(c.margin)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Funil Omnicanal</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelView ov={ov} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* RISK — Fugas + Recomendações lado-a-lado */}
        <TabsContent value="risk" className="space-y-6 mt-0">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-600" /> Fugas de Receita
              </CardTitle>
              <CardDescription className="text-xs">
                Conversas, chamadas e produtos sem follow-up
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {leaks.isLoading ? (
                <Skeleton className="h-48" />
              ) : (leaks.data ?? []).length === 0 ? (
                <EmptyState message="Nenhuma fuga de receita identificada neste período." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead className="text-right">Valor estimado</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead className="text-right">Acções</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(leaks.data ?? []).map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="max-w-[360px]">
                          <div className="font-medium truncate">{l.title}</div>
                          <div className="text-xs text-muted-foreground">{l.leak_type}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={severityVariant(l.severity)}>{l.severity}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatEur(l.estimated_value)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ageOf(l.created_at)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline" onClick={() => resolveLeak.mutate({ id: l.id, status: "resolved" })}>
                            Resolver
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => resolveLeak.mutate({ id: l.id, status: "ignored" })}>
                            Ignorar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" /> Recomendações Executivas
              </CardTitle>
              <CardDescription className="text-xs">
                Geradas por IA com base em risco, receita e operação
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {recs.isLoading ? (
                <Skeleton className="h-48" />
              ) : (recs.data ?? []).length === 0 ? (
                <EmptyState message="Não existem recomendações neste período." />
              ) : (
                <div className="divide-y divide-border/60">
                  {(recs.data ?? []).map((r: any) => (
                    <div key={r.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={r.priority === "critical" || r.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">
                            {r.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{r.recommendation_type}</span>
                          {r.confidence != null && (
                            <span className="text-xs text-muted-foreground">· {Math.round(r.confidence * 100)}% conf.</span>
                          )}
                        </div>
                        <p className="mt-1.5 font-medium text-sm">{r.title}</p>
                        {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                        {r.expected_impact && (
                          <p className="mt-1 text-xs text-primary font-medium">Impacto: {r.expected_impact}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => updateRec.mutate({ id: r.id, status: "in_progress" })}>
                          Em curso
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => updateRec.mutate({ id: r.id, status: "completed" })}>
                          Concluir
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => updateRec.mutate({ id: r.id, status: "dismissed" })}>
                          Descartar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MODULES — atalhos para módulos operacionais consolidados */}
        <TabsContent value="modules" className="mt-0">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ModuleCard icon={Users} title="Performance da Equipa" description="Carga, resposta e contribuição comercial por agente" link="/dashboard/inbox/ops" linkLabel="Inbox Ops" />
            <ModuleCard icon={CheckCircle2} title="Qualidade & Coaching" description="Quality score, objeções frequentes, tarefas de coaching" link="/dashboard/inbox/ops" linkLabel="Coaching" />
            <ModuleCard icon={HeadphonesIcon} title="Suporte & SLA" description="Tickets críticos, SLA breaches e impacto comercial" link="/dashboard/helpdesk" linkLabel="Helpdesk" />
            <ModuleCard icon={Phone} title="Voz & Chamadas" description="Chamadas perdidas, callbacks vencidos, sinais de compra" link="/dashboard/voicehub" linkLabel="VoiceHub" />
            <ModuleCard icon={Briefcase} title="Produtos & Oportunidades" description="Mais enviados, com maior conversão, sem follow-up" link="/dashboard/products" linkLabel="Produtos" />
          </div>
        </TabsContent>


        {/* ACTIONS */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plano de Ação</CardTitle>
              <CardDescription>Itens atribuídos com prazo</CardDescription>
            </CardHeader>
            <CardContent>
              {actions.isLoading ? (
                <Skeleton className="h-48" />
              ) : (actions.data ?? []).length === 0 ? (
                <EmptyState message="Sem ações pendentes." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead className="text-right">Operações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(actions.data ?? []).map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell>
                          <Badge variant={a.priority === "critical" || a.priority === "high" ? "destructive" : "default"}>
                            {a.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.status === "overdue" ? "destructive" : "secondary"}>{a.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.due_at ? new Date(a.due_at).toLocaleDateString("pt-PT") : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline" onClick={() => updateAction.mutate({ id: a.id, status: "completed" })}>
                            Concluir
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => updateAction.mutate({ id: a.id, status: "dismissed" })}>
                            Ignorar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "primary" | "success" | "warning" | "destructive";
}) {
  const accentMap = {
    primary: { bg: "bg-primary/10", text: "text-primary" },
    success: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
    warning: { bg: "bg-amber-500/10", text: "text-amber-600" },
    destructive: { bg: "bg-destructive/10", text: "text-destructive" },
  };
  const a = accent ? accentMap[accent] : { bg: "bg-muted", text: "text-muted-foreground" };
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          </div>
          {icon && (
            <div className={`p-2 rounded-md ${a.bg}`}>
              <div className={`h-4 w-4 ${a.text}`}>{icon}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatChip({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: number | string; tone?: "warning" }) {
  const toneClass = tone === "warning" ? "text-amber-600" : "";
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/60 bg-card text-sm">
      <Icon className={`w-3.5 h-3.5 text-muted-foreground ${toneClass}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

function ModuleCard({
  icon: Icon, title, description, link, linkLabel,
}: { icon: any; title: string; description: string; link: string; linkLabel: string }) {
  return (
    <Card className="border-border/60 hover:border-border transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-muted">
            <Icon className="w-4 h-4 text-foreground" />
          </div>
          <h3 className="font-medium text-sm">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        <Button asChild variant="outline" size="sm" className="w-full">
          <a href={link}>Abrir {linkLabel}</a>
        </Button>
      </CardContent>
    </Card>
  );
}


function PriorityActions({ recs, onUpdate }: { recs: any[]; onUpdate: (id: string, status: string) => void }) {
  const top = recs.slice(0, 7);
  if (top.length === 0)
    return <EmptyState message="Gere o resumo IA para receber ações prioritárias." />;
  return (
    <div className="space-y-2">
      {top.map((r: any) => (
        <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium text-sm">{r.title}</p>
              {r.expected_impact && <p className="text-xs text-muted-foreground">{r.expected_impact}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={r.priority === "critical" || r.priority === "high" ? "destructive" : "secondary"}>
              {r.priority}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => onUpdate(r.id, "in_progress")}>
              Executar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FunnelView({ ov }: { ov: any }) {
  const stages = [
    { label: "Leads", value: ov.leads ?? 0 },
    { label: "Oportunidades", value: ov.opportunities ?? 0 },
    { label: "Conversões", value: ov.conversions ?? 0 },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="space-y-2">
      {stages.map((s) => (
        <div key={s.label}>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium">{s.value}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${(s.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsolidatedTab({
  title,
  description,
  link,
  linkLabel,
}: {
  title: string;
  description: string;
  link: string;
  linkLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Esta secção consolida métricas detalhadas do módulo dedicado. Para análise completa, abra o módulo abaixo.
        </p>
        <Button asChild variant="outline">
          <a href={link}>{linkLabel}</a>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ageOf(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / 3600000);
  return `${hours}h`;
}
