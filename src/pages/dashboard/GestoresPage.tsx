import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspaceMembers, WorkspaceMember } from "@/hooks/useWorkspaceMembers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Users, UserCheck, Search, TrendingUp, Target, Mail,
  Phone, BarChart3, ArrowLeft, Clock, Flame, ThermometerSun,
  Snowflake, Building2, Euro, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { format } from "date-fns";

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

interface AssignedEntity {
  id: string;
  name: string;
  email: string | null;
  type: 'lead' | 'contact' | 'company';
  score: number;
  temperature: string | null;
  estimatedValue: number | null;
  lastContactAt: string | null;
  status: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}k`;
  return `€${value.toFixed(0)}`;
}

const TEMP_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  hot: { label: 'Quente', icon: Flame, color: 'text-red-500' },
  warm: { label: 'Morno', icon: ThermometerSun, color: 'text-amber-500' },
  cold: { label: 'Frio', icon: Snowflake, color: 'text-blue-500' },
};

// ─── Main Page ───────────────────────────────────────────────────────────

export default function GestoresPage() {
  const [search, setSearch] = useState("");
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers();

  // Fetch all leads, contacts, companies assigned_to data
  const { data: managerStats, isLoading: statsLoading } = useQuery({
    queryKey: ['manager-stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace || !members) return [];

      const [
        { data: leads },
        { data: contacts },
        { data: companies },
      ] = await Promise.all([
        workspaceClient.from('leads').select('id, name, email, assigned_to, lead_score, ai_temperature, estimated_value, last_contact_at, status').eq('workspace_id', currentWorkspace.id),
        workspaceClient.from('contacts').select('id, name, email, assigned_to, contact_score, ai_temperature, last_contact_at').eq('workspace_id', currentWorkspace.id),
        workspaceClient.from('companies').select('id, name, assigned_to').eq('workspace_id', currentWorkspace.id),
      ]);

      const stats: ManagerStats[] = members.map(m => {
        const memberLeads = (leads || []).filter(l => l.assigned_to === m.user_id);
        const memberContacts = (contacts || []).filter(c => c.assigned_to === m.user_id);
        const memberCompanies = (companies || []).filter(c => c.assigned_to === m.user_id);

        const allScores = [
          ...memberLeads.map(l => l.lead_score || 0),
          ...memberContacts.map(c => c.contact_score || 0),
        ];
        const avgScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;

        const allDates = [
          ...memberLeads.map(l => l.last_contact_at).filter(Boolean),
          ...memberContacts.map(c => c.last_contact_at).filter(Boolean),
        ];
        const lastActivity = allDates.sort().reverse()[0] || null;

        return {
          userId: m.user_id,
          name: m.profile?.full_name || m.profile?.email || 'Utilizador',
          email: m.profile?.email || null,
          avatarUrl: m.profile?.avatar_url || null,
          role: m.role,
          totalLeads: memberLeads.length,
          totalContacts: memberContacts.length,
          totalCompanies: memberCompanies.length,
          leadsHot: memberLeads.filter(l => l.ai_temperature === 'hot').length,
          leadsWarm: memberLeads.filter(l => l.ai_temperature === 'warm').length,
          leadsCold: memberLeads.filter(l => l.ai_temperature === 'cold').length,
          totalPipelineValue: memberLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0),
          avgScore: Math.round(avgScore),
          lastActivityAt: lastActivity,
        };
      });

      return stats;
    },
    enabled: !!currentWorkspace && !!members && members.length > 0,
  });

  // Fetch entities for selected manager
  const { data: selectedEntities } = useQuery({
    queryKey: ['manager-entities', currentWorkspace?.id, selectedManager],
    queryFn: async () => {
      if (!currentWorkspace || !selectedManager) return [];

      const [
        { data: leads },
        { data: contacts },
        { data: companies },
      ] = await Promise.all([
        workspaceClient.from('leads').select('id, name, email, lead_score, ai_temperature, estimated_value, last_contact_at, status').eq('workspace_id', currentWorkspace.id).eq('assigned_to', selectedManager).order('lead_score', { ascending: false }),
        workspaceClient.from('contacts').select('id, name, email, contact_score, ai_temperature, last_contact_at').eq('workspace_id', currentWorkspace.id).eq('assigned_to', selectedManager).order('contact_score', { ascending: false }),
        workspaceClient.from('companies').select('id, name, assigned_to').eq('workspace_id', currentWorkspace.id).eq('assigned_to', selectedManager),
      ]);

      const entities: AssignedEntity[] = [
        ...(leads || []).map(l => ({
          id: l.id, name: l.name, email: l.email, type: 'lead' as const,
          score: l.lead_score || 0, temperature: l.ai_temperature, estimatedValue: l.estimated_value,
          lastContactAt: l.last_contact_at, status: l.status,
        })),
        ...(contacts || []).map(c => ({
          id: c.id, name: c.name, email: c.email, type: 'contact' as const,
          score: c.contact_score || 0, temperature: c.ai_temperature, estimatedValue: null,
          lastContactAt: c.last_contact_at, status: null,
        })),
        ...(companies || []).map(c => ({
          id: c.id, name: c.name, email: null, type: 'company' as const,
          score: 0, temperature: null, estimatedValue: null, lastContactAt: null, status: null,
        })),
      ];

      return entities;
    },
    enabled: !!currentWorkspace && !!selectedManager,
  });

  const filteredStats = useMemo(() => {
    if (!managerStats) return [];
    if (!search.trim()) return managerStats;
    const q = search.toLowerCase();
    return managerStats.filter(m => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q));
  }, [managerStats, search]);

  // Totals
  const totals = useMemo(() => {
    if (!managerStats) return { leads: 0, contacts: 0, companies: 0, pipeline: 0, unassignedLeads: 0 };
    return {
      leads: managerStats.reduce((s, m) => s + m.totalLeads, 0),
      contacts: managerStats.reduce((s, m) => s + m.totalContacts, 0),
      companies: managerStats.reduce((s, m) => s + m.totalCompanies, 0),
      pipeline: managerStats.reduce((s, m) => s + m.totalPipelineValue, 0),
      unassignedLeads: 0, // placeholder
    };
  }, [managerStats]);

  const selectedManagerData = selectedManager ? managerStats?.find(m => m.userId === selectedManager) : null;

  const isLoading = membersLoading || statsLoading;

  // ── Detail view for selected manager ──
  if (selectedManager && selectedManagerData) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedManager(null)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
              {getInitials(selectedManagerData.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{selectedManagerData.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {selectedManagerData.email && (
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selectedManagerData.email}</span>
              )}
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

        {/* Temperature breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Distribuição de Temperatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium">{selectedManagerData.leadsHot} Quentes</span>
              </div>
              <div className="flex items-center gap-2">
                <ThermometerSun className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">{selectedManagerData.leadsWarm} Mornos</span>
              </div>
              <div className="flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">{selectedManagerData.leadsCold} Frios</span>
              </div>
            </div>
            {selectedManagerData.totalLeads > 0 && (
              <div className="flex h-2 rounded-full overflow-hidden mt-3 bg-muted">
                {selectedManagerData.leadsHot > 0 && (
                  <div className="bg-red-500" style={{ width: `${(selectedManagerData.leadsHot / selectedManagerData.totalLeads) * 100}%` }} />
                )}
                {selectedManagerData.leadsWarm > 0 && (
                  <div className="bg-amber-500" style={{ width: `${(selectedManagerData.leadsWarm / selectedManagerData.totalLeads) * 100}%` }} />
                )}
                {selectedManagerData.leadsCold > 0 && (
                  <div className="bg-blue-500" style={{ width: `${(selectedManagerData.leadsCold / selectedManagerData.totalLeads) * 100}%` }} />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entity List */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Tudo ({selectedEntities?.length || 0})</TabsTrigger>
            <TabsTrigger value="leads">Leads ({selectedEntities?.filter(e => e.type === 'lead').length || 0})</TabsTrigger>
            <TabsTrigger value="contacts">Contactos ({selectedEntities?.filter(e => e.type === 'contact').length || 0})</TabsTrigger>
            <TabsTrigger value="companies">Empresas ({selectedEntities?.filter(e => e.type === 'company').length || 0})</TabsTrigger>
          </TabsList>
          {['all', 'leads', 'contacts', 'companies'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[500px]">
                    <div className="divide-y">
                      {(selectedEntities || [])
                        .filter(e => tab === 'all' || (tab === 'leads' && e.type === 'lead') || (tab === 'contacts' && e.type === 'contact') || (tab === 'companies' && e.type === 'company'))
                        .map(entity => (
                          <Link
                            key={entity.id}
                            to={`/dashboard/${entity.type === 'lead' ? 'leads' : entity.type === 'contact' ? 'contacts' : 'companies'}/${entity.id}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(entity.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{entity.name}</p>
                              {entity.email && <p className="text-xs text-muted-foreground truncate">{entity.email}</p>}
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {entity.type === 'lead' ? 'Lead' : entity.type === 'contact' ? 'Contacto' : 'Empresa'}
                            </Badge>
                            {entity.temperature && TEMP_CONFIG[entity.temperature] && (
                              <Badge variant="secondary" className={cn("text-[10px] gap-1", TEMP_CONFIG[entity.temperature].color)}>
                                {TEMP_CONFIG[entity.temperature].label}
                              </Badge>
                            )}
                            {entity.score > 0 && (
                              <span className="text-xs font-medium text-muted-foreground">{entity.score}/100</span>
                            )}
                            {entity.estimatedValue && entity.estimatedValue > 0 && (
                              <span className="text-xs font-medium text-emerald-600">{formatCurrency(entity.estimatedValue)}</span>
                            )}
                          </Link>
                        ))}
                      {(selectedEntities || []).filter(e => tab === 'all' || (tab === 'leads' && e.type === 'lead') || (tab === 'contacts' && e.type === 'contact') || (tab === 'companies' && e.type === 'company')).length === 0 && (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          Nenhuma entidade atribuída nesta categoria.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            Gestores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão completa do portfólio de cada gestor comercial
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Gestores" value={members?.length || 0} icon={Users} />
        <StatCard label="Leads Atribuídas" value={totals.leads} icon={Target} />
        <StatCard label="Contactos Geridos" value={totals.contacts} icon={Users} />
        <StatCard label="Pipeline Total" value={formatCurrency(totals.pipeline)} icon={Euro} />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar gestor..."
          className="pl-9"
        />
      </div>

      {/* Manager Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
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
            <Card
              key={manager.userId}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
              onClick={() => setSelectedManager(manager.userId)}
            >
              <CardContent className="p-5 space-y-4">
                {/* Manager header */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(manager.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{manager.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{manager.email}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-[10px]">{manager.role}</Badge>
                </div>

                {/* Stats grid */}
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

                {/* Pipeline + Score */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <Euro className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-medium">{formatCurrency(manager.totalPipelineValue)}</span>
                    <span className="text-muted-foreground text-xs">pipeline</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium">{manager.avgScore}</span>
                    <span className="text-muted-foreground text-xs">score médio</span>
                  </div>
                </div>

                {/* Temperature bar */}
                {manager.totalLeads > 0 && (
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                    {manager.leadsHot > 0 && <div className="bg-red-500" style={{ width: `${(manager.leadsHot / manager.totalLeads) * 100}%` }} />}
                    {manager.leadsWarm > 0 && <div className="bg-amber-500" style={{ width: `${(manager.leadsWarm / manager.totalLeads) * 100}%` }} />}
                    {manager.leadsCold > 0 && <div className="bg-blue-500" style={{ width: `${(manager.leadsCold / manager.totalLeads) * 100}%` }} />}
                  </div>
                )}

                {/* Last activity */}
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
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────

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
