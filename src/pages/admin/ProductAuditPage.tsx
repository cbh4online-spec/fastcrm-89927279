import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, AlertTriangle, FlaskConical, Wrench, XCircle, Circle, Search,
} from "lucide-react";

type Status =
  | "Functional"
  | "Partial"
  | "Mock/Demo"
  | "Structure Only"
  | "Broken"
  | "Not Implemented";

type Priority = "P0" | "P1" | "P2" | "P3";

interface ModuleAudit {
  module: string;
  status: Status;
  routes: string[];
  tables: string[];
  components: string[];
  edgeFunctions: string[];
  errors: string[];
  priority: Priority;
  nextStep: string;
}

const MODULES: ModuleAudit[] = [
  {
    module: "Authentication / Workspaces",
    status: "Functional",
    routes: ["/auth", "/onboarding"],
    tables: ["profiles", "workspace_members", "workspaces", "user_roles"],
    components: ["AuthProvider", "WorkspaceProvider", "LoginForm", "SignupForm"],
    edgeFunctions: ["create-workspace-member", "auth-email-hook"],
    errors: [],
    priority: "P3",
    nextStep: "OK — manter monitorização de RLS por workspace_id.",
  },
  {
    module: "Contacts",
    status: "Functional",
    routes: ["/dashboard/contacts"],
    tables: ["contacts", "contact_relationships", "contact_enrichment"],
    components: ["AttioContactsTable"],
    edgeFunctions: ["contact-enrich", "contact-insights", "detect-lead-duplicates"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Communication Center",
    status: "Functional",
    routes: ["/dashboard/inbox", "/dashboard/communication/templates"],
    tables: ["communication_channels", "communication_conversations_unified", "communication_channel_logs"],
    components: ["InboxView", "CommunicationTemplates"],
    edgeFunctions: ["auto-route-conversation", "classify-conversation"],
    errors: [],
    priority: "P2",
    nextStep: "Validar omnicanalidade real (Email + IG + FB).",
  },
  {
    module: "WhatsApp Pro",
    status: "Functional",
    routes: ["/dashboard/whatsapp-pro", "/dashboard/whatsapp/ops"],
    tables: ["whatsapp_provider_instances", "whatsapp_messages", "whatsapp_communication_events"],
    components: ["WhatsAppPro", "WhatsAppOpsDashboard"],
    edgeFunctions: ["ghl-send-message", "human-handover"],
    errors: [],
    priority: "P2",
    nextStep: "Confirmar envio real Z-API/Zapy em ambiente de produção.",
  },
  {
    module: "WhatsApp Provider Adapter",
    status: "Functional",
    routes: [],
    tables: ["whatsapp_provider_instances"],
    components: ["providerAdapter.ts", "zapiAdapter", "zapyAdapter", "mockAdapter"],
    edgeFunctions: [],
    errors: [],
    priority: "P3",
    nextStep: "OK — adicionar Meta Cloud API quando necessário.",
  },
  {
    module: "WhatsApp Webhooks",
    status: "Partial",
    routes: [],
    tables: ["whatsapp_webhook_logs"],
    components: ["normalizeIncomingMessage", "normalizeMessageStatus"],
    edgeFunctions: ["meta-webhook-hub", "ghl-webhook-message"],
    errors: ["Validação de assinatura HMAC ainda inconsistente entre fornecedores."],
    priority: "P1",
    nextStep: "Padronizar validação HMAC + replay protection no _shared/security.ts.",
  },
  {
    module: "Product Sharing via WhatsApp",
    status: "Functional",
    routes: ["/dashboard/whatsapp-pro"],
    tables: ["products", "whatsapp_messages"],
    components: ["ShareProductDialog (em Inbox)"],
    edgeFunctions: ["resolve-product-price"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Audio Intelligence",
    status: "Partial",
    routes: ["/dashboard/inbox"],
    tables: ["conversation_analytics"],
    components: ["AudioMessage"],
    edgeFunctions: ["meeting-transcribe", "conversation-summary"],
    errors: ["Transcrição depende de Whisper externo — fluxo end-to-end não validado em produção."],
    priority: "P2",
    nextStep: "Validar pipeline áudio → transcrição → resumo numa conversa real.",
  },
  {
    module: "Inbox Intelligence",
    status: "Functional",
    routes: ["/dashboard/inbox"],
    tables: ["conversation_ai_state", "conversation_signals", "conversation_scores"],
    components: ["InboxView", "ConversationSidebar"],
    edgeFunctions: ["ai-inbox-reply", "ai-inbox-actions", "compute-conversation-signals"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Scheduling / Follow-ups",
    status: "Functional",
    routes: ["/dashboard/inbox"],
    tables: ["conversation_followups", "appointments"],
    components: ["FollowupDialog"],
    edgeFunctions: ["auto-followup-scheduler", "communication-create-appointment"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Support Command Center",
    status: "Functional",
    routes: ["/dashboard/helpdesk", "/dashboard/tickets"],
    tables: ["support_tickets", "support_ticket_messages", "support_ticket_history", "support_categories"],
    components: ["TicketList", "TicketDetail"],
    edgeFunctions: ["communication-analyze-service-quality"],
    errors: [],
    priority: "P2",
    nextStep: "Validar SLAs e atribuição automática.",
  },
  {
    module: "Team Inbox",
    status: "Partial",
    routes: ["/dashboard/inbox"],
    tables: ["conversation_routing_rules", "conversation_routing_log"],
    components: ["InboxView (assignment)"],
    edgeFunctions: ["auto-route-conversation"],
    errors: ["Atribuição manual funciona; round-robin/skill-based ainda não testado em produção."],
    priority: "P2",
    nextStep: "Adicionar UI para configurar regras de routing.",
  },
  {
    module: "Smart Workflows",
    status: "Functional",
    routes: ["/dashboard/smart-workflows", "/dashboard/communication/automations"],
    tables: ["automation_workflows", "automation_workflow_runs"],
    components: ["SmartWorkflowsPage"],
    edgeFunctions: ["automation-execute-rule", "ai-generate-automation"],
    errors: [],
    priority: "P2",
    nextStep: "Confirmar execução real de triggers em background (Trigger.dev).",
  },
  {
    module: "Product & Revenue Intelligence",
    status: "Functional",
    routes: ["/dashboard/kpis", "/dashboard/communication/executive"],
    tables: ["product_signals", "revenue_metrics"],
    components: ["ReportsKPIs", "ExecutiveCommandDashboard"],
    edgeFunctions: ["compute-product-analytics", "compute-revenue-forecast"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Omnichannel Inbox",
    status: "Partial",
    routes: ["/dashboard/inbox"],
    tables: ["communication_channels", "communication_conversations_unified"],
    components: ["channelAdapter (10 canais registados)"],
    edgeFunctions: ["meta-messenger-send", "instagram-send-message", "email-send"],
    errors: [
      "Adapters Phone/SMS/Telegram/Form em modo placeholder.",
      "Falta UI unificada para configurar todos os canais.",
    ],
    priority: "P1",
    nextStep: "Completar adapters reais e UI de Channels Settings.",
  },
  {
    module: "Website Chat Widget",
    status: "Mock/Demo",
    routes: [],
    tables: ["chat_widget_sessions"],
    components: ["chat-widget (edge function)"],
    edgeFunctions: ["chat-widget"],
    errors: ["Sem snippet público distribuído nem documentação de instalação."],
    priority: "P2",
    nextStep: "Gerar snippet embed + página de instalação.",
  },
  {
    module: "AI Website Concierge",
    status: "Partial",
    routes: [],
    tables: ["knowledge_documents", "knowledge_chunks"],
    components: ["ask-fastcrm"],
    edgeFunctions: ["ask-fastcrm", "knowledge-query", "rag-search"],
    errors: ["Não há UI dedicada para configurar concierge por website."],
    priority: "P2",
    nextStep: "Criar UI de concierge + bind a knowledge base.",
  },
  {
    module: "VoiceHub",
    status: "Partial",
    routes: ["/dashboard/voicehub"],
    tables: ["voice_call_logs", "voice_call_intelligence", "voice_agent_status", "voice_business_hours"],
    components: ["VoiceHubPage"],
    edgeFunctions: ["generate-livekit-token"],
    errors: ["Registo manual de chamadas funciona; integração SIP/3CX não validada end-to-end."],
    priority: "P1",
    nextStep: "Validar fluxo de chamada real com nVoip/3CX.",
  },
  {
    module: "Voice Provider Adapter",
    status: "Structure Only",
    routes: [],
    tables: [],
    components: ["nvoipAdapter", "sipAdapter", "threecxAdapter", "mockVoiceAdapter"],
    edgeFunctions: [],
    errors: ["Adapters definidos mas sem credenciais nem testes ao vivo."],
    priority: "P2",
    nextStep: "Pedir credenciais ao cliente e correr smoke test.",
  },
  {
    module: "Voice Intelligence",
    status: "Partial",
    routes: ["/dashboard/voicehub"],
    tables: ["voice_call_intelligence", "voice_call_insights"],
    components: ["CallInsights"],
    edgeFunctions: ["meeting-transcribe"],
    errors: ["Depende de transcrição externa não automatizada."],
    priority: "P2",
    nextStep: "Ligar webhook do provider de voz à pipeline de transcrição.",
  },
  {
    module: "Call Center Operations",
    status: "Structure Only",
    routes: ["/dashboard/voicehub"],
    tables: ["voice_agent_status", "voice_business_hours"],
    components: ["VoiceHubPage (tabs ops)"],
    edgeFunctions: [],
    errors: ["Sem fila real, sem distribuição de chamadas."],
    priority: "P3",
    nextStep: "Adiar até integração SIP estar estável.",
  },
  {
    module: "Executive Dashboard",
    status: "Functional",
    routes: ["/dashboard/communication/executive", "/dashboard/executive-command"],
    tables: ["revenue_metrics", "kernel_decisions"],
    components: ["ExecutiveCommandDashboard"],
    edgeFunctions: ["executive-generate-summary", "ai-weekly-strategy"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Cost Guard",
    status: "Functional",
    routes: ["/dashboard/cost-guard", "/dashboard/communication/cost-guard"],
    tables: ["cost_guard_events", "cost_guard_daily", "cost_guard_monthly", "cost_guard_limits", "cost_guard_alerts", "cost_guard_rates", "cost_guard_plans"],
    components: ["CostGuardPage"],
    edgeFunctions: ["cost-guard-record", "cost-guard-summary"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Plan Management",
    status: "Functional",
    routes: ["/admin/plan-management", "/dashboard/settings/plan", "/dashboard/settings/workspace-plan", "/admin/billing-plans"],
    tables: ["billing_plans", "workspace_subscriptions"],
    components: ["PlanManagementPage", "MyPlanPage", "WorkspacePlanPage", "BillingPlansAdminPage"],
    edgeFunctions: ["billing-sync-plan-to-stripe", "check-subscription"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Public Pricing",
    status: "Functional",
    routes: ["/dashboard/plans", "/precos"],
    tables: ["billing_plans"],
    components: ["PlansComparisonPage", "MarketingPricingPage"],
    edgeFunctions: [],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Proposal Builder",
    status: "Functional",
    routes: ["/dashboard/proposals"],
    tables: ["proposals", "proposal_items"],
    components: ["ProposalBuilder"],
    edgeFunctions: ["generate-proposal-from-prompt", "generate-proposal-copy", "generate-fastcrm-proposal"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Customer Portal",
    status: "Partial",
    routes: ["/portal/*"],
    tables: ["customer_portal_sessions"],
    components: ["ClientPortalRoutes"],
    edgeFunctions: ["customer-portal", "portal-load-proposal", "portal-accept-proposal", "portal-load-onboarding", "portal-submit-checklist"],
    errors: ["Falta validação ponta-a-ponta com cliente externo (signed URLs + magic link)."],
    priority: "P2",
    nextStep: "Smoke test do magic link e fluxo de aceitação de proposta.",
  },
  {
    module: "Onboarding",
    status: "Functional",
    routes: ["/dashboard/onboarding", "/dashboard/onboarding/:id"],
    tables: ["customer_onboarding_projects", "customer_onboarding_checklist_items", "customer_onboarding_documents", "customer_onboarding_events"],
    components: ["OnboardingProjectsPage", "OnboardingProjectDetailPage"],
    edgeFunctions: ["ai-onboarding-setup", "onboarding-generate-summary"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Delivery (Implementation Projects)",
    status: "Functional",
    routes: ["/dashboard/delivery/projects", "/dashboard/delivery/projects/:id"],
    tables: ["implementation_projects", "implementation_project_phases", "implementation_project_tasks", "implementation_blockers", "implementation_handovers", "implementation_handover_items", "implementation_golive_checklists", "implementation_scope_changes", "implementation_time_entries"],
    components: ["DeliveryProjectsPage", "DeliveryProjectDetailPage"],
    edgeFunctions: ["implementation-create-from-onboarding", "implementation-analyze-project-risk", "implementation-generate-handover-summary"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Customer Success",
    status: "Functional",
    routes: ["/dashboard/customer-success", "/dashboard/customer-success/:id"],
    tables: ["customer_accounts", "customer_health_score_snapshots", "customer_churn_risks", "customer_expansion_opportunities", "customer_success_checkins", "customer_qbr_reviews", "customer_success_playbooks", "customer_success_tasks", "customer_feedback_surveys"],
    components: ["CustomerSuccessPage", "CustomerAccountDetailPage"],
    edgeFunctions: ["customer-success-generate-health-score", "customer-success-generate-summary", "customer-success-generate-qbr"],
    errors: [],
    priority: "P3",
    nextStep: "OK.",
  },
  {
    module: "Kernel / Event System",
    status: "Functional",
    routes: ["/admin/kernel"],
    tables: ["kernel_events", "kernel_entities", "kernel_event_registry", "kernel_entity_registry", "kernel_decisions", "kernel_decision_rules", "kernel_context_nodes", "kernel_context_edges", "kernel_change_events", "kernel_change_impacts", "kernel_audit_logs", "kernel_entity_timeline"],
    components: ["KernelAdminPage", "KernelEntityTimeline"],
    edgeFunctions: ["kernel-emit-event", "kernel-process-event", "kernel-replay-events", "kernel-diagnostics"],
    errors: [],
    priority: "P2",
    nextStep: "Validar bridges legacy em produção (8 triggers).",
  },
];

const CRITICAL_BLOCKERS = [
  "Validação HMAC inconsistente em webhooks de WhatsApp (Meta vs Z-API).",
  "Adapters Phone/SMS/Telegram em modo placeholder no Omnichannel.",
  "VoiceHub: integração SIP/nVoip não validada end-to-end.",
  "Customer Portal: falta smoke test do magic link em ambiente público.",
  "Website Chat: snippet de embed não distribuído publicamente.",
];

const FIXES_APPLIED = [
  "Sprint 0 não introduziu correções de código — apenas auditoria. Recomenda-se Sprint 1 dedicado.",
];

const DEMO_FLOWS = [
  {
    name: "Fluxo A — WhatsApp Comercial",
    steps: [
      "Criar contacto → /dashboard/contacts (Functional)",
      "Abrir conversa → /dashboard/inbox (Functional)",
      "Enviar mensagem → adapter Z-API/Zapy (Functional em mock; produção depende de credenciais)",
      "Enviar produto → ShareProductDialog (Functional)",
      "Criar follow-up → conversation_followups (Functional)",
      "Criar oportunidade/proposta → /dashboard/proposals (Functional)",
      "Registar evento na timeline → kernel_events (Functional)",
    ],
    status: "Demonstrável" as const,
  },
  {
    name: "Fluxo B — Suporte",
    steps: [
      "Criar ticket a partir de conversa → support_tickets (Functional)",
      "Atribuir agente → support_tickets.assigned_to (Functional)",
      "Responder → support_ticket_messages (Functional)",
      "Marcar resolvido → status='resolved' (Functional)",
      "Histórico → support_ticket_history (Functional)",
    ],
    status: "Demonstrável" as const,
  },
  {
    name: "Fluxo C — Voz",
    steps: [
      "Registar chamada manual → voice_call_logs (Functional)",
      "Associar contacto → voice_call_logs.contact_id (Functional)",
      "Criar follow-up → conversation_followups (Functional)",
      "Mostrar na timeline → kernel_events bridge (Partial)",
    ],
    status: "Demonstrável (manual)" as const,
  },
  {
    name: "Fluxo D — Dashboard",
    steps: [
      "Conversas → InboxView KPIs (Functional)",
      "Tickets → Helpdesk dashboard (Functional)",
      "Follow-ups → Inbox Followups widget (Functional)",
      "Chamadas → VoiceHub KPIs (Partial)",
      "Métricas → ExecutiveCommandDashboard (Functional)",
    ],
    status: "Demonstrável" as const,
  },
];

const STATUS_META: Record<Status, { icon: typeof CheckCircle2; className: string; label: string }> = {
  Functional:        { icon: CheckCircle2,   className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", label: "Functional" },
  Partial:           { icon: AlertTriangle,  className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",         label: "Partial" },
  "Mock/Demo":       { icon: FlaskConical,   className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",                 label: "Mock/Demo" },
  "Structure Only":  { icon: Wrench,         className: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",     label: "Structure Only" },
  Broken:            { icon: XCircle,        className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",             label: "Broken" },
  "Not Implemented": { icon: Circle,         className: "bg-muted text-muted-foreground border-border",                                    label: "Not Implemented" },
};

const PRIORITY_META: Record<Priority, string> = {
  P0: "bg-rose-600 text-white",
  P1: "bg-orange-500 text-white",
  P2: "bg-amber-400 text-amber-950",
  P3: "bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

export default function ProductAuditPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MODULES.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.module.toLowerCase().includes(q) ||
        m.routes.join(" ").toLowerCase().includes(q) ||
        m.tables.join(" ").toLowerCase().includes(q) ||
        m.components.join(" ").toLowerCase().includes(q)
      );
    });
  }, [search, statusFilter]);

  const summary = useMemo(() => {
    const counts: Record<Status, number> = {
      Functional: 0, Partial: 0, "Mock/Demo": 0,
      "Structure Only": 0, Broken: 0, "Not Implemented": 0,
    };
    MODULES.forEach((m) => { counts[m.status]++; });
    return counts;
  }, []);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Sprint 0</Badge>
            <Badge variant="secondary" className="text-xs">Auditoria interna</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Product Audit</h1>
          <p className="text-muted-foreground">
            Estado funcional dos {MODULES.length} módulos auditados do FastCRM, fluxos de demo e bloqueadores críticos.
          </p>
        </header>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {(Object.keys(summary) as Status[]).map((s) => {
            const meta = STATUS_META[s];
            const Icon = meta.icon;
            return (
              <Card key={s}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{s}</span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold mt-1">{summary[s]}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="modules" className="w-full">
          <TabsList>
            <TabsTrigger value="modules">Módulos ({MODULES.length})</TabsTrigger>
            <TabsTrigger value="flows">Fluxos demo (4)</TabsTrigger>
            <TabsTrigger value="blockers">Bloqueadores ({CRITICAL_BLOCKERS.length})</TabsTrigger>
            <TabsTrigger value="recommendation">Recomendação</TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar módulo, rota, tabela ou componente…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["all", ...Object.keys(STATUS_META)] as const).map((s) => (
                  <Badge
                    key={s}
                    variant={statusFilter === s ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setStatusFilter(s as Status | "all")}
                  >
                    {s === "all" ? "Todos" : s}
                  </Badge>
                ))}
              </div>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Rotas</TableHead>
                    <TableHead>Tabelas</TableHead>
                    <TableHead>Edge Functions</TableHead>
                    <TableHead>Erros</TableHead>
                    <TableHead>Próximo passo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.module}>
                      <TableCell className="font-medium align-top">{m.module}</TableCell>
                      <TableCell className="align-top"><StatusBadge status={m.status} /></TableCell>
                      <TableCell className="align-top">
                        <Badge className={PRIORITY_META[m.priority]}>{m.priority}</Badge>
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {m.routes.length ? m.routes.map((r) => <div key={r}>{r}</div>) : "—"}
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground max-w-[200px]">
                        {m.tables.length ? m.tables.slice(0, 4).join(", ") + (m.tables.length > 4 ? `, +${m.tables.length - 4}` : "") : "—"}
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground max-w-[220px]">
                        {m.edgeFunctions.length ? m.edgeFunctions.slice(0, 3).join(", ") + (m.edgeFunctions.length > 3 ? `, +${m.edgeFunctions.length - 3}` : "") : "—"}
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        {m.errors.length ? (
                          <ul className="list-disc list-inside space-y-1">
                            {m.errors.map((e, i) => <li key={i} className="text-amber-600 dark:text-amber-400">{e}</li>)}
                          </ul>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="align-top text-xs max-w-[260px]">{m.nextStep}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="flows" className="space-y-4">
            {DEMO_FLOWS.map((f) => (
              <Card key={f.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{f.name}</CardTitle>
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      {f.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {f.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="blockers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bloqueadores críticos</CardTitle>
                <CardDescription>Itens que limitam demonstração end-to-end ou operação real.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {CRITICAL_BLOCKERS.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Correções aplicadas no Sprint 0</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {FIXES_APPLIED.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recomendação técnica</CardTitle>
                <CardDescription>Próximo passo sugerido após Sprint 0.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                  <div className="font-semibold mb-1">→ Sprint 1 de Consolidação (recomendado)</div>
                  <p className="text-muted-foreground">
                    Antes de avançar para Fase 2B (Decision Engine automation + AI Recommendations), executar Sprint 1 focado em:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Padronizar validação HMAC dos webhooks WhatsApp (P1).</li>
                    <li>Completar adapters reais Phone/SMS/Telegram no Omnichannel (P1).</li>
                    <li>Validar VoiceHub end-to-end com nVoip ou 3CX em ambiente de staging (P1).</li>
                    <li>Smoke test do Customer Portal (magic link + aceitação de proposta) (P2).</li>
                    <li>Distribuir snippet público do Website Chat Widget (P2).</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="font-semibold mb-1">Alternativa A — Avançar para Fase 2B</div>
                  <p className="text-muted-foreground">
                    Viável apenas se a operação real dos canais não for crítica para a próxima demo. O Kernel está sólido o suficiente.
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="font-semibold mb-1">Alternativa B — Consolidar VoiceHub + Omnichannel</div>
                  <p className="text-muted-foreground">
                    Foco vertical em comunicações (sub-sprints de 2 a 3 dias por canal) antes de qualquer nova fase.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
