import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
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
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────

interface ManagerStats {
  userId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  totalLeads: number;
  totalContacts: number;
  totalCompanies: number;
  leadsHot: number;
  leadsWarm: number;
  leadsCold: number;
  totalPipelineValue: number;
  avgScore: number;
  lastActivityAt: string | null;
  // analytics
  convertedLeads: number;
  totalActivities: number;
}

interface EntityRow {
  id: string;
  name: string;
  email: string | null;
  type: "lead" | "contact" | "company";
  score: number;
  temperature: string | null;
  estimatedValue: number | null;
  lastContactAt: string | null;
  status: string | null;
  lifecycleStage: string | null;
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

interface UnassignedCounts {
  leads: number;
  contacts: number;
  companies: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

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

// SLA config: days without contact before alert
const SLA_WARNING_DAYS = 7;
const SLA_CRITICAL_DAYS = 14;

function getSlaStatus(lastContactAt: string | null): { level: "ok" | "warning" | "critical" | "unknown"; label: string; days: number | null } {
  if (!lastContactAt) return { level: "unknown", label: "Sem contacto", days: null };
  const days = differenceInDays(new Date(), new Date(lastContactAt));
  if (days >= SLA_CRITICAL_DAYS) return { level: "critical", label: `${days}d sem contacto`, days };
  if (days >= SLA_WARNING_DAYS) return { level: "warning", label: `${days}d sem contacto`, days };
  return { level: "ok", label: `${days}d`, days };
}

const SLA_COLORS: Record<string, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  unknown: "bg-muted-foreground/30",
};

const SLA_BADGE_CLASSES: Record<string, string> = {
  ok: "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400",
  warning: "border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400",
  critical: "border-red-200 text-red-700 dark:border-red-800 dark:text-red-400",
  unknown: "border-muted text-muted-foreground",
};

// ─── Paginated fetch helper (bypasses 1000-row limit) ────────────────────

async function fetchAllRows<T>(
  queryFactory: () => { select: (...args: any[]) => any },
  selectColumns: string,
  filters: (q: any) => any,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let q = queryFactory().select(selectColumns);
    q = filters(q);
    q = q.range(page * pageSize, (page + 1) * pageSize - 1);
    const { data, error } = await q;
    if (error) throw error;
    if (data) all.push(...(data as T[]));
    hasMore = (data?.length || 0) === pageSize;
    page++;
  }
  return all;
}

// ─── Main Page ───────────────────────────────────────────────────────────

