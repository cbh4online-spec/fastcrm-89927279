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
  Inbox,
  Send,
  Repeat,
  GitBranch,
  Zap,
  BookOpen,
  Bot,
  UserPlus,
  Tags,
  ShieldAlert,
  Gauge,
  BarChart3,
  Clock,
  Wrench,
  Users,
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
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

type ShortcutGroup = {
  key: string;
  label: string;
  accent: string;
  items: { label: string; to: string; icon: React.ComponentType<{ className?: string }> }[];
};

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    key: "conversas",
    label: "Conversas",
    accent: "bg-emerald-500",
    items: [
      { label: "Inbox WhatsApp", to: "/dashboard/whatsapp-pro/inbox", icon: Inbox },
      { label: "Mensagens agendadas", to: "/dashboard/whatsapp-pro/scheduled", icon: Clock },
      { label: "Quick replies", to: "/dashboard/whatsapp-pro/quick-replies", icon: Zap },
    ],
  },
  {
    key: "campanhas",
    label: "Campanhas",
    accent: "bg-sky-500",
    items: [
      { label: "Campanhas", to: "/dashboard/whatsapp-pro/campaigns", icon: Send },
      { label: "Recorrentes", to: "/dashboard/whatsapp-pro/recurring", icon: Repeat },
      { label: "Sequências", to: "/dashboard/whatsapp-pro/sequences", icon: GitBranch },
    ],
  },
  {
    key: "conteudo",
    label: "Conteúdo",
    accent: "bg-amber-500",
    items: [
      { label: "Templates", to: "/dashboard/whatsapp-pro/templates", icon: FileText },
      { label: "Templates rápidos", to: "/dashboard/whatsapp-pro/quick-templates", icon: BookOpen },
      { label: "Catálogo", to: "/dashboard/whatsapp-pro/catalog", icon: PackageSearch },
    ],
  },
  {
    key: "automacao",
    label: "Automação",
    accent: "bg-violet-500",
    items: [
      { label: "Bot rules", to: "/dashboard/whatsapp-pro/bot-rules", icon: Bot },
      { label: "Segmentos", to: "/dashboard/whatsapp-pro/segments", icon: Tags },
      { label: "Importar contactos", to: "/dashboard/whatsapp-pro/contacts-import", icon: UserPlus },
    ],
  },
  {
    key: "compliance",
    label: "Compliance",
    accent: "bg-rose-500",
    items: [
      { label: "Consentimento", to: "/dashboard/whatsapp-pro/consent", icon: ShieldCheck },
      { label: "Anti-spam & throttling", to: "/dashboard/whatsapp-pro/throttle", icon: ShieldAlert },
    ],
  },
  {
    key: "operacoes",
    label: "Operações",
    accent: "bg-slate-500",
    items: [
      { label: "Métricas", to: "/dashboard/whatsapp-pro/analytics", icon: BarChart3 },
      { label: "Operações", to: "/dashboard/whatsapp/ops", icon: Wrench },
    ],
  },
];

