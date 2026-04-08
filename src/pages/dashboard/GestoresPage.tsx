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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, UserCheck, Search, Target, Mail,
  BarChart3, ArrowLeft, Clock, Flame, ThermometerSun,
  Snowflake, Building2, Euro, AlertTriangle, UserPlus,
  MessageSquare, Calendar, PhoneCall, Activity,
  CheckCircle2, Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
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

// ─── Paginated fetch helper (bypasses 1000-row limit) ────────────────────

async function fetchAllRows<T>(
  queryBuilder: { select: (...args: any[]) => any },
  selectColumns: string,
  filters: (q: any) => any,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let q = queryBuilder.select(selectColumns);
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
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers();
  const queryClient = useQueryClient();

  // ── Unassigned counts (head: true → no row limit issue) ──
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

  // ── Manager stats (paginated to bypass 1000-row limit) ──
  const { data: managerStats, isLoading: statsLoading } = useQuery({
    queryKey: ["manager-stats", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace || !members) return [];

      const [leads, contacts, companies] = await Promise.all([
        fetchAllRows<any>(
          workspaceClient.from("leads"),
          "id, assigned_to, lead_score, ai_temperature, estimated_value, last_contact_at",
          (q: any) => q.eq("workspace_id", currentWorkspace.id)
        ),
        fetchAllRows<any>(
          workspaceClient.from("contacts"),
          "id, assigned_to, contact_score, ai_temperature, last_contact_at",
          (q: any) => q.eq("workspace_id", currentWorkspace.id)
        ),
        fetchAllRows<any>(
          workspaceClient.from("companies"),
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
        } as ManagerStats;
      });
    },
    enabled: !!currentWorkspace && !!members && members.length > 0,
  });

  // ── Detail entities for selected manager ──
  const { data: selectedEntities } = useQuery({
    queryKey: ["manager-entities", currentWorkspace?.id, selectedManager],
    queryFn: async () => {
      if (!currentWorkspace || !selectedManager) return [];
      const [{ data: leads }, { data: contacts }, { data: companies }] = await Promise.all([
        workspaceClient.from("leads").select("id, name, email, lead_score, ai_temperature, estimated_value, last_contact_at, status").eq("workspace_id", currentWorkspace.id).eq("assigned_to", selectedManager).limit(500),
        workspaceClient.from("contacts").select("id, name, email, contact_score, ai_temperature, last_contact_at").eq("workspace_id", currentWorkspace.id).eq("assigned_to", selectedManager).limit(500),
        workspaceClient.from("companies").select("id, name").eq("workspace_id", currentWorkspace.id).eq("assigned_to", selectedManager).limit(500),
      ]);
      return [
        ...(leads || []).map((l: any) => ({ id: l.id, name: l.name, email: l.email, type: "lead" as const, score: l.lead_score || 0, temperature: l.ai_temperature, estimatedValue: l.estimated_value, lastContactAt: l.last_contact_at, status: l.status })),
        ...(contacts || []).map((c: any) => ({ id: c.id, name: c.name, email: c.email, type: "contact" as const, score: c.contact_score || 0, temperature: c.ai_temperature, estimatedValue: null, lastContactAt: c.last_contact_at, status: null })),
        ...(companies || []).map((c: any) => ({ id: c.id, name: c.name, email: null, type: "company" as const, score: 0, temperature: null, estimatedValue: null, lastContactAt: null, status: null })),
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
          id: log.id,
          type: "activity",
          title: `${log.action} em ${log.table_name}`,
          description: newData?.name as string || null,
          entityName: newData?.name as string || null,
          entityType: log.table_name === "leads" ? "lead" : log.table_name === "contacts" ? "contact" : log.table_name === "companies" ? "company" : null,
          entityId: log.record_id,
          timestamp: log.created_at,
          status: log.action,
        });
      });

      (conversations || []).forEach((conv: any) => {
        events.push({
          id: conv.id,
          type: "message",
          title: `Conversa via ${conv.channel || "chat"}`,
          description: conv.unread_count > 0 ? `${conv.unread_count} não lidas` : "Sem mensagens pendentes",
          entityName: null,
          entityType: conv.lead_id ? "lead" : null,
          entityId: conv.lead_id,
          timestamp: conv.last_message_at || "",
          status: conv.status,
        });
      });

      (meetings || []).forEach((meet: any) => {
        events.push({
          id: meet.id,
          type: "meeting",
          title: meet.title || "Reunião",
          description: meet.status === "cancelled" ? "Cancelada" : meet.status,
          entityName: null,
          entityType: meet.lead_id ? "lead" : meet.contact_id ? "contact" : null,
          entityId: meet.lead_id || meet.contact_id,
          timestamp: meet.start_time,
          status: meet.status,
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

  const selectedManagerData = selectedManager ? managerStats?.find(m => m.userId === selectedManager) : null;
  const isLoading = membersLoading || statsLoading;
  const totalUnassigned = (unassigned?.leads || 0) + (unassigned?.contacts || 0) + (unassigned?.companies || 0);

  // ── DETAIL VIEW ──
  if (selectedManager && selectedManagerData) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={() => setSelectedManager(null)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>

          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                {getInitials(selectedManagerData.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{selectedManagerData.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {selectedManagerData.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selectedManagerData.email}</span>}
                <Badge variant="outline" className="capitalize">{selectedManagerData.role}</Badge>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Leads" value={selectedManagerData.totalLeads} icon={Target} />
            <StatCard label="Contactos" value={selectedManagerData.totalContacts} icon={Users} />
            <StatCard label="Empresas" value={selectedManagerData.totalCompanies} icon={Building2} />
            <StatCard label="Pipeline" value={formatCurrency(selectedManagerData.totalPipelineValue)} icon={Euro} />
          </div>

          {/* Temperature */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Distribuição de Temperatura</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {(["hot", "warm", "cold"] as const).map(t => {
                  const cfg = TEMP_CONFIG[t];
                  const count = t === "hot" ? selectedManagerData.leadsHot : t === "warm" ? selectedManagerData.leadsWarm : selectedManagerData.leadsCold;
                  return (
                    <div key={t} className="flex items-center gap-2">
                      <cfg.icon className={cn("w-4 h-4", cfg.color)} />
                      <span className="text-sm font-medium">{count} {cfg.label}</span>
                    </div>
                  );
                })}
              </div>
              {selectedManagerData.totalLeads > 0 && (
                <div className="flex h-2 rounded-full overflow-hidden mt-3 bg-muted">
                  {selectedManagerData.leadsHot > 0 && <div className="bg-red-500" style={{ width: `${(selectedManagerData.leadsHot / selectedManagerData.totalLeads) * 100}%` }} />}
                  {selectedManagerData.leadsWarm > 0 && <div className="bg-amber-500" style={{ width: `${(selectedManagerData.leadsWarm / selectedManagerData.totalLeads) * 100}%` }} />}
                  {selectedManagerData.leadsCold > 0 && <div className="bg-blue-500" style={{ width: `${(selectedManagerData.leadsCold / selectedManagerData.totalLeads) * 100}%` }} />}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs: Entities + History */}
          <Tabs defaultValue="entities">
            <TabsList>
              <TabsTrigger value="entities">Portfólio ({selectedEntities?.length || 0})</TabsTrigger>
              <TabsTrigger value="history">Histórico de Interações ({interactions?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="entities">
              <Tabs defaultValue="all">
                <TabsList className="mb-3">
                  <TabsTrigger value="all">Tudo</TabsTrigger>
                  <TabsTrigger value="leads">Leads ({selectedEntities?.filter(e => e.type === "lead").length || 0})</TabsTrigger>
                  <TabsTrigger value="contacts">Contactos ({selectedEntities?.filter(e => e.type === "contact").length || 0})</TabsTrigger>
                  <TabsTrigger value="companies">Empresas ({selectedEntities?.filter(e => e.type === "company").length || 0})</TabsTrigger>
                </TabsList>
                {["all", "leads", "contacts", "companies"].map(tab => (
                  <TabsContent key={tab} value={tab}>
                    <Card>
                      <CardContent className="p-0">
                        <ScrollArea className="max-h-[400px]">
                          <div className="divide-y">
                            {(selectedEntities || [])
                              .filter(e => tab === "all" || (tab === "leads" && e.type === "lead") || (tab === "contacts" && e.type === "contact") || (tab === "companies" && e.type === "company"))
                              .map(entity => (
                                <Link
                                  key={entity.id}
                                  to={`/dashboard/${entity.type === "lead" ? "leads" : entity.type === "contact" ? "contacts" : "companies"}/${entity.id}`}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(entity.name)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{entity.name}</p>
                                    {entity.email && <p className="text-xs text-muted-foreground truncate">{entity.email}</p>}
                                  </div>
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {entity.type === "lead" ? "Lead" : entity.type === "contact" ? "Contacto" : "Empresa"}
                                  </Badge>
                                  {entity.temperature && TEMP_CONFIG[entity.temperature] && (
                                    <Badge variant="secondary" className={cn("text-[10px] gap-1", TEMP_CONFIG[entity.temperature].color)}>
                                      {TEMP_CONFIG[entity.temperature].label}
                                    </Badge>
                                  )}
                                  {entity.score > 0 && <span className="text-xs font-medium text-muted-foreground">{entity.score}/100</span>}
                                  {entity.estimatedValue && entity.estimatedValue > 0 && <span className="text-xs font-medium text-emerald-600">{formatCurrency(entity.estimatedValue)}</span>}
                                </Link>
                              ))}
                            {(selectedEntities || []).filter(e => tab === "all" || (tab === "leads" && e.type === "lead") || (tab === "contacts" && e.type === "contact") || (tab === "companies" && e.type === "company")).length === 0 && (
                              <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma entidade nesta categoria.</div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[500px]">
                    {interactionsLoading ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">A carregar histórico...</div>
                    ) : !interactions || interactions.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        Sem interações registadas.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {interactions.map(event => {
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
                        })}
                      </div>
                    )}
                  </ScrollArea>
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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Total Gestores" value={members?.length || 0} icon={Users} />
          <StatCard label="Leads Atribuídas" value={totals.leads} icon={Target} />
          <StatCard label="Contactos Geridos" value={totals.contacts} icon={Users} />
          <StatCard label="Pipeline Total" value={formatCurrency(totals.pipeline)} icon={Euro} />
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
                      <BarChart3 className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium">{manager.avgScore}</span>
                      <span className="text-muted-foreground text-xs">score</span>
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
          }}
        />
      </div>
    </DashboardLayout>
  );
}

// ─── Stat Cards ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
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
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
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

  const { data: unassignedEntities, isLoading } = useQuery({
    queryKey: ["unassigned-entities", workspaceId, entityType],
    queryFn: async () => {
      const { data } = await workspaceClient
        .from(entityType)
        .select("id, name, email")
        .eq("workspace_id", workspaceId)
        .is("assigned_to", null)
        .order("name")
        .limit(200);
      return data || [];
    },
    enabled: open && !!workspaceId,
  });

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
    if (!unassignedEntities) return;
    if (selectedIds.length === unassignedEntities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unassignedEntities.map((e: any) => e.id));
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
              {(unassignedEntities?.length || 0) > 0 && (
                <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                  {selectedIds.length === (unassignedEntities?.length || 0) ? "Desselecionar tudo" : "Selecionar tudo"}
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-[250px] border rounded-md">
              {isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">A carregar...</div>
              ) : !unassignedEntities || unassignedEntities.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  Todas as {entityType} estão atribuídas!
                </div>
              ) : (
                <div className="divide-y">
                  {unassignedEntities.map((entity: any) => (
                    <label key={entity.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent transition-colors">
                      <Checkbox
                        checked={selectedIds.includes(entity.id)}
                        onCheckedChange={checked => {
                          setSelectedIds(prev => checked ? [...prev, entity.id] : prev.filter(id => id !== entity.id));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{entity.name}</p>
                        {entity.email && <p className="text-xs text-muted-foreground truncate">{entity.email}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
            {selectedIds.length > 0 && (
              <p className="text-xs text-primary mt-1.5 font-medium">{selectedIds.length} selecionados</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={isAssigning || !targetManager || selectedIds.length === 0} className="gap-2">
            {isAssigning ? "A atribuir..." : `Atribuir ${selectedIds.length > 0 ? selectedIds.length : ""} entidades`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
