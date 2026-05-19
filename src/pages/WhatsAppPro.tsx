import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MessageCircle,
  ListChecks,
  PackageSearch,
  FileText,
  Settings,
  Activity,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  ScrollText,
  Beaker,
  CalendarClock,
  ListTodo,
} from "lucide-react";
import {
  useWhatsAppProviderInstance,
  useEnsureWhatsAppProviderInstance,
  useWhatsAppProEvents,
  useWhatsAppProductShares,
  useWhatsAppProTemplates,
} from "@/hooks/useWhatsAppPro";
import { useWhatsAppZapiConnection } from "@/hooks/useWhatsAppZapiConnection";
import { WhatsAppProviderConfigCard } from "@/components/whatsapp-pro/WhatsAppProviderConfigCard";
import { WhatsAppWebhookLogsTable } from "@/components/whatsapp-pro/WhatsAppWebhookLogsTable";
import { WhatsAppSimulateInboundCard } from "@/components/whatsapp-pro/WhatsAppSimulateInboundCard";
import { WhatsAppPaymentMessageCard } from "@/components/whatsapp-pro/WhatsAppPaymentMessageCard";
import { WhatsAppAppointmentsSection } from "@/components/whatsapp-pro/WhatsAppAppointmentsSection";
import { WhatsAppFollowupsSection } from "@/components/whatsapp-pro/WhatsAppFollowupsSection";
import { TeamPerformanceDashboard } from "@/components/team-inbox/TeamPerformanceDashboard";
import { TeamOpsSettingsCard } from "@/components/team-inbox/TeamOpsSettingsCard";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export default function WhatsAppPro() {
  const navigate = useNavigate();
  const { data: instance, isLoading: instanceLoading } = useWhatsAppProviderInstance();
  const { data: zapi } = useWhatsAppZapiConnection();
  const ensure = useEnsureWhatsAppProviderInstance();
  const { data: events } = useWhatsAppProEvents(20);
  const { data: shares } = useWhatsAppProductShares({ limit: 10 });
  const { data: templates } = useWhatsAppProTemplates();

  // Auto-provision na primeira visita se houver Z-API configurada
  useEffect(() => {
    if (!instanceLoading && !instance && zapi?.status === "connected") {
      ensure.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceLoading, instance, zapi?.status]);

  const isConnected = zapi?.status === "connected" && !!instance;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header premium */}
        <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 via-background to-background p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">FastCRM WhatsApp Pro</h1>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Sparkles className="h-3 w-3" /> Premium
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Atendimento, vendas, suporte e partilha de produtos por WhatsApp num único Command Center.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isConnected ? "default" : "secondary"}
                className={isConnected ? "bg-emerald-500 hover:bg-emerald-600" : ""}
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                {isConnected ? "Operacional" : "Configuração necessária"}
              </Badge>
              <Button onClick={() => navigate("/dashboard/inbox?channel=whatsapp")} className="gap-1.5">
                Abrir Inbox <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* KPI cards rápidos */}
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard
            icon={<MessageCircle className="h-4 w-4" />}
            label="Eventos recentes"
            value={String(events?.length ?? 0)}
            hint="últimas 20 atividades"
          />
          <KpiCard
            icon={<PackageSearch className="h-4 w-4" />}
            label="Produtos partilhados"
            value={String(shares?.length ?? 0)}
            hint="últimos 10 envios"
          />
          <KpiCard
            icon={<FileText className="h-4 w-4" />}
            label="Templates ativos"
            value={String(templates?.filter((t) => t.active).length ?? 0)}
            hint="prontos a enviar"
          />
          <KpiCard
            icon={<Activity className="h-4 w-4" />}
            label="Provider"
            value={instance?.display_name ?? (isConnected ? "Conectado" : "—")}
            hint={instance?.default_country_code ?? ""}
          />
        </div>

        {/* Tabs principais */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">
              <ListChecks className="h-4 w-4 mr-1.5" /> Visão geral
            </TabsTrigger>
            <TabsTrigger value="shares">
              <PackageSearch className="h-4 w-4 mr-1.5" /> Produtos enviados
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="h-4 w-4 mr-1.5" /> Templates
            </TabsTrigger>
            <TabsTrigger value="appointments">
              <CalendarClock className="h-4 w-4 mr-1.5" /> Agendamentos
            </TabsTrigger>
            <TabsTrigger value="followups">
              <ListTodo className="h-4 w-4 mr-1.5" /> Follow-ups
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="h-4 w-4 mr-1.5" /> Performance da Equipa
            </TabsTrigger>
            <TabsTrigger value="logs">
              <ScrollText className="h-4 w-4 mr-1.5" /> Logs / Webhooks
            </TabsTrigger>
            <TabsTrigger value="qa">
              <Beaker className="h-4 w-4 mr-1.5" /> Testes / QA
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-1.5" /> Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Atalhos para sub-páginas */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Atalhos do módulo</h3>
                <span className="text-[11px] text-muted-foreground">Sub-páginas WhatsApp</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Inbox WhatsApp", to: "/dashboard/whatsapp-pro/inbox" },
                  { label: "Campanhas", to: "/dashboard/whatsapp-pro/campaigns" },
                  { label: "Métricas", to: "/dashboard/whatsapp-pro/analytics" },
                  { label: "Templates", to: "/dashboard/whatsapp-pro/templates" },
                  { label: "Sequências", to: "/dashboard/whatsapp-pro/sequences" },
                  { label: "Mensagens agendadas", to: "/dashboard/whatsapp-pro/scheduled" },
                  { label: "Campanhas recorrentes", to: "/dashboard/whatsapp-pro/recurring" },
                  { label: "Quick replies", to: "/dashboard/whatsapp-pro/quick-replies" },
                  { label: "Templates rápidos", to: "/dashboard/whatsapp-pro/quick-templates" },
                  { label: "Catálogo", to: "/dashboard/whatsapp-pro/catalog" },
                  { label: "Bot rules", to: "/dashboard/whatsapp-pro/bot-rules" },
                  { label: "Segmentos", to: "/dashboard/whatsapp-pro/segments" },
                  { label: "Consentimento", to: "/dashboard/whatsapp-pro/consent" },
                  { label: "Importar contactos", to: "/dashboard/whatsapp-pro/contacts-import" },
                  { label: "Anti-spam & throttling", to: "/dashboard/whatsapp-pro/throttle" },
                  { label: "Operações", to: "/dashboard/whatsapp/ops" },
                ].map((s) => (
                  <Button
                    key={s.to}
                    variant="outline"
                    size="sm"
                    className="justify-between"
                    onClick={() => navigate(s.to)}
                  >
                    <span className="truncate">{s.label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Atividade recente</h3>
              {!events || events.length === 0 ? (
                <EmptyState message="Sem atividade ainda. Envie uma mensagem ou partilhe um produto para começar." />
              ) : (
                <ul className="divide-y text-sm">
                  {events.map((e: any) => (
                    <li key={e.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] shrink-0">{e.event_type}</Badge>
                        <span className="text-muted-foreground truncate text-xs">
                          {e.entity_type ?? "—"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: pt })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>


          <TabsContent value="shares">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Produtos enviados por WhatsApp</h3>
              {!shares || shares.length === 0 ? (
                <EmptyState message="Ainda não foram partilhados produtos. Use o botão 'Enviar por WhatsApp' a partir de qualquer produto." />
              ) : (
                <ul className="divide-y text-sm">
                  {shares.map((s) => (
                    <li key={s.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs text-muted-foreground">#{s.product_id.slice(0, 8)}</div>
                        <div className="text-xs">
                          {s.contact_id ? `Contacto ${s.contact_id.slice(0, 8)}` : "Sem contacto"} ·
                          {" "}
                          <span className="text-muted-foreground">{s.status}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(s.sent_at), { addSuffix: true, locale: pt })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Templates WhatsApp</h3>
                <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/communication/templates")}>
                  Gerir todos
                </Button>
              </div>
              {!templates || templates.length === 0 ? (
                <EmptyState message="Sem templates de WhatsApp ainda. Crie templates reutilizáveis para acelerar respostas." />
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {templates.slice(0, 8).map((t) => (
                    <div key={t.id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="text-sm font-medium truncate">{t.name}</div>
                        <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <Card className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Agendamentos e próximas interações</h3>
                <p className="text-xs text-muted-foreground">
                  Transforme conversas em chamadas, reuniões e demonstrações com lembrete WhatsApp automático.
                </p>
              </div>
              <WhatsAppAppointmentsSection />
            </Card>
          </TabsContent>

          <TabsContent value="followups" className="space-y-4">
            <Card className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Follow-ups</h3>
                <p className="text-xs text-muted-foreground">
                  Próximas ações sugeridas pela IA, follow-ups manuais e tarefas pós-reunião.
                </p>
              </div>
              <WhatsAppFollowupsSection />
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <TeamPerformanceDashboard />
            <TeamOpsSettingsCard />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <WhatsAppWebhookLogsTable />
          </TabsContent>

          <TabsContent value="qa" className="space-y-4">
            <WhatsAppSimulateInboundCard />
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <WhatsAppProviderConfigCard />
            <WhatsAppPaymentMessageCard />
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Estado do canal</h3>
              <div className="text-sm space-y-2">
                <Row label="Provider interno" value={instance?.provider_name ?? "—"} />
                <Row label="País por defeito" value={instance?.default_country ?? "PT"} />
                <Row label="Indicativo" value={instance?.default_country_code ?? "+351"} />
                <Row label="Estado" value={isConnected ? "Operacional" : "Não configurado"} />
              </div>
              <div className="pt-2 flex gap-2">
                <Button variant="outline" onClick={() => navigate("/dashboard/settings/integrations")}>
                  Abrir integrações
                </Button>
                {!instance && (
                  <Button onClick={() => ensure.mutate()} disabled={ensure.isPending}>
                    Inicializar instância
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Os tokens e credenciais técnicas são geridos pelo super-administrador e não são expostos no frontend.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b last:border-0 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10 px-6">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{message}</p>
    </div>
  );
}