export default function WhatsAppPro() {
  const navigate = useNavigate();
  const { data: instance, isLoading: instanceLoading } = useWhatsAppProviderInstance();
  const { data: zapi } = useWhatsAppZapiConnection();
  const ensure = useEnsureWhatsAppProviderInstance();
  const { data: events } = useWhatsAppProEvents(20);
  const { data: shares } = useWhatsAppProductShares({ limit: 10 });
  const { data: templates } = useWhatsAppProTemplates();

  useEffect(() => {
    if (!instanceLoading && !instance && zapi?.status === "connected") {
      ensure.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceLoading, instance, zapi?.status]);

  const isConnected = zapi?.status === "connected" && !!instance;
  const activeTemplates = templates?.filter((t) => t.active).length ?? 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header — Command Center */}
        <header className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-6 text-white shadow-lg shadow-emerald-900/10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">FastCRM WhatsApp Pro</h1>
                  <Badge className="bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-300/30 hover:bg-emerald-400/30 text-[10px] gap-1">
                    <Sparkles className="h-3 w-3" /> Premium
                  </Badge>
                </div>
                <p className="text-sm text-emerald-50/80 max-w-xl">
                  Atendimento, vendas, suporte e partilha de produtos num Command Center unificado.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/70">
                  Estado do canal
                </span>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isConnected ? "animate-ping bg-emerald-300" : "bg-amber-400"
                      }`}
                    />
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${
                        isConnected ? "bg-emerald-300" : "bg-amber-400"
                      }`}
                    />
                  </span>
                  {isConnected ? "Operacional" : "Configuração necessária"}
                </div>
              </div>
              <Button
                onClick={() => navigate("/dashboard/inbox?channel=whatsapp")}
                className="gap-1.5 bg-white text-emerald-900 hover:bg-emerald-50 shadow-sm"
              >
                Abrir Inbox <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard
            icon={<MessageCircle className="h-4 w-4" />}
            label="Eventos recentes"
            value={String(events?.length ?? 0)}
            hint="últimas 20 atividades"
            trend="up"
          />
          <KpiCard
            icon={<PackageSearch className="h-4 w-4" />}
            label="Produtos partilhados"
            value={String(shares?.length ?? 0)}
            hint="últimos 10 envios"
            trend="flat"
          />
          <KpiCard
            icon={<FileText className="h-4 w-4" />}
            label="Templates ativos"
            value={String(activeTemplates)}
            hint="prontos a enviar"
            trend={activeTemplates > 0 ? "up" : "flat"}
          />
          <KpiCard
            icon={<Activity className="h-4 w-4" />}
            label="Provider"
            value={instance?.display_name ?? (isConnected ? "Conectado" : "—")}
            hint={instance?.default_country_code ?? ""}
            highlight
          />
        </div>

        {/* Tabs */}
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
            {/* Atalhos agrupados */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold">Atalhos de operação</h3>
                  <p className="text-xs text-muted-foreground">Sub-páginas do módulo WhatsApp Pro</p>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {SHORTCUT_GROUPS.reduce((n, g) => n + g.items.length, 0)} ferramentas
                </span>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.key} className="space-y-3">
                    <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span className={`h-1 w-4 rounded-full ${group.accent}`} />
                      {group.label}
                    </h4>
                    <div className="space-y-1.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.to}
                            onClick={() => navigate(item.to)}
                            className="group flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-emerald-500/10 group-hover:text-emerald-600">
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="text-sm font-medium truncate">{item.label}</span>
                            </div>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-600" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Atividade recente</h3>
                {events && events.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">{events.length} eventos</span>
                )}
              </div>
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
                          {s.contact_id ? `Contacto ${s.contact_id.slice(0, 8)}` : "Sem contacto"} ·{" "}
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

function KpiCard({
  icon,
  label,
  value,
  hint,
  trend,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  trend?: "up" | "down" | "flat";
  highlight?: boolean;
}) {
  return (
    <Card
      className={`group p-5 transition-all hover:shadow-md ${
        highlight
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "hover:border-emerald-500/30"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            highlight
              ? "bg-emerald-500 text-white"
              : "bg-muted text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-600"
          }`}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className={`font-bold tracking-tight ${value.length > 8 ? "text-lg" : "text-2xl"}`}>
          {value}
        </div>
        {trend === "up" && (
          <span className="text-[10px] font-semibold text-emerald-600">▲</span>
        )}
        {trend === "down" && (
          <span className="text-[10px] font-semibold text-rose-600">▼</span>
        )}
      </div>
      {/* Sparkline mock */}
      <div className="mt-3 h-6 w-full">
        <svg viewBox="0 0 100 20" className="h-full w-full text-emerald-500/30" preserveAspectRatio="none">
          <path
            d={
              trend === "down"
                ? "M0 4 Q 20 8, 40 10 T 80 15 T 100 18"
                : trend === "flat"
                ? "M0 10 L 25 11 L 50 9 L 75 11 L 100 10"
                : "M0 16 Q 20 12, 40 13 T 60 6 T 80 9 T 100 4"
            }
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
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
