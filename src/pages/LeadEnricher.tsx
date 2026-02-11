import { useState, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useLeads, type Lead } from "@/hooks/useLeads";
import {
  getEnrichmentStatus,
  getEnrichmentStats,
  useEnrichLead,
  useEnrichLeadsBatch,
  type EnrichmentStatus,
} from "@/hooks/useLeadEnrichment";
import {
  Sparkles,
  Search,
  Users,
  Building2,
  Globe,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  Target,
  Briefcase,
  Play,
  Square,
} from "lucide-react";

function StatusBadge({ status }: { status: EnrichmentStatus }) {
  switch (status) {
    case "enriched":
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Enriquecido</Badge>;
    case "partial":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Parcial</Badge>;
    default:
      return <Badge variant="outline">Pendente</Badge>;
  }
}

function LeadCard({ lead, onEnrich, isEnriching }: { lead: Lead; onEnrich: (lead: Lead) => void; isEnriching: boolean }) {
  const status = getEnrichmentStatus(lead);
  const companyName = lead.company_name;
  const website = lead.website;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold truncate">{lead.name}</h3>
              <StatusBadge status={status} />
              {lead.confidence_score != null && lead.confidence_score > 0 && (
                <span className="text-xs text-muted-foreground">
                  {lead.confidence_score}% confiança
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {companyName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{companyName}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{lead.phone}</span>
                </div>
              )}
              {lead.linkedin_url && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Linkedin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{lead.linkedin_url}</span>
                </div>
              )}
              {website && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{website}</span>
                </div>
              )}
              {lead.city && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{lead.city}</span>
                </div>
              )}
              {lead.inferred_profession && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{lead.inferred_profession}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status === "pending" && (
              <Button size="sm" variant="outline" onClick={() => onEnrich(lead)} disabled={isEnriching}>
                {isEnriching ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
                )}
                Enriquecer
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeadEnricher() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnrichmentStatus | "all">("all");
  const { data: leads = [], isLoading } = useLeads();
  const enrichLead = useEnrichLead();
  const { enrichBatch } = useEnrichLeadsBatch();

  // Batch processing state
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const isBatchRunning = batchProgress !== null && batchProgress.done < batchProgress.total;

  // Settings state (visual only)
  const [settings, setSettings] = useState({
    google: true,
    linkedin: true,
    webscraping: true,
  });

  const stats = useMemo(() => getEnrichmentStats(leads), [leads]);

  const pendingLeads = useMemo(
    () => leads.filter((l) => getEnrichmentStatus(l) === "pending"),
    [leads]
  );

  const filteredLeads = useMemo(() => {
    let filtered = leads;

    if (statusFilter !== "all") {
      filtered = filtered.filter((l) => getEnrichmentStatus(l) === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company_name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [leads, searchQuery, statusFilter]);

  const handleEnrichSingle = useCallback(
    (lead: Lead) => {
      enrichLead.mutate(lead);
    },
    [enrichLead]
  );

  const handleEnrichAll = useCallback(async () => {
    if (pendingLeads.length === 0) return;
    setBatchProgress({ done: 0, total: pendingLeads.length, current: pendingLeads[0].name });
    await enrichBatch(pendingLeads, (done, total, current) => {
      setBatchProgress({ done, total, current });
    });
    // Keep showing 100% for a moment then clear
    setTimeout(() => setBatchProgress(null), 2000);
  }, [pendingLeads, enrichBatch]);

  const handleProcessQueue = useCallback(async () => {
    await handleEnrichAll();
  }, [handleEnrichAll]);

  return (
    <ModuleGuard moduleSlug="lead-enricher" moduleName="Lead Enricher Pro">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Lead Enricher Pro
              </h1>
              <p className="text-muted-foreground mt-1">
                Enriqueça automaticamente os dados dos seus leads com IA
              </p>
            </div>
            <Button onClick={handleEnrichAll} disabled={isBatchRunning || pendingLeads.length === 0}>
              {isBatchRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A enriquecer...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Enriquecer Todos ({pendingLeads.length})
                </>
              )}
            </Button>
          </div>

          {/* Batch progress */}
          {batchProgress && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    {batchProgress.done < batchProgress.total
                      ? `A enriquecer: ${batchProgress.current}`
                      : "Concluído!"}
                  </span>
                  <span className="font-medium">
                    {batchProgress.done}/{batchProgress.total}
                  </span>
                </div>
                <Progress
                  value={Math.round((batchProgress.done / batchProgress.total) * 100)}
                />
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Enriquecidos</p>
                    <p className="text-2xl font-bold text-green-600">{stats.enriched}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Parciais</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.partial}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa Sucesso</p>
                    <p className="text-2xl font-bold">{stats.successRate}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="leads" className="space-y-4">
            <TabsList>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="queue">
                Fila de Enriquecimento
                {pendingLeads.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {pendingLeads.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            {/* Leads Tab */}
            <TabsContent value="leads" className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  {(["all", "enriched", "partial", "pending"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={statusFilter === s ? "default" : "outline"}
                      onClick={() => setStatusFilter(s)}
                    >
                      {s === "all" ? "Todos" : s === "enriched" ? "Enriquecidos" : s === "partial" ? "Parciais" : "Pendentes"}
                    </Button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">Nenhum lead encontrado</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Tente outra pesquisa" : "Adicione leads ao seu workspace"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onEnrich={handleEnrichSingle}
                      isEnriching={enrichLead.isPending && enrichLead.variables?.id === lead.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Queue Tab */}
            <TabsContent value="queue" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Fila de Enriquecimento</CardTitle>
                      <CardDescription>
                        {pendingLeads.length} leads pendentes para enriquecimento
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleProcessQueue}
                      disabled={isBatchRunning || pendingLeads.length === 0}
                    >
                      {isBatchRunning ? (
                        <>
                          <Square className="mr-2 h-4 w-4" />
                          A processar...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Processar Fila
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {pendingLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="font-medium mb-2">Nenhum lead na fila</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Todos os leads já possuem dados de enriquecimento.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingLeads.slice(0, 50).map((lead) => (
                        <div
                          key={lead.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{lead.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {lead.email || lead.phone || "Sem contacto"}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEnrichSingle(lead)}
                            disabled={enrichLead.isPending}
                          >
                            <Sparkles className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {pendingLeads.length > 50 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          E mais {pendingLeads.length - 50} leads...
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Enriquecimento</CardTitle>
                  <CardDescription>
                    Personalize como os dados dos leads são enriquecidos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Pesquisa Google</h4>
                        <p className="text-sm text-muted-foreground">
                          Pesquisar informações via Google/Firecrawl
                        </p>
                      </div>
                      <Switch
                        checked={settings.google}
                        onCheckedChange={(v) => setSettings((s) => ({ ...s, google: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">LinkedIn</h4>
                        <p className="text-sm text-muted-foreground">
                          Obter dados profissionais do LinkedIn
                        </p>
                      </div>
                      <Switch
                        checked={settings.linkedin}
                        onCheckedChange={(v) => setSettings((s) => ({ ...s, linkedin: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Website Scraping</h4>
                        <p className="text-sm text-muted-foreground">
                          Extrair dados do website da empresa
                        </p>
                      </div>
                      <Switch
                        checked={settings.webscraping}
                        onCheckedChange={(v) => setSettings((s) => ({ ...s, webscraping: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Enriquecimento Automático</h4>
                        <p className="text-sm text-muted-foreground">
                          Enriquecer novos leads automaticamente
                        </p>
                      </div>
                      <Badge variant="outline">Em breve</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Validação de Email</h4>
                        <p className="text-sm text-muted-foreground">
                          Verificar emails encontrados antes de guardar
                        </p>
                      </div>
                      <Badge variant="outline">Em breve</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
