import { useState } from "react";
import { Link } from "react-router-dom";
import { useWhatsAppCampaigns, useWhatsAppOptouts } from "@/hooks/useWhatsAppCampaigns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Play, Pause, Trash2, MessageSquare, Ban, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WhatsAppCampaignWizard } from "@/components/whatsapp-pro/WhatsAppCampaignWizard";
import { WhatsAppOptoutsManager } from "@/components/whatsapp-pro/WhatsAppOptoutsManager";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "outline" },
  scheduled: { label: "Agendada", variant: "secondary" },
  sending: { label: "A enviar", variant: "default" },
  paused: { label: "Pausada", variant: "secondary" },
  completed: { label: "Concluída", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
};

export default function WhatsAppCampaignsPage() {
  const { campaigns, isLoading, launch, pause, resume, remove } = useWhatsAppCampaigns();
  const { optouts } = useWhatsAppOptouts();
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/whatsapp-pro"><ArrowLeft className="h-4 w-4 mr-1" /> WhatsApp Pro</Link>
            </Button>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanhas em massa</h1>
          <p className="text-sm text-muted-foreground">
            Envia mensagens para muitos contactos respeitando throttling e opt-out automático.
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova campanha
        </Button>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">
            <MessageSquare className="h-4 w-4 mr-2" /> Campanhas
            <Badge variant="secondary" className="ml-2">{campaigns.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="optouts">
            <Ban className="h-4 w-4 mr-2" /> Opt-outs
            <Badge variant="secondary" className="ml-2">{optouts.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4 mt-4">
          {isLoading && <p className="text-muted-foreground text-sm">A carregar…</p>}
          {!isLoading && campaigns.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Ainda não há campanhas. Cria a primeira para começar.</p>
                <Button onClick={() => setWizardOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Nova campanha
                </Button>
              </CardContent>
            </Card>
          )}

          {campaigns.map((c) => {
            const total = c.total_recipients || 0;
            const done = (c.sent_count || 0) + (c.failed_count || 0) + (c.skipped_count || 0);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const status = STATUS_LABELS[c.status] || { label: c.status, variant: "outline" as const };
            return (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {c.name}
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      {c.message_text || "(sem mensagem)"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === "draft" && (
                      <Button size="sm" onClick={() => launch.mutate(c.id)}>
                        <Play className="h-4 w-4 mr-1" /> Iniciar
                      </Button>
                    )}
                    {c.status === "sending" && (
                      <Button size="sm" variant="outline" onClick={() => pause.mutate(c.id)}>
                        <Pause className="h-4 w-4 mr-1" /> Pausar
                      </Button>
                    )}
                    {c.status === "paused" && (
                      <Button size="sm" onClick={() => resume.mutate(c.id)}>
                        <Play className="h-4 w-4 mr-1" /> Retomar
                      </Button>
                    )}
                    {(c.status === "draft" || c.status === "completed" || c.status === "failed") && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm("Eliminar esta campanha?")) remove.mutate(c.id);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={pct} className="h-2" />
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <Stat label="Total" value={total} />
                    <Stat label="Enviadas" value={c.sent_count} className="text-primary" />
                    <Stat label="Falhadas" value={c.failed_count} className="text-destructive" />
                    <Stat label="Opt-out" value={c.skipped_count} className="text-muted-foreground" />
                    <Stat label="Throttle" value={`${c.throttle_per_minute}/min`} />
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 pt-1">
                    <span>Janela: {c.send_window_start.slice(0,5)}–{c.send_window_end.slice(0,5)}</span>
                    <span>•</span>
                    <span>Criada {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: pt })}</span>
                    {c.error_message && <span className="text-destructive">• {c.error_message}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="optouts" className="mt-4">
          <WhatsAppOptoutsManager />
        </TabsContent>
      </Tabs>

      <WhatsAppCampaignWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number | string; className?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${className ?? ""}`}>{value}</div>
    </div>
  );
}
