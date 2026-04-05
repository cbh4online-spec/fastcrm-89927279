import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Rocket, Send, BarChart3, Settings2, GitBranch, Search, Zap, LineChart, ShieldBan, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSDRCampaigns, useSDREnrollments } from "@/hooks/useSDRCampaigns";
import { useSDRAggregatedStats } from "@/hooks/useSDRAggregatedStats";
import { useSDRPipelineStages } from "@/hooks/useSDRPipelineStages";
import { SDRPipelineView } from "@/components/sdr/SDRPipelineView";
import { SDRConversionFunnel } from "@/components/sdr/SDRConversionFunnel";
import { SDRStageSettings } from "@/components/sdr/SDRStageSettings";
import { SDRCampaignCard } from "@/components/sdr/SDRCampaignCard";
import { SDRActivityFeed } from "@/components/sdr/SDRActivityFeed";
import { SDRProspectActions } from "@/components/sdr/SDRProspectActions";
import { SDRCampaignSettings } from "@/components/sdr/SDRCampaignSettings";
import { SDRSequenceMetrics } from "@/components/sdr/SDRSequenceMetrics";
import { MultichannelSequenceBuilder } from "@/components/marketing/MultichannelSequenceBuilder";
import { SDRAnalyticsDashboard } from "@/components/sdr/SDRAnalyticsDashboard";
import { SDRSuppressionManager } from "@/components/sdr/SDRSuppressionManager";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Calendar, Trophy } from "lucide-react";
import { motion } from "framer-motion";