export default function GestoresPage() {
  const [search, setSearch] = useState("");
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [detailEntitySearch, setDetailEntitySearch] = useState("");
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers();
  const queryClient = useQueryClient();

  // ── Unassigned counts ──
  const { data: unassigned } = useQuery({
    queryKey: ["unassigned-counts", currentWorkspace?.id],
    queryFn: async (): Promise<UnassignedCounts> => {
      if (!currentWorkspace) return { leads: 0, contacts: 0, companies: 0 };
      const [{ count: uLeads }, { count: uContacts }, { count: uCompanies }] = await Promise.all([
        workspaceClient.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).is("assigned_to", null),
        workspaceClient.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).is("assigned_to", null),
        workspaceClient.from("companies").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).is("assigned_to", null),
      ]);
      return { leads: uLeads || 0, contacts: uContacts || 0, companies: uCompanies || 0 };
    },
    enabled: !!currentWorkspace,
  });

  // ── Manager stats (paginated) ──
  const { data: managerStats, isLoading: statsLoading } = useQuery({
    queryKey: ["manager-stats", currentWorkspace?.id, members?.map(m => m.user_id).join(",")],
    queryFn: async () => {
      if (!currentWorkspace || !members) return [];

      try {
        const [leads, contacts, companies] = await Promise.all([
          fetchAllRows<any>(
            () => workspaceClient.from("leads"),
            "id, assigned_to, lead_score, ai_temperature, estimated_value, last_contact_at, lifecycle_stage",
            (q: any) => q.eq("workspace_id", currentWorkspace.id)
          ),
          fetchAllRows<any>(
            () => workspaceClient.from("contacts"),
            "id, assigned_to, contact_score, ai_temperature, last_contact_at",
            (q: any) => q.eq("workspace_id", currentWorkspace.id)
          ),
          fetchAllRows<any>(
            () => workspaceClient.from("companies"),
            "id, assigned_to",
            (q: any) => q.eq("workspace_id", currentWorkspace.id)
          ),
        ]);

      return members.map(m => {
        const mLeads = leads.filter((l: any) => l.assigned_to === m.user_id);
        const mContacts = contacts.filter((c: any) => c.assigned_to === m.user_id);
        const mCompanies = companies.filter((c: any) => c.assigned_to === m.user_id);
        const scores = [...mLeads.map((l: any) => l.lead_score || 0), ...mContacts.map((c: any) => c.contact_score || 0)];
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
        const dates = [...mLeads.map((l: any) => l.last_contact_at), ...mContacts.map((c: any) => c.last_contact_at)].filter(Boolean).sort().reverse();
        const convertedLeads = mLeads.filter((l: any) => l.lifecycle_stage === "customer" || l.lifecycle_stage === "converted").length;

        return {
          userId: m.user_id,
          name: m.profile?.full_name || m.profile?.email || "Utilizador",
          email: m.profile?.email || null,
          avatarUrl: m.profile?.avatar_url || null,
          role: m.role,
          totalLeads: mLeads.length,
          totalContacts: mContacts.length,
          totalCompanies: mCompanies.length,
          leadsHot: mLeads.filter((l: any) => l.ai_temperature === "hot").length,
          leadsWarm: mLeads.filter((l: any) => l.ai_temperature === "warm").length,
          leadsCold: mLeads.filter((l: any) => l.ai_temperature === "cold").length,
          totalPipelineValue: mLeads.reduce((s: number, l: any) => s + (l.estimated_value || 0), 0),
          avgScore,
          lastActivityAt: dates[0] || null,
          convertedLeads,
          totalActivities: 0,
        } as ManagerStats;
      });
      } catch (err) {
        console.error("[GestoresPage] Error fetching manager stats:", err);
        // Fallback: return members with zero stats
        return members.map(m => ({
          userId: m.user_id,
          name: m.profile?.full_name || m.profile?.email || "Utilizador",
          email: m.profile?.email || null,
          avatarUrl: m.profile?.avatar_url || null,
          role: m.role,
          totalLeads: 0, totalContacts: 0, totalCompanies: 0,
          leadsHot: 0, leadsWarm: 0, leadsCold: 0,
          totalPipelineValue: 0, avgScore: 0, lastActivityAt: null,
          convertedLeads: 0, totalActivities: 0,
        } as ManagerStats));
      }
    },
    enabled: !!currentWorkspace && !!members && members.length > 0,
    refetchOnWindowFocus: false,
  });

  // ── Detail entities for selected manager ──
  const { data: selectedEntities } = useQuery({
    queryKey: ["manager-entities", currentWorkspace?.id, selectedManager],
    queryFn: async (): Promise<EntityRow[]> => {
      if (!currentWorkspace || !selectedManager) return [];
      const [{ data: leads }, { data: contacts }, { data: companies }] = await Promise.all([
        workspaceClient.from("leads").select("id, name, email, lead_score, ai_temperature, estimated_value, last_contact_at, status, lifecycle_stage").eq("workspace_id", currentWorkspace.id).eq("assigned_to", selectedManager).order("last_contact_at", { ascending: false, nullsFirst: false }).limit(500),
        workspaceClient.from("contacts").select("id, name, email, contact_score, ai_temperature, last_contact_at").eq("workspace_id", currentWorkspace.id).eq("assigned_to", selectedManager).order("last_contact_at", { ascending: false, nullsFirst: false }).limit(500),
        workspaceClient.from("companies").select("id, name").eq("workspace_id", currentWorkspace.id).eq("assigned_to", selectedManager).limit(500),
      ]);
      return [
        ...(leads || []).map((l: any) => ({ id: l.id, name: l.name, email: l.email, type: "lead" as const, score: l.lead_score || 0, temperature: l.ai_temperature, estimatedValue: l.estimated_value, lastContactAt: l.last_contact_at, status: l.status, lifecycleStage: l.lifecycle_stage })),
        ...(contacts || []).map((c: any) => ({ id: c.id, name: c.name, email: c.email, type: "contact" as const, score: c.contact_score || 0, temperature: c.ai_temperature, estimatedValue: null, lastContactAt: c.last_contact_at, status: null, lifecycleStage: null })),
        ...(companies || []).map((c: any) => ({ id: c.id, name: c.name, email: null, type: "company" as const, score: 0, temperature: null, estimatedValue: null, lastContactAt: null, status: null, lifecycleStage: null })),
      ];
    },
    enabled: !!currentWorkspace && !!selectedManager,
  });

  // ── Interaction history for selected manager ──
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
        events.push({
          id: log.id, type: "activity",
          title: `${log.action} em ${log.table_name}`,
          description: newData?.name as string || null,
          entityName: newData?.name as string || null,
          entityType: log.table_name === "leads" ? "lead" : log.table_name === "contacts" ? "contact" : log.table_name === "companies" ? "company" : null,
          entityId: log.record_id, timestamp: log.created_at, status: log.action,
        });
      });

      (conversations || []).forEach((conv: any) => {
        events.push({
          id: conv.id, type: "message",
          title: `Conversa via ${conv.channel || "chat"}`,
          description: conv.unread_count > 0 ? `${conv.unread_count} não lidas` : "Sem mensagens pendentes",
          entityName: null, entityType: conv.lead_id ? "lead" : null,
          entityId: conv.lead_id, timestamp: conv.last_message_at || "", status: conv.status,
        });
      });

      (meetings || []).forEach((meet: any) => {
        events.push({
          id: meet.id, type: "meeting",
          title: meet.title || "Reunião",
          description: meet.status === "cancelled" ? "Cancelada" : meet.status,
          entityName: null, entityType: meet.lead_id ? "lead" : meet.contact_id ? "contact" : null,
          entityId: meet.lead_id || meet.contact_id, timestamp: meet.start_time, status: meet.status,
        });
      });

      return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    enabled: !!currentWorkspace && !!selectedManager,
  });

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

  // ── Analytics for detail view ──
  const detailAnalytics = useMemo(() => {
    if (!selectedEntities) return null;
    const leadEntities = selectedEntities.filter(e => e.type === "lead");
    const allWithContact = selectedEntities.filter(e => e.lastContactAt);
    const converted = leadEntities.filter(e => e.lifecycleStage === "customer" || e.lifecycleStage === "converted").length;
    const conversionRate = leadEntities.length > 0 ? Math.round((converted / leadEntities.length) * 100) : 0;

    // SLA compliance
    const slaStatuses = allWithContact.map(e => getSlaStatus(e.lastContactAt));
    const withinSla = slaStatuses.filter(s => s.level === "ok").length;
    const warning = slaStatuses.filter(s => s.level === "warning").length;
    const critical = slaStatuses.filter(s => s.level === "critical").length;
    const noContact = selectedEntities.filter(e => !e.lastContactAt).length;
    const slaCompliance = allWithContact.length > 0 ? Math.round((withinSla / allWithContact.length) * 100) : 0;

    // Avg days since last contact
    const daysSinceContact = allWithContact.map(e => differenceInDays(new Date(), new Date(e.lastContactAt!)));
    const avgDaysSinceContact = daysSinceContact.length > 0 ? Math.round(daysSinceContact.reduce((a, b) => a + b, 0) / daysSinceContact.length) : 0;

    return {
      conversionRate, converted, totalLeads: leadEntities.length,
      slaCompliance, withinSla, warning, critical, noContact,
      avgDaysSinceContact, totalPipeline: leadEntities.reduce((s, e) => s + (e.estimatedValue || 0), 0),
    };
  }, [selectedEntities]);

  const selectedManagerData = selectedManager ? managerStats?.find(m => m.userId === selectedManager) : null;
  const isLoading = membersLoading || statsLoading;
  const totalUnassigned = (unassigned?.leads || 0) + (unassigned?.contacts || 0) + (unassigned?.companies || 0);

  const filteredDetailEntities = useMemo(() => {
    let list = selectedEntities || [];
    if (entityFilter !== "all") {
      list = list.filter(e => e.type === (entityFilter === "leads" ? "lead" : entityFilter === "contacts" ? "contact" : "company"));
    }
    if (detailEntitySearch.trim()) {
      const q = detailEntitySearch.toLowerCase();
      list = list.filter(e => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q));
    }
    return list;
  }, [selectedEntities, entityFilter, detailEntitySearch]);

  // ── DETAIL VIEW ──
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
                </div>
              </div>
            </div>
          </div>

          {/* Analytics KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Leads" value={selectedManagerData.totalLeads} icon={Target} />
            <StatCard label="Contactos" value={selectedManagerData.totalContacts} icon={Users} />
            <StatCard label="Empresas" value={selectedManagerData.totalCompanies} icon={Building2} />
            <StatCard label="Pipeline" value={formatCurrency(selectedManagerData.totalPipelineValue)} icon={Euro} />
            <StatCard
              label="Conversão"
              value={`${detailAnalytics?.conversionRate || 0}%`}
              icon={TrendingUp}
              subtitle={`${detailAnalytics?.converted || 0}/${detailAnalytics?.totalLeads || 0}`}
            />
            <StatCard
              label="SLA Compliance"
              value={`${detailAnalytics?.slaCompliance || 0}%`}
              icon={ShieldCheck}
              subtitle={`${detailAnalytics?.withinSla || 0} dentro`}
              variant={detailAnalytics && detailAnalytics.slaCompliance < 50 ? "danger" : detailAnalytics && detailAnalytics.slaCompliance < 80 ? "warning" : "default"}
            />
          </div>

          {/* SLA Overview + Temperature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SLA breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Estado dos SLAs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2">
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{detailAnalytics?.withinSla || 0}</p>
                    <p className="text-[10px] text-muted-foreground">OK</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2">
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{detailAnalytics?.warning || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Atenção</p>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2">
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">{detailAnalytics?.critical || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Crítico</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold">{detailAnalytics?.noContact || 0}</p>
                    <p className="text-[10px] text-muted-foreground">S/ contacto</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Tempo médio desde último contacto: <span className="font-medium">{detailAnalytics?.avgDaysSinceContact || 0} dias</span>
                </div>
              </CardContent>
            </Card>

            {/* Temperature */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  Distribuição de Temperatura
                </CardTitle>
              </CardHeader>
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

          {/* Activity Summary */}
          {interactions && interactions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Actividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(["activity", "message", "meeting", "call"] as const).map(type => {
                    const count = interactions.filter(i => i.type === type).length;
                    const cfg = INTERACTION_ICONS[type];
                    const Icon = cfg.icon;
                    const labels: Record<string, string> = { activity: "Atividades", message: "Mensagens", meeting: "Reuniões", call: "Chamadas" };
                    return (
                      <div key={type} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center bg-background", cfg.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-lg font-bold">{count}</p>
                          <p className="text-[10px] text-muted-foreground">{labels[type]}</p>
                        </div>
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
              <TabsTrigger value="history">Histórico de Interações ({interactions?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="entities" className="space-y-3 mt-3">
              {/* Filters */}
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
                  ].map(tab => (
                    <Button
                      key={tab.value}
                      variant={entityFilter === tab.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEntityFilter(tab.value)}
                      className="text-xs"
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Entity table */}
              <Card>
                <CardContent className="p-0">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_80px_90px_100px_80px_90px] gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                    <span>Entidade</span>
                    <span className="text-center">Tipo</span>
                    <span className="text-center">Temperatura</span>
                    <span className="text-center">Último contacto</span>
                    <span className="text-center">SLA</span>
                    <span className="text-right">Valor</span>
                  </div>
                  <div className="divide-y max-h-[calc(100vh-520px)] overflow-y-auto">
                    {filteredDetailEntities.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma entidade encontrada.</div>
                    ) : (
                      filteredDetailEntities.map(entity => {
                        const sla = getSlaStatus(entity.lastContactAt);
                        return (
                          <Link
                            key={entity.id}
                            to={`/dashboard/${entity.type === "lead" ? "leads" : entity.type === "contact" ? "contacts" : "companies"}/${entity.id}`}
                            className="grid grid-cols-[1fr_80px_90px_100px_80px_90px] gap-2 items-center px-4 py-2.5 hover:bg-accent/50 transition-colors"
                          >
                            {/* Name */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(entity.name)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{entity.name}</p>
                                {entity.email && <p className="text-[11px] text-muted-foreground truncate">{entity.email}</p>}
                              </div>
                            </div>

                            {/* Type */}
                            <div className="text-center">
                              <Badge variant="outline" className="text-[10px]">
                                {entity.type === "lead" ? "Lead" : entity.type === "contact" ? "Contacto" : "Empresa"}
                              </Badge>
                            </div>

                            {/* Temperature */}
                            <div className="text-center">
                              {entity.temperature && TEMP_CONFIG[entity.temperature] ? (
                                <div className="flex items-center justify-center gap-1">
                                  {(() => { const Ic = TEMP_CONFIG[entity.temperature!].icon; return <Ic className={cn("w-3.5 h-3.5", TEMP_CONFIG[entity.temperature!].color)} />; })()}
                                  <span className={cn("text-xs font-medium", TEMP_CONFIG[entity.temperature].color)}>{TEMP_CONFIG[entity.temperature].label}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>

                            {/* Last contact */}
                            <div className="text-center">
                              {entity.lastContactAt ? (
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(entity.lastContactAt), { addSuffix: true, locale: pt })}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>

                            {/* SLA */}
                            <div className="flex justify-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className={cn("w-2.5 h-2.5 rounded-full", SLA_COLORS[sla.level])} />
                                  </TooltipTrigger>
                                  <TooltipContent><p>{sla.label}</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>

                            {/* Value */}
                            <div className="text-right">
                              {entity.estimatedValue && entity.estimatedValue > 0 ? (
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(entity.estimatedValue)}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-3">
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y max-h-[calc(100vh-420px)] overflow-y-auto">
                    {interactionsLoading ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">A carregar histórico...</div>
                    ) : !interactions || interactions.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        Sem interações registadas.
                      </div>
                    ) : (
                      interactions.map(event => {
                        const cfg = INTERACTION_ICONS[event.type] || INTERACTION_ICONS.activity;
                        const Icon = cfg.icon;
                        return (
                          <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-muted/60", cfg.color)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{event.title}</p>
                              {event.description && <p className="text-xs text-muted-foreground truncate">{event.description}</p>}
                              {event.entityId && event.entityType && (
                                <Link
                                  to={`/dashboard/${event.entityType === "lead" ? "leads" : event.entityType === "contact" ? "contacts" : "companies"}/${event.entityId}`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Ver entidade →
                                </Link>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[11px] text-muted-foreground">
                                {event.timestamp ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: pt }) : "—"}
                              </p>
                              {event.status && (
                                <Badge variant="outline" className="text-[9px] mt-0.5">{event.status}</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    );
  }

  // ── LIST VIEW ──
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary" />
              Gestores
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Visão completa do portfólio de cada gestor comercial</p>
          </div>
          <Button onClick={() => setAssignDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Atribuir Entidades
          </Button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Gestores" value={members?.length || 0} icon={Users} loading={membersLoading} />
          <StatCard label="Leads Atribuídas" value={totals.leads} icon={Target} loading={statsLoading} />
          <StatCard label="Contactos Geridos" value={totals.contacts} icon={Users} loading={statsLoading} />
          <StatCard label="Pipeline Total" value={formatCurrency(totals.pipeline)} icon={Euro} loading={statsLoading} />
          <StatCardAlert
            label="Não Atribuídos"
            value={totalUnassigned}
            detail={`${unassigned?.leads || 0} leads · ${unassigned?.contacts || 0} contactos · ${unassigned?.companies || 0} empresas`}
            onClick={() => setAssignDialogOpen(true)}
          />
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar gestor..." className="pl-9" />
        </div>

        {/* Manager Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-48" /></Card>)}
          </div>
        ) : filteredStats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum gestor encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStats.map(manager => (
              <Card key={manager.userId} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => setSelectedManager(manager.userId)}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(manager.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{manager.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{manager.email}</p>
                    </div>
                    <Badge variant="outline" className="capitalize text-[10px]">{manager.role}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-bold">{manager.totalLeads}</p>
                      <p className="text-[10px] text-muted-foreground">Leads</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-bold">{manager.totalContacts}</p>
                      <p className="text-[10px] text-muted-foreground">Contactos</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-bold">{manager.totalCompanies}</p>
                      <p className="text-[10px] text-muted-foreground">Empresas</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <Euro className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-medium">{formatCurrency(manager.totalPipelineValue)}</span>
                      <span className="text-muted-foreground text-xs">pipeline</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium">{manager.totalLeads > 0 ? Math.round((manager.convertedLeads / manager.totalLeads) * 100) : 0}%</span>
                      <span className="text-muted-foreground text-xs">conversão</span>
                    </div>
                  </div>

                  {manager.totalLeads > 0 && (
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                      {manager.leadsHot > 0 && <div className="bg-red-500" style={{ width: `${(manager.leadsHot / manager.totalLeads) * 100}%` }} />}
                      {manager.leadsWarm > 0 && <div className="bg-amber-500" style={{ width: `${(manager.leadsWarm / manager.totalLeads) * 100}%` }} />}
                      {manager.leadsCold > 0 && <div className="bg-blue-500" style={{ width: `${(manager.leadsCold / manager.totalLeads) * 100}%` }} />}
                    </div>
                  )}

                  {manager.lastActivityAt && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Última atividade: {format(new Date(manager.lastActivityAt), "dd/MM/yyyy")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Assign Dialog */}
        <BulkAssignDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          members={members || []}
          workspaceId={currentWorkspace?.id || ""}
          workspaceClient={workspaceClient}
          onAssigned={() => {
            queryClient.invalidateQueries({ queryKey: ["manager-stats"] });
            queryClient.invalidateQueries({ queryKey: ["unassigned-counts"] });
            queryClient.invalidateQueries({ queryKey: ["manager-entities"] });
            queryClient.invalidateQueries({ queryKey: ["unassigned-entities"] });
          }}
        />
      </div>
    </DashboardLayout>
  );
}

// ─── Stat Cards ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, loading, subtitle, variant = "default" }: {
  label: string; value: string | number; icon: React.ElementType; loading?: boolean; subtitle?: string;
  variant?: "default" | "warning" | "danger";
}) {
  return (
    <Card className={cn(
      variant === "danger" && "border-red-200 dark:border-red-800",
      variant === "warning" && "border-amber-200 dark:border-amber-800",
    )}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          variant === "danger" ? "bg-red-100 dark:bg-red-900/40" :
          variant === "warning" ? "bg-amber-100 dark:bg-amber-900/40" :
          "bg-primary/10"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            variant === "danger" ? "text-red-600" :
            variant === "warning" ? "text-amber-600" :
            "text-primary"
          )} />
        </div>
        <div>
          {loading ? (
            <div className="h-7 w-12 rounded bg-muted animate-pulse mb-1" />
          ) : (
            <p className={cn(
              "text-xl font-bold",
              variant === "danger" && "text-red-700 dark:text-red-400",
              variant === "warning" && "text-amber-700 dark:text-amber-400",
            )}>{value}</p>
          )}
          <p className="text-[11px] text-muted-foreground">{label}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardAlert({ label, value, detail, onClick }: { label: string; value: number; detail: string; onClick: () => void }) {
  return (
    <Card className={cn("cursor-pointer hover:border-amber-500/50 transition-all", value > 0 && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20")} onClick={onClick}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Bulk Assign Dialog ──────────────────────────────────────────────────

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: Array<{ user_id: string; profile?: { full_name?: string | null; email?: string | null } | null; role: string }>;
  workspaceId: string;
  workspaceClient: ReturnType<typeof useWorkspaceInstance>["workspaceClient"];
  onAssigned: () => void;
}

function BulkAssignDialog({ open, onOpenChange, members, workspaceId, workspaceClient, onAssigned }: BulkAssignDialogProps) {
  const [entityType, setEntityType] = useState<"leads" | "contacts" | "companies">("leads");
  const [targetManager, setTargetManager] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");

  const { data: unassignedEntities, isLoading } = useQuery({
    queryKey: ["unassigned-entities", workspaceId, entityType],
    queryFn: async () => {
      const { data } = await workspaceClient
        .from(entityType)
        .select("id, name, email")
        .eq("workspace_id", workspaceId)
        .is("assigned_to", null)
        .order("name")
        .limit(500);
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
    if (!targetManager || selectedIds.length === 0) {
      toast.error("Selecione um gestor e pelo menos uma entidade.");
      return;
    }
    setIsAssigning(true);
    try {
      const { error } = await (workspaceClient.from(entityType) as any)
        .update({ assigned_to: targetManager })
        .in("id", selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} ${entityType === "leads" ? "leads" : entityType === "contacts" ? "contactos" : "empresas"} atribuídos com sucesso!`);
      setSelectedIds([]);
      setTargetManager("");
      onAssigned();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atribuir entidades. Tente novamente.");
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleAll = () => {
    if (!filteredEntities.length) return;
    if (selectedIds.length === filteredEntities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEntities.map((e: any) => e.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Atribuir Entidades a Gestor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tipo de entidade</label>
            <Select value={entityType} onValueChange={(v: "leads" | "contacts" | "companies") => { setEntityType(v); setSelectedIds([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="contacts">Contactos</SelectItem>
                <SelectItem value="companies">Empresas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Atribuir a</label>
            <Select value={targetManager} onValueChange={setTargetManager}>
              <SelectTrigger><SelectValue placeholder="Escolher gestor..." /></SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.profile?.email || "Utilizador"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Entidades sem gestor ({unassignedEntities?.length || 0})
              </label>
              {(filteredEntities?.length || 0) > 0 && (
                <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                  {selectedIds.length === (filteredEntities?.length || 0) ? "Desselecionar tudo" : "Selecionar tudo"}
                </Button>
              )}
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={entitySearch} onChange={e => setEntitySearch(e.target.value)} placeholder="Filtrar por nome ou email..." className="pl-8 h-8 text-sm" />
            </div>
            <ScrollArea className="max-h-[250px] border rounded-md">
              {isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">A carregar...</div>
              ) : filteredEntities.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {entitySearch ? "Nenhum resultado para a pesquisa." : (
                    <>
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />
                      Todas as {entityType} estão atribuídas!
                    </>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEntities.map((entity: any) => (
                    <label key={entity.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent transition-colors">
                      <Checkbox
                        checked={selectedIds.includes(entity.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedIds(prev => [...prev, entity.id]);
                          else setSelectedIds(prev => prev.filter(id => id !== entity.id));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{entity.name || "Sem nome"}</p>
                        {entity.email && <p className="text-[11px] text-muted-foreground truncate">{entity.email}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={isAssigning || selectedIds.length === 0 || !targetManager}>
            {isAssigning ? "A atribuir..." : `Atribuir ${selectedIds.length} entidade${selectedIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
