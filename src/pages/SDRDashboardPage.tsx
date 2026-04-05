import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Rocket, Send, BarChart3, Settings2, GitBranch } from "lucide-react";
import { useSDRCampaigns, useSDREnrollments } from "@/hooks/useSDRCampaigns";
import { useSDRAggregatedStats } from "@/hooks/useSDRAggregatedStats";
import { useSDRPipelineStages } from "@/hooks/useSDRPipelineStages";
import { SDRPipelineView } from "@/components/sdr/SDRPipelineView";
import { SDRConversionFunnel } from "@/components/sdr/SDRConversionFunnel";
import { SDRStageSettings } from "@/components/sdr/SDRStageSettings";
import { SDRCampaignCard } from "@/components/sdr/SDRCampaignCard";
import { SDRActivityFeed } from "@/components/sdr/SDRActivityFeed";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Users, MessageSquare, Calendar, Trophy } from "lucide-react";
import { motion } from "framer-motion";

export default function SDRDashboardPage() {
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign } = useSDRCampaigns();
  const { data: aggStats, isLoading: aggLoading } = useSDRAggregatedStats();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [pipelineMode, setPipelineMode] = useState<"pipeline" | "funnel">("pipeline");
  const [showStageSettings, setShowStageSettings] = useState(false);

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

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCampaign.mutate({ name: newName, description: newDesc || undefined }, {
      onSuccess: () => { setShowCreate(false); setNewName(""); setNewDesc(""); },
    });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      enrolled: { label: "Enrolled", variant: "outline" },
      enriching: { label: "Enriquecendo", variant: "secondary" },
      sequenced: { label: "Em Sequência", variant: "default" },
      replied: { label: "Respondeu", variant: "secondary" },
      positive_reply: { label: "Reply +", variant: "default" },
      meeting_set: { label: "Reunião", variant: "default" },
      converted: { label: "Convertido", variant: "default" },
      opted_out: { label: "Opt-out", variant: "destructive" },
      failed: { label: "Falhou", variant: "destructive" },
    };
    const cfg = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
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
            <TabsTrigger value="pipeline" disabled={!selectedCampaignId}>
              <GitBranch className="h-3.5 w-3.5 mr-1" />
              Pipeline {selectedCampaign ? `— ${selectedCampaign.name}` : ""}
            </TabsTrigger>
            <TabsTrigger value="funnel" disabled={!selectedCampaignId}>
              Funil
            </TabsTrigger>
            <TabsTrigger value="stages">
              <Settings2 className="h-3.5 w-3.5 mr-1" />
              Fases
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
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : campaigns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Rocket className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma campanha SDR</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie a sua primeira campanha de outbound automatizado com IA
                  </p>
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Criar Campanha
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map((campaign) => (
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
            {selectedCampaign && stats && (
              <>
                <SDRPipelineView
                  stats={stats}
                  dynamicStages={dynamicStages.length > 0 ? dynamicStages : undefined}
                  counts={enrollmentCounts}
                />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Prospects ({enrollments.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {enrollments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum prospect enrolled nesta campanha
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Canal</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Variante</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enrollments.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium">{e.prospect_name || "—"}</TableCell>
                              <TableCell className="text-sm">{e.prospect_email || "—"}</TableCell>
                              <TableCell className="text-sm capitalize">{e.channel || "—"}</TableCell>
                              <TableCell>{statusBadge(e.status)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{e.message_variant || "—"}</Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(e.created_at), "dd MMM", { locale: pt })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Funnel Tab */}
          <TabsContent value="funnel" className="space-y-4">
            {selectedCampaign && dynamicStages.length > 0 ? (
              <SDRConversionFunnel stages={dynamicStages} counts={enrollmentCounts} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    Seleccione uma campanha para ver o funil de conversão.
                  </p>
                </CardContent>
              </Card>
            )}
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
    </DashboardLayout>
  );
}
