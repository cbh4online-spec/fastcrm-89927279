import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useManagerPortfolio, useUpsertManagerProfile, useManageProfileCategories, type ManagerStats, type UnassignedCounts, type CategoryDimension, type ProfileCategory } from "@/hooks/useManagerPortfolio";
import { executeBulkAssign, executeRoundRobin, selectByCapacity, selectByCapacityWithMatching, type ManagerProfile, type EntityMatchCriteria } from "@/lib/commercial/assignmentEngine";
import { ENTITY_TABLE, OWNERSHIP_FIELD, type EntityType } from "@/lib/commercial/ownershipResolver";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users, UserCheck, Search, Target, Mail,
  BarChart3, ArrowLeft, Clock, Flame, ThermometerSun,
  Snowflake, Building2, Euro, AlertTriangle, UserPlus,
  MessageSquare, Calendar, PhoneCall, Activity,
  CheckCircle2, Timer, TrendingUp, Zap, ShieldCheck,
  AlertCircle, RotateCw, Gauge, History, Shuffle,
  Tag, MapPin, Briefcase, Plus, X, Settings2, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { IXEntityTabs } from "@/components/entity/ix/IXEntityTabs";
import { IXCard } from "@/components/entity/ix/IXCard";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Helpers ─────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}k`;
  return `€${value.toFixed(0)}`;
}

const TEMP_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  hot: { label: "Quente", icon: Flame, color: "text-red-500" },
  warm: { label: "Morno", icon: ThermometerSun, color: "text-amber-500" },
  cold: { label: "Frio", icon: Snowflake, color: "text-blue-500" },
};

const INTERACTION_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  message: { icon: MessageSquare, color: "text-blue-500" },
  meeting: { icon: Calendar, color: "text-purple-500" },
  call: { icon: PhoneCall, color: "text-green-500" },
  activity: { icon: Activity, color: "text-amber-500" },
  sla: { icon: Timer, color: "text-red-500" },
};

const SLA_WARNING_DAYS = 7;
const SLA_CRITICAL_DAYS = 14;

function getSlaStatus(lastContactAt: string | null) {
  if (!lastContactAt) return { level: "unknown" as const, label: "Sem contacto", days: null };
  const days = differenceInDays(new Date(), new Date(lastContactAt));
  if (days >= SLA_CRITICAL_DAYS) return { level: "critical" as const, label: `${days}d sem contacto`, days };
  if (days >= SLA_WARNING_DAYS) return { level: "warning" as const, label: `${days}d sem contacto`, days };
  return { level: "ok" as const, label: `${days}d`, days };
}

const SLA_COLORS: Record<string, string> = {
  ok: "bg-emerald-500", warning: "bg-amber-500", critical: "bg-red-500", unknown: "bg-muted-foreground/30",
};

const WORKLOAD_COLORS: Record<string, string> = {
  low: "text-emerald-600", medium: "text-amber-600", high: "text-orange-600", overloaded: "text-red-600",
};

const WORKLOAD_LABELS: Record<string, string> = {
  low: "Baixa", medium: "Média", high: "Alta", overloaded: "Sobrecarregado",
};

// ─── Entity/Interaction types ────────────────────────────────

interface EntityRow {
  id: string;
  name: string;
  email: string | null;
  type: "lead" | "contact" | "company" | "opportunity";
  score: number;
  temperature: string | null;
  estimatedValue: number | null;
  lastContactAt: string | null;
  status: string | null;
}

interface InteractionEvent {
  id: string;
  type: "message" | "meeting" | "call" | "activity" | "sla";
  title: string;
  description: string | null;
  entityName: string | null;
  entityType: string | null;
  entityId: string | null;
  timestamp: string;
  status: string | null;
}

// ─── Main Page ───────────────────────────────────────────────

export default function GestoresPage() {
  const [search, setSearch] = useState("");
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [roundRobinDialogOpen, setRoundRobinDialogOpen] = useState(false);
  const [autoAssignDialogOpen, setAutoAssignDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileEditUserId, setProfileEditUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("managers");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [detailEntitySearch, setDetailEntitySearch] = useState("");
  const queryClient = useQueryClient();

  const {
    members, membersLoading, managerStats, statsLoading,
    unassigned, assignmentLogs, rotationGroups, health,
    managerProfiles, profileCategories,
    workspaceClient, currentWorkspace,
  } = useManagerPortfolio();

  const filteredStats = useMemo(() => {
    if (!managerStats) return [];
    if (!search.trim()) return managerStats;
    const q = search.toLowerCase();
    return managerStats.filter(m => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q));
  }, [managerStats, search]);

  const totals = useMemo(() => {
    if (!managerStats) return { leads: 0, contacts: 0, companies: 0, pipeline: 0 };
    return {
      leads: managerStats.reduce((s, m) => s + m.totalLeads, 0),
      contacts: managerStats.reduce((s, m) => s + m.totalContacts, 0),
      companies: managerStats.reduce((s, m) => s + m.totalCompanies, 0),
      pipeline: managerStats.reduce((s, m) => s + m.totalPipelineValue, 0),
    };
  }, [managerStats]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["manager-portfolio-stats"] });
    queryClient.invalidateQueries({ queryKey: ["manager-unassigned"] });
    queryClient.invalidateQueries({ queryKey: ["manager-entities"] });
    queryClient.invalidateQueries({ queryKey: ["unassigned-entities"] });
    queryClient.invalidateQueries({ queryKey: ["assignment-logs"] });
  };

  // ── Detail entities for selected manager ──
  const { data: selectedEntities } = useQuery({
    queryKey: ["manager-entities", currentWorkspace?.id, selectedManager],
    queryFn: async (): Promise<EntityRow[]> => {
      if (!currentWorkspace || !selectedManager) return [];
      const [{ data: leads }, { data: contacts }, { data: companies }, { data: opps }] = await Promise.all([
        workspaceClient.from("leads").select("id, name, email, lead_score, ai_temperature, estimated_value, last_contact_at, status").eq("workspace_id", currentWorkspace.id).eq("assigned_to", selectedManager).order("last_contact_at", { ascending: false, nullsFirst: false }).limit(500),
        workspaceClient.from("contacts").select("id, name, email, contact_score, ai_temperature, last_contact_at").eq("workspace_id", currentWorkspace.id).eq("assigned_to", selectedManager).order("last_contact_at", { ascending: false, nullsFirst: false }).limit(500),
        workspaceClient.from("companies").select("id, name").eq("workspace_id", currentWorkspace.id).eq("assigned_to", selectedManager).limit(500),
        workspaceClient.from("opportunities").select("id, name, value, status, lead_id").eq("workspace_id", currentWorkspace.id).eq("owner_id", selectedManager).order("created_at", { ascending: false }).limit(500),
      ]);
      return [
        ...(leads || []).map((l: any) => ({ id: l.id, name: l.name, email: l.email, type: "lead" as const, score: l.lead_score || 0, temperature: l.ai_temperature, estimatedValue: l.estimated_value, lastContactAt: l.last_contact_at, status: l.status })),
        ...(contacts || []).map((c: any) => ({ id: c.id, name: c.name, email: c.email, type: "contact" as const, score: c.contact_score || 0, temperature: c.ai_temperature, estimatedValue: null, lastContactAt: c.last_contact_at, status: null })),
        ...(companies || []).map((c: any) => ({ id: c.id, name: c.name, email: null, type: "company" as const, score: 0, temperature: null, estimatedValue: null, lastContactAt: null, status: null })),
        ...(opps || []).map((o: any) => ({ id: o.id, name: o.name || "Oportunidade", email: null, type: "opportunity" as const, score: 0, temperature: null, estimatedValue: Number(o.value) || null, lastContactAt: null, status: o.status })),
      ];
    },
    enabled: !!currentWorkspace && !!selectedManager,
  });

  // ── Interactions ──
  const { data: interactions, isLoading: interactionsLoading } = useQuery({
    queryKey: ["manager-interactions", currentWorkspace?.id, selectedManager],
    queryFn: async (): Promise<InteractionEvent[]> => {
      if (!currentWorkspace || !selectedManager) return [];
      const [{ data: activityLogs }, { data: conversations }, { data: meetings }] = await Promise.all([
        workspaceClient.from("activity_logs").select("id, action, table_name, record_id, created_at, new_data").eq("workspace_id", currentWorkspace.id).eq("user_id", selectedManager).order("created_at", { ascending: false }).limit(50),
        workspaceClient.from("conversations").select("id, channel, lead_id, last_message_at, status, unread_count").eq("workspace_id", currentWorkspace.id).eq("assigned_to", selectedManager).order("last_message_at", { ascending: false }).limit(30),
        workspaceClient.from("meetings").select("id, title, start_time, status, lead_id, contact_id, created_by").eq("workspace_id", currentWorkspace.id).eq("created_by", selectedManager).order("start_time", { ascending: false }).limit(30),
      ]);
      const events: InteractionEvent[] = [];
      (activityLogs || []).forEach((log: any) => {
        const newData = log.new_data as Record<string, unknown> | null;
        events.push({ id: log.id, type: "activity", title: `${log.action} em ${log.table_name}`, description: newData?.name as string || null, entityName: newData?.name as string || null, entityType: log.table_name === "leads" ? "lead" : log.table_name === "contacts" ? "contact" : log.table_name === "companies" ? "company" : null, entityId: log.record_id, timestamp: log.created_at, status: log.action });
      });
      (conversations || []).forEach((conv: any) => {
        events.push({ id: conv.id, type: "message", title: `Conversa via ${conv.channel || "chat"}`, description: conv.unread_count > 0 ? `${conv.unread_count} não lidas` : "Sem mensagens pendentes", entityName: null, entityType: conv.lead_id ? "lead" : null, entityId: conv.lead_id, timestamp: conv.last_message_at || "", status: conv.status });
      });
      (meetings || []).forEach((meet: any) => {
        events.push({ id: meet.id, type: "meeting", title: meet.title || "Reunião", description: meet.status === "cancelled" ? "Cancelada" : meet.status, entityName: null, entityType: meet.lead_id ? "lead" : meet.contact_id ? "contact" : null, entityId: meet.lead_id || meet.contact_id, timestamp: meet.start_time, status: meet.status });
      });
      return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    enabled: !!currentWorkspace && !!selectedManager,
  });

  const selectedManagerData = selectedManager ? managerStats?.find(m => m.userId === selectedManager) : null;
  const isLoading = membersLoading || statsLoading;
  const totalUnassigned = unassigned.total;

  // ── Detail analytics ──
  const detailAnalytics = useMemo(() => {
    if (!selectedEntities) return null;
    const leadEntities = selectedEntities.filter(e => e.type === "lead");
    const oppEntities = selectedEntities.filter(e => e.type === "opportunity");
    const allWithContact = selectedEntities.filter(e => e.lastContactAt);
    const wonOpps = oppEntities.filter(e => e.status === "won").length;
    const conversionRate = leadEntities.length > 0 ? Math.round((wonOpps / leadEntities.length) * 100) : 0;
    const slaStatuses = allWithContact.map(e => getSlaStatus(e.lastContactAt));
    const withinSla = slaStatuses.filter(s => s.level === "ok").length;
    const warning = slaStatuses.filter(s => s.level === "warning").length;
    const critical = slaStatuses.filter(s => s.level === "critical").length;
    const noContact = selectedEntities.filter(e => !e.lastContactAt).length;
    const slaCompliance = allWithContact.length > 0 ? Math.round((withinSla / allWithContact.length) * 100) : 0;
    const daysSinceContact = allWithContact.map(e => differenceInDays(new Date(), new Date(e.lastContactAt!)));
    const avgDaysSinceContact = daysSinceContact.length > 0 ? Math.round(daysSinceContact.reduce((a, b) => a + b, 0) / daysSinceContact.length) : 0;
    const totalPipeline = oppEntities.filter(e => e.status !== "lost").reduce((s, e) => s + (e.estimatedValue || 0), 0);
    return { conversionRate, converted: wonOpps, totalLeads: leadEntities.length, totalOpportunities: oppEntities.length, slaCompliance, withinSla, warning, critical, noContact, avgDaysSinceContact, totalPipeline };
  }, [selectedEntities]);

  const filteredDetailEntities = useMemo(() => {
    let list = selectedEntities || [];
    if (entityFilter !== "all") {
      list = list.filter(e => e.type === (entityFilter === "leads" ? "lead" : entityFilter === "contacts" ? "contact" : entityFilter === "opportunities" ? "opportunity" : "company"));
    }
    if (detailEntitySearch.trim()) {
      const q = detailEntitySearch.toLowerCase();
      list = list.filter(e => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q));
    }
    return list;
  }, [selectedEntities, entityFilter, detailEntitySearch]);

  // ── Auto-assign handler (with skill matching) ──
  const handleAutoAssign = async (entityType: EntityType) => {
    if (!currentWorkspace || !managerStats.length) return;
    try {
      // Use skill-matching auto-assign
      const table = ENTITY_TABLE[entityType] as "leads" | "contacts" | "companies" | "opportunities";
      const field = OWNERSHIP_FIELD[entityType];
      const { data: unassignedItems } = await (workspaceClient.from(table) as any)
        .select("id, name")
        .eq("workspace_id", currentWorkspace.id)
        .or(`${field}.is.null,${field}.eq.`)
        .limit(50);

      if (!unassignedItems || unassignedItems.length === 0) {
        toast.info(`Não existem ${entityType}s sem gestor.`);
        return;
      }

      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id || "";

      // For now, entities don't carry segment/territory/client_type fields yet,
      // so we pass empty criteria → any active profiled manager matches → fallback to capacity
      const criteria: EntityMatchCriteria = {};
      const bestManager = selectByCapacityWithMatching(
        managerStats.map(m => m.workload),
        managerProfiles,
        criteria
      );

      if (!bestManager) {
        // Mandatory matching: no manager matched
        toast.error("Nenhum gestor elegível encontrado. Verifique os perfis dos gestores.");
        return;
      }

      const bestName = managerStats.find(m => m.userId === bestManager)?.name || "Gestor";

      await executeBulkAssign(
        workspaceClient, entityType,
        unassignedItems.map((e: any) => e.id),
        bestManager, currentWorkspace.id, userId, "auto_capacity"
      );

      toast.success(`${unassignedItems.length} ${entityType}s atribuídas a ${bestName} (matching + capacidade)`);
      invalidateAll();
    } catch (err: any) {
      toast.error(err?.message || "Erro na auto-atribuição");
    }
  };

  // ── Open profile editor ──
  const openProfileEditor = (userId: string) => {
    setProfileEditUserId(userId);
    setProfileDialogOpen(true);
  };
  if (selectedManager && selectedManagerData) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSelectedManager(null)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Avatar className="h-12 w-12">
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                  {getInitials(selectedManagerData.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold">{selectedManagerData.name}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {selectedManagerData.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selectedManagerData.email}</span>}
                  <Badge variant="outline" className="capitalize">{selectedManagerData.role}</Badge>
                  <Badge variant="outline" className={cn("text-[10px]", WORKLOAD_COLORS[selectedManagerData.workload.workloadBucket])}>
                    <Gauge className="w-3 h-3 mr-1" />
                    Carga: {WORKLOAD_LABELS[selectedManagerData.workload.workloadBucket]}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatCard label="Leads" value={selectedManagerData.totalLeads} icon={Target} />
            <StatCard label="Contactos" value={selectedManagerData.totalContacts} icon={Users} />
            <StatCard label="Empresas" value={selectedManagerData.totalCompanies} icon={Building2} />
            <StatCard label="Oportunidades" value={selectedManagerData.totalOpportunities} icon={BarChart3} subtitle={`${selectedManagerData.wonOpportunities} ganhas`} />
            <StatCard label="Pipeline" value={formatCurrency(selectedManagerData.totalPipelineValue)} icon={Euro} />
            <StatCard label="Conversão" value={selectedManagerData.totalLeads > 0 ? `${detailAnalytics?.conversionRate || 0}%` : "—"} icon={TrendingUp} subtitle={selectedManagerData.totalLeads > 0 ? `${detailAnalytics?.converted || 0}/${detailAnalytics?.totalLeads || 0}` : "Sem leads"} />
            <StatCard label="SLA" value={`${detailAnalytics?.slaCompliance || 0}%`} icon={ShieldCheck} variant={detailAnalytics && detailAnalytics.slaCompliance < 50 ? "danger" : detailAnalytics && detailAnalytics.slaCompliance < 80 ? "warning" : "default"} />
            <StatCard label="Capacidade" value={`${selectedManagerData.workload.capacityScore}%`} icon={Gauge} variant={selectedManagerData.workload.workloadBucket === "overloaded" ? "danger" : selectedManagerData.workload.workloadBucket === "high" ? "warning" : "default"} />
          </div>

          {/* SLA + Temperature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />Estado dos SLAs</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { val: detailAnalytics?.withinSla || 0, label: "OK", cls: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" },
                    { val: detailAnalytics?.warning || 0, label: "Atenção", cls: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" },
                    { val: detailAnalytics?.critical || 0, label: "Crítico", cls: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400" },
                    { val: detailAnalytics?.noContact || 0, label: "S/ contacto", cls: "bg-muted/50" },
                  ].map(s => (
                    <div key={s.label} className={cn("rounded-lg p-2", s.cls.split(" ").filter(c => c.startsWith("bg-")).join(" "))}>
                      <p className={cn("text-lg font-bold", s.cls.split(" ").filter(c => c.startsWith("text-")).join(" "))}>{s.val}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Tempo médio: <span className="font-medium">{detailAnalytics?.avgDaysSinceContact || 0} dias</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Flame className="w-4 h-4 text-red-500" />Distribuição de Temperatura</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(["hot", "warm", "cold"] as const).map(t => {
                    const cfg = TEMP_CONFIG[t];
                    const count = t === "hot" ? selectedManagerData.leadsHot : t === "warm" ? selectedManagerData.leadsWarm : selectedManagerData.leadsCold;
                    const pct = selectedManagerData.totalLeads > 0 ? Math.round((count / selectedManagerData.totalLeads) * 100) : 0;
                    return (
                      <div key={t} className="rounded-lg bg-muted/50 p-2">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <cfg.icon className={cn("w-4 h-4", cfg.color)} />
                          <span className="text-lg font-bold">{count}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{cfg.label} ({pct}%)</p>
                      </div>
                    );
                  })}
                </div>
                {selectedManagerData.totalLeads > 0 && (
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    {selectedManagerData.leadsHot > 0 && <div className="bg-red-500" style={{ width: `${(selectedManagerData.leadsHot / selectedManagerData.totalLeads) * 100}%` }} />}
                    {selectedManagerData.leadsWarm > 0 && <div className="bg-amber-500" style={{ width: `${(selectedManagerData.leadsWarm / selectedManagerData.totalLeads) * 100}%` }} />}
                    {selectedManagerData.leadsCold > 0 && <div className="bg-blue-500" style={{ width: `${(selectedManagerData.leadsCold / selectedManagerData.totalLeads) * 100}%` }} />}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Interaction summary */}
          {interactions && interactions.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Actividade Recente</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(["activity", "message", "meeting", "call"] as const).map(type => {
                    const count = interactions.filter(i => i.type === type).length;
                    const cfg = INTERACTION_ICONS[type];
                    const Icon = cfg.icon;
                    const labels: Record<string, string> = { activity: "Atividades", message: "Mensagens", meeting: "Reuniões", call: "Chamadas" };
                    return (
                      <div key={type} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center bg-background", cfg.color)}><Icon className="w-4 h-4" /></div>
                        <div><p className="text-lg font-bold">{count}</p><p className="text-[10px] text-muted-foreground">{labels[type]}</p></div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs: Portfolio + History */}
          <Tabs defaultValue="entities">
            <TabsList>
              <TabsTrigger value="entities">Portfólio ({selectedEntities?.length || 0})</TabsTrigger>
              <TabsTrigger value="history">Histórico ({interactions?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="entities" className="space-y-3 mt-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={detailEntitySearch} onChange={e => setDetailEntitySearch(e.target.value)} placeholder="Pesquisar entidade..." className="pl-9" />
                </div>
                <div className="flex gap-1">
                  {[
                    { value: "all", label: "Tudo" },
                    { value: "leads", label: `Leads (${selectedEntities?.filter(e => e.type === "lead").length || 0})` },
                    { value: "contacts", label: `Contactos (${selectedEntities?.filter(e => e.type === "contact").length || 0})` },
                    { value: "companies", label: `Empresas (${selectedEntities?.filter(e => e.type === "company").length || 0})` },
                    { value: "opportunities", label: `Oport. (${selectedEntities?.filter(e => e.type === "opportunity").length || 0})` },
                  ].map(tab => (
                    <Button key={tab.value} variant={entityFilter === tab.value ? "default" : "outline"} size="sm" onClick={() => setEntityFilter(tab.value)} className="text-xs">{tab.label}</Button>
                  ))}
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="grid grid-cols-[1fr_80px_90px_100px_80px_90px] gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                    <span>Entidade</span><span className="text-center">Tipo</span><span className="text-center">Temp.</span><span className="text-center">Último contacto</span><span className="text-center">SLA</span><span className="text-right">Valor</span>
                  </div>
                  <div className="divide-y max-h-[calc(100vh-520px)] overflow-y-auto">
                    {filteredDetailEntities.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma entidade encontrada.</div>
                    ) : filteredDetailEntities.map(entity => {
                      const sla = getSlaStatus(entity.lastContactAt);
                      return (
                        <Link key={entity.id} to={`/dashboard/${entity.type === "lead" ? "leads" : entity.type === "contact" ? "contacts" : entity.type === "opportunity" ? "opportunities" : "companies"}/${entity.id}`} className="grid grid-cols-[1fr_80px_90px_100px_80px_90px] gap-2 items-center px-4 py-2.5 hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(entity.name)}</AvatarFallback></Avatar>
                            <div className="min-w-0"><p className="text-sm font-medium truncate">{entity.name}</p>{entity.email && <p className="text-[11px] text-muted-foreground truncate">{entity.email}</p>}</div>
                          </div>
                          <div className="text-center"><Badge variant="outline" className="text-[10px]">{entity.type === "lead" ? "Lead" : entity.type === "contact" ? "Contacto" : entity.type === "opportunity" ? "Oport." : "Empresa"}</Badge></div>
                          <div className="text-center">
                            {entity.temperature && TEMP_CONFIG[entity.temperature] ? (
                              <div className="flex items-center justify-center gap-1">{(() => { const Ic = TEMP_CONFIG[entity.temperature!].icon; return <Ic className={cn("w-3.5 h-3.5", TEMP_CONFIG[entity.temperature!].color)} />; })()}<span className={cn("text-xs font-medium", TEMP_CONFIG[entity.temperature].color)}>{TEMP_CONFIG[entity.temperature].label}</span></div>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                          <div className="text-center">{entity.lastContactAt ? <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(entity.lastContactAt), { addSuffix: true, locale: pt })}</span> : <span className="text-xs text-muted-foreground">—</span>}</div>
                          <div className="flex justify-center"><TooltipProvider><Tooltip><TooltipTrigger><div className={cn("w-2.5 h-2.5 rounded-full", SLA_COLORS[sla.level])} /></TooltipTrigger><TooltipContent><p>{sla.label}</p></TooltipContent></Tooltip></TooltipProvider></div>
                          <div className="text-right">{entity.estimatedValue && entity.estimatedValue > 0 ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(entity.estimatedValue)}</span> : <span className="text-xs text-muted-foreground">—</span>}</div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history" className="mt-3">
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y max-h-[calc(100vh-420px)] overflow-y-auto">
                    {interactionsLoading ? <div className="py-12 text-center text-sm text-muted-foreground">A carregar...</div> : !interactions || interactions.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground"><Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />Sem interações.</div>
                    ) : interactions.map(event => {
                      const cfg = INTERACTION_ICONS[event.type] || INTERACTION_ICONS.activity;
                      const Icon = cfg.icon;
                      return (
                        <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-muted/60", cfg.color)}><Icon className="w-4 h-4" /></div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium">{event.title}</p>{event.description && <p className="text-xs text-muted-foreground truncate">{event.description}</p>}{event.entityId && event.entityType && <Link to={`/dashboard/${event.entityType === "lead" ? "leads" : event.entityType === "contact" ? "contacts" : "companies"}/${event.entityId}`} className="text-xs text-primary hover:underline">Ver entidade →</Link>}</div>
                          <div className="text-right shrink-0"><p className="text-[11px] text-muted-foreground">{event.timestamp ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: pt }) : "—"}</p>{event.status && <Badge variant="outline" className="text-[9px] mt-0.5">{event.status}</Badge>}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LIST VIEW — COCKPIT OPERACIONAL
  // ═══════════════════════════════════════════════════════════
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary" />
              Gestores — Cockpit Operacional
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Distribuição, atribuição e performance do portfólio comercial</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAutoAssignDialogOpen(true)} className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Auto-Assign
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRoundRobinDialogOpen(true)} className="gap-1.5">
              <Shuffle className="w-3.5 h-3.5" />
              Round Robin
            </Button>
            <Button onClick={() => setAssignDialogOpen(true)} className="gap-1.5" size="sm">
              <UserPlus className="w-3.5 h-3.5" />
              Atribuir
            </Button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Gestores" value={members?.length || 0} icon={Users} loading={membersLoading} />
          <StatCard label="Leads Atribuídas" value={totals.leads} icon={Target} loading={statsLoading} />
          <StatCard label="Contactos" value={totals.contacts} icon={Users} loading={statsLoading} />
          <StatCard label="Pipeline" value={formatCurrency(totals.pipeline)} icon={Euro} loading={statsLoading} />
          <StatCardAlert label="Não Atribuídos" value={totalUnassigned} detail={`${unassigned.leads} leads · ${unassigned.contacts} cont. · ${unassigned.companies} emp. · ${unassigned.opportunities} oport.`} onClick={() => setAssignDialogOpen(true)} />
          <StatCard label="Cobertura" value={`${health?.coveragePct || 0}%`} icon={ShieldCheck} variant={health && health.coveragePct < 50 ? "danger" : health && health.coveragePct < 80 ? "warning" : "default"} />
        </div>

        {/* Health bar */}
        {health && (
          <Card className="border-dashed">
            <CardContent className="p-3 flex items-center gap-4">
              <div className="flex items-center gap-2 shrink-0"><Activity className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground">Saúde</span></div>
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1"><Progress value={health.coveragePct} className="h-2" /></div>
                <span className={cn("text-sm font-semibold", health.coveragePct >= 80 ? "text-emerald-600" : health.coveragePct >= 50 ? "text-amber-600" : "text-red-600")}>{health.coveragePct}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{health.assignedEntities} atribuídas / {health.totalEntities} total</span>
            </CardContent>
          </Card>
        )}

        {/* Tabs: Managers | Workload | Assignment Log */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="managers">Gestores ({managerStats.length})</TabsTrigger>
            <TabsTrigger value="workload">Carga de Trabalho</TabsTrigger>
            <TabsTrigger value="categories">Perfis & Categorias</TabsTrigger>
            <TabsTrigger value="logs">Histórico</TabsTrigger>
          </TabsList>

          {/* ── TAB: Managers ── */}
          <TabsContent value="managers" className="space-y-4 mt-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar gestor..." className="pl-9" />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-48" /></Card>)}
              </div>
            ) : filteredStats.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>Nenhum gestor encontrado.</p></CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStats.map(manager => (
                  <Card key={manager.userId} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => setSelectedManager(manager.userId)}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(manager.name)}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0"><p className="font-semibold truncate">{manager.name}</p><p className="text-xs text-muted-foreground truncate">{manager.email}</p></div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="capitalize text-[10px]">{manager.role}</Badge>
                          <Badge variant="outline" className={cn("text-[9px]", WORKLOAD_COLORS[manager.workload.workloadBucket])}>{WORKLOAD_LABELS[manager.workload.workloadBucket]}</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { val: manager.totalLeads, label: "Leads" },
                          { val: manager.totalContacts, label: "Contactos" },
                          { val: manager.totalCompanies, label: "Empresas" },
                          { val: manager.totalOpportunities, label: "Oport." },
                        ].map(s => (
                          <div key={s.label} className="rounded-lg bg-muted/50 p-2">
                            <p className="text-lg font-bold">{s.val}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Profile badges */}
                      {manager.profile && (manager.profile.segments.length > 0 || manager.profile.territories.length > 0 || manager.profile.client_types.length > 0) && (
                        <div className="flex flex-wrap gap-1">
                          {manager.profile.segments.map(s => <Badge key={`s-${s}`} variant="secondary" className="text-[9px] gap-1"><Tag className="w-2.5 h-2.5" />{s}</Badge>)}
                          {manager.profile.territories.map(t => <Badge key={`t-${t}`} variant="secondary" className="text-[9px] gap-1"><MapPin className="w-2.5 h-2.5" />{t}</Badge>)}
                          {manager.profile.client_types.map(c => <Badge key={`c-${c}`} variant="secondary" className="text-[9px] gap-1"><Briefcase className="w-2.5 h-2.5" />{c}</Badge>)}
                        </div>
                      )}
                      {!manager.profile && (
                        <button onClick={(e) => { e.stopPropagation(); openProfileEditor(manager.userId); }} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
                          <Settings2 className="w-3 h-3" />Configurar perfil
                        </button>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5"><Euro className="w-3.5 h-3.5 text-emerald-600" /><span className="font-medium">{formatCurrency(manager.totalPipelineValue)}</span><span className="text-muted-foreground text-xs">pipeline</span></div>
                        <div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-primary" /><span className="font-medium">{manager.totalLeads > 0 ? `${Math.round((manager.convertedLeads / manager.totalLeads) * 100)}%` : "—"}</span><span className="text-muted-foreground text-xs">conversão</span></div>
                      </div>

                      {manager.totalLeads > 0 && (
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                          {manager.leadsHot > 0 && <div className="bg-red-500" style={{ width: `${(manager.leadsHot / manager.totalLeads) * 100}%` }} />}
                          {manager.leadsWarm > 0 && <div className="bg-amber-500" style={{ width: `${(manager.leadsWarm / manager.totalLeads) * 100}%` }} />}
                          {manager.leadsCold > 0 && <div className="bg-blue-500" style={{ width: `${(manager.leadsCold / manager.totalLeads) * 100}%` }} />}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        {manager.lastActivityAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(manager.lastActivityAt), "dd/MM/yyyy")}</span>}
                        <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />Capacidade: {manager.workload.capacityScore}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: Workload ── */}
          <TabsContent value="workload" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" />Carga de Trabalho por Gestor</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {managerStats.map(m => (
                    <div key={m.userId} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-48 shrink-0">
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(m.name)}</AvatarFallback></Avatar>
                        <span className="text-sm font-medium truncate">{m.name}</span>
                      </div>
                      <div className="flex-1"><Progress value={100 - m.workload.capacityScore} className="h-3" /></div>
                      <div className="flex items-center gap-2 shrink-0 w-32 justify-end">
                        <span className={cn("text-sm font-semibold", WORKLOAD_COLORS[m.workload.workloadBucket])}>{WORKLOAD_LABELS[m.workload.workloadBucket]}</span>
                        <span className="text-[10px] text-muted-foreground">({m.workload.totalLoad.toFixed(0)}pt)</span>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 w-24 text-right">
                        {m.totalLeads}L · {m.totalContacts}C · {m.totalOpportunities}O
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: Profiles & Categories ── */}
          <TabsContent value="categories" className="mt-4 space-y-4">
            <CategoriesManager workspaceId={currentWorkspace?.id || ""} categories={profileCategories} />
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Perfis dos Gestores</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {managerStats.map(m => {
                    const profile = m.profile;
                    return (
                      <div key={m.userId} className="flex items-center gap-4 p-3 rounded-lg border">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(m.name)}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{m.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {profile?.segments.map(s => <Badge key={s} variant="secondary" className="text-[9px] gap-1"><Tag className="w-2.5 h-2.5" />{s}</Badge>)}
                            {profile?.territories.map(t => <Badge key={t} variant="secondary" className="text-[9px] gap-1"><MapPin className="w-2.5 h-2.5" />{t}</Badge>)}
                            {profile?.client_types.map(c => <Badge key={c} variant="secondary" className="text-[9px] gap-1"><Briefcase className="w-2.5 h-2.5" />{c}</Badge>)}
                            {!profile && <span className="text-[10px] text-muted-foreground">Sem perfil configurado</span>}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openProfileEditor(m.userId)} className="text-xs gap-1">
                          <Settings2 className="w-3 h-3" />Editar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-primary" />Histórico de Atribuições</CardTitle></CardHeader>
              <CardContent className="p-0">
                {assignmentLogs.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground"><History className="w-8 h-8 mx-auto mb-2 opacity-40" />Sem atribuições registadas.</div>
                ) : (
                  <div className="divide-y max-h-[400px] overflow-y-auto">
                    {assignmentLogs.map((log: any) => {
                      const newName = members?.find(m => m.user_id === log.new_manager_id)?.profile?.full_name || "—";
                      const prevName = log.previous_manager_id ? (members?.find(m => m.user_id === log.previous_manager_id)?.profile?.full_name || "—") : null;
                      const modeLabels: Record<string, string> = { manual: "Manual", bulk: "Em massa", round_robin: "Round Robin", auto_capacity: "Auto (capacidade)", fallback: "Fallback" };
                      return (
                        <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                          <Badge variant="outline" className="text-[9px] shrink-0">{modeLabels[log.assignment_mode] || log.assignment_mode}</Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate"><span className="font-medium">{log.entity_name || log.entity_id?.slice(0, 8)}</span> <span className="text-muted-foreground">({log.entity_type})</span></p>
                            <p className="text-[11px] text-muted-foreground">{prevName ? `${prevName} → ${newName}` : `→ ${newName}`}</p>
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: pt })}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <BulkAssignDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} members={members || []} workspaceId={currentWorkspace?.id || ""} workspaceClient={workspaceClient} onAssigned={invalidateAll} />
        <RoundRobinDialog open={roundRobinDialogOpen} onOpenChange={setRoundRobinDialogOpen} members={members || []} workspaceId={currentWorkspace?.id || ""} workspaceClient={workspaceClient} rotationGroups={rotationGroups} onDone={invalidateAll} />
        <AutoAssignDialog open={autoAssignDialogOpen} onOpenChange={setAutoAssignDialogOpen} unassigned={unassigned} onAssign={handleAutoAssign} managerProfiles={managerProfiles} managerStats={managerStats} />
        <ManagerProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} userId={profileEditUserId} categories={profileCategories} profiles={managerProfiles} managerStats={managerStats} />
      </div>
    </DashboardLayout>
  );
}

// ─── Stat Cards ──────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, loading, subtitle, variant = "default" }: {
  label: string; value: string | number; icon: React.ElementType; loading?: boolean; subtitle?: string;
  variant?: "default" | "warning" | "danger";
}) {
  return (
    <Card className={cn(variant === "danger" && "border-red-200 dark:border-red-800", variant === "warning" && "border-amber-200 dark:border-amber-800")}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", variant === "danger" ? "bg-red-100 dark:bg-red-900/40" : variant === "warning" ? "bg-amber-100 dark:bg-amber-900/40" : "bg-primary/10")}>
          <Icon className={cn("w-4 h-4", variant === "danger" ? "text-red-600" : variant === "warning" ? "text-amber-600" : "text-primary")} />
        </div>
        <div>
          {loading ? <div className="h-6 w-10 rounded bg-muted animate-pulse mb-1" /> : <p className={cn("text-lg font-bold", variant === "danger" && "text-red-700 dark:text-red-400", variant === "warning" && "text-amber-700 dark:text-amber-400")}>{value}</p>}
          <p className="text-[10px] text-muted-foreground">{label}</p>
          {subtitle && <p className="text-[9px] text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardAlert({ label, value, detail, onClick }: { label: string; value: number; detail: string; onClick: () => void }) {
  return (
    <Card className={cn("cursor-pointer hover:border-amber-500/50 transition-all", value > 0 && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20")} onClick={onClick}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0"><AlertTriangle className="w-4 h-4 text-amber-600" /></div>
        <div><p className="text-lg font-bold text-amber-700 dark:text-amber-400">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p><p className="text-[9px] text-muted-foreground mt-0.5">{detail}</p></div>
      </CardContent>
    </Card>
  );
}

// ─── Bulk Assign Dialog ──────────────────────────────────────

function BulkAssignDialog({ open, onOpenChange, members, workspaceId, workspaceClient, onAssigned }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  members: Array<{ user_id: string; profile?: { full_name?: string | null; email?: string | null } | null; role: string }>;
  workspaceId: string; workspaceClient: any; onAssigned: () => void;
}) {
  const [entityType, setEntityType] = useState<"leads" | "contacts" | "companies">("leads");
  const [targetManager, setTargetManager] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");

  const entityTypeMap: Record<string, EntityType> = { leads: "lead", contacts: "contact", companies: "company" };

  const { data: unassignedEntities, isLoading } = useQuery({
    queryKey: ["unassigned-entities", workspaceId, entityType],
    queryFn: async () => {
      const { data } = await workspaceClient.from(entityType).select("id, name, email").eq("workspace_id", workspaceId).or("assigned_to.is.null,assigned_to.eq.").order("name").limit(500);
      return data || [];
    },
    enabled: open && !!workspaceId,
  });

  const filteredEntities = useMemo(() => {
    if (!unassignedEntities) return [];
    if (!entitySearch.trim()) return unassignedEntities;
    const q = entitySearch.toLowerCase();
    return unassignedEntities.filter((e: any) => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q));
  }, [unassignedEntities, entitySearch]);

  const handleAssign = async () => {
    if (!targetManager || selectedIds.length === 0) { toast.error("Selecione um gestor e pelo menos uma entidade."); return; }
    setIsAssigning(true);
    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id || "";
      await executeBulkAssign(workspaceClient, entityTypeMap[entityType], selectedIds, targetManager, workspaceId, userId, "bulk");
      toast.success(`${selectedIds.length} ${entityType === "leads" ? "leads" : entityType === "contacts" ? "contactos" : "empresas"} atribuídos com sucesso!`);
      setSelectedIds([]);
      setTargetManager("");
      onAssigned();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atribuir entidades.");
    } finally { setIsAssigning(false); }
  };

  const toggleAll = () => {
    if (!filteredEntities.length) return;
    setSelectedIds(selectedIds.length === filteredEntities.length ? [] : filteredEntities.map((e: any) => e.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" />Atribuir Entidades a Gestor</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block">Tipo</label><Select value={entityType} onValueChange={(v: any) => { setEntityType(v); setSelectedIds([]); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="leads">Leads</SelectItem><SelectItem value="contacts">Contactos</SelectItem><SelectItem value="companies">Empresas</SelectItem></SelectContent></Select></div>
          <div><label className="text-sm font-medium mb-1.5 block">Atribuir a</label><Select value={targetManager} onValueChange={setTargetManager}><SelectTrigger><SelectValue placeholder="Escolher gestor..." /></SelectTrigger><SelectContent>{members.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email || "Utilizador"}</SelectItem>)}</SelectContent></Select></div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Sem gestor ({unassignedEntities?.length || 0})</label>
              {(filteredEntities?.length || 0) > 0 && <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">{selectedIds.length === (filteredEntities?.length || 0) ? "Desselecionar" : "Selecionar tudo"}</Button>}
            </div>
            <div className="relative mb-2"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><Input value={entitySearch} onChange={e => setEntitySearch(e.target.value)} placeholder="Filtrar..." className="pl-8 h-8 text-sm" /></div>
            <ScrollArea className="max-h-[250px] border rounded-md">
              {isLoading ? <div className="py-8 text-center text-sm text-muted-foreground">A carregar...</div> : filteredEntities.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">{entitySearch ? "Nenhum resultado." : <><CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />Todas atribuídas!</>}</div>
              ) : (
                <div className="divide-y">{filteredEntities.map((entity: any) => (
                  <label key={entity.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent transition-colors">
                    <Checkbox checked={selectedIds.includes(entity.id)} onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, entity.id] : prev.filter(id => id !== entity.id))} />
                    <div className="flex-1 min-w-0"><p className="text-sm truncate">{entity.name || "Sem nome"}</p>{entity.email && <p className="text-[11px] text-muted-foreground truncate">{entity.email}</p>}</div>
                  </label>
                ))}</div>
              )}
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={isAssigning || selectedIds.length === 0 || !targetManager}>{isAssigning ? "A atribuir..." : `Atribuir ${selectedIds.length}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Round Robin Dialog ──────────────────────────────────────

