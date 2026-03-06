import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { PageHeader } from "@/components/common/PageHeader";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Signal,
  ClipboardList,
  Copy,
  Check,
  Plus,
  Flame,
  Snowflake,
  Eye,
  AlertCircle,
  XCircle,
  Target,
  Brain,
  Loader2,
} from "lucide-react";
import { useStrategicBriefs } from "@/hooks/useStrategicBriefs";
import { RevenueIntelligenceCard } from "@/components/revenue/RevenueIntelligenceCard";
import { useCreateTask } from "@/hooks/useTasks";
import { useStrategicDecisions, useGenerateStrategicDecisions, useDecisionHistory, useBulkConvertAllDecisions } from "@/hooks/useStrategicDecisions";
import { StrategicDecisionCard } from "@/components/strategy/StrategicDecisionCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  change,
  inverseColor = false,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  change?: number | null;
  inverseColor?: boolean;
  icon: React.ElementType;
}) {
  const isPositive = change != null ? (inverseColor ? change < 0 : change > 0) : null;
  const changeColor =
    isPositive === null
      ? "text-muted-foreground"
      : isPositive
      ? "text-emerald-500"
      : "text-destructive";

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold text-foreground truncate">{value}</p>
            {change != null && (
              <p className={cn("text-xs font-medium mt-1 flex items-center gap-0.5", changeColor)}>
                {change > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {change > 0 ? "+" : ""}
                {change}% vs semana anterior
              </p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityAction({
  index,
  text,
  onCreateTask,
  isCreating,
}: {
  index: number;
  text: string;
  onCreateTask: () => void;
  isCreating: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {index}
      </div>
      <p className="flex-1 text-sm text-foreground leading-relaxed">{text}</p>
      <Button
        size="sm"
        variant="outline"
        className="flex-shrink-0 h-7 px-2 text-xs gap-1"
        onClick={onCreateTask}
        disabled={isCreating}
      >
        <Plus className="w-3 h-3" />
        Tarefa
      </Button>
    </div>
  );
}

// ── Temperature helpers for Deal Intelligence ─────────────────────────────────

const TEMP_CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  cold: { label: "Frio", color: "#3b82f6", Icon: Snowflake },
  evaluating: { label: "A Avaliar", color: "#f59e0b", Icon: Eye },
  ready_to_buy: { label: "Pronto p/ Comprar", color: "#10b981", Icon: Flame },
  stalling: { label: "Estagnado", color: "#f97316", Icon: AlertCircle },
  lost: { label: "Perdido", color: "#6b7280", Icon: XCircle },
};

const OBJECTION_LABELS: Record<string, string> = {
  price: "Preço",
  timing: "Timing",
  authority: "Autoridade",
  competitor: "Concorrência",
  uncertainty: "Incerteza",
  no_need: "Sem Necessidade",
  confusion: "Confusão",
  none: "Nenhuma",
};

// ── Deal Intelligence Tab ─────────────────────────────────────────────────────

function DealIntelligenceTab() {
  const { currentWorkspace } = useWorkspace();

  const { data: signals = [], isLoading } = useQuery({
    queryKey: ["conversation-signals-workspace", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("conversation_signals")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        A carregar sinais de deal intelligence...
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
        <Brain className="w-10 h-10 text-muted-foreground/40" />
        <div>
          <p className="font-medium text-foreground">Sem dados de Deal Intelligence</p>
          <p className="text-sm text-muted-foreground mt-1">
            Os sinais são gerados automaticamente quando chegam novas mensagens aos contactos.
          </p>
        </div>
      </div>
    );
  }

  // Temperature distribution
  const tempCounts: Record<string, number> = {};
  signals.forEach((s) => {
    if (s.temperature) tempCounts[s.temperature] = (tempCounts[s.temperature] || 0) + 1;
  });
  const tempData = Object.entries(tempCounts).map(([key, count]) => ({
    name: TEMP_CONFIG[key]?.label ?? key,
    value: count,
    color: TEMP_CONFIG[key]?.color ?? "#888",
  }));

  // Objection distribution
  const objCounts: Record<string, number> = {};
  signals.forEach((s) => {
    if (s.main_objection && s.main_objection !== "none") {
      objCounts[s.main_objection] = (objCounts[s.main_objection] || 0) + 1;
    }
  });
  const objData = Object.entries(objCounts)
    .map(([key, count]) => ({ name: OBJECTION_LABELS[key] ?? key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const avgClose =
    signals.filter((s) => s.close_probability != null).length > 0
      ? Math.round(
          (signals.reduce((acc, s) => acc + (s.close_probability ?? 0), 0) /
            signals.filter((s) => s.close_probability != null).length) *
            100
        )
      : null;

  // Top contacts by close probability
  const topContacts = [...signals]
    .filter((s) => s.close_probability != null)
    .sort((a, b) => (b.close_probability ?? 0) - (a.close_probability ?? 0))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Total de Contactos Analisados
            </p>
            <p className="text-3xl font-bold text-foreground">{signals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Prob. Média de Fecho
            </p>
            <p className="text-3xl font-bold text-foreground">
              {avgClose != null ? `${avgClose}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Prontos p/ Comprar
            </p>
            <p className="text-3xl font-bold text-emerald-500">
              {signals.filter((s) => s.temperature === "ready_to_buy").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temperature Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição de Temperatura</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={tempData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {tempData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} contactos`, ""]} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Objections */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Principais Objeções</CardTitle>
          </CardHeader>
          <CardContent>
            {objData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Sem dados de objeções
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={objData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 10 by close probability */}
      {topContacts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Contactos por Probabilidade de Fecho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
                    {topContacts.map((s, i) => {
                    const tempKey = s.temperature ?? "";
                    const tempCfg = TEMP_CONFIG[tempKey] as typeof TEMP_CONFIG[string] | undefined;
                    const prob = Math.round((s.close_probability ?? 0) * 100);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                      >
                        <span className="w-5 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {s.contact_id ? "Contacto" : "Lead"}
                            </span>
                            {s.temperature && tempCfg && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                                style={{ borderColor: tempCfg.color, color: tempCfg.color }}
                              >
                                {tempCfg.label}
                              </Badge>
                            )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.main_objection && s.main_objection !== "none"
                          ? `Objeção: ${OBJECTION_LABELS[s.main_objection]}`
                          : "Sem objeção"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{prob}%</p>
                      <div className="w-16 h-1.5 bg-muted rounded-full mt-1">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${prob}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Decisions Tab ─────────────────────────────────────────────────────────────

function DecisionsTab() {
  const { data: decisions = [], isLoading } = useStrategicDecisions();
  const generate = useGenerateStrategicDecisions();
  const bulkConvert = useBulkConvertAllDecisions();

  const handleGenerate = async () => {
    try {
      const result = await generate.mutateAsync();
      const count = result?.inserted ?? 0;
      if (count > 0) {
        toast.success(`${count} nova${count > 1 ? "s" : ""} decisão${count > 1 ? "ões" : ""} gerada${count > 1 ? "s" : ""}!`);
      } else {
        toast.info("Nenhuma nova decisão gerada. As regras activas já têm decisões abertas recentes.");
      }
    } catch {
      toast.error("Erro ao gerar decisões.");
    }
  };

  const handleBulkConvert = async () => {
    if (decisions.length === 0) return;
    try {
      const result = await bulkConvert.mutateAsync(decisions);
      toast.success(
        `${result.totalTasks} tarefa${result.totalTasks !== 1 ? "s" : ""} criada${result.totalTasks !== 1 ? "s" : ""} a partir de ${result.totalDecisions} decisão${result.totalDecisions !== 1 ? "ões" : ""}!`
      );
    } catch {
      toast.error("Erro ao converter decisões em tarefas.");
    }
  };

  const lastDecision = decisions[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Decisões Estratégicas</h3>
          {decisions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {decisions.length} activa{decisions.length > 1 ? "s" : ""}
            </Badge>
          )}
          {lastDecision && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              · última análise{" "}
              {formatDistanceToNow(new Date(lastDecision.created_at), {
                addSuffix: true,
                locale: pt,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {decisions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkConvert}
              disabled={bulkConvert.isPending || generate.isPending}
              className="gap-1.5"
            >
              {bulkConvert.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {bulkConvert.isPending ? "A converter..." : "Converter Tudo em Tarefas"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", generate.isPending && "animate-spin")} />
            {generate.isPending ? "A analisar..." : "Analisar e Gerar Decisões"}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          A carregar decisões...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && decisions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Nenhuma decisão activa</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Clique em <strong>Analisar e Gerar Decisões</strong> para o motor avaliar o estado
                do pipeline, receita, conversas e risco de churn e gerar acções concretas.
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={generate.isPending} className="mt-2">
              <RefreshCw className={cn("w-4 h-4 mr-2", generate.isPending && "animate-spin")} />
              {generate.isPending ? "A analisar..." : "Gerar Primeiras Decisões"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Decision cards */}
      {decisions.length > 0 && (
        <div className="space-y-4">
          {decisions.map((d) => (
            <StrategicDecisionCard key={d.id} decision={d} />
          ))}
        </div>
      )}

      {/* History section */}
      <DecisionHistorySection />
    </div>
  );
}

// ── Decision History Section ──────────────────────────────────────────────────

const HISTORY_IMPACT_CONFIG = {
  high: { label: "Alto Impacto", className: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Médio Impacto", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
  low: { label: "Baixo Impacto", className: "bg-muted text-muted-foreground" },
} as const;

const HISTORY_URGENCY_CONFIG = {
  immediate: { label: "⚡ Imediato", className: "bg-destructive/10 text-destructive border-destructive/20" },
  this_week: { label: "Esta Semana", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
  monitor: { label: "Monitorar", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" },
} as const;

const HISTORY_AREA_CONFIG: Record<string, string> = {
  sales: "🎯 Vendas",
  marketing: "📣 Marketing",
  pricing: "💶 Preços",
  operations: "⚙️ Operações",
  retention: "🛡 Retenção",
};

function DecisionHistorySection() {
  const { data: history = [], isLoading } = useDecisionHistory();

  return (
    <Accordion type="single" collapsible className="border rounded-lg bg-card">
      <AccordionItem value="history" className="border-0">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Histórico de Decisões</span>
            {history.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {history.length} registo{history.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3 pt-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhuma decisão no histórico. As decisões ignoradas ou convertidas aparecerão aqui.
            </p>
          ) : (
            <div className="space-y-0 divide-y divide-border/50">
              {history.map((d) => {
                const isConverted = d.status === "converted";
                const impactCfg = HISTORY_IMPACT_CONFIG[d.impact_level as keyof typeof HISTORY_IMPACT_CONFIG] ?? HISTORY_IMPACT_CONFIG.low;
                const urgencyCfg = HISTORY_URGENCY_CONFIG[d.urgency as keyof typeof HISTORY_URGENCY_CONFIG] ?? HISTORY_URGENCY_CONFIG.monitor;
                const areaLabel = HISTORY_AREA_CONFIG[d.business_area] ?? d.business_area;
                const firstStep = d.recommended_steps[0];
                const extraSteps = d.recommended_steps.length - 1;

                return (
                  <div key={d.id} className="py-4 first:pt-2 last:pb-0">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs border",
                          isConverted
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {isConverted ? "✅ Convertida" : "🔕 Ignorada"}
                      </Badge>
                      <Badge variant="outline" className={cn("text-xs border", impactCfg.className)}>
                        {impactCfg.label}
                      </Badge>
                      <Badge variant="outline" className={cn("text-xs border", urgencyCfg.className)}>
                        {urgencyCfg.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                        {areaLabel}
                      </Badge>
                    </div>

                    {/* Title */}
                    <p className="text-sm font-medium text-foreground mb-1">{d.decision_title}</p>

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground mb-2">
                      {isConverted ? "Convertida" : "Ignorada"}{" "}
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: pt })}
                      {" · "}
                      {format(new Date(d.created_at), "d MMM yyyy", { locale: pt })}
                    </p>

                    {/* Steps preview */}
                    {firstStep && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">↳ Passos:</span>{" "}
                        <span className="truncate">
                          {firstStep.length > 60 ? firstStep.slice(0, 60) + "…" : firstStep}
                        </span>
                        {extraSteps > 0 && (
                          <span className="ml-1 text-muted-foreground/70">+{extraSteps} mais</span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StrategyPage() {
  const { briefs, latestBrief, isLoading, isGenerating, generateBrief } = useStrategicBriefs();
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const [creatingTaskIndex, setCreatingTaskIndex] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCreateTask = async (text: string, index: number) => {
    setCreatingTaskIndex(index);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      await createTask.mutateAsync({
        title: text,
        due_at: dueDate.toISOString(),
      });
      toast.success("Tarefa criada!");
    } catch {
      toast.error("Erro ao criar tarefa.");
    } finally {
      setCreatingTaskIndex(null);
    }
  };

  const handleCreateAllTasks = async () => {
    if (!latestBrief?.priority_actions?.length) return;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    let created = 0;
    for (const action of latestBrief.priority_actions) {
      try {
        await createTask.mutateAsync({ title: action, due_at: dueDate.toISOString() });
        created++;
      } catch {
        // continue
      }
    }
    toast.success(`${created} tarefas criadas!`);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const km = latestBrief?.key_metrics;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title="Estratégia Semanal"
            description="Inteligência estratégica gerada por IA com base em toda a atividade do workspace"
            actions={[
              {
                label: isGenerating ? "A gerar..." : "Gerar Relatório",
                icon: <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />,
                onClick: generateBrief,
                disabled: isGenerating,
              },
            ]}
          />
        </div>
      </div>

      <Tabs defaultValue="brief">
        <TabsList className="mb-2">
          <TabsTrigger value="brief">📋 Brief Executivo</TabsTrigger>
          <TabsTrigger value="deals">🎯 Deal Intelligence</TabsTrigger>
          <TabsTrigger value="revenue">💰 Receita</TabsTrigger>
          <TabsTrigger value="decisions">⚡ Decisões</TabsTrigger>
        </TabsList>

        {/* ─── BRIEF EXECUTIVO ─────────────────────────────────────────────── */}
        <TabsContent value="brief" className="space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              A carregar brief executivo...
            </div>
          )}

          {!isLoading && !latestBrief && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <Brain className="w-12 h-12 text-muted-foreground/40" />
                <div>
                  <p className="font-semibold text-foreground">Ainda não há um brief executivo</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Clique em <strong>Gerar Relatório</strong> para criar o primeiro brief executivo
                    semanal com base na atividade do workspace.
                  </p>
                </div>
                <Button onClick={generateBrief} disabled={isGenerating} className="mt-2">
                  <RefreshCw className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
                  {isGenerating ? "A gerar..." : "Gerar Primeiro Brief"}
                </Button>
              </CardContent>
            </Card>
          )}

          {latestBrief && (
            <>
              {/* Last generated timestamp */}
              <p className="text-xs text-muted-foreground">
                Último relatório:{" "}
                {formatDistanceToNow(new Date(latestBrief.created_at), {
                  addSuffix: true,
                  locale: pt,
                })}
              </p>

              {/* Key Metrics */}
              {km && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Leads"
                    value={km.leads_total ?? 0}
                    change={km.leads_change}
                    icon={TrendingUp}
                  />
                  <MetricCard
                    label="Receita"
                    value={km.revenue_change != null ? `${km.revenue_change > 0 ? "+" : ""}${km.revenue_change}%` : "—"}
                    change={km.revenue_change}
                    icon={Target}
                  />
                  <MetricCard
                    label="Conversão"
                    value={km.conversion_change != null ? `${km.conversion_change > 0 ? "+" : ""}${km.conversion_change}%` : "—"}
                    change={km.conversion_change}
                    icon={CheckCircle2}
                  />
                  <MetricCard
                    label="Tempo de Resposta"
                    value={km.response_time_change != null ? `${km.response_time_change > 0 ? "+" : ""}${km.response_time_change}%` : "—"}
                    change={km.response_time_change}
                    inverseColor
                    icon={Signal}
                  />
                </div>
              )}

              {/* Executive Summary */}
              {latestBrief.summary && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <CardTitle className="text-sm font-semibold">Resumo Executivo</CardTitle>
                      <button
                        onClick={() => copyToClipboard(latestBrief.summary!, "summary")}
                        className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedField === "summary" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{latestBrief.summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Opportunity / Risk / Market Signal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {latestBrief.opportunity && (
                  <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-emerald-500" />
                        <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          Oportunidade
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">{latestBrief.opportunity}</p>
                    </CardContent>
                  </Card>
                )}
                {latestBrief.risk && (
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <CardTitle className="text-sm font-semibold text-destructive">
                          Risco
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">{latestBrief.risk}</p>
                    </CardContent>
                  </Card>
                )}
                {latestBrief.market_signal && (
                  <Card className="border-blue-500/20 bg-blue-500/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Signal className="w-4 h-4 text-blue-500" />
                        <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                          Sinal de Mercado
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">
                        {latestBrief.market_signal}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Priority Actions */}
              {latestBrief.priority_actions && latestBrief.priority_actions.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">5 Ações Prioritárias</CardTitle>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={handleCreateAllTasks}
                        disabled={createTask.isPending}
                      >
                        <Plus className="w-3 h-3" />
                        Criar Todas as Tarefas
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div>
                      {latestBrief.priority_actions.map((action, i) => (
                        <PriorityAction
                          key={i}
                          index={i + 1}
                          text={action}
                          onCreateTask={() => handleCreateTask(action, i)}
                          isCreating={creatingTaskIndex === i}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* History Accordion */}
              {briefs.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Histórico de Briefs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {briefs.slice(1).map((brief) => (
                        <AccordionItem key={brief.id} value={brief.id}>
                          <AccordionTrigger className="text-sm">
                            <div className="flex items-center gap-3 text-left">
                              <span className="font-medium">
                                {format(new Date(brief.created_at), "dd MMM yyyy", { locale: pt })}
                              </span>
                              {brief.summary && (
                                <span className="text-muted-foreground text-xs truncate max-w-[300px] hidden sm:block">
                                  {brief.summary.substring(0, 80)}...
                                </span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-2">
                              {brief.summary && (
                                <p className="text-sm text-foreground leading-relaxed">{brief.summary}</p>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {brief.opportunity && (
                                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                                      Oportunidade
                                    </p>
                                    <p className="text-xs text-foreground">{brief.opportunity}</p>
                                  </div>
                                )}
                                {brief.risk && (
                                  <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                                    <p className="text-xs font-semibold text-destructive mb-1">Risco</p>
                                    <p className="text-xs text-foreground">{brief.risk}</p>
                                  </div>
                                )}
                                {brief.market_signal && (
                                  <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                      Sinal
                                    </p>
                                    <p className="text-xs text-foreground">{brief.market_signal}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ─── DEAL INTELLIGENCE ───────────────────────────────────────────── */}
        <TabsContent value="deals">
          <DealIntelligenceTab />
        </TabsContent>

        {/* ─── REVENUE INTELLIGENCE ────────────────────────────────────────── */}
        <TabsContent value="revenue">
          <RevenueIntelligenceCard showTable />
        </TabsContent>

        {/* ─── STRATEGIC DECISIONS ─────────────────────────────────────────── */}
        <TabsContent value="decisions">
          <DecisionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
