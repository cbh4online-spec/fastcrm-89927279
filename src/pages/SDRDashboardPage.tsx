import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Rocket, TrendingUp, MessageSquare, Calendar, Trophy } from "lucide-react";
import { useSDRCampaigns, useSDREnrollments } from "@/hooks/useSDRCampaigns";
import { SDRPipelineView } from "@/components/sdr/SDRPipelineView";
import { SDRCampaignCard } from "@/components/sdr/SDRCampaignCard";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function SDRDashboardPage() {
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign } = useSDRCampaigns();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const { enrollments, stats } = useSDREnrollments(selectedCampaignId || undefined);

  // Global stats across all campaigns
  const globalStats = {
    enrolled: campaigns.reduce((s, c) => s + c.total_enrolled, 0),
    enriching: 0,
    sequenced: 0,
    replied: campaigns.reduce((s, c) => s + c.total_replied, 0),
    meetingSet: campaigns.reduce((s, c) => s + c.total_meetings, 0),
    converted: campaigns.reduce((s, c) => s + c.total_converted, 0),
    optedOut: 0,
    total: campaigns.reduce((s, c) => s + c.total_enrolled, 0),
  };

  const globalReplyRate = globalStats.total > 0 ? ((globalStats.replied / globalStats.total) * 100).toFixed(1) : "0.0";
  const globalMeetingRate = globalStats.total > 0 ? ((globalStats.meetingSet / globalStats.total) * 100).toFixed(1) : "0.0";
  const globalConversionRate = globalStats.total > 0 ? ((globalStats.converted / globalStats.total) * 100).toFixed(1) : "0.0";

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-2xl font-bold">{globalStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Enrolled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <MessageSquare className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-2xl font-bold">{globalReplyRate}%</p>
              <p className="text-xs text-muted-foreground">Reply Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Calendar className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <p className="text-2xl font-bold">{globalMeetingRate}%</p>
              <p className="text-xs text-muted-foreground">Meeting Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Trophy className="h-5 w-5 mx-auto text-green-600 mb-1" />
              <p className="text-2xl font-bold">{globalConversionRate}%</p>
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList>
            <TabsTrigger value="campaigns">Campanhas ({campaigns.length})</TabsTrigger>
            <TabsTrigger value="pipeline" disabled={!selectedCampaignId}>
              Pipeline {selectedCampaign ? `— ${selectedCampaign.name}` : ""}
            </TabsTrigger>
          </TabsList>

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
                    onSelect={setSelectedCampaignId}
                    onToggleStatus={(id, status) => updateCampaign.mutate({ id, status })}
                    onDelete={(id) => deleteCampaign.mutate(id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-4">
            {selectedCampaign && stats && (
              <>
                <SDRPipelineView stats={stats} />

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
                                <Badge variant="outline" className="text-xs">{e.message_variant}</Badge>
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