function RoundRobinDialog({ open, onOpenChange, members, workspaceId, workspaceClient, rotationGroups, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  members: Array<{ user_id: string; profile?: { full_name?: string | null; email?: string | null } | null }>;
  workspaceId: string; workspaceClient: any; rotationGroups: any[]; onDone: () => void;
}) {
  const [entityType, setEntityType] = useState<EntityType>("lead");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [maxItems, setMaxItems] = useState("50");
  const [isRunning, setIsRunning] = useState(false);
  const queryClient = useQueryClient();

  const handleRun = async () => {
    if (selectedMembers.length < 2) { toast.error("Selecione pelo menos 2 gestores."); return; }
    setIsRunning(true);
    try {
      // Find or create rotation group
      let groupId: string;
      const existing = rotationGroups.find((g: any) => g.entity_type === entityType && g.is_active);
      if (existing) {
        groupId = existing.id;
        // Update members
        await workspaceClient.from("rotation_group_members").delete().eq("group_id", groupId);
        await workspaceClient.from("rotation_group_members").insert(
          selectedMembers.map((id, idx) => ({ group_id: groupId, manager_id: id, position: idx, is_active: true, workspace_id: workspaceId }))
        );
      } else {
        const { data: newGroup } = await workspaceClient.from("assignment_rotation_groups").insert({
          workspace_id: workspaceId, name: `Round Robin — ${entityType}`, entity_type: entityType, is_active: true,
        }).select("id").single();
        groupId = newGroup.id;
        await workspaceClient.from("rotation_group_members").insert(
          selectedMembers.map((id, idx) => ({ group_id: groupId, manager_id: id, position: idx, is_active: true, workspace_id: workspaceId }))
        );
      }

      // Get unassigned entities
      const table = ENTITY_TABLE[entityType];
      const field = OWNERSHIP_FIELD[entityType];
      const { data: items } = await workspaceClient.from(table).select("id").eq("workspace_id", workspaceId).or(`${field}.is.null,${field}.eq.`).limit(parseInt(maxItems) || 50);

      if (!items || items.length === 0) { toast.info("Não existem entidades para distribuir."); setIsRunning(false); return; }

      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id || "";

      const result = await executeRoundRobin(workspaceClient, groupId, entityType, items.map((i: any) => i.id), workspaceId, userId);
      toast.success(`${result.success} entidades distribuídas por ${selectedMembers.length} gestores via Round Robin!`);
      queryClient.invalidateQueries({ queryKey: ["rotation-groups"] });
      onDone();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro no Round Robin");
    } finally { setIsRunning(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Shuffle className="w-5 h-5" />Round Robin</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block">Tipo de entidade</label><Select value={entityType} onValueChange={(v: EntityType) => setEntityType(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lead">Leads</SelectItem><SelectItem value="contact">Contactos</SelectItem><SelectItem value="company">Empresas</SelectItem><SelectItem value="opportunity">Oportunidades</SelectItem></SelectContent></Select></div>
          <div><label className="text-sm font-medium mb-1.5 block">Máximo de entidades</label><Input type="number" value={maxItems} onChange={e => setMaxItems(e.target.value)} /></div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Gestores ({selectedMembers.length} selecionados)</label>
            <ScrollArea className="max-h-[200px] border rounded-md">
              <div className="divide-y">{members.map(m => (
                <label key={m.user_id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent transition-colors">
                  <Checkbox checked={selectedMembers.includes(m.user_id)} onCheckedChange={(checked) => setSelectedMembers(prev => checked ? [...prev, m.user_id] : prev.filter(id => id !== m.user_id))} />
                  <span className="text-sm">{m.profile?.full_name || m.profile?.email || "Utilizador"}</span>
                </label>
              ))}</div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleRun} disabled={isRunning || selectedMembers.length < 2}>{isRunning ? "A distribuir..." : "Distribuir"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Auto-Assign Dialog ──────────────────────────────────────

function AutoAssignDialog({ open, onOpenChange, unassigned, onAssign, managerProfiles, managerStats }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  unassigned: UnassignedCounts; onAssign: (type: EntityType) => Promise<void>;
  managerProfiles: ManagerProfile[]; managerStats: ManagerStats[];
}) {
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async (type: EntityType) => {
    setIsRunning(true);
    await onAssign(type);
    setIsRunning(false);
    onOpenChange(false);
  };

  const profiledCount = managerProfiles.filter(p => p.is_active && (p.segments.length > 0 || p.territories.length > 0 || p.client_types.length > 0)).length;

  const types: Array<{ type: EntityType; label: string; count: number; icon: React.ElementType }> = [
    { type: "lead", label: "Leads", count: unassigned.leads, icon: Target },
    { type: "contact", label: "Contactos", count: unassigned.contacts, icon: Users },
    { type: "company", label: "Empresas", count: unassigned.companies, icon: Building2 },
    { type: "opportunity", label: "Oportunidades", count: unassigned.opportunities, icon: BarChart3 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5" />Auto-Assign Inteligente</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Atribui ao gestor com matching de perfil + mais capacidade disponível (até 50 de cada vez).</p>
        {profiledCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {profiledCount} gestor{profiledCount > 1 ? "es" : ""} com perfil configurado
          </div>
        )}
        {profiledCount === 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            Nenhum gestor com perfil. Configure em "Perfis & Categorias".
          </div>
        )}
        <div className="space-y-2 mt-2">
          {types.map(t => (
            <Button key={t.type} variant="outline" className="w-full justify-between" disabled={isRunning || t.count === 0} onClick={() => handleRun(t.type)}>
              <span className="flex items-center gap-2"><t.icon className="w-4 h-4" />{t.label}</span>
              <Badge variant="secondary">{t.count} sem gestor</Badge>
            </Button>
          ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manager Profile Dialog ──────────────────────────────────

function ManagerProfileDialog({ open, onOpenChange, userId, categories, profiles, managerStats }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  userId: string | null;
  categories: ProfileCategory[];
  profiles: ManagerProfile[];
  managerStats: ManagerStats[];
}) {
  const upsertProfile = useUpsertManagerProfile();
  const profile = profiles.find(p => p.user_id === userId);
  const manager = managerStats.find(m => m.userId === userId);

  const [segments, setSegments] = useState<string[]>([]);
  const [territories, setTerritories] = useState<string[]>([]);
  const [clientTypes, setClientTypes] = useState<string[]>([]);

  // Sync state when dialog opens
  const prevUserId = useState<string | null>(null);
  if (userId !== prevUserId[0]) {
    prevUserId[1](userId);
    setSegments(profile?.segments || []);
    setTerritories(profile?.territories || []);
    setClientTypes(profile?.client_types || []);
  }

  const segmentOptions = categories.filter(c => c.dimension === "segment");
  const territoryOptions = categories.filter(c => c.dimension === "territory");
  const clientTypeOptions = categories.filter(c => c.dimension === "client_type");

  const handleSave = () => {
    if (!userId) return;
    upsertProfile.mutate({ user_id: userId, segments, territories, client_types: clientTypes }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const toggleValue = (list: string[], setter: (v: string[]) => void, value: string) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Perfil de {manager?.name || "Gestor"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <CategorySection
            label="Segmentos"
            icon={Tag}
            options={segmentOptions}
            selected={segments}
            onToggle={(v) => toggleValue(segments, setSegments, v)}
          />
          <CategorySection
            label="Territórios"
            icon={MapPin}
            options={territoryOptions}
            selected={territories}
            onToggle={(v) => toggleValue(territories, setTerritories, v)}
          />
          <CategorySection
            label="Tipos de Cliente"
            icon={Briefcase}
            options={clientTypeOptions}
            selected={clientTypes}
            onToggle={(v) => toggleValue(clientTypes, setClientTypes, v)}
          />
          {segmentOptions.length === 0 && territoryOptions.length === 0 && clientTypeOptions.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
              Nenhuma categoria disponível. Adicione categorias no separador "Perfis & Categorias".
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsertProfile.isPending}>{upsertProfile.isPending ? "A guardar..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategorySection({ label, icon: Icon, options, selected, onToggle }: {
  label: string; icon: React.ElementType;
  options: ProfileCategory[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />{label}
      </label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma opção disponível</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map(opt => (
            <Badge
              key={opt.id}
              variant={selected.includes(opt.value) ? "default" : "outline"}
              className={cn("cursor-pointer text-xs", selected.includes(opt.value) && "bg-primary text-primary-foreground")}
              onClick={() => onToggle(opt.value)}
            >
              {opt.value}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Categories Manager ──────────────────────────────────────

function CategoriesManager({ workspaceId, categories }: { workspaceId: string; categories: ProfileCategory[] }) {
  const { addCategory, removeCategory } = useManageProfileCategories();
  const [newValue, setNewValue] = useState("");
  const [newDimension, setNewDimension] = useState<CategoryDimension>("segment");

  const dimensionLabels: Record<CategoryDimension, { label: string; icon: React.ElementType }> = {
    segment: { label: "Segmentos", icon: Tag },
    territory: { label: "Territórios", icon: MapPin },
    client_type: { label: "Tipos de Cliente", icon: Briefcase },
  };

  const handleAdd = () => {
    if (!newValue.trim()) return;
    addCategory.mutate({ dimension: newDimension, value: newValue.trim() }, {
      onSuccess: () => setNewValue(""),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" />Categorias Disponíveis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add category */}
        <div className="flex items-center gap-2">
          <Select value={newDimension} onValueChange={(v: CategoryDimension) => setNewDimension(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="segment">Segmento</SelectItem>
              <SelectItem value="territory">Território</SelectItem>
              <SelectItem value="client_type">Tipo de Cliente</SelectItem>
            </SelectContent>
          </Select>
          <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Nome da categoria..." className="flex-1" onKeyDown={e => e.key === "Enter" && handleAdd()} />
          <Button size="sm" onClick={handleAdd} disabled={!newValue.trim() || addCategory.isPending} className="gap-1">
            <Plus className="w-3.5 h-3.5" />Adicionar
          </Button>
        </div>

        {/* List by dimension */}
        {(["segment", "territory", "client_type"] as const).map(dim => {
          const cfg = dimensionLabels[dim];
          const Icon = cfg.icon;
          const items = categories.filter(c => c.dimension === dim);
          return (
            <div key={dim}>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Icon className="w-3 h-3" />{cfg.label} ({items.length})
              </p>
              {items.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/60 ml-4">Nenhuma categoria adicionada</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 ml-4">
                  {items.map(cat => (
                    <Badge key={cat.id} variant="secondary" className="text-xs gap-1 pr-1">
                      {cat.value}
                      <button onClick={() => removeCategory.mutate(cat.id)} className="ml-0.5 hover:text-destructive"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