export default function SDRDashboardPage() {
  const { currentWorkspace } = useWorkspace();
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign } = useSDRCampaigns();
  const { data: aggStats, isLoading: aggLoading } = useSDRAggregatedStats();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSequenceId, setNewSequenceId] = useState("none");
  const [newAutoEnroll, setNewAutoEnroll] = useState(false);
  const [newMinScore, setNewMinScore] = useState(70);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Fetch sequences for quick-select in create dialog
  const { data: sequences = [] } = useQuery({
    queryKey: ["sequences-for-sdr", currentWorkspace?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("multichannel_sequences")
        .select("id, name, status")
        .eq("workspace_id", currentWorkspace!.id)
        .order("name");
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const { enrollments, stats } = useSDREnrollments(selectedCampaignId || undefined);
  const { stages: dynamicStages, activeStages } = useSDRPipelineStages(selectedCampaignId);

  // Build enrollment counts by stage key
  const enrollmentCounts: Record<string, number> = {};
  for (const e of enrollments) {
    enrollmentCounts[e.status] = (enrollmentCounts[e.status] || 0) + 1;
  }

  // Pipeline stats from aggregated data or campaign enrollments
  const pipelineStats = selectedCampaignId && stats
    ? stats
    : {
        enrolled: aggStats?.totalEnrolled ?? 0,
        enriching: aggStats?.totalEnriching ?? 0,
        sequenced: aggStats?.totalSequenced ?? 0,
        replied: aggStats?.totalReplied ?? 0,
        meetingSet: aggStats?.totalMeetings ?? 0,
        converted: aggStats?.totalConverted ?? 0,
        optedOut: aggStats?.totalOptedOut ?? 0,
        total: (aggStats?.totalEnrolled ?? 0) + (aggStats?.totalEnriching ?? 0) + (aggStats?.totalSequenced ?? 0) + (aggStats?.totalReplied ?? 0) + (aggStats?.totalMeetings ?? 0) + (aggStats?.totalConverted ?? 0),
      };

  // Campaign search filter
  const filteredCampaigns = useMemo(() => {
    if (!campaignSearch.trim()) return campaigns;
    const q = campaignSearch.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
    );
  }, [campaigns, campaignSearch]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const createData: any = { name: newName, description: newDesc || undefined };
    if (newSequenceId !== "none") createData.sequence_id = newSequenceId;
    if (newAutoEnroll) {
      createData.auto_enroll_enabled = true;
      createData.auto_enroll_min_score = newMinScore;
    }
    createCampaign.mutate(createData, {
      onSuccess: (data: any) => {
        setShowCreate(false);
        setNewName("");
        setNewDesc("");
        setNewSequenceId("none");
        setNewAutoEnroll(false);
        setNewMinScore(70);
        if (data?.id) {
          setSelectedCampaignId(data.id);
          setActiveTab("pipeline");
        }
      },
    });
  };

  const handleOpenSettings = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setShowSettings(true);
  };

  const handleSaveCampaignSettings = (updates: any) => {
    updateCampaign.mutate(updates, {
      onSuccess: () => setShowSettings(false),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              AI SDR & Outbound
            </h1>
            <p className="text-sm text-muted-foreground">
              Orquestre prospecção, enriquecimento e outreach automatizado com IA
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Campanha
          </Button>
        </div>

        {/* Global KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="Total Enrolled"
            value={pipelineStats.total}
            icon={<Users className="h-4 w-4" />}
            variant="primary"
            description="Prospects no pipeline"
          />
          <KPICard
            title="Reply Rate"
            value={`${aggStats?.replyRate.toFixed(1) ?? "0.0"}%`}
            icon={<MessageSquare className="h-4 w-4" />}
            variant="warning"
            description="Taxa de resposta"
          />
          <KPICard
            title="Meeting Rate"
            value={`${aggStats?.meetingRate.toFixed(1) ?? "0.0"}%`}
            icon={<Calendar className="h-4 w-4" />}
            variant="success"
            description="Taxa de reuniões"
          />
          <KPICard
            title="Conversion Rate"
            value={`${aggStats?.conversionRate.toFixed(1) ?? "0.0"}%`}
            icon={<Trophy className="h-4 w-4" />}
            variant="success"
            description="Taxa de conversão"
          />
        </KPIGrid>

        {/* Secondary metrics */}
        {aggStats && (aggStats.outreachPending > 0 || aggStats.outreachSent > 0 || aggStats.activeSequences > 0) && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="flex items-center gap-3 py-3">
                <Send className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">{aggStats.outreachSent}</p>
                  <p className="text-[11px] text-muted-foreground">Mensagens enviadas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">{aggStats.outreachPending}</p>
                  <p className="text-[11px] text-muted-foreground">Na fila de envio</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-3">
                <Rocket className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">{aggStats.activeSequences}</p>
                  <p className="text-[11px] text-muted-foreground">Sequências activas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="campaigns">Campanhas ({campaigns.length})</TabsTrigger>
            <TabsTrigger value="pipeline">
              <GitBranch className="h-3.5 w-3.5 mr-1" />
              Pipeline
              {selectedCampaign ? (
                <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">
                  {selectedCampaign.name}
                </Badge>
              ) : (
                <span className="ml-1 text-muted-foreground text-[10px]">(global)</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="funnel">Funil</TabsTrigger>
            <TabsTrigger value="sequences">
              <Zap className="h-3.5 w-3.5 mr-1" />
              Sequências
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <LineChart className="h-3.5 w-3.5 mr-1" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="compliance">
              <ShieldBan className="h-3.5 w-3.5 mr-1" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="stages">
              <Settings2 className="h-3.5 w-3.5 mr-1" />
              Fases ({dynamicStages.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SDRPipelineView stats={pipelineStats} />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Campaigns summary */}
              <div className="lg:col-span-2 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Campanhas Activas
                </h3>
                {campaigns.filter((c) => c.status === "active").length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">Nenhuma campanha activa</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
                        <Plus className="h-3 w-3 mr-1" /> Criar
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {campaigns
                      .filter((c) => c.status === "active")
                      .slice(0, 4)
                      .map((campaign) => (
                        <SDRCampaignCard
                          key={campaign.id}
                          campaign={campaign}
                          onSelect={(id) => { setSelectedCampaignId(id); setActiveTab("pipeline"); }}
                          onToggleStatus={(id, status) => updateCampaign.mutate({ id, status })}
                          onDelete={(id) => deleteCampaign.mutate(id)}
                        />
                      ))}
                  </div>
                )}
              </div>

              {/* Activity feed */}
              <div>
                <SDRActivityFeed />
              </div>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            {/* Search bar */}
            {campaigns.length > 0 && (
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar campanhas..."
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Rocket className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {campaignSearch ? "Nenhum resultado" : "Nenhuma campanha SDR"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {campaignSearch
                      ? "Ajuste a pesquisa ou crie uma nova campanha."
                      : "Crie a sua primeira campanha de outbound automatizado com IA"}
                  </p>
                  {!campaignSearch && (
                    <Button onClick={() => setShowCreate(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Criar Campanha
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCampaigns.map((campaign) => (
                  <SDRCampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onSelect={(id) => { setSelectedCampaignId(id); setActiveTab("pipeline"); }}
                    onToggleStatus={(id, status) => updateCampaign.mutate({ id, status })}
                    onDelete={(id) => deleteCampaign.mutate(id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-4">
            {/* Campaign-level KPIs when a campaign is selected */}
            {selectedCampaign && stats && (
              <div className="flex items-center justify-between">
                <KPIGrid columns={4}>
                  <KPICard
                    title="Reply Rate"
                    value={`${stats.replyRate.toFixed(1)}%`}
                    icon={<MessageSquare className="h-4 w-4" />}
                    variant="warning"
                  />
                  <KPICard
                    title="Meeting Rate"
                    value={`${stats.meetingRate.toFixed(1)}%`}
                    icon={<Calendar className="h-4 w-4" />}
                    variant="success"
                  />
                  <KPICard
                    title="Conversion Rate"
                    value={`${stats.conversionRate.toFixed(1)}%`}
                    icon={<Trophy className="h-4 w-4" />}
                    variant="success"
                  />
                  <KPICard
                    title="Opt-outs"
                    value={stats.optedOut}
                    icon={<Users className="h-4 w-4" />}
                    variant="destructive"
                  />
                </KPIGrid>
              </div>
            )}

            {selectedCampaign && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{selectedCampaign.name}</h3>
                  <Badge variant={selectedCampaign.status === "active" ? "default" : "secondary"} className="text-xs">
                    {selectedCampaign.status === "active" ? "Ativa" : selectedCampaign.status === "paused" ? "Pausada" : selectedCampaign.status}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                  <Settings2 className="h-3.5 w-3.5 mr-1" /> Configurações
                </Button>
              </div>
            )}

            <SDRPipelineView
              stats={pipelineStats}
              dynamicStages={dynamicStages.length > 0 ? dynamicStages : undefined}
              counts={selectedCampaignId ? enrollmentCounts : undefined}
              onStageClick={(key) => setStageFilter(stageFilter === key ? null : key)}
            />

            {/* Sequence metrics if campaign has a sequence */}
            {selectedCampaign?.sequence_id && (
              <SDRSequenceMetrics sequenceId={selectedCampaign.sequence_id} />
            )}

            {selectedCampaign ? (
              <SDRProspectActions
                enrollments={enrollments}
                stages={dynamicStages}
                stageFilter={stageFilter}
                onClearFilter={() => setStageFilter(null)}
                campaignId={selectedCampaign.id}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <GitBranch className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Pipeline global — seleccione uma campanha para ver e gerir prospects.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setActiveTab("campaigns")}
                  >
                    Ver Campanhas
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Funnel Tab */}
          <TabsContent value="funnel" className="space-y-4">
            {dynamicStages.length > 0 ? (
              <SDRConversionFunnel
                stages={dynamicStages}
                counts={selectedCampaignId ? enrollmentCounts : {}}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    Configure fases no tab "Fases" para ver o funil de conversão.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sequences Tab */}
          <TabsContent value="sequences" className="space-y-4">
            <MultichannelSequenceBuilder />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <SDRAnalyticsDashboard campaignId={selectedCampaignId} campaigns={campaigns} />
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-4">
            <SDRSuppressionManager />
          </TabsContent>

          {/* Stages Settings Tab */}
          <TabsContent value="stages" className="space-y-4">
            <SDRStageSettings campaignId={selectedCampaignId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Campanha SDR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Outbound Q2 — SaaS Portugal" />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Objectivo e público-alvo da campanha..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createCampaign.isPending}>
              {createCampaign.isPending ? "A criar..." : "Criar Campanha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Settings Sheet */}
      {selectedCampaign && (
        <SDRCampaignSettings
          campaign={selectedCampaign}
          open={showSettings}
          onOpenChange={setShowSettings}
          onSave={handleSaveCampaignSettings}
          saving={updateCampaign.isPending}
        />
      )}
    </DashboardLayout>
  );
}
