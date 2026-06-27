import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useEnrichmentProcessor } from "@/contexts/EnrichmentProcessorContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { IXCard } from "@/components/entity/ix/IXCard";
import { IXEntityTabs } from "@/components/entity/ix/IXEntityTabs";
import { useLeads, type Lead } from "@/hooks/useLeads";
import {
  getEnrichmentStatus,
  getEnrichmentStats,
  useEnrichLead,
  type EnrichmentStatus,
} from "@/hooks/useLeadEnrichment";
import { useLeadEnricherSettings } from "@/hooks/useLeadEnricherSettings";
import {
  Sparkles, Search, Users, Building2, Globe, Linkedin, Mail, Phone, MapPin,
  TrendingUp, Loader2, CheckCircle2, AlertCircle, Zap, Target, Briefcase,
  Play, Square, ShieldCheck, ShieldX,
} from "lucide-react";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: EnrichmentStatus }) {
  if (status === "enriched")
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Enriquecido</Badge>;
  if (status === "partial")
    return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Parcial</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>;
}

function EmailVerifiedBadge({ verified }: { verified: boolean | null | undefined }) {
  if (verified === true) return <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />;
  if (verified === false) return <ShieldX className="h-3.5 w-3.5 text-destructive" />;
  return null;
}

function LeadRow({ lead, onEnrich, isEnriching }: { lead: Lead; onEnrich: (lead: Lead) => void; isEnriching: boolean }) {
  const navigate = useNavigate();
  const status = getEnrichmentStatus(lead);
  const emailVerified = (lead as any).email_verified;

  return (
    <div className="group rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <button
              className="font-semibold text-foreground truncate hover:text-primary hover:underline"
              onClick={() => navigate(`/dashboard/leads/${lead.id}`)}
            >
              {lead.name}
            </button>
            <StatusBadge status={status} />
            {lead.confidence_score != null && lead.confidence_score > 0 && (
              <span className="text-xs text-muted-foreground">{lead.confidence_score}% confiança</span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {lead.company_name && <span className="flex items-center gap-2 truncate"><Building2 className="h-3.5 w-3.5 shrink-0" />{lead.company_name}</span>}
            {lead.email && <span className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 shrink-0" />{lead.email}<EmailVerifiedBadge verified={emailVerified} /></span>}
            {lead.phone && <span className="flex items-center gap-2 truncate"><Phone className="h-3.5 w-3.5 shrink-0" />{lead.phone}</span>}
            {lead.linkedin_url && <span className="flex items-center gap-2 truncate"><Linkedin className="h-3.5 w-3.5 shrink-0" />{lead.linkedin_url}</span>}
            {lead.website && <span className="flex items-center gap-2 truncate"><Globe className="h-3.5 w-3.5 shrink-0" />{lead.website}</span>}
            {lead.city && <span className="flex items-center gap-2 truncate"><MapPin className="h-3.5 w-3.5 shrink-0" />{lead.city}</span>}
            {lead.inferred_profession && <span className="flex items-center gap-2 truncate"><Briefcase className="h-3.5 w-3.5 shrink-0" />{lead.inferred_profession}</span>}
          </div>
        </div>
        {status === "pending" && (
          <Button size="sm" variant="outline" onClick={() => onEnrich(lead)} disabled={isEnriching} className="shrink-0">
            {isEnriching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            Enriquecer
          </Button>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: any; tone?: "success" | "warning" | "primary" | "default" }) {
  const toneCls = {
    success: "text-emerald-600",
    warning: "text-amber-600",
    primary: "text-primary",
    default: "text-foreground",
  }[tone ?? "default"];
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-3xl font-bold tracking-tight", toneCls)}>{value}</p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground/60 shrink-0" />
      </div>
    </div>
  );
}

function SettingRow({ title, description, checked, onChange, disabled }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-border last:border-0">
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function LeadEnricher() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnrichmentStatus | "all">("all");
  const [activeTab, setActiveTab] = useState("leads");
  const { data: leads = [], isLoading } = useLeads();
  const { settings, isLoading: settingsLoading, updateSettings } = useLeadEnricherSettings();
  const enrichLead = useEnrichLead(settings);
  const { batchProgress, isBatchRunning, startBatchEnrichment, requestStop, stopRequested } = useEnrichmentProcessor();

  const seenLeadIdsRef = useRef<Set<string>>(new Set());
  const autoEnrichInitializedRef = useRef(false);

  useEffect(() => {
    if (isLoading || settingsLoading) return;
    const currentIds = new Set(leads.map((l) => l.id));
    if (!autoEnrichInitializedRef.current) {
      seenLeadIdsRef.current = currentIds;
      autoEnrichInitializedRef.current = true;
      return;
    }
    if (!settings.auto_enrich_enabled) return;
    const newLeads = leads.filter((l) => !seenLeadIdsRef.current.has(l.id) && getEnrichmentStatus(l) === "pending");
    seenLeadIdsRef.current = currentIds;
    if (newLeads.length > 0) for (const lead of newLeads) enrichLead.mutate(lead);
  }, [leads, isLoading, settingsLoading, settings.auto_enrich_enabled, enrichLead]);

  const stats = useMemo(() => getEnrichmentStats(leads), [leads]);
  const pendingLeads = useMemo(() => leads.filter((l) => getEnrichmentStatus(l) === "pending"), [leads]);

  const filteredLeads = useMemo(() => {
    let filtered = leads;
    if (statusFilter !== "all") filtered = filtered.filter((l) => getEnrichmentStatus(l) === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((l) =>
        l.name.toLowerCase().includes(q) || l.company_name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [leads, searchQuery, statusFilter]);

  const handleEnrichSingle = useCallback((lead: Lead) => { enrichLead.mutate(lead); }, [enrichLead]);
  const handleEnrichAll = useCallback(async () => {
    if (pendingLeads.length === 0) return;
    await startBatchEnrichment(pendingLeads);
  }, [pendingLeads, startBatchEnrichment]);
  const handleSettingChange = useCallback((key: string, value: boolean) => { updateSettings.mutate({ [key]: value }); }, [updateSettings]);

  const tabs = [
    { id: "leads", label: "Leads", count: filteredLeads.length },
    { id: "queue", label: "Fila de Enriquecimento", count: pendingLeads.length },
    { id: "settings", label: "Configurações" },
  ];

  return (
    <ModuleGuard moduleSlug="lead-enricher" moduleName="Lead Enricher Pro">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header IX: limpo, sem gradiente */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                Lead Enricher Pro
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enriqueça automaticamente os dados dos seus leads com IA
              </p>
            </div>
            <Button onClick={handleEnrichAll} disabled={isBatchRunning || pendingLeads.length === 0} className="shrink-0">
              {isBatchRunning ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A enriquecer...</>
              ) : (
                <><Zap className="mr-2 h-4 w-4" />Enriquecer Todos ({pendingLeads.length})</>
              )}
            </Button>
          </div>

          {/* Batch progress */}
          {batchProgress && (
            <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground truncate">
                  {batchProgress.done < batchProgress.total ? `A enriquecer: ${batchProgress.current}` : "Concluído!"}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-medium text-foreground">{batchProgress.done}/{batchProgress.total}</span>
                  {isBatchRunning && (
                    <Button size="sm" variant="ghost" onClick={requestStop} disabled={stopRequested}>
                      <Square className="h-3 w-3 mr-1" />Parar
                    </Button>
                  )}
                </div>
              </div>
              <Progress value={Math.round((batchProgress.done / batchProgress.total) * 100)} className="h-1.5" />
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Leads" value={stats.total} icon={Users} />
            <KPICard label="Enriquecidos" value={stats.enriched} icon={CheckCircle2} tone="success" />
            <KPICard label="Parciais" value={stats.partial} icon={AlertCircle} tone="warning" />
            <KPICard label="Taxa Sucesso" value={`${stats.successRate}%`} icon={TrendingUp} tone="primary" />
          </div>

          {/* Tabs IX (underline) */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <IXEntityTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} className="px-4 sm:px-6 bg-card" />

            <div className="p-5 sm:p-6">
              {activeTab === "leads" && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar leads..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 rounded-full border-border pl-10"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(["all", "enriched", "partial", "pending"] as const).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={statusFilter === s ? "default" : "outline"}
                          onClick={() => setStatusFilter(s)}
                          className="rounded-full"
                        >
                          {s === "all" ? "Todos" : s === "enriched" ? "Enriquecidos" : s === "partial" ? "Parciais" : "Pendentes"}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <h3 className="font-semibold mb-1">Nenhum lead encontrado</h3>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "Tente outra pesquisa" : "Adicione leads ao seu workspace"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredLeads.map((lead) => (
                        <LeadRow
                          key={lead.id}
                          lead={lead}
                          onEnrich={handleEnrichSingle}
                          isEnriching={enrichLead.isPending && enrichLead.variables?.id === lead.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "queue" && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">Fila de Enriquecimento</h2>
                      <p className="text-sm text-muted-foreground">{pendingLeads.length} leads pendentes para enriquecimento</p>
                    </div>
                    <Button onClick={handleEnrichAll} disabled={isBatchRunning || pendingLeads.length === 0}>
                      {isBatchRunning ? (
                        <><Square className="mr-2 h-4 w-4" />A processar...</>
                      ) : (
                        <><Play className="mr-2 h-4 w-4" />Processar Fila</>
                      )}
                    </Button>
                  </div>

                  {pendingLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Target className="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <h3 className="font-semibold mb-1">Nenhum lead na fila</h3>
                      <p className="text-sm text-muted-foreground max-w-md">Todos os leads já possuem dados de enriquecimento.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingLeads.slice(0, 50).map((lead) => (
                        <div key={lead.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{lead.email || lead.phone || "Sem contacto"}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleEnrichSingle(lead)} disabled={enrichLead.isPending}>
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {pendingLeads.length > 50 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">E mais {pendingLeads.length - 50} leads...</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Configurações de Enriquecimento</h2>
                    <p className="text-sm text-muted-foreground">
                      Personalize como os dados dos leads são enriquecidos
                      {updateSettings.isPending && <span className="ml-2 text-xs text-primary animate-pulse">A guardar...</span>}
                    </p>
                  </div>

                  <IXCard title="Fontes principais">
                    <SettingRow title="Pesquisa Google" description="Pesquisar informações via Google/Firecrawl"
                      checked={settings.google_enabled} onChange={(v) => handleSettingChange("google_enabled", v)} disabled={updateSettings.isPending} />
                    <SettingRow title="LinkedIn" description="Obter dados profissionais do LinkedIn"
                      checked={settings.linkedin_enabled} onChange={(v) => handleSettingChange("linkedin_enabled", v)} disabled={updateSettings.isPending} />
                    <SettingRow title="Website Scraping" description="Extrair dados do website da empresa"
                      checked={settings.webscraping_enabled} onChange={(v) => handleSettingChange("webscraping_enabled", v)} disabled={updateSettings.isPending} />
                    <SettingRow title="Enriquecimento Automático" description="Enriquecer novos leads automaticamente quando detectados"
                      checked={settings.auto_enrich_enabled} onChange={(v) => handleSettingChange("auto_enrich_enabled", v)} disabled={updateSettings.isPending} />
                    <SettingRow title="Validação de Email" description="Verificar emails encontrados (formato + registos MX)"
                      checked={settings.email_validation_enabled} onChange={(v) => handleSettingChange("email_validation_enabled", v)} disabled={updateSettings.isPending} />
                  </IXCard>

                  <IXCard title="Fontes avançadas">
                    <SettingRow title="Google Places" description="Obter morada, rating e dados de localização via Google"
                      checked={settings.google_places_enabled} onChange={(v) => handleSettingChange("google_places_enabled", v)} disabled={updateSettings.isPending} />
                    <SettingRow title="Consulta NIF (Portugal)" description="Extrair dados fiscais: CAE, capital social, natureza jurídica"
                      checked={settings.nif_lookup_enabled} onChange={(v) => handleSettingChange("nif_lookup_enabled", v)} disabled={updateSettings.isPending} />
                    <SettingRow title="Instagram Enrich" description="Extrair seguidores, bio e métricas do perfil Instagram"
                      checked={settings.instagram_enrich_enabled} onChange={(v) => handleSettingChange("instagram_enrich_enabled", v)} disabled={updateSettings.isPending} />
                    <SettingRow title="ICP Fit Score" description="Calcular automaticamente a adequação do lead ao perfil ideal de cliente"
                      checked={settings.icp_score_enabled} onChange={(v) => handleSettingChange("icp_score_enabled", v)} disabled={updateSettings.isPending} />
                  </IXCard>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
