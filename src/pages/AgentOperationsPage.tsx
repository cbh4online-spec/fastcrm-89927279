import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  ClipboardList,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Settings2,
  Users,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { AgentPerformancePanel } from "@/components/agent-ops/AgentPerformancePanel";
import {
  useAgentWorkItems,
  useAgentHandoffs,
  useAgentOpsStats,
} from "@/hooks/useAgentOperations";
import { useBots } from "@/hooks/useBots";
import { AgentOpsSettings } from "@/components/agent-ops/AgentOpsSettings";
import { AgentTeamManager } from "@/components/agent-ops/AgentTeamManager";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "Pendente", variant: "outline", icon: Clock },
  assigned: { label: "Atribuído", variant: "secondary", icon: Bot },
  in_progress: { label: "Em Progresso", variant: "default", icon: TrendingUp },
  completed: { label: "Concluído", variant: "secondary", icon: CheckCircle2 },
  failed: { label: "Falhou", variant: "destructive", icon: XCircle },
  escalated: { label: "Escalado", variant: "destructive", icon: AlertTriangle },
  escalated_to_human: { label: "Escalado (Humano)", variant: "destructive", icon: AlertTriangle },
  accepted: { label: "Aceite", variant: "secondary", icon: CheckCircle2 },
};

const WORK_TYPE_LABELS: Record<string, string> = {
  qualify_lead: "Qualificar Lead",
  followup_contact: "Follow-up Contacto",
  recover_cart: "Recuperar Carrinho",
  reengage_lead: "Reengajar Lead",
  propose_meeting: "Propor Reunião",
  escalate_human: "Escalar Humano",
  intervene_renewal: "Intervir Renovação",
  enrich_context: "Enriquecer Contexto",
};

export default function AgentOperationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = useAgentOpsStats();
  const { data: workItems = [], isLoading: wiLoading } = useAgentWorkItems(
    statusFilter !== "all" || workTypeFilter !== "all"
      ? {
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          ...(workTypeFilter !== "all" ? { work_type: workTypeFilter } : {}),
        }
      : undefined
  );
  const { data: handoffs = [] } = useAgentHandoffs();
  const { bots } = useBots();

  const getBotName = (botId: string | null) => {
    if (!botId) return "—";
    const bot = bots.find((b) => b.id === botId);
    return bot?.name || botId.slice(0, 8);
  };

  const kpis = [
    { label: "Pendentes", value: stats?.pending || 0, icon: Clock, color: "text-amber-500" },
    { label: "Em Progresso", value: stats?.inProgress || 0, icon: TrendingUp, color: "text-blue-500" },
    { label: "Concluídos", value: stats?.completed || 0, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Falhados", value: stats?.failed || 0, icon: XCircle, color: "text-destructive" },
    { label: "Handoffs Hoje", value: stats?.handoffsToday || 0, icon: ArrowRightLeft, color: "text-purple-500" },
    { label: "Escalados", value: stats?.escalated || 0, icon: AlertTriangle, color: "text-orange-500" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" /> Agent Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Orquestração multi-agent: routing, work items, handoffs e performance.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                <div>
                  <p className="text-2xl font-bold">{statsLoading ? "—" : kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="work-items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="work-items" className="gap-1">
              <ClipboardList className="w-3.5 h-3.5" /> Work Items
            </TabsTrigger>
            <TabsTrigger value="handoffs" className="gap-1">
              <ArrowRightLeft className="w-3.5 h-3.5" /> Handoffs
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-1">
              <Users className="w-3.5 h-3.5" /> Equipas
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1">
              <Settings2 className="w-3.5 h-3.5" /> Configurações
            </TabsTrigger>
          </TabsList>

          {/* Work Items Tab */}
          <TabsContent value="work-items" className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="assigned">Atribuído</SelectItem>
                  <SelectItem value="in_progress">Em progresso</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="failed">Falhado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(WORK_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                {wiLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">A carregar...</p>
                ) : workItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem work items.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {workItems.map((wi) => {
                      const cfg = STATUS_CONFIG[wi.status] || STATUS_CONFIG.pending;
                      return (
                        <div key={wi.id} className="px-4 py-3 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant={cfg.variant} className="text-[10px] gap-1">
                                <cfg.icon className="w-3 h-3" />
                                {cfg.label}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {WORK_TYPE_LABELS[wi.work_type] || wi.work_type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {wi.entity_type}
                              {wi.entity_id && ` · ${wi.entity_id.slice(0, 8)}…`}
                            </p>
                          </div>
                          <div className="text-right space-y-0.5">
                            <p className="text-xs font-medium">{getBotName(wi.bot_id)}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(wi.created_at), { addSuffix: true, locale: pt })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Handoffs Tab */}
          <TabsContent value="handoffs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Handoffs Recentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {handoffs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem handoffs registados.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {handoffs.map((h) => {
                      const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.pending;
                      return (
                        <div key={h.id} className="px-4 py-3 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant={cfg.variant} className="text-[10px] gap-1">
                                <cfg.icon className="w-3 h-3" />
                                {cfg.label}
                              </Badge>
                              {h.trigger_type && (
                                <Badge variant="outline" className="text-[10px]">{h.trigger_type}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {getBotName(h.from_bot_id)} → {h.to_bot_id ? getBotName(h.to_bot_id) : h.to_user_id ? "Humano" : "—"}
                            </p>
                            {h.trigger_reason && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{h.trigger_reason}</p>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: pt })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <AgentTeamManager />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <AgentOpsSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
